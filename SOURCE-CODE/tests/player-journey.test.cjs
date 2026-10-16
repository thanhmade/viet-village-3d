'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../js/player-journey.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function runtime(options = {}) {
  let identity = options.identity || {authenticated: true, uid: 'student-a'};
  const stored = options.stored || new Map(), notices = [], scope = {};
  scope.window = scope; vm.runInNewContext(code, scope);
  const storage = options.storage || {getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value)};
  const journey = scope.createVillageJourney({getIdentity: () => { if (identity instanceof Error) throw identity; return identity; }, storage, notify: text => notices.push(text), onDamage: options.onDamage});
  return {journey, stored, notices, identity: value => { identity = value; }, scope};
}
const initial = {alive: true, hp: 100, maxHp: 100, level: 1, tutorials: {movement: false, skills: false}};

test('journey starts at character level one and returns immutable state independent of math levels', () => {
  const {journey, scope, stored} = runtime(); scope.level = 19; scope.score = 500;
  assert.deepEqual(plain(journey.getState()), initial);
  assert.ok(Object.isFrozen(journey)); assert.ok(Object.isFrozen(journey.getState()));
  assert.ok(Object.isFrozen(journey.getState().tutorials));
  assert.throws(() => { journey.getState().tutorials.movement = true; }, TypeError);
  assert.equal(stored.size, 0, 'Reading an account does not write progress or a profile');
});

test('only three meters of positive finite walking completes movement once, and skill completion is independent', () => {
  const {journey, notices, stored} = runtime();
  for (const distance of [NaN, Infinity, -3, 0, '3', undefined]) assert.equal(journey.recordMovement(distance), false);
  assert.equal(journey.recordMovement(1.5), false); assert.equal(journey.recordMovement(1.49), false);
  assert.equal(journey.getState().tutorials.movement, false);
  assert.equal(journey.recordMovement(.01), true);
  assert.equal(journey.recordMovement(5), false); assert.equal(notices.length, 1);
  assert.equal(journey.getState().tutorials.skills, false);
  assert.equal(journey.recordSkillUse(), true); assert.equal(journey.recordSkillUse(), false);
  assert.equal(notices.length, 2); assert.match(notices[0], /3 m/); assert.match(notices[1], /kỹ năng/);
  assert.deepEqual([...stored.keys()], ['viet-village:journey:v1:student-a']);
  assert.deepEqual(JSON.parse([...stored.values()][0]), {movement: true, skills: true});
  assert.deepEqual(plain(journey.getState()), {alive: true, hp: 100, maxHp: 100, level: 1, tutorials: {movement: true, skills: true}});
});

test('Google UID scopes completed flags and account switches discard partial walking and character state', () => {
  const r = runtime(), j = r.journey;
  j.recordMovement(2.8); j.recordSkillUse(); j.setCharacterState({level: 7, alive: false});
  r.identity({authenticated: true, uid: 'student-b'});
  assert.deepEqual(plain(j.getState()), initial); j.recordMovement(.3);
  assert.equal(j.getState().tutorials.movement, false);
  j.recordMovement(2.7); assert.equal(j.getState().tutorials.movement, true);
  r.identity({authenticated: true, uid: 'student-a'});
  assert.deepEqual(plain(j.getState()), {alive: true, hp: 100, maxHp: 100, level: 1, tutorials: {movement: false, skills: true}});
  j.recordMovement(.3); assert.equal(j.getState().tutorials.movement, false);
  assert.deepEqual(JSON.parse(r.stored.get('viet-village:journey:v1:student-a')), {skills: true});
  assert.deepEqual(JSON.parse(r.stored.get('viet-village:journey:v1:student-b')), {movement: true});
  assert.deepEqual(plain(runtime({stored: r.stored}).journey.getState()), plain(j.getState()), 'Reload only restores the original account\'s completed flags');
});

test('unauthenticated, failed identity reads and invalid character state fail closed without database or score writes', () => {
  const r = runtime(), j = r.journey;
  assert.equal(j.setCharacterState({level: 0}), true); assert.equal(j.getState().level, 0);
  assert.equal(j.setCharacterState({alive: false}), true);
  assert.equal(j.recordMovement(10), false); assert.equal(j.recordSkillUse(), false);
  for (const value of [null, [], {alive: 'true'}, {level: 1.5}, {level: -1}, {level: Infinity}, {level: Number.MAX_SAFE_INTEGER + 1}]) {
    j.setCharacterState({alive: true, level: 5}); assert.equal(j.setCharacterState(value), false);
    assert.equal(j.getState().alive, false); assert.equal(j.getState().level, 0);
  }
  j.setCharacterState({alive: true}); assert.equal(j.getState().level, 0, 'Partial updates preserve omitted values');
  j.setCharacterState({level: 3}); assert.equal(j.getState().alive, true);
  for (const identity of [{authenticated: false, uid: 'student-a'}, new Error('Auth unavailable'), {authenticated: 'true', uid: 'student-a'}]) {
    r.identity(identity); assert.deepEqual(plain(j.getState()), {alive: false, hp: 0, maxHp: 100, level: 0, tutorials: {movement: false, skills: false}});
    assert.equal(j.setCharacterState({alive: true, level: 99}), false); assert.equal(j.recordSkillUse(), false);
  }
  assert.equal(r.stored.size, 0);
});

test('game lock cancels accumulated movement but reauthentication can recover completed tutorial flags', () => {
  const r = runtime(), j = r.journey; j.recordSkillUse(); j.recordMovement(2.9); j.setCharacterState({level: 9});
  r.identity({authenticated: false, uid: null}); j.lock();
  assert.equal(j.getState().alive, false);
  r.identity({authenticated: true, uid: 'student-a'});
  assert.deepEqual(plain(j.getState()), {alive: true, hp: 100, maxHp: 100, level: 1, tutorials: {movement: false, skills: true}});
  j.recordMovement(.2); assert.equal(j.getState().tutorials.movement, false);
});

