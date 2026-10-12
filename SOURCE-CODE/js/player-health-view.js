(function(global){
 'use strict';
 global.createVillageHealthView=function({THREE:T,scene,player,getState,isVisible,readout,bar,hud}){
  let ring=null,remaining=0,last='';
  function render(){
   const s=getState(),text=s.hp+' / '+s.maxHp;
   if(text!==last){last=text;readout.textContent=text;bar.max=s.maxHp;bar.value=s.hp;}
  }
  function clear(){remaining=0;if(ring)ring.visible=false;hud.classList.remove('health-restored');}
  function healed(){
   render();remaining=1;hud.classList.add('health-restored');
   if(!ring){
    ring=new T.Mesh(new T.RingGeometry(.55,.64,32),new T.MeshBasicMaterial({color:0x74efab,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));
    ring.name='player-healing-effect';ring.rotation.x=-Math.PI/2;scene.add(ring);
   }
   update(0);
  }
  function update(dt){
   render();if(!remaining)return;
   if(!isVisible()){clear();return;}
   remaining=Math.max(0,remaining-Math.min(Math.max(dt,0),.1));
   ring.visible=remaining>0;ring.position.copy(player.position);ring.position.y+=.05;
   ring.scale.setScalar(1+(1-remaining)*1.2);ring.material.opacity=remaining*.65;
   if(!remaining)clear();
  }
  render();
  return Object.freeze({render,healed,update,clear,dispose(){clear();if(ring){ring.removeFromParent();ring.geometry.dispose();ring.material.dispose();ring=null;}}});
 };
})(window);
