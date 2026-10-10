'use strict';
// Cổng gỗ theo bốn góc ảnh: lối giữa mở, ô vách hai bên và mái cuộn đầu.
let gateView=-1;
const gateDesign={width:8.7,depth:3.5,opening:3.7,postXs:[-3.55,-2.1,2.1,3.55],baseZ:24};
function gateScroll(x,y,z,axis,sign,parent){const pts=[];for(let i=0;i<=34;i++){let t=i/34,a=-Math.PI*.8+t*Math.PI*1.8,r=.46*(1-t*.72);pts.push(new THREE.Vector3(axis==='x'?x+sign*Math.cos(a)*r:x,y+.30+Math.sin(a)*r,axis==='z'?z+sign*Math.cos(a)*r:z));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),36,.105,7,false),0xead5aa,0,0,0,parent);}
function gateRoof(parent){const w=8.7,d=3.5,roofY=z=>5.75-.79*Math.abs(z)+.30*Math.pow(Math.abs(z)/(d/2),7),edgeY=x=>.10*Math.pow(Math.abs(x)/(w/2),12),nx=30,nz=16,v=[],indices=[];
for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){let x=-w/2+w*i/nx,z=-d/2+d*j/nz;v.push(x,roofY(z)+edgeY(x),z);}for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){let a=i*(nz+1)+j,b=a+nz+1;indices.push(a,a+1,b,b,a+1,b+1);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setIndex(indices);geo.computeVertexNormals();mesh(geo,0xa64825,0,0,0,parent,{side:THREE.DoubleSide});
const tileGeo=new THREE.BoxGeometry(.275,.11,.30),countX=30,countZ=12,tiles=new THREE.InstancedMesh(tileGeo,mat(0xdb7433),countX*countZ),o=new THREE.Object3D(),color=new THREE.Color();for(let i=0;i<countX;i++)for(let j=0;j<countZ;j++){let x=-w/2+(i+.5)*w/countX,z=-d/2+(j+.5)*d/countZ,dy=(roofY(z+.01)-roofY(z-.01))/.02;o.position.set(x,roofY(z)+edgeY(x)+.06,z);o.rotation.set(-Math.atan(dy),0,0);o.updateMatrix();let k=i*countZ+j;tiles.setMatrixAt(k,o.matrix);color.setHex([0xe8823b,0xd56a2e,0xc25c28,0xed944a][(i*3+j)%4]);tiles.setColorAt(k,color);}tiles.receiveShadow=true;parent.add(tiles);
for(let x of [-w/2,w/2]){for(let j=0;j<24;j++){let z=-d/2+j*d/24,zz=-d/2+(j+1)*d/24;between([x,roofY(z)+.16,z],[x,roofY(zz)+.16,zz],.115,0xe7cf9e,parent);}for(let sign of [-1,1])gateScroll(x,roofY(sign*d/2)+.15,sign*d/2,'z',sign,parent);}
between([-w/2,5.92,0],[w/2,5.92,0],.13,0xe8d3aa,parent);for(let sign of [-1,1])gateScroll(sign*w/2,5.92,0,'x',sign,parent);
for(let z of [-1.68,1.68])box(w,.20,.22,0x965725,0,4.61,z,parent);
for(let x of [-3.55,-2.1,0,2.1,3.55])between([x,4.48,-1.55],[x,5.58,0],.09,0x8e552c,parent),between([x,5.58,0],[x,4.48,1.55],.09,0x8e552c,parent);
}
function carvedBlock(x,y,z,parent){box(.58,.58,.11,0xb57940,x,y,z,parent);for(let a=0;a<8;a++){let angle=a*Math.PI/4;between([x,y,z+.07],[x+Math.sin(angle)*.22,y+Math.cos(angle)*.22,z+.075],.009,0x825528,parent);}ball(.07,0xd0a169,x,y,z+.08,parent);}
function entrance(){const g=new THREE.Group();g.name='cong-lang-theo-tham-chieu';g.position.set(0,.24,24);g.userData.referenceGate=true;world.add(g);gateDoors=[];
for(let x of gateDesign.postXs)for(let z of [-.55,.55]){
box(.84,.40,.86,0xcbbb98,x,.20,z,g);box(.69,.14,.71,0xe8dcc1,x,.46,z,g);box(.46,3.80,.48,0xa56b36,x,2.43,z,g);box(.62,.26,.65,0x926035,x,4.28,z,g);
// Các đường vân mảnh có độ lệch để bề mặt gỗ không phẳng hoàn toàn.
for(let j=0;j<5;j++){let xx=x-.17+j*.085;for(let face of [-1,1]){let points=[];for(let k=0;k<6;k++)points.push(new THREE.Vector3(xx+Math.sin(k*1.7+j)*.012,.57+k*.71,z+face*.246));mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),10,.0045,3,false),j%2?0xc08b4a:0x835227,0,0,0,g);}}
for(let face of [-1,1])carvedBlock(x,4.0,z+face*.28,g);
}
for(let side of [-1,1]){let center=side*2.82;box(1.05,.18,1.16,0x8b572d,center,.63,0,g);box(1.05,.20,1.16,0x8b572d,center,2.72,0,g);box(1.05,.18,1.16,0x916033,center,3.78,0,g);for(let z of [-.55,.55]){
for(let j=0;j<7;j++)box(.13,1.88,.10,j%2?0xa5733d:0xba8547,center-.45+j*.15,1.69,z,g);
for(let xx of [-.24,.24]){box(.13,.62,.14,0x96632f,center+xx,3.13,z,g);cyl(.07,.07,.13,8,0x96632f,center+xx,3.50,z,g);}
}for(let z of [-.66,.66])carvedBlock(center,3.80,z,g);}
for(let z of [-.62,.62])box(7.4,.33,.30,0x8f5d31,0,4.24,z,g);for(let x of gateDesign.postXs)box(.35,1.06,.35,0x936437,x,4.95,0,g);
gateRoof(g);
// Hàng rào tre và trụ đá hai bên cổng.
for(let side of [-1,1]){for(let i=0;i<11;i++){let x=side*(4.2+i*.26);cyl(.055,.075,1.36,7,0xc4a25d,x,.96,24.02);}for(let h of [.65,1.50])between([side*4.15,h,24.02],[side*7.0,h,24.02],.08,0xb18a49);box(.55,1.57,.56,0xc9bea2,side*7.1,1.0,24);box(.65,.25,.68,0xe2d4b4,side*7.1,1.88,24);}
fence(-24,24,-7.45,24);fence(7.45,24,24,24);
banana(-5.9,22.6);for(let side of [-1,1]){for(let i=0;i<11;i++){let x=side*(4.7+random()*2.2),z=22.4+random()*2.1;instance('leaf',i%2?0x6c9f42:0x52893d,x,.6+random()*.7,z,.42,.48,.40);for(let j=0;j<5;j++){let a=j*2*Math.PI/5;instance('petal',i%3?0xf3dba5:0xeaa0b2,x+Math.sin(a)*.12,1.08,z+Math.cos(a)*.12,.1,.10,.055,0,a);}}}
const jarX=-5.25,jarZ=24.85;cyl(.42,.28,.24,12,0xa86d3c,jarX,.43,jarZ);cyl(.63,.42,.73,16,0xb47c45,jarX,.88,jarZ);cyl(.45,.63,.25,16,0xb47c45,jarX,1.37,jarZ);let lip=mesh(new THREE.TorusGeometry(.42,.07,7,24),0xd19b5c,jarX,1.55,jarZ);lip.rotation.x=Math.PI/2;let opening=mesh(new THREE.CircleGeometry(.35,24),0x49311f,jarX,1.52,jarZ);opening.rotation.x=-Math.PI/2;for(let yy of [.65,1.1]){let ring=mesh(new THREE.TorusGeometry(.57,.025,6,20),0x95602f,jarX,yy,jarZ);ring.rotation.x=Math.PI/2;}
for(let i=0;i<8;i++){let m=mesh(new THREE.CylinderGeometry(.61,.66,.08,7),i%2?0xd2c3a5:0xc4b597,(i%2?-.48:.42),.29,22.2+i*.48);m.scale.z=.72;}
}
