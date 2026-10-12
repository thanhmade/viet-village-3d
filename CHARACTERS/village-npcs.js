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
   label(n.name,actor,2.85);npcs.set(n.id,{definition:n,root:actor,arms,placeholder,visual:null,pending:null,modelState:n.model?"pending":"procedural",modelError:""});
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
   update(dt){if(!disposed&&root.visible)for(const n of npcs.values())n.visual?.update(dt);},
   get modelStatuses(){return [...npcs.values()].filter(n=>n.definition.model).map(n=>({id:n.definition.id,name:n.definition.name,state:n.modelState,error:n.modelError,...n.visual?.stats,animation:n.visual?.animationState}));},
   dispose(){if(disposed)return;disposed=true;region.canWalk=baseWalk;root.removeFromParent();npcs.forEach(n=>n.visual?.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());mounted.delete(region.root);}
  };
  mounted.set(region.root,api);return api;
 };
})(window);
