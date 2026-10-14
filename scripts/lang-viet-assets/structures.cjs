'use strict';
const {T,P,group,mesh,box,cylinder,sphere,beam,torus,lathe,curved}=require('./geometry.cjs');
function windowFrame(parent,x,y,z,ry=0,w=1,h=1.2){const g=group('barred-window',parent,x,y,z);g.rotation.y=ry;
 box(g,'window-recess',w,h,.04,P.dark,0,0,0);
 for(const xx of [-w/2,w/2])box(g,'window-post',.09,h+.16,.12,P.wood,xx,0,.04);
 for(const yy of [-h/2,h/2])box(g,'window-lintel',w+.18,.09,.16,P.lightWood,0,yy,.06);
 for(let i=0;i<7;i++)box(g,'window-bar',.045,h,.07,P.lightWood,-w*.4+i*w*.8/6,0,.08);return g;
}
function door(parent,x,y,z,w=1.2,h=2.15){const g=group('double-door',parent,x,y,z);
 for(const side of [-1,1]){box(g,'door-jamb',.12,h+.2,.18,P.wood,side*(w/2+.06),h/2,0);
  const pivot=group('door-hinge-'+side,g,side*w/2,0,.05);pivot.userData={motion:'hinge',axis:'y',openAngle:side*1.25};
  for(let j=0;j<4;j++)box(pivot,'door-plank',w/8-.012,h,.075,j%2?P.wood:P.lightWood,-side*(j+.5)*w/8,h/2,0);
  for(const yy of [.16,h*.49,h-.16])box(pivot,'door-rail',w/2-.03,.085,.11,P.dark,-side*w/4,yy,.03);
  torus(pivot,'door-ring',.055,.012,P.metal,-side*(w/2-.12),h*.5,.11,0);
 }box(g,'door-lintel',w+.3,.14,.21,P.lightWood,0,h+.04,0);return g;
}
function roof(parent,w,d,ridge,slope=.55,curl=.16){
 const h=(x,z)=>ridge-slope*Math.abs(z)+curl*Math.pow(Math.abs(z)/(d/2),7)+.08*Math.pow(Math.abs(x)/(w/2),10);
 const v=[],idx=[],nx=24,nz=14;
 for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const x=-w/2+i*w/nx,z=-d/2+j*d/nz;v.push(x,h(x,z),z);}
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=i*(nz+1)+j,b=a+nz+1;idx.push(a,a+1,b,b,a+1,b+1);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(parent,'roof-surface',geo,P.roof);
 const countX=Math.ceil(w/.32),countZ=Math.ceil(d/.32);
 for(let i=0;i<countX;i++)for(let j=0;j<countZ;j++){
  const x=-w/2+(i+.5)*w/countX,z=-d/2+(j+.5)*d/countZ;
  const tile=box(parent,'terracotta-tile',w/countX*.95,.055,d/countZ*.94,[P.roof,P.roofLight,0xbb6a40][(i+j*3)%3],x,h(x,z)+.04,z);
  tile.rotation.x=-Math.atan((h(x,z+.01)-h(x,z-.01))/.02);
 }
 for(const x of [-w/2,w/2]){const pts=[];for(let j=0;j<=12;j++){const z=-d/2+j*d/12;pts.push([x,h(x,z)+.12,z]);}curved(parent,'roof-edge',pts,.07,P.cream);
  for(const s of [-1,1]){const arc=mesh(parent,'roof-scroll',new T.TorusGeometry(.23,.055,6,15,Math.PI*1.6),P.cream,x,h(x,s*d/2)+.23,s*d/2);arc.rotation.y=Math.PI/2;arc.rotation.z=s<0?0:Math.PI;}}
 beam(parent,'ridge',[-w/2,ridge+.1,0],[w/2,ridge+.1,0],.09,P.cream);
 for(let x=-w/2+.3;x<w/2;x+=.8)for(const s of [-1,1])beam(parent,'rafter',[x,ridge-.14,0],[x,h(x,s*d/2)-.12,s*d/2],.045,P.wood);
}
function house(type){const g=group('house-'+type);
 box(g,'foundation',6.55,.40,4.85,P.stoneDark,0,.2,.35);box(g,'raised-floor',6.65,.13,4.95,P.stone,0,.465,.35);
 // Separate walls retain depth. Indoor gameplay uses the existing independent room.
 box(g,'rear-wall',6.3,2.61,.16,P.wall,0,1.87,-2.05);for(const x of [-3.07,3.07])box(g,'side-wall',.16,2.61,3.8,P.wall,x,1.87,-.15);
 for(const side of [-1,1])box(g,'front-wall',2.43,2.61,.16,P.wall,side*1.94,1.87,1.75);
 box(g,'door-above',1.46,.45,.16,P.wall,0,2.95,1.75);
 for(const x of [-3.15,3.15]){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([x,3.175,-2.05,x,4.5,0,x,3.175,1.75],3));geo.computeVertexNormals();mesh(g,'gable',geo,P.wall);}
 for(const x of [-3.05,-1.17,1.17,3.05]){box(g,'column-foot',.25,.08,.28,P.stone,x,.59,2.58);box(g,'porch-column',.15,2.59,.18,P.wood,x,1.925,2.58);box(g,'column-cap',.26,.16,.26,P.dark,x,3.2,2.58);}
 box(g,'porch-beam',6.5,.14,.18,P.dark,0,3.18,2.58);
 for(let i=0;i<18;i++)for(let j=0;j<3;j++)box(g,'porch-brick',.35,.035,.30,P.roofLight,-3.08+i*.36,.55,1.92+j*.30);
 for(let i=0;i<3;i++)box(g,'front-step',1.75-i*.05,.17,.64-i*.14,P.stone,0,.085+i*.17,3.21-i*.205);
 door(g,0,.64,1.82,1.2,2.15);for(const x of [-2.04,2.04])windowFrame(g,x,1.97,1.85);
 for(const side of [-1,1])windowFrame(g,side*3.165,1.93,-.12,side*Math.PI/2);
 for(const x of [-1.8,1.8])windowFrame(g,x,1.93,-2.15,Math.PI);
 for(let i=0;i<15;i++)for(const z of [-2.08,2.78])box(g,'foundation-stone',.39,.25,.13,i%2?P.stone:P.stoneDark,-3.08+i*.44,.18,z);
 roof(g,7.15,5.25,type==='B'?4.5:4.66,.55,type==='B'?.12:.18);return g;
}
function temple(){const g=group('communal-house');box(g,'foundation',12.5,.45,7.3,P.stoneDark,0,.225,0);box(g,'porch-floor',11.8,.23,6.8,P.stone,0,.56,0);
 box(g,'rear-wall',10.7,3.9,.18,P.wall,0,2.6,-2.8);for(const x of [-5.26,5.26])box(g,'side-wall',.18,3.9,4.2,P.wall,x,2.6,-.7);
 for(const x of [-4.9,-2.5,0,2.5,4.9]){cylinder(g,'porch-column',.17,.22,4.2,P.wood,x,2.8,2.7,10);cylinder(g,'stone-column-foot',.31,.34,.2,P.stone,x,.775,2.7,8);}
 box(g,'front-lintel',10.7,.42,.2,P.dark,0,4.1,1.46);
 for(const x of [-3.4,0,3.4])door(g,x,.8,1.46,2.2,2.9);
 for(let i=0;i<3;i++)box(g,'porch-step',9-i*.3,.15,1,P.stone,0,.08+i*.15,4.3-i*.65);
 for(const side of [-1,1])windowFrame(g,side*5.36,2.7,-.7,side*Math.PI/2,1.2,1.6);
 for(let i=0;i<21;i++)for(const z of [-3.65,3.65])box(g,'base-stone',.55,.25,.12,i%2?P.stone:P.stoneDark,-6+i*.60,.20,z);
 roof(g,13.7,8.1,7.2,.66,.36);return g;
}
function fence(parent,a,b){const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),len=delta.length(),n=Math.max(2,Math.round(len/.24));
 for(let i=0;i<=n;i++){const t=i/n,x=a[0]+delta.x*t,z=a[2]+delta.z*t,hh=i===0||i===n?1.5:1.28+(i%2)*.06;
  cylinder(parent,'bamboo-picket',i===0||i===n?.075:.035,i===0||i===n?.085:.04,hh,P.bamboo,x,hh/2,z,8);
  for(const y of [.32,1.1])torus(parent,'rope-binding',i===0||i===n?.088:.045,.014,P.dark,x,y,z);
 }for(const y of [.32,1.1])beam(parent,'horizontal-rail',[a[0],y,a[2]],[b[0],y,b[2]],.044,P.bamboo);
}
function trellis(vegetated){const g=group('bamboo-trellis');for(const x of [-1.55,0,1.55])for(const z of [-1.1,1.1]){
 cylinder(g,'support-post',.055,.075,2.35,P.bamboo,x,1.175,z,8);for(const y of [.6,2.18])torus(g,'rope-tie',.078,.015,P.dark,x,y,z);
 }for(let x=-1.6;x<=1.6;x+=.4)beam(g,'top-crossbar',[x,2.22,-1.18],[x,2.22,1.18],.033,P.bamboo);
 for(let z=-1.1;z<=1.1;z+=.35)beam(g,'top-runner',[-1.65,2.28,z],[1.65,2.28,z],.033,P.bamboo);
 for(const z of [-1.1,1.1])beam(g,'lower-brace',[-1.6,.6,z],[1.6,.6,z],.04,P.bamboo);
 if(vegetated){const vines=group('gourd-vines',g,0,1.1,0);vines.userData={motion:'wind',amplitude:.007};
  for(let i=0;i<40;i++){const x=Math.sin(i*2.4)*1.4,z=Math.cos(i*2.4)*.95;sphere(vines,'vine-leaf',.22,i%2?P.leaf:P.green,x,1.2+(i%3)*.03,z,1,.12,1);if(i%5===0){beam(vines,'gourd-stem',[x,1.2,z],[x,.8,z],.017,P.green);sphere(vines,'hanging-gourd',.13,0x6d943d,x,.6,z,.8,2.2,.8);sphere(vines,'yellow-flower',.06,0xd8bd4a,x,1.24,z);}}
 }return g;
}
function buildStructure(id){
 if(id==='LV_NHA_DAN_A'||id==='LV_NHA_DAN_B')return house(id.endsWith('A')?'A':'B');
 if(id==='LV_DINH_LANG_01')return temple();
 if(id==='LV_GIAN_LEO_TRE_01'||id==='LV_GIAN_MUOP_01')return trellis(id.includes('MUOP'));
 const g=group(id);
 if(id==='LV_HANG_RAO_TRE_01'){fence(g,[-1.5,0,0],[1.5,0,0]);return g;}
 if(id==='LV_HANG_RAO_TRE_GOC_01'){fence(g,[0,0,0],[2,0,0]);fence(g,[0,0,0],[0,0,2]);return g;}
 if(id==='LV_CONG_VUON_TRE_01'){
  for(const x of [-.8,.8])cylinder(g,'gate-post',.075,.085,1.5,P.bamboo,x,.75,0,8);
  const hinge=group('garden-gate-hinge',g,-.72,0,0);hinge.userData={motion:'hinge',axis:'y',openAngle:-1.6};fence(hinge,[0,0,0],[1.44,0,0]);beam(hinge,'diagonal-brace',[.05,.34,.08],[1.35,1.1,.08],.04,P.bamboo);return g;
 }
 if(id==='LV_BON_CAY_DA_01'){
  for(let row=0;row<2;row++)for(let i=0;i<48;i++){const a=(i+row*.5)*Math.PI/24;const b=box(g,'masonry-ring',.53,.17,.38,i%3?P.stone:P.stoneDark,Math.sin(a)*4.05,.085+row*.17,Math.cos(a)*4.05);b.rotation.y=a;}
  for(let i=0;i<4;i++){const a=i*Math.PI/2;box(g,'corner-pier',.58,.52,.58,P.stone,Math.sin(a)*4.03,.26,Math.cos(a)*4.03);}return g;
 }
 if(id==='LV_CONG_LANG_01'){
  for(const x of [-3.55,-2.1,2.1,3.55])for(const z of [-.55,.55]){box(g,'stone-foot',.84,.4,.86,P.stone,x,.2,z);box(g,'column',.46,3.8,.48,P.wood,x,2.43,z);box(g,'column-cap',.62,.26,.65,P.dark,x,4.28,z);}
  for(const side of [-1,1]){const wing=group('gate-wing-'+side,g,side*2.82,0,0);for(const z of [-.55,.55]){for(let j=0;j<7;j++)box(wing,'wing-plank',.13,1.88,.10,j%2?P.lightWood:P.wood,-.45+j*.15,1.69,z);for(const x of [-.3,0,.3])box(wing,'wing-bar',.09,.7,.1,P.wood,x,3.1,z);}roof(wing,1.8,3.15,4.56,.65,.25);}
  box(g,'main-lintel',4.8,.36,1.4,P.dark,0,4.24,0);roof(g,5.65,3.5,5.75,.79,.3);return g;
 }
 if(id==='LV_CAU_AO_SEN_01'){
  const height=x=>.11+1.25*Math.sin(Math.PI*(x+5.8)/11.6);
  for(let i=0;i<40;i++){const x=-5.8+(i+.5)*11.6/40,b=box(g,'deck-plank',.292,.11,1.75,i%2?P.lightWood:P.wood,x,height(x)-.055,0);b.rotation.z=Math.atan(1.25*Math.PI/11.6*Math.cos(Math.PI*(x+5.8)/11.6));}
  for(const side of [-1,1]){for(let i=0;i<9;i++){const x=-5.8+i*11.6/8,y=height(x);box(g,'rail-post',.14,.95,.14,P.wood,x,y+.475,side*.98);if(i<8){const x2=x+11.6/8;for(const hh of [.35,.86])beam(g,'bridge-rail',[x,y+hh,side*.98],[x2,height(x2)+hh,side*.98],.05,P.lightWood);}}
   const pts=[];for(let i=0;i<=20;i++){const x=-5.8+i*11.6/20;pts.push([x,height(x)-.10,side*.73]);}curved(g,'arch-beam',pts,.08,P.dark);
  }for(const x of [-5.8,5.8])box(g,'bridge-foot',.4,.11,2,P.stone,x,.055,0);return g;
 }
 if(id==='LV_GIENG_NUOC_01'){
  cylinder(g,'paved-base',1.35,1.38,.10,P.stone,0,.05,0,32);
  lathe(g,'well-wall',[[.70,.1],[.87,.1],[.87,.92],[.68,.92],[.68,.1]],P.stone);
  for(let row=0;row<4;row++)for(let i=0;i<18;i++){const a=(i+row*.5)*Math.PI/9,b=box(g,'well-stone',.28,.18,.13,i%2?P.stone:P.stoneDark,Math.sin(a)*.84,.2+row*.20,Math.cos(a)*.84);b.rotation.y=a;}
  torus(g,'well-rim',.79,.12,0xbfb6a0,0,.93,0);cylinder(g,'well-water',.68,.68,.02,P.water,0,.22,0,24);
  const bucket=group('water-bucket',g,1.01,.1,.12);lathe(bucket,'bucket-body',[[.15,0],[.2,.34],[.18,.34],[.13,.03],[.15,0]],P.wood);for(const y of [.07,.28])torus(bucket,'bucket-hoop',.16+y*.1,.016,P.metal,0,y,0);curved(bucket,'bucket-handle',[[-.18,.3,0],[-.17,.5,0],[.17,.5,0],[.18,.3,0]],.018,P.metal);
  for(let i=0;i<4;i++)torus(g,'coiled-rope',.12+i*.035,.012,0xb5a574,.8,.12,.72);return g;
 }
 if(['LV_DUONG_DA_01','LV_DUONG_DAT_01','LV_SAN_GACH_01'].includes(id)){
  const brick=id==='LV_SAN_GACH_01',dirt=id==='LV_DUONG_DAT_01',w=brick?3:2.5,d=brick?3:4;
  box(g,'path-base',w,.025,d,dirt?0xb39160:P.stoneDark,0,.0125,0);
  if(!dirt)for(let i=0;i<(brick?6:5);i++)for(let j=0;j<(brick?6:8);j++){
   const a=(brick?6:5),b=(brick?6:8),tile=box(g,brick?'brick':'stone-slab',w/a*.96,.028,d/b*.95,brick?[P.roof,0xb37452,P.roofLight][(i+j)%3]:[P.stone,0xc2bba3,0xb1ab95][(i+j)%3],-w/2+(i+.5)*w/a,.03,-d/2+(j+.5)*d/b);if(!brick)tile.rotation.y=.025*Math.sin(i+j);
  }
  if(dirt)for(let i=0;i<25;i++)sphere(g,'gravel',.025+(i%3)*.01,P.stone,Math.sin(i*2.4),.035,Math.cos(i*2.4)*1.8,1,.4,1);
  return g;
 }
 if(id==='LV_VUON_RAU_01'){
  box(g,'garden-bed',10.5,.12,7.2,P.earth,0,.06,0);
  const reserved=(x,z)=>[[1.05,6.95,-3.4,-1.8],[3.25,4.75,-3.25,.15],[3.25,8.75,-1.35,.15]].some(([x1,x2,z1,z2])=>x+.36>x1&&x-.36<x2&&z+.45>z1&&z-.45<z2);
  for(let row=0;row<5;row++){const z=-2.9+row*1.35;
   for(let i=0;i<12;i++){const x=-4.05+i*.72;if(reserved(x,z))continue;
    box(g,'soil-row',.71,.14,.90,0x7c603d,x,.19,z);
    for(let j=0;j<5;j++){const a=j*2.4,leaf=sphere(g,'vegetable-leaf',.22,[P.green,P.leaf,P.leafLight][row%3],x+Math.sin(a)*.12,.38+(row%2)*.05,z+Math.cos(a)*.12,1,.55,1);leaf.rotation.z=Math.sin(a)*.5;}
    if(row===2)sphere(g,'cabbage-core',.18,0x9ab963,x,.43,z);
   }
  }return g;
 }
 return null;
}
module.exports={buildStructure};
