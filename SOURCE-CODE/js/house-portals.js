(function(global){
  'use strict';
  const DWELL_SECONDS=.8, ARC_SEGMENTS=96;
  // One controller uses the game's render loop. Callbacks commit a prepared map atomically;
  // async callbacks must check context.isCurrent() immediately before changing the map.
  function createHousePortals(options){
    const {THREE,world,interiorRoot,entries,getState,onEnter,onExit}=options;
    const toast=options.toast||(()=>{}), isReady=options.isReady||(()=>true);
    if(!THREE||!world||!interiorRoot||!Array.isArray(entries)||typeof getState!=='function'||typeof onEnter!=='function'||typeof onExit!=='function')throw new Error('Thiếu cấu hình vòng dịch chuyển.');
    const ids=new Set();
    for(const entry of entries){
      if(!entry.id||!entry.interiorId||ids.has(entry.id))throw new Error('Mã nhà dịch chuyển không hợp lệ.');
      ids.add(entry.id);
      for(const key of ['entry','interiorExit']){
        const point=entry[key];
        if(!point||!['x','y','z','radius'].every(k=>Number.isFinite(point[k]))||point.radius<=0)throw new Error('Tọa độ vòng dịch chuyển không hợp lệ: '+entry.id);
      }
    }
    const geometries=new Set(),materials=new Set(),textures=new Set(), visuals=[];
    const geometry=value=>(geometries.add(value),value);
    const material=value=>(materials.add(value),value);
    const basic=(color,opacity=1)=>material(new THREE.MeshBasicMaterial({color,opacity,transparent:opacity<1,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
    const cyan=basic(0x32ffe1), glow=basic(0x14edbd,.16), gold=basic(0xffeab0), segmentsMaterial=basic(0x21eeca,.55), discMaterial=basic(0x19dfa9,.06),progressMaterial=basic(0xffee83);
    const rimGeometry=geometry(new THREE.TorusGeometry(1.19,.035,6,64));
    const glowGeometry=geometry(new THREE.TorusGeometry(1.19,.105,6,64));
    const innerGeometry=geometry(new THREE.TorusGeometry(.95,.018,4,64));
    const discGeometry=geometry(new THREE.CircleGeometry(1.29,48));
    // Batch the twelve decorative segments in one draw call, shared by every ring.
    const sectorVertices=[];
    for(let sector=0;sector<12;sector++)for(let step=0;step<5;step++){
      const a=sector*Math.PI/6+.025+step*(Math.PI/6-.06)/5,b=a+(Math.PI/6-.06)/5;
      const points=[[1.055,a],[1.155,a],[1.155,b],[1.055,a],[1.155,b],[1.055,b]];
      for(const [radius,angle] of points)sectorVertices.push(Math.cos(angle)*radius,Math.sin(angle)*radius,0);
    }
    const sectorGeometry=geometry(new THREE.BufferGeometry());
    sectorGeometry.setAttribute('position',new THREE.Float32BufferAttribute(sectorVertices,3));
    function extruded(points){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return geometry(new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}));}
    const houseGeometry=extruded([[-.23,0],[-.23,.28],[-.32,.28],[0,.55],[.32,.28],[.23,.28],[.23,0],[.075,0],[.075,.2],[-.075,.2],[-.075,0]]);
    const doorGeometry=extruded([[-.18,0],[-.18,.51],[.12,.43],[.12,-.06]]);
    const arrowGeometry=geometry(new THREE.BufferGeometry().setFromPoints([
      [-.22,0,0],[-.22,.56,0],[-.22,.56,0],[.17,.56,0],[.17,.56,0],[.17,.4,0],
      [.16,.25,0],[.44,.25,0],[.44,.25,0],[.32,.37,0],[.44,.25,0],[.32,.13,0]
    ].map(p=>new THREE.Vector3(...p))));
    const lineMaterial=material(new THREE.LineBasicMaterial({color:0x32ffe1,depthWrite:false,toneMapped:false}));
    function labelMaterial(label){
      const canvas=(options.document||global.document).createElement('canvas');canvas.width=512;canvas.height=128;
      const context=canvas.getContext('2d');
      context.fillStyle='rgba(4,58,53,.94)';context.fillRect(0,0,512,128);
      context.strokeStyle='#39ffe2';context.lineWidth=5;context.strokeRect(3,3,506,122);
      context.fillStyle='#ffffff';context.font='bold 58px Arial';context.textAlign='center';context.textBaseline='middle';context.fillText(label,256,65);
      const texture=new THREE.CanvasTexture(canvas);textures.add(texture);texture.colorSpace=THREE.SRGBColorSpace;
      return material(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
    }
    const enterLabel=labelMaterial('VÀO NHÀ'),exitLabel=labelMaterial('RA SÂN');
    function createVisual(kind,parent){
      const root=new THREE.Group();root.name='house-portal-'+kind;root.userData.localOnly=true;
      const ring=new THREE.Group();root.add(ring);
      for(const [geo,mat,y] of [[rimGeometry,cyan,0],[glowGeometry,glow,0],[innerGeometry,gold,0],[sectorGeometry,segmentsMaterial,.004],[discGeometry,discMaterial,-.01]]){
        const mesh=new THREE.Mesh(geo,mat);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;ring.add(mesh);
      }
      const arc=geometry(new THREE.RingGeometry(1.235,1.285,ARC_SEGMENTS,1,-Math.PI/2));arc.setDrawRange(0,0);
      const progress=new THREE.Mesh(arc,progressMaterial);progress.name='portal-progress';progress.rotation.x=-Math.PI/2;progress.position.y=.016;ring.add(progress);
      const icon=new THREE.Group();icon.name='portal-icon';icon.position.y=.23;root.add(icon);
      icon.add(new THREE.Mesh(kind==='enter'?houseGeometry:doorGeometry,cyan));
      if(kind==='exit')icon.add(new THREE.LineSegments(arrowGeometry,lineMaterial));
      const label=new THREE.Sprite(kind==='enter'?enterLabel:exitLabel);label.position.y=1.05;label.scale.set(1.55,.39,1);root.add(label);
      const visual={root,ring,arc,steps:0};parent.add(root);visuals.push(visual);return visual;
    }
    function place(visual,point){visual.root.position.set(point.x,point.y,point.z);visual.ring.scale.set(point.radius,1,point.radius);}
    const entryVisuals=entries.map(entry=>{const visual=createVisual('enter',world);place(visual,entry.entry);visual.root.name+='-'+entry.id;return visual;});
    const exitVisual=createVisual('exit',interiorRoot);exitVisual.root.visible=false;
    let disposed=false,generation=0,armed=false,elapsed=0,pending=false,currentIndex=-1,currentDirection=null,currentVisual=null,abortController=null;
    let knownMap,knownHouse,knownAuthenticated,exitHouseIndex=-1;
    const status=()=>({activeId:currentIndex<0?null:entries[currentIndex].id,direction:currentDirection,elapsed,progress:elapsed/DWELL_SECONDS,pending,armed,blocked:!armed});
    let notifiedId=null,notifiedDirection=null,notifiedElapsed=0,notifiedPending=false,notifiedArmed=false;
    function notify(){
      if(!options.onProgress)return;
      const id=currentIndex<0?null:entries[currentIndex].id;
      if(id===notifiedId&&currentDirection===notifiedDirection&&elapsed===notifiedElapsed&&pending===notifiedPending&&armed===notifiedArmed)return;
      notifiedId=id;notifiedDirection=currentDirection;notifiedElapsed=elapsed;notifiedPending=pending;notifiedArmed=armed;options.onProgress(status());
    }
    function drawProgress(visual,value){if(!visual)return;const steps=Math.floor(Math.min(1,Math.max(0,value))*ARC_SEGMENTS+1e-8);if(steps!==visual.steps){visual.steps=steps;visual.arc.setDrawRange(0,steps*6);}}
    function clear(){
      generation++;if(abortController)abortController.abort();abortController=null;
      drawProgress(currentVisual,0);currentVisual=null;currentIndex=-1;currentDirection=null;elapsed=0;pending=false;
    }
    function reset(){clear();armed=false;notify();}
    function contains(point,position){if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))return false;const dx=position.x-point.x,dz=position.z-point.z;return dx*dx+dz*dz<=point.radius*point.radius;}
    function sameScope(state,mapId,houseId){return !!state.authenticated&&!!state.enabled&&state.mapId===mapId&&state.houseId===houseId;}
    function candidate(state){
      if(state.mapId!=='village'){
        const index=entries.findIndex(entry=>entry.id===state.houseId&&entry.interiorId===state.mapId);
        return index>=0&&contains(entries[index].interiorExit,state.position)?index:-1;
      }
      if(currentIndex>=0&&currentDirection==='enter'&&contains(entries[currentIndex].entry,state.position))return currentIndex;
      let nearest=-1,distance=Infinity;
      for(let i=0;i<entries.length;i++){
        const point=entries[i].entry;if(!contains(point,state.position))continue;
        const dx=state.position.x-point.x,dz=state.position.z-point.z,d=dx*dx+dz*dz;
        if(d<distance){distance=d;nearest=i;}
      }
      return nearest;
    }
    function fail(error,direction){
      reset();const detail=error&&error.message?': '+error.message:'.';
      toast((direction==='exit'?'Không thể ra sân':'Không thể vào nhà')+detail+' Hãy rời vòng rồi thử lại.');
    }
    function transition(state){
      const index=currentIndex,direction=currentDirection,entry=entries[index],point=direction==='enter'?entry.entry:entry.interiorExit;
      const token=generation,mapId=state.mapId,houseId=state.houseId;
      pending=true;armed=false;
      abortController=typeof global.AbortController==='function'?new global.AbortController():null;
      const context={signal:abortController?abortController.signal:undefined,isCurrent:()=>!disposed&&token===generation&&sameScope(getState(),mapId,houseId)&&contains(point,getState().position)};
      const finish=result=>{
        if(disposed||token!==generation)return;
        if(result===true){reset();return;}
        if(!context.isCurrent()){reset();return;}
        fail(new Error('Điểm đến chưa sẵn sàng'),direction);
      };
      const rejected=error=>{if(disposed||token!==generation)return;if(context.isCurrent())fail(error,direction);else reset();};
      try{const result=(direction==='enter'?onEnter:onExit)(entry,context);if(result&&typeof result.then==='function')Promise.resolve(result).then(finish,rejected);else finish(result);}catch(error){rejected(error);}
    }
    function update(dt){
      if(disposed)return;
      const state=getState();
      const houseIndex=state.mapId==='village'?-1:entries.findIndex(entry=>entry.id===state.houseId&&entry.interiorId===state.mapId);
      if(houseIndex!==exitHouseIndex){exitHouseIndex=houseIndex;exitVisual.root.visible=houseIndex>=0;if(houseIndex>=0)place(exitVisual,entries[houseIndex].interiorExit);}
      if(state.mapId!==knownMap||state.houseId!==knownHouse||!!state.authenticated!==knownAuthenticated){reset();knownMap=state.mapId;knownHouse=state.houseId;knownAuthenticated=!!state.authenticated;}
      if(!state.authenticated||!state.enabled){if(currentIndex>=0||armed)reset();return;}
      // An interrupted/background frame cannot establish continuous presence.
      if(!Number.isFinite(dt)||dt<0||dt>.25){reset();return;}
      const index=candidate(state);
      if(index<0){if(currentIndex>=0)clear();armed=true;notify();return;}
      if(pending){if(index!==currentIndex||!contains(currentDirection==='enter'?entries[currentIndex].entry:entries[currentIndex].interiorExit,state.position))reset();return;}
      if(!armed)return;
      const direction=state.mapId==='village'?'enter':'exit';
      if(index!==currentIndex||direction!==currentDirection){clear();currentIndex=index;currentDirection=direction;currentVisual=direction==='enter'?entryVisuals[index]:exitVisual;notify();return;}
      elapsed=Math.min(DWELL_SECONDS,elapsed+dt);drawProgress(currentVisual,elapsed/DWELL_SECONDS);
      if(elapsed+1e-9>=DWELL_SECONDS){
        let ready;try{ready=isReady(entries[index],direction)===true;}catch(error){fail(error,direction);return;}
        if(ready)transition(state);
      }
      notify();
    }
    function dispose(){if(disposed)return;reset();disposed=true;for(const visual of visuals)visual.root.removeFromParent();for(const value of geometries)value.dispose();for(const value of materials)value.dispose();for(const value of textures)value.dispose();}
    return {update,reset,dispose,get status(){return status();}};
  }
  global.createHousePortals=createHousePortals;
})(typeof window==='undefined'?globalThis:window);
