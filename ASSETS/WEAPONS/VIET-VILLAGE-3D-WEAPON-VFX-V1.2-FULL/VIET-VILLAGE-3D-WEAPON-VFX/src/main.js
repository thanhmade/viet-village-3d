import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {WEAPON_DATA,createWeapon} from './models.js?v=1.2.0';
import {WeaponVFX} from './effects.js?v=1.2.0';

const $=s=>document.querySelector(s);
const BUILD_VERSION='1.2.0';
const switchDiagnostic={version:BUILD_VERSION,selected:'',lastRequested:'',lastError:'',successes:0,failures:0};
window.__WEAPON_VFX_DIAGNOSTICS__=switchDiagnostic;
const viewport=$('#viewport');
let renderer,scene,camera,orbit,vfx,weapon,weaponRoot,clock,target,stageAura,glowRing,dust;
let active=WEAPON_DATA[0],quality='high',lastAttack=0,soundEnabled=false,actTime=0,actMode=-1;
let hp=500,kills=0,damageCount=0,frame=0,fpsTimer=0;
const targetPosition=new THREE.Vector3(2.05,1.34,0);
const attackOrigin=new THREE.Vector3(-.65,1.65,.05);
const cooldown=[.55,1.7,4.2],nextUsable=[0,0,0];
const baseColor=new THREE.Color(0x131d2b);
const col=(c,roughness=.62,metalness=.25)=>new THREE.MeshStandardMaterial({color:c,roughness,metalness});
function makeMesh(geom,material,parent,x=0,y=0,z=0){
  const m=new THREE.Mesh(geom,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function addGround(){
  const ground=makeMesh(new THREE.CircleGeometry(35,64),col(0x151b24,.9),scene,0,-.07,0);
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.castShadow=false;
  const grid=new THREE.GridHelper(24,36,0x274159,0x203043);
  grid.position.y=-.049;grid.material.transparent=true;grid.material.opacity=.22;scene.add(grid);
  const pedestalMat=col(0x303a44,.45,.65),trim=col(0xb38a52,.32,.77);
  for(const x of [-1.3,2.05]){
    const base=makeMesh(new THREE.CylinderGeometry(.93,1.06,.18,48),pedestalMat,scene,x,.03,0);
    makeMesh(new THREE.TorusGeometry(.93,.012,8,64),trim,scene,x,.135,0).rotation.x=Math.PI/2;
    makeMesh(new THREE.TorusGeometry(.74,.01,8,64),col(0x52748a,.35,.35),scene,x,.137,0).rotation.x=Math.PI/2;
    const inner=new THREE.Mesh(new THREE.CircleGeometry(.73,48),new THREE.MeshBasicMaterial({color:x<0?0x142e43:0x302924,transparent:true,opacity:.32,side:THREE.DoubleSide}));
    inner.rotation.x=-Math.PI/2;inner.position.set(x,.138,0);scene.add(inner);
  }
  glowRing=makeMesh(new THREE.TorusGeometry(.81,.025,7,80),new THREE.MeshBasicMaterial({color:0x65dffe,transparent:true,opacity:.75,blending:THREE.AdditiveBlending}),scene,-1.30,.16,0);
  glowRing.rotation.x=Math.PI/2;
  stageAura=makeMesh(new THREE.TorusGeometry(1.11,.005,5,72),new THREE.MeshBasicMaterial({color:0x65dffe,transparent:true,opacity:.25,blending:THREE.AdditiveBlending}),scene,-1.30,.12,0);
  stageAura.rotation.x=Math.PI/2;
  for(let i=0;i<13;i++){
    const a=i/13*Math.PI*2;
    const m=makeMesh(new THREE.BoxGeometry(.028,.024,.145),col(0xb39561,.5,.6),scene,-1.3+Math.cos(a)*1.02,.154,Math.sin(a)*1.02);
    m.rotation.y=-a;
  }
  const n=150,positions=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    positions[i*3]=(Math.random()-.5)*20;
    positions[i*3+1]=.7+Math.random()*5;
    positions[i*3+2]=(Math.random()-.5)*12;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));
  dust=new THREE.Points(g,new THREE.PointsMaterial({color:0x7395bd,size:.025,transparent:true,opacity:.43,sizeAttenuation:true,depthWrite:false}));scene.add(dust);
}
function addDummy(){
  target=new THREE.Group();target.position.set(2.05,.15,0);scene.add(target);
  const grey=col(0x6c7e8f,.53,.65), dark=col(0x333e4b,.77,.24),bright=col(0xb29c75,.42,.65);
  // Stylized wooden practice dummy/armored training stand.
  makeMesh(new THREE.CylinderGeometry(.12,.16,1.27,12),dark,target,0,.65,0);
  makeMesh(new THREE.BoxGeometry(.82,.95,.37),grey,target,0,1.40,0);
  makeMesh(new THREE.OctahedronGeometry(.34,0),bright,target,0,2.01,0);
  makeMesh(new THREE.CylinderGeometry(.19,.19,.12,14),bright,target,0,2.24,0);
  [-1,1].forEach(s=>{
    const arm=makeMesh(new THREE.CylinderGeometry(.11,.125,.83,10),dark,target,s*.59,1.43,0);
    arm.rotation.z=s*.65;
    makeMesh(new THREE.SphereGeometry(.16,12,8),bright,target,s*.39,1.80,0);
  });
  makeMesh(new THREE.TorusGeometry(.19,.04,7,20),bright,target,0,1.46,.215);
  [-1,1].forEach(s=>makeMesh(new THREE.CylinderGeometry(.11,.13,.56,9),grey,target,s*.24,.70,0));
  makeMesh(new THREE.CircleGeometry(.24,32),new THREE.MeshBasicMaterial({color:0xffb36a,side:THREE.DoubleSide,transparent:true,opacity:.6}),target,0,1.44,.221);
}
function setup(){
  clock=new THREE.Clock();scene=new THREE.Scene();scene.background=new THREE.Color(0x111b28);
  scene.fog=new THREE.FogExp2(0x0b1421,.023);
  camera=new THREE.PerspectiveCamera(39,1,.1,75);camera.position.set(.75,3.05,8.45);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  viewport.appendChild(renderer.domElement);
  orbit=new OrbitControls(camera,renderer.domElement);
  orbit.target.set(.21,1.24,0);
  orbit.enableDamping=true;orbit.dampingFactor=.06;
  orbit.minDistance=4.3;orbit.maxDistance=13;
  orbit.maxPolarAngle=Math.PI*.49;orbit.minPolarAngle=.43;
  orbit.enablePan=false;
  const hemi=new THREE.HemisphereLight(0xa6caff,0x26201b,2.0);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffe2ba,3.5);key.position.set(-2,8,5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;
  key.shadow.bias=-.0005;scene.add(key);
  const fill=new THREE.PointLight(0x3799ff,22,14,2);fill.position.set(-4,2,-3);scene.add(fill);
  const hot=new THREE.PointLight(0xffb76e,16,12,2);hot.position.set(4,3,-1);scene.add(hot);
  addGround();addDummy();
  weaponRoot=new THREE.Group();weaponRoot.position.set(-1.3,.27,0);scene.add(weaponRoot);
  vfx=new WeaponVFX(THREE,scene,{quality});
  selectWeapon('sword');
  window.addEventListener('resize',resize);resize();
  requestAnimationFrame(tick);
  announceSwitch(`✓ Đã tải V${BUILD_VERSION} · chọn vũ khí 1–5, đánh J/K/L`);
  $('#error-overlay').hidden=true;
}
function resize(){
  if(!renderer)return;
  const rect=viewport.getBoundingClientRect(),w=Math.max(200,rect.width),h=Math.max(300,rect.height);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<560?50:39;camera.updateProjectionMatrix();
}
function announceSwitch(message,error=false){
  const el=$('#switch-diagnostic');
  if(el){el.textContent=message;el.dataset.state=error?'error':'ok';}
  const status=$('#status');
  if(status)status.textContent=message;
}
function selectWeapon(id){
  switchDiagnostic.lastRequested=id;
  const item=WEAPON_DATA.find(w=>w.id===id);
  if(!item){announceSwitch('Không tìm thấy mã vũ khí: '+id,true);return false;}
  if(!weaponRoot){announceSwitch('Cảnh 3D đang khởi tạo, vui lòng thử lại.',true);return false;}
  let nextWeapon=null;
  try {
    nextWeapon=createWeapon(THREE,id);
    if(!nextWeapon || !nextWeapon.children.length)throw Error('Mô hình không có bộ phận 3D.');
    nextWeapon.name=`ACTIVE_${id.toUpperCase()}`;
    nextWeapon.position.set(0,0,0);
    nextWeapon.rotation.set(0,0,id==='bow'?-.14:.11);
    nextWeapon.scale.setScalar(id==='spear'?.81:id==='axe'?.93:1);
    weaponRoot.add(nextWeapon);
  } catch(err) {
    if(nextWeapon){weaponRoot.remove(nextWeapon);try{destroyModel(nextWeapon);}catch{}}
    switchDiagnostic.failures++;
    switchDiagnostic.lastError=String(err?.stack||err);
    console.error(`[WEAPON V${BUILD_VERSION}] Tạo ${item.name} thất bại`,err);
    announceSwitch(`❌ ${item.name}: ${err?.message||err}`,true);
    return false;
  }
  // Commit the change before optional cleanup. A cleanup failure cannot revert the UI.
  const previous=weapon;
  weapon=nextWeapon;
  active=item;
  actTime=0;actMode=-1;
  if(previous){
    weaponRoot.remove(previous);
    try{destroyModel(previous);}catch(err){console.warn('Giải phóng mô hình cũ thất bại',err);}
  }
  try{vfx?.clear();}catch(err){console.warn('VFX không thể xóa hoàn toàn',err);}
  $('#reference').src=item.ref;
  $('#reference').alt=`Ảnh tham chiếu: ${item.name}`;
  $('#item-title').textContent=item.name;
  $('#item-category').textContent=`${item.category} · ${item.element}`;
  $('#item-description').textContent=item.desc;
  for(let i=0;i<3;i++)$('#attack'+i).textContent=item.attacks[i];
  document.documentElement.style.setProperty('--accent',item.color);
  glowRing.material.color.set(item.rgb);
  stageAura.material.color.set(item.rgb);
  document.querySelectorAll('.weapon-option').forEach(b=>{
    b.classList.toggle('selected',b.dataset.weapon===id);
    b.setAttribute('aria-pressed',String(b.dataset.weapon===id));
  });
  switchDiagnostic.selected=id;
  switchDiagnostic.successes++;
  switchDiagnostic.lastError='';
  announceSwitch(`✓ Đã chuyển sang ${item.name} · V${BUILD_VERSION} · J/K/L để thử chiêu`);
  return true;
}
function runSelectionSelfTest(){
  const before=active.id;
  const results=[];
  for(const item of WEAPON_DATA){
    const ok=selectWeapon(item.id) && active.id===item.id && weapon?.children?.length>0 &&
      $('#item-title').textContent===item.name &&
      !!document.querySelector(`.weapon-option[data-weapon="${item.id}"].selected`);
    results.push(`${item.name}: ${ok?'OK':'LỖI'}`);
    if(!ok)break;
  }
  if(before!==active.id)selectWeapon(before);
  const passed=results.length===WEAPON_DATA.length && !results.some(x=>x.includes('LỖI'));
  switchDiagnostic.selfTest={passed,results,time:new Date().toISOString()};
  console.table(results.map(x=>({weapon:x.split(': ')[0],result:x.split(': ')[1]})));
  if(passed)announceSwitch(`✓ KIỂM TRA 5/5 THÀNH CÔNG · V${BUILD_VERSION}`);
  else announceSwitch(`❌ KIỂM TRA THẤT BẠI · ${results.join(' | ')}`,true);
  return passed;
}
window.__weaponVfxSelfTest=runSelectionSelfTest;
function destroyModel(group){
  // Materials can be shared among many submeshes. Dispose each unique resource once.
  const geometries=new Set(),materials=new Set();
  group.traverse(o=>{
    if(o.geometry && typeof o.geometry.dispose==='function')geometries.add(o.geometry);
    const mats=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
    for(const m of mats){
      if(m && typeof m.dispose==='function')materials.add(m);
      else console.warn('Bỏ qua vật liệu không hợp lệ khi giải phóng mô hình:',m);
    }
  });
  geometries.forEach(g=>g.dispose());
  materials.forEach(m=>m.dispose());
}
function hit(mode){
  const damage=[18,46,125][mode];hp=Math.max(0,hp-damage);damageCount++;
  $('#hp-text').textContent=`${hp} / 500 HP`;
  $('#hp-bar').style.width=(hp/5)+'%';
  target.scale.set(1.12,.95,1.12);
  flashDamage(damage,mode===2);
  if(hp<=0){kills++;$('#status').textContent=`Mục tiêu đã bị đánh bại (${kills} lần). Hồi phục sau 1,5 giây.`;
    window.setTimeout(()=>{hp=500;$('#hp-text').textContent='500 / 500 HP';$('#hp-bar').style.width='100%';},1500);
  }
}
function flashDamage(value,critical=false){
  const container=$('#damage-layer'),el=document.createElement('div');el.className='floating-damage';
  el.textContent=(critical?'✦ ':'−')+value;
  const rect=viewport.getBoundingClientRect();
  const point=targetPosition.clone().project(camera);
  el.style.left=((point.x+1)*.5*rect.width)+'px';el.style.top=((-point.y+1)*.5*rect.height)+'px';
  if(critical){el.style.fontSize='40px';el.style.color='#ffe177';}
  container.appendChild(el);setTimeout(()=>el.remove(),1000);
}
function attack(mode){
  if(!vfx)return;
  const now=performance.now()/1000;
  if(now<nextUsable[mode])return;
  nextUsable[mode]=now+cooldown[mode];lastAttack=now;
  actMode=mode;actTime=.01;
  const from=attackOrigin.clone();if(active.id==='bow')from.y=1.43;
  if(active.id==='spear')from.y=1.65;
  vfx.attack(active.id,mode,from,targetPosition.clone(),()=>hit(mode));
  $('#status').textContent=`${active.name} • ${active.attacks[mode]}`;
  playSound(mode);
}
let audioContext;
function playSound(mode){
  if(!soundEnabled)return;
  try{
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume();
    const now=audioContext.currentTime;
    const oscillator=audioContext.createOscillator();const gain=audioContext.createGain();
    oscillator.type=mode===2?'sawtooth':'triangle';
    oscillator.frequency.setValueAtTime(mode===0?400:mode===1?280:190,now);
    oscillator.frequency.exponentialRampToValueAtTime(mode===2?52:110,now+.28);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.045,now+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.36);
    oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now);oscillator.stop(now+.38);
  }catch(e){console.warn('Audio unavailable',e);}
}
function tick(){
  requestAnimationFrame(tick);
  const dt=Math.min(clock.getDelta(),.06),t=clock.elapsedTime;
  orbit.update();vfx.update(dt);
  if(weapon){
    let angle=.11,swingY=.12*Math.sin(t*.45);
    if(actTime>0){
      actTime+=dt;const duration=actMode===2?1.4:actMode===1?.85:.5;
      const pulse=Math.sin(Math.min(1,actTime/duration)*Math.PI);
      angle+=(active.id==='bow'?.11:.54)*pulse*(actMode===2?1.5:1);
      swingY+=(active.id==='staff'?.67:.33)*pulse;
      if(actTime>=duration){actTime=0;actMode=-1;}
    }
    weapon.rotation.z=angle+.018*Math.sin(t*1.6);
    weapon.rotation.y=swingY;
    weapon.position.y=.028*Math.sin(t*1.3);
  }
  if(glowRing){glowRing.rotation.y=t*.12;glowRing.material.opacity=.50+.22*Math.sin(t*1.6);}
  if(stageAura)stageAura.rotation.y=-t*.17;
  if(dust)dust.rotation.y=t*.00055;
  if(target){target.scale.lerp(new THREE.Vector3(1,1,1),Math.min(1,dt*11));}
  const now=performance.now()/1000;
  document.querySelectorAll('.attack').forEach(b=>{
    const i=+b.dataset.mode,remaining=nextUsable[i]-now;
    b.disabled=remaining>.05;
    b.title=remaining>0?`Hồi chiêu còn ${remaining.toFixed(1)} giây`:'';
  });
  frame++;fpsTimer+=dt;
  if(fpsTimer>=1){$('#fps').textContent=`${Math.round(frame/fpsTimer)} FPS · Three.js r160 · ${quality==='low'?'Chế độ nhẹ':quality==='medium'?'Trung bình':'Chất lượng cao'} · ${damageCount} lượt trúng`;
    frame=0;fpsTimer=0;}
  renderer.render(scene,camera);
}
function installControls(){
  // Delegation also works when clicking nested icon/text, on mouse or touch.
  $('.weapon-list').addEventListener('click',e=>{
    const button=e.target.closest('.weapon-option');
    if(!button)return;
    e.preventDefault();
    selectWeapon(button.dataset.weapon);
  });
  $('#run-weapon-test').addEventListener('click',runSelectionSelfTest);
  document.querySelectorAll('.attack').forEach(b=>b.addEventListener('click',()=>attack(+b.dataset.mode)));
  document.addEventListener('keydown',e=>{
    if(e.repeat||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    const k=e.key.toLowerCase();
    if(k>='1'&&k<='5'){selectWeapon(WEAPON_DATA[+k-1].id);return;}
    if(k==='j')attack(0);if(k==='k')attack(1);if(k==='l')attack(2);
  });
  $('#quality').addEventListener('change',e=>{
    quality=e.target.value;vfx.quality=quality;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='low'?1:quality==='medium'?1.3:1.7));
    renderer.shadowMap.enabled=quality!=='low';resize();
  });
  $('#sound-toggle').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('#sound-toggle').textContent=soundEnabled?'♫ Tắt âm thanh':'♫ Bật âm thanh';});
  $('#reset-target').addEventListener('click',()=>{hp=500;$('#hp-text').textContent='500 / 500 HP';$('#hp-bar').style.width='100%';$('#status').textContent='Đã hồi phục mục tiêu huấn luyện.';});
}
try{setup();installControls();}catch(err){
  console.error(err);
  $('#error-text').textContent=String(err?.message||err);
  $('#error-overlay').hidden=false;
}
