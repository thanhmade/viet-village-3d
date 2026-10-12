import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {root,publishPath,validateContent,staticDependencies,collectPackage,verifyPackage,inspectGLB} from '../../scripts/build-public-game.mjs';

test('publication rejects private directories, traversal and delivery archives',()=>{
  for(const p of ['../outside.js','.env','BACKUP/archive.glb','node_modules/a.js','firebase/functions/index.js',
    'DOCUMENTS/report.html','MAP/_ARCHIVE_ZIP/map.zip','private-key.pem','credentials.json','C:/Users/me/a.js',
    'MAP/regions/lang-viet/LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/design.json'])assert.throws(()=>publishPath(p));
  assert.equal(publishPath('ASSETS/reference/staff/weapon-reference.png'),'ASSETS/reference/staff/weapon-reference.png');
});
test('LFS placeholders, private keys and account exports stop publication; public web config is allowed',()=>{
  for(const data of ['version https://git-lfs.github.com/spec/v1\noid sha256:test',
    '-----BEGIN PRIVATE KEY-----','{"type":"service_account"}','{"refresh_token":"example-secret-not-real"}'])
    assert.throws(()=>validateContent('SOURCE-CODE/js/config.js',Buffer.from(data)));
  assert.doesNotThrow(()=>validateContent('SOURCE-CODE/js/firebase-config.js',fs.readFileSync(path.join(root,'SOURCE-CODE/js/firebase-config.js'))));
});
test('dependency resolution preserves relative folders, strips queries, ignores embedded data and remote links',()=>{
  assert.deepEqual(staticDependencies('SOURCE-CODE/index.html','<script src="../ASSETS/vendor/three.min.js?v=1"></script><link href="./css/style.css"><img src="data:image/png;base64,abc"><a href="#item">'),
    ['ASSETS/vendor/three.min.js','SOURCE-CODE/css/style.css']);
  assert.deepEqual(staticDependencies('ASSETS/vendor/gltf-r160/GLTFLoader.js',"import {a} from './three-global.js'; import('./BufferGeometryUtils.js');"),
    ['ASSETS/vendor/gltf-r160/three-global.js','ASSETS/vendor/gltf-r160/BufferGeometryUtils.js']);
});
test('real runtime catalog includes eight GLBs, three regions, atlas and gallery images without source documents',()=>{
  const result=collectPackage(),paths=new Set(result.files.map(f=>f.path));
  assert.equal(result.models.length,8);
  assert.equal(result.models.reduce((n,m)=>n+m.images,0),22);
  for(const region of ['lang-viet','lang-tan-thu','ngoai-lang-dong-tre'])assert(paths.has('MAP/regions/'+region+'/scene.js'));
  assert([...paths].some(p=>p.endsWith('/04_Xem_Ban_Do.html')));
  assert(paths.has('SOURCE-CODE/js/auth-entry.js'));assert(paths.has('SOURCE-CODE/js/player-profile.js'));
  assert(paths.has('ASSETS/reference/axe/skills-reference.png'));
  assert(![...paths].some(p=>/\.zip$|\.pdf$|\.three\.json$|load-order\.json$|README|provenance/.test(p)));
  assert.throws(()=>inspectGLB(Buffer.from('not a real model'),'bad.glb'));
});
test('verification rejects stale or injected output instead of silently overwriting it',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'village-package-test-'));
  try{
    const data=Buffer.from('<html></html>');fs.writeFileSync(path.join(dir,'index.html'),data);
    const manifest={files:[{path:'index.html',sha256:crypto.createHash('sha256').update(data).digest('hex')}]};
    verifyPackage(dir,manifest);
    fs.writeFileSync(path.join(dir,'index.html'),'edited');assert.throws(()=>verifyPackage(dir,manifest),/content differs/);
    fs.writeFileSync(path.join(dir,'index.html'),data);fs.writeFileSync(path.join(dir,'secrets.json'),'{}');
    assert.throws(()=>verifyPackage(dir,manifest),/file list differs/);
  }finally{
    assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));
    assert(path.basename(dir).startsWith('village-package-test-'));
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
test('Hosting is static, project-specific and leaves backend configuration in place',()=>{
  const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.json')));
  assert.equal(config.hosting.public,'public-game');assert.equal(config.hosting.rewrites,undefined);
  assert.equal(config.hosting.site,'viet-village-3d');assert.equal(config.hosting.target,undefined);
  assert.equal(config.emulators.hosting.host,'127.0.0.1');
  assert.equal(config.firestore.rules,'firebase/firestore.rules');assert.equal(config.database.rules,'firebase/database.rules.json');
  assert.equal(config.functions[0].codebase,'village-rooms');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'.firebaserc'))).projects.default,'viet-village-3d');
});
