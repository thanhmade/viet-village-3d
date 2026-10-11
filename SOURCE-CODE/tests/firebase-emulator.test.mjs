import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,updateDoc,serverTimestamp as firestoreTime,Timestamp} from 'firebase/firestore';
import * as databaseSDK from 'firebase/database';
import {ref,get,set,update,remove,onDisconnect,goOffline,goOnline,serverTimestamp as databaseTime} from 'firebase/database';
import {createRoomClient} from '../js/room-client.js';
const require=createRequire(import.meta.url);
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getDatabase}=require('firebase-admin/database');
const {getFirestore}=require('firebase-admin/firestore');
// These are explicitly local emulator identities, not real Google accounts or production tokens.
const projectId='demo-viet-village-3d', namespace=projectId;
for(const variable of ['FIREBASE_DATABASE_EMULATOR_HOST','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST'])
  if(!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[variable] || ''))throw new Error('Refusing test without loopback emulator: '+variable);
const google={firebase:{sign_in_provider:'google.com'}},id=n=>n.toString(16).padStart(32,'0');
let environment,admin,db,firestore,teacher,student,outsider,room;
function context(uid,role) {return environment.authenticatedContext(uid,{...google,...(role?{role}:{})});}
function database(client) {return client.database('https://'+namespace+'.firebaseio.com');}
const profile=uid=>({uid,nickname:'Em '+uid.replace('fixture-',''),avatarId:'villager-default',schemaVersion:1,
  createdAt:firestoreTime(),lastLoginAt:firestoreTime()});
