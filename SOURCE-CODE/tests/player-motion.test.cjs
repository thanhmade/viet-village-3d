'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../../ASSETS/vendor/three.min.js');
function controller(surfaceAt=()=>.3){
 const context={};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../js/player-motion.js'),'utf8'),context);
 const position=new T.Vector3(0,.3,0),body=new T.Group();let map='village';
 const motion=context.createVillagePlayerMotion({position,body,surfaceAt,contextKey:()=>map});
 return {position,body,motion,map(value){map=value;}};
}
function frames(h,seconds,input={},fps=60){for(let i=0;i<Math.round(seconds*fps);i++)h.motion.step(1/fps,input);}
test('smooth acceleration and shortest yaw give matching motion at 30/60/120 Hz',()=>{
 const positions=[];
 for(const fps of [30,60,120]){const h=controller();h.body.rotation.y=Math.PI-.02;
  const first=h.motion.step(1/fps,{x:-.001,z:-1,speed:4.5});assert(first.speed>0&&first.speed<4.5);
  assert(Math.abs(h.body.rotation.y-(Math.PI-.02))<.1,'No full turn at the +/- PI boundary');
  const steady=controller();frames(steady,1,{x:1,z:0,speed:4.5},fps);positions.push(steady.position.clone());
 }
 assert(positions[0].distanceTo(positions[2])<.015);
 const h=controller();frames(h,1,{x:1,z:0,speed:4.5});const old=h.position.x;
 frames(h,.4,{});assert(h.position.x-old<.21,'Stop within a small braking distance');
 h.motion.stop();const p=h.position.clone();frames(h,.2,{});assert(h.position.equals(p));
});
test('moving jump clears a low obstacle, lands, and never permits double jump',()=>{
 const h=controller((x,z)=>x>1&&x<1.5?1.05:.3);
 assert(h.motion.jump());assert.equal(h.motion.jump(),false);let peak=.3;
 for(let i=0;i<90;i++){h.motion.step(1/120,{x:1,speed:4.5});peak=Math.max(peak,h.position.y);}
 assert(h.position.x>2.5);assert(peak>1.4&&peak<1.45);assert.equal(h.motion.airborne,false);assert.equal(h.position.y,.3);assert(h.motion.jump());
});
test('walking cannot cross a low obstacle, jump cannot cross unknown walls/water/edges',()=>{
 for(const top of [1.05,null]){const h=controller(x=>x>=1?top:.3);frames(h,1,{x:1,speed:6.5});assert(h.position.x<1);}
 const h=controller(x=>x>=1?null:.3);assert(h.motion.jump());frames(h,1,{x:1,speed:6.5});assert(h.position.x<1);assert.equal(h.position.y,.3);
});
test('landing on low support and stepping off falls to the floor without penetration',()=>{
 const h=controller(x=>x>1&&x<2?1.05:.3);h.motion.jump();frames(h,.37,{x:1,speed:4.5});h.motion.stop();
 frames(h,.5,{});assert(h.position.x>1&&h.position.x<2);assert.equal(h.position.y,1.05);assert.equal(h.motion.airborne,false);
 frames(h,1,{x:1,speed:4.5});assert(h.position.x>2);assert.equal(h.position.y,.3);
});
test('slow frames are swept, overlays stop horizontal input, map teleport resets airborne state',()=>{
 const h=controller(x=>x>.8&&x<.9?null:.3);h.motion.jump();for(let i=0;i<10;i++)h.motion.step(.1,{x:1,speed:6.5});assert(h.position.x<=.8);
 h.position.set(0,.3,0);h.map('new-map');h.motion.step(.016,{});assert.equal(h.motion.airborne,false);
 h.motion.jump();const before=h.position.x;frames(h,.3,{x:1,speed:6.5,enabled:false});assert.equal(h.position.x,before);frames(h,1,{enabled:false});assert.equal(h.position.y,.3);
});

test('real village low fence can be jumped but walking, pond and house walls remain blocked',()=>{
 const {run,context}=require('./harness.cjs')();context.VietVillageGame.startRoaming();
 assert.equal(run('canWalk(-8.5,15.05)'),false);assert.equal(run('villageMovementSurface(-8.5,15.05)'),1.18);
 assert.equal(run('villageMovementSurface(-11,10)'),null);
 assert.equal(run('villageMovementSurface(15,20)'),null);
 assert.equal(run('villageMovementSurface(26,10)'),null);
 run('player.position.set(-8.5,.3,16.5);playerMotion.reset();yaw=0;keys.KeyW=true;');
 for(let i=0;i<40;i++)run('tick((last||0)+17)');assert(run('player.position.z>15.25'));
 run('player.position.set(-8.5,.3,16.5);playerMotion.reset();keys.KeyW=true;');assert(context.VietVillagePlayerAvatar.jump());
 for(let i=0;i<50;i++)run('tick((last||0)+17)');assert(run('player.position.z<14.8'));run('clearMotion();');for(let i=0;i<20;i++)run('tick((last||0)+17)');assert.equal(run('player.position.y'),.3);
});
test('the house access step is walkable while the lowest jump-only support still needs a jump',()=>{
 const step=controller(x=>x>=1?.56:.3);frames(step,1,{x:1,speed:4.5});
 assert(step.position.x>2,'0.26 m access floor is climbed by walking');assert.equal(step.position.y,.56);assert.equal(step.motion.airborne,false);
 const basket=controller(x=>x>=1&&x<1.5?.83:.3);frames(basket,1,{x:1,speed:4.5});
 assert(basket.position.x<1,'0.53 m basket blocks walking');
 assert(basket.motion.jump());frames(basket,1,{x:1,speed:4.5});assert(basket.position.x>1.5,'the same basket is cleared by a jump');
});
