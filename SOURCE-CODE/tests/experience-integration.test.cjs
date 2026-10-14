'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const createHarness = require('./harness.cjs'), root = path.resolve(__dirname, '../..');
const load = name => JSON.parse(fs.readFileSync(path.join(root, 'MAP/regions/lang-viet', name + '.json'), 'utf8'));
const expKey = 'viet-village:experience:v1:experience-game-test:primary';
function locks() { const tails = new Map(); return {request(name, operation) { const task = (tails.get(name) || Promise.resolve()).then(operation); tails.set(name, task.catch(() => {})); return task; }}; }
async function game({records = new Map(), rejectWrite = () => false} = {}) {
  // Isolated integration fixture, not Google authentication or a browser account.
  const h = createHarness({authenticated: false});
  h.context.localStorage = {getItem: key => records.get(key) ?? null, setItem(key, value) { if (rejectWrite(key)) throw new Error('storage unavailable'); records.set(key, value); }};
  h.context.navigator = {locks: locks()};
  h.context.VietVillageAuth.getProfile = () => ({uid: 'experience-game-test'});
  h.context.testAuthAllowed = true;
  h.context.fetch = async url => ({ok: true, json: async () => load(/([^/]+)\.json/.exec(url)[1])});
  assert(h.context.VietVillageGame.initialize()); h.run("$('play').onclick()");
  assert(await h.context.VietVillageNPCs.load());
  return {...h, records};
}
function stand(h, npcId) {
  const {approach: {x, z}} = load('gameplay').npcs.find(n => n.id === npcId);
  h.run(`player.position.set(${x},bridgeHeight(${x},${z}),${z});VietVillageNPCs.update(.11);`);
}
function control(h, id, rootId = 'npcQuests') {
  return h.run(`(function find(node){if(node.id===${JSON.stringify(id)})return node;for(const child of node.children||[]){const found=find(child);if(found)return found;}})($(${JSON.stringify(rootId)}))`);
}
const settle = async h => { await h.run('Promise.all([...pendingExperienceRewards.values()].map(item=>item.promise))'); await new Promise(resolve => setImmediate(resolve)); };
async function prepareFirstQuest(h) {
  const n = h.context.VietVillageNPCs;
  stand(h, 'NPC_LANG_VIET_TUAN_DINH'); assert(n.interact('NPC_LANG_VIET_TUAN_DINH'));
  control(h, 'accept-QUEST_LV_01').onclick(); assert.equal(n.status.quests.QUEST_LV_01, 'active'); n.lock();
  stand(h, 'NPC_LANG_VIET_LY_TRUONG'); assert(n.interact('NPC_LANG_VIET_LY_TRUONG'));
  assert.equal(n.status.quests.QUEST_LV_01, 'ready'); await settle(h);
  assert.equal(h.context.VietVillageExperience.getState().exp, 0);
}

test('actual NPC quest turn-in grants once; opening, accepting and reaching the objective do not grant EXP', async () => {
  const h = await game(), n = h.context.VietVillageNPCs;
  await prepareFirstQuest(h);
  const finish = control(h, 'finish-QUEST_LV_01'); finish.onclick();
  for (let count = 0; count < 10; count++) finish.onclick();
  await settle(h);
  assert.equal(n.status.quests.QUEST_LV_01, 'completed');
  assert.equal(h.context.VietVillageExperience.getState().exp, 60);
  assert.equal(h.context.VietVillageJourney.getState().exp, 60);
  assert.equal(Object.keys(JSON.parse(h.records.get(expKey)).receipts).length, 1);
  assert.equal(h.run('progress.score'), 0, 'Quiz points are not EXP');
  n.lock(); stand(h, 'NPC_LANG_VIET_LY_TRUONG'); assert(n.interact('NPC_LANG_VIET_LY_TRUONG')); await settle(h);
  assert.equal(h.context.VietVillageExperience.getState().exp, 60, 'Reopening a completed quest reconciles, never doubles');
});

test('failed journal hand-in remains ready and grants no EXP; retry completes both paths once', async () => {
  let blockJournal = false;
  const h = await game({rejectWrite: key => blockJournal && key.startsWith('viet-village:quests:')});
  await prepareFirstQuest(h); blockJournal = true;
  const finish = control(h, 'finish-QUEST_LV_01'); finish.onclick(); await settle(h);
  assert.equal(h.context.VietVillageNPCs.status.quests.QUEST_LV_01, 'ready');
  assert.equal(h.context.VietVillageExperience.getState().exp, 0); assert(!h.records.has(expKey));
  blockJournal = false; finish.onclick(); await settle(h);
  assert.equal(h.context.VietVillageNPCs.status.quests.QUEST_LV_01, 'completed');
  assert.equal(h.context.VietVillageExperience.getState().exp, 60);
});

