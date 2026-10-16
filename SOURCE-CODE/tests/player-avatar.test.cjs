'use strict';
const assert = require('node:assert/strict');
const {test,before} = require('node:test');
let modelCatalog;before(async()=>{({characterModels:modelCatalog}=await import('../js/character-models.js'));});
const createHarness = require('./harness.cjs');

// The real game loop, controller, navigation, portals, weapons and peer cloning
// run here. Only GLB loading/animation visuals are injected; real skeleton/clip
// validation belongs to the separate GLB suite, not this renderer-mocked harness.
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; }
const plain = value => JSON.parse(JSON.stringify(value));
const near = (a, b, epsilon = 1e-6) => assert.ok(Math.abs(a - b) < epsilon, `${a} ≈ ${b}`);
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

function game({load, testing = true} = {}) {
  const h = createHarness({authenticated: false}), {context, run} = h;
  context.VietVillageCharacterModels=modelCatalog;
  const calls = {loads: [], disposedGLB: 0, visuals: [], events: new Map()};
  context.location = {hostname: 'localhost', search: testing ? '?characterTest=1' : ''};
  context.URLSearchParams = URLSearchParams;
  const proto = Object.getPrototypeOf(context.document.getElementById('playerAvatarPanel'));
  proto.addEventListener = function(type, listener) {
    const id = this.id + ':' + type;
    if (!calls.events.has(id)) calls.events.set(id, []);
    calls.events.get(id).push(listener);
  };
  context.loadVillageNPCGLTF = url => { calls.loads.push(url); return load ? load(url) : Promise.resolve({fixture: true}); };
  context.disposeVillageNPCGLTF = () => { calls.disposedGLB++; };
  context.createVillagePlayerGLTFVisual = ({THREE: T, height,modelId}) => {
    const root = new T.Group(); root.name = 'unit-'+modelId.split('-')[0]+'-visual'; root.userData.localOnly = true;
    const right = new T.Group(), left = new T.Group(); right.name = 'unit-right-hand-socket'; left.name = 'unit-left-hand-socket';
    right.position.set(.4, 1.1, .1); left.position.set(-.4, 1.1, .1); root.add(right, left);
    root.add(new T.Mesh(new T.BoxGeometry(.4, height, .25), new T.MeshStandardMaterial({color: 0xab426d})));
    const state = {clip: 'idle', time: 0, paused: false, defeatClip: null, reviewedDefeats: []};
    const visual = {root, modelId, sockets: {right, left}, speeds: [], once: [], updates: [], previews: [], returned: 0, disposed: false,
      clips: ['idle','walk','run','jump','slash','hit_to_body_01','defeat_02','defeat_03'].map(name => ({name, duration: 1})),
      state,
      returnToIdle() { this.returned++; state.clip = 'idle'; state.paused = false; },
      setLocomotion(speed) { this.speeds.push(speed); state.clip = speed > 5.5 ? 'run' : speed > .05 ? 'walk' : 'idle'; },
      playOnce(name) { this.once.push(name); return true; },
      preview(name) { this.previews.push(name); state.clip = name; return this.clips.some(clip => clip.name === name); },
      pausePreview() { state.paused = true; }, resumePreview() { state.paused = false; },
      setDefeatClip(name) { state.defeatClip = name; return true; }, playDefeat() { return false; },
      update(dt) { this.updates.push(dt); state.time += dt; },
      dispose() { this.disposed = true; root.removeFromParent(); }
    };
    calls.visuals.push(visual); return visual;
  };
  context.VietVillageAuth.getProfile = () => ({uid: 'unit-avatar-account'});
  context.testAuthAllowed = true;
  assert.equal(run('VietVillageGame.initialize()'), true);
  run('openScenery()');
  return {...h, calls, avatar: context.VietVillagePlayerAvatar,
    step(ms = 40) { run(`tick((last||0)+${ms})`); },
    fire(id, type, event = {}) { for (const fn of calls.events.get(id + ':' + type) || []) fn(event); }
  };
}

