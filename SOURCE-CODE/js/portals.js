'use strict';
// Pure dwell state machine: async preparation never changes the current map until commit.
class PortalDwellController {
  constructor({duration=.8,prepare,transition,onError,onProgress=()=>{}}){
    Object.assign(this,{duration,prepare,transition,onError,onProgress});
    this.elapsed=0;this.current=null;this.pending=null;this.ready=false;
    this.blocked=false;this.transitioning=false;this.generation=0;
  }
  cancel(){
    this.generation++;this.current=null;this.pending=null;this.ready=false;this.elapsed=0;
    this.onProgress(null,0,false);
  }
  lockUntilExit(){this.cancel();this.blocked=true;}
  update(dt,portal,enabled=true){
    if(!enabled){this.cancel();return;}
    if(this.blocked){if(!portal)this.blocked=false;return;}
    if(this.transitioning)return;
    if(!portal){if(this.current)this.cancel();return;}
    if(this.current!==portal){
      this.cancel();this.current=portal;
      const generation=this.generation;
      this.pending=Promise.resolve().then(()=>this.prepare(portal)).then(()=>{
        if(generation===this.generation&&this.current===portal)this.ready=true;
      }).catch(error=>{
        if(generation!==this.generation)return;
        this.lockUntilExit();this.onError(error,portal);
      });
      this.onProgress(portal,0,true);return;
    }
    this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,dt));
    this.onProgress(portal,this.elapsed/this.duration,!this.ready);
    if(this.elapsed+1e-9<this.duration||!this.ready)return;
    try{
      this.transitioning=true;
      this.transition(portal);
      this.lockUntilExit();
    }catch(error){this.lockUntilExit();this.onError(error,portal);}
    finally{this.transitioning=false;}
  }
}
let roaming=false,housePortalSystem,interiorExitPortal;
const housePortalVisuals=[];
function portalBasic(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,toneMapped:false});}
function portalLine(points,material,parent){
  const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
  const line=new THREE.Line(geometry,material);parent.add(line);return line;
}
function createPortalVisual(label,kind,radius){
  const root=new THREE.Group();root.name='vong-'+kind;
  const cyan=portalBasic(0x32ffe1),glow=portalBasic(0x14edbd,.16);
  const ring=(r,tube,material)=>{
    const m=new THREE.Mesh(new THREE.TorusGeometry(r,tube,6,64),material);
    m.rotation.x=-Math.PI/2;root.add(m);return m;
  };
  ring(radius+.12,.022,cyan);ring(radius+.12,.07,glow);ring(radius-.03,.012,portalBasic(0xffeab0));
  for(let i=0;i<12;i++){
    const segment=new THREE.Mesh(new THREE.RingGeometry(radius+.035,radius+.095,5,1,i*Math.PI/6+.025,Math.PI/6-.06),portalBasic(0x21eeca,.55));
    segment.rotation.x=-Math.PI/2;segment.position.y=.004;root.add(segment);
  }
  const glowDisc=new THREE.Mesh(new THREE.CircleGeometry(radius+.18,48),portalBasic(0x19dfa9,.06));
  glowDisc.rotation.x=-Math.PI/2;glowDisc.position.y=-.01;root.add(glowDisc);
  const progressPositions=new Float32Array(97*3);
  const progressGeometry=new THREE.BufferGeometry();progressGeometry.setAttribute('position',new THREE.BufferAttribute(progressPositions,3));
  for(let i=0;i<=96;i++){
    const a=i/96*Math.PI*2-Math.PI/2;
    progressPositions[i*3]=Math.cos(a)*(radius+.155);progressPositions[i*3+1]=.015;
    progressPositions[i*3+2]=Math.sin(a)*(radius+.155);
  }
  progressGeometry.setDrawRange(0,0);
  root.add(new THREE.Line(progressGeometry,portalBasic(0xffee83)));
  // House / open door icons are extruded geometry, independent of the reference PNGs.
  const icon=new THREE.Group();icon.position.y=.23;root.add(icon);
  const shape=new THREE.Shape();
  if(kind==='vao-nha'){
    shape.moveTo(-.23,0);shape.lineTo(-.23,.28);shape.lineTo(-.32,.28);
    shape.lineTo(0,.55);shape.lineTo(.32,.28);shape.lineTo(.23,.28);shape.lineTo(.23,0);
    shape.lineTo(.075,0);shape.lineTo(.075,.20);shape.lineTo(-.075,.20);shape.lineTo(-.075,0);shape.closePath();
  }else{
    shape.moveTo(-.18,0);shape.lineTo(-.18,.51);shape.lineTo(.12,.43);shape.lineTo(.12,-.06);shape.closePath();
    portalLine([[-.22,0,0],[-.22,.56,0],[.17,.56,0],[.17,.40,0]],cyan,icon);
    portalLine([[.16,.25,0],[.44,.25,0],[.32,.37,0],[.44,.25,0],[.32,.13,0]],cyan,icon);
  }
  icon.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}),cyan));
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='rgba(4,58,53,.94)';ctx.fillRect(5,5,502,118);
  ctx.strokeStyle='#42ffe5';ctx.lineWidth=5;ctx.strokeRect(5,5,502,118);
  ctx.fillStyle='#ffffff';ctx.font='bold 58px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,65);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const caption=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
  caption.position.y=1.05;caption.scale.set(1.55,.39,1);root.add(caption);
  return {root,icon,progressGeometry};
}
function attachInteriorPortal(){
  const config=interiorPortalConfigs.values().next().value;
  if(!config||!interiorRoot)return;
  const visual=createPortalVisual('RA SÂN','ra-san',config.exit.radius);
  visual.root.position.set(config.exit.x,config.exit.y,config.exit.z);interiorRoot.add(visual.root);
  interiorExitPortal={kind:'exit',radius:config.exit.radius,visual};
}
function initHousePortals(){
  configureHousePortals();configureInteriorPortals();
  for(const config of housePortalConfigs){
    const visual=createPortalVisual('VÀO NHÀ','vao-nha',config.entry.radius);
    visual.root.position.set(config.entry.x,config.entry.y,config.entry.z);world.add(visual.root);
    housePortalVisuals.push({kind:'entry',config,radius:config.entry.radius,visual});
  }
  if(interiorRoot)attachInteriorPortal();
  housePortalSystem=new PortalDwellController({
    prepare:p=>p.kind==='entry'?prepareHouseDestination(p.config.interiorId):validateYardDestination(housePortalConfigs[selectedHouse]),
    transition:p=>p.kind==='entry'?enterHouse(p.config.index):leaveHouse(),
    onError:(error,p)=>{
      console.error('House portal:',error);
      $('portalStatus').textContent=(p.kind==='entry'?'Không thể tải nội thất.':'Không thể ra sân.')+' '+error.message+' · Hãy rời vòng rồi thử lại.';
      $('portalStatus').classList.remove('hidden');toast($('portalStatus').textContent);
    },
    onProgress:(portal,progress,waiting)=>{
      for(const p of [...housePortalVisuals,...(interiorExitPortal?[interiorExitPortal]:[])])p.visual.progressGeometry.setDrawRange(0,p===portal?Math.floor(progress*96)+1:0);
      if(!portal){$('portalStatus').classList.add('hidden');return;}
      $('portalStatus').classList.remove('hidden');
      $('portalStatus').textContent=(portal.kind==='entry'?'VÀO NHÀ':'RA SÂN')+' · '+Math.floor(progress*100)+'%'+(waiting&&progress===1?' · Đang chuẩn bị map…':' · Ở trong vòng');
    }
  });
}
function validateYardDestination(config){
  if(!config||!canWalk(config.yardSpawn.x,config.yardSpawn.z))throw new Error('Điểm quay ra sân không hợp lệ');
  return config;
}
function portalAtActor(){
  const candidates=insideHouse?(interiorExitPortal?[interiorExitPortal]:[]):housePortalVisuals;
  return candidates.find(p=>Math.hypot(player.position.x-p.visual.root.position.x,player.position.z-p.visual.root.position.z)<=p.radius)||null;
}
function updateHousePortals(dt){
  const enabled=(insideHouse||roaming)&&!overlays()&&document.visibilityState!=='hidden';
  housePortalSystem?.update(dt,portalAtActor(),enabled);
  for(const p of [...housePortalVisuals,...(interiorExitPortal?[interiorExitPortal]:[])]){
    p.visual.icon.rotation.y=Math.atan2(camera.position.x-p.visual.root.position.x,camera.position.z-p.visual.root.position.z);
  }
}
function beginVillageWalk(){
  if(insideHouse)return;
  clearMotion();roaming=true;world.visible=true;housePreview.visible=false;player.visible=true;
  gateView=-1;houseView=-1;yaw=0;pitch=.57;sceneryRadius=8.5;
  sceneryFocus.copy(player.position).add(new THREE.Vector3(0,1,0));
  $('helpText').textContent='WASD / mũi tên / cần điều khiển: đi bộ · Chạm mặt đất: đi tới · Đứng trong vòng 0,8 giây để vào nhà';
  document.body.classList.add('walking');
}
function villageCameraTarget(){
  const look=sceneryFocus;
  let angle=pitch,desired;
  for(let attempt=0;attempt<7;attempt++){
    desired=look.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(angle)*sceneryRadius,Math.sin(angle)*sceneryRadius,Math.cos(yaw)*Math.cos(angle)*sceneryRadius));
    if(!roaming)break;
    const ray=new THREE.Ray(look,desired.clone().sub(look).normalize()),hit=new THREE.Vector3();
    const blocked=village.houses.some(h=>{
      const bounds=new THREE.Box3(new THREE.Vector3(h.x-3.75,.2,h.z-2.85),new THREE.Vector3(h.x+3.75,5.3,h.z+2.85));
      return ray.intersectBox(bounds,hit)&&hit.distanceTo(look)<desired.distanceTo(look);
    });
    if(!blocked||angle>=1.18)break;
    angle=Math.min(1.18,angle+.12);
  }
  return desired;
}
function pauseVillageWalk(){roaming=false;clearMotion();housePortalSystem?.cancel();document.body.classList.remove('walking');}
function approachHouse(index){
  if(insideHouse)return;
  const config=housePortalConfigs[index];beginVillageWalk();
  waypoints=findPath(player.position,config.entry);target=waypoints.shift()||null;
  if(!target)toast('Chưa tìm được đường tới nhà. Hãy đi bộ tới vòng xanh.');
  else toast('Đang đi tới '+config.id+' · Có thể dùng phím hoặc cần điều khiển để dừng');
}