test('completed quest survives an EXP write failure and reload; revisiting the valid completed journal retries only once', async () => {
  let blockExperience = true;
  const h = await game({rejectWrite: key => blockExperience && key === expKey});
  await prepareFirstQuest(h); control(h, 'finish-QUEST_LV_01').onclick(); await settle(h);
  assert.equal(h.context.VietVillageNPCs.status.quests.QUEST_LV_01, 'completed');
  assert(!h.records.has(expKey)); assert.equal(h.run("$('experienceRewardRetry').hidden"), false);
  blockExperience = false;
  const reloaded = await game({records: h.records});
  stand(reloaded, 'NPC_LANG_VIET_LY_TRUONG'); assert(reloaded.context.VietVillageNPCs.interact('NPC_LANG_VIET_LY_TRUONG')); await settle(reloaded);
  assert.equal(reloaded.context.VietVillageExperience.getState().exp, 60);
  reloaded.context.VietVillageNPCs.lock(); stand(reloaded, 'NPC_LANG_VIET_LY_TRUONG');
  assert(reloaded.context.VietVillageNPCs.interact('NPC_LANG_VIET_LY_TRUONG')); await settle(reloaded);
  assert.equal(reloaded.context.VietVillageExperience.getState().exp, 60);
});

test('teacher lesson awards only reading plus a correct answer, ignoring wrong, repeated and stale inputs', async () => {
  const h = await game(), n = h.context.VietVillageNPCs;
  stand(h, 'NPC_LANG_VIET_THAY_DO'); assert(n.interact('NPC_LANG_VIET_THAY_DO')); await settle(h);
  assert.equal(h.context.VietVillageExperience.getState().exp, 0);
  const study = control(h, 'npc-study', 'npcAnimations');
  const question = control(h, 'npc-question', 'npcAnimations');
  assert(study); assert(question); question.onclick();
  control(h, 'npc-answer-1', 'npcLesson').onclick(); await settle(h);
  assert.equal(n.status.lesson.correct, false); assert.equal(h.context.VietVillageExperience.getState().exp, 0);
  const correct = control(h, 'npc-answer-0', 'npcLesson'); correct.onclick(); await settle(h);
  assert.equal(n.status.lesson.correct, true); assert.equal(n.status.lesson.completed, false);
  assert.equal(h.context.VietVillageExperience.getState().exp, 0);
  study.onclick(); await settle(h); assert.equal(n.status.lesson.completed, true);
  assert.equal(h.context.VietVillageExperience.getState().exp, 40);
  for (let i = 0; i < 10; i++) { correct.onclick(); study.onclick(); } await settle(h);
  assert.equal(h.context.VietVillageExperience.getState().exp, 40);
  n.lock(); study.onclick(); correct.onclick(); await settle(h);
  assert.equal(h.context.VietVillageExperience.getState().exp, 40);
  stand(h, 'NPC_LANG_VIET_THAY_DO'); assert(n.interact('NPC_LANG_VIET_THAY_DO'));
  control(h, 'npc-study', 'npcAnimations').onclick(); control(h, 'npc-question', 'npcAnimations').onclick();
  control(h, 'npc-answer-0', 'npcLesson').onclick(); await settle(h);
  assert.equal(h.context.VietVillageExperience.getState().exp, 40, 'A new conversation does not reset the reward receipt');
  assert.equal(h.run('progress.score'), 0);
});

