/* SpearSkillVFX: đăng ký 3 chiêu riêng với WeaponVFXCore. */
(function(root,factory){
  if(typeof module==='object' && module.exports)
    module.exports=factory(require('./weapon-vfx-core.js'),require('./spear-skill-config.js'),require('./spear-techniques.js'));
  else root.SpearSkillVFX=factory(root.WeaponVFXCore,root.SpearSkillConfig,root.SpearTechniques);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config,Techniques){
  'use strict';
  if(!Core||!Config||!Techniques)throw new Error('Nạp weapon-vfx-core.js , spear-skill-config.js và spear-techniques.js trước spear-skill-vfx.js.');
  Core.registerWeapon(Config);
  return Core.createWeaponClass('spear');
});
