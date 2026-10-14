import assert from 'node:assert/strict';
import {before, after, test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, updateDoc, deleteDoc} from 'firebase/firestore';
const require = createRequire(import.meta.url);
const {initializeApp, deleteApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {questPaths, questReceiptId, relationshipPath, proofId} = require('../../firebase/functions/quest-service.cjs');
const pack = JSON.parse(readFileSync('firebase/functions/private/tv1-hk1-v1.questions.teacher.json', 'utf8'));
const projectId = 'demo-viet-village-3d';
for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST'])
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[name] || '')) throw new Error('Quest tests require loopback demo emulators: ' + name);
const owner = 'fixture-quest-student', teacher = 'fixture-quest-teacher', questId = 'QUEST_TV1_B033';
const location = questPaths(owner), quest = pack.quests.find(q => q.id === questId);
const question = pack.questions.find(q => q.id === 'Q_TV1_B033_M1');
const body = extra => ({characterId: 'primary', questId, ...extra});
let environment, admin, firestore, own, other, anonymous;
// Test identities below are accepted ONLY by the demo Auth emulator. They do
// not establish or claim a real Google login or production teacher account.
function emulatorToken(uid, role, provider = 'google.com') {
  const now = Math.floor(Date.now() / 1000);
  return [Buffer.from(JSON.stringify({alg: 'none', typ: 'JWT'})).toString('base64url'),
    Buffer.from(JSON.stringify({iss: 'https://securetoken.google.com/' + projectId, aud: projectId, sub: uid,
      user_id: uid, iat: now, exp: now + 3600, auth_time: now, firebase: {sign_in_provider: provider}, ...(role ? {role} : {})})).toString('base64url'), ''].join('.');
}
async function call(name, uid, data, role, provider) {
  const response = await fetch(`http://127.0.0.1:5002/${projectId}/asia-southeast1/${name}`, {
    method: 'POST', headers: {'Content-Type': 'application/json', ...(uid ? {Authorization: 'Bearer ' + emulatorToken(uid, role, provider)} : {})},
    body: JSON.stringify({data})});
  const json = await response.json();
  if (json.error) throw Object.assign(new Error(json.error.message), {code: json.error.status});
  assert.ok(response.ok); return json.result;
}
before(async () => {
  assert.equal(pack.spawnPoints.find(p => p.id === 'SP_TV1_B033')?.validated, true, 'Import validated real MAP positions before emulator integration.');
  environment = await initializeTestEnvironment({projectId,
    firestore: {host: '127.0.0.1', port: 8081, rules: readFileSync('firebase/firestore.rules', 'utf8')}});
  admin = initializeApp({projectId}, 'quest-emulator-tests'); firestore = getFirestore(admin);
  own = environment.authenticatedContext(owner, {firebase: {sign_in_provider: 'google.com'}}).firestore();
  other = environment.authenticatedContext('fixture-quest-other', {firebase: {sign_in_provider: 'google.com'}}).firestore();
  anonymous = environment.unauthenticatedContext().firestore();
  await firestore.recursiveDelete(firestore.doc(location.character));
  await firestore.doc(location.character).set({uid: owner, characterId: 'primary', schemaVersion: 1, created: true,
    name: 'Emulator fixture only', inventory: ['preserved'], equipment: {fixture: true}});
  await firestore.doc(relationshipPath(teacher, owner)).set({teacherUid: teacher, studentUid: owner, active: true});
  for (const [action, targetId] of [['accept', quest.giver_npc_ref], ['collect', 'SP_TV1_B033'], ['return', quest.return_npc_ref]]) {
    const proof = {questId, action, targetId};
    await firestore.doc(location.proofs + '/' + proofId(proof)).set({...proof, uid: owner, characterId: 'primary',
      mapId: 'lang-viet', producer: 'authoritative-game-server', validUntilMs: Date.now() + 3600000});
  }
});
after(async () => {await environment?.cleanup(); if (admin) await deleteApp(admin);});

test('Quest Rules deny forging runs, assignments, proofs and trusted teacher relationships', async () => {
  for (const target of [location.index, location.runs + '/' + questId, location.assignments + '/' + questId,
    location.proofs + '/forged', relationshipPath(teacher, owner)]) {
    await assertFails(setDoc(doc(own, target), {completed: true, teacher: true}));
    await assertFails(setDoc(doc(other, target), {completed: true}));
    await assertFails(getDoc(doc(anonymous, target)));
  }
  await assertFails(getDoc(doc(own, relationshipPath(teacher, owner))));
});

