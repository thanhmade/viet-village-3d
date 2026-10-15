(function(global){
 'use strict';
 // Phones play in landscape. A web page cannot force every phone to rotate:
 // fullscreen and screen.orientation.lock are only attempted right after the
 // player taps Start (or the explicit retry button), and every failure is
 // tolerated. Otherwise a portrait guide covers gameplay. No CSS rotation of
 // the page, no reloads, and nothing here touches the profile or progress.
 global.createVillageLandscape=function({document=global.document,win=global,getPhase=()=>'none',releaseInputs=()=>{},openCharacter=null,logout=null}={}){
  const el=id=>document?.getElementById?.(id)||null;
  const media=query=>{try{return !!win.matchMedia?.(query).matches;}catch(_){return false;}};
  let userExitedFullscreen=false,enteredByUs=false,blocked=false,lastAttempt=null,phase='none',frame=0,lastOrientation=null;
  // Touch-only devices with a phone-sized short side. A narrow desktop window
  // (fine pointer) or a touch laptop is never treated as a phone.
  function phoneLike(){
   if(!media('(pointer: coarse)')||media('(any-pointer: fine)'))return false;
   const s=win.screen||{},short=Math.min(s.width||win.innerWidth||0,s.height||win.innerHeight||0);
   return short>0&&short<=600;
  }
  // Prefer the device orientation; the viewport aspect changes when the
  // on-screen keyboard opens, which is not a rotation.
  function orientation(){
   const type=win.screen?.orientation?.type;
   if(typeof type==='string')return type.startsWith('portrait')?'portrait':'landscape';
   if(typeof win.orientation==='number')return Math.abs(win.orientation)===90?'landscape':'portrait';
   return media('(orientation: portrait)')?'portrait':'landscape';
  }
  function typing(){const a=document?.activeElement;return !!a&&(['INPUT','TEXTAREA','SELECT'].includes(a.tagName)||a.isContentEditable===true);}
  function update(){
   frame=0;let next='none';try{next=getPhase();}catch(_){next='none';}phase=next;
   const phone=phoneLike(),portrait=phone&&orientation()==='portrait';
   // Never over the Google sign-in, or while typing a name; gameplay is blocked, the character screen only gets a banner.
   const block=portrait&&phase==='game'&&!typing(),banner=portrait&&phase==='character';
   if(block&&!blocked){try{releaseInputs();}catch(_){}}
   blocked=block;
   const overlay=el('rotateOverlay');if(overlay)overlay.hidden=!block;
   const strip=el('rotateBanner');if(strip)strip.hidden=!banner;
   document?.body?.classList?.[block?'add':'remove']?.('portrait-blocked');
   document?.body?.classList?.[phone?'add':'remove']?.('phone-like');
   if(block){const status=el('rotateStatus');if(status&&lastAttempt&&!status.textContent)status.textContent=describe(lastAttempt);}
   return {phone,portrait,block,banner};
  }
  function schedule(){if(!frame)frame=(win.requestAnimationFrame||(fn=>win.setTimeout(fn,16)))(update);}
  function describe(r){
   if(r.lock==='ok')return 'Đã khóa màn hình ngang.';
   if(r.fullscreen==='rejected'&&r.lock!=='ok')return 'Trình duyệt chưa cho toàn màn hình. Hãy tự xoay ngang điện thoại; nếu không xoay được, tắt khóa xoay màn hình trong cài đặt máy.';
   if(r.lock==='unsupported')return 'Trình duyệt này không hỗ trợ khóa hướng màn hình. Hãy tự xoay ngang điện thoại.';
   if(r.lock==='rejected')return 'Trình duyệt chưa cho khóa màn hình ngang. Hãy tự xoay ngang điện thoại.';
   return '';
  }
  // Must run synchronously inside a click/tap handler (user activation).
  function request({fullscreen=true}={}){
   const result={fullscreen:'skipped',lock:'skipped'};
   if(!phoneLike()){lastAttempt=result;return Promise.resolve(result);}
   const root=document?.documentElement;
   let fs=Promise.resolve();
   if(fullscreen&&!document.fullscreenElement&&typeof root?.requestFullscreen==='function'){
    try{enteredByUs=true;fs=Promise.resolve(root.requestFullscreen({navigationUI:'hide'})).then(()=>{result.fullscreen='ok';},()=>{result.fullscreen='rejected';enteredByUs=false;});}
    catch(_){result.fullscreen='rejected';enteredByUs=false;}
   }else result.fullscreen=document?.fullscreenElement?'already':fullscreen?'unsupported':'skipped';
   return fs.then(()=>{
    const o=win.screen?.orientation;
    if(typeof o?.lock!=='function'){result.lock='unsupported';return;}
    return Promise.resolve().then(()=>o.lock('landscape')).then(()=>{result.lock='ok';},()=>{result.lock='rejected';});
   }).catch(()=>{}).then(()=>{lastAttempt=result;const status=el('rotateStatus');if(status)status.textContent=describe(result);update();return result;});
  }
  // Start/continue buttons: after the player left fullscreen on purpose, only
  // the orientation lock is retried (no repeated fullscreen prompts).
  function requestOnStart(){return request({fullscreen:!userExitedFullscreen});}
  function onFullscreenChange(){
   if(!document.fullscreenElement&&enteredByUs){userExitedFullscreen=true;enteredByUs=false;}
   schedule();
  }
  function onOrientation(){const now=orientation();if(now!==lastOrientation){lastOrientation=now;try{releaseInputs();}catch(_){}}schedule();}
  const listeners=[];
  function listen(target,type,fn,options){if(!target?.addEventListener)return;target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener?.(type,fn,options));}
  listen(win,'resize',schedule);listen(win,'orientationchange',onOrientation);listen(win.screen?.orientation,'change',onOrientation);
  listen(document,'fullscreenchange',onFullscreenChange);listen(document,'webkitfullscreenchange',onFullscreenChange);
  listen(document,'focusin',schedule);listen(document,'focusout',schedule);
  // Switching apps or losing focus must not leave movement or skills held down.
  listen(document,'visibilitychange',()=>{if(document.hidden){try{releaseInputs();}catch(_){}}schedule();});
  listen(win,'blur',()=>{try{releaseInputs();}catch(_){}});
  listen(win,'pagehide',()=>{try{releaseInputs();}catch(_){}});
  const tryButton=el('rotateTryBtn');if(tryButton)tryButton.onclick=()=>{const s=el('rotateStatus');if(s)s.textContent='Đang thử…';void request({fullscreen:true});};
  const characterButton=el('rotateCharacterBtn');if(characterButton)characterButton.onclick=()=>{Promise.resolve(openCharacter?.()).then(ok=>{if(ok===false){const s=el('rotateStatus');if(s)s.textContent='Hãy đóng cửa sổ đang mở trong game rồi thử lại.';}schedule();});};
  const logoutButton=el('rotateLogoutBtn');if(logoutButton)logoutButton.onclick=()=>{try{logout?.();}catch(_){}};
  // The guide is modal for gameplay: taps on it never reach the 3D view.
  const overlay=el('rotateOverlay');
  if(overlay)for(const type of ['pointerdown','pointermove','pointerup','click','touchstart','touchmove','touchend','wheel','keydown'])overlay.addEventListener?.(type,e=>e.stopPropagation());
  lastOrientation=orientation();
  return Object.freeze({update,schedule,request,requestOnStart,isBlocking:()=>blocked,
   get status(){return {phone:phoneLike(),orientation:orientation(),phase,blocked,userExitedFullscreen,lastAttempt};},
   dispose(){listeners.forEach(remove=>remove());}});
 };
})(typeof window==='undefined'?globalThis:window);