function mockEmulatorToken(uid,role) {
  const now=Math.floor(Date.now()/1000);
  return [Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url'),
    Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/'+projectId,aud:projectId,sub:uid,user_id:uid,
      iat:now,exp:now+3600,auth_time:now,...google,...(role?{role}:{})})).toString('base64url'),''].join('.');
}
async function call(name,uid,data,role) {
  const response=await fetch(`http://127.0.0.1:5002/${projectId}/asia-southeast1/${name}`,{
    method:'POST',headers:{'Content-Type':'application/json',...(uid?{Authorization:'Bearer '+mockEmulatorToken(uid,role)}:{})},body:JSON.stringify({data})});
  const payload=await response.json();
  if(payload.error)throw Object.assign(new Error(payload.error.message),{code:payload.error.status});
  assert.ok(response.ok,JSON.stringify(payload));return payload.result;
}
async function eventually(check,label,timeout=10000) {
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){if(await check())return;await new Promise(resolve=>setTimeout(resolve,150));}
  assert.fail(label);
}
before(async()=>{
  environment=await initializeTestEnvironment({projectId,
    firestore:{host:'127.0.0.1',port:8081,rules:readFileSync('firebase/firestore.rules','utf8')},
    database:{host:'127.0.0.1',port:9001,rules:readFileSync('firebase/database.rules.json','utf8')}});
  await environment.clearFirestore();await environment.clearDatabase();
  admin=initializeApp({projectId,databaseURL:'https://'+namespace+'.firebaseio.com'},'village-emulator-tests');
  db=getDatabase(admin);firestore=getFirestore(admin);
  teacher=context('fixture-teacher','teacher');student=context('fixture-student');outsider=context('fixture-outsider');
});
after(async()=>{await environment?.cleanup();if(admin)await deleteApp(admin);});
test('Firestore: UID owner only, real request timestamps, no email/roles/scores/list access',async()=>{
  const own=teacher.firestore(), ownDoc=doc(own,'players','fixture-teacher');
  await assertSucceeds(setDoc(ownDoc,profile('fixture-teacher')));
  await assertSucceeds(setDoc(doc(student.firestore(),'players','fixture-student'),profile('fixture-student')));
  await assertSucceeds(getDoc(ownDoc));
  await assertFails(getDoc(doc(student.firestore(),'players','fixture-teacher')));
  await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(),'players','fixture-teacher')));
  await assertFails(getDocs(collection(own,'players')));
  for(const extra of [{role:'teacher'},{email:'private@example.invalid'},{score:10000},{createdAt:Timestamp.fromMillis(1)}])
    await assertFails(updateDoc(ownDoc,{...extra,lastLoginAt:firestoreTime()}));
  await assertSucceeds(updateDoc(ownDoc,{nickname:'Cô giáo',avatarId:'villager-blue',lastLoginAt:firestoreTime()}));
  await assertFails(setDoc(doc(student.firestore(),'players','another-uid'),profile('another-uid')));
  const password=environment.authenticatedContext('fixture-password',{firebase:{sign_in_provider:'password'}});
  await assertFails(setDoc(doc(password.firestore(),'players','fixture-password'),profile('fixture-password')));
});
test('callable backend: Google auth required; payload cannot grant teacher role',async()=>{
  await assert.rejects(call('createVillageRoom',null,{title:'Fixture room',connectionId:id(1)}),{code:'UNAUTHENTICATED'});
  await assert.rejects(call('createVillageRoom','fixture-student',{title:'Fixture room',connectionId:id(1),role:'teacher'}),{code:'PERMISSION_DENIED'});
  room=await call('createVillageRoom','fixture-teacher',{title:'Phòng emulator',connectionId:id(1)},'teacher');
  assert.match(room.code,/^[A-Z2-9]{6}$/);assert.equal(room.maxPlayers,8);
  await call('joinVillageRoom','fixture-student',{code:room.code,connectionId:id(2)});
  const snapshot=(await db.ref('rooms/'+room.code).get()).val();assert.equal(Object.keys(snapshot.members).length,2);
  assert.equal(JSON.stringify(snapshot).includes('email'),false);
});
test('Realtime Database: deny outsiders/anonymous, membership/role forgery, metadata edits',async()=>{
  const s=database(student),o=database(outsider),anonymous=database(environment.unauthenticatedContext());
  await assertSucceeds(get(ref(s,'rooms/'+room.code)));
  await assertFails(get(ref(o,'rooms/'+room.code)));await assertFails(get(ref(anonymous,'rooms/'+room.code)));
  await assertFails(get(ref(s,'rooms')));await assertFails(get(ref(s,'presence')));
  await assertFails(set(ref(s,'rooms/ABC234'),{meta:{ownerUid:'fixture-student',maxPlayers:99}}));
  await assertFails(update(ref(s,'rooms/'+room.code+'/meta'),{maxPlayers:99}));
  await assertFails(set(ref(s,'roles/fixture-student'),'teacher'));
  await assertFails(set(ref(s,'rooms/'+room.code+'/members/fixture-outsider'),{nickname:'Intruder'}));
  await assertFails(update(ref(s,'rooms/'+room.code+'/members/fixture-student'),{nickname:'Changed outside server'}));
  await assertFails(set(ref(s,'rooms/'+room.code+'/members/fixture-student/connections/'+id(99)),{joinedAt:Date.now(),leaseExpiresAt:Date.now()+60000}));
});
test('two distinct emulator identities: shared poses, map IDs, and rejection of forged/oversized data',async()=>{
  const t=database(teacher),s=database(student);
  const pose={x:0,y:.3,z:21,yaw:0,mapId:'village',moving:false,updatedAt:databaseTime()};
  const target=`presence/${room.code}/fixture-teacher/${id(1)}`;
  await assertSucceeds(set(ref(t,target),pose));
  assert.equal((await get(ref(s,target))).val().mapId,'village');
  await assertFails(set(ref(s,target),pose));
  const own=`presence/${room.code}/fixture-student/${id(2)}`;
  for(const invalid of [{x:999},{email:'private@example.invalid'},{mapId:'admin'},{updatedAt:1}])
    await assertFails(set(ref(s,own),{...pose,...invalid}));
  await assertSucceeds(set(ref(s,own),{...pose,mapId:'house-1'}));
  const lease=`rooms/${room.code}/members/fixture-student/connections/${id(2)}/leaseExpiresAt`;
  await assertSucceeds(set(ref(s,lease),Date.now()+58000));
  await assertFails(set(ref(s,lease),Date.now()+999999));
  await assertFails(set(ref(s,`rooms/${room.code}/members/fixture-teacher/connections/${id(1)}/leaseExpiresAt`),Date.now()+58000));
});
test('same UID in two windows occupies one seat and leaving one preserves the other',async()=>{
  await call('joinVillageRoom','fixture-student',{code:room.code,connectionId:id(3)});
  let snapshot=(await db.ref('rooms/'+room.code).get()).val();assert.equal(Object.keys(snapshot.members).length,2);
  assert.equal(Object.keys(snapshot.members['fixture-student'].connections).length,2);
  await call('leaveVillageRoom','fixture-student',{code:room.code,connectionId:id(2)});
  snapshot=(await db.ref('rooms/'+room.code).get()).val();assert.ok(snapshot.members['fixture-student'].connections[id(3)]);
});
test('12 concurrent join calls never exceed 8 UID; requests cannot bypass maxPlayers',async()=>{
  const crowded=await call('createVillageRoom','fixture-teacher',{title:'Kiểm tra đồng thời',connectionId:id(4)},'teacher');
  const actors=Array.from({length:12},(_,i)=>'fixture-load-'+i);
  await Promise.all(actors.map(uid=>firestore.doc('players/'+uid).set({uid,nickname:'Em thử nghiệm',avatarId:'villager-default',schemaVersion:1})));
  const results=await Promise.allSettled(actors.map((uid,i)=>call('joinVillageRoom',uid,{code:crowded.code,connectionId:id(100+i)})));
  const snapshot=(await db.ref('rooms/'+crowded.code).get()).val();assert.equal(Object.keys(snapshot.members).length,8);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,7);
  assert.equal(results.filter(r=>r.status==='rejected' && r.reason.code==='RESOURCE_EXHAUSTED').length,5);
  await assert.rejects(call('joinVillageRoom','fixture-student',{code:crowded.code,connectionId:id(200),maxPlayers:99}),{code:'INVALID_ARGUMENT'});
});
test('onDisconnect removes only its session; backend clears last member and reconnect can rejoin',async()=>{
  const s=database(student),member=`rooms/${room.code}/members/fixture-student/connections/${id(3)}`;
  await onDisconnect(ref(s,member)).remove();
  await onDisconnect(ref(s,`presence/${room.code}/fixture-student/${id(3)}`)).remove();
  goOffline(s);
  await eventually(async()=>!(await db.ref(`rooms/${room.code}/members/fixture-student`).get()).exists(),'Disconnected UID should be removed');
  await call('joinVillageRoom','fixture-student',{code:room.code,connectionId:id(5)});
  assert.ok((await db.ref(`rooms/${room.code}/members/fixture-student/connections/${id(5)}`).get()).exists());
});
test('expired orphan reservations are reclaimed atomically on the next join',async()=>{
  await db.ref(`rooms/${room.code}/members/fixture-student/connections/${id(5)}/leaseExpiresAt`).set(Date.now()-1);
  await call('joinVillageRoom','fixture-student',{code:room.code,connectionId:id(6)});
  const value=(await db.ref(`rooms/${room.code}/members/fixture-student`).get()).val();
  assert.deepEqual(Object.keys(value.connections),[id(6)]);
});
test('only trusted owner/admin can close; closed room rejects joins and writes',async()=>{
  await assert.rejects(call('closeVillageRoom','fixture-student',{code:room.code}),{code:'PERMISSION_DENIED'});
  await assert.rejects(call('closeVillageRoom','fixture-outsider',{code:room.code},'teacher'),{code:'PERMISSION_DENIED'});
  await call('closeVillageRoom','fixture-teacher',{code:room.code},'teacher');
  assert.equal((await db.ref('rooms/'+room.code+'/meta/status').get()).val(),'closed');
  await assert.rejects(call('joinVillageRoom','fixture-student',{code:room.code,connectionId:id(7)}),{code:'FAILED_PRECONDITION'});
  assert.equal((await db.ref('rooms/'+room.code+'/members').get()).exists(),false);
});
test('real client SDK lifecycle against emulator: two UID see poses, disconnect/rejoin and leave',async()=>{
  const classroom=await call('createVillageRoom','fixture-teacher',{title:'Luồng trình duyệt',connectionId:id(500)},'teacher');
  const identities=['fixture-client-a','fixture-client-b'];
  await Promise.all(identities.map(uid=>firestore.doc('players/'+uid).set({uid,nickname:'Em cùng chơi',avatarId:'villager-blue',schemaVersion:1})));
  const databases=identities.map(uid=>database(context(uid))),states=[null,null],peers=[null,null];
  const config={leaseMs:60000,heartbeatMs:15000,poseIntervalMs:100};
  const clients=identities.map((uid,i)=>createRoomClient({db:databases[i],sdk:databaseSDK,config,getUid:()=>uid,
    invoke:(name,data)=>call(name,uid,data),onState:value=>{states[i]=value;},onPeers:value=>{peers[i]=value;},
    getPose:()=>({x:i*2,y:.3,z:21,yaw:0,mapId:'village',moving:false})}));
  try {
    await eventually(()=>states.every(state=>state?.connected),'Both clients connect');
    await clients[0].join(classroom.code);await clients[1].join(classroom.code);
    await eventually(()=>peers[0]?.members.length===3 && peers[1]?.poses[identities[0]],'Each client sees the same members and pose');
    const oldConnection=states[0].room.connectionId;
    goOffline(databases[0]);await eventually(()=>states[0]?.connected===false && peers[0]===null,'Offline client hides peers');
    await eventually(async()=>!(await db.ref(`rooms/${classroom.code}/members/${identities[0]}/connections/${oldConnection}`).get()).exists(),'Server releases offline session');
    goOnline(databases[0]);
    await eventually(()=>states[0]?.connected && states[0]?.room?.connectionId!==oldConnection && states[0]?.members.length===3,'Client automatically rejoins with a new connection');
    await clients[0].leave();await clients[1].leave();
    await eventually(async()=>!(await db.ref(`rooms/${classroom.code}/members/${identities[0]}`).get()).exists()
      && !(await db.ref(`rooms/${classroom.code}/members/${identities[1]}`).get()).exists(),'Leaving removes both client UID');
  } finally {for(const client of clients){await client.leave();client.dispose();}}
});