test('stale female requests and failed loading preserve the original player', async () => {
  const pending = deferred(), h = game({load: () => pending.promise});
  const player = h.run('player'), body = h.run('body'), position = player.position.clone();
  const loading = h.avatar.select('female'); await flush();
  assert.equal(h.avatar.state.loading, true); assert.equal(await h.avatar.select('original'), true);
  pending.resolve({fixture: true}); assert.equal(await loading, false);
  assert.equal(h.avatar.state.selected, 'original'); assert.equal(h.run('player'), player); assert.equal(h.run('body'), body);
  assert.equal(player.position.equals(position), true);
  assert.equal(h.calls.visuals[0].root.visible, false);
  assert(h.run('body.children.filter(p=>p.userData.proceduralAvatarPart).every(p=>p.visible)'));
  const failed = game({load: async () => { throw new Error('HTTP 404'); }});
  assert.equal(await failed.avatar.select('female'), false); assert.equal(failed.avatar.state.selected, 'original');
  assert.match(failed.context.document.getElementById('playerAvatarStatus').textContent, /HTTP 404/);
  assert(failed.run('player.visible&&body.children.filter(p=>p.userData.proceduralAvatarPart).every(p=>p.visible)'));
});

test('logout during asynchronous model loading cannot activate female or unlock auth', async () => {
  const pending = deferred(), h = game({load: () => pending.promise});
  const loading = h.avatar.select('female'); await flush();
  h.context.testAuthAllowed = false; h.context.VietVillageGame.lock();
  pending.resolve({fixture: true}); assert.equal(await loading, false);
  assert.equal(h.avatar.state.selected, 'original'); assert.equal(h.avatar.isOpen(), false);
  assert.equal(h.run('player.visible||localWalking||multiplayerWalking'), false);
  assert.equal(await h.avatar.select('female'), false); assert.equal(h.context.VietVillageAuth.isAuthenticated(), false);
  assert.equal(h.calls.visuals[0].root.visible, false);
});

test('actual walk/run displacement drives animation, blocked movement and release use idle', async () => {
  const h = game(); assert.equal(await h.avatar.select('female'), true);
  const visual = h.calls.visuals[0];
  h.run('yaw=0;player.position.set(0,bridgeHeight(0,10),10);keys.KeyW=true;'); h.step();
  near(visual.speeds.at(-1), 4.5); assert.equal(visual.state.clip, 'walk');
  h.run('keys.ShiftLeft=true;'); h.step(); near(visual.speeds.at(-1), 6.5); assert.equal(visual.state.clip, 'run');
  h.run('clearMotion();'); h.step(); assert.equal(visual.speeds.at(-1), 0); assert.equal(visual.state.clip, 'idle');
  h.run('player.position.set(24.1,bridgeHeight(24.1,21),21);yaw=0;keys.KeyD=true;');
  const before = h.run('player.position.clone()'); h.step();
  assert.equal(h.run('player.position').equals(before), true); assert.equal(visual.speeds.at(-1), 0);
  assert.equal(visual.state.clip, 'idle'); assert.equal(h.run('body.position.y'), 0, 'procedural bobbing is disabled for grounded GLB');
  assert.ok(visual.updates.length >= 4); assert.equal(h.calls.loads.length, 1);
});

test('switching avatars keeps actor identity, pose, HP, tutorials, inventory and current map', async () => {
  const h = game();
  h.run("playerJourney.takeDamage(31);playerJourney.recordMovement(3);playerJourney.recordSkillUse();player.userData.inventory=['book','lotus'];progress.score=270;");
  assert.equal(h.context.VietVillageRegions.travelTo('lang-tan-thu', 'village-entry').ok, true);
  const root = h.run('player'), body = h.run('body'), position = root.position.clone(), camera = h.run('camera');
  const journey = plain(h.context.VietVillageJourney.getState()), inventory = root.userData.inventory;
  for (const id of ['female','original','female','original']) {
    assert.equal(await h.avatar.select(id), true);
    assert.equal(h.run('player'), root); assert.equal(h.run('body'), body); assert.equal(h.run('camera'), camera);
    assert.equal(root.position.equals(position), true); assert.equal(root.userData.inventory, inventory);
    assert.deepEqual(plain(h.context.VietVillageJourney.getState()), journey);
    assert.equal(h.context.VietVillageRegions.currentId, 'lang-tan-thu'); assert.equal(h.run('progress.score'), 270);
  }
  assert.equal(h.calls.loads.length, 1, 'cached GLB is reused when returning to female');
});

