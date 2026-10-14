'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const {makeQuestService, grade, questPaths, questReceiptId, relationshipPath, proofId} = require('../../firebase/functions/quest-service.cjs');
const experience = require('../../firebase/functions/shared/experience-core.js');
const privatePack = JSON.parse(readFileSync('firebase/functions/private/tv1-hk1-v1.questions.teacher.json', 'utf8'));
const UID = 'unit-quest-student', TEACHER = 'unit-quest-teacher', QID = 'QUEST_TV1_B033';
const npc = id => 'NPC_LANG_VIET_' + id;
const auth = (uid = UID, role) => ({uid, token: {firebase: {sign_in_provider: 'google.com'}, ...(role ? {role} : {})}});
const body = extra => ({characterId: 'primary', questId: QID, ...extra});
const copy = value => value === undefined ? undefined : structuredClone(value);
function fixture({proofs = false, preview = false, invalidSpawn = false} = {}) {
  const pack = copy(privatePack), documents = new Map(), location = questPaths(UID);
  // This fixture tests control flow only. Runtime positions come exclusively
  // from the separately validated navigation overlay, not these unit points.
  for (const p of pack.spawnPoints) {
    p.validated = !invalidSpawn; p.position = {x: 0, y: 0.3, z: 0};
    p.candidates = [{id: 'unit-only-point', position: p.position, validated: !invalidSpawn}];
  }
  let queue = Promise.resolve(), failCommit = false, time = 1000;
  const db = {doc(path) { return {path, id: path.split('/').at(-1)}; }, runTransaction(fn) {
    const execute = async () => {
      const pending = new Map(); let hasWritten = false;
      const result = await fn({get: async ref => {
        assert.equal(hasWritten, false, 'Firestore transactions must finish reads before writes');
        return {exists: documents.has(ref.path), data: () => copy(documents.get(ref.path))};
      }, set: (ref, value) => {hasWritten = true; pending.set(ref.path, copy(value));}});
      if (failCommit) {failCommit = false; throw Object.assign(new Error('unit-only lost connection'), {code: 'unavailable'});}
      for (const [path, value] of pending) documents.set(path, value);
      return result;
    };
    const result = queue.then(execute); queue = result.catch(() => {}); return result;
  }};
  documents.set(location.character, {uid: UID, characterId: 'primary', schemaVersion: 1, created: true,
    name: 'Unit fixture only', equipment: {weapon: 'keep'}, inventory: ['keep'], quests: {old: true}});
  documents.set(relationshipPath(TEACHER, UID), {teacherUid: TEACHER, studentUid: UID, active: true});
  const service = makeQuestService({db, pack, now: () => time, generateSeed: () => 'stable-unit-seed',
    allowLocalPreview: preview, ...(proofs ? {} : {verifyInteraction: async () => true})});
  return {service, documents, location, pack, failNext: () => {failCommit = true;}, setTime: value => {time = value;}};
}
async function start(f, difficulty = 1, mode = 'classroom') {
  const q = f.pack.quests.find(q => q.id === QID), questionId = `Q_TV1_B033_M${difficulty}`;
  await f.service.assign(auth(TEACHER, 'teacher'), body({studentUid: UID, questionId, mode}));
  return f.service.begin(auth(), body({questionId, mode, npcId: q.giver_npc_ref}));
}
async function collect(f) { return f.service.collect(auth(), body({pointId: 'SP_TV1_B033'})); }
async function pass(f, difficulty = 1) {
  const question = f.pack.questions.find(q => q.id === `Q_TV1_B033_M${difficulty}`);
  await f.service.answer(auth(), body({answer: question.assessment.correct}));
  return f.service.approve(auth(TEACHER, 'teacher'), body({studentUid: UID,
    practiceScores: f.pack.quests.find(q => q.id === QID).practice.criteria.map(() => 1),
    questionScores: Object.fromEntries(question.assessment.rubric.map(r => [r.id, r.pass_value]))}));
}
const turnIn = f => f.service.turnIn(auth(), body({npcId: npc('THAY_DO')}));

