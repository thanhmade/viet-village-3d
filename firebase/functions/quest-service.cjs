'use strict';
const {createHash, randomBytes} = require('node:crypto');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const experience = require('./shared/experience-core.js');
const {paths: experiencePaths} = require('./experience-service.cjs');

class QuestError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const hash = text => createHash('sha256').update(text).digest('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
function fail(code, message) { throw new QuestError(code, message); }
function google(auth) {
  if (typeof auth?.uid !== 'string' || !auth.uid || auth.uid.length > 128 || auth.uid.includes('/') ||
      auth.token?.firebase?.sign_in_provider !== 'google.com') fail('unauthenticated', 'Cần đăng nhập bằng Google.');
  return auth.uid;
}
function teacher(auth) {
  google(auth);
  if (!['teacher', 'admin'].includes(auth.token?.role)) fail('permission-denied', 'Chỉ giáo viên được hệ thống cấp quyền mới xác nhận bài thực hành.');
}
function validate(data, allowed) {
  if (!object(data) || Object.keys(data).some(key => !allowed.includes(key)) || data.characterId !== 'primary')
    fail('invalid-argument', 'Yêu cầu nhiệm vụ không hợp lệ. Không gửi EXP, LV hoặc cờ hoàn thành từ trình duyệt.');
}
function id(value, name = 'Mã nhiệm vụ') {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) fail('invalid-argument', name + ' không hợp lệ.');
  return value;
}
function student(value) {
  if (typeof value !== 'string' || !value || value.length > 128 || value.includes('/')) fail('invalid-argument', 'UID học sinh không hợp lệ.');
  return value;
}
function questPaths(uid) {
  const base = experiencePaths(uid);
  return {...base, index: base.character + '/questIndex/tv1-hk1-v1',
    runs: base.character + '/questRuns', assignments: base.character + '/questAssignments',
    proofs: base.character + '/questInteractionProofs'};
}
// Deliberately omit pack version and difficulty: changing a version or level is
// revision/review of the same canonical task, never a new EXP entitlement.
const questRewardKey = questId => 'quest:first-clear:' + questId;
const questReceiptId = questId => hash(questRewardKey(questId));
const relationshipPath = (teacherUid, studentUid) => 'teacherStudentAccess/' + hash(teacherUid + ':' + studentUid);
const proofId = ({questId, action, targetId}) => hash([questId, action, targetId].join(':'));
function loadPack() { return JSON.parse(readFileSync(path.join(__dirname, 'private/tv1-hk1-v1.questions.teacher.json'), 'utf8')); }