test('weapon grip follows female socket and returns to procedural arm without resetting equipment/cooldown', async () => {
  const h = game(), weapons = h.context.VietVillageWeapons;
  assert.equal(weapons.equip('sword'), true); assert.equal(weapons.cast(1).ok, true);
  const grip = h.run("player.getObjectByName('village-local-weapon')");
  assert.equal(grip.parent, h.run('rightArm'));
  assert.equal(await h.avatar.select('female'), true); const visual = h.calls.visuals[0];
  assert.equal(grip.parent, visual.sockets.right); assert.equal(weapons.state.weaponId, 'sword'); assert.equal(weapons.state.enabled, true);
  assert.equal(weapons.cast(1).reason, 'cooldown'); near(grip.scale.x, .7);
  const tip = h.run("player.getObjectByName('sword-tip')"), point = tip.getWorldPosition(new h.context.THREE.Vector3());
  visual.sockets.right.position.x += .2; h.run('body.updateWorldMatrix(true,true)');
  near(tip.getWorldPosition(new h.context.THREE.Vector3()).distanceTo(point), .2);
  assert.equal(await h.avatar.select('original'), true); assert.equal(grip.parent, h.run('rightArm'));
  near(grip.position.y, -.50); near(grip.position.z, .28); assert.equal(weapons.state.weaponId, 'sword');
  assert.equal(weapons.cast(1).reason, 'cooldown'); assert.equal(weapons.state.enabled, true);
});

test('successful skill invokes slash once and actual HP loss invokes hit without repeated frames', async () => {
  const h = game(); await h.avatar.select('female'); const visual = h.calls.visuals[0], weapons = h.context.VietVillageWeapons;
  weapons.equip('sword'); assert.equal(weapons.cast(1).ok, true);
  assert.deepEqual(visual.once, ['slash']); assert.equal(weapons.cast(1).reason, 'cooldown'); assert.deepEqual(visual.once, ['slash']);
  assert.equal(h.context.VietVillageJourney.getState().tutorials.skills, true, 'existing skill tutorial callback remains connected');
  assert.equal(h.context.VietVillageJourney.takeDamage(10), true); h.step(); h.step();
  assert.deepEqual(visual.once, ['slash','hit_to_body_01']); assert.equal(h.context.VietVillageJourney.getState().hp, 90);
  h.context.VietVillageJourney.healToFull(); h.step(); assert.equal(visual.once.length, 2);
  weapons.equip('bow'); assert.equal(weapons.cast(1).ok, true); assert.equal(visual.once.filter(name=>name==='slash').length, 1, 'bow does not play sword slash');
});