test('private pack contains all 87 canonical tasks and 435 variants; all deterministic types grade IDs exactly', () => {
  assert.equal(privatePack.quests.length, 87); assert.equal(privatePack.questions.length, 435);
  for (const question of privatePack.questions) {
    if (question.assessment.mode !== 'deterministic') {assert.equal(grade(question, null).manual, true); continue;}
    assert.equal(grade(question, copy(question.assessment.correct)).correct, true, question.id);
    assert.equal(grade(question, '__incorrect__').correct, false, question.id);
    if (question.type === 'multi_select') assert.equal(grade(question, [...question.assessment.correct, question.assessment.correct[0]]).correct, false);
  }
});

test('Google auth, server role and exact request fields reject forged UID, EXP, LV, teacher and answers flags', async () => {
  const {service} = fixture();
  for (const identity of [null, {uid: UID}, {uid: UID, token: {firebase: {sign_in_provider: 'password'}}}])
    await assert.rejects(service.state(identity, {characterId: 'primary'}), {code: 'unauthenticated'});
  for (const extra of [{exp: 90000}, {level: 50}, {uid: 'other'}, {correct: true}, {teacher: true}])
    await assert.rejects(service.answer(auth(), body({answer: [], ...extra})), {code: 'invalid-argument'});
  await assert.rejects(service.assign(auth(), body({studentUid: UID, questionId: 'Q_TV1_B033_M1', mode: 'classroom'})), {code: 'permission-denied'});
  await assert.rejects(service.approve(auth(), body({studentUid: UID, practiceScores: [1]})), {code: 'permission-denied'});
});

test('teacher needs a trusted student relationship; assignment cannot be overwritten by another teacher', async () => {
  const f = fixture();
  await assert.rejects(f.service.assign(auth('other-teacher', 'teacher'), body({studentUid: UID, questionId: 'Q_TV1_B033_M1', mode: 'classroom'})), {code: 'permission-denied'});
  await start(f);
  f.documents.set(relationshipPath('other-teacher', UID), {teacherUid: 'other-teacher', studentUid: UID, active: true});
  await assert.rejects(f.service.assign(auth('other-teacher', 'teacher'), body({studentUid: UID, questionId: 'Q_TV1_B033_M1', mode: 'classroom'})), {code: 'permission-denied'});
});

test('classroom assignment permits Bài 33 at LV1; adventure requires LV and previous canonical receipt', async () => {
  const f = fixture(); assert.equal((await start(f)).run.status, 'accepted');
  const adventure = fixture(); await assert.rejects(start(adventure, 1, 'adventure'), {code: 'failed-precondition'});
  adventure.documents.set(adventure.location.progress, {...experience.initialState(), level: 20});
  await assert.rejects(start(adventure, 1, 'adventure'), {code: 'failed-precondition'});
  const previous = adventure.pack.quests.find(q => q.id === QID).gates.adventure_mode.previous_quest;
  adventure.documents.set(adventure.location.receipts + '/' + questReceiptId(previous), {canonicalQuestId: previous});
  assert.equal((await start(adventure, 1, 'adventure')).run.status, 'accepted');
});

test('unassigned official mode is blocked; local preview is explicit and does not self-award EXP', async () => {
  const f = fixture({preview: true}), q = f.pack.quests.find(q => q.id === QID);
  const data = body({questionId: 'Q_TV1_B033_M1', mode: 'classroom', npcId: q.giver_npc_ref});
  await assert.rejects(f.service.begin(auth(), data), {code: 'failed-precondition'});
  const result = await f.service.begin(auth(), {...data, mode: 'preview'});
  assert.equal(result.run.rewardEligible, false);
  await collect(f); await f.service.answer(auth(), body({answer: f.pack.questions.find(q => q.id === 'Q_TV1_B033_M1').assessment.correct}));
  await assert.rejects(turnIn(f), {code: 'failed-precondition'});
  assert.equal(f.documents.has(f.location.progress), false);
});

