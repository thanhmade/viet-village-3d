const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const shared = path.resolve(__dirname, '../../firebase/functions/shared');
const core = require(path.join(shared, 'experience-core.js'));
const {config, initialState, normalize, grant, describe} = core;
const reward = (amount, rewardId = 'quest:one:v1') => ({amount, rewardId});

test('versioned table has all LV 1–100 with increasing requirements, separate Alpha cap and learning bands', () => {
  assert.equal(config.expToNextLevel.length, 101);
  assert.equal(config.maxLevel, 100);
  assert.equal(config.alphaMaxLevel, 20);
  assert.equal(config.expToNextLevel[0], null);
  assert.equal(config.expToNextLevel[100], null);
  for (let level = 1; level < 100; level++) {
    assert.equal(config.expToNextLevel[level], 50 * level * (level + 1));
    assert.ok(config.expToNextLevel[level] > (config.expToNextLevel[level - 1] || 0));
  }
  assert.equal(config.knowledgeBands.length, 5);
  assert.equal(config.rewards.quests.QUEST_LV_01, 60);
  assert.equal(config.rewards.quests.QUEST_LV_02, 100);
  assert.equal(config.rewards.lessons['core:0'], 40);
  assert.ok(Object.isFrozen(config.expToNextLevel));
});

test('fresh character and missing legacy EXP fields start at 1/0 without dropping other state', () => {
  const fresh = initialState();
  assert.deepEqual(fresh, {schemaVersion: 1, tableVersion: 1, level: 1, exp: 0, receipts: {}});
  assert.notEqual(fresh.receipts, initialState().receipts);
  const inventory = [{id: 'existing-sword'}];
  assert.deepEqual(normalize({inventory, quests: {done: true}}), {...fresh, inventory, quests: {done: true}});
  assert.deepEqual(normalize({level: 7, exp: 341}).level, 7);
  assert.equal(normalize({level: 7, exp: 341}).exp, 341);
  assert.equal(normalize({lv: 7, xp: 341}).level, 7);
});

test('one EXP short does not level up; exact threshold carries no EXP', () => {
  const short = grant(initialState(), reward(99));
  assert.equal(short.state.level, 1); assert.equal(short.state.exp, 99);
  assert.equal(short.levelsGained, 0); assert.equal(short.awarded, 99);
  const exact = grant(short.state, reward(1, 'last-exp'));
  assert.equal(exact.state.level, 2); assert.equal(exact.state.exp, 0);
  assert.equal(exact.levelsGained, 1);
  assert.equal(grant(initialState(), reward(100)).state.level, 2);
});

test('surplus moves to the next level and a single reward can cross multiple levels', () => {
  const surplus = grant(initialState(), reward(101));
  assert.equal(surplus.state.level, 2); assert.equal(surplus.state.exp, 1);
  const multiple = grant(initialState(), reward(1050));
  assert.equal(multiple.state.level, 4); assert.equal(multiple.state.exp, 50);
  assert.equal(multiple.levelsGained, 3); assert.equal(multiple.awarded, 1050);
});

test('Alpha cap discards only new reward overflow, reports cap and durably consumes the receipt', () => {
  const toCap = config.expToNextLevel.slice(1, config.alphaMaxLevel).reduce((sum, value) => sum + value, 0);
  const exact = grant(initialState(), reward(toCap));
  assert.equal(exact.state.level, 20); assert.equal(exact.state.exp, 0);
  assert.equal(exact.discarded, 0); assert.equal(exact.capped, true);
  const overflow = grant(initialState(), reward(toCap + 25));
  assert.equal(overflow.awarded, toCap); assert.equal(overflow.discarded, 25);
  assert.equal(overflow.levelsGained, 19); assert.equal(overflow.state.exp, 0);
  const capped = grant(overflow.state, reward(300, 'after-cap'));
  assert.equal(capped.awarded, 0); assert.equal(capped.discarded, 300);
  assert.equal(capped.state.receipts['after-cap'].awarded, 0);
  assert.equal(grant(capped.state, reward(300, 'after-cap')).duplicate, true);
});

test('legacy characters at or above the cap retain their level and saved EXP', () => {
  for (const level of [20, 32, 100, 101]) {
    const saved = {level, exp: 987654, equipment: {sword: 'owned'}};
    const restored = normalize(saved);
    assert.equal(restored.level, level); assert.equal(restored.exp, 987654);
    const result = grant(restored, reward(100));
    assert.equal(result.state.level, level); assert.equal(result.state.exp, 987654);
    assert.equal(result.awarded, 0); assert.deepEqual(result.state.equipment, saved.equipment);
  }
});

test('legacy surplus is normalized without losing overflow at the Alpha boundary', () => {
  assert.deepEqual([normalize({level: 1, exp: 1050}).level, normalize({level: 1, exp: 1050}).exp], [4, 50]);
  const value = config.expToNextLevel[19] + 76;
  const saved = {level: 19, exp: value};
  const restored = normalize(saved);
  assert.equal(restored.level, 20); assert.equal(restored.exp, 76);
  assert.deepEqual(saved, {level: 19, exp: value});
});

