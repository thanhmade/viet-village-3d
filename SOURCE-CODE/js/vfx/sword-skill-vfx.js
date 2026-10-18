/* SwordSkillVFX: đăng ký 3 chiêu riêng với WeaponVFXCore. */
(function(root,factory){
  if(typeof module==='object' && module.exports)
    module.exports=factory(require('./weapon-vfx-core.js'),require('./sword-skill-config.js'),require('./sword-strike.js'));
  else root.SwordSkillVFX=factory(root.WeaponVFXCore,root.SwordSkillConfig);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config){
  'use strict';
  if(!Core||!Config)throw new Error('Nạp weapon-vfx-core.js và sword-skill-config.js trước sword-skill-vfx.js.');
  Core.registerWeapon(Config);
  return Core.createWeaponClass('sword');
});
