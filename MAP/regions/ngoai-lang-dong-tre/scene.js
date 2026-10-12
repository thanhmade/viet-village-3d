(function(global){
 'use strict';
 // Front reference convention: gate at +Z, cave at -Z, paddies at -X,
 // bamboo at +X. References remain gallery assets, never scene billboards.
 function createDongTreRegion({THREE}){
  if(!THREE?.InstancedMesh)throw new Error('Đồng Tre cần Three.js có InstancedMesh.');
  const id='ngoai-lang-dong-tre',name='Ngoại ô Làng Việt – Đồng Tre';
  const root=new THREE.Group();root.name='region-'+id;root.visible=false;
  Object.assign(root.userData,{regionId:id,regionName:name,networkMapId:id,parentMapId:'lang-viet'});
  const geometries=new Set(),materials=new Set(),meshes=new Set(),batches=new Map();
  const landmarks=[],colliders=[],covers=[],cameraBounds=[],waterMeshes=[],wetMaterials=[],lampGlowMaterials=[],lights=[];
  let disposed=false,seed=81457;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function dispose(){
   if(disposed)return;disposed=true;root.removeFromParent();
   for(const mesh of meshes)mesh.dispose();
   for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
   for(const light of lights)light.shadow?.dispose();root.clear();batches.clear();
  }
  try{
   const geo=value=>(geometries.add(value),value);
   function mat(label,color,options={}){const material=new THREE.MeshStandardMaterial({color,roughness:.86,...options});material.name='dong-tre-'+label;materials.add(material);return material;}
   const earth=mat('earth',0x806340),grass=mat('grass',0x819352),dirt=mat('path',0xc9ab77),stone=mat('stone',0xaaa48c),rock=mat('rock',0x8e9180),
    wood=mat('wood',0x775031),darkWood=mat('dark-wood',0x493b27),planks=mat('planks',0xa37a49),wall=mat('plaster',0xc9b685),
    tile=mat('tile',0xb75e36,{side:THREE.DoubleSide}),tileEdge=mat('tile-edge',0xcf8150,{side:THREE.DoubleSide}),
    thatch=mat('thatch',0xc7a363,{side:THREE.DoubleSide}),straw=mat('straw',0xd8bb71),bamboo=mat('bamboo',0x809541),
    leaves=mat('leaves',0xffffff,{side:THREE.DoubleSide}),water=mat('water',0x459c9c,{metalness:.18,roughness:.23,transparent:true,opacity:.9}),
    clay=mat('clay',0xa88a51),caveDark=mat('cave-interior',0x33372e),glow=mat('warm-window',0xd6b765,{emissive:0xffb554,emissiveIntensity:0});
   wetMaterials.push(earth,grass,dirt,stone,rock,wood,planks,wall,tile,tileEdge,thatch,clay);lampGlowMaterials.push(glow);
   const boxGeo=geo(new THREE.BoxGeometry(1,1,1)),cylinderGeo=geo(new THREE.CylinderGeometry(1,1,1,8)),
    taperGeo=geo(new THREE.CylinderGeometry(.66,1,1,8)),coneGeo=geo(new THREE.ConeGeometry(1,1,9)),
    rockGeo=geo(new THREE.IcosahedronGeometry(1,1)),leafBallGeo=geo(new THREE.IcosahedronGeometry(1,0)),
    torusGeo=geo(new THREE.TorusGeometry(1,.14,5,18));
   const leafGeo=geo(new THREE.BufferGeometry());
   leafGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.13,.28,0,0,.88,0,0,0,0,0,.88,0,-.13,.28,0],3));leafGeo.computeVertexNormals();
   const blades=[];
   for(let i=0;i<3;i++){const a=i*Math.PI/3,dx=Math.cos(a)*.09,dz=Math.sin(a)*.09;blades.push(-dx,0,-dz,dx,0,dz,dx*.5,.7,dz*.5,dx,0,dz,dx*.2,.24,dz*.2,dx*.5,.7,dz*.5);}
   const riceGeo=geo(new THREE.BufferGeometry());riceGeo.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));riceGeo.computeVertexNormals();
   const transform=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),aVec=new THREE.Vector3(),bVec=new THREE.Vector3(),direction=new THREE.Vector3();
   function instance(geometry,material,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,color=null,cast=false){
    const key=geometry.uuid+'|'+material.uuid;let batch=batches.get(key);
    if(!batch){batch={geometry,material,transforms:[],colors:[],cast:false};batches.set(key,batch);}
    transform.position.set(x,y,z);transform.scale.set(sx,sy,sz);transform.rotation.set(rx,ry,rz);transform.updateMatrix();
    batch.transforms.push(transform.matrix.clone());batch.colors.push(color);batch.cast||=cast;
   }
   const box=(m,x,y,z,w,h,d,ry=0,cast=false)=>instance(boxGeo,m,x,y,z,w,h,d,0,ry,0,null,cast);
   const cyl=(m,x,y,z,r,h,cast=false)=>instance(cylinderGeo,m,x,y,z,r,h,r,0,0,0,null,cast);
   function beam(m,a,b,r=.06){
    aVec.fromArray(a);bVec.fromArray(b);direction.copy(bVec).sub(aVec);
    transform.quaternion.setFromUnitVectors(up,direction.clone().normalize());const e=transform.rotation;
    instance(cylinderGeo,m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,direction.length(),r,e.x,e.y,e.z);
   }
   const rect=(x,z,w,d)=>colliders.push({type:'rect',x,z,w:w/2+.28,d:d/2+.28});
   const circle=(x,z,r)=>colliders.push({type:'circle',x,z,r:r+.28});
   function cameraBox(x,y,z,w,h,d){cameraBounds.push(new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2)));}
   function landmark(key,type,x,z,extra={}){landmarks.push({id:key,type,x,z,position:{x,y:.3,z},...extra});}
   // Ground banks leave an actual lower channel under the stream.
   box(earth,0,-.45,0,52,.9,56);box(grass,0,.15,-12.85,52,.3,28.3);box(grass,0,.15,17.35,52,.3,21.3);
   box(water,0,.155,4,52,.03,5.4);landmark('stream','stream',0,4,{width:52,depth:5.4});
   const paths=[[[0,27],[0,8]],[[0,0],[-9,-2]],[[-9,-2],[-9,-17]],[[-9,-17],[0,-16]],
    [[0,-16],[10,-14]],[[10,-14],[14,-7]],[[14,-7],[9,-1]],[[9,-1],[0,-1]],[[0,-1],[0,0]],[[0,-16],[0,-24]],
    [[0,17],[-12,17]],[[0,17],[16,17]],[[0,10],[9,10]]];
   function segmentDistance(x,z,start,end){
    const dx=end[0]-start[0],dz=end[1]-start[1],t=Math.max(0,Math.min(1,((x-start[0])*dx+(z-start[1])*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-start[0]-t*dx,z-start[1]-t*dz);
   }
   const nearPath=(x,z,clearance=1.7)=>paths.some(([a,b])=>segmentDistance(x,z,a,b)<clearance)||Math.abs(x)<2.5&&z>=0&&z<=8;
   for(const [a,b] of paths){const dx=b[0]-a[0],dz=b[1]-a[1];box(dirt,(a[0]+b[0])/2,.309,(a[1]+b[1])/2,2.6,.018,Math.hypot(dx,dz)+.4,Math.atan2(dx,dz));}
   for(const [x,z,r] of [[0,15,6.3],[-9,-9,4.5],[14,-10,4.6],[0,-17,5.0]])cyl(dirt,x,.312,z,r,.025);
   // Small irregular paving stones in the safe courtyard, not a texture plane.
   for(let ix=-2;ix<=2;ix++)for(let iz=0;iz<17;iz++)box(stone,ix*.67+((iz%2)*.1),.321,9+iz*.87,.61,.025,.78,(random()-.5)*.10);
   landmark('safe-courtyard','safe-zone',0,15,{radius:7});
   const roofPositions=[],roofIndices=[],nx=12,nz=8;
   const roofShape=(x,z)=>1-Math.abs(z)*2+.13*Math.pow(Math.abs(z)*2,6)+.12*Math.pow(Math.abs(x)*2,8);
   for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++)roofPositions.push(x/nx-.5,roofShape(x/nx-.5,z/nz-.5),z/nz-.5);
   for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const a=z*(nx+1)+x,b=a+1,c=a+nx+1;roofIndices.push(a,c,b,b,c,c+1);}
   const roofGeo=geo(new THREE.BufferGeometry());roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(roofPositions,3));roofGeo.setIndex(roofIndices);roofGeo.computeVertexNormals();
   const tilePositions=[],tileIndices=[];
   for(let z=0;z<2;z++)for(let i=0;i<=4;i++){const a=i*Math.PI/4;tilePositions.push(Math.cos(a)*.15,Math.sin(a)*.07,z*.46-.23);}
   for(let i=0;i<4;i++)tileIndices.push(i,i+5,i+1,i+1,i+5,i+6);
   const tileGeo=geo(new THREE.BufferGeometry());tileGeo.setAttribute('position',new THREE.Float32BufferAttribute(tilePositions,3));tileGeo.setIndex(tileIndices);tileGeo.computeVertexNormals();
   function roof(x,z,w,d,y,rise,kind){
    instance(roofGeo,kind==='tile'?tile:thatch,x,y,z,w,rise,d,0,0,0,null,true);
    covers.push({x,z,w:w/2,d:d/2,height:y+rise*1.15});cameraBox(x,y+rise*.55,z,w,rise*1.3,d);
    const columns=Math.floor(w/(kind==='tile'?.33:.21));
    for(let i=0;i<=columns;i++){
     const xx=-w/2+i*w/columns;
     for(const side of [-1,1]){
      if(kind==='tile')for(let zz=.2;zz<d/2;zz+=.42){const normalized=zz/d,slope=side*rise/d*(-2+.78*Math.pow(normalized*2,5));instance(tileGeo,tileEdge,x+xx,y+rise*roofShape(xx/w,normalized)+.045,z+side*zz,1,1,1,Math.atan(-slope));}
      else beam(straw,[x+xx,y+rise*roofShape(xx/w,0)+.03,z],[x+xx,y+rise*roofShape(xx/w,.5)+random()*.07,z+side*(d/2+.05)],.023);
     }
    }
    for(let i=0;i<8;i++){const a=-w/2+i*w/8,b=a+w/8;beam(kind==='tile'?stone:wood,[x+a,y+rise*roofShape(a/w,0)+.06,z],[x+b,y+rise*roofShape(b/w,0)+.06,z],.075);}
   }
   const buildings=[];
   function house(key,x,z,w,d,kind){
    const h=2.55,floor=.53;buildings.push({x,z,w,d,floor});landmark(key,kind==='tile'?'quest-station':'healer-hut',x,z,{width:w,depth:d,frontZ:z+d/2+1.75,roof:kind});
    box(stone,x,.40,z+.4,w+.45,.2,d+1.35);box(wall,x,floor+h/2,z,w,h,d,0,true);rect(x,z,w,d);cameraBox(x,floor+h/2,z,w,h,d);
    const front=z+d/2+.04;box(darkWood,x,1.34,front,1.28,1.65,.06);
    for(const side of [-1,1]){
     const px=x+side*w*.33;box(darkWood,px,1.90,front,.91,.89,.075);box(glow,px,1.90,front+.06,.74,.71,.045);
     for(let i=-1;i<=1;i++)box(wood,px+i*.2,1.90,front+.10,.045,.83,.05);
     cyl(wood,x+side*(w/2-.15),1.84,z+d/2+.9,.10,2.6,true);circle(x+side*(w/2-.15),z+d/2+.9,.12);
    }
    box(planks,x,.505,z+d/2+.66,w+.12,.05,1.32);box(stone,x,.35,z+d/2+1.59,2.8,.10,.56);
    box(wood,x-.8,.83,front+.60,1.3,.12,.38);for(const side of [-1,1])box(wood,x-.8+side*.48,.63,front+.60,.09,.35,.27);
    roof(x,z+.3,w+1.2,d+2.2,3.08,1.58,kind);
   }
   house('quest-station',-12,13,8,4.5,'tile');house('healer-hut',16,13,6,4,'straw');
   for(const x of [-2.8,2.8]){box(stone,x,.62,24,.9,.64,1.1);box(wood,x,2.05,24,.42,3.4,.48,0,true);rect(x,24,.9,1.1);cameraBox(x,2.05,24,.9,3.5,1.1);}
   box(darkWood,0,3.68,24,6.3,.3,.55);roof(0,24,7.4,2.45,3.82,1.05,'tile');landmark('village-gate','gate',0,24,{opening:4.4});
   function fence(x1,z1,x2,z2,h=.95,solid=true){
    const n=Math.ceil(Math.hypot(x2-x1,z2-z1)/.36);
    for(let i=0;i<=n;i++){const t=i/n;cyl(bamboo,x1+(x2-x1)*t,.3+h/2,z1+(z2-z1)*t,.04,h);}
    for(const y of [.3+h*.3,.3+h*.77])beam(wood,[x1,y,z1],[x2,y,z2],.046);
    if(solid)rect((x1+x2)/2,(z1+z2)/2,Math.abs(x2-x1)+.08,Math.abs(z2-z1)+.08);
   }
   fence(-24,24,-3.4,24);fence(3.4,24,24,24);landmark('courtyard-fence','fence',0,24);
   // Rice paddies occupy the far left bank; their fences and flooded interiors are solid.
   for(const z of [-9,-20]){
    const x=-19,w=7.2,d=8;landmark('rice-paddy-'+(-z),'rice-paddy',x,z,{width:w,depth:d});rect(x,z,w+.2,d+.2);
    box(earth,x,.317,z,w,.034,d);box(water,x,.345,z,w-.30,.018,d-.30);
    for(const side of [-1,1]){box(grass,x+side*w/2,.37,z,.26,.14,d+.25);box(grass,x,.37,z+side*d/2,w,.14,.26);}
    for(let ix=0;ix<14;ix++)for(let iz=0;iz<16;iz++)instance(riceGeo,leaves,x-w/2+.4+ix*.49,.36,z-d/2+.35+iz*.49,.9,.85+random()*.25,.9,0,random()*6.28,0,ix%3===0?0xacbf58:0x709e49);
    fence(x-w/2,z-d/2,x-w/2,z+d/2,.66,false);fence(x-w/2,z+d/2,x+w/2,z+d/2,.66,false);
   }
   instance(coneGeo,straw,-22,1.38,-14.3,1.14,2.15,1.14);circle(-22,-14.3,1.1);landmark('haystack','haystack',-22,-14.3);
   function pot(x,z,r=.28){instance(taperGeo,clay,x,.3+r*.85,z,r,r*1.7,r);instance(torusGeo,darkWood,x,.3+r*1.72,z,r*.70,r*.40,r*.70,Math.PI/2);circle(x,z,r);}
   for(const [x,z] of [[-16.6,15.8],[-16.3,17.3],[-7.5,15.7],[-6.8,15.5],[19.6,15.3],[19.6,16.1],[12.1,15.5],[8.6,15.1]])pot(x,z,.25+random()*.12);
   // Medicinal beds flank the healer's route, never the central spawn/courtyard.
   for(const x of [12.5,18]){
    box(earth,x,.345,21,3.0,.09,2.3);rect(x,21,3.0,2.3);
    for(let row=0;row<3;row++)for(let col=0;col<5;col++)instance(riceGeo,leaves,x-1.15+col*.56,.39,20.25+row*.72,1.35,.48,1.35,0,random()*6,0,0x4c8047);
    fence(x-1.7,19.6,x-1.7,22.3,.6,false);fence(x+1.7,19.6,x+1.7,22.3,.6,false);
   }
   landmark('medicinal-garden','herb-garden',16,21);
   const wx=7,wz=15;circle(wx,wz,1.04);cyl(caveDark,wx,.42,wz,.77,.12);
   for(let layer=0;layer<3;layer++)for(let i=0;i<18;i++){const a=(i+(layer%2)*.5)*Math.PI/9;box(stone,wx+Math.sin(a)*.87,.44+layer*.24,wz+Math.cos(a)*.87,.34,.22,.22,a);}
   instance(torusGeo,stone,wx,1.06,wz,.85,.62,.85,Math.PI/2);
   for(const x of [wx-1.1,wx+1.1])cyl(wood,x,1.47,wz,.075,2.35);
   beam(wood,[wx-1.2,2.64,wz],[wx+1.2,2.64,wz],.09);beam(straw,[wx,2.6,wz],[wx,.55,wz],.015);landmark('healing-well','well',wx,wz);
   // The only stream crossing is a real arched timber deck with ramps and railings.
   const bridgeHeight=z=>z>=0&&z<=8?.3+.5*Math.sin(z/8*Math.PI):.3;
   for(let i=0;i<28;i++){
    const a=i*8/28,b=(i+1)*8/28,ha=bridgeHeight(a),hb=bridgeHeight(b);
    instance(boxGeo,planks,0,(ha+hb)/2-.07,(a+b)/2,3.8,.14,Math.hypot(b-a,hb-ha)+.012,-Math.atan2(hb-ha,b-a));
    for(const side of [-1,1]){
     beam(wood,[side*1.98,ha+.90,a],[side*1.98,hb+.90,b],.045);
     if(i%4===0)cyl(wood,side*1.98,ha+.45,a,.075,1.03);
    }
   }
   for(const x of [-1.98,1.98])rect(x,4,.13,8);
   landmark('wooden-bridge','bridge',0,4,{width:3.8,fromZ:0,toZ:8});
   // Solid timber practice dummies: props only, not simulated NPCs or enemies.
   for(const [i,x,z] of [[0,10,-9],[1,12,-8], [2,-6.5,-8.5]]){
    cyl(wood,x,1.26,z,.13,1.92);cyl(straw,x,2.34,z,.22,.33);circle(x,z,.34);
    beam(wood,[x-.62,1.7,z],[x+.62,1.7,z],.075);beam(wood,[x-.37,.32,z-.25],[x,.52,z],.075);beam(wood,[x+.37,.32,z+.25],[x,.52,z],.075);
    landmark('training-dummy-'+i,'training-dummy',x,z);
   }
   landmark('field-training','training',-9,-9,{suggestedLevels:[1,3]});landmark('bamboo-training','training',14,-10,{suggestedLevels:[4,6]});landmark('cave-training','training',0,-17,{suggestedLevels:[7,10]});
   function tree(x,z,s=1){
    instance(taperGeo,wood,x,.3+1.5*s,z,.27*s,3*s,.28*s,0,0,0,null,true);circle(x,z,.40*s);
    for(let i=0;i<7;i++){const a=i*2.399;beam(wood,[x,2.4*s,z],[x+Math.sin(a)*1.4*s,3.7*s,z+Math.cos(a)*1.4*s],.095*s);instance(leafBallGeo,leaves,x+Math.sin(a)*1.3*s,4.1*s+(i%3)*.43*s,z+Math.cos(a)*1.3*s,1.75*s,1.15*s,1.65*s,0,a,0,i%2?0x507c35:0x779846);}
    covers.push({x,z,w:3.1*s,d:3.1*s,height:6.2*s,round:true});cameraBox(x,4.6*s,z,5.4*s,2.7*s,5.4*s);
   }
   tree(6,10.5,1.05);landmark('healing-tree','tree',6,10.5);
   for(const [x,z,s] of [[-23,20,.95],[-22,10,1.1],[-24,-3,.95],[-24,-24,1.1],[-13,-25,.85],[-9,-25,1],[10,-25,.95],[23,21,.9],[23,9,1]])tree(x,z,s);
   function bambooClump(x,z,scale=1){
    if(nearPath(x,z,1.75))return;
    circle(x,z,.70*scale);
    for(let stem=0;stem<5;stem++){
     const a=stem*2.399,px=x+Math.sin(a)*.43*scale,pz=z+Math.cos(a)*.43*scale,h=(3.5+random()*2)*scale;
     cyl(bamboo,px,.3+h/2,pz,.046*scale,h);
     for(let n=1;n<5;n++){const y=.3+h*n/5;cyl(straw,px,y,pz,.054*scale,.045);for(let leaf=0;leaf<3;leaf++)instance(leafGeo,leaves,px,y,pz,1.1*scale,1.35*scale,1, .70+leaf*.4,a+leaf*2.1,.7,leaf%2?0x689039:0x95ad45);}
    }
   }
   for(let i=0;i<24;i++){const a=i*Math.PI/12;bambooClump(14+Math.cos(a)*6.1,-11+Math.sin(a)*7.1);}
   for(const z of [-25,-22,-18,-14,-10,-6,-2]){bambooClump(23,z,.95);bambooClump(21.2,z-1.2,.9);}
   for(const [x,z] of [[7,-24],[12,-24],[17,-24],[20,-24],[-23,-17],[-22,22]])bambooClump(x,z,.9);
   landmark('bamboo-grove','bamboo',15,-12,{clearing:{x:14,z:-10,radius:4.6}});
   // The cave is an open, walkable rock arch with real side walls, ceiling and back.
   for(const side of [-1,1]){
    rect(side*3.55,-23.2,3.8,6.3);cameraBox(side*3.55,2.7,-23.2,3.8,5.4,6.3);
    for(let i=0;i<4;i++)instance(rockGeo,rock,side*(3.4+(i%2)*.7),1.7+(i%2)*.55,-20.9-i*1.42,1.7,2.2+(i%2)*.5,1.5,0,side*.3+i*.5,.13*i,null,true);
   }
   instance(rockGeo,rock,0,4.7,-22.7,3.8,1.7,2.9,0,.15,0,null,true);
   instance(rockGeo,rock,0,2.6,-26.2,4.3,2.8,1.4,0,.1,0,null,true);rect(0,-26.3,8.5,2.4);cameraBox(0,2.65,-26.3,8.5,5.3,2.4);
   box(caveDark,0,1.7,-25.4,3.1,2.8,.3);box(dirt,0,.309,-23.2,2.9,.018,4.8);
   covers.push({x:0,z:-23.3,w:5.5,d:3.2,height:6.5});cameraBox(0,4.9,-23.2,8.8,3.1,6.2);
   for(let i=0;i<14;i++){const x=-4.5+i*.68,z=-23.8+Math.sin(i*2.4)*1.4;instance(leafBallGeo,leaves,x,5.15+Math.sin(i)*.5,z,.77,.33,.8,0,i,0,0x6e9144);}
   landmark('beast-cave','cave',0,-23,{entry:{x:0,y:.3,z:-21},inner:{x:0,y:.3,z:-24}});
   // River-bank stones/reeds and boundary shrubs frame routes without blocking them.
   for(let i=0;i<52;i++){
    const x=-25.5+i;if(Math.abs(x)<2.8)continue;
    for(const side of [-1,1]){
     const z=4+side*(2.75+random()*.18),r=.22+random()*.30;
     instance(rockGeo,rock,x,.3+r*.36,z,r*1.4,r*.8,r,0,random()*6,0);
     instance(riceGeo,leaves,x,.3,z+side*.24,1.4,1.3+random()*.5,1.4,0,random()*6,0,0x91a757);
    }
   }
   for(let i=0;i<155;i++){
    const x=random()*48-24,z=random()*51-25.5;
    if(nearPath(x,z,1.85)||z>1&&z<7||x<-14&&z<-3||x>-1.8&&x<1.8&&z<-19||Math.hypot(x,z-20.5)<2.7)continue;
    if(colliders.some(c=>c.type==='circle'?Math.hypot(x-c.x,z-c.z)<c.r+.35:Math.abs(x-c.x)<c.w+.25&&Math.abs(z-c.z)<c.d+.25))continue;
    instance(riceGeo,leaves,x,.3,z,1.2,.45+random()*.5,1.2,0,random()*6,0,i%3?0x74934b:0x98ab59);
    if(i%3===0)for(let k=0;k<3;k++)instance(leafBallGeo,leaves,x+(k-1)*.16,.65+random()*.20,z,.09,.08,.09,0,0,0,i%2?0xdda891:0xebd7a0);
   }
   for(const [x,z] of [[-2.35,23.8],[2.35,23.8],[-15.6,15.45],[18.7,15.3]]){box(darkWood,x,2.76,z,.36,.10,.34);box(glow,x,2.51,z,.28,.39,.26);box(darkWood,x,2.28,z,.35,.08,.34);}
   for(const [x,z] of [[0,23], [5.5,13]]){const light=new THREE.PointLight(0xffc878,0,13,2);light.position.set(x,3,z);light.castShadow=false;light.userData.baseIntensity=5;root.add(light);lights.push(light);}
   let drawCalls=0,triangles=0,instances=0;
   for(const batch of batches.values()){
    const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.transforms.length);mesh.name='dong-tre-batch-'+batch.material.name;meshes.add(mesh);
    const hasColors=batch.colors.some(color=>color!==null),color=new THREE.Color();
    for(let i=0;i<batch.transforms.length;i++){mesh.setMatrixAt(i,batch.transforms[i]);if(hasColors)mesh.setColorAt(i,color.setHex(batch.colors[i]??0xffffff));}
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.castShadow=batch.cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);if(batch.material===water)waterMeshes.push(mesh);
    drawCalls++;instances+=mesh.count;triangles+=(batch.geometry.index?batch.geometry.index.count:batch.geometry.attributes.position.count)/3*mesh.count;
   }
   root.updateMatrixWorld(true);
   const bounds={minX:-25,maxX:25,minZ:-27,maxZ:27};
   const bridgeSurface=(x,z)=>Math.abs(x)<=1.63&&z>=0&&z<=8;
   function canWalk(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z)||x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return false;
    if(z>1.18&&z<6.82&&!bridgeSurface(x,z))return false;
    for(const c of colliders){const dx=x-c.x,dz=z-c.z;if(c.type==='circle'?dx*dx+dz*dz<c.r*c.r:Math.abs(dx)<c.w&&Math.abs(dz)<c.d)return false;}
    return true;
   }
   function groundHeight(x,z){
    if(bridgeSurface(x,z))return bridgeHeight(z);
    for(const house of buildings){const front=z-house.z-house.d/2;if(Math.abs(x-house.x)<house.w/2+.06&&front>=0&&front<=1.32)return house.floor;if(Math.abs(x-house.x)<=1.4&&front>1.32&&front<=1.87)return .4;}
    return .3;
   }
   function roofHeight(x,z){let y=groundHeight(x,z);for(const cover of covers){const dx=(x-cover.x)/cover.w,dz=(z-cover.z)/cover.d;if(cover.round?dx*dx+dz*dz<=1:Math.abs(dx)<=1&&Math.abs(dz)<=1)y=Math.max(y,cover.height);}return y;}
   const spawn={x:0,y:.3,z:15,yaw:Math.PI};
   const spawns=Object.freeze({'village-entry':spawn,'from-lang-viet':{x:0,y:.3,z:17,yaw:Math.PI}});
   const portal={id:'lang-viet',x:0,y:.335,z:20.5,radius:1,interactionRadius:1.8,activation:'interact',targetMapId:'lang-viet',targetSpawnId:'from-dong-tre',label:'Làng Việt'};
   const references=[['01_Ngoai_Lang_Dong_Tre_Truoc.png','Phía trước · cổng và sân nhiệm vụ'],['02_Ngoai_Lang_Dong_Tre_Trai.png','Bên trái · ruộng và cầu gỗ'],['03_Ngoai_Lang_Dong_Tre_Phai.png','Bên phải · lũy tre và sân luyện tập'],['04_Ngoai_Lang_Dong_Tre_Sau.png','Phía sau · gò đá và hang']].map(([file,label])=>({path:'../MAP/regions/'+id+'/references/'+file,label}));
   return {id,networkMapId:id,name,parentMapId:'lang-viet',root,spawn,spawns,defaultSpawnId:'village-entry',portal,bounds,canWalk,groundHeight,roofHeight,cameraBounds,waterMeshes,wetMaterials,lampGlowMaterials,lights,landmarks,references,dispose,diagnostics:{drawCalls,triangles,instances}};
  }catch(error){dispose();throw error;}
 }
 global.createDongTreRegion=createDongTreRegion;
})(typeof window==='undefined'?globalThis:window);
