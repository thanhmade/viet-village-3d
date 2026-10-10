'use strict';
// Các mô hình tạo trực tiếp bằng hình học Three.js, không phụ thuộc ảnh ngoài.
const materials=new Map();
function mat(c,extra={}){let key=c+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:c,roughness:.82,...extra}));return materials.get(key);}
function mesh(geo,color,x,y,z,parent=world,extra={}){let m=new THREE.Mesh(geo,mat(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,c,x,y,z,p=world){return mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,p);}
function cyl(a,b,h,n,c,x,y,z,p=world){return mesh(new THREE.CylinderGeometry(a,b,h,n),c,x,y,z,p);}
function ball(r,c,x,y,z,p=world){return mesh(new THREE.IcosahedronGeometry(r,1),c,x,y,z,p);}
function palm(x,z,s=1){let g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.add(g);let trunk=cyl(.16,.27,3.6,7,0x996f49,.2,1.8,0,g);trunk.rotation.z=-.12;for(let i=0;i<7;i++){let a=i*Math.PI*2/7;let leaf=mesh(new THREE.ConeGeometry(.62,2.65,4),i%2?0x1c8060:0x32a575,Math.sin(a)*.85,3.75,Math.cos(a)*.85,g);leaf.rotation.set(Math.cos(a)*1.05,0,-Math.sin(a)*1.05);}ball(.25,0x715339,.45,3.2,.1,g);}
function rock(x,z,s=1){let r=mesh(new THREE.DodecahedronGeometry(s,0),0x98aaa0,x,.35*s,z);r.scale.y=.6;r.rotation.set(.1,x,.2);}
function house(x,z,rotation=0){let g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;world.add(g);box(3,2.6,2.5,0xf2e5c9,0,1.3,0,g);let roof=mesh(new THREE.ConeGeometry(2.45,1.8,4),0xb56548,0,3.2,0,g);roof.rotation.y=Math.PI/4;box(.8,1.65,.08,0x64745d,0,.82,1.29,g);for(let i of [-.95,.95])box(.6,.65,.09,0x72acb7,i,1.65,1.29,g);box(3.4,.2,2.9,0xbb9a75,0,.08,0,g);}
