(function(global){
 'use strict';
 const mounted=new WeakMap();
 global.mountVillageNPCs=function({THREE:T,region,gameplay}){
  if(mounted.has(region.root))return mounted.get(region.root);
  if(region.id!=='lang-viet'||gameplay.mapId!==region.id||gameplay.hostileSpawns.length||gameplay.npcCombatEnabled)
   throw new Error('Cấu hình NPC không thuộc làng an toàn.');
  const entries=[...gameplay.npcs,...gameplay.props],ids=new Set();
  for(const item of entries){
   const p=item.position,a=item.approach;
   if(ids.has(item.id)||![p?.x,p?.y,p?.z,a?.x,a?.z,item.collisionRadius].every(Number.isFinite)||item.collisionRadius<=0)
    throw new Error('NPC/đạo cụ thiếu tọa độ hoặc trùng ID.');
   ids.add(item.id);
   if(!region.canWalk(p.x,p.z)||!region.canWalk(a.x,a.z)||Math.abs(region.groundHeight(p.x,p.z)-p.y)>.025)
    throw new Error('Nền NPC không hợp lệ: '+item.name);
   for(let i=0;i<16;i++){const angle=i*Math.PI/8;
    if(!region.canWalk(p.x+Math.cos(angle)*item.collisionRadius,p.z+Math.sin(angle)*item.collisionRadius))
     throw new Error('NPC/đạo cụ đè lên vật cản: '+item.name);
   }
  }
  const baseWalk=region.canWalk;
  const blocked=(x,z)=>entries.some(n=>Math.hypot(x-n.position.x,z-n.position.z)<n.collisionRadius);
  for(const item of entries)if(blocked(item.approach.x,item.approach.z))throw new Error('Điểm tiếp cận NPC bị chặn.');
  const root=new T.Group();root.name='lang-viet-npcs';const npcs=new Map(),props=new Map();let disposed=false;
  const geometries=new Set(),materials=new Map(),textures=[];
  const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.86}));return materials.get(color);};
  function shape(geo,color,x,y,z,parent){geometries.add(geo);const m=new T.Mesh(geo,material(color));m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;}
  const box=(w,h,d,color,x,y,z,parent)=>shape(new T.BoxGeometry(w,h,d),color,x,y,z,parent);
  function label(text,parent,y){
   const canvas=document.createElement('canvas');canvas.width=384;canvas.height=80;const c=canvas.getContext('2d');
   c.fillStyle='#153e35';c.fillRect(0,0,384,80);c.fillStyle='#fff5d5';c.textAlign='center';c.textBaseline='middle';c.font='600 34px sans-serif';c.fillText(text,192,40);
   const texture=new T.CanvasTexture(canvas);textures.push(texture);const mat=new T.SpriteMaterial({map:texture,depthTest:true});materials.set('label-'+text,mat);
   const sprite=new T.Sprite(mat);sprite.position.y=y;sprite.scale.set(2.35,.49,1);parent.add(sprite);
  }
  // Quest marker above the name: yellow '!' can accept, yellow '?' can turn in,
  // grey '?' in progress, small muted lock = known but not open yet. The frame
  // shape (not only colour) tells main (diamond), side (circle) and learning
  // (rounded square) quests apart. One cached texture per kind+frame.
  const markerStyles={available:['!','#ffd23f','#6b4300'],ready:['?','#ffd23f','#6b4300'],progress:['?','#dfe3dc','#4f5650'],locked:['lock','#c9cdc2','#525a52']};
  const frameStyles={main:['#f0c24a','#3d2a0fe0'],side:['#a9cfd6','#173a42e0'],learning:['#8fd6a6','#163c2ee0']};
  const MARKER_RANGE=48;
  function markerMaterial(kind,category='main'){
   const frame=Object.hasOwn(frameStyles,category)?category:'side',id='marker-'+kind+'-'+frame;if(materials.has(id))return materials.get(id);
   const [text,fill,stroke]=markerStyles[kind],[ring,back]=frameStyles[frame],canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
   const muted=kind==='locked';c.globalAlpha=muted?.78:1;c.lineWidth=8;c.strokeStyle=muted?'#9aa196':ring;c.fillStyle=back;c.beginPath();
   if(frame==='main'){c.moveTo(64,6);c.lineTo(122,64);c.lineTo(64,122);c.lineTo(6,64);c.closePath();}
   else if(frame==='learning'){const r=22;c.moveTo(14+r,12);c.arcTo(116,12,116,116,r);c.arcTo(116,116,12,116,r);c.arcTo(12,116,12,12,r);c.arcTo(12,12,116,12,r);c.closePath();}
   else c.arc(64,64,54,0,Math.PI*2);
   c.fill();c.stroke();
   if(text==='lock'){c.lineWidth=9;c.strokeStyle=fill;c.beginPath();c.arc(64,55,15,Math.PI,0);c.stroke();c.fillStyle=fill;c.fillRect(42,55,44,34);c.fillStyle=back;c.fillRect(61,64,6,14);}
   else{c.font='900 78px sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=10;c.strokeStyle=stroke;c.strokeText(text,64,68);c.fillStyle=fill;c.fillText(text,64,68);}
   const texture=new T.CanvasTexture(canvas);textures.push(texture);const mat=new T.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false});materials.set(id,mat);return mat;
  }
  // Name and marker sit above the model's real height (model height + ground offset).
  const topOf=n=>Number.isFinite(n.model?.height)?n.model.height+(n.model.groundOffset||0):2.4;
  const cameraPosition=new T.Vector3(),markerPosition=new T.Vector3();
  let markerTime=0;
  for(const n of gameplay.npcs){
   const actor=new T.Group();actor.name=n.id;actor.userData={npcId:n.id,hostile:false,role:n.role};actor.position.set(n.position.x,n.position.y,n.position.z);actor.rotation.y=n.yaw;root.add(actor);
   const placeholder=new T.Group();placeholder.name="npc-procedural-fallback";actor.add(placeholder);
   box(.60,.88,.35,n.color,0,1.16,0,placeholder);box(.52,.53,.36,'#d9a17b',0,1.87,0,placeholder);
   for(const x of [-.14,.14])box(.048,.056,.026,'#233838',x,1.92,.19,placeholder);
   box(.6,.13,.38,'#d5b773',0,.78,0,placeholder);
   for(const x of [-.17,.17]){box(.24,.58,.27,'#343f49',x,.42,0,placeholder);box(.28,.16,.43,'#4f392e',x,.08,.06,placeholder);}
   const arms=[];for(const x of [-.4,.4]){const arm=new T.Group();arm.position.set(x,1.49,0);placeholder.add(arm);box(.18,.5,.24,n.color,0,-.2,0,arm);box(.16,.24,.18,'#d9a17b',0,-.52,0,arm);arms.push(arm);}
   if(n.role==='elder'){
    shape(new T.CylinderGeometry(.3,.33,.2,10),'#253750',0,2.2,0,placeholder);box(.28,.3,.10,'#d9d6c8',0,1.57,.23,placeholder);
    box(.28,.36,.065,'#b18a51',.43,.96,.17,placeholder);
   }else if(n.role==='guard'){
    shape(new T.ConeGeometry(.53,.32,12),'#c8ad72',0,2.24,0,placeholder);
    box(.09,1.8,.09,'#765031',-.48,1.0,.12,placeholder);
   }else{box(.55,.11,.39,'#dfc477',0,2.08,0,placeholder);box(.56,.06,.39,'#713725',0,2.16,0,placeholder);}
   const labelY=Math.max(2.85,topOf(n)+.45);label(n.name,actor,labelY);
   npcs.set(n.id,{definition:n,root:actor,arms,placeholder,visual:null,pending:null,modelState:n.model?"pending":"procedural",modelError:"",marker:null,markerKind:null,markerCategory:null,markerQuest:null,markerY:labelY+.57});
  }
  for(const p of gameplay.props){
   if(p.type!=='training-dummy')throw new Error('Đạo cụ chưa hỗ trợ.');
   const g=new T.Group();g.name=p.id;g.userData={propId:p.id,hostile:false,damageEnabled:false};g.position.set(p.position.x,p.position.y,p.position.z);root.add(g);
   box(1.05,.16,.85,'#796347',0,.08,0,g);box(.18,1.7,.18,'#805536',0,.96,0,g);box(1.1,.16,.18,'#996a3f',0,1.25,0,g);
   const target=shape(new T.CylinderGeometry(.42,.42,.16,12),'#cfb079',0,1.45,.06,g);target.rotation.x=Math.PI/2;
   for(const radius of [.29,.13]){const ring=shape(new T.TorusGeometry(radius,.032,5,24),'#8e4133',0,1.45,.16,g);ring.rotation.z=Math.PI/2;}
   label(p.name,g,2.45);props.set(p.id,{definition:p,root:g});
  }
  region.canWalk=(x,z)=>baseWalk(x,z)&&!blocked(x,z);region.root.add(root);
  async function loadModel(item,load){
   const config=item.definition.model;if(!config||item.visual||disposed)return !!item.visual;
   if(item.pending)return item.pending;
   item.modelState='loading';item.modelError='';
   item.pending=(async()=>{
    try{
     const gltf=await load(config.url);
     if(disposed){global.disposeVillageNPCGLTF(gltf);return false;}
     const visual=global.createVillageNPCGLTFVisual({THREE:T,gltf,height:config.height,clipName:config.clip,yaw:config.yaw||0,oneShots:config.oneShots||[],lockRootMotion:config.lockRootMotion===true,footProbeRatio:config.footProbeRatio});
     visual.root.position.y=config.groundOffset||0;
     item.root.add(visual.root);item.placeholder.visible=false;item.visual=visual;item.modelState='ready';return true;
    }catch(error){if(!disposed){item.modelState='error';item.modelError=error.message||String(error);}return false;}
    finally{item.pending=null;}
   })();return item.pending;
  }
  const api={root,npcs,props,
   async loadModels(load=global.loadVillageNPCGLTF){return (await Promise.all([...npcs.values()].filter(n=>n.definition.model).map(n=>loadModel(n,load)))).every(Boolean);},
   // Per frame only animation and on-screen size; quest conditions are evaluated elsewhere on change.
   update(dt,camera=null){if(disposed||!root.visible)return;markerTime+=dt;if(camera)camera.getWorldPosition(cameraPosition);
    for(const n of npcs.values()){n.visual?.update(dt);if(!n.marker||!n.markerKind)continue;
     n.marker.position.y=n.markerY+Math.sin(markerTime*3)*.07;
     let size=n.markerKind==='locked'?.44:.62;
     if(camera){n.marker.getWorldPosition(markerPosition);const d=markerPosition.distanceTo(cameraPosition);
      // Readable from afar, never covering the face up close; hidden past the range.
      n.marker.visible=d<=MARKER_RANGE;size*=Math.min(1.8,Math.max(.7,d/16));}
     n.marker.scale.set(size,size,1);}},
   setMarker(id,kind,category='main',questId=null){
    const n=npcs.get(id);if(!n||disposed)return false;const next=Object.hasOwn(markerStyles,kind)?kind:null,frame=next?(Object.hasOwn(frameStyles,category)?category:'side'):null;
    if(n.markerKind===next&&n.markerCategory===frame){n.markerQuest=questId;return false;}
    if(next&&!n.marker){n.marker=new T.Sprite(markerMaterial(next,frame));n.marker.name='npc-quest-marker';n.marker.renderOrder=2;n.marker.scale.set(.62,.62,1);n.marker.position.y=n.markerY;n.root.add(n.marker);}
    if(n.marker){n.marker.visible=!!next;if(next)n.marker.material=markerMaterial(next,frame);}
    n.markerKind=next;n.markerCategory=frame;n.markerQuest=next?questId:null;return true;
   },
   get markers(){return Object.fromEntries([...npcs].map(([id,n])=>[id,n.markerKind]));},
   get markerDetails(){return Object.fromEntries([...npcs].map(([id,n])=>[id,n.markerKind?{kind:n.markerKind,category:n.markerCategory,questId:n.markerQuest,y:n.markerY}:null]));},
   get modelStatuses(){return [...npcs.values()].filter(n=>n.definition.model).map(n=>({id:n.definition.id,name:n.definition.name,state:n.modelState,error:n.modelError,...n.visual?.stats,animation:n.visual?.animationState}));},
   dispose(){if(disposed)return;disposed=true;region.canWalk=baseWalk;root.removeFromParent();npcs.forEach(n=>n.visual?.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());mounted.delete(region.root);}
  };
  mounted.set(region.root,api);return api;
 };
})(window);
