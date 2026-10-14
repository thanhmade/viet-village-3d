// Private localhost preview service. Never hosted and never grants EXP or roles.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.FIRESTORE_EMULATOR_HOST)throw new Error('The Google localhost preview must not use emulator credentials.');
const require=createRequire(path.join(root,'firebase/functions/package.json'));
const {initializeApp}=require('firebase-admin/app'),{getAuth}=require('firebase-admin/auth');
const {makeQuestService,questPaths}=require('./quest-service.cjs');
const auth=getAuth(initializeApp({projectId:'viet-village-3d'}));
const directory=path.join(root,'.cache/learning-preview');fs.mkdirSync(directory,{recursive:true});
const file=path.join(directory,'state.json'),lock=path.join(directory,'write.lock');
const fault=(code,message)=>Object.assign(new Error(message),{code});
const db={doc:p=>({path:p,id:p.split('/').at(-1)}),async runTransaction(operation){
 let handle;
 for(let i=0;i<100;i++){try{handle=fs.openSync(lock,'wx');break;}catch(e){if(e.code!=='EEXIST')throw e;await new Promise(resolve=>setTimeout(resolve,25));}}
 if(handle===undefined)throw fault('unavailable','Kho nhiệm vụ đang được sử dụng. Hãy thử lại; dữ liệu cũ được giữ nguyên.');
 try{
  const records=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
  const writes=new Map();
  const result=await operation({get:async ref=>({exists:Object.hasOwn(records,ref.path),data:()=>structuredClone(records[ref.path])}),set:(ref,value)=>writes.set(ref.path,structuredClone(value))});
  if(writes.size){for(const [key,value] of writes)records[key]=value;const temp=file+'.'+process.pid+'.tmp';fs.writeFileSync(temp,JSON.stringify(records));fs.renameSync(temp,file);}
  return result;
 }finally{fs.closeSync(handle);fs.unlinkSync(lock);}
}};
const gameplay=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/gameplay.json'),'utf8'));
async function handle(request){
 if(!['state','begin','collect','answer'].includes(request.method))throw fault('failed-precondition','Bản thử localhost chưa mở giao bài, xác nhận giáo viên và nhận EXP.');
 if(typeof request.token!=='string'||request.token.length>12000)throw fault('unauthenticated','Cần đăng nhập Google.');
 let token;
 try{token=await auth.verifyIdToken(request.token);}catch{throw fault('unauthenticated','Chưa xác minh được Google với máy chủ. Kiểm tra mạng rồi thử lại.');}
 if(token.firebase?.sign_in_provider!=='google.com')throw fault('unauthenticated','Chỉ nhận phiên đăng nhập Google.');
 const uid=token.uid;
 await db.runTransaction(async tx=>{const ref=db.doc(questPaths(uid).character);if(!(await tx.get(ref)).exists)tx.set(ref,{uid,characterId:'primary',schemaVersion:1,created:true,scope:'localhost-preview'});});
 if(request.method==='begin'&&request.data?.mode!=='preview')throw fault('failed-precondition','Lớp học và phiêu lưu cần backend chính thức, quyền giáo viên và bài được giao. Chọn Xem thử localhost để kiểm tra.');
 const context=request.context||{};
 const service=makeQuestService({db,allowLocalPreview:true,verifyInteraction:async(info,tx)=>{
  // Client position is suitable only for this no-reward local preview, never online authority.
  if(context.mapId!=='lang-viet'||context.alive!==true||context.transitioning||context.inVillage!==true)return false;
  const p=context.position;if(!p||!['x','y','z'].every(axis=>Number.isFinite(p[axis])))return false;
  let target;
  if(info.action==='accept'){const npc=gameplay.npcs.find(n=>n.id===info.targetId);target=npc?.position;}
  else if(info.action==='collect'){const run=(await tx.get(db.doc(questPaths(uid).runs+'/'+info.questId))).data();target=run?.spawn?.position;}
  if(Array.isArray(target))target={x:target[0],y:target[1],z:target[2]};
  return !!target&&Math.hypot(p.x-target.x,p.z-target.z)<=3.2&&Math.abs(p.y-(target.y||0))<3;
 }});
 const result=await service[request.method]({uid,token},request.data);
 // The browser's existing Alpha EXP ledger remains untouched. This preview's
 // internal initial state is not an import or replacement for that progress.
 delete result.progression;
 return {...result,scope:'localhost-preview',role:'student',rewardsEnabled:false};
}
let chain=Promise.resolve();
for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
 chain=chain.then(async()=>{try{const result=await handle(JSON.parse(line));process.stdout.write(JSON.stringify({ok:true,result})+'\n');}
 catch(e){process.stdout.write(JSON.stringify({ok:false,error:{code:e.code||'unavailable',message:e.code?e.message:'Chưa đọc được kho nhiệm vụ. Dữ liệu cũ được giữ nguyên; hãy kiểm tra máy chủ local.'}})+'\n');}});
}
await chain;
