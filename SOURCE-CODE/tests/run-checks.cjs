const {spawnSync}=require('child_process'),path=require('path');
for(const name of ['check-interior.cjs','check-climate.cjs','check-house-lights.cjs','check-moonlight.cjs']){
const r=spawnSync(process.execPath,[path.join(__dirname,name)],{encoding:'utf8'});
process.stdout.write(r.stdout);process.stderr.write(r.stderr);
if(r.status!==0)process.exit(r.status||1);
}
console.log('All logic/geometry checks passed. Renderer is mocked; no GPU/browser check.');
