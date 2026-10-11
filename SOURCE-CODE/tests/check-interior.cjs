const assert=require('assert');
const {run}=require('./harness.cjs')();
assert.equal(run('!!renderer && !!player && scene.children.length>5'),true);
run("$('play').onclick();tick(100);");
assert.equal(run('interiorRoot.visible'),false);
for(let index=0;index<6;index++){
 run(`enterHouse(${index});tick(last+16);`);
 assert.equal(run('insideHouse'),true);assert.equal(run('selectedHouse'),index);
 assert.equal(run('interiorRoot.visible'),true);assert.equal(run('world.visible || housePreview.visible'),false);
 assert.equal(run('camera.fov'),68);assert.equal(run('active'),false);assert.equal(run('gems.length'),0);
 for(let v=0;v<4;v++){run(`roomView(${v});tick(last+16);`);assert.equal(run('roomCanWalk(insidePosition.x,insidePosition.z)'),true);}
 run('roomView(0);keys={KeyW:true};for(let n=0;n<300;n++)tick(last+40);');
 assert.equal(run('roomCanWalk(insidePosition.x,insidePosition.z)'),true);
 assert(run('insidePosition.z>-1.36'), 'table blocks walking through');
 run('roomView(0);keys={KeyD:true};for(let n=0;n<5;n++)tick(last+40);');assert(run('insidePosition.x>0'), 'right moves right');
 run('keys={};leaveHouse();tick(last+16);');assert.equal(run('insideHouse'),false);assert.equal(run('interiorRoot.visible'),false);assert.equal(run('world.visible'),true);assert.equal(run('camera.fov'),48);
}
run("$('houseBtn').onclick();let savedYaw=yaw,savedRadius=sceneryRadius;enterHouse(4);leaveHouse();");
assert.equal(run('housePreview.visible'),true);assert.equal(run('world.visible'),false);assert.equal(run('yaw===savedYaw && sceneryRadius===savedRadius'),true);
run('enterHouse(2);roomView(0);keys={KeyW:true};');let before=run('insidePosition.z');run("$('referenceBtn').onclick();for(let i=0;i<40;i++)tick(last+40);");assert.equal(run('insidePosition.z'),before);run("$('closeReferences').onclick();$('overviewBtn').onclick();");assert.equal(run('insideHouse'),false);assert.equal(run('world.visible'),true);
assert.equal(run('roomCanWalk(4,0)'),false);assert.equal(run('roomCanWalk(-4,0)'),false);assert.equal(run('roomCanWalk(0,3)'),false);assert.equal(run('roomCanWalk(2.84,1.02)'),false);assert.equal(run('roomCanWalk(-3.10,1.82)'),false);
assert.equal(run(`(()=>{let ok=true;scene.traverse(o=>{if(o.isMesh){for(const n of o.geometry.attributes.position.array)if(!Number.isFinite(n))ok=false;}});return ok;})()`),true);
console.log('PASS: six entries; interior/exterior transitions; four viewpoints; walk bounds/furniture; right direction; gallery pauses movement; restore house preview; legacy quiz remains disabled; finite geometry.');
