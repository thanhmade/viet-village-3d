// Offline logic tests with a minimal DOM double. These do not test browser rendering.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=__dirname,html=fs.readFileSync(path.join(root,'04_Xem_Ban_Do.html'),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const data=JSON.parse(html.match(/<script id="mapData" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const checks=[];function check(name,fn){fn();checks.push({name,ok:true})}
check('JavaScript syntax',()=>assert(script));
check('34 province paths and 14 anchored sites',()=>{assert.equal(data.provinces.length,34);assert.equal(data.sites.length,14)});
check('No duplicated DOM IDs',()=>{const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size)});
check('No automatic external resources',()=>{assert(!/<script[^>]+src=|<link[^>]+(?:href=)|<image[^>]+(?:href|xlink:href)="https?:/i.test(html));assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(script))});
class Node {constructor(id){this.id=id;this.attributes={};this.dataset={};this.style={};this.children=[];this.value='';this.hidden=false;this.checked=false;this.textContent='';this.innerHTML='';this.clientWidth=1090;this.clientHeight=916;this.handlers={};this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,v)=>v?this.classes.add(x):this.classes.delete(x)};}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='class')this.classes=new Set(v.split(' '));if(k.startsWith('data-'))this.dataset[k.slice(5)]=String(v);}
 appendChild(n){n.parentNode=this;this.children.push(n);return n;}addEventListener(k,fn){this.handlers[k]=fn;}focus(){}querySelectorAll(sel){const all=[];const walk=n=>{for(const c of n.children){if(sel==='path'||(sel.startsWith('.')&&c.classes.has(sel.slice(1))))all.push(c);walk(c)}};walk(this);return all;}}
const nodes=Object.fromEntries([...html.matchAll(/\sid="([^"]+)"/g)].map(m=>[m[1],new Node(m[1])]));nodes.mapData.textContent=JSON.stringify(data);
const filters=['all','reference','planned'].map(x=>{const n=new Node(x);n.dataset.filter=x;return n});
const document={getElementById:id=>nodes[id],createElementNS:(ns,tag)=>new Node(tag),querySelectorAll:sel=>sel==='[data-filter]'?filters:sel==='[role=tab]'?[nodes.sitesTab,nodes.provincesTab]:[]};
const context={document,window:{},ResizeObserver:class{observe(){}},setTimeout:()=>{},clearTimeout:()=>{},console};vm.createContext(context);vm.runInContext(script,context);
const run=code=>vm.runInContext(code,context),anchors=JSON.stringify(data.sites.map(s=>s.page_xy));
check('Accent-insensitive site search',()=>{nodes.siteSearch.value='hoi an';run('renderLists()');assert.equal(nodes.siteCount.textContent,'1 địa danh');assert(nodes.siteList.innerHTML.includes('Hội An'));nodes.siteSearch.value='';});
check('Planned map filtering',()=>{run("statusFilter='planned';renderLists()");assert.equal(nodes.siteCount.textContent,'4 địa danh');run("statusFilter='all';renderLists()");});
check('Province search',()=>{nodes.provinceSearch.value='ha noi';run('renderLists()');assert.equal(nodes.provinceCount.textContent,'1 tỉnh, thành');nodes.provinceSearch.value='';});
check('Selecting exact province path',()=>{const p=data.provinces.find(p=>p.name==='Hà Nội');run(`selectProvince('${p.id}')`);const selected=nodes.provinceLayer.children.filter(n=>n.classes.has('selected'));assert.equal(selected.length,1);assert.equal(selected[0].attributes.d,p.path);assert(nodes.detail.innerHTML.includes('Hà Nội'));});
check('Site details and local map status',()=>{run("selectSite('hoi_an')");assert(nodes.detail.innerHTML.includes('Hội An'));assert(nodes.detail.innerHTML.includes('Chưa thiết kế riêng'));});
check('Vân Đồn island port description',()=>{run("selectSite('van_don')");assert(nodes.detail.innerHTML.includes('Quảng Ninh · vùng cảng đảo'));});
check('Zoom preserves aspect ratio',()=>{const before=run('view.slice()');run('zoom(.7)');const after=run('view.slice()');assert(after[2]<before[2]);assert(Math.abs(after[2]/after[3]-before[2]/before[3])<1e-9)});
check('Administrative and marker layer toggles',()=>{nodes.adminToggle.handlers.change({target:{checked:true}});assert.equal(nodes.adminArt.style.display,'');assert.equal(nodes.baseArt.style.display,'none');nodes.pointsToggle.handlers.change({target:{checked:false}});assert.equal(nodes.pointLayer.style.display,'none');});
check('Source anchors unchanged after interactions',()=>assert.equal(anchors,run('JSON.stringify(DATA.sites.map(s=>s.page_xy))')));
check('Two fictional hubs remain without geographic coordinates',()=>{assert.equal(data.local_hubs.length,2);assert(data.local_hubs.every(h=>h.geographic_anchor===null));assert(nodes.hubList.innerHTML.includes('1–10'));});
const result={checks,browser_render_check:'Not completed: installed Chromium launch blocked by environment (EPERM socket / process_singleton). No browser screenshots produced.',test_scope:'Actual embedded script executed against a minimal DOM double; geometry, counts, search, filters, selection and layer behavior tested. Browser event routing, touch gestures and visual layout require browser verification.'};
fs.writeFileSync(path.join(root,'viewer-validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
