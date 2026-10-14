// Copy reviewed runtime dependencies, without bundling or changing global script order.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public-game');
const reportPath = path.join(root, '.cache/hosting/package-manifest.json');
const stamp = 'viet-village-public-game-v1';
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = message => { throw new Error(message); };

export function publishPath(relative) {
  if (typeof relative !== 'string' || relative.includes('\\') || path.posix.isAbsolute(relative) ||
      relative.split('/').some(p => !p || p === '..' || p.startsWith('.')) || /[:\x00-\x1f]/.test(relative))
    fail('Unsafe publication path: ' + relative);
  const sharedExperience = /^firebase\/functions\/shared\/experience-(config|core)\.js$/.test(relative);
  if (!sharedExperience && (/(^|\/)(BACKUP|node_modules|DOCUMENTS|docs|tests|scripts|firebase|_IMPORT_ZIP|_ARCHIVE_ZIP|LANG_VIET_NPC_PORTAL_DE_XUAT)(\/|$)/i.test(relative) ||
      /(?:teacher|answer[-_]?key|service[-_]?account|credentials|secrets|player[-_]?data|players-export)/i.test(relative) ||
      !/\.(?:html|js|css|json|glb|gltf|bin|png|jpe?g|webp|svg|gif|mp3|ogg|wav|woff2?|txt)$/i.test(relative)))
    fail('File outside the runtime publication policy: ' + relative);
  return relative;
}

function safeFile(base, relative) {
  const file = path.join(base, publishPath(relative));
  let cursor = base;
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part);
    if (fs.lstatSync(cursor).isSymbolicLink()) fail('Symlinks are not published: ' + relative);
    // Exact case matters on Hosting even if Windows resolves a different case.
    if (!fs.readdirSync(path.dirname(cursor)).includes(part)) fail('Path case mismatch: ' + relative);
  }
  if (!fs.statSync(file).isFile()) fail('Not a file: ' + relative);
  return file;
}

export function validateContent(relative, data) {
  if (data.subarray(0,160).toString().startsWith('version https://git-lfs.github.com/spec/v1'))
    fail('Git LFS pointer instead of real asset: ' + relative + '. Fetch LFS objects before building.');
  if (/\.(?:html|js|css|json|svg|txt)$/i.test(relative)) {
    const text = data.toString('utf8');
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"type"\s*:\s*"service_account"|"private_key"\s*:|\b(?:ghp_|github_pat_|ya29\.|1\/\/)[A-Za-z0-9_.-]{18,}|\bAKIA[A-Z0-9]{16}\b/.test(text) ||
        /(?:password|client_secret|refresh_token)["']?\s*[=:]\s*["'][^"']{8,}["']/i.test(text))
      fail('Possible server secret in ' + relative + '; review locally before publishing.');
    if (/(?:file:\/\/\/|[A-Z]:[\\/])(?:CHAT GPT|Users|WINDOWS)/i.test(text))
      fail('Machine-specific path in runtime file: ' + relative);
  }
}

function dependency(base, reference) {
  if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference) || reference.includes('${')) return null;
  const url = new URL(reference.replaceAll('&amp;', '&'), 'https://package.invalid/' + base);
  if (url.origin !== 'https://package.invalid') return null;
  return publishPath(decodeURIComponent(url.pathname.slice(1)));
}

