/* StaffSkillVFX: đăng ký 3 chiêu riêng với WeaponVFXCore. */
(function(root,factory){
  if(typeof module==='object' && module.exports)
    module.exports=factory(require('./weapon-vfx-core.js'),require('./staff-skill-config.js'));
  else root.StaffSkillVFX=factory(root.WeaponVFXCore,root.StaffSkillConfig);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config){
  'use strict';
  if(!Core||!Config)throw new Error('Nạp weapon-vfx-core.js và staff-skill-config.js trước staff-skill-vfx.js.');
  Core.registerWeapon(Config);
  return Core.createWeaponClass('staff');
});
