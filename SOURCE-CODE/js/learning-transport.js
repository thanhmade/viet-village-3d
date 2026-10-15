// Google session is shared with the game; tokens stay in memory and HTTPS/loopback headers.
const functions={state:'getVillageQuestState',begin:'beginVillageQuest',collect:'collectVillageQuestItem',answer:'answerVillageQuest',assign:'assignVillageQuest',approve:'approveVillageQuestPractice',turnIn:'turnInVillageQuest',review:'reviewVillageQuest'};
export function createLearningTransport({app,auth,onlineConfig,sdkVersion,fetch:fetcher=globalThis.fetch,location:where=globalThis.location,loadFunctionsSDK=()=>import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-functions.js`)}){
 let remote,detected;
 const loopback=()=>where.protocol==='http:'&&['localhost','127.0.0.1'].includes(where.hostname);
 // online: deployed Functions. localhost: START-GAME.bat server with its private
 // quest worker. practice: any other host, including Firebase Hosting and the
 // Hosting emulator, where only labelled browser practice is available.
 function mode(){
  if(onlineConfig.enabled)return Promise.resolve('online');
  if(!loopback())return Promise.resolve('practice');
  detected??=fetcher('/__viet_village_launcher__/health',{cache:'no-store',signal:AbortSignal.timeout(3000)})
   .then(r=>r.ok?r.json():null).then(v=>v?.protocol==='viet-village-local-v1'?'localhost':'practice').catch(()=>'practice');
  return detected;
 }
 return Object.freeze({mode,async invoke(method,data,context){
  if(!Object.hasOwn(functions,method))throw new Error('Thao tác nhiệm vụ không hợp lệ.');
  const user=auth.currentUser;if(!user)throw new Error('Hãy đăng nhập Google để tải nhiệm vụ.');
  if(onlineConfig.enabled){
   remote??=loadFunctionsSDK().then(sdk=>({sdk,api:sdk.getFunctions(app,onlineConfig.functionsRegion)}));
   const {sdk,api}=await remote;if(auth.currentUser?.uid!==user.uid)throw new Error('Tài khoản đã thay đổi; hãy mở lại nhiệm vụ.');
   const result=await sdk.httpsCallable(api,functions[method])(data);
   if(auth.currentUser?.uid!==user.uid)throw new Error('Tài khoản đã thay đổi; kết quả cũ chưa áp dụng.');
   return result.data;
  }
  if(where.protocol!=='http:'||!['localhost','127.0.0.1'].includes(where.hostname))throw new Error('Bộ nhiệm vụ online chưa được bật. Hãy thử bằng START-GAME.bat trên máy tính.');
  const token=await user.getIdToken();
  if(auth.currentUser?.uid!==user.uid)throw new Error('Tài khoản đã thay đổi; hãy mở lại nhiệm vụ.');
  const response=await fetcher('/__viet_village_learning__/'+method,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({data,context}),signal:AbortSignal.timeout(30000)});
  let value;try{value=await response.json();}catch{throw new Error('Server local chưa hỗ trợ bộ nhiệm vụ. Hãy chạy lại START-GAME.bat.');}
  if(!response.ok||!value.ok)throw Object.assign(new Error(value.error?.message||'Chưa kết nối được bộ nhiệm vụ.'),{code:value.error?.code});
  if(auth.currentUser?.uid!==user.uid)throw new Error('Tài khoản đã thay đổi; kết quả cũ chưa áp dụng.');
  return value.result;
 }});
}