function grade(question, answer) {
  if (question.assessment.mode !== 'deterministic') return {manual: true, correct: false};
  const expected = question.assessment.correct;
  if (question.type === 'single_choice') return {correct: typeof answer === 'string' && answer === expected};
  if (question.type === 'order_tokens') return {correct: Array.isArray(answer) && answer.length === expected.length && answer.every((v, i) => v === expected[i])};
  if (question.type === 'multi_select') return {correct: Array.isArray(answer) && new Set(answer).size === answer.length &&
    answer.length === expected.length && answer.every(v => expected.includes(v))};
  if (question.type === 'match_pairs') return {correct: object(answer) && Object.keys(answer).length === Object.keys(expected).length &&
    Object.keys(expected).every(key => answer[key] === expected[key])};
  fail('failed-precondition', 'Loại câu hỏi chưa có bộ chấm phù hợp.');
}
function rubricPass(question, scores) {
  if (!object(scores)) fail('invalid-argument', 'Cần ghi nhận từng tiêu chí của bài thực hành.');
  const rubric = question.assessment.rubric || [];
  if (!rubric.length || Object.keys(scores).some(key => !rubric.some(item => item.id === key)) ||
      rubric.some(item => !item.score_values.includes(scores[item.id])))
    fail('invalid-argument', 'Điểm tiêu chí không hợp lệ.');
  return rubric.every(item => !item.required || scores[item.id] >= item.pass_value);
}
function makeQuestService({db, pack = loadPack(), now = Date.now, generateSeed = () => randomBytes(16).toString('hex'),
  verifyInteraction, allowLocalPreview = false} = {}) {
  if (!db || pack.schemaVersion !== 1 || pack.packId !== 'tv1-hk1-v1') throw new Error('Unsupported quest service configuration.');
  const quests = new Map(pack.quests.map(q => [q.id, q]));
  const questions = new Map(pack.questions.map(q => [q.id, q]));
  const spawnPoints = new Map((pack.spawnPoints || []).map(p => [p.id, p]));
  if (quests.size !== pack.quests.length || questions.size !== pack.questions.length) throw new Error('Duplicate quest/question IDs in private pack.');
  for (const q of quests.values()) for (const v of q.variants) {
    if (!questions.has(v.question_id) || !Number.isSafeInteger(q.reward_policy.first_clear_exp) || q.reward_policy.first_clear_exp <= 0)
      throw new Error('Invalid private quest/variant/reward: ' + q.id);
  }
  function getQuest(value) { const q = quests.get(id(value)); if (!q) fail('not-found', 'Không có nhiệm vụ này trong gói.'); return q; }
  function getQuestion(q, value) {
    if (!q.variants.some(v => v.question_id === value)) fail('invalid-argument', 'Phiên bản câu hỏi không thuộc bài được giao.');
    return questions.get(value);
  }
  function progress(snapshot) {
    try { return snapshot.exists ? experience.normalize(snapshot.data()) : experience.initialState(); }
    catch { fail('failed-precondition', 'Tiến độ có phiên bản chưa hỗ trợ; dữ liệu cũ được giữ nguyên.'); }
  }
  async function character(tx, uid) {
    const p = questPaths(uid), s = await tx.get(db.doc(p.character)), c = s.data();
    if (!c || c.uid !== uid || c.characterId !== 'primary' || c.schemaVersion !== 1 || c.created !== true)
      fail('failed-precondition', 'Nhân vật online chưa được hệ thống xác nhận; chưa nhập tiến độ cục bộ lên máy chủ.');
    return c;
  }
  async function teacherAccess(tx, auth, uid) {
    teacher(auth);
    if (auth.token.role === 'admin') return;
    const relationship = (await tx.get(db.doc(relationshipPath(auth.uid, uid)))).data();
    if (!relationship || relationship.teacherUid !== auth.uid || relationship.studentUid !== uid || relationship.active !== true)
      fail('permission-denied', 'Giáo viên chưa được hệ thống giao quyền phụ trách học sinh này.');
  }
  async function interaction(tx, uid, q, action, targetId) {
    if (verifyInteraction) {
      if (await verifyInteraction({uid, characterId: 'primary', questId: q.id, mapId: q.map_id, action, targetId}, tx)) return;
      fail('failed-precondition', 'Hãy đến đúng NPC hoặc vật phẩm của nhiệm vụ.');
    }
    // A browser position is not authoritative multiplayer movement. A trusted
    // game server must issue these short-lived proofs; client rules deny writes.
    const proof = (await tx.get(db.doc(questPaths(uid).proofs + '/' + proofId({questId: q.id, action, targetId})))).data();
    if (!proof || proof.uid !== uid || proof.characterId !== 'primary' || proof.questId !== q.id || proof.mapId !== q.map_id ||
        proof.action !== action || proof.targetId !== targetId || proof.producer !== 'authoritative-game-server' ||
        !Number.isSafeInteger(proof.validUntilMs) || proof.validUntilMs < now())
      fail('failed-precondition', 'Chưa có xác nhận vị trí từ máy chủ game. Bản online cần dịch vụ kiểm chứng tương tác trước khi nhận thưởng.');
  }
  function chooseSpawn(q, seed) {
    const step = q.steps.find(s => s.action === 'collect_unique'), point = spawnPoints.get(step.spawn_slot);
    if (!point || point.validated !== true || point.questId !== q.id || point.itemId !== step.item_ref || point.mapId !== q.map_id) return null;
    const candidates = point.candidates || [{id: point.id, position: point.position, validated: point.validated}];
    const valid = candidates.filter(p => p.validated === true && p.position && ['x', 'y', 'z'].every(axis => Number.isFinite(p.position[axis])));
    if (!valid.length) return null;
    const selected = valid[parseInt(hash(seed + ':' + point.id).slice(0, 8), 16) % valid.length];
    return {pointId: point.id, candidateId: selected.id, position: clone(selected.position), mapId: point.mapId, itemId: point.itemId};
  }
  async function readRun(tx, uid, questId) {
    const snapshot = await tx.get(db.doc(questPaths(uid).runs + '/' + questId));
    const run = snapshot.data();
    if (!run || run.uid !== uid || run.characterId !== 'primary' || run.questId !== questId || run.schemaVersion !== 1)
      fail('failed-precondition', 'Hãy nhận nhiệm vụ trước.');
    getQuestion(getQuest(questId), run.questionId);
    return run;
  }
  function storeRun(tx, uid, run) { tx.set(db.doc(questPaths(uid).runs + '/' + run.questId), {...run, updatedAt: now()}); }
  function safeRun(run) { if (!run) return null; const {approvedBy, ...safe} = run; return safe; }
  async function state(auth, data) {
    const uid = google(auth); validate(data, ['characterId']);
    return db.runTransaction(async tx => {
      await character(tx, uid);
      const p = questPaths(uid), index = (await tx.get(db.doc(p.index))).data() || {questIds: []};
      const progression = progress(await tx.get(db.doc(p.progress)));
      const rows = await Promise.all(index.questIds.map(async questId => {
        getQuest(questId);
        const [run, assignment] = await Promise.all([tx.get(db.doc(p.runs + '/' + questId)), tx.get(db.doc(p.assignments + '/' + questId))]);
        return {run: safeRun(run.data()), assignment: assignment.data()};
      }));
      return {packId: pack.packId, role: ['teacher', 'admin'].includes(auth.token?.role) ? auth.token.role : 'student',
        scope: 'server', rewardsEnabled: !allowLocalPreview, runs: rows.map(r => r.run).filter(Boolean),
        assignments: rows.map(r => r.assignment).filter(Boolean), progression};
    });
  }
  async function assign(auth, data) {
    teacher(auth); validate(data, ['characterId', 'studentUid', 'questId', 'questionId', 'mode']);
    const uid = student(data.studentUid), q = getQuest(data.questId); getQuestion(q, data.questionId);
    if (!['classroom', 'adventure'].includes(data.mode)) fail('invalid-argument', 'Chế độ học không hợp lệ.');
    return db.runTransaction(async tx => {
      await teacherAccess(tx, auth, uid); await character(tx, uid);
      const p = questPaths(uid), assignmentRef = db.doc(p.assignments + '/' + q.id);
      const current = (await tx.get(assignmentRef)).data();
      const activeRun = (await tx.get(db.doc(p.runs + '/' + q.id))).data();
      const index = (await tx.get(db.doc(p.index))).data() || {questIds: []};
      if (current && current.teacherUid !== auth.uid && auth.token.role !== 'admin')
        fail('permission-denied', 'Bài đang được giáo viên khác phụ trách.');
      if (activeRun && activeRun.status !== 'completed' && activeRun.questionId !== data.questionId)
        fail('failed-precondition', 'Học sinh đang làm một phiên bản của bài này. Hãy hoàn tất lượt hiện tại trước khi đổi mức; tiến độ được giữ nguyên.');
      const assignment = {id: q.id, uid, characterId: 'primary', questId: q.id, questionId: data.questionId,
        mode: data.mode, teacherUid: auth.uid, active: true, schemaVersion: 1, packId: pack.packId, assignedAt: now()};
      tx.set(assignmentRef, assignment);
      tx.set(db.doc(p.index), {...index, questIds: [...new Set([...index.questIds, q.id])]});
      return {assignment};
    });
  }
  async function begin(auth, data) {
    const uid = google(auth); validate(data, ['characterId', 'questId', 'questionId', 'mode', 'assignmentId', 'repeat', 'npcId']);
    const q = getQuest(data.questId); getQuestion(q, data.questionId);
    if (!['classroom', 'adventure', ...(allowLocalPreview ? ['preview'] : [])].includes(data.mode) ||
        (data.repeat !== undefined && typeof data.repeat !== 'boolean') || data.npcId !== q.giver_npc_ref)
      fail('invalid-argument', 'Chế độ học hoặc NPC giao nhiệm vụ không đúng.');
    return db.runTransaction(async tx => {
      await character(tx, uid);
      const p = questPaths(uid), runRef = db.doc(p.runs + '/' + q.id);
      const [runSnapshot, assignmentSnapshot, progressSnapshot, indexSnapshot] = await Promise.all([
        tx.get(runRef), tx.get(db.doc(p.assignments + '/' + q.id)), tx.get(db.doc(p.progress)), tx.get(db.doc(p.index))]);
      const current = runSnapshot.data(), assignment = assignmentSnapshot.data();
      const upgradingPreview = current?.mode === 'preview' && data.mode !== 'preview' && assignment?.active && assignment.questionId === current.questionId;
      if (current && current.status !== 'completed' && !upgradingPreview) return {run: safeRun(current), resumed: true};
      if (current && data.repeat !== true && !upgradingPreview) return {run: safeRun(current), resumed: true};
      if (data.mode !== 'preview' && (!assignment || !assignment.active || assignment.uid !== uid || assignment.questId !== q.id ||
          assignment.questionId !== data.questionId || assignment.mode !== data.mode || (data.assignmentId && data.assignmentId !== assignment.id)))
        fail('failed-precondition', 'Bài học chưa được giáo viên giao cho tài khoản này.');
      const progression = progress(progressSnapshot);
      if (data.mode === 'adventure') {
        if (progression.level < q.gates.adventure_mode.min_level) fail('failed-precondition', 'Chưa đủ LV cho chế độ phiêu lưu của bài này.');
        const previous = q.gates.adventure_mode.previous_quest;
        if (previous && !(await tx.get(db.doc(p.receipts + '/' + questReceiptId(previous)))).exists)
          fail('failed-precondition', 'Hãy hoàn thành nhiệm vụ trước trong chế độ phiêu lưu.');
      }
      await interaction(tx, uid, q, 'accept', q.giver_npc_ref);
      if (upgradingPreview) {
        const next = {...current, mode: data.mode, assignmentId: assignment.id, teacherUid: assignment.teacherUid, rewardEligible: true};
        storeRun(tx, uid, next); return {run: safeRun(next), progression, resumed: true};
      }
      const seed = generateSeed();
      const run = {uid, characterId: 'primary', questId: q.id, questionId: data.questionId, packId: pack.packId,
        schemaVersion: 1, mode: data.mode, assignmentId: assignment?.id || null, teacherUid: assignment?.teacherUid || null,
        cycle: (current?.cycle || 0) + 1, seed, spawn: chooseSpawn(q, seed), status: 'accepted', questionPassed: false,
        practiceApproved: false, collectedItemId: null, rewardEligible: data.mode !== 'preview', startedAt: now()};
      const index = indexSnapshot.data() || {questIds: []};
      storeRun(tx, uid, run); tx.set(db.doc(p.index), {...index, questIds: [...new Set([...index.questIds, q.id])]});
      return {run: safeRun(run), progression, resumed: false};
    });
  }
  async function collect(auth, data) {
    const uid = google(auth); validate(data, ['characterId', 'questId', 'pointId']);
    const q = getQuest(data.questId), step = q.steps.find(s => s.action === 'collect_unique'), point = spawnPoints.get(data.pointId);
    if (!point || point.validated !== true || point.questId !== q.id || point.itemId !== step.item_ref || point.mapId !== q.map_id)
      fail('failed-precondition', 'Điểm vật phẩm chưa được kiểm tra trên MAP; nhiệm vụ thu thập chưa mở.');
    return db.runTransaction(async tx => {
      const run = await readRun(tx, uid, q.id);
      if (!run.spawn || run.spawn.pointId !== point.id || !['x', 'y', 'z'].every(axis => Number.isFinite(run.spawn.position?.[axis])))
        fail('failed-precondition', 'Chưa có vị trí vật phẩm đã được kiểm tra cho lượt chơi này.');
      if (run.collectedItemId === step.item_ref) return {run: safeRun(run), duplicate: true};
      if (run.status !== 'accepted') fail('failed-precondition', 'Nhiệm vụ chưa ở bước tìm vật phẩm.');
      await interaction(tx, uid, q, 'collect', point.id);
      const next = {...run, collectedItemId: step.item_ref, collectedPointId: point.id, status: 'collected', collectedAt: now()};
      storeRun(tx, uid, next); return {run: safeRun(next), duplicate: false};
    });
  }
  async function answer(auth, data) {
    const uid = google(auth); validate(data, ['characterId', 'questId', 'answer']); const q = getQuest(data.questId);
    if (JSON.stringify(data.answer ?? null).length > 4096) fail('invalid-argument', 'Câu trả lời quá dài.');
    return db.runTransaction(async tx => {
      const run = await readRun(tx, uid, q.id), question = getQuestion(q, run.questionId);
      if (!run.collectedItemId) fail('failed-precondition', 'Hãy tìm vật phẩm trước khi làm bài.');
      if (run.questionPassed || run.status === 'completed') return {run: safeRun(run), correct: true, duplicate: true};
      const result = grade(question, data.answer);
      if (result.manual) {
        const next = {...run, status: 'practice_pending', practiceRequested: true};
        storeRun(tx, uid, next); return {run: safeRun(next), correct: null, teacherRequired: true,
          message: 'Bài đọc, viết hoặc nói cần giáo viên quan sát và xác nhận theo tiêu chí.'};
      }
      const next = {...run, questionPassed: result.correct, attempts: (run.attempts || 0) + 1,
        status: result.correct ? 'practice_pending' : 'collected'};
      storeRun(tx, uid, next); return {run: safeRun(next), correct: result.correct,
        message: result.correct ? 'Đúng rồi. Hãy thực hành với giáo viên.' : question.hint || 'Chưa đúng. Em hãy thử lại.'};
    });
  }
  async function approve(auth, data) {
    teacher(auth); validate(data, ['characterId', 'studentUid', 'questId', 'practiceScores', 'questionScores']);
    const uid = student(data.studentUid), q = getQuest(data.questId);
    return db.runTransaction(async tx => {
      await teacherAccess(tx, auth, uid);
      const run = await readRun(tx, uid, q.id), question = getQuestion(q, run.questionId);
      const assignment = (await tx.get(db.doc(questPaths(uid).assignments + '/' + q.id))).data();
      if (!assignment?.active || assignment.questionId !== run.questionId ||
          (assignment.teacherUid !== auth.uid && auth.token.role !== 'admin'))
        fail('permission-denied', 'Giáo viên không phụ trách phiên bài học này.');
      if (run.practiceApproved) return {run: safeRun(run), duplicate: true};
      if (!run.collectedItemId) fail('failed-precondition', 'Học sinh chưa tìm vật phẩm.');
      const scores = data.practiceScores;
      if (!Array.isArray(scores) || scores.length !== q.practice.criteria.length || scores.some(score => score !== 0 && score !== 1))
        fail('invalid-argument', 'Cần đánh giá đủ tiêu chí thực hành bằng 0 hoặc 1.');
      const questionPassed = question.assessment.mode === 'teacher_rubric' ? rubricPass(question, data.questionScores) : run.questionPassed;
      if (!questionPassed || scores.some(score => score !== 1)) return {run: safeRun(run), approved: false,
        message: 'Chưa đạt đủ tiêu chí. Học sinh có thể thực hành lại; chưa ghi nhận thưởng.'};
      const next = {...run, questionPassed: true, practiceApproved: true, status: 'ready_to_turn_in',
        practiceScores: scores, questionScores: data.questionScores || null, approvedBy: auth.uid, approvedAt: now()};
      storeRun(tx, uid, next); return {run: safeRun(next), approved: true};
    });
  }
  async function turnIn(auth, data) {
    const uid = google(auth); validate(data, ['characterId', 'questId', 'npcId']); const q = getQuest(data.questId);
    if (data.npcId !== q.return_npc_ref) fail('invalid-argument', 'Hãy trả nhiệm vụ đúng NPC.');
    return db.runTransaction(async tx => {
      await character(tx, uid);
      const p = questPaths(uid), run = await readRun(tx, uid, q.id);
      const progressRef = db.doc(p.progress), receiptRef = db.doc(p.receipts + '/' + questReceiptId(q.id));
      const [progressSnapshot, receiptSnapshot] = await Promise.all([tx.get(progressRef), tx.get(receiptRef)]);
      const current = progress(progressSnapshot);
      if (run.status === 'completed') return {run: safeRun(run), progression: current, awarded: 0, duplicate: true};
      if (!run.questionPassed || !run.practiceApproved || run.status !== 'ready_to_turn_in' || !run.collectedItemId)
        fail('failed-precondition', 'Cần tìm vật phẩm, làm bài và được giáo viên xác nhận thực hành trước khi trả nhiệm vụ.');
      if (!run.rewardEligible) fail('failed-precondition', 'Phiên xem thử không phát EXP. Hãy nhận bài do giáo viên giao để có kết quả chính thức.');
      await interaction(tx, uid, q, 'return', q.return_npc_ref);
      if (receiptSnapshot.exists && !progressSnapshot.exists) fail('failed-precondition', 'Thiếu tiến độ đã nhận thưởng; dữ liệu được giữ nguyên để kiểm tra.');
      const outcome = receiptSnapshot.exists ? {state: current, awarded: 0, levelsGained: 0, duplicate: true}
        : experience.grant(current, {rewardId: questRewardKey(q.id), amount: q.reward_policy.first_clear_exp});
      const nextProgress = {...outcome.state, receipts: {...current.receipts}};
      const nextRun = {...run, status: 'completed', collectedItemId: null, consumedItemId: run.collectedItemId,
        rewardReceiptId: receiptRef.id, awarded: outcome.awarded, completedAt: now()};
      if (!receiptSnapshot.exists) {
        tx.set(progressRef, {...nextProgress, updatedAt: now()});
        tx.set(receiptRef, {uid, characterId: 'primary', canonicalQuestId: q.id, packId: pack.packId,
          questionId: run.questionId, schemaVersion: 1, tableVersion: nextProgress.tableVersion,
          amount: q.reward_policy.first_clear_exp, awarded: outcome.awarded, levelsGained: outcome.levelsGained,
          discarded: outcome.discarded || 0, claimedAt: now()});
      }
      storeRun(tx, uid, nextRun);
      const {state: _unused, ...summary} = outcome;
      return {...summary, run: safeRun(nextRun), progression: nextProgress};
    });
  }
  async function review(auth, data) {
    teacher(auth); validate(data, ['characterId', 'studentUid', 'questId']); const uid = student(data.studentUid), q = getQuest(data.questId);
    return db.runTransaction(async tx => {
      await teacherAccess(tx, auth, uid); const run = await readRun(tx, uid, q.id);
      const assignment = (await tx.get(db.doc(questPaths(uid).assignments + '/' + q.id))).data();
      if (assignment?.teacherUid !== auth.uid && auth.token.role !== 'admin') fail('permission-denied', 'Không phụ trách bài học này.');
      return {run, practice: clone(q.practice), question: clone(getQuestion(q, run.questionId))};
    });
  }
  return {state, assign, begin, collect, answer, approve, turnIn, review};
}
module.exports = {makeQuestService, QuestError, grade, questPaths, questRewardKey, questReceiptId, relationshipPath, proofId};
