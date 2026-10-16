const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'},root=path.resolve(__dirname,'../..');
 const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch(e){res.statusCode=404;res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 const browser=await chromium.launch({executablePath:process.env.VILLAGE_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.addInitScript(()=>{window.__frames=[];window.requestAnimationFrame=f=>{__frames.push(f);return __frames.length;};});
 // Isolated local fixture: no real Firebase sign-in, no auth code or account mutation.
 await page.route('**/js/auth-entry.js*',route=>route.fulfill({contentType:'text/javascript',body:`import './character-models.js';
 window.VietVillageAuth={isAuthenticated:()=>true,getProfile:()=>({uid:'local-staff-fixture'}),enterGame:fn=>fn()};
 window.VietVillageExperiencePolicy={localOnly:true};document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;
 for(const n of document.querySelectorAll('[inert]'))n.inert=false;VietVillageGame.initialize();await VietVillagePlayerAvatar.select('male');VietVillageGame.startRoaming();window.ready=true;`}));
 await page.goto('http://127.0.0.1:'+port+'/SOURCE-CODE/index.html');await page.waitForFunction(()=>window.ready,null,{polling:100,timeout:30000});
 const result=await page.evaluate(()=>{
  VietVillageWeapons.equip('staff');let first=VietVillageWeapons.cast(1);if(!first.ok)throw Error(JSON.stringify(first));
  const before=player.position.clone();let now=0;const step=()=>{now+=34;const f=__frames.splice(0);for(const callback of f)callback(now);};
  for(let i=0;i<20;i++)step();const mid={visible:player.visible,busy:VietVillagePlayerAvatar.state.animation.busy,active:VietVillageWeapons.state.active};
  const tip=scene.getObjectByName('staff-tip').getWorldPosition(new THREE.Vector3()).toArray();
  const blocked=VietVillageWeapons.cast(2);VietVillageWeapons.deactivate();const putAway={visible:player.visible,walking:localWalking,busy:VietVillagePlayerAvatar.state.animation.busy,active:VietVillageWeapons.state.active};
  VietVillageWeapons.equip('staff');for(let i=0;i<80;i++)step();const again=VietVillageWeapons.cast(1);keys.KeyW=true;
  for(let i=0;i<65;i++)step();keys.KeyW=false;const after={visible:player.visible,busy:VietVillagePlayerAvatar.state.animation.busy,active:VietVillageWeapons.state.active,moved:player.position.distanceTo(before)};
  return {first,mid,tip,blocked,putAway,again,after};
 });
 assert(result.mid.visible&&result.mid.busy&&result.mid.active===1);assert(!result.blocked.ok);assert(result.putAway.visible&&result.putAway.walking&&!result.putAway.busy&&result.putAway.active===0);assert(result.again.ok);assert(result.after.visible&&!result.after.busy&&result.after.active===0&&result.after.moved>0);assert.equal(errors.length,0);
 console.log(JSON.stringify({passed:true,result,errors}));} finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