test('test panel blocks locomotion, casting and portal activation, and closes cleanly', async () => {
  const h = game(); await h.avatar.select('female'); const weapons = h.context.VietVillageWeapons;
  weapons.equip('staff'); h.avatar.open(); assert.equal(h.avatar.isOpen(), true); assert.equal(h.run('overlays()'), true);
  const before = h.run('player.position.clone()');
  for (const handler of h.listeners.get('keydown') || []) handler({code: 'KeyW', key: 'w', target: {tagName: 'DIV'}, preventDefault() {}});
  h.run('joystick.y=1;'); h.step(); assert.equal(h.run('player.position').equals(before), true);
  assert.equal(weapons.cast(1).ok, false); assert.equal(h.context.VietVillageRegions.interact(), false);
  h.run('const ring=regionTravel.current.portal;player.position.set(ring.x,bridgeHeight(ring.x,ring.z),ring.z);regionTravel.update(0);regionTravel.update(1);');
  assert.equal(h.context.VietVillageRegions.isMenuOpen(), false); assert.equal(h.context.VietVillageRegions.currentId, 'lang-viet');
  let stopped = false;
  h.fire('playerAvatarPanel', 'pointerdown', {stopPropagation() { stopped = true; }}); assert.equal(stopped, true);
  h.fire('playerAvatarPanel', 'keydown', {key: 'Escape', stopPropagation() {}, preventDefault() {}});
  assert.equal(h.avatar.isOpen(), false); assert.equal(h.run('!!keys.KeyW||!!joystick.y'), false);
});

test('creation/profile gate blocks game input and travel independently of the animation test panel', () => {
  const h = game();
  h.context.VietVillageCharacter = {isReady: () => false, isOpen: () => true, isBlocking: () => true};
  assert.equal(h.run('overlays()'), true);
  const before = h.run('player.position.clone()'); h.run('keys.KeyW=true;joystick.y=1;'); h.step();
  assert.equal(h.run('player.position').equals(before), true); assert.equal(h.context.VietVillageRegions.interact(), false);
  assert.equal(h.context.VietVillageWeapons.equip('sword'), false, 'cannot use equipment to bypass required creation');
});

test('clip preview is isolated to the local test panel and leaves HP/tutorials untouched', async () => {
  for (const testing of [false, true]) {
    const h = game({testing}); await h.avatar.select('female'); h.avatar.open();
    const before = plain(h.context.VietVillageJourney.getState()), visual = h.calls.visuals[0];
    h.fire('preview-jump', 'click', {}); h.fire('preview-defeat_02', 'click', {}); h.fire('preview-defeat_03', 'click', {});
    assert.deepEqual(visual.previews, testing ? ['jump','defeat_02','defeat_03'] : []);
    assert.deepEqual(plain(h.context.VietVillageJourney.getState()), before);
    assert.equal(h.context.document.getElementById('playerAnimationTests').hidden, !testing);
  }
});

test('remote clones strip the local female/equipment and restore the procedural avatar visibility', async () => {
  const {createRemotePlayers} = await import('../js/remote-players.js');
  const h = game(); await h.avatar.select('female'); h.context.VietVillageWeapons.equip('sword');
  assert(h.run('body.children.filter(p=>p.userData.proceduralAvatarPart).every(p=>!p.visible)'));
  const originalDocument = globalThis.document; globalThis.document = h.context.document;
  let remote;
  try {
    remote = createRemotePlayers({THREE: h.context.THREE, game: h.context.VietVillageGame});
    const now = 100000, pose = {x: 0, y: .3, z: 20, yaw: 0, mapId: 'village', moving: false, updatedAt: now};
    remote.update({uid: 'local', members: [{uid: 'peer', nickname: 'Bạn', avatarId: 'villager-blue'}],
      connections: {peer: {connection: {}}}, poses: {peer: {connection: pose}}});
    remote.tick(.016, now);
    const peer = h.context.VietVillageGame.scene().children.find(node => node.userData.uid === 'peer');
    assert.ok(peer); assert.equal(peer.visible, true); assert.equal(peer.getObjectByName('unit-female-visual'), undefined);
    assert.equal(peer.getObjectByName('village-local-weapon'), undefined);
    const parts = peer.children[0].children.filter(node => node.userData.proceduralAvatarPart);
    assert.ok(parts.length > 0); assert.ok(parts.every(node => node.visible));
    assert.equal(h.calls.visuals[0].root.visible, true); assert.equal(h.avatar.isFemale, true);
  } finally { remote?.clear(); globalThis.document = originalDocument; }
});

