'use strict';
// Verify the files actually served by the canonical demo, without running a server.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const demoFile = path.join(root, 'SOURCE-CODE/weapons-vfx-demo.html');
const html = fs.readFileSync(demoFile, 'utf8');
const families = ['staff', 'sword', 'spear', 'bow', 'axe'];
const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)];
const scripts = scriptTags.map(match => attribute(match[1], 'src')).filter(Boolean);
function attribute(source, name) {
  return new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(["\'])(.*?)\\1', 'i').exec(source)?.[2];
}
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function assertExactFile(file) {
  const rel = path.relative(root, file);
  assert.ok(rel && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel), 'Asset must stay inside the repository: ' + file);
  let current = root;
  for (const segment of rel.split(path.sep)) {
    assert.ok(fs.readdirSync(current).includes(segment), 'Missing or incorrectly cased path: ' + relative(file));
    current = path.join(current, segment);
  }
  assert.ok(fs.statSync(file).isFile(), 'Expected a file: ' + relative(file));
}
function resolveRuntime(base, ref) {
  assert.ok(!/^(?:[a-z][a-z\d+.-]*:|\/\/|\/|\\)/i.test(ref), 'Runtime resource must be local and relative: ' + ref);
  const target = path.resolve(path.dirname(base), decodeURIComponent(ref.split(/[?#]/)[0]));
  assertExactFile(target);
  const rel = relative(target);
  assert.ok(!/(?:^|\/)(?:BACKUP[^/]*|package-notes|VIET-VILLAGE-3D-WEAPONS-VFX-v2|VFX-DEMO)(?:\/|$)/i.test(rel),
    'Runtime must not depend on the imported package, backup or wrapper: ' + rel);
  return target;
}

test('canonical demo serves all scripts, styles and links locally with exact filename case', () => {
  let styles = 0;
  for (const match of html.matchAll(/<(script|link|img|a)\b([^>]*)>/gi)) {
    const tag = match[1].toLowerCase(), attrs = match[2];
    const ref = attribute(attrs, tag === 'script' || tag === 'img' ? 'src' : 'href');
    if (!ref || ref.startsWith('#')) continue;
    const file = resolveRuntime(demoFile, ref);
    if (tag === 'link' && attribute(attrs, 'rel') === 'stylesheet') {
      styles++;
      const css = fs.readFileSync(file, 'utf8');
      for (const url of css.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/gi)) {
        if (!url[1].startsWith('data:')) resolveRuntime(file, url[1]);
      }
      for (const imported of css.matchAll(/@import\s+["']([^"']+)["']/gi)) resolveRuntime(file, imported[1]);
    }
  }
  assert.ok(styles > 0, 'Demo must load its stylesheet');
  assert.equal(new Set(scripts).size, scripts.length, 'A script must not be loaded twice');
  assert.ok(scripts.length >= 13, 'Three.js, core, five config/registration pairs and demo must load');
});

test('demo uses one shared Three.js and loads each configuration before its VFX registration', () => {
  const resolved = scripts.map(src => relative(resolveRuntime(demoFile, src)));
  const three = resolved.filter(src => /(?:^|\/)three(?:\.min|\.module)?\.js$/i.test(src));
  assert.deepEqual(three, ['ASSETS/vendor/three.min.js']);
  const index = file => {
    const position = resolved.indexOf(file);
    assert.notEqual(position, -1, 'Missing script: ' + file);
    return position;
  };
  const core = index('SOURCE-CODE/js/vfx/weapon-vfx-core.js');
  const demo = index('SOURCE-CODE/js/demo/weapons-vfx-demo.js');
  assert.ok(index('ASSETS/vendor/three.min.js') < core);
  for (const family of families) {
    const config = index(`SOURCE-CODE/js/vfx/${family}-skill-config.js`);
    const registration = index(`SOURCE-CODE/js/vfx/${family}-skill-vfx.js`);
    assert.ok(core < config && config < registration && registration < demo, family + ': core → config → registration → demo');
  }
  for (const [ , attrs ] of scriptTags) {
    assert.ok(!/(?:^|\s)(?:async|defer)(?:\s|=|$)/i.test(attrs), 'Shared classic-script globals require ordered loading');
    assert.notEqual(attribute(attrs, 'type'), 'module', 'UMD game scripts must keep their browser global scope');
  }
});

test('ten canonical reference PNGs preserve the supplied manifest hashes and image dimensions', () => {
  const manifestFile = path.join(root, 'SOURCE-CODE/docs/weapons-vfx/package-notes/MANIFEST-ANH-THAM-CHIEU.json');
  assertExactFile(manifestFile);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.count, 10);
  assert.equal(manifest.entries.length, 10);
  const seen = new Set();
  for (const entry of manifest.entries) {
    assert.ok(families.includes(entry.weaponId));
    assert.ok(['weapon', 'skills'].includes(entry.kind));
    const key = entry.weaponId + '/' + entry.kind;
    assert.ok(!seen.has(key), 'Duplicate reference: ' + key); seen.add(key);
    assert.equal(entry.path, `ASSETS/reference/${entry.weaponId}/${entry.kind}-reference.png`);
    const file = path.join(root, entry.path);
    assertExactFile(file);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', entry.path + ': real PNG signature');
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
    assert.equal(bytes.readUInt32BE(16), entry.width, entry.path + ': width');
    assert.equal(bytes.readUInt32BE(20), entry.height, entry.path + ': height');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.path + ': original bytes');
  }
  assert.equal(seen.size, 10);
});

test('canonical UMD modules retain a CommonJS boundary for the existing Node regression suite', () => {
  const THREE = require('../../ASSETS/vendor/three.min.js');
  const Core = require('../js/vfx/weapon-vfx-core.js');
  assert.equal(typeof THREE.Scene, 'function');
  assert.equal(THREE.REVISION, '160');
  assert.equal(typeof Core, 'function');
  for (const family of families) {
    const Registration = require(`../js/vfx/${family}-skill-vfx.js`);
    assert.equal(typeof Registration, 'function', family + ': module exports');
    assert.equal(Registration.config.weaponId, family);
  }
  assert.equal(Core.getWeaponConfigs().length, 5);
});
