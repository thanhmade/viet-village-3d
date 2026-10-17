/* Session combat state. No Three.js, timers, particles or rendering dependencies. */
(function(root,factory){
  const create=factory();
  if(typeof module==='object'&&module.exports)module.exports=create;
  if(root)root.createStaffGuard=create;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  return function createStaffGuard(){
    let shield=null;
    function cancel(){shield=null;}
    function start(skill,{maxHp,ownerId=null,handle}={}){
      cancel();
      const ratio=skill?.guard?.maxHpRatio;
      if(skill?.id!=='staff.ho-than'||!Number.isFinite(maxHp)||maxHp<=0||!Number.isFinite(ratio)||ratio<=0||ratio>1
        ||!Number.isFinite(skill.activeAt)||!Number.isFinite(skill.activeEnd)||skill.activeAt<0||skill.activeEnd<=skill.activeAt)return false;
      shield={handle,ownerId,age:0,activeAt:skill.activeAt,activeEnd:skill.activeEnd,capacity:maxHp*ratio,remaining:maxHp*ratio};
      return true;
    }
    function advance(dt){
      if(!shield||!Number.isFinite(dt)||dt<0)return;
      shield.age+=dt;
      if(shield.age+1e-9>=shield.activeEnd)cancel();
    }
    function absorb(amount,ownerId=null){
      const result={damage:amount,absorbed:0,broken:false,handle:null};
      if(!shield||!Number.isFinite(amount)||amount<=0)return result;
      if(shield.ownerId!==ownerId){cancel();return result;}
      if(shield.age+1e-9<shield.activeAt)return result;
      result.handle=shield.handle;result.absorbed=Math.min(amount,shield.remaining);
      result.damage=amount-result.absorbed;shield.remaining-=result.absorbed;
      if(shield.remaining<=0){result.broken=true;cancel();}
      return result;
    }
    return Object.freeze({start,advance,absorb,cancel,get state(){return shield?Object.freeze({...shield,active:shield.age+1e-9>=shield.activeAt}):null;}});
  };
});