test('missing UID stays ephemeral; damaged or unavailable storage cannot grant fabricated completions', () => {
  const ephemeral = runtime({identity: {authenticated: true, uid: null}});
  ephemeral.journey.recordMovement(3); ephemeral.journey.recordSkillUse();
  assert.equal(ephemeral.stored.size, 0); assert.equal(ephemeral.journey.getState().tutorials.skills, true);
  ephemeral.identity({authenticated: true, uid: 'actual-uid'}); assert.deepEqual(plain(ephemeral.journey.getState()), initial);
  for (const serialized of ['bad-json', '[]', '{"movement":"true","skills":1,"level":999,"alive":true}']) {
    const stored = new Map([['viet-village:journey:v1:student-a', serialized]]);
    assert.deepEqual(plain(runtime({stored}).journey.getState()), initial);
  }
  const blocked = runtime({storage: {getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }}});
  assert.equal(blocked.journey.recordMovement(3), true); assert.equal(blocked.journey.recordSkillUse(), true);
  assert.equal(blocked.notices.length, 2);
});

test('the real game records only manual post-collision displacement, excluding paths and teleport placement', () => {
  const {run, context} = require('./harness.cjs')();
  assert.ok(context.VietVillageJourney, 'The production load order includes the journey runtime');
  run(`VietVillageGame.startRoaming();player.position.set(0,.3,21);yaw=0;
    globalThis.recordedSteps=[];globalThis.originalJourney=playerJourney;
    playerJourney={...originalJourney,recordMovement(distance){recordedSteps.push(distance);return originalJourney.recordMovement(distance);}};
    target={x:3,z:21};tick(17);tick(34);`);
  assert.ok(run('player.position.x') > 0, 'The existing path follower really moved');
  assert.equal(run('recordedSteps.length'), 0);
  // Use an ordinary walkway; placing the actor at z=20 now correctly opens the picker.
  run('target=null;player.position.set(0,.3,16);tick(51);');
  assert.equal(run('recordedSteps.length'), 0, 'Placing the actor does not count as walking');
  run('keys.KeyW=true;tick(68);keys.KeyW=false;joystick.x=1;tick(85);joystick.x=0;keys.ArrowLeft=true;tick(102);keys.ArrowLeft=false;');
  const steps = [...context.recordedSteps];
  assert.equal(steps.length, 3); assert.ok(steps.every(distance => distance > 0 && distance < .1));
  run('player.position.set(24.1,.3,21);keys.KeyD=true;tick(119);keys.KeyD=false;');
  assert.equal(run('recordedSteps[recordedSteps.length-1]'), 0, 'Pushing into the world boundary adds zero distance');
  assert.equal(context.VietVillageJourney.getState().tutorials.movement, false);
  run('player.position.set(0,.3,16);keys.KeyW=true;for(let n=8;n<=55;n++)tick(n*17);keys.KeyW=false;');
  assert.equal(context.VietVillageJourney.getState().tutorials.movement, true, 'Actual accepted manual movement reaches the three-meter requirement');
});

test('the weapon adapter reports successful casts exactly once and ignores cooldown, invalid and unavailable casts', () => {
  const {run, context} = require('./harness.cjs')();
  run(`globalThis.skillEvents=0;globalThis.skillJourney=playerJourney;
    playerJourney={...skillJourney,recordSkillUse(){skillEvents++;return skillJourney.recordSkillUse();}};`);
  const weapons = context.VietVillageWeapons;
  assert.equal(weapons.cast(1).ok, false); assert.equal(context.skillEvents, 0);
  assert.equal(weapons.equip('staff'), true);
  assert.equal(context.VietVillageJourney.getState().tutorials.skills, false);
  assert.equal(weapons.cast(99).ok, false); assert.equal(context.skillEvents, 0);
  assert.equal(weapons.cast(1).ok, true); assert.equal(context.skillEvents, 1);
  assert.equal(context.VietVillageJourney.getState().tutorials.skills, true);
  // Côn Quét blocks overlapping casts while it plays (busy), then the cooldown remains.
  assert.equal(weapons.cast(1).reason, 'busy'); assert.equal(context.skillEvents, 1);
  weapons.update(context.WeaponVFXCore.getWeaponConfigs()[0].skills[0].duration + .05);
  assert.equal(weapons.cast(1).reason, 'cooldown'); assert.equal(context.skillEvents, 1);
  context.testAuthAllowed = false; context.VietVillageGame.lock();
  assert.equal(weapons.cast(2).ok, false); assert.equal(context.skillEvents, 1);
  assert.equal(context.VietVillageJourney.getState().alive, false);
});

test('a real hit reports its source after HP drops; the hook cannot change the HP result', () => {
  const hits = [];
  const {journey} = runtime({onDamage: hit => { hits.push(plain(hit)); throw new Error('visual failure'); }});
  assert.equal(journey.takeDamage(30, {source: {position: {x: 1, y: 2, z: 3}}}), true);
  assert.deepEqual(hits, [{amount: 30, hp: 70, source: {position: {x: 1, y: 2, z: 3}}}]);
  assert.equal(journey.takeDamage(10), true);
  assert.deepEqual(hits[1], {amount: 10, hp: 60, source: null});
  for (const amount of [0, -5, NaN, Infinity]) assert.equal(journey.takeDamage(amount), false);
  assert.equal(hits.length, 2, 'rejected damage never reports a hit');
  assert.equal(journey.getState().hp, 60);
});