test('real saved-character game bridge applies female and enters the registered village spawn without resetting progress', async () => {
  const h = game(), bridge = h.context.VietVillageGame;
  h.run("playerJourney.takeDamage(27);playerJourney.recordMovement(3);playerJourney.recordSkillUse();player.userData.inventory=['saved-book'];progress.score=140;");
  h.context.VietVillageCharacter = {isReady: () => true, isOpen: () => false, isBlocking: () => false};
  assert.equal(h.context.VietVillageRegions.travelTo('lang-tan-thu', 'village-entry').ok, true);
  const journey = plain(h.context.VietVillageJourney.getState()), root = h.run('player'), inventory = root.userData.inventory;
  assert.equal(await bridge.applyCharacter({modelId: 'female-base', name: 'Hồ sơ đã lưu'}), true);
  assert.equal(bridge.enterCharacter({newCharacter: false}), true);
  const region = h.context.VietVillageRegions.current, spawn = region.spawns['village-entry'];
  assert.equal(region.id, 'lang-viet'); near(root.position.x, spawn.x); near(root.position.y, spawn.y); near(root.position.z, spawn.z);
  assert.equal(h.run('player'), root); assert.equal(root.userData.inventory, inventory);
  assert.equal(h.avatar.isFemale, true); assert.equal(h.run('localWalking&&player.visible'), true);
  assert.deepEqual(plain(h.context.VietVillageJourney.getState()), journey); assert.equal(h.run('progress.score'), 140);
  assert.equal(await bridge.applyCharacter({modelId: 'missing-base'}), false, 'unavailable saved model never silently selects another model');
  assert.equal(h.avatar.isFemale, true);
});


test('same account re-entry preserves live map/pose; a different account uses the configured safe spawn', async () => {
  const h=game(), bridge=h.context.VietVillageGame;
  h.context.VietVillageCharacter={isReady:()=>true,isOpen:()=>false,isBlocking:()=>false};
  await bridge.applyCharacter({modelId:'female-base'});
  assert.equal(bridge.enterCharacter({newCharacter:false}),true);
  assert.equal(h.context.VietVillageRegions.travelTo('lang-tan-thu','village-entry').ok,true);
  const pose=h.run('player.position.clone()'); h.run('body.rotation.y=.7;playerJourney.takeDamage(7);');
  const state=plain(h.context.VietVillageJourney.getState());
  assert.equal(bridge.enterCharacter({newCharacter:false}),true);
  assert.equal(h.context.VietVillageRegions.currentId,'lang-tan-thu');
  assert(h.run('player.position').equals(pose));near(h.run('body.rotation.y'),.7);
  assert.deepEqual(plain(h.context.VietVillageJourney.getState()),state);
  // Even idempotent creation in another tab may report newCharacter:true.
  assert.equal(bridge.enterCharacter({newCharacter:true}),true);
  assert.equal(h.context.VietVillageRegions.currentId,'lang-tan-thu');
  h.context.VietVillageAuth.getProfile=()=>({uid:'another-unit-account'});
  assert.equal(bridge.enterCharacter({newCharacter:false}),true);
  assert.equal(h.context.VietVillageRegions.currentId,'lang-viet');
  const spawn=h.context.VietVillageRegions.current.spawns['village-entry'];
  near(h.run('player.position.x'),spawn.x);near(h.run('player.position.z'),spawn.z);
});

