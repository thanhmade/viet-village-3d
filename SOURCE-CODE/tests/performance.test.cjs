const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function make(saved=null){
 const context={window:{}};vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/performance.js'),'utf8'),context);
 const renderer={shadowMap:{},info:{render:{calls:123,triangles:456}},setPixelRatio(v){this.ratio=v;}};
 const values=new Map(saved?[['viet-village-render-quality',saved]]:[]),readout={textContent:'',setAttribute(){}};
 const result=context.window.createVillagePerformance({renderer,getSun:()=>null,getSize:()=>({width:1920,height:1080,dpr:2,mobile:false}),readout,
 storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}});
 return {result,renderer,values,readout};
}
function frames(controller,start,count,step){for(let i=0;i<count;i++)controller.sample(start+i*step,true);}
test('auto bounds rendered pixels and reduces sustained slow frames without oscillating',()=>{
 const {result,renderer}=make();assert.equal(result.policy.level,2);
 assert(renderer.ratio**2*1920*1080<=1500001);
 frames(result,0,70,50);assert.equal(result.policy.level,1);assert.equal(result.policy.shadows,false);
 frames(result,3500,100,16.67);assert.equal(result.policy.level,1,'short burst must not re-enable expensive shadows');
 frames(result,6000,2000,16.67);assert.equal(result.policy.level,2,'stable headroom eventually restores balanced detail');
});
test('explicit high/low choices persist and are never overridden by frame samples',()=>{
 const {result,values}=make('low');assert.equal(result.mode,'low');assert.equal(result.policy.houseShadows,0);
 result.setMode('high');frames(result,0,500,60);assert.equal(result.policy.level,3);assert.equal(values.get('viet-village-render-quality'),'high');
 result.setMode('low');frames(result,40000,2000,16.67);assert.equal(result.policy.level,0);
});
test('shadow updates are budgeted rather than regenerating on every render',()=>{
 const {result,renderer}=make();let updates=0;
 for(let ms=0;ms<1000;ms+=1000/60){renderer.shadowMap.needsUpdate=false;result.beforeRender(ms);if(renderer.shadowMap.needsUpdate)updates++;}
 assert(updates<=16 && updates>=12);assert.equal(renderer.shadowMap.autoUpdate,false);
 result.setMode('low');renderer.shadowMap.needsUpdate=false;result.beforeRender(2000);assert.equal(renderer.shadowMap.needsUpdate,false);
});
test('menus/background time is excluded from FPS adaptation',()=>{
 const {result,readout}=make();frames(result,0,61,16.67);const level=result.policy.level;
 result.sample(100000,false);result.sample(200000,true);assert.equal(result.policy.level,level);
 frames(result,200017,61,16.67);assert.match(readout.textContent,/60 FPS/);
});
test('village skips hidden rendering and caps high refresh without creating another loop',()=>{
 const {run}=require('./harness.cjs')();
 run("$('play').onclick();let perfRenders=0;renderer.render=()=>perfRenders++;document.hidden=true;tick(100);tick(116);");
 assert.equal(run('perfRenders'),0);
 run('document.hidden=false;tick(10000);tick(10008);tick(10017);');assert.equal(run('perfRenders'),2);
 assert(run('clockT<.1'),'returning to a tab must not advance movement by the hidden duration');
 run('perfRenders=0;last=0;nextFrameAt=0;for(let i=0;i<150;i++)tick(20000+i*1000/75);');
 assert(run('perfRenders>=118&&perfRenders<=122'),'75 Hz displays should render about 60 FPS, not alternate down to 37.5 FPS');
});
test('a first-use shader pause does not lower quality, while sustained slow frames still do',()=>{
 // Chrome measured 1.7-1.9 s pauses when dawn/dusk lighting first compiled; each lowered the tier.
 const {result}=make();let ms=0;
 for(let pause=0;pause<4;pause++){frames(result,ms,150,16.67);ms+=150*16.67+2100;}
 assert.equal(result.policy.level,2,'isolated pauses are not a slow device');assert.equal(result.policy.shadows,true);
 frames(result,ms,90,50);assert.equal(result.policy.level,1,'sustained 20 FPS still lowers the tier');
});
test('uneven 144 Hz pacing around the 60 FPS limiter still restores detail',()=>{
 const {result}=make();frames(result,0,70,50);assert.equal(result.policy.level,1);
 let ms=4000;for(let i=0;i<3000;i++){result.sample(ms,true);ms+=i%2?20.83:13.89;}
 assert.equal(result.policy.level,2);
});
test('quality waits while village models stream in, with a bounded wait',()=>{
 const {run}=require('./harness.cjs')();
 run("$('play').onclick();window.__samples=[];window.isVillageContentLoading=()=>true;");
 run("window.VillagePerformance={policy:VillagePerformance.policy,beforeRender(){},resetSample(){},sample:(ms,playing)=>window.__samples.push(playing)};");
 run('last=0;nextFrameAt=0;for(let i=0;i<30;i++)tick(1000+i*16.67);');
 assert(run('__samples.length>20&&__samples.slice(8).every(p=>p===false)'),'GLB/NPC streaming frames are not judged');
 run('window.isVillageContentLoading=()=>false;for(let i=30;i<60;i++)tick(1000+i*16.67);');
 assert.equal(run('__samples[__samples.length-1]'),true);
 run('window.isVillageContentLoading=()=>true;for(let i=0;i<30;i++)tick(70000+i*16.67);');
 assert.equal(run('__samples[__samples.length-1]'),true,'a hung download cannot pause adaptation forever');
});
