import assert from 'node:assert/strict';
import {before, after, test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc} from 'firebase/firestore';
const require = createRequire(import.meta.url);
const {initializeApp, deleteApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {paths, receiptId} = require('../../firebase/functions/experience-service.cjs');
const experience = require('../../firebase/functions/shared/experience-core.js');
const projectId = 'demo-viet-village-3d';
for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST'])
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[key] || ''))
    throw new Error('Refusing EXP integration test without local emulator: ' + key);
const owner = 'fixture-exp-owner', google = {firebase: {sign_in_provider: 'google.com'}};
const location = paths(owner), request = {characterId: 'primary', completionId: 'trusted_quest'};
let environment, admin, firestore, own, other, anonymous;
// Unsigned tokens are ONLY accepted by the loopback demo emulator, never Firebase production.
function localToken(uid, provider = 'google.com') {
  const now = Math.floor(Date.now() / 1000);
  return [Buffer.from(JSON.stringify({alg: 'none', typ: 'JWT'})).toString('base64url'),
    Buffer.from(JSON.stringify({iss: 'https://securetoken.google.com/' + projectId, aud: projectId,
      sub: uid, user_id: uid, iat: now, exp: now + 3600, auth_time: now,
      firebase: {sign_in_provider: provider}})).toString('base64url'), ''].join('.');
}
async function call(name, uid, data, provider) {
  const response = await fetch(`http://127.0.0.1:5002/${projectId}/asia-southeast1/${name}`, {
    method: 'POST', headers: {'Content-Type': 'application/json', ...(uid ? {Authorization: 'Bearer ' + localToken(uid, provider)} : {})},
    body: JSON.stringify({data})
  });
  const body = await response.json();
  if (body.error) throw Object.assign(new Error(body.error.message), {code: body.error.status});
  assert.ok(response.ok); return body.result;
}
before(async () => {
  environment = await initializeTestEnvironment({projectId,
    firestore: {host: '127.0.0.1', port: 8081, rules: readFileSync('firebase/firestore.rules', 'utf8')}});
  admin = initializeApp({projectId}, 'experience-emulator-tests'); firestore = getFirestore(admin);
  own = environment.authenticatedContext(owner, google).firestore();
  other = environment.authenticatedContext('fixture-exp-other', google).firestore();
  anonymous = environment.unauthenticatedContext().firestore();
  await firestore.recursiveDelete(firestore.doc(location.character));
  await firestore.doc(location.character).set({uid: owner, characterId: 'primary', created: true, schemaVersion: 1,
    equipment: {testOnly: true}, name: 'Emulator only', level: 1});
  await firestore.doc(location.completions + '/trusted_quest').set({uid: owner, characterId: 'primary',
    schemaVersion: 1, activityVersion: 1, activityId: 'QUEST_LV_01', status: 'completed', producer: 'test-fixture-only'});
});
after(async () => { await environment?.cleanup(); if (admin) await deleteApp(admin); });

test('EXP rules: owner reads; no client can forge character, EXP, completion, reward or delete receipts', async () => {
  await assertSucceeds(getDoc(doc(own, location.character)));
  await assertSucceeds(getDoc(doc(own, location.completions + '/trusted_quest')));
  for (const db of [other, anonymous]) {
    await assertFails(getDoc(doc(db, location.character)));
    await assertFails(getDoc(doc(db, location.completions + '/trusted_quest')));
    await assertFails(getDocs(collection(db, location.completions)));
  }
  const password = environment.authenticatedContext(owner, {firebase: {sign_in_provider: 'password'}}).firestore();
  await assertFails(getDoc(doc(password, location.character)));
  for (const target of [location.character, location.progress, location.completions + '/forged', location.receipts + '/forged'])
    await assertFails(setDoc(doc(own, target), {uid: owner, level: 100, exp: 99999, status: 'completed'}));
  await assertFails(updateDoc(doc(own, location.completions + '/trusted_quest'), {rewardClaimed: false}));
  await assertFails(getDocs(collection(own, 'players', owner, 'characters')));
});
test('EXP callables reject unauthenticated/non-Google/tampered/foreign/unconfirmed requests', async () => {
  await assert.rejects(call('claimVillageExperience', null, request), {code: 'UNAUTHENTICATED'});
  await assert.rejects(call('claimVillageExperience', owner, request, 'password'), {code: 'UNAUTHENTICATED'});
  for (const patch of [{amount: 9000}, {level: 100}, {status: 'completed'}, {uid: owner}])
    await assert.rejects(call('claimVillageExperience', owner, {...request, ...patch}), {code: 'INVALID_ARGUMENT'});
  await assert.rejects(call('claimVillageExperience', 'fixture-exp-other', request), {code: 'FAILED_PRECONDITION'});
  await assert.rejects(call('claimVillageExperience', owner, {...request, completionId: 'missing'}), {code: 'FAILED_PRECONDITION'});
});
test('real Firestore transactions: six concurrent requests commit exactly one EXP reward and preserve character', async () => {
  const beforeCharacter = (await firestore.doc(location.character).get()).data();
  const outcomes = await Promise.all(Array.from({length: 6}, () => call('claimVillageExperience', owner, request)));
  assert.equal(outcomes.reduce((sum, value) => sum + value.awarded, 0), experience.config.rewards.quests.QUEST_LV_01);
  assert.equal(outcomes.filter(value => value.duplicate).length, 5);
  assert.equal((await firestore.collection(location.receipts).get()).size, 1);
  assert.equal((await firestore.doc(location.completions + '/trusted_quest').get()).data().rewardClaimed, true);
  assert.deepEqual((await firestore.doc(location.character).get()).data(), beforeCharacter);
  const value = (await assertSucceeds(getDoc(doc(own, location.progress)))).data();
  assert.equal(value.exp, experience.config.rewards.quests.QUEST_LV_01);
  await assertFails(getDoc(doc(other, location.progress)));
  await assertFails(updateDoc(doc(own, location.progress), {exp: 999999}));
  await assertFails(deleteDoc(doc(own, location.receipts + '/' + receiptId('QUEST_LV_01'))));
});
test('retry after response loss returns the durable result without granting twice', async () => {
  const beforeProgress = (await firestore.doc(location.progress).get()).data();
  const retry = await call('claimVillageExperience', owner, request);
  assert.equal(retry.awarded, 0); assert.equal(retry.duplicate, true);
  assert.deepEqual((await firestore.doc(location.progress).get()).data(), beforeProgress);
});
test('server checks actual lesson answer and atomically awards its configured amount only once', async () => {
  const data = {characterId: 'primary', activityId: 'core:0', answerIndex: 2};
  const wrong = await call('submitVillageLesson', owner, data);
  assert.equal(wrong.correct, false); assert.equal(wrong.awarded, 0);
  assert.equal((await firestore.doc(location.completions + '/lesson_core_0_v1').get()).exists, false);
  const results = await Promise.all([call('submitVillageLesson', owner, {...data, answerIndex: 0}),
    call('submitVillageLesson', owner, {...data, answerIndex: 0})]);
  assert.equal(results.reduce((sum, value) => sum + value.awarded, 0), experience.config.rewards.lessons['core:0']);
  assert.equal(results.filter(value => value.duplicate).length, 1);
  assert.equal((await firestore.collection(location.receipts).get()).size, 2);
  assert.equal((await firestore.doc(location.progress).get()).data().level, 2);
  assert.equal((await firestore.doc(location.progress).get()).data().exp, 0);
});