test('NPC social reactions are bounded, confirmed, cancellable and never trigger an attack', async () => {
  const h=game();await h.avatar.select('female');const v=h.calls.visuals[0];
  for(const name of ['greet_01','bow','agree','clap','cheer'])v.clips.push({name,duration:1});
  v.playOnce=function(name){if(this.state.busy)return false;this.once.push(name);this.state.busy=true;this.state.clip=name;return true;};
  assert.equal(h.avatar.onInteraction({type:'npc-greeting',npcId:'teacher',clip:'bow'}),true);
  for(let i=0;i<10;i++)h.avatar.onInteraction({type:'npc-agree',npcId:'teacher'});
  h.avatar.onInteraction({type:'activity-complete',npcId:'teacher',clip:'clap'});
  assert.deepEqual(v.once,['bow']);
  v.state.busy=false;h.step();assert.deepEqual(v.once,['bow','agree']);
  h.avatar.onInteraction({type:'activity-complete',npcId:'teacher',clip:'clap'});
  v.state.busy=false;h.step();assert.deepEqual(v.once,['bow','agree','clap']);
  h.avatar.onInteraction({type:'activity-complete',npcId:'teacher',clip:'cheer'});
  h.avatar.onInteraction({type:'npc-close'});v.state.busy=false;h.step();
  assert.equal(v.once.includes('cheer'),false,'closing discards queued reaction');
  assert.equal(h.avatar.onInteraction({type:'activity-complete',npcId:'other',clip:'cheer'}),false);
  assert.equal(h.avatar.onInteraction({type:'npc-greeting',npcId:'teacher',clip:'slash'}),false);
  assert.equal(h.avatar.onSkillUsed({weaponId:'unknown'}),false);
  assert.equal(v.once.includes('slash'),false);
  h.context.VietVillageJourney.takeDamage(100);
  assert.equal(h.avatar.onInteraction({type:'npc-greeting',npcId:'teacher',clip:'bow'}),false);
});

test('Space/touch jump uses authored clip once, keeps ground collider and is blocked by overlays/death', async () => {
  const h=game();await h.avatar.select('female');const v=h.calls.visuals[0],root=h.run('player'),pose=root.position.clone();
  v.playOnce=function(name){if(this.state.busy)return false;this.once.push(name);this.state.busy=true;this.state.mode='once';this.state.clip=name;return true;};
  assert.equal(h.avatar.jump(),true);assert.equal(h.avatar.jump(),false);
  assert.deepEqual(v.once,['jump']);assert(root.position.equals(pose));assert.equal(h.avatar.isJumping,true);
  h.run('const p=regionTravel.current.portal;player.position.set(p.x,bridgeHeight(p.x,p.z),p.z);regionTravel.update(1);');
  assert.equal(h.context.VietVillageRegions.isMenuOpen(),false);
  v.state.busy=false;v.state.mode='locomotion';v.state.clip='idle';
  h.avatar.open();assert.equal(h.avatar.jump(),false);h.avatar.close();
  h.context.VietVillageJourney.takeDamage(100);assert.equal(h.avatar.jump(),false);
  assert.equal(v.once.includes('slash'),false);
});


test('last requested Male wins out-of-order GLB loads; cached inactive mixers stop updating',async()=>{
 const a=deferred(),b=deferred(),h=game({load:url=>url.includes('/FEMALE/')?a.promise:b.promise});
 const f=h.avatar.select('female'),m=h.avatar.select('male');await flush();
 b.resolve({fixture:'male'});assert.equal(await m,true);assert.equal(h.avatar.state.modelId,'male-base');
 a.resolve({fixture:'female'});assert.equal(await f,false);assert.equal(h.avatar.state.selected,'male');
 const male=h.calls.visuals.find(v=>v.modelId==='male-base'),female=h.calls.visuals.find(v=>v.modelId==='female-base');
 assert.equal(male.root.visible,true);assert.equal(female.root.visible,false);h.step();
 assert.equal(female.updates.length,0);assert.equal(male.updates.length,1);
 const before=male.updates.length;
 for(const id of ['female','male','female','male','female'])await h.avatar.select(id);
 h.step();assert.equal(male.updates.length,before);assert.equal(female.root.visible,true);
 assert.equal(h.calls.loads.length,2,'only one independent instance cached per actual model');
 assert.equal(h.calls.visuals.filter(v=>v.root.visible).length,1);
 h.avatar.dispose();assert(h.calls.visuals.every(v=>v.disposed));
});

