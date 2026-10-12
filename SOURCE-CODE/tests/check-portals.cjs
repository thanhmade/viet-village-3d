// Compatibility entry for the old main command; use the current portal tests.
// The previous implementation remains at restore/main-before-cap-nhat-20261012.
const {spawnSync}=require('node:child_process'),path=require('node:path');
const tests=['house-portals.test.cjs','portal-access.test.cjs','house-travel.test.cjs'];
const result=spawnSync(process.execPath,['--test',...tests.map(name=>path.join(__dirname,name))],{stdio:'inherit'});
if(result.error)console.error(result.error);
process.exitCode=result.status ?? 1;
