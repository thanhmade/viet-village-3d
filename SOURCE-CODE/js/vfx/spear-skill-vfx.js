/* SpearSkillVFX: đăng ký 3 chiêu riêng với WeaponVFXCore. */
(function(root,factory){
  if(typeof module==='object' && module.exports)
    module.exports=factory(require('./weapon-vfx-core.js'),require('./spear-skill-config.js'));
  else root.SpearSkillVFX=factory(root.WeaponVFXCore,root.SpearSkillConfig);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config){
  'use strict';
  if(!Core||!Config)throw new Error('Nạp weapon-vfx-core.js và spear-skill-config.js trước spear-skill-vfx.js.');
  Core.registerWeapon(Config);
  return Core.createWeaponClass('spear');
});
