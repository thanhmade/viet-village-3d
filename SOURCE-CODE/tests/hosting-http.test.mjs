import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHostingCheckArgs} from '../../scripts/check-hosting-http.mjs';

test('localhost remains the default and supports the existing explicit port forms',()=>{
  const defaults=parseHostingCheckArgs();
  assert.equal(defaults.origin.href,'http://127.0.0.1:5005/');
  assert.equal(defaults.mode,'local');
  assert.equal(defaults.reportName,'http-check.json');
  for(const url of ['http://localhost:5005/','http://127.0.0.1:8002/','http://[::1]:5005/'])
    assert.equal(parseHostingCheckArgs([url]).origin.href,url);
});

test('Alpha requires an explicit URL for this project and writes a separate report',()=>{
  // An illustrative hostname for parser tests only; no HTTP requests are made.
  const url='https://viet-village-3d--alpha-a1b2c3.web.app';
  for(const input of [url,url+'/']){
    const result=parseHostingCheckArgs(['--alpha-url',input]);
    assert.equal(result.origin.href,url+'/');
    assert.equal(result.mode,'alpha');
    assert.equal(result.reportName,'alpha-http-check.json');
  }
  assert.throws(()=>parseHostingCheckArgs([url]));
});

test('Alpha rejects live, other channels/projects, lookalike hosts and non-HTTPS targets',()=>{
  for(const url of [
    'https://viet-village-3d.web.app/',
    'https://viet-village-3d.firebaseapp.com/',
    'https://viet-village-3d--beta-abc123.web.app/',
    'https://other-project--alpha-abc123.web.app/',
    'https://viet-village-3d--alpha-.web.app/',
    'https://viet-village-3d--alpha-abc123.web.app.example.com/',
    'https://viet-village-3d--alpha-abc123.web.app./',
    'http://viet-village-3d--alpha-abc123.web.app/',
    'file:///index.html','http://localhost:5005/'
  ])assert.throws(()=>parseHostingCheckArgs(['--alpha-url',url]),url);
});

test('Alpha rejects credentials, explicit ports and normalized or hidden URL components',()=>{
  const host='viet-village-3d--alpha-abc123.web.app';
  for(const url of [
    `https://user:password@${host}/`,`https://@${host}/`,
    `https://${host}:443/`,`https://${host}:5005/`,
    `https://${host}/SOURCE-CODE/index.html`,`https://${host}/a/../`,
    `https://${host}/./`,`https://${host}/%2e/`,`https://${host}//`,
    `https://${host}/?x=1`,`https://${host}/?`,
    `https://${host}/#test`,`https://${host}/#`,
    ` https://${host}/`,`https://${host}/\n`,`https://${host}\\`
  ])assert.throws(()=>parseHostingCheckArgs(['--alpha-url',url]),url);
});

test('malformed command arguments cannot silently broaden the audit destination',()=>{
  for(const args of [
    ['--alpha-url'],['--alpha-url',''],['--unknown'],
    ['--alpha-url','https://viet-village-3d--alpha-abc123.web.app/','extra'],
    ['http://localhost:5005/','extra'],['https://example.com/'],
    ['http://localhost.example.com/'],['http://user:password@localhost:5005/'],
    ['http://192.168.1.1/'],[42]
  ])assert.throws(()=>parseHostingCheckArgs(args),JSON.stringify(args));
});

test('importing the validation module does not start an HTTP audit',async()=>{
  const originalFetch=globalThis.fetch;
  let requests=0;
  globalThis.fetch=()=>{requests++;throw new Error('HTTP must not run during import');};
  try{
    await import('../../scripts/check-hosting-http.mjs?import-only-test');
    assert.equal(requests,0);
  }finally{globalThis.fetch=originalFetch;}
});