test('validated assignment upgrades an in-progress preview without losing seed, chosen point or answers', async () => {
  const f = fixture({preview: true}), q = f.pack.quests.find(q => q.id === QID);
  const before = await f.service.begin(auth(), body({questionId: 'Q_TV1_B033_M1', mode: 'preview', npcId: q.giver_npc_ref}));
  await collect(f);
  const result = await start(f);
  assert.equal(result.run.rewardEligible, true); assert.equal(result.run.status, 'collected');
  assert.equal(result.run.seed, before.run.seed); assert.deepEqual(result.run.spawn, before.run.spawn);
});

test('Bài 33 complete loop: collect, wrong/correct answer, teacher practice, return; character data preserved', async () => {
  const f = fixture(), before = copy(f.documents.get(f.location.character)); await start(f);
  await assert.rejects(f.service.answer(auth(), body({answer: []})), {code: 'failed-precondition'});
  assert.equal((await collect(f)).duplicate, false); assert.equal((await collect(f)).duplicate, true);
  assert.equal((await f.service.answer(auth(), body({answer: []}))).correct, false);
  await assert.rejects(turnIn(f), {code: 'failed-precondition'});
  await pass(f);
  const result = await turnIn(f);
  assert.equal(result.awarded, 230); assert.equal(result.run.status, 'completed');
  assert.equal(result.run.collectedItemId, null); assert.ok(result.progression.level > 1);
  assert.deepEqual(f.documents.get(f.location.character), before);
  assert.equal(f.documents.get(f.location.receipts + '/' + questReceiptId(QID)).awarded, 230);
});

test('six simultaneous turn-ins and retry after reload award only once', async () => {
  const f = fixture(); await start(f); await collect(f); await pass(f);
  const results = await Promise.all(Array.from({length: 6}, () => turnIn(f)));
  assert.equal(results.reduce((sum, r) => sum + r.awarded, 0), 230);
  assert.equal(results.filter(r => r.duplicate).length, 5);
  const reloaded = await f.service.state(auth(), {characterId: 'primary'});
  assert.equal(reloaded.runs[0].status, 'completed'); assert.equal((await turnIn(f)).awarded, 0);
  assert.equal([...f.documents.keys()].filter(p => p.startsWith(f.location.receipts)).length, 1);
});

test('review at a different difficulty reuses the canonical receipt and awards zero', async () => {
  const f = fixture(); await start(f); await collect(f); await pass(f); await turnIn(f);
  const q = f.pack.quests.find(q => q.id === QID);
  await f.service.assign(auth(TEACHER, 'teacher'), body({studentUid: UID, questionId: 'Q_TV1_B033_M2', mode: 'classroom'}));
  await f.service.begin(auth(), body({questionId: 'Q_TV1_B033_M2', mode: 'classroom', npcId: q.giver_npc_ref, repeat: true}));
  await collect(f); await pass(f, 2); const result = await turnIn(f);
  assert.equal(result.awarded, 0); assert.equal(result.duplicate, true);
  assert.equal(result.run.cycle, 2);
});

test('atomic failure keeps run, EXP and receipt unchanged; retry after commit cannot duplicate', async () => {
  const f = fixture(); await start(f); await collect(f); await pass(f);
  const before = copy([...f.documents]); f.failNext();
  await assert.rejects(turnIn(f), {code: 'unavailable'}); assert.deepEqual([...f.documents], before);
  assert.equal((await turnIn(f)).awarded, 230); const committed = copy([...f.documents]);
  assert.equal((await turnIn(f)).awarded, 0); assert.deepEqual([...f.documents], committed);
});

test('manual writing/speaking needs rubric, every practice criterion and trusted teacher; never self-grades', async () => {
  const f = fixture(); await start(f, 4); await collect(f);
  const result = await f.service.answer(auth(), body({answer: 'done'}));
  assert.equal(result.correct, null); assert.equal(result.run.questionPassed, false); assert.equal(result.teacherRequired, true);
  await assert.rejects(f.service.approve(auth(), body({studentUid: UID, practiceScores: [1]})), {code: 'permission-denied'});
  await assert.rejects(f.service.approve(auth(TEACHER, 'teacher'), body({studentUid: UID, practiceScores: [1]})), {code: 'invalid-argument'});
  assert.equal((await pass(f, 4)).approved, true); assert.equal((await turnIn(f)).awarded, 230);
});

