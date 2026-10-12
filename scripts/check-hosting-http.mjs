// Read-only audit of localhost or this project's explicit Alpha URL; no Firebase writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {root,collectPackage,verifyPackage} from './build-public-game.mjs';

export function parseHostingCheckArgs(args = []) {
  const alpha = args[0] === '--alpha-url';
  if (!Array.isArray(args) || (alpha ? args.length !== 2 : args.length > 1) ||
      args.some(arg => typeof arg !== 'string' || !arg || /[\x00-\x20\x7f]/.test(arg)))
    throw new Error('Usage: node scripts/check-hosting-http.mjs [http://localhost:5005] or --alpha-url <Firebase Alpha URL>');
  const raw = alpha ? args[1] : (args[0] || 'http://127.0.0.1:5005');
  // Match the original input too: URL normalizes explicit :443, /../ and empty ?/#.
  if (alpha && !/^https:\/\/viet-village-3d--alpha-[a-z0-9]+\.web\.app\/?$/i.test(raw))
    throw new Error('Alpha URL must be https://viet-village-3d--alpha-<suffix>.web.app/ without credentials, port, path, query or fragment.');
  const origin = new URL(raw);
  if (!alpha && (origin.protocol !== 'http:' ||
      !['127.0.0.1','localhost','[::1]'].includes(origin.hostname) || origin.username || origin.password))
    throw new Error('Local mode accepts only an HTTP localhost URL; use --alpha-url for this project\'s Firebase Alpha URL.');
  return {origin, mode:alpha ? 'alpha' : 'local', reportName:alpha ? 'alpha-http-check.json' : 'http-check.json'};
}

async function runCheck({origin, mode, reportName}) {
const manifest = collectPackage();
verifyPackage(path.join(root,'public-game'),manifest);
const queue = [...manifest.files], failures = [];
let checked = 0;
await Promise.all(Array.from({length:4},async()=>{
  while(queue.length){
    const file=queue.shift();
    try{
      const response=await fetch(new URL(file.path.split('/').map(encodeURIComponent).join('/'),origin),{signal:AbortSignal.timeout(30000),redirect:'error'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=Buffer.from(await response.arrayBuffer());
      if(crypto.createHash('sha256').update(data).digest('hex')!==file.sha256)throw new Error('Hash differs from packaged source');
      if(/\.(?:js|json)$/.test(file.path)&&/text\/html/i.test(response.headers.get('content-type')||''))throw new Error('HTML returned for code/data');
      checked++;
    }catch(error){failures.push({path:file.path,error:error.message});}
  }
}));
const probes=['.git/config','firebase.json','.firebaserc','package.json','README.md','.env',
  'firebase/database.rules.json','BACKUP/source-history.bundle','SOURCE-CODE/tests/hosting-package.test.mjs',
  'MAP/_ARCHIVE_ZIP/nonexistent.zip','not-a-real-route'];
for(const p of probes){
  try{
    const response=await fetch(new URL(p,origin),{signal:AbortSignal.timeout(10000),redirect:'error'});
    await response.arrayBuffer();
    if(response.status!==404)failures.push({path:p,error:'Expected 404, received '+response.status});
  }catch(error){failures.push({path:p,error:error.message});}
}
const result={testedAt:new Date().toISOString(),mode,origin:origin.origin,checkedFiles:checked,bytes:manifest.bytes,
  notPublishedProbes:probes.length,models:manifest.models,failures};
fs.writeFileSync(path.join(root,'.cache/hosting',reportName),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({mode,origin:origin.origin,checkedFiles:checked,bytes:manifest.bytes,notPublishedProbes:probes.length,failures},null,2));
if(failures.length)process.exitCode=1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await runCheck(parseHostingCheckArgs(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
