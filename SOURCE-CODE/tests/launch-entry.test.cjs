const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
test('file entry explains START-GAME and never redirects to another file URL',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 for(const protocol of ['file:','http:','https:']){
  const nodes={httpEntry:{hidden:true},launchMessage:{textContent:''}},redirect=[];
  vm.runInNewContext(script,{location:{protocol,search:'?test=1',hash:'#entry',replace:url=>redirect.push(url)},document:{getElementById:id=>nodes[id]}});
  assert.deepEqual(redirect,protocol==='file:'?[]:['SOURCE-CODE/index.html?test=1#entry']);
  assert.equal(nodes.httpEntry.hidden,protocol==='file:');
 }
 assert.doesNotMatch(html,/http-equiv=["']refresh/i);
});
test('classic file warning works without Firebase modules and does not unlock HTTP auth',()=>{
 const script=fs.readFileSync(path.join(root,'SOURCE-CODE/js/launch-check.js'),'utf8');
 for(const protocol of ['file:','http:','https:']){
  const nodes={launchContext:{},authGate:{setAttribute:(name,value)=>nodes.authGate[name]=value},googleLoginBtn:{disabled:true},authStatus:{textContent:'original'}};
  vm.runInNewContext(script,{location:{protocol,host:'localhost:8123'},document:{getElementById:id=>nodes[id]}});
  assert.equal(nodes.googleLoginBtn.disabled,true);
  if(protocol==='file:'){assert.match(nodes.authStatus.textContent,/START-GAME.bat/);assert.equal(nodes.authGate['aria-busy'],'false');}
  else {assert.equal(nodes.authStatus.textContent,'original');assert.match(nodes.launchContext.textContent,/CAP-NHAT · localhost:8123/);}
 }
});
test('global game scripts keep their dependency order; auth entry stays a module',()=>{
 const html=fs.readFileSync(path.join(root,'SOURCE-CODE/index.html'),'utf8');
 const tags=[...html.matchAll(/<script\b([^>]*)>/g)];
 const paths=tags.map(m=>(m[1].match(/\bsrc="([^"]+)"/)||[])[1]).filter(Boolean).map(p=>path.posix.normalize('SOURCE-CODE/'+p.split('?')[0]));
 const order=JSON.parse(fs.readFileSync(path.join(root,'SOURCE-CODE/load-order.json'),'utf8'));
 assert.deepEqual(paths.slice(0,order.length),order);
 assert.match(html,/<script type="module" src="\.\/js\/auth-entry.js"><\/script>/);
 assert.ok(paths.indexOf('SOURCE-CODE/js/launch-check.js')<paths.indexOf('SOURCE-CODE/js/auth-entry.js'));
});
