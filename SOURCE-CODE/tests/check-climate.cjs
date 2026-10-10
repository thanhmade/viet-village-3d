const assert=require('assert');
const {run}=require('./harness.cjs')();
assert.equal(run('!!renderer && !!player && scene.children.length>5'),true);
assert.equal(run('climateReady'),true);
assert.equal(run("vnTime(new Date('2026-10-10T05:30:00Z')).hour"),12.5);
assert.equal(run('seasonAt(1)'), 'dry');assert.equal(run('seasonAt(8)'), 'rainy');
run("$('play').onclick();climate.clock='manual';climate.weather='clear';climate.hour=12;updateClimate(1,true);");const noon=run('sun.intensity');assert(noon>2.5);
run('climate.hour=8;updateClimate(1,true);');assert(run('sun.position.x>0'));
run('climate.hour=16;updateClimate(1,true);');assert(run('sun.position.x<0'));
run('climate.hour=0;updateClimate(1,true);');assert.equal(run('sun.intensity'),0);assert.equal(run('sun.visible'),false);assert(run('moonLight.intensity>0'));assert(run('starField.material.opacity>0'));
run("climate.weather='rain';for(let i=0;i<150;i++)updateClimate(.04);");assert(run('climate.rain>.98'));assert.equal(run('rainLines.visible'),true);assert(run('climate.wet>0'));assert(run('roofAt(11,0)>4'));
run('enterHouse(0);updateClimate(1,true);');assert.equal(run('rainLines.visible'),false);assert(run('roomLight.intensity>10'));assert.equal(run('sun.shadow.camera.right'),7);
run("climate.hour=12;climate.weather='clear';updateClimate(1,true);");assert(run('roomLight.intensity<1'));
run('leaveHouse();updateClimate(1,true);');assert.equal(run('sun.shadow.camera.right'),35);
run("$('climateQuality').value='low';$('climateQuality').onchange();");assert.equal(run('renderer.shadowMap.enabled'),false);
run("$('climateQuality').value='auto';$('climateQuality').onchange();");assert.equal(run('renderer.shadowMap.enabled'),true);
run("climate.clock='demo';climate.hour=23.99;updateClimate(1);");assert(run('climate.hour<1'));
for(let hour=0;hour<24;hour++){run(`climate.clock='manual';climate.hour=${hour};updateClimate(.04);tick(last+16);`);assert(run('Number.isFinite(sun.position.x)&&Number.isFinite(hemi.intensity)'));}
console.log('PASS: UTC+7 clock; seasons; east/west sun; noon/night intensity; moon/stars; rain fade; wetness; roof shelter; interior rain exclusion and night lamp; shadows quality; 24-hour cycle.');
