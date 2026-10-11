import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {profileInput, publicPlayer} from '../js/player-profile.js';
import {normalizeRoomCode, activeMembers} from '../js/room-client.js';
import {latestPeerPose,createRemotePlayers} from '../js/remote-players.js';
import {createAuthSession} from '../js/auth-session.js';
const require = createRequire(import.meta.url);
const {requireGoogle,pruneMembers,validateProfile} = require('../../firebase/functions/room-service.cjs');
test('profile accepts nicknames/known avatars and drops email/token from room identity',()=>{
  assert.deepEqual(profileInput('  Em An  ','villager-blue'),{nickname:'Em An',avatarId:'villager-blue'});
  for(const [nickname,avatar] of [['a@school.test','villager-default'],['<b>Em</b>','villager-default'],['','villager-default'],['A'.repeat(25),'villager-default'],['An','unknown']])assert.throws(()=>profileInput(nickname,avatar));
  assert.deepEqual(publicPlayer({uid:'fixture-a',nickname:'An',avatarId:'villager-blue',email:'unit@example.invalid',token:'fixture-only'}),{uid:'fixture-a',nickname:'An',avatarId:'villager-blue'});
  assert.throws(()=>validateProfile({uid:'wrong',nickname:'An',avatarId:'villager-blue'},'fixture-a'));
});
test('server rejects missing auth and all non-Google providers',()=>{
  for(const auth of [null,{uid:'a',token:{role:'teacher'}},{uid:'a',token:{firebase:{sign_in_provider:'password'}}}])assert.throws(()=>requireGoogle(auth),{code:'unauthenticated'});
  assert.equal(requireGoogle({uid:'fixture-google',token:{firebase:{sign_in_provider:'google.com'}}}),'fixture-google');
});
test('rooms normalize code; count UID once; prune expired individual sessions',()=>{
  assert.equal(normalizeRoomCode(' abc234 '),'ABC234');assert.throws(()=>normalizeRoomCode('abc0'));
  const input={a:{nickname:'An',avatarId:'villager-default',leaseExpiresAt:500,connections:{one:{leaseExpiresAt:500},two:{leaseExpiresAt:30}}},b:{leaseExpiresAt:40,connections:{old:{leaseExpiresAt:40}}}};
  assert.equal(activeMembers(input,100).length,1);
  const pruned=pruneMembers(input,100);assert.deepEqual(Object.keys(pruned),['a']);assert.deepEqual(Object.keys(pruned.a.connections),['one']);
  assert.equal(Object.keys(input.a.connections).length,2,'pruning does not mutate transaction snapshot');
});
test('remote avatars accept only current room connections and fresh poses',()=>{
  const allowed={first:{},second:{}};const now=100000;
  assert.equal(latestPeerPose({first:{updatedAt:90000},second:{updatedAt:99000},outsider:{updatedAt:100000}},allowed,now).updatedAt,99000);
  assert.equal(latestPeerPose({first:{updatedAt:1}},allowed,now),null);
  assert.equal(latestPeerPose({first:{updatedAt:999999}},allowed,now),null);
});
test('Google session validation, private draft and logout race remain intact (unit fixtures only)',async()=>{
  const user={uid:'unit-only-user',isAnonymous:false},auth={currentUser:user};let resolve;
  const wait=new Promise(r=>resolve=r);
  const sdk={reload:async()=>{},getIdTokenResult:async()=>({expirationTime:new Date(Date.now()+3600000).toISOString(),claims:{aud:'viet-village-3d',sub:user.uid,firebase:{sign_in_provider:'google.com'}}}),
    signOut:async()=>{await wait;auth.currentUser=null;},signInWithPopup:async()=>{}};
  const session=createAuthSession({sdk,auth,provider:{},projectId:'viet-village-3d',onState:()=>{},schedule:()=>1,cancel:()=>{}});
  assert.equal(await session.verify(),true);assert.equal(session.getProfile().uid,user.uid);
  assert.equal(JSON.stringify(session.getProfile()).includes('email'),false);
  const logout=session.signOut();assert.equal(session.isAuthenticated(),false);assert.equal(session.getProfile(),null);resolve();await logout;
  assert.equal(await session.verify(),false);
});
test('game remains blocked before verified auth; room walking is an optional addition',()=>{
  const {run,context}=require('./harness.cjs')({authenticated:false});
  assert.equal(run('typeof renderer'),'undefined');assert.equal(run('VietVillageGame.initialize()'),false);
  run('openScenery();startRoomWalk();');assert.equal(run('typeof renderer'),'undefined');assert.equal(run('overlays()'),true);
  context.testAuthAllowed=true;assert.equal(run('VietVillageGame.initialize()'),true);
  run('openScenery()');assert.equal(run('player.visible'),false,'existing standalone scenery behavior preserved');
  context.VietVillageOnline={hasRoom:()=>true};run('startRoomWalk()');assert.equal(run('player.visible && multiplayerWalking'),true);
  assert.equal(run('VietVillageGame.getPose().mapId'),'village');
  run('VietVillageGame.lock()');assert.equal(run('multiplayerWalking || active || insideHouse'),false);
});
test('Three.js peer clones keep UID, map visibility and original geometry; limited to seven peers',()=>{
  const {run,context}=require('./harness.cjs')();run('openScenery()');
  const originalDocument=globalThis.document;globalThis.document=context.document;
  const template=context.VietVillageGame.avatarTemplate(),shirt=template.children[0].children.find(mesh=>mesh.material?.color.getHex()===0x269991);
  let disposedGeometry=0;shirt.geometry.addEventListener('dispose',()=>disposedGeometry++);
  const remote=createRemotePlayers({THREE:context.THREE,game:context.VietVillageGame}),now=Date.now();
  const actors=Array.from({length:9},(_,i)=>({uid:'peer-'+i,nickname:'Bạn '+i,avatarId:'villager-blue'}));
  const state={uid:'local-fixture',members:actors,
    connections:Object.fromEntries(actors.map(actor=>[actor.uid,{session:{}}])),
    poses:Object.fromEntries(actors.map(actor=>[actor.uid,{session:{x:0,y:.3,z:21,yaw:0,mapId:'village',moving:true,updatedAt:now}}]))};
  try {
    remote.update(state);remote.tick(.016,now);
    const copies=context.VietVillageGame.scene().children.filter(root=>root.userData.uid);
    assert.equal(copies.length,7);assert.equal(new Set(copies.map(root=>root.userData.uid)).size,7);assert.ok(copies.every(root=>root.visible));
    const peerShirt=copies[0].children[0].children.find(mesh=>mesh.material?.color.getHex()===0x407cc2);
    assert.ok(peerShirt);assert.notEqual(peerShirt.material,shirt.material);assert.equal(peerShirt.geometry,shirt.geometry);
    assert.equal(shirt.material.color.getHex(),0x269991);
    state.poses['peer-0'].session.mapId='house-1';remote.tick(.016,now);assert.equal(copies[0].visible,false);
    remote.clear();assert.equal(context.VietVillageGame.scene().children.filter(root=>root.userData.uid).length,0);
    assert.equal(disposedGeometry,0,'removing peers must preserve shared source model geometry');
  } finally {remote.clear();globalThis.document=originalDocument;}
});
