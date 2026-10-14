'use strict';
const {createHash} = require('node:crypto');
const experience = require('./shared/experience-core.js');

class ExperienceError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const ACTIVITY_VERSION = 1;
const ACTIVITIES = Object.freeze({
  QUEST_LV_01: {kind: 'quest', reward: () => experience.config.rewards.quests.QUEST_LV_01},
  QUEST_LV_02: {kind: 'quest', reward: () => experience.config.rewards.quests.QUEST_LV_02},
  'lesson:core:0': {kind: 'lesson', reward: () => experience.config.rewards.lessons['core:0']}
});
function googleUid(auth) {
  if (typeof auth?.uid !== 'string' || !auth.uid || auth.uid.length > 128 || auth.uid.includes('/') ||
      auth.token?.firebase?.sign_in_provider !== 'google.com')
    throw new ExperienceError('unauthenticated', 'Cần đăng nhập bằng Google.');
  return auth.uid;
}
function input(data, allowed) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).some(key => !allowed.includes(key)) || data.characterId !== 'primary')
    throw new ExperienceError('invalid-argument', 'Yêu cầu nhân vật không hợp lệ.');
}
function safeId(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,96}$/.test(value))
    throw new ExperienceError('invalid-argument', 'Mã hoàn thành không hợp lệ.');
  return value;
}
function rewardKey(activityId) { return activityId + ':v' + ACTIVITY_VERSION; }
function receiptId(activityId) { return createHash('sha256').update(rewardKey(activityId)).digest('hex'); }
function paths(uid, characterId = 'primary') {
  const character = `players/${uid}/characters/${characterId}`;
  return {character, progress: character + '/progression/experience',
    completions: character + '/experienceCompletions', receipts: character + '/experienceReceipts'};
}
function validCharacter(character, uid) {
  if (!character || character.uid !== uid || character.characterId !== 'primary' ||
      character.schemaVersion !== 1 || character.created !== true)
    throw new ExperienceError('failed-precondition', 'Nhân vật online chưa được hệ thống xác nhận. Tiến độ cục bộ chưa được nhập lên máy chủ.');
}
function validCompletion(value, uid) {
  if (!value || value.uid !== uid || value.characterId !== 'primary' || value.status !== 'completed' ||
      value.schemaVersion !== 1 || value.activityVersion !== ACTIVITY_VERSION ||
      !Object.prototype.hasOwnProperty.call(ACTIVITIES, value.activityId))
    throw new ExperienceError('failed-precondition', 'Chưa có kết quả hoàn thành được máy chủ xác nhận.');
  return value.activityId;
}
function normalizeProgress(snapshot) {
  try { return snapshot.exists ? experience.normalize(snapshot.data()) : experience.initialState(); }
  catch { throw new ExperienceError('failed-precondition', 'Phiên bản tiến độ chưa được hỗ trợ; dữ liệu cũ được giữ nguyên.'); }
}

// All writes use Admin Firestore transactions. Browser rules deny writes to these
// collections; a client-provided amount, level, UID or completion flag is rejected.
function makeExperienceService({db, now = Date.now}) {
  async function claimInTransaction(auth, data, submittedLesson) {
    const uid = googleUid(auth), location = paths(uid), completionId = submittedLesson ? 'lesson_core_0_v1' : safeId(data.completionId);
    return db.runTransaction(async transaction => {
      const characterRef = db.doc(location.character), progressRef = db.doc(location.progress);
      const completionRef = db.doc(location.completions + '/' + completionId);
      const [characterSnapshot, progressSnapshot, completionSnapshot] = await Promise.all([
        transaction.get(characterRef), transaction.get(progressRef), transaction.get(completionRef)
      ]);
      validCharacter(characterSnapshot.data(), uid);
      if (submittedLesson && data.answerIndex !== 0)
        return {correct: false, awarded: 0, message: '1/2 = (1 × 2)/(2 × 2) = 2/4. Hãy thử lại.'};
      const completion = completionSnapshot.exists ? completionSnapshot.data() : submittedLesson ? {
        uid, characterId: 'primary', schemaVersion: 1, activityVersion: ACTIVITY_VERSION,
        activityId: 'lesson:core:0', status: 'completed', producer: 'submitVillageLesson', completedAt: now()
      } : null;
      const activityId = validCompletion(completion, uid);
      if (submittedLesson && activityId !== 'lesson:core:0')
        throw new ExperienceError('failed-precondition', 'Kết quả bài học không khớp.');
      const receiptRef = db.doc(location.receipts + '/' + receiptId(activityId));
      const receiptSnapshot = await transaction.get(receiptRef);
      const current = normalizeProgress(progressSnapshot);
      if (receiptSnapshot.exists) {
        if (!progressSnapshot.exists) throw new ExperienceError('failed-precondition', 'Thiếu tiến độ đã nhận thưởng; cần kiểm tra dữ liệu máy chủ.');
        return {...(submittedLesson ? {correct: true} : {}), state: current, awarded: 0, levelsGained: 0,
          duplicate: true, capped: experience.describe(current).capped === true};
      }
      // Durable receipt is separate from the progress document, so the ledger is
      // unbounded by a single Firestore document and cannot be pruned by clients.
      const amount = ACTIVITIES[activityId].reward();
      const outcome = experience.grant(current, {rewardId: rewardKey(activityId), amount});
      // Preserve any pre-existing server ledger during migration; new receipts
      // live in their own collection and do not grow the progress document.
      const next = {...outcome.state, receipts: {...current.receipts}};
      const stamp = now();
      transaction.set(progressRef, {...next, updatedAt: stamp});
      transaction.set(receiptRef, {uid, characterId: 'primary', activityId, activityVersion: ACTIVITY_VERSION,
        completionId, schemaVersion: 1, tableVersion: next.tableVersion, amount, awarded: outcome.awarded,
        levelsGained: outcome.levelsGained, discarded: outcome.discarded || 0, claimedAt: stamp});
      transaction.set(completionRef, {...completion, rewardClaimed: true, receiptId: receiptRef.id, claimedAt: stamp});
      return {...outcome, state: next, ...(submittedLesson ? {correct: true} : {})};
    });
  }
  async function claim(auth, data) {
    googleUid(auth); input(data, ['characterId', 'completionId']);
    return claimInTransaction(auth, data, false);
  }
  async function submitLesson(auth, data) {
    googleUid(auth); input(data, ['characterId', 'activityId', 'answerIndex']);
    if (data.activityId !== 'core:0' || !Number.isInteger(data.answerIndex) || data.answerIndex < 0 || data.answerIndex > 3)
      throw new ExperienceError('invalid-argument', 'Bài học hoặc câu trả lời không hợp lệ.');
    // Actual core[0] question: “Thẻ nào có giá trị bằng 1/2?”; choice 0 = 2/4.
    // Questions/answer versions must be updated here when the curriculum changes.
    return claimInTransaction(auth, data, true);
  }
  return {claim, submitLesson};
}
module.exports = {makeExperienceService, ExperienceError, paths, receiptId, rewardKey, ACTIVITIES, ACTIVITY_VERSION};
