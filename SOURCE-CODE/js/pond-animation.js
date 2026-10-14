/* Adapted from the supplied LV_AO_SEN_01_3D/source/pond-animation.js.
 * Uses the game's existing THREE namespace and the imported GLB's named clips. */
(function(global){
 'use strict';
 global.createPondAnimator=function(THREE,root,clips){
  const mixer=new THREE.AnimationMixer(root),rest=new Map();
  root.traverse(node=>rest.set(node,{position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),morph:node.morphTargetInfluences?.slice()}));
  const find=name=>{const clip=THREE.AnimationClip.findByName(clips,name);return clip?mixer.clipAction(clip):null;};
  const light=find('WIND_LIGHT'),strong=find('WIND_STRONG'),water=find('WATER_RIPPLE');
  let activeWind=null,windLevel='none',waterEnabled=false,disposed=false;
  function restorePlants(){rest.forEach((state,node)=>{node.position.copy(state.position);node.quaternion.copy(state.quaternion);node.scale.copy(state.scale);});root.updateMatrixWorld(true);}
  function restoreWater(){rest.forEach((state,node)=>{if(state.morph)node.morphTargetInfluences.splice(0,state.morph.length,...state.morph);});}
  return {
   mixer,
   setWind(level='none'){
    if(!['none','light','strong'].includes(level))throw new Error('Wind must be none, light, or strong');
    if(disposed||level===windLevel)return;
    const next=level==='light'?light:level==='strong'?strong:null;
    if(level!=='none'&&!next)throw new Error('Thiếu hoạt ảnh ao sen: '+(level==='light'?'WIND_LIGHT':'WIND_STRONG'));
    activeWind?.stop();activeWind=null;restorePlants();windLevel=level;
    if(next){next.reset().setLoop(THREE.LoopRepeat,Infinity).play();activeWind=next;}
   },
   setWater(enabled=true){
    enabled=!!enabled;if(disposed||!water)return false;
    if(enabled===waterEnabled)return true;waterEnabled=enabled;
    if(enabled)water.reset().setLoop(THREE.LoopRepeat,Infinity).play();else{water.stop();restoreWater();}return true;
   },
   update(deltaSeconds){if(!disposed&&Number.isFinite(deltaSeconds))mixer.update(Math.max(0,Math.min(deltaSeconds,.1)));},
   dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();restorePlants();restoreWater();mixer.uncacheRoot(root);},
   get state(){return {wind:windLevel,water:waterEnabled,disposed};}
  };
 };
 global.VietVillagePondAnimation=Object.freeze({createPondAnimator:global.createPondAnimator});
})(typeof window==='undefined'?globalThis:window);
