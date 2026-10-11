import assert from 'node:assert/strict';
import {WEAPON_DATA} from '../src/models.js';
import {WeaponVFX} from '../src/effects.js';
class Vector {
 constructor(x,y,z){this.x=x;this.y=y;this.z=z;}
 clone(){return new Vector(this.x,this.y,this.z);}
 add(a){this.x+=a.x;this.y+=a.y;this.z+=a.z;return this;}
 lerp(a,t){this.x+=(a.x-this.x)*t;this.y+=(a.y-this.y)*t;this.z+=(a.z-this.z)*t;return this;}
}
assert.equal(WEAPON_DATA.length,5);
for(const data of WEAPON_DATA){
 for(const mode of [0,1,2]){
   let hits=0,visuals=0;
   const work=[];
   const mock=Object.create(WeaponVFX.prototype);
   mock.T={};
   mock.count=n=>n;
   mock.vec=(...p)=>new Vector(...p);
   mock.schedule=(t,fn)=>work.push({t,fn});
   mock.arc=mock.ring=mock.swirl=mock.beam=mock.lightning=mock.column=mock.missile=mock.sparks=mock.sprite=()=>{visuals++;};
   mock.burst=()=>{visuals++};mock.impact=(_p,_c,cb)=>{visuals++;cb?.()};
   mock.attack(data.id,mode,new Vector(-1,1.5,0),new Vector(2,1.5,0),()=>hits++);
   for(let count=0;work.length;count++){
     assert.ok(count<200,'scheduled effects must terminate');
     work.sort((a,b)=>a.t-b.t);work.shift().fn();
   }
   assert.equal(hits,1,`${data.id} mode ${mode}: one damage event`);
   assert.ok(visuals>=1,`${data.id} mode ${mode}: visual effect exists`);
 }
}
console.log('OK: 5 weapon types × 3 attack levels = 15 attack paths, each emits visuals and exactly one hit.');