test('the HUD, character profile and journey expose the same level and progress across a level-up, map travel and reload', async () => {
  const h = await game(); await prepareFirstQuest(h); control(h, 'finish-QUEST_LV_01').onclick(); await settle(h);
  h.context.VietVillageNPCs.lock(); stand(h, 'NPC_LANG_VIET_THAY_DO'); assert(h.context.VietVillageNPCs.interact('NPC_LANG_VIET_THAY_DO'));
  control(h, 'npc-study', 'npcAnimations').onclick(); control(h, 'npc-question', 'npcAnimations').onclick();
  control(h, 'npc-answer-0', 'npcLesson').onclick(); await settle(h);
  const state = h.context.VietVillageExperience.getState(); assert.equal(state.level, 2); assert.equal(state.exp, 0);
  assert.equal(h.context.VietVillageJourney.getState().level, 2);
  assert.equal(h.run("$('experienceReadout').textContent"), state.text);
  assert.equal(h.run("$('characterExperienceReadout').textContent"), state.text);
  assert.equal(h.run("$('experienceBar').style.width"), h.run("$('characterExperienceBar').style.width"));
  assert.match(h.run("$('experienceNotice').textContent"), /\+40 EXP.*Lên LV 2/);
  assert.match(h.run("$('characterExperienceScope').textContent"), /LV không đánh giá năng lực học tập/);
  h.context.VietVillageNPCs.lock(); h.context.VietVillageJourney.recordMovement(3); h.context.VietVillageJourney.recordSkillUse();
  h.context.VietVillageJourney.takeDamage(17);
  assert(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok);
  assert(h.context.VietVillageRegions.travelTo('lang-viet', 'from-dong-tre').ok);
  assert.equal(h.context.VietVillageJourney.getState().hp, 83); assert.equal(h.context.VietVillageJourney.getState().level, 2);
  assert.equal(h.context.VietVillageNPCs.status.count, 8);
  const reloaded = await game({records: h.records}); reloaded.run('experienceView.update()');
  assert.equal(reloaded.context.VietVillageJourney.getState().level, 2);
  assert.equal(reloaded.run("$('experienceReadout').textContent"), state.text);
  assert.equal(reloaded.run("$('characterExperienceReadout').textContent"), state.text);
  assert(reloaded.context.VietVillageJourney.getState().tutorials.movement);
  assert(reloaded.context.VietVillageJourney.getState().tutorials.skills);
});

test('EXP migration does not change authentication, eight NPCs, movement recording or Alpha map requirements', async () => {
  const records = new Map([['viet-village:character:v1:experience-game-test', JSON.stringify({schemaVersion: 1, uid: 'experience-game-test', level: 12, exp: 1800, inventory: ['keep']})]]);
  const h = await game({records}), initial = h.context.VietVillageJourney.getState();
  assert.equal(initial.level, 12); assert.equal(initial.exp, 1800); assert.equal(h.context.VietVillageNPCs.status.count, 8);
  assert.equal(h.context.VietVillageRegions.travelTo('ngoai-lang-dong-tre').ok, false, 'LV does not bypass the movement/skill tutorial');
  const x = h.run('player.position.x'), z = h.run('player.position.z');
  h.run('keys.KeyD=true;tick(17);tick(34);keys.KeyD=false');
  assert(Math.hypot(h.run('player.position.x') - x, h.run('player.position.z') - z) > 0);
  h.context.testAuthAllowed = false; h.context.VietVillageGame.lock();
  assert.equal(h.context.VietVillageExperience.getState().status, 'signed-out');
  assert.equal(h.context.VietVillageJourney.getState().alive, false);
  h.context.testAuthAllowed = true; assert.equal(h.context.VietVillageExperience.getState().level, 12);
  assert.equal(JSON.parse(records.get('viet-village:character:v1:experience-game-test')).inventory[0], 'keep');
});

test('two journal instances cannot overwrite each other\'s completion or regress a newer state during an interleaved write', () => {
  const h = createHarness({authenticated: false});
  const definitions = ['A', 'B'].map(id => ({id, enabled: true, dependsOn: [], giverNpc: 'npc-' + id,
    turnInNpc: 'npc-' + id, objective: {type: 'talk', npcId: 'npc-' + id}}));
  const journalKey = 'viet-village:quests:lang-viet:v1:parallel-student';
  for (const mode of ['different-quest', 'same-quest']) {
    const original = JSON.stringify({A: mode === 'same-quest' ? 'active' : 'ready', B: 'ready', extra: {keep: 'legacy'}});
    const records = new Map([[journalKey, original]]); let interleave = null;
    const storage = {getItem: key => records.get(key) ?? null, setItem(key, value) {
      if (interleave) { const otherTab = interleave; interleave = null; otherTab(); }
      records.set(key, value);
    }};
    const create = () => h.context.createVillageQuestJournal({quests: definitions,
      getIdentity: () => ({authenticated: true, uid: 'parallel-student'}), storage});
    const a = create(), b = create();
    if (mode === 'different-quest') {
      interleave = () => assert(b.turnIn('B', 'npc-B'));
      assert(a.turnIn('A', 'npc-A'));
      assert.equal(a.status('A'), 'completed'); assert.equal(a.status('B'), 'completed');
    } else {
      interleave = () => { assert(b.record('talk', 'npc-A')); assert(b.turnIn('A', 'npc-A')); };
      assert(a.record('talk', 'npc-A'));
      assert.equal(a.status('A'), 'completed', 'An older ready write must never erase completed');
    }
    assert.equal(records.get(journalKey), original, 'Legacy record and unknown fields remain untouched');
    assert.equal(create().status('A'), 'completed', 'Monotonic state survives a new journal instance');
  }
});