// Static browser links, CSS URLs, and ES module imports. Dynamic game resources
// are deliberately registered separately below, rather than copying entire folders.
export function staticDependencies(relative, source) {
  const refs = [];
  if (relative.endsWith('.html')) {
    const markup = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, match => match.slice(0, match.indexOf('>') + 1));
    for (const match of markup.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.push(match[1]);
  }
  if (relative.endsWith('.js')) {
    for (const match of source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["'](\.{1,2}\/[^"']+)["']/g)) refs.push(match[1]);
  }
  if (/\.(css|html)$/.test(relative)) {
    for (const match of source.matchAll(/url\(\s*["']?([^\s)'"<>]+)["']?\s*\)/gi)) refs.push(match[1]);
  }
  return [...new Set(refs.map(ref => dependency(relative, ref)).filter(Boolean))];
}

export function inspectGLB(data, label) {
  if (data.length < 20 || data.toString('ascii',0,4) !== 'glTF' || data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length)
    fail('Invalid/incomplete GLB: ' + label);
  const length = data.readUInt32LE(12);
  if (data.readUInt32LE(16) !== 0x4e4f534a || length + 20 > data.length) fail('Invalid GLB JSON: ' + label);
  return JSON.parse(data.toString('utf8',20,20 + length));
}

export function collectPackage(base = root) {
  const config = readJSON(path.join(base, 'scripts/public-game.config.json'));
  const files = new Map(), models = [];
  const add = (relative, reason) => {
    publishPath(relative);
    if (files.has(relative)) return;
    const data = fs.readFileSync(safeFile(base, relative));
    validateContent(relative, data);
    files.set(relative, {path:relative, bytes:data.length, sha256:hash(data), reason});
    if (/\.(html|js|css)$/.test(relative))
      for (const dep of staticDependencies(relative, data.toString('utf8'))) add(dep, 'Dependency of ' + relative);
    if (/\.glb$/.test(relative)) {
      const gltf = inspectGLB(data, relative);
      for (const resource of [...(gltf.buffers || []), ...(gltf.images || [])]) {
        if (resource.uri && !resource.uri.startsWith('data:')) {
          const dep = dependency(relative, resource.uri);
          if (!dep) fail('External GLB resource must be reviewed: ' + relative);
          add(dep, 'GLB resource: ' + relative);
        }
      }
      models.push({path:relative, animations:(gltf.animations || []).map(a => a.name), images:(gltf.images || []).length});
    }
  };
  for (const p of [...config.entrypoints, ...config.runtimeData, ...config.dynamicModules, ...config.licenses]) add(p, 'Runtime manifest');
  const catalog = readJSON(path.join(base, config.npcCatalog));
  for (const npc of catalog.npcs) {
    const p = dependency('SOURCE-CODE/index.html', npc.model.url);
    if (!p) fail('NPC model must be local: ' + npc.id);
    add(p, 'NPC ' + npc.id);
    const model = models.find(m => m.path === p);
    for (const clip of [npc.model.clip, ...(npc.model.oneShots || [])])
      if (!model?.animations.includes(clip)) fail('Missing NPC clip ' + clip + ': ' + p);
  }
  if (config.mapAssetCatalog) {
    add(config.mapAssetCatalog, 'Reviewed map asset catalog');
    const catalog=readJSON(path.join(base,config.mapAssetCatalog));
    for (const asset of catalog.assets) {
      if(asset.status==='built') {
        if(!asset.url)fail('Built asset missing GLB: '+asset.id);
        add(dependency('SOURCE-CODE/index.html',asset.url),'3D map asset: '+asset.id);
        if(asset.lod1Url)add(dependency('SOURCE-CODE/index.html',asset.lod1Url),'Alternative LOD1: '+asset.id);
      }
      for(const ref of Object.values(asset.references||{}))add(dependency('SOURCE-CODE/index.html',ref),'Asset viewer comparison: '+asset.id);
    }
  }
  const atlasSource = fs.readFileSync(path.join(base, config.atlasCatalog), 'utf8');
  const atlasURL = atlasSource.match(/viewerPath:\s*['"]([^'"]+)['"]/)?.[1];
  if (!atlasURL) fail('Atlas viewerPath not found. Review the publication manifest.');
  add(dependency('SOURCE-CODE/index.html', atlasURL), 'Atlas viewer with embedded artwork/data');
  for (const region of config.regionGalleries) {
    const scene = 'MAP/regions/' + region + '/scene.js';
    const source = fs.readFileSync(path.join(base, scene), 'utf8');
    const images = [...source.matchAll(/['"]([^'"\r\n]+\.(?:png|jpe?g|webp))['"]/g)].map(m => m[1]);
    if (!images.length) fail('No gallery references found: ' + scene);
    for (const ref of images) add(ref.startsWith('../') ? dependency('SOURCE-CODE/index.html', ref) : 'MAP/regions/' + region + '/references/' + ref, 'In-game region gallery');
  }
  for (const weapon of config.weaponGallery)
    for (const image of ['weapon-reference.png','skills-reference.png']) add('ASSETS/reference/' + weapon + '/' + image, 'Weapon demo gallery');
  const ordered = readJSON(path.join(base, 'SOURCE-CODE/load-order.json'));
  const html = fs.readFileSync(path.join(base,'SOURCE-CODE/index.html'),'utf8');
  const actual = [...html.matchAll(/<script\b[^>]*\bsrc=['"]([^'"]+)/g)].map(m => dependency('SOURCE-CODE/index.html', m[1]));
  if (JSON.stringify(actual.slice(0,ordered.length)) !== JSON.stringify(ordered)) fail('Global script order differs from load-order.json.');
  for (const p of ordered) if (!files.has(p)) fail('Missing global script: ' + p);
  const sorted = [...files.values()].sort((a,b) => a.path.localeCompare(b.path,'en'));
  return {format:stamp, files:sorted, fileCount:sorted.length, bytes:sorted.reduce((n,f) => n + f.bytes,0), models};
}

function walk(base, prefix = '') {
  return fs.readdirSync(path.join(base,prefix),{withFileTypes:true}).flatMap(item => {
    const p = prefix + item.name;
    if (item.isSymbolicLink()) fail('Unexpected symlink in output: ' + p);
    return item.isDirectory() ? walk(base,p + '/') : [p];
  }).sort();
}

export function verifyPackage(base, manifest) {
  const actual = walk(base), expected = manifest.files.map(f => f.path).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('Output file list differs from the reviewed manifest.');
  for (const file of manifest.files)
    if (hash(fs.readFileSync(safeFile(base,file.path))) !== file.sha256) fail('Output content differs: ' + file.path);
}

export function buildPackage({check = false} = {}) {
  if (path.resolve(process.cwd()) !== root) fail('Run this script from the CAP-NHAT project root.');
  const manifest = collectPackage();
  if (check) {
    verifyPackage(output, manifest);
    console.log('Verified current source against public-game: ' + manifest.fileCount + ' files, ' + manifest.bytes + ' bytes.');
    return manifest;
  }
  // Never overwrite an unknown directory or user-edited generated output.
  if (fs.existsSync(output)) {
    if (fs.lstatSync(output).isSymbolicLink() || !fs.existsSync(reportPath)) fail('public-game already exists without a trusted manifest; preserve it and review manually.');
    const previous = readJSON(reportPath);
    if (previous.format !== stamp) fail('Unknown public-game manifest.');
    verifyPackage(output, previous);
  }
  const cache = path.dirname(reportPath);
  fs.mkdirSync(cache,{recursive:true});
  if (fs.realpathSync(cache) !== path.join(fs.realpathSync(root),'.cache','hosting')) fail('Build cache is redirected outside the project.');
  const stage = fs.mkdtempSync(path.join(cache,'stage-'));
  for (const file of manifest.files) {
    const target = path.join(stage,file.path);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(safeFile(root,file.path),target,fs.constants.COPYFILE_EXCL);
  }
  verifyPackage(stage,manifest);
  // Recheck source after copying, in case another edit happened during the build.
  for (const file of manifest.files) if (hash(fs.readFileSync(safeFile(root,file.path))) !== file.sha256) fail('Source changed during build: ' + file.path);
  const previousOutput = fs.existsSync(output) ? path.join(cache,'previous-' + crypto.randomUUID()) : null;
  if (previousOutput) fs.renameSync(output,previousOutput);
  try { fs.renameSync(stage,output); }
  catch (error) { if (previousOutput) fs.renameSync(previousOutput,output); throw error; }
  fs.writeFileSync(reportPath,JSON.stringify({...manifest,builtAt:new Date().toISOString(),previousOutput:previousOutput && path.relative(root,previousOutput)},null,2) + '\n');
  console.log('Prepared public-game: ' + manifest.fileCount + ' files, ' + manifest.bytes + ' bytes (' + (manifest.bytes/1048576).toFixed(2) + ' MiB).');
  console.log('8-NPC/catalog check: ' + manifest.models.length + ' real GLB files. No deploy was run.');
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check')) fail('Supported option: --check.');
    buildPackage({check:process.argv.includes('--check')});
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
