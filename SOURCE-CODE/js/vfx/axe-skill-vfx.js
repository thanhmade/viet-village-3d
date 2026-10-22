/* AxeSkillVFX: đăng ký 3 chiêu riêng với WeaponVFXCore. */
(function(root,factory){
  if(typeof module==='object' && module.exports)
    module.exports=factory(require('./weapon-vfx-core.js'),require('./axe-skill-config.js'),require('./axe-techniques.js'));
  else root.AxeSkillVFX=factory(root.WeaponVFXCore,root.AxeSkillConfig,root.AxeTechniques);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config){
  'use strict';
  if(!Core||!Config)throw new Error('Nạp weapon-vfx-core.js và axe-skill-config.js trước axe-skill-vfx.js.');
  Core.registerWeapon(Config);
  return Core.createWeaponClass('axe');
});
