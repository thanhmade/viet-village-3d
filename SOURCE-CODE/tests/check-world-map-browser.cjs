const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
const screenshotDir=fs.mkdtempSync(path.join(require('os').tmpdir(),'viet-world-map-'));
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const data=fs.readFileSync(file);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);}catch(e){res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const errors=[];const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/SOURCE-CODE/index.html');
  assert.equal(await page.locator('#fatal').textContent(),'');
  await page.locator('#play').click();await page.locator('#mapBtn').click();
  await page.waitForSelector('#worldMapOverlay[data-ready="true"]');
  assert.equal(await page.locator('.vwm-pin').count(),6);
  assert.equal(await page.locator('#vwmEnter').isDisabled(),true);
  await page.locator('.vwm-choice[data-site="hue"]').click();
  assert.equal(await page.locator('#vwmSelected').textContent(),'Huế');
  await page.locator('#vwmFocus').click();
  assert.equal(await page.locator('#worldMapOverlay').getAttribute('data-zoom'),'5.000');
  await page.locator('#vwmPlus').click();assert.ok(Number(await page.locator('#worldMapOverlay').getAttribute('data-zoom'))>5);
  await page.locator('#vwmFit').click();
  await page.screenshot({path:path.join(screenshotDir,'map-ui-desktop.png')});
  // Coordinate projection: DOM pins coincide with page-coordinate anchors.
  const positions=await page.evaluate(async()=>{
    const config=await (await fetch('../MAP/viet-nam-world-map/map-config.json')).json();
    const data=await (await fetch('../MAP/viet-nam-world-map/diem-vao-map.json')).json();
    const r=document.querySelector('#vwmImage').getBoundingClientRect();
    return data.sites.map(s=>{const p=document.querySelector('.vwm-pin[data-site="'+s.id+'"]').getBoundingClientRect();return Math.hypot(p.x+p.width/2-(r.x+(s.page_xy[0]-config.viewport[0])/(config.viewport[2]-config.viewport[0])*r.width),p.y+p.height/2-(r.y+(s.page_xy[1]-config.viewport[1])/(config.viewport[3]-config.viewport[1])*r.height));});
  });assert.ok(Math.max(...positions)<1);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#worldMapOverlay').isHidden(),true);
  assert.equal(await page.locator('#mapBtn').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('m');await page.waitForSelector('#worldMapOverlay:not([hidden])');
  await page.keyboard.press('m');assert.equal(await page.locator('#worldMapOverlay').isHidden(),true);
  // Modal should not move or exit an existing interior; explicit village action does.
  await page.evaluate(()=>enterHouse(4));
  const before=await page.evaluate(()=>insidePosition.toArray());
  await page.locator('#mapBtn').click();await page.keyboard.press('d');
  assert.deepEqual(await page.evaluate(()=>insidePosition.toArray()),before);
  await page.locator('#vwmClose').click();assert.equal(await page.evaluate(()=>insideHouse),true);
  await page.locator('#mapBtn').click();await page.locator('#vwmVillage').click();
  assert.equal(await page.evaluate(()=>insideHouse),false);
  assert.equal(await page.evaluate(()=>world.visible),true);
  console.log('Desktop / geographic anchors / keyboard / return-to-game: PASS');
  await page.close();
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(base+'/SOURCE-CODE/index.html');await mobile.locator('#play').tap();await mobile.locator('#mapBtn').tap();await mobile.waitForSelector('#worldMapOverlay[data-ready="true"]');
  await mobile.locator('.vwm-choice[data-site="hoi_an"]').tap();
  assert.equal(await mobile.locator('#vwmSelected').textContent(),'Hội An');
  await mobile.screenshot({path:path.join(screenshotDir,'map-ui-mobile.png')});
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Real touch pinch using Chromium's touch input protocol.
  const cdp=await mobile.context().newCDPSession(mobile);
  const box=await mobile.locator('#vwmViewport').boundingBox();const y=box.y+box.height*.45,x=box.x+box.width*.5;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-25,y,id:1},{x:x+25,y,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-70,y,id:1},{x:x+70,y,id:2}]});
  await mobile.waitForFunction(()=>Number(document.querySelector('#worldMapOverlay').dataset.zoom)>1.5,{},{timeout:3000});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(Number(await mobile.locator('#worldMapOverlay').getAttribute('data-zoom'))>1.5);
  await mobile.locator('#vwmFit').tap();await mobile.locator('#vwmClose').tap();
  console.log('Mobile / touch pinch / responsive layout: PASS');
  await mobile.close();
  // Failed request is retryable, and closing/reopening doesn't duplicate controls.
  const retry=await browser.newPage();let block=true;
  await retry.route('**/map-config.json',route=>block?route.abort():route.continue());
  await retry.goto(base+'/SOURCE-CODE/index.html');await retry.locator('#play').click();await retry.locator('#mapBtn').click();await retry.locator('#vwmRetry').waitFor({state:'visible'});
  block=false;await retry.locator('#vwmRetry').click();await retry.waitForSelector('#worldMapOverlay[data-ready="true"]');
  for(let i=0;i<3;i++){await retry.locator('#vwmClose').click();await retry.locator('#mapBtn').click();}
  assert.equal(await retry.locator('.vwm-pin').count(),6);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({desktop:true,mobile390:true,pinch:true,anchorsWithinPixel:Math.max(...positions),returnToInterior:true,returnToVillage:true,retry:true,keyboard:true,pageErrors:errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
