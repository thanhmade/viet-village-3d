(function(global){
  'use strict';
  // A self-contained, procedural region. The four references guide the arrangement;
  // they are never used as a billboard, terrain texture or substitute for 3D objects.
  function createLangTanThuRegion({THREE}){
    if(!THREE?.InstancedMesh)throw new Error('Làng Tân Thủ cần Three.js có InstancedMesh.');
    const root=new THREE.Group();root.name='region-lang-tan-thu';root.userData.regionId='lang-tan-thu';root.visible=false;
    const geometries=new Set(),materials=new Set(),batches=new Map(),landmarks=[],colliders=[],covers=[],cameraBounds=[],waterMeshes=[],wetMaterials=[],lampGlowMaterials=[],lights=[];
    let seed=72103;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const geo=g=>(geometries.add(g),g);
    function mat(name,color,extra={}){const m=new THREE.MeshStandardMaterial({color,roughness:.86,metalness:0,...extra});m.name='tan-thu-'+name;materials.add(m);return m;}
    const earth=mat('earth',0x826546),grass=mat('grass',0x89945b),path=mat('dirt',0xc9ac77),stone=mat('stone',0xaaa896),wood=mat('timber',0x715033),darkWood=mat('dark-timber',0x443429),planks=mat('planks',0x9d7950),wall=mat('bamboo-wall',0xbda479),tile=mat('clay-tile',0xaf5839),tileEdge=mat('tile-edge',0xc07749),thatch=mat('thatch',0xbe9f58),straw=mat('straw',0xd6bd77),leaves=mat('leaves',0xffffff),rice=mat('rice',0xffffff,{side:THREE.DoubleSide}),water=mat('water',0x448e91,{roughness:.23,metalness:.25,transparent:true,opacity:.9}),riverStone=mat('river-stone',0x929787),windowGlow=mat('warm-window',0xe0b869,{emissive:0xffa438,emissiveIntensity:.1}),black=mat('well-depth',0x243c3c),rope=mat('rope',0xb8a276);
    wetMaterials.push(earth,grass,path,stone,wood,planks,wall,tile,tileEdge,thatch,riverStone);lampGlowMaterials.push(windowGlow);
    const boxGeometry=geo(new THREE.BoxGeometry(1,1,1));
    const cylinderGeometry=geo(new THREE.CylinderGeometry(1,1,1,8));
    const taperedGeometry=geo(new THREE.CylinderGeometry(.67,1,1,9));
    const sphereGeometry=geo(new THREE.IcosahedronGeometry(1,1));
    const coneGeometry=geo(new THREE.ConeGeometry(1,1,8));
    const ringGeometry=geo(new THREE.TorusGeometry(1,.14,5,20));
    const up=new THREE.Vector3(0,1,0),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion(),euler=new THREE.Euler(),matrix=new THREE.Matrix4();
    function instance(geometry,material,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,color=null,cast=false){
      const key=geometry.uuid+'|'+material.uuid;let batch=batches.get(key);
      if(!batch){batch={geometry,material,transforms:[],colors:[],cast:false};batches.set(key,batch);}
      position.set(x,y,z);scale.set(sx,sy,sz);rotation.setFromEuler(euler.set(rx,ry,rz));matrix.compose(position,rotation,scale);
      batch.transforms.push(matrix.clone());batch.colors.push(color);batch.cast=batch.cast||cast;
    }
    const box=(m,x,y,z,w,h,d,ry=0,cast=false)=>instance(boxGeometry,m,x,y,z,w,h,d,0,ry,0,null,cast);
    const cyl=(m,x,y,z,r,h,cast=false)=>instance(cylinderGeometry,m,x,y,z,r,h,r,0,0,0,null,cast);
    function between(m,a,b,r=.07){
      const midpoint=new THREE.Vector3().fromArray(a).add(new THREE.Vector3().fromArray(b)).multiplyScalar(.5);
      const direction=new THREE.Vector3().fromArray(b).sub(new THREE.Vector3().fromArray(a));
      const angles=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up,direction.clone().normalize()));
      instance(cylinderGeometry,m,midpoint.x,midpoint.y,midpoint.z,r,direction.length(),r,angles.x,angles.y,angles.z);
    }
    const circle=(x,z,r)=>colliders.push({type:'circle',x,z,r:r+.28});
    const rect=(x,z,w,d)=>colliders.push({type:'rect',x,z,w:w/2+.28,d:d/2+.28});
    function cameraBox(x,y,z,w,h,d){cameraBounds.push(new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2)));}
    function landmark(id,type,x,z,extra={}){const item={id,type,x,z,position:{x,y:.3,z},...extra};landmarks.push(item);return item;}
    // One shallow earth plinth; two grass banks leave a real channel below the water.
    box(earth,0,-.4,0,52,.8,56);box(grass,-5.25,.15,0,41.5,.3,56);box(grass,23.25,.15,0,5.5,.3,56);
    box(path,0,.309,3.6,4.7,.018,48.8);box(path,5.6,.312,8,17,.02,3.6);
    for(const z of [-6.1,3.75])box(path,0,.311,z,20,.02,2.1);
    box(path,-5.2,.312,13.8,7.6,.02,3.0);box(path,7.5,.312,13.5,8.4,.02,6.7);
    box(water,18,.155,0,5,.03,56);landmark('stream','stream',18,0,{width:5,length:56});
    // Roof surface has a pitched section and slightly lifted eaves and gable ends.
    const roofPositions=[],roofIndices=[],roofNX=12,roofNZ=12;
    function roofShape(x,z){return 1-Math.abs(z)*2+.11*Math.pow(Math.abs(z)*2,6)+.09*Math.pow(Math.abs(x)*2,8);}
    for(let iz=0;iz<=roofNZ;iz++)for(let ix=0;ix<=roofNX;ix++){const x=ix/roofNX-.5,z=iz/roofNZ-.5;roofPositions.push(x,roofShape(x,z),z);}
    for(let iz=0;iz<roofNZ;iz++)for(let ix=0;ix<roofNX;ix++){const a=iz*(roofNX+1)+ix,b=a+1,c=a+roofNX+1,d=c+1;roofIndices.push(a,c,b,b,c,d);}
    const roofGeometry=geo(new THREE.BufferGeometry());roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute(roofPositions,3));roofGeometry.setIndex(roofIndices);roofGeometry.computeVertexNormals();
    thatch.side=tile.side=THREE.DoubleSide;
    const tilePositions=[],tileIndices=[];
    for(let z=0;z<2;z++)for(let i=0;i<=4;i++){const angle=i*Math.PI/4;tilePositions.push(Math.cos(angle)*.155,Math.sin(angle)*.07,z*.48-.24);}
    for(let i=0;i<4;i++)tileIndices.push(i,i+5,i+1,i+1,i+5,i+6);
    const tileGeometry=geo(new THREE.BufferGeometry());tileGeometry.setAttribute('position',new THREE.Float32BufferAttribute(tilePositions,3));tileGeometry.setIndex(tileIndices);tileGeometry.computeVertexNormals();tileEdge.side=THREE.DoubleSide;
    function roof(x,z,w,d,base,rise,kind){
      instance(roofGeometry,kind==='straw'?thatch:tile,x,base,z,w,rise,d,0,0,0,null,true);
      covers.push({x,z,w:w/2,d:d/2,height:base+rise*1.1});cameraBox(x,base+rise*.52,z,w,rise*1.2,d);
      const columns=Math.floor(w/(kind==='straw'?.19:.32));
      for(let i=0;i<=columns;i++){
        const xx=-w/2+i*w/columns;
        if(kind==='straw')for(const side of [-1,1]){
          const jitter=random()*.06;
          between(straw,[x+xx,base+rise*roofShape(xx/w,.005)+.025,z],[x+xx,base+rise*roofShape(xx/w,.5)+jitter,z+side*(d/2+.06)],.019);
        }else for(const side of [-1,1])for(let zz=.20;zz<d/2;zz+=.4){
          const normalized=zz/d,derivative=-2+.66*Math.pow(normalized*2,5);
          const slope=side*rise/d*derivative;
          instance(tileGeometry,tileEdge,x+xx,base+rise*roofShape(xx/w,normalized)+.035,z+side*zz,1,1,1,Math.atan(-slope));
        }
      }
      for(let i=0;i<8;i++){
        const ax=-w/2+i*w/8,bx=-w/2+(i+1)*w/8;
        between(kind==='straw'?wood:darkWood,[x+ax,base+rise*roofShape(ax/w,0)+.04,z],[x+bx,base+rise*roofShape(bx/w,0)+.04,z],.065);
      }
    }
    const buildings=[];
    function building(id,x,z,kind,large=false){
      const w=large?8.6:5.5,d=large?5.2:3.9,h=large?2.95:2.5,floor=.66;
      buildings.push({x,z,w,d,floor,porch:d/2+1.08});
      landmark(id,large?'community-house':'home',x,z,{roof:kind,width:w,depth:d,frontZ:z+d/2+1.85});
      box(stone,x,.47,z+.35,w+.5,.34,d+1.4);box(wall,x,.66+h/2,z,w,h,d,0,true);rect(x,z,w,d);
      cameraBox(x,.66+h/2,z,w+.12,h,d+.12);
      const front=z+d/2+.035;
      box(darkWood,x,1.48,front,large?1.7:1.05,1.64,.07);
      for(const offset of [-w*.30,w*.30]){
        box(darkWood,x+offset,1.96,front,.87,.91,.1);box(windowGlow,x+offset,1.96,front+.06,.70,.74,.035);
        for(let k=-1;k<=1;k++)box(wood,x+offset+k*.19,1.96,front+.095,.045,.82,.06);
      }
      for(let i=0;i<Math.floor(w/.27);i++)box(planks,x-w/2+.14+i*.27,.66+h/2,front+.018,.033,h,.038);
      for(const offset of [-w/2+.15,0,w/2-.15]){
        if(offset===0)continue;const pz=z+d/2+.85;
        cyl(wood,x+offset,.66+h/2,pz,.10,h,true);circle(x+offset,pz,.1);
        between(wood,[x+offset,.8+h,pz],[x+offset-(offset>0?.5:-.5),.66+h,pz],.045);
      }
      box(planks,x,.67,z+d/2+.55,w+.15,.05,1.08);
      for(let step=0;step<3;step++){
        const top=.42+step*.08,sz=z+d/2+1.7-step*.3;
        box(stone,x,(top+.3)/2,sz,large?3.5:2.6,top-.3,.32);
      }
      for(const side of [-1,1]){
        const px=x+side*(w/2+.45),pz=z+d/2+.48;
        instance(taperedGeometry,earth,px,.7,pz,.28,.78,.28);circle(px,pz,.29);
        instance(ringGeometry,darkWood,px,1.09,pz,.21,.21,.21,Math.PI/2);
      }
      roof(x,z+.23,w+1.18,d+2.1,.66+h,large?1.9:1.5,kind);
      box(wood,x,.69,z+d/2+.9,1.6,.14,.35); // low veranda threshold
    }
    building('community-house',0,-19,'tile',true);
    building('home-north-west',-7,-10,'straw');building('home-north-east',7,-10,'straw');
    building('home-south-west',-7,0,'straw');building('home-south-east',7,0,'tile');
    // Front timber gate leaves a 4.4 m clear opening; no collider overlaps the return ring.
    for(const x of [-2.55,2.55]){box(stone,x,.52,24,.75,.44,.85);box(wood,x,2.1,24,.4,3.6,.4,0,true);rect(x,24,.72,.82);}
    box(darkWood,0,3.61,24,5.8,.25,.32);roof(0,24,6.5,2.2,3.72,1.2,'tile');
    landmark('village-gate','gate',0,24,{opening:4.35});
    function fence(x1,z1,x2,z2,height=1.12,solid=true){
      const length=Math.hypot(x2-x1,z2-z1),n=Math.ceil(length/.31);
      for(let i=0;i<=n;i++){const t=i/n,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;cyl(planks,x,.3+height/2,z,.043,height);}
      for(const y of [.3+height*.27,.3+height*.76])between(wood,[x1,y,z1],[x2,y,z2],.052);
      if(solid)rect((x1+x2)/2,(z1+z2)/2,Math.abs(x2-x1)+.1,Math.abs(z2-z1)+.1);
    }
    fence(-24.3,-25,-24.3,24);fence(24.3,-25,24.3,24);fence(-24.3,-25,24.3,-25);
    fence(-24.3,24,-3.0,24);fence(3.0,24,15.4,24);fence(20.6,24,24.3,24);
    landmark('boundary-fence','fence',0,-25);
    // Six crossed leaves form each rice tuft. Hundreds of seedlings share one batch.
    const bladePositions=[];
    for(let i=0;i<3;i++){
      const a=i*Math.PI/3,dx=Math.cos(a)*.105,dz=Math.sin(a)*.105;
      bladePositions.push(-dx,0,-dz,dx,0,dz,dx*.75,.72,dz*.75,dx,0,dz,dx*.4,.22,dz*.4,dx*.75,.72,dz*.75);
    }
    const bladeGeometry=geo(new THREE.BufferGeometry());bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bladePositions,3));bladeGeometry.computeVertexNormals();
    function paddy(id,z){
      const x=-17,w=9,d=10.5;landmark(id,'rice-paddy',x,z,{width:w,depth:d});rect(x,z,w+.3,d+.3);
      box(earth,x,.32,z,w,.04,d);box(water,x,.346,z,w-.25,.018,d-.25);
      for(const side of [-1,1]){box(grass,x+side*w/2,.38,z,.3,.16,d+.3);box(grass,x,.38,z+side*d/2,w,.16,.3);}
      for(let ix=0;ix<18;ix++)for(let iz=0;iz<21;iz++){
        instance(bladeGeometry,rice,x-w/2+.38+ix*.485,.36,z-d/2+.35+iz*.487,.8,.77+random()*.35,.8,0,random()*6.28,0,ix%3===0?0xa9bc55:0x6f9b4b);
      }
      fence(x-w/2,z-d/2,x-w/2,z+d/2,.7,false);fence(x-w/2,z+d/2,x+w/2,z+d/2,.7,false);
    }
    paddy('rice-paddy-north',0);paddy('rice-paddy-south',15);
    // Banyan, roots and a circular stone seat. Its canopy shelters rain, not movement.
    const bx=-7,bz=9;instance(taperedGeometry,wood,bx,2.55,bz,1.0,4.5,1.12,0,0,0,null,true);circle(bx,bz,2.45);
    instance(ringGeometry,stone,bx,.54,bz,2.65,.9,2.65,Math.PI/2);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,x=bx+Math.sin(a)*2.0,z=bz+Math.cos(a)*2.0;
      between(wood,[bx+Math.sin(a)*.72,3.9,bz+Math.cos(a)*.72],[x,.36,z],.14);
      between(wood,[bx,3.5,bz],[bx+Math.sin(a)*2.2,5.6,bz+Math.cos(a)*2.2],.21);
      instance(sphereGeometry,leaves,bx+Math.sin(a)*2.4,6.4+(i%3)*.6,bz+Math.cos(a)*2.4,2.15,1.65,2.15,0,a,0,i%2?0x597c37:0x718f43);
      if(i%2===0)between(wood,[x,5.8,z],[x,.36,z],.039);
    }
    instance(sphereGeometry,leaves,bx,7.5,bz,3.1,1.8,3.1,0,0,0,0x67883c);
    covers.push({x:bx,z:bz,w:4.6,d:4.6,height:9.3,round:true});cameraBox(bx,7.1,bz,8.8,4.4,8.8);
    landmark('banyan','banyan',bx,bz,{canopyRadius:4.6});
    // A hollow stone well with water, timber windlass, rope and bucket.
    const wx=-4,wz=14;circle(wx,wz,1.03);cyl(black,wx,.47,wz,.78,.10);
    for(let layer=0;layer<3;layer++)for(let i=0;i<18;i++){
      const a=(i+(layer%2)*.5)*Math.PI/9;box(stone,wx+Math.sin(a)*.88,.45+layer*.25,wz+Math.cos(a)*.88,.34,.23,.23,a);
    }
    instance(ringGeometry,stone,wx,1.09,wz,.86,.65,.86,Math.PI/2);
    for(const offset of [-1.1,1.1])cyl(wood,wx+offset,1.45,wz,.078,2.3);
    between(wood,[wx-1.18,2.57,wz],[wx+1.18,2.57,wz],.092);between(rope,[wx,2.56,wz],[wx,.59,wz],.014);
    instance(taperedGeometry,planks,wx+1.35,.58,wz+.35,.24,.5,.24);landmark('village-well','well',wx,wz);
    // Practice yard: two wooden dummies, a straw target and a weapon rack.
    for(const x of [6.4,9.0]){
      cyl(wood,x,1.28,13,.13,1.95);cyl(darkWood,x,2.37,13,.19,.28);circle(x,13,.25);
      for(const [y,direction] of [[1.65,1],[1.23,-1]])between(wood,[x-.57,y+.16*direction,13],[x+.57,y-.16*direction,13],.08);
      between(wood,[x,.43,13],[x-.46,.32,13.25],.07);between(wood,[x,.43,13],[x+.46,.32,12.75],.07);
    }
    instance(coneGeometry,straw,10.5,.98,14.7,.5,1.36,.5);circle(10.5,14.7,.5);
    for(const x of [5.3,9.7])cyl(wood,x,.78,16,.08,.95);
    between(wood,[5.3,1.12,16],[9.7,1.12,16],.07);rect(7.5,16,4.5,.14);
    for(let i=0;i<5;i++)between(wood,[5.7+i*.77,.36,15.8],[5.7+i*.77,2.0,16],.032);
    landmark('training-yard','training',7.5,13.5,{dummyCount:2});
    function bridgeHeight(x){
      if(x<14.2||x>21.8)return .3;
      if(x<15.5)return .3+(x-14.2)/1.3*.35;
      if(x>20.5)return .3+(21.8-x)/1.3*.35;
      return .65+.30*Math.sin((x-15.5)/5*Math.PI);
    }
    const bridgeSteps=24;
    for(let i=0;i<bridgeSteps;i++){
      const a=14.2+i*7.6/bridgeSteps,b=14.2+(i+1)*7.6/bridgeSteps,ha=bridgeHeight(a),hb=bridgeHeight(b),length=Math.hypot(b-a,hb-ha);
      instance(boxGeometry,planks,(a+b)/2,(ha+hb)/2-.07,8,length+.015,.14,2.9,0,0,Math.atan2(hb-ha,b-a));
      if(i%3===0)for(const side of [-1,1])cyl(wood,a,ha+.48,8+side*1.5,.055,1.10);
      for(const side of [-1,1])between(wood,[a,ha+.96,8+side*1.5],[b,hb+.96,8+side*1.5],.044);
    }
    for(const z of [6.5,9.5])rect(18,z,7.6,.09);
    landmark('wooden-bridge','bridge',18,8,{width:2.9,fromX:14.2,toX:21.8});
    for(let i=0;i<12;i++)box(planks,14.1+i*.25,.46,-13, .245,.14,3.4);
    for(const x of [14.2,16.7])for(const z of [-14.5,-11.5])cyl(wood,x,.33,z,.08,.65);
    // Small ramp connects the wharf to the .3 m bank with no teleport-height step.
    instance(boxGeometry,planks,13.65,.365,-13,.95,.13,2.7,0,0,Math.atan(.23/.95));
    landmark('boat-dock','dock',15.5,-13,{width:3,depth:3.4});
    // A tapered, open hull built from real side panels, bow, stern and three seats.
    const hullShape=new THREE.Shape();hullShape.moveTo(0,-2.3);hullShape.lineTo(.58,-1.42);hullShape.lineTo(.64,1.35);hullShape.lineTo(0,2.3);hullShape.lineTo(-.64,1.35);hullShape.lineTo(-.58,-1.42);hullShape.closePath();
    const hullGeometry=geo(new THREE.ExtrudeGeometry(hullShape,{depth:.15,bevelEnabled:false}));
    instance(hullGeometry,darkWood,18.5,.12,-13,1,1,1,-Math.PI/2);
    for(const side of [-1,1]){
      between(planks,[18.5+side*.58,.54,-14.42],[18.5+side*.64,.54,-11.65],.09);
      between(planks,[18.5,.54,-15.3],[18.5+side*.58,.54,-14.42],.09);
      between(planks,[18.5+side*.64,.54,-11.65],[18.5,.54,-10.7],.09);
    }
    for(const z of [-14.1,-13,-11.9])box(planks,18.5,.40,z,1.0,.07,.26);
    landmark('river-boat','boat',18.5,-13);
    // Boundary trees and bamboo never occupy the main route or bridge landing.
    function tree(x,z,s=1){
      instance(taperedGeometry,wood,x,.3+1.6*s,z,.20*s,3.2*s,.23*s,0,0,0,null,true);circle(x,z,.24*s);
      for(let i=0;i<5;i++){const a=i*2.4;instance(sphereGeometry,leaves,x+Math.sin(a)*.82*s,3.5*s+(i%2)*.65*s,z+Math.cos(a)*.82*s,1.45*s,1.1*s,1.45*s,0,a,0,i%2?0x638743:0x83a254);}
      covers.push({x,z,w:2.2*s,d:2.2*s,height:5.35*s,round:true});
    }
    for(const [x,z,s] of [[-22,-21,1.2],[-17,-21,1],[-12,-22,.9],[11,-22,1.2],[22,-22,1.25],[22,-7,1.0],[23,19,1.15],[-22,22,.85],[-11,22,.95],[10,22,1],[-23,7,.85]])tree(x,z,s);
    function bamboo(x,z){
      circle(x,z,.55);
      for(let stem=0;stem<5;stem++){
        const a=stem*2.4,px=x+Math.sin(a)*.35,pz=z+Math.cos(a)*.35,h=3.5+random()*1.7;
        cyl(grass,px,.3+h/2,pz,.045,h);
        for(let leaf=0;leaf<4;leaf++)instance(bladeGeometry,rice,px,.9+leaf*.75,pz,2.5,1.2,2.5,0,a+leaf,Math.PI/3,0x688e43);
      }
    }
    for(const [x,z] of [[-23,-14],[-23,-8],[-23,19],[22,-18],[23,0],[23,13],[13,-23],[13,20]])bamboo(x,z);
    // Deterministic rocks and reeds outline both banks; leave bridge and wharf clear.
    for(let i=0;i<60;i++){
      const z=-26+i*.89;if(Math.abs(z-8)<2.1||Math.abs(z+13)<2.3)continue;
      for(const side of [-1,1]){
        const x=18+side*(2.52+random()*.20),r=.18+random()*.28;
        instance(sphereGeometry,riverStone,x,.3+r*.45,z,r*1.3,r*.7,r,0,random()*6,0);
        if(i%2===0)instance(bladeGeometry,rice,x+side*.32,.3,z,1.2,1.2+random(),1.2,0,random()*6,0,0x92a354);
      }
    }
    // Lanterns glow through a shared emissive material; only two unshadowed light sources.
    for(const [x,z,y] of [[-2.05,23.8,2.5],[2.05,23.8,2.5],[-3.7,-15.55,2.7],[3.7,-15.55,2.7]]){
      box(darkWood,x,y+.24,z,.35,.10,.35);box(windowGlow,x,y,z,.28,.42,.28);box(darkWood,x,y-.24,z,.35,.08,.35);
    }
    for(const [x,z,y] of [[0,24,2.8],[0,-15.5,2.9]]){
      const light=new THREE.PointLight(0xffc879,0,11,2);light.position.set(x,y,z);light.castShadow=false;light.userData.baseIntensity=5;light.userData.nightIntensity=.9;root.add(light);lights.push(light);
    }
    // Static geometry and colors are uploaded once. The caller only adjusts weather/light materials.
    let drawCalls=0,triangles=0,instances=0;
    for(const batch of batches.values()){
      const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.transforms.length);mesh.name='tan-thu-batch-'+batch.material.name;
      for(let i=0;i<batch.transforms.length;i++){mesh.setMatrixAt(i,batch.transforms[i]);if(batch.colors[i]!==null)mesh.setColorAt(i,new THREE.Color(batch.colors[i]));}
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.castShadow=batch.cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
      if(batch.material===water)waterMeshes.push(mesh);
      drawCalls++;instances+=batch.transforms.length;triangles+=(batch.geometry.index?batch.geometry.index.count:batch.geometry.attributes.position.count)/3*batch.transforms.length;
    }
    root.updateMatrixWorld(true);
    const bounds={minX:-25,maxX:25,minZ:-27,maxZ:27};
    const dockSurface=(x,z)=>x>=13.2&&x<=16.65&&Math.abs(z+13)<=1.38;
    const bridgeSurface=(x,z)=>x>=14.2&&x<=21.8&&Math.abs(z-8)<=1.16;
    function canWalk(x,z){
      if(!Number.isFinite(x)||!Number.isFinite(z)||x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return false;
      if(x>15.22&&x<20.78&&!bridgeSurface(x,z)&&!dockSurface(x,z))return false;
      for(const obstacle of colliders){const dx=x-obstacle.x,dz=z-obstacle.z;if(obstacle.type==='circle'?dx*dx+dz*dz<obstacle.r*obstacle.r:Math.abs(dx)<obstacle.w&&Math.abs(dz)<obstacle.d)return false;}
      return true;
    }
    function groundHeight(x,z){
      if(bridgeSurface(x,z))return bridgeHeight(x);
      if(dockSurface(x,z))return x<14.1?.3+(x-13.2)/.9*.23:.53;
      for(const b of buildings){
        const dx=Math.abs(x-b.x),front=z-b.z-b.d/2;
        if(dx<b.w/2+.12&&front>=0&&front<=1.1)return .70;
        if(dx<(b.w>6?1.75:1.3)&&front>1.1&&front<=1.86)return front<=1.26?.58:front<=1.56?.50:.42;
      }
      return .3;
    }
    function roofHeight(x,z){
      let height=groundHeight(x,z);
      for(const c of covers){const dx=(x-c.x)/c.w,dz=(z-c.z)/c.d;if(c.round?dx*dx+dz*dz<=1:Math.abs(dx)<=1&&Math.abs(dz)<=1)height=Math.max(height,c.height);}
      return height;
    }
    let disposed=false;
    function dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.clear();for(const value of geometries)value.dispose();for(const value of materials)value.dispose();}
    const references=[
      {path:'../MAP/regions/lang-tan-thu/references/01_Lang_Tan_Thu_Truoc.png',label:'Làng Tân Thủ · Mặt trước'},
      {path:'../MAP/regions/lang-tan-thu/references/02_Lang_Tan_Thu_Trai.png',label:'Làng Tân Thủ · Bên trái'},
      {path:'../MAP/regions/lang-tan-thu/references/03_Lang_Tan_Thu_Phai.png',label:'Làng Tân Thủ · Bên phải'},
      {path:'../MAP/regions/lang-tan-thu/references/04_Lang_Tan_Thu_Sau.png',label:'Làng Tân Thủ · Mặt sau'}
    ];
    const spawn={x:0,y:.3,z:16.5};
    const spawns=Object.freeze({'village-entry':spawn});
    return {id:'lang-tan-thu',name:'Làng Tân Thủ',root,spawn,spawns,defaultSpawnId:'village-entry',portal:{x:0,y:.335,z:20,radius:1.05},bounds,canWalk,groundHeight,roofHeight,cameraBounds,waterMeshes,wetMaterials,lampGlowMaterials,lights,landmarks,references,dispose,diagnostics:{drawCalls,triangles,instances}};
  }
  global.createLangTanThuRegion=createLangTanThuRegion;
})(typeof window==='undefined'?globalThis:window);
