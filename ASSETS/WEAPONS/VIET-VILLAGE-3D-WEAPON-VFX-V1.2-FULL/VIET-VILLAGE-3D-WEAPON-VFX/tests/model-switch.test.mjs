/** Regression test: switching any of the five weapon models must not leave
 * non-material values in a Mesh, and disposal must not throw. No CDN needed. */
import assert from 'node:assert/strict';
import {WEAPON_DATA,createWeapon} from '../src/models.js';
class Obj {
  constructor(){this.children=[];this.position={set(){}};this.rotation={};}
  add(x){this.children.push(x);}
  traverse(f){f(this);for(const ch of this.children)ch.traverse(f);}
}
class Mesh extends Obj {constructor(g,m){super();this.geometry=g;this.material=m;}}
class Group extends Obj {}
class Line extends Mesh {}
class Geometry {translate(){return this;}setFromPoints(){return this;}dispose(){this.disposals=(this.disposals||0)+1;}}
class Material {constructor(options={}){Object.assign(this,options);}dispose(){this.disposals=(this.disposals||0)+1;}}
class Shape {moveTo(){} lineTo(){} closePath(){}}
class Vector3 {constructor(x,y,z){this.x=x;this.y=y;this.z=z;}}
const THREE={Group,Mesh,Line,Shape,Vector3,MeshStandardMaterial:Material,LineBasicMaterial:Material,DoubleSide:2};
for(const n of ['CylinderGeometry','SphereGeometry','TubeGeometry','ExtrudeGeometry','BoxGeometry','TorusGeometry','BufferGeometry']) THREE[n]=Geometry;
THREE.CatmullRomCurve3=class {constructor(points){this.points=points;}};
let total=0;
for(const old of WEAPON_DATA){
  for(const current of WEAPON_DATA){
    const prev=createWeapon(THREE,old.id);
    const next=createWeapon(THREE,current.id);
    assert.ok(next.children.length,`${current.id}: model must have geometry`);
    for(const model of [prev,next]){
      const geometries=new Set(),materials=new Set();
      model.traverse(o=>{
        if(o.geometry)geometries.add(o.geometry);
        if(o.material){
          for(const mat of (Array.isArray(o.material)?o.material:[o.material])){
            assert.equal(typeof mat.dispose,'function',`${model.name}: mesh contains an invalid material (${String(mat)})`);
            materials.add(mat);
          }
        }
      });
      for(const geo of geometries)geo.dispose();
      for(const mat of materials)mat.dispose();
      assert.ok([...materials].every(m=>m.disposals===1),'shared materials disposed only once');
      assert.ok([...geometries].every(g=>g.disposals===1),'geometry disposed only once');
    }
    total++;
  }
}
console.log(`OK: ${WEAPON_DATA.length} mô hình; ${total} cặp đổi vũ khí; không có vật liệu sai kiểu và có thể giải phóng.`);
