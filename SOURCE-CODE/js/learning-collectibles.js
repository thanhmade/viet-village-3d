(function(global){
 'use strict';
 const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
 global.createLearningCollectibles=function({THREE,region,client,getState,prompt,notify=()=>{},onOpen=()=>{},findPath=null,document:doc=global.document}={}){
  const root=new THREE.Group();root.name='lang-viet-learning-cards';region.root.add(root);
  let card=null,current=null,busy=false,disposed=false,signature='',time=0,error='',lastOwner=null,retryAfter=0,stateElapsed=0,cachedState=null;
  const listeners=[];
  function listen(node,type,fn,options){node?.addEventListener(type,fn,options);listeners.push(()=>node?.removeEventListener?.(type,fn,options));}
  function clear(){if(card){const geometries=new Set(),materials=new Set(),textures=new Set();card.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(material);if(material.map)textures.add(material.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.remove(card);}card=null;current=null;signature='';if(prompt)prompt.hidden=true;}
  function textTexture(text){const canvas=doc.createElement('canvas');canvas.width=768;canvas.height=384;const ctx=canvas.getContext('2d');
   ctx.fillStyle='#fff8dc';ctx.fillRect(0,0,768,384);ctx.strokeStyle='#c69642';ctx.lineWidth=16;ctx.strokeRect(10,10,748,364);
   ctx.fillStyle='#24594a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 52px sans-serif';
   const words=String(text).normalize('NFC').split(/\s+/u),lines=[];let line='';for(const word of words){const candidate=(line?line+' ':'')+word;if(line&&(ctx.measureText?.(candidate)?.width||candidate.length*25)>680){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);
   const shown=lines.slice(0,4);shown.forEach((value,i)=>ctx.fillText(value,384,192+(i-(shown.length-1)/2)*65));
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  function build(run){const point=run.position||run.spawn?.position,pointId=run.pointId||run.spawn?.pointId,itemId=run.itemId||run.spawn?.itemId;
   if(!finite(point)||!pointId||!region.canWalk(point.x,point.z)||Math.abs(region.groundHeight(point.x,point.z)-point.y)>.08){error='Điểm đặt thẻ chưa an toàn trên MAP hiện tại; nhiệm vụ thu thập tạm khóa.';return false;}
   const state=getState();if(findPath&&finite(state.position)&&!findPath(state.position,point).length){error='Chưa tìm được đường tới thẻ; hãy trở lại lối đi rồi mở nhiệm vụ.';return false;}
   const item=client.getItem?.(itemId)||client.catalog?.items?.find(item=>item.id===itemId);if(!item){error='Thiếu dữ liệu thẻ học của nhiệm vụ.';return false;}
   const group=new THREE.Group();group.name='learning-card-'+run.questId;group.position.set(point.x,point.y,point.z);
   const board=new THREE.Mesh(new THREE.BoxGeometry(1.36,.7,.07),new THREE.MeshStandardMaterial({color:0xe1b971,roughness:.8}));board.position.y=1.0;group.add(board);
   const face=new THREE.Mesh(new THREE.PlaneGeometry(1.30,.65),new THREE.MeshBasicMaterial({map:textTexture(item.appearance?.text||item.name),side:THREE.FrontSide}));face.name='learning-card-front';face.position.set(0,1.0,.04);group.add(face);
   // A separate outward-facing back uses the same owned texture without mirrored
   // letters. The solid board otherwise hides the only front plane from behind.
   const back=new THREE.Mesh(face.geometry,face.material);back.name='learning-card-back';back.position.set(0,1.0,-.04);back.rotation.y=Math.PI;group.add(back);
   const ring=new THREE.Mesh(new THREE.RingGeometry(.38,.48,32),new THREE.MeshBasicMaterial({color:0x43af8c,side:THREE.DoubleSide,transparent:true,opacity:.6,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.015;group.add(ring);
   group.userData={questId:run.questId,pointId,itemId,baseY:point.y};root.add(group);card=group;current={questId:run.questId,pointId,position:point,itemId,label:item.name};error='';return true;
  }
  function available(s){return !disposed&&s.authenticated&&s.alive!==false&&s.mapId==='lang-viet'&&!s.transitioning&&!s.insideHouse&&s.canInteract!==false;}
  function nearby(s){return !!current&&finite(s.position)&&Math.hypot(s.position.x-current.position.x,s.position.z-current.position.z)<=1.6&&Math.abs(s.position.y-current.position.y)<.85;}
  async function collect(){const s=getState();if(busy||!available(s)||!nearby(s))return false;busy=true;if(prompt)prompt.disabled=true;
   try{const result=await client.collect(current.questId,current.pointId);notify(result.message||'Đã nhặt thẻ học. Mở nhiệm vụ để làm bài.');onOpen(current?.questId||result.run?.questId);return true;}
   catch(cause){notify(cause.message||'Chưa nhặt được thẻ. Hãy thử lại.');return false;}
   finally{busy=false;if(prompt)prompt.disabled=false;update(0);}
  }
  function update(dt=0){if(disposed)return;const s=getState(),delta=Math.min(Math.max(dt,0),.1);
   if(lastOwner!==s.uid){clear();lastOwner=s.uid;cachedState=null;}
   // Read/copy the account's run list at 10 Hz; only the tiny card animation and
   // proximity use every frame. A zero-dt update immediately refreshes after I/O.
   stateElapsed+=delta;if(!cachedState||stateElapsed>=.1||dt===0){cachedState=client.getState();stateElapsed=0;}const state=cachedState;
   root.visible=!!s.authenticated&&s.mapId==='lang-viet'&&!s.insideHouse;
   const accepted=state.runs.filter(run=>run.status==='accepted'),run=accepted.find(run=>run.questId===state.selection?.questId)||accepted[0];
   const next=run?JSON.stringify([run.questId,run.cycle,run.pointId||run.spawn?.pointId,run.position||run.spawn?.position]):'';
   time+=delta;
   if(next!==signature&&time>=retryAfter){clear();
    // The village root is retained during region travel. Defer a new card until
    // its actual map is active; never pathfind a village target in another map.
    if(run&&root.visible){if(build(run))signature=next;else retryAfter=time+1;}
    else if(!run)signature=next;
   }
   if(card){card.position.y=current.position.y+Math.sin(time*1.8)*.035;if(finite(s.position))card.rotation.y=Math.atan2(s.position.x-current.position.x,s.position.z-current.position.z);}
   if(prompt){prompt.hidden=!available(s)||!nearby(s)||busy;prompt.textContent=current?'Nhặt '+current.label+' (G)':'Nhặt thẻ học';}
  }
  listen(prompt,'click',()=>{void collect();});
  for(const type of ['pointerdown','pointerup','pointermove','touchstart','touchend','wheel','click'])listen(prompt,type,e=>e.stopPropagation());
  listen(global,'keydown',e=>{if(e.code==='KeyG'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)&&!e.target?.isContentEditable&&available(getState())&&nearby(getState())){e.preventDefault();e.stopPropagation();void collect();}});
  if(prompt)prompt.hidden=true;
  return Object.freeze({update,collect,lock(){clear();cachedState=null;root.visible=false;},dispose(){disposed=true;clear();root.removeFromParent();listeners.forEach(remove=>remove());},get status(){return {active:!!current,questId:current?.questId||null,pointId:current?.pointId||null,position:current?.position||null,error,busy};}});
 };
})(typeof window==='undefined'?globalThis:window);
