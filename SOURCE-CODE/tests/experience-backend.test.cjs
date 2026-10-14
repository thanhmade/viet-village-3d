'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const {makeExperienceService, paths, receiptId} = require('../../firebase/functions/experience-service.cjs');
const experience = require('../../firebase/functions/shared/experience-core.js');
const auth = uid => ({uid, token: {firebase: {sign_in_provider: 'google.com'}}});
const owner = 'unit-exp-owner';
const request = {characterId: 'primary', completionId: 'quest_first'};
const clone = value => value === undefined ? undefined : structuredClone(value);

// In-memory transactional unit fixture only. Real Firestore concurrency and
// authorization are also exercised by experience-emulator.test.mjs.
function fixture() {
  const documents = new Map(), location = paths(owner);
  let queue = Promise.resolve(), failCommit = false;
  const db = {doc(path) { return {path, id: path.split('/').at(-1)}; }, runTransaction(fn) {
    const execute = async () => {
      const pending = new Map();
      const result = await fn({get: async ref => ({exists: documents.has(ref.path), data: () => clone(documents.get(ref.path))}),
        set: (ref, value) => pending.set(ref.path, clone(value))});
      if (failCommit) { failCommit = false; throw Object.assign(new Error('unit-only offline'), {code: 'unavailable'}); }
      for (const [path, value] of pending) documents.set(path, value);
      return result;
    };
    const result = queue.then(execute); queue = result.catch(() => {}); return result;
  }};
  documents.set(location.character, {uid: owner, characterId: 'primary', schemaVersion: 1, created: true,
    equipment: {sword: 'existing'}, inventory: ['existing'], level: 7});
  documents.set(location.completions + '/quest_first', {uid: owner, characterId: 'primary', schemaVersion: 1,
    activityVersion: 1, activityId: 'QUEST_LV_01', status: 'completed'});
  return {documents, location, service: makeExperienceService({db, now: () => 12345}), failNext: () => { failCommit = true; }};
}
test('backend requires Google auth and refuses client EXP/LV/status/UID and arbitrary paths', async () => {
  const {service} = fixture();
  for (const invalid of [null, {uid: owner}, {uid: owner, token: {firebase: {sign_in_provider: 'password'}}}])
    await assert.rejects(service.claim(invalid, request), {code: 'unauthenticated'});
  for (const extra of [{amount: 99999}, {level: 99}, {uid: owner}, {completed: true}, {rewardId: 'free'}])
    await assert.rejects(service.claim(auth(owner), {...request, ...extra}), {code: 'invalid-argument'});
  for (const data of [{...request, characterId: 'another'}, {...request, completionId: '../other'}, null])
    await assert.rejects(service.claim(auth(owner), data), {code: 'invalid-argument'});
});
test('trusted completion, account, version and registered character are mandatory', async () => {
  const {service, documents, location} = fixture();
  await assert.rejects(service.claim(auth('other-uid'), request), {code: 'failed-precondition'});
  await assert.rejects(service.claim(auth(owner), {...request, completionId: 'missing'}), {code: 'failed-precondition'});
  const original = documents.get(location.completions + '/quest_first');
  for (const patch of [{status: 'pending'}, {uid: 'other'}, {characterId: 'other'}, {activityVersion: 99}, {activityId: 'unknown'}, {activityId: '__proto__'}]) {
    documents.set(location.completions + '/quest_first', {...original, ...patch});
    await assert.rejects(service.claim(auth(owner), request), {code: 'failed-precondition'});
  }
  assert.equal(documents.has(location.progress), false);
});
test('transaction computes server reward and commits progress, receipt, completion together without touching character', async () => {
  const {service, documents, location} = fixture(), before = clone(documents.get(location.character));
  const result = await service.claim(auth(owner), request);
  assert.equal(result.awarded, experience.config.rewards.quests.QUEST_LV_01);
  assert.equal(documents.get(location.progress).exp, result.state.exp);
  assert.equal(documents.get(location.completions + '/quest_first').rewardClaimed, true);
  assert.equal(documents.get(location.receipts + '/' + receiptId('QUEST_LV_01')).awarded, result.awarded);
  assert.deepEqual(documents.get(location.character), before);
});
test('two concurrent claims and a different completion ID for the same configured activity reward once', async () => {
  const {service, documents, location} = fixture();
  documents.set(location.completions + '/quest_alias', clone(documents.get(location.completions + '/quest_first')));
  const results = await Promise.all([service.claim(auth(owner), request), service.claim(auth(owner), request),
    service.claim(auth(owner), {...request, completionId: 'quest_alias'})]);
  assert.equal(results.reduce((sum, result) => sum + result.awarded, 0), experience.config.rewards.quests.QUEST_LV_01);
  assert.equal(results.filter(result => result.duplicate).length, 2);
  assert.equal([...documents.keys()].filter(key => key.startsWith(location.receipts)).length, 1);
});
test('connection failure before commit keeps all data unchanged; retry and lost response cannot double reward', async () => {
  const f = fixture(), original = clone([...f.documents]); f.failNext();
  await assert.rejects(f.service.claim(auth(owner), request), {code: 'unavailable'});
  assert.deepEqual([...f.documents], original);
  await f.service.claim(auth(owner), request); // Simulated successful commit whose response is lost.
  const committed = clone([...f.documents]);
  const retry = await f.service.claim(auth(owner), request);
  assert.equal(retry.awarded, 0); assert.equal(retry.duplicate, true); assert.deepEqual([...f.documents], committed);
});
test('only validated core:0 answer creates lesson completion; retries reuse the fixed receipt', async () => {
  const {service, documents, location} = fixture();
  const data = {characterId: 'primary', activityId: 'core:0', answerIndex: 1};
  assert.equal((await service.submitLesson(auth(owner), data)).correct, false);
  assert.equal(documents.has(location.progress), false);
  assert.equal(documents.has(location.completions + '/lesson_core_0_v1'), false);
  for (const patch of [{answerIndex: '0'}, {amount: 999}, {activityId: 'QUEST_LV_01'}, {answerIndex: -1}])
    await assert.rejects(service.submitLesson(auth(owner), {...data, ...patch}), {code: 'invalid-argument'});
  const correct = await service.submitLesson(auth(owner), {...data, answerIndex: 0});
  assert.equal(correct.correct, true); assert.equal(correct.awarded, experience.config.rewards.lessons['core:0']);
  assert.equal((await service.submitLesson(auth(owner), {...data, answerIndex: 0})).duplicate, true);
});
test('server lesson answer matches the actual current core question, not a fabricated exercise', () => {
  const source = readFileSync('SOURCE-CODE/js/state-and-questions.js', 'utf8');
  const questionBank = source.match(/const core=(\[[\s\S]*?\n\]);/);
  assert.ok(questionBank, 'core bank is readable');
  const bank = vm.runInNewContext(questionBank[1]);
  assert.equal(bank[0][2], 'Thẻ nào có giá trị bằng 1/2?');
  assert.equal(bank[0][4], 0); assert.equal(bank[0][3][0], '2/4');
});
test('missing old progress behind an existing receipt fails closed, and unsupported progress is not reset', async () => {
  const f = fixture(); await f.service.claim(auth(owner), request);
  f.documents.delete(f.location.progress);
  await assert.rejects(f.service.claim(auth(owner), request), {code: 'failed-precondition'});
  assert.equal(f.documents.has(f.location.progress), false);
  f.documents.set(f.location.progress, {...experience.initialState(), schemaVersion: 999});
  await assert.rejects(f.service.claim(auth(owner), request), {code: 'failed-precondition'});
  assert.equal(f.documents.get(f.location.progress).schemaVersion, 999);
});
test('server preserves old above-cap level/EXP and records a zero-award durable receipt', async () => {
  const {service, documents, location} = fixture();
  documents.set(location.progress, {...experience.initialState(), level: 30, exp: 99});
  const result = await service.claim(auth(owner), request);
  assert.equal(result.awarded, 0); assert.equal(result.capped, true);
  assert.equal(result.state.level, 30); assert.equal(result.state.exp, 99);
  assert.equal(documents.get(location.receipts + '/' + receiptId('QUEST_LV_01')).awarded, 0);
  assert.equal((await service.claim(auth(owner), request)).duplicate, true);
});
