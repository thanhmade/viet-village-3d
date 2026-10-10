const fs=require('fs'),path=require('path'),assert=require('assert');
const {context,run,root}=require('./harness.cjs')();
const files=['CHARACTERS/models/player-procedural.three.json','MAP/models/village-procedural.three.json','BUILDINGS/models/house-procedural.three.json','BUILDINGS/models/gate-procedural.three.json','INTERIORS/models/interior-procedural.three.json'];
const stats=[];
for(const file of files){
context.modelJSON=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const result=run(`(()=>{let root=new THREE.ObjectLoader().parse(modelJSON);let meshes=0,vertices=0,instances=0;root.traverse(o=>{if(o.isMesh){meshes++;let p=o.geometry.getAttribute('position');assertFinite(p.array);vertices+=p.count;if(o.isInstancedMesh){assertFinite(o.instanceMatrix.array);instances+=o.count;}}});return {meshes,vertices,instances};function assertFinite(a){for(const n of a)if(!Number.isFinite(n))throw new Error('Non-finite geometry');}})()`);
assert(result.meshes>0);stats.push({file,...result});console.log('PASS',file,JSON.stringify(result));
delete context.modelJSON;
}
fs.writeFileSync(path.join(root,'DOCUMENTS/model-validation.json'),JSON.stringify(stats,null,2)+'\n');