test('failed Male request retains Female; late completion after logout never changes selected actor',async()=>{
 let rejectMale=true;const pending=deferred(),h=game({load:url=>url.includes('/MALE/')?(rejectMale?Promise.reject(new Error('MALE HTTP 404')):pending.promise):Promise.resolve({fixture:'female'})});
 await h.avatar.select('female');assert.equal(await h.avatar.select('male'),false);assert.equal(h.avatar.state.selected,'female');
 assert.equal(h.calls.visuals.filter(v=>v.root.visible).length,1);rejectMale=false;
 const request=h.avatar.select('male');await flush();h.context.testAuthAllowed=false;h.context.VietVillageGame.lock();
 pending.resolve({fixture:'male'});assert.equal(await request,false);assert.equal(h.avatar.state.selected,'female');
 assert.equal(h.calls.visuals.find(v=>v.modelId==='male-base').root.visible,false);
});

test('Male saved profile shares movement, weapons, jump, NPC and map logic while retaining actor/progress',async()=>{
 const h=game(),bridge=h.context.VietVillageGame;
 h.context.VietVillageCharacter={isReady:()=>true,isOpen:()=>false,isBlocking:()=>false};
 assert.equal(await bridge.applyCharacter({modelId:'male-base',name:'Nam'}),true);
 assert.equal(bridge.enterCharacter({newCharacter:true}),true);
 assert.equal(h.avatar.isGLTF,true);assert.equal(h.avatar.isFemale,false);
 const v=h.calls.visuals[0],actor=h.run('player');
 h.run('yaw=0;player.position.set(0,bridgeHeight(0,10),10);keys.KeyW=true;');h.step();near(v.speeds.at(-1),4.5);near(h.run('body.position.y'),0);
 h.run('keys.ShiftLeft=true;');h.step();near(v.speeds.at(-1),6.5);
 h.run('clearMotion();');h.step();assert.equal(v.state.clip,'idle');
 assert.equal(h.avatar.jump(),true);assert(v.once.includes('jump'));
 v.clips.push({name:'greet_01',duration:1});assert.equal(h.avatar.onInteraction({type:'npc-greeting',npcId:'guard',clip:'greet_01'}),true);
 h.avatar.onInteraction({type:'npc-close'});
 const weapons=h.context.VietVillageWeapons;assert.equal(weapons.equip('spear'),true);
 const grip=h.run("player.getObjectByName('village-local-weapon')");assert.equal(grip.parent,v.sockets.right);
 assert.equal(weapons.cast(1).ok,true);assert(v.once.includes('slash'));
 h.context.VietVillageJourney.takeDamage(11);h.step();assert(v.once.includes('hit_to_body_01'));
 const hp=h.context.VietVillageJourney.getState().hp;
 assert.equal(h.context.VietVillageRegions.travelTo('lang-tan-thu','village-entry').ok,true);
 assert.equal(h.context.VietVillageRegions.travelTo('lang-viet','village-entry').ok,true);
 assert.equal(h.avatar.state.modelId,'male-base');assert.equal(h.run('player'),actor);assert.equal(weapons.state.weaponId,'spear');assert.equal(h.context.VietVillageJourney.getState().hp,hp);
});

test('staff skills play their measured clip segment (forced so skills can chain); other melee weapons keep slash', async () => {
  const h = game(); await h.avatar.select('female'); const visual = h.calls.visuals[0], weapons = h.context.VietVillageWeapons;
  const segments = []; visual.playSegment = (clip, options) => { segments.push({clip, ...options}); return true; };
  weapons.equip('staff');
  for (const slot of [1, 2, 3]) { assert.equal(weapons.cast(slot).ok, true); h.step(); }
  const animation = h.context.StaffVFXConfig.animation;
  assert.deepEqual(plain(segments), ['staff.con-quet', 'staff.ho-than', 'staff.chan-dia'].map(id => ({...plain(animation[id]), force: true})));
  assert.deepEqual(visual.once, [], 'the whole slash clip is no longer used for the staff');
  weapons.equip('axe'); assert.equal(weapons.cast(1).ok, true); assert.deepEqual(visual.once, ['slash']);
});
