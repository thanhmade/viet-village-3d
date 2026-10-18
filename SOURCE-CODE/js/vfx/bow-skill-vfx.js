/* BowSkillVFX: đăng ký 3 chiêu riêng với WeaponVFXCore. */
(function(root,factory){
  if(typeof module==='object' && module.exports)
    module.exports=factory(require('./weapon-vfx-core.js'),require('./bow-skill-config.js'),require('./bow-piercing.js'),require('./bow-volley.js'),require('./bow-rain.js'));
  else root.BowSkillVFX=factory(root.WeaponVFXCore,root.BowSkillConfig);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Config){
  'use strict';
  if(!Core||!Config)throw new Error('Nạp weapon-vfx-core.js và bow-skill-config.js trước bow-skill-vfx.js.');
  Core.registerWeapon(Config);
  return Core.createWeaponClass('bow');
});
