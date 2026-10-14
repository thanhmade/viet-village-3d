'use strict';
// Offline source geometry. Uses the same pinned Three.js engine as the game.
const T=require('../../ASSETS/vendor/three.min.js');
const P={wood:0x825331,dark:0x50351f,lightWood:0xb68850,bamboo:0xb59b56,green:0x53873a,leaf:0x6b9c41,leafLight:0x88ad51,stone:0xa8a28c,stoneDark:0x797e70,clay:0xa36a40,roof:0xaf5e39,roofLight:0xc57b49,wall:0xdec8a1,earth:0x9a784f,water:0x4faaa1,cream:0xead9b8,metal:0x514b40};
const mats=new Map();
function material(color){if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:color===P.water?.32:.88,metalness:0}));return mats.get(color);}
function group(name,parent,x=0,y=0,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent?.add(g);return g;}
function mesh(parent,name,geo,color,x=0,y=0,z=0){const m=new T.Mesh(geo,material(color));m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,n,w,h,d,c,x=0,y=0,z=0){return mesh(p,n,new T.BoxGeometry(w,h,d),c,x,y,z);}
function cylinder(p,n,rt,rb,h,c,x=0,y=0,z=0,segments=12){return mesh(p,n,new T.CylinderGeometry(rt,rb,h,segments),c,x,y,z);}
function sphere(p,n,r,c,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=mesh(p,n,new T.IcosahedronGeometry(r,1),c,x,y,z);m.scale.set(sx,sy,sz);return m;}
function beam(p,n,a,b,r,c){const va=new T.Vector3(...a),vb=new T.Vector3(...b),v=vb.clone().sub(va),mid=va.clone().add(vb).multiplyScalar(.5);const m=cylinder(p,n,r*.85,r,v.length(),c,...mid.toArray(),7);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
function torus(p,n,r,t,c,x=0,y=0,z=0,rx=Math.PI/2){const m=mesh(p,n,new T.TorusGeometry(r,t,6,24),c,x,y,z);m.rotation.x=rx;return m;}
function lathe(p,n,points,c){return mesh(p,n,new T.LatheGeometry(points.map(a=>new T.Vector2(...a)),20),c);}
function curved(p,n,pts,r,c){return mesh(p,n,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(a=>new T.Vector3(...a))),Math.max(8,pts.length*4),r,6,false),c);}
// Merge static triangles by material inside each motion pivot, preserving hinges
// and rooted canopy groups. This avoids one draw call per plank/leaf in the game.
function compact(root){
 const pivots=[];root.traverse(o=>{if(o!==root&&o.userData.motion)pivots.push(o);});
 for(const scope of [...pivots.reverse(),root]){
  root.updateMatrixWorld(true);const inverse=scope.matrixWorld.clone().invert(),bins=new Map(),original=[];
  function visit(o){for(const child of [...o.children]){if(child!==scope&&child.userData.motion)continue;if(child.isMesh){
   if(Array.isArray(child.material))throw Error('Multi material not supported by generator');
   const key=child.material.uuid;if(!bins.has(key))bins.set(key,{material:child.material,geometries:[],names:[]});
   const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(inverse.clone().multiply(child.matrixWorld));
   if(!g.attributes.normal)g.computeVertexNormals();bins.get(key).geometries.push(g);bins.get(key).names.push(child.name);original.push(child);
  }else visit(child);}}
  visit(scope);original.forEach(m=>m.removeFromParent());
  for(const bin of bins.values()){
   const count=bin.geometries.reduce((s,g)=>s+g.attributes.position.count,0),geo=new T.BufferGeometry();
   for(const name of ['position','normal']){const data=new Float32Array(count*3);let offset=0;for(const g of bin.geometries){data.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}geo.setAttribute(name,new T.BufferAttribute(data,3));}
   geo.computeBoundingBox();geo.computeBoundingSphere();bin.geometries.forEach(g=>g.dispose());
   const m=new T.Mesh(geo,bin.material);m.name=scope.name+'-surface-'+bin.material.color.getHexString();m.userData.sourceParts=bin.names;m.castShadow=true;m.receiveShadow=true;scope.add(m);
  }
 }
 return root;
}
module.exports={T,P,group,mesh,box,cylinder,sphere,beam,torus,lathe,curved,compact};