test('null/unvalidated collection points are blocked, not interpreted as origin coordinates', async () => {
  const f = fixture({invalidSpawn: true}); const started = await start(f);
  assert.equal(started.run.spawn, null);
  await assert.rejects(collect(f), {code: 'failed-precondition'});
});

test('online default refuses browser-only proximity; trusted proof must match action, map and expiry', async () => {
  const f = fixture({proofs: true}), q = f.pack.quests.find(q => q.id === QID);
  await assert.rejects(start(f), {code: 'failed-precondition'});
  const proof = {questId: QID, action: 'accept', targetId: q.giver_npc_ref};
  const p = f.location.proofs + '/' + proofId(proof);
  f.documents.set(p, {...proof, uid: UID, characterId: 'primary', mapId: 'lang-viet', producer: 'authoritative-game-server', validUntilMs: 900});
  await assert.rejects(start(f), {code: 'failed-precondition'});
  f.documents.get(p).validUntilMs = 2000;
  assert.equal((await start(f)).run.status, 'accepted');
  await assert.rejects(collect(f), {code: 'failed-precondition'});
});

test('same account reload keeps selection; another account cannot access a run or teacher-only answers', async () => {
  const f = fixture(), first = await start(f);
  await assert.rejects(start(f, 2), {code: 'failed-precondition'});
  const resumed = await start(f);
  assert.equal(resumed.run.questionId, first.run.questionId); assert.equal(resumed.run.seed, first.run.seed);
  assert.deepEqual(resumed.run.spawn, first.run.spawn);
  await assert.rejects(f.service.state(auth('other-account'), {characterId: 'primary'}), {code: 'failed-precondition'});
  await assert.rejects(f.service.review(auth(), body({studentUid: UID})), {code: 'permission-denied'});
  const publicState = await f.service.state(auth(), {characterId: 'primary'});
  const json = JSON.stringify(publicState);
  for (const secretKey of ['assessment', 'explanation', 'rubric', 'questionScores', 'correct']) assert.equal(json.includes('"' + secretKey + '"'), false);
});

test('all 435 variants use the same full server workflow, with one receipt for each of 87 canonical frames', async () => {
  const f = fixture();
  for (const quest of f.pack.quests) {
    for (let i = 0; i < quest.variants.length; i++) {
      const question = f.pack.questions.find(q => q.id === quest.variants[i].question_id);
      const request = extra => ({characterId: 'primary', questId: quest.id, ...extra});
      await f.service.assign(auth(TEACHER, 'teacher'), request({studentUid: UID, questionId: question.id, mode: 'classroom'}));
      await f.service.begin(auth(), request({questionId: question.id, mode: 'classroom', npcId: quest.giver_npc_ref, repeat: i > 0}));
      await f.service.collect(auth(), request({pointId: quest.steps.find(s => s.action === 'collect_unique').spawn_slot}));
      await f.service.answer(auth(), request({answer: question.assessment.correct}));
      await f.service.approve(auth(TEACHER, 'teacher'), request({studentUid: UID,
        practiceScores: quest.practice.criteria.map(() => 1), questionScores: Object.fromEntries(question.assessment.rubric.map(r => [r.id, r.pass_value]))}));
      const result = await f.service.turnIn(auth(), request({npcId: quest.return_npc_ref}));
      assert.equal(result.run.status, 'completed', question.id);
      if (i > 0) {assert.equal(result.awarded, 0); assert.equal(result.duplicate, true);}
    }
  }
  assert.equal([...f.documents.keys()].filter(p => p.startsWith(f.location.receipts)).length, 87);
  assert.equal((await f.service.state(auth(), {characterId: 'primary'})).runs.length, 87);
});

test('above-cap characters retain level/EXP and canonical completion consumes entitlement once', async () => {
  const f = fixture(); f.documents.set(f.location.progress, {...experience.initialState(), level: 30, exp: 77});
  await start(f); await collect(f); await pass(f); const result = await turnIn(f);
  assert.equal(result.awarded, 0); assert.equal(result.progression.level, 30); assert.equal(result.progression.exp, 77);
  assert.equal((await turnIn(f)).awarded, 0);
});