test('malformed, negative, non-finite, fractional and unsafe awards fail without touching state', () => {
  const state = initialState();
  const before = JSON.stringify(state);
  for (const amount of [-1, 0, 1.5, NaN, Infinity, -Infinity, '20', null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => grant(state, reward(amount)), {code: 'invalid-amount'});
  }
  assert.equal(JSON.stringify(state), before);
  const huge = grant(state, reward(Number.MAX_SAFE_INTEGER));
  assert.equal(huge.state.level, 20);
  assert.ok(Number.isSafeInteger(huge.awarded));
  assert.ok(Number.isSafeInteger(huge.discarded));
});

test('corrupt storage and unknown future table/schema versions fail closed rather than reset progress', () => {
  for (const saved of [false, 'state', [], {level: 0}, {exp: -1}, {level: '7'}, {exp: NaN}, {level: 7.5}, {receipts: []}, {receipts: {x: false}}]) {
    assert.throws(() => normalize(saved));
  }
  assert.throws(() => normalize({level: 8, exp: 70, tableVersion: 2}), {code: 'unsupported-tableVersion'});
  assert.throws(() => normalize({level: 8, exp: 70, schemaVersion: 2}), {code: 'unsupported-schemaVersion'});
});

test('same reward receipt survives JSON save/reload and never awards twice, even with a different amount', () => {
  const first = grant(initialState(), reward(60, 'QUEST_LV_01:v1'));
  const reloaded = JSON.parse(JSON.stringify(first.state));
  const duplicate = grant(reloaded, reward(1000, 'QUEST_LV_01:v1'));
  assert.equal(duplicate.duplicate, true); assert.equal(duplicate.awarded, 0);
  assert.equal(duplicate.state.level, 1); assert.equal(duplicate.state.exp, 60);
  assert.deepEqual(duplicate.state.receipts, reloaded.receipts);
  assert.equal(grant({...initialState(), receipts: {legacy: true}}, reward(90, 'legacy')).duplicate, true);
});

test('receipts do not expire or evict old awards; unusual object keys are data, not prototypes', () => {
  let state = initialState();
  for (let i = 0; i < 300; i++) state = grant(state, reward(1, 'reward:' + i)).state;
  assert.equal(Object.keys(state.receipts).length, 300);
  assert.equal(grant(state, reward(1, 'reward:0')).duplicate, true);
  state = grant(state, reward(1, '__proto__')).state;
  assert.equal(grant(JSON.parse(JSON.stringify(state)), reward(1, '__proto__')).duplicate, true);
  assert.equal(Object.getPrototypeOf(state.receipts), Object.prototype);
  assert.equal({}.awarded, undefined);
});

test('independent characters cannot share a receipt map; granting never mutates input', () => {
  const a = initialState(), b = initialState();
  const input = {...a, inventory: ['sword'], tutorial: {movement: true}};
  const before = structuredClone(input);
  const first = grant(input, reward(60));
  assert.deepEqual(input, before);
  assert.equal(grant(b, reward(60)).duplicate, false);
  assert.notEqual(first.state.receipts, input.receipts);
  assert.deepEqual(first.state.inventory, ['sword']);
});

test('invalid reward IDs cannot collapse unrelated rewards into one anonymous receipt', () => {
  for (const rewardId of ['', ' ', ' x', 'x ', 'x\n', 'a'.repeat(201), null, 1]) {
    assert.throws(() => grant(initialState(), reward(1, rewardId)), {code: 'invalid-reward-id'});
  }
});

test('one shared display uses actual current thresholds and Vietnamese formatting', () => {
  const info = describe({level: 12, exp: 1850});
  assert.equal(info.required, 7800); assert.equal(info.remaining, 5950);
  assert.equal(info.percent, 1850 / 7800 * 100);
  assert.equal(info.text, 'LV 12 · 1.850 / 7.800 EXP · 23,7%');
  const capped = describe({level: 20, exp: 90});
  assert.equal(capped.required, null); assert.equal(capped.percent, 100);
  assert.equal(capped.exp, 90); assert.match(capped.text, /giới hạn Alpha/);
});

test('browser classic scripts use the exact same source/table and enforce dependency order', () => {
  const sandbox = vm.createContext({Intl});
  const configSource = fs.readFileSync(path.join(shared, 'experience-config.js'), 'utf8');
  const coreSource = fs.readFileSync(path.join(shared, 'experience-core.js'), 'utf8');
  assert.throws(() => vm.runInContext(coreSource, vm.createContext({Intl})), /phải tải experience-config/);
  vm.runInContext(configSource, sandbox); vm.runInContext(coreSource, sandbox);
  assert.equal(sandbox.VillageExperienceCore.config, sandbox.VillageExperienceConfig);
  const result = sandbox.VillageExperienceCore.grant(null, reward(1050));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), grant(null, reward(1050)));
});
