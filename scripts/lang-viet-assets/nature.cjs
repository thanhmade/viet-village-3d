'use strict';
const {T,P,group,mesh,box,cylinder,sphere,beam,torus,curved}=require('./geometry.cjs');
function wind(parent,name,y=0){const g=group(name,parent,0,y,0);g.userData={motion:'wind',amplitude:.018};return g;}
function leaf(p,x,y,z,size=.3,angle=0,color=P.leaf){const m=mesh(p,'leaf',new T.SphereGeometry(1,6,3),color,x,y,z);m.scale.set(size*.38,size*.08,size);m.rotation.set(.2,angle,.13);return m;}
function lotus(p,x,y,z,s=1){
 const g=group('lotus',p,x,y,z);g.scale.setScalar(s);
 for(let i=0;i<4;i++){const a=i*2.4;const pad=cylinder(g,'round-pad',.34,.34,.025,0x70a34b,Math.sin(a)*.5,.03,Math.cos(a)*.5,14);pad.rotation.z=.06*Math.sin(i);}
 beam(g,'flower-stem',[0,0,0],[0,.42,0],.025,P.green);
 for(let layer=0;layer<2;layer++)for(let i=0;i<7;i++){const a=i*Math.PI*2/7+layer*.5;const pet=sphere(g,'petal',1,layer?0xe6a3b1:0xd8839e,Math.sin(a)*(.13-layer*.06),.45+layer*.08,Math.cos(a)*(.13-layer*.06),.08,.17,.045);pet.rotation.set(Math.cos(a)*.6,a,-Math.sin(a)*.6);}
 sphere(g,'flower-centre',.06,0xe3bc4c,0,.54,0);
}
function tree(type){const g=group(type);let h=6,r=.32;
 if(type==='banyan'){h=7;r=.85;}if(type==='palm'){h=6.2;r=.15;}if(type==='banana'){h=2.6;r=.17;}
 if(type==='bamboo'){
  // One rooted canopy pivot per clump keeps all stems fixed without issuing
  // a separate draw call for each material on each of nine small branches.
  const canopy=wind(g,'bamboo-canopy',1.6);
  for(let i=0;i<9;i++){const a=i*2.4,xx=Math.sin(a)*.55,zz=Math.cos(a)*.55,hh=3.9+(i%4)*.48;
   cylinder(g,'bamboo-stem',.055,.075,hh,i%2?P.green:0x8a9e4d,xx,hh/2,zz,7);
   for(let j=1;j<8;j++)torus(g,'bamboo-node',.07,.018,0xadb16b,xx,hh*j/8,zz);
   const crown=group('bamboo-branches-'+i,canopy,xx,hh*.42-1.6,zz);
   for(let j=0;j<5;j++){const yy=j*hh*.10;const a2=i+j*2.4;beam(crown,'twig',[0,yy,0],[Math.sin(a2)*.7,yy+.3,Math.cos(a2)*.7],.015,P.green);for(let k=0;k<5;k++)leaf(crown,Math.sin(a2)*(.2+k*.15),yy+.18,Math.cos(a2)*(.2+k*.15),.25,a2+k*.5);}
  }return g;
 }
 curved(g,'trunk',[[0,.1,0],[.1,h*.35,.05],[.15,h*.62,0]],r,P.wood);
 if(type==='banana'){
  cylinder(g,'pseudostem',.13,.23,2.1,0x929a55,0,1.05,0,8);const crown=wind(g,'banana-leaves',2.0);
  for(let i=0;i<9;i++){const a=i*2.4,dx=Math.sin(a),dz=Math.cos(a);curved(crown,'leaf-spine',[[0,0,0],[dx*.55,.6,dz*.55],[dx*1.4,.25,dz*1.4]],.023,P.green);const m=leaf(crown,dx*.9,.42,dz*.9,.98,a, i%2?P.leaf:P.green);m.scale.x=.39;m.rotation.x=.2;}
  for(let i=0;i<7;i++)sphere(g,'banana-fruit',.11,0x6d9b3e,.15+(i%3)*.12,1.8-Math.floor(i/3)*.15,.2,.5,1.5,.5);return g;
 }
 if(type==='palm'){
  for(let i=0;i<19;i++)torus(g,'palm-trunk-rings',.16,.023,0xb5a081,.1,i*.23+.2,0);
  const crown=wind(g,'palm-fronds',4.5);
  for(let i=0;i<10;i++){const a=i*Math.PI/5;for(let j=0;j<7;j++){const t=j/6,r=1.9*t,yy=.7*Math.sin(t*Math.PI)-t*.55;beam(crown,'frond-spine',[Math.sin(a)*Math.max(0,r-.32),yy+.08,Math.cos(a)*Math.max(0,r-.32)],[Math.sin(a)*r,yy,Math.cos(a)*r],.017,P.green);for(const side of [-1,1])leaf(crown,Math.sin(a)*r+Math.cos(a)*side*.28,yy,Math.cos(a)*r-Math.sin(a)*side*.28,.48,a+side*.6);}}
  for(let i=0;i<5;i++)sphere(g,'areca-fruit',.14,0xbaa354,.17*Math.sin(i),4.2,.17*Math.cos(i));return g;
 }
 const count=type==='banyan'?12:7,span=type==='banyan'?4.6:2.4;
 if(type==='banyan'){
  for(let i=0;i<14;i++){const a=i*2.4;curved(g,'buttress-root',[[Math.sin(a)*2.7,.1,Math.cos(a)*2.7],[Math.sin(a)*1.25,.5,Math.cos(a)*1.25],[Math.sin(a)*.55,2.7,Math.cos(a)*.55]],.16,P.wood);}
 }
 const crown=wind(g,'branches-and-leaves',h*.4);
 for(let i=0;i<count;i++){const a=i*2.399,rr=span*(.5+(i%3)*.18),yy=h*.28+(i%3)*.35;
  const xx=Math.sin(a)*rr,zz=Math.cos(a)*rr;
  curved(crown,'branch',[[0,0,0],[xx*.42,yy*.75,zz*.42],[xx,yy,zz]],type==='banyan'?.19:.1,P.wood);
  for(let j=0;j<6;j++){const aa=a+j*2.4,dx=xx+Math.sin(aa)*.7,dz=zz+Math.cos(aa)*.7;
   beam(crown,'fine-branch',[xx,yy,zz],[dx,yy+.2,dz],.028,P.wood);
   for(let k=0;k<9;k++){const b=k*2.4;leaf(crown,dx+Math.sin(b)*.28,yy+.23+(k%3)*.09,dz+Math.cos(b)*.28,.28,b,[P.green,P.leaf,P.leafLight][(i+j+k)%3]);}
   if(type==='willow')for(let k=0;k<3;k++){const drop=group('willow-strand',crown,dx+k*.12,yy,dz);beam(drop,'hanging-twig',[0,0,0],[.15,-2.1,0],.012,P.green);for(let l=0;l<8;l++)leaf(drop,.02,-l*.26,0,.18,l*2.4);}
  }
  if(type==='banyan')for(let j=0;j<2;j++)curved(g,'aerial-root',[[xx+j*.2,h*.4+yy,zz],[xx+.1,h*.25,zz+.1],[xx+.15,.15,zz+.15]],.023,0x92734b);
 }return g;
}
function bush(flowers=false){const g=group(flowers?'flower-bush':'grass-tuft'),c=wind(g,'tips',.08);
 for(let i=0;i<28;i++){const a=i*2.4,r=.08+(i%6)*.07,x=Math.sin(a)*r,z=Math.cos(a)*r,h=.27+(i%5)*.075;
  beam(c,'stalk',[x,0,z],[x*1.3,h,z*1.3],.012,P.green);
  if(flowers)leaf(c,x*1.1,h*.6,z*1.1,.17,a);
  else {const blade=mesh(c,'grass-blade',new T.ConeGeometry(.032,h,3),i%2?P.leaf:P.leafLight,x*1.1,h/2,z*1.1);blade.rotation.set(Math.cos(a)*.25,0,-Math.sin(a)*.25);}
  if(flowers){for(let j=0;j<5;j++)sphere(c,'flower-petal',.055,[0xe0ae59,0xd38492,0xe8d6a1][i%3],x*1.3+Math.sin(j*1.256)*.055,h,z*1.3+Math.cos(j*1.256)*.055,1,.5,1);sphere(c,'pollen',.035,0xc9993e,x*1.3,h+.015,z*1.3);}
 }return g;
}
function buildNature(id){
 const trees={LV_CAY_DA_01:'banyan',LV_CAY_TRE_01:'bamboo',LV_CAY_CHUOI_01:'banana',LV_CAY_CAU_01:'palm',LV_CAY_LIEU_01:'willow',LV_CAY_TAN_RONG_01:'broadleaf'};
 if(trees[id])return tree(trees[id]);
 if(id==='LV_BUI_CO_01'||id==='LV_BUI_HOA_01')return bush(id.includes('HOA'));
 const g=group(id);
 if(id==='LV_CUM_SEN_01'){lotus(g,0,0,0,1);lotus(g,.65,0,.22,.75);return g;}
 if(id==='LV_THAM_CO_01'){
  box(g,'turf',2.8,.025,2.2,0x698b42,0,.0125,0);
  const tips=wind(g,'turf-tips',.025);tips.userData.amplitude=.009;
  for(let i=0;i<32;i++){const b=bush();
   b.traverse(node=>{if(node.userData.motion==='wind')delete node.userData.motion;});
   b.position.set(-1.13+(i%8)*.32+Math.sin(i*2.4)*.045,0,-.77+Math.floor(i/8)*.5+Math.cos(i*2.4)*.04);
   b.scale.setScalar(.38);tips.add(b);
  }return g;
 }
 if(id==='LV_DONG_ROM_01'){
  cylinder(g,'straw-base',1.05,1.4,1.5,0xbf9c52,0,.75,0,20);mesh(g,'straw-cone',new T.ConeGeometry(1.06,1.1,20),0xc7a65e,0,2.05,0);
  for(let i=0;i<80;i++){const a=i*2.4,r=1.0+(i%3)*.1;beam(g,'straw-strand',[Math.sin(a)*r,.1,Math.cos(a)*r],[Math.sin(a)*.12,2.55,Math.cos(a)*.12],.012,i%2?0xd1b46e:0xa7823e);}return g;
 }
 if(id==='LV_AO_SEN_01'){
  const water=cylinder(g,'pond-water',1,1,.03,P.water,0,.015,0,64);water.scale.set(6.4,1,4.5);water.userData.waterSurface=true;
  for(let i=0;i<42;i++){const a=i*Math.PI*2/42;const rock=sphere(g,'bank-stone',.48,i%2?P.stone:P.stoneDark,Math.cos(a)*6.5,.12,Math.sin(a)*4.6,1,.58,.8);rock.rotation.y=a;}
  // Bridge corridor and existing house approach are deliberately free of lotus.
  for(let i=0;i<18;i++){const a=i*2.4,x=Math.sin(a)*(2+(i%4)),z=Math.cos(a)*3.3;if(Math.abs(z)>1.3)lotus(g,x,.04,z,.6+(i%3)*.1);}return g;
 }
 return null;
}
module.exports={buildNature,tree,bush,lotus};
