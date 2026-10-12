const {test}=require('node:test');
const assert=require('node:assert/strict');
const createHarness=require('./harness.cjs');

function night(){
 const harness=createHarness();
 harness.run("$('play').onclick();climate.clock='manual';climate.hour=21;climate.weather='clear';updateClimate(1,true);");
 return harness;
}
function visibleLights(run){return run('(()=>{let n=0;scene.traverseVisible(o=>{if(o.isSpotLight)n++;});return n;})()');}
function visibleShadows(run){return run('(()=>{let n=0;scene.traverseVisible(o=>{if(o.isSpotLight&&o.castShadow)n++;});return n;})()');}

test('quality tiers budget actual visible lights while every house keeps glowing windows',()=>{
 const {run}=night();
 assert.equal(visibleLights(run),6);assert.equal(visibleShadows(run),1);
 assert(run('villageLights.slice(0,6).every(l=>l.root.visible&&l.glowMat.emissiveIntensity>0&&l.panes.length===8)'));
 run("VillagePerformance.setMode('high');updateClimate(1,true);");
 assert.equal(visibleLights(run),18);assert.equal(visibleShadows(run),2);
 run("VillagePerformance.setMode('low');updateClimate(1,true);");
 assert.equal(visibleLights(run),2);assert.equal(visibleShadows(run),0);
 assert(run('villageLights.every(l=>l.windowLamps.every(w=>!w.visible))'));
 assert(run('villageLights.slice(0,6).every(l=>l.glowMat.emissiveIntensity>0)'));
 run('camera.position.set(village.houses[5].x,2,village.houses[5].z);updateClimate(.26);');
 assert(run('villageLights[5].lamp.visible'),'nearest house must regain real light as the camera moves');
 run('climate.hour=12;updateClimate(1,true);');
 assert.equal(visibleLights(run),0);assert(run('!moonLight.visible&&!starAmbient.visible&&!roomLight.visible'));
});

test('preview and indoor light budgets retain interior illumination with shadows disabled',()=>{
 const {run}=night();
 run("$('houseBtn').onclick();VillagePerformance.setMode('high');updateClimate(1,true);");
 assert.equal(visibleLights(run),3);assert(run('villageLights[6].root.visible'));
 run("VillagePerformance.setMode('low');enterHouse(4);updateClimate(1,true);");
 assert.equal(visibleLights(run),0);assert(run('roomLight.visible&&roomLight.intensity>10&&!roomLight.castShadow'));
 assert(run('!rainLines.visible&&!cloudGroup.visible'));
 run('leaveHouse();updateClimate(1,true);');
 assert.equal(visibleLights(run),1);assert(run('!roomLight.visible&&!roomLight.castShadow'));
});

test('rain budgets share cached roof heights and retain fixed X/Z rain paths',()=>{
 const {run}=night();
 run("climate.weather='rain';updateClimate(1,true);");
 assert.equal(run('rainLines.geometry.drawRange.count'),1400);
 assert(run('rainRoofHeights.every((height,i)=>Math.abs(height-exteriorRoofAt(rainLines.geometry.attributes.position.array[i*6],rainLines.geometry.attributes.position.array[i*6+2]))<.000001)'));
 run('let initialRain=rainLines.geometry.attributes.position.array.slice();');
 // A frame must not scan map roofs again; the layout remains fixed after initialization.
 run('exteriorRoofAt=()=>{throw new Error("Unexpected per-drop roof scan")};rainLines.geometry.attributes.position.array[1]=-100;updateClimate(.03);');
 assert.equal(run('rainLines.geometry.attributes.position.array[1]'),23);
 assert(run('initialRain.every((value,i)=>i%6===1||i%6===4||value===rainLines.geometry.attributes.position.array[i])'));
 run("VillagePerformance.setMode('low');updateClimate(.03);");assert.equal(run('rainLines.geometry.drawRange.count'),800);
 run("VillagePerformance.setMode('high');updateClimate(.03);");assert.equal(run('rainLines.geometry.drawRange.count'),2800);
});

test('clouds retain all 64 shapes in one geometry and one renderable object',()=>{
 const {run}=night();
 assert.equal(run('cloudGroup.children.length'),1);
 assert(run('cloudGroup.children[0].isInstancedMesh'));assert.equal(run('cloudGroup.children[0].count'),64);
 assert(run('(()=>{const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();for(let i=0;i<16;i++)for(let j=0;j<4;j++){cloudGroup.children[0].getMatrixAt(i*4+j,matrix);matrix.decompose(position,rotation,scale);if(position.distanceTo(new THREE.Vector3(Math.sin(i*2.4)*48+(j-1.5)*3,25+(i%4)*3+Math.sin(j)*.8,Math.cos(i*2.4)*48+Math.cos(j)*1.5))>.00001||scale.distanceTo(new THREE.Vector3(4,1.3,3))>.00001)return false;}return true;})()'));
});

test('unchanged climate labels avoid DOM writes and reusable color samples reset correctly',()=>{
 const {run}=night();
 run("let climateWrites=0;for(const id of ['climateStatus','clockReadout','seasonReadout']){const node=$(id);let value=node.textContent;Object.defineProperty(node,'textContent',{get:()=>value,set:next=>{value=next;climateWrites++;}});}for(let i=0;i<60;i++)updateClimate(1/60);");
 assert.equal(run('climateWrites'),0);
 run('climate.hour=22;updateClimate(1,true);');assert(run('climateWrites>=2'));
 assert(run('(()=>{const a=lightState(12),b=lightState(12);a.top.setHex(0);return a!==b&&a.top!==b.top&&b.top.getHex()===0x499bd4;})()'));
 assert(run('(()=>{const a=lightState(12);a.top.setHex(0);return lightState(12,a)===a&&a.top.getHex()===0x499bd4;})()'));
});
