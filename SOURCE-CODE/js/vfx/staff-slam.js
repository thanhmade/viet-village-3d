/* Chấn Địa: one authored leap, gathering in the air, then one ground contact.
 * Seconds/metres. No timer, physics owner, damage authority or renderer. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./staff-skill-config.js'));
  else root.StaffSlam=factory(root.StaffSkillConfig);
})(typeof globalThis!=='undefined'?globalThis:this,function(Config){
  'use strict';
  const skill=()=>Config.skills.find(s=>s.id==='staff.chan-dia');
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(a,b,t)=>{const k=clamp((t-a)/(b-a));return k*k*(3-2*k);};
  const mix=(a,b,k)=>a+(b-a)*k;
  function sample(time,s=skill()){
    const t=Math.max(0,time),p=s.phases,prepare=smooth(0,p.takeoff,t),rise=smooth(p.takeoff,p.apex,t);
    const drop=clamp((t-p.dive)/(s.activeAt-p.dive)),strike=drop*drop;
    const weight=smooth(0,.22,t)*(1-smooth(p.recover,s.duration,t));
    const lift=t<p.takeoff?0:t<p.apex?1.35*rise:t<p.dive?1.35+.035*Math.sin(Math.PI*(t-p.apex)/(p.dive-p.apex)):t<s.activeAt?1.35*(1-strike):0;
    return {phase:t<p.takeoff?'Dồn lực':t<p.apex?'Bật nhảy':t<p.dive?'Tụ khí trên không':t<s.activeAt?'Giáng côn':t<s.activeEnd?'Chấn động':t<s.duration?'Hồi thế':'Kết thúc',
      weight,lift,tuck:.30*rise*(1-smooth(p.dive,s.activeAt,t)),
      crouch:mix(mix(.20*prepare,.03,rise),.42,strike)*weight,
      handX:-.12,handY:mix(mix(mix(1.42,1.20,prepare),2.15,rise),.98,strike),
      handZ:mix(mix(.30,-.08,rise),.36,strike),
      staffPitch:mix(mix(-.25-.25*prepare,.10,rise),Math.PI/2,strike),
      charge:smooth(0,p.dive,t)*(1-smooth(p.dive,s.activeAt,t)),
      impact:t>=s.activeAt};
  }
  return Object.freeze({sample,duration:skill().duration,contact:Object.freeze({x:-.12,z:.36}),leftGripX:-.42});
});