test('callables require Google and trusted teacher role plus student relationship', async () => {
  await assert.rejects(call('getVillageQuestState', null, {characterId: 'primary'}), {code: 'UNAUTHENTICATED'});
  await assert.rejects(call('getVillageQuestState', owner, {characterId: 'primary'}, null, 'password'), {code: 'UNAUTHENTICATED'});
  const assignment = body({studentUid: owner, questionId: question.id, mode: 'classroom'});
  await assert.rejects(call('assignVillageQuest', owner, assignment), {code: 'PERMISSION_DENIED'});
  await assert.rejects(call('assignVillageQuest', 'foreign-teacher', assignment, 'teacher'), {code: 'PERMISSION_DENIED'});
  await call('assignVillageQuest', teacher, assignment, 'teacher');
  await assert.rejects(call('beginVillageQuest', owner, body({questionId: question.id, mode: 'classroom', npcId: quest.giver_npc_ref, exp: 999})), {code: 'INVALID_ARGUMENT'});
});

test('real callable full Bài33: stable run and spawn, wrong/right answer, teacher-required practice', async () => {
  const begin = body({questionId: question.id, mode: 'classroom', npcId: quest.giver_npc_ref});
  const initial = await call('beginVillageQuest', owner, begin);
  assert.equal(initial.run.status, 'accepted'); assert.ok(initial.run.spawn);
  const resumed = await call('beginVillageQuest', owner, begin);
  assert.equal(resumed.run.seed, initial.run.seed); assert.deepEqual(resumed.run.spawn, initial.run.spawn);
  await call('collectVillageQuestItem', owner, body({pointId: 'SP_TV1_B033'}));
  assert.equal((await call('answerVillageQuest', owner, body({answer: []}))).correct, false);
  assert.equal((await call('answerVillageQuest', owner, body({answer: question.assessment.correct}))).correct, true);
  await assert.rejects(call('turnInVillageQuest', owner, body({npcId: quest.return_npc_ref})), {code: 'FAILED_PRECONDITION'});
  const approval = body({studentUid: owner, practiceScores: quest.practice.criteria.map(() => 1)});
  await assert.rejects(call('approveVillageQuestPractice', owner, approval), {code: 'PERMISSION_DENIED'});
  await assert.rejects(call('reviewVillageQuest', owner, body({studentUid: owner})), {code: 'PERMISSION_DENIED'});
  const review = await call('reviewVillageQuest', teacher, body({studentUid: owner}), 'teacher');
  assert.equal(review.question.id, question.id);
  assert.equal((await call('approveVillageQuestPractice', teacher, approval, 'teacher')).approved, true);
});

test('six real Firestore transactions grant exactly one canonical EXP receipt and preserve profile', async () => {
  const before = (await firestore.doc(location.character).get()).data();
  const results = await Promise.all(Array.from({length: 6}, () => call('turnInVillageQuest', owner, body({npcId: quest.return_npc_ref}))));
  assert.equal(results.reduce((sum, value) => sum + value.awarded, 0), quest.reward_policy.first_clear_exp);
  assert.equal(results.filter(value => value.duplicate).length, 5);
  assert.equal((await firestore.collection(location.receipts).get()).size, 1);
  assert.deepEqual((await firestore.doc(location.character).get()).data(), before);
  const receipt = location.receipts + '/' + questReceiptId(questId);
  await assertSucceeds(getDoc(doc(own, receipt)));
  await assertFails(updateDoc(doc(own, receipt), {awarded: 99999}));
  await assertFails(deleteDoc(doc(own, receipt)));
  await assertFails(getDoc(doc(other, receipt)));
  await assertFails(getDoc(doc(other, location.runs + '/' + questId)));
});

test('reload and response-loss retry keep canonical result; completed student response excludes answer bank', async () => {
  const before = (await firestore.doc(location.progress).get()).data();
  const retry = await call('turnInVillageQuest', owner, body({npcId: quest.return_npc_ref}));
  assert.equal(retry.awarded, 0); assert.equal(retry.duplicate, true);
  assert.deepEqual((await firestore.doc(location.progress).get()).data(), before);
  const state = await call('getVillageQuestState', owner, {characterId: 'primary'});
  assert.equal(state.runs[0].status, 'completed');
  for (const key of ['assessment', 'correct', 'explanation', 'rubric']) assert.equal(JSON.stringify(state).includes('"' + key + '"'), false);
});
