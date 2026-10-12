(function(global){
 'use strict';
 const connections=new WeakMap();

 // Adapt the unchanged atlas document in memory; its packaged source remains untouched.
 global.connectVillageAtlasViewer=function(viewerWindow,{onSelect=()=>{},onClose=()=>{}}={}){
  let doc,inspection;
  try{doc=viewerWindow?.document;inspection=viewerWindow?.atlasInspection;}
  catch(error){throw new Error('Không thể kết nối bản đồ tổng: cần mở bản đồ cùng địa chỉ máy chủ với game.');}
  const data=inspection?.data,hubList=doc?.getElementById('hubList');
  const sidebar=doc?.querySelector('.sidebar'),hubSection=hubList?.closest('details');
  if(!doc||!hubList||!sidebar||!hubSection||!Array.isArray(data?.sites)||!Array.isArray(data?.provinces)||!Array.isArray(data?.local_hubs)||
   typeof viewerWindow.selectSite!=='function'||typeof viewerWindow.selectProvince!=='function'||typeof inspection.getView!=='function'||
   typeof onSelect!=='function'||typeof onClose!=='function')
   throw new Error('Bản đồ tổng chưa sẵn sàng hoặc không đúng định dạng hỗ trợ. Hãy tải lại bản đồ.');

  const sites=new Map(data.sites.map(item=>[item.id,item])),provinces=new Map(data.provinces.map(item=>[item.id,item]));
  const hubs=new Map();
  for(const hub of data.local_hubs){
   if(hub.id==='lang_viet'||hub.id==='lang_tan_thu')hubs.set(hub.id,hub);
   for(const child of hub.children||[])if(hub.id==='lang_viet'&&child.id==='dong_tre')hubs.set(child.id,child);
  }
  if(!hubs.has('lang_viet')||!hubs.has('lang_tan_thu')||!hubs.has('dong_tre'))
   throw new Error('Bản đồ tổng thiếu danh mục Làng Việt, Làng Tân Thủ hoặc Đồng Tre.');

  connections.get(viewerWindow)?.dispose();
  const originalSite=viewerWindow.selectSite,originalProvince=viewerWindow.selectProvince;
  const originalRenderLists=viewerWindow.renderLists;
  const originalInspectionSite=inspection.selectSite,originalInspectionProvince=inspection.selectProvince;
  const originalApplyView=viewerWindow.applyView,originalFit=viewerWindow.fit,originalFocusBox=viewerWindow.focusBox;
  const originalInspectionFit=inspection.fit,stage=doc.getElementById('stage');
  const oldHubNodes=Array.from(hubList.childNodes),oldHubParent=hubSection.parentNode,oldHubNext=hubSection.nextSibling;
  const oldHubOpen=hubSection.open,oldHubClass=hubSection.className;
  const textRestores=[],listeners=[],hubButtons=new Map();
  let disposed=false,lastGoodView=null,selectedHubId=null;
  const listen=(target,name,handler,capture=false)=>{target.addEventListener(name,handler,capture);listeners.push(()=>target.removeEventListener(name,handler,capture));};
  function replaceText(element,text){if(!element)return;textRestores.push([element,Array.from(element.childNodes)]);element.textContent=text;}
  function markHub(id){selectedHubId=id;for(const [key,button] of hubButtons){button.setAttribute('aria-pressed',String(key===id));button.classList.toggle('selected',key===id);}}
  function clearGeographicSelection(){
   for(const ring of doc.querySelectorAll('#pointLayer .selected-ring'))ring.setAttribute('opacity','0');
   for(const province of doc.querySelectorAll('#provinceLayer path'))province.classList.remove('selected');
   for(const button of doc.querySelectorAll('[data-site],[data-province],[data-detail-site]')){button.classList.remove('selected');button.setAttribute('aria-pressed','false');}
  }
  function renderLists(){
   const result=originalRenderLists.apply(viewerWindow,arguments);
   if(selectedHubId)clearGeographicSelection();return result;
  }
  function notify(kind,item){if(!disposed)onSelect({kind,id:item.id,name:item.name});}
  function selectSite(id){
   const item=typeof id==='string'&&sites.get(id);
   if(!item)throw new Error('Địa danh được chọn không tồn tại trong bản đồ tổng.');
   markHub(null);const result=originalSite.call(viewerWindow,id);notify('site',item);return result;
  }
  function selectProvince(id){
   const item=typeof id==='string'&&provinces.get(id);
   if(!item)throw new Error('Tỉnh hoặc thành phố được chọn không tồn tại trong bản đồ tổng.');
   markHub(null);const result=originalProvince.call(viewerWindow,id);notify('province',item);return result;
  }
  viewerWindow.selectSite=selectSite;viewerWindow.selectProvince=selectProvince;
  if(typeof originalRenderLists==='function')viewerWindow.renderLists=renderLists;
  inspection.selectSite=selectSite;inspection.selectProvince=selectProvince;

  // The source ResizeObserver can compute an invalid view when its iframe is zero-sized.
  // Keep the last finite view, without polling or fitting again on an ordinary reopen.
  const finiteView=view=>Array.isArray(view)&&view.length===4&&view.every(Number.isFinite)&&view[2]>0&&view[3]>0;
  const hasLayout=()=>stage&&stage.clientWidth>0&&stage.clientHeight>0;
  const readView=()=>inspection.getView();
  if(finiteView(readView()))lastGoodView=readView().slice();
  function applyView(){
   if(!hasLayout())return;
   const view=readView();
   if(!finiteView(view)){
    if(lastGoodView){const [x,y,w,h]=lastGoodView;originalFocusBox.call(viewerWindow,[x,y,x+w,y+h],0);}
    else originalFit.call(viewerWindow);
    return;
   }
   lastGoodView=view.slice();return originalApplyView.call(viewerWindow);
  }
  function fit(){if(hasLayout())return originalFit.call(viewerWindow);}
  const guardedLayout=typeof originalApplyView==='function'&&typeof originalFit==='function'&&typeof originalFocusBox==='function'&&!!stage;
  if(guardedLayout){viewerWindow.applyView=applyView;viewerWindow.fit=fit;inspection.fit=fit;}

  replaceText(doc.querySelector('.header h1'),'Bản đồ tổng · Chọn khu vực');
  replaceText(doc.querySelector('.header-note'),'Chọn khu vực để xem thông tin và trạng thái mở cửa');
  replaceText(doc.querySelector('.intro'),'Bạn muốn khám phá nơi nào?');
  replaceText(doc.querySelector('.sidebar > p.muted'),'Chọn làng trong game hoặc tìm hiểu các địa danh trên bản đồ Việt Nam.');
  replaceText(hubSection.querySelector('summary'),'Làng và khu luyện cấp');
  hubSection.classList.add('village-atlas-hubs');hubSection.open=true;
  sidebar.insertBefore(hubSection,sidebar.querySelector('.stats')||sidebar.firstChild);
  hubList.replaceChildren();
  for(const id of ['lang_viet','lang_tan_thu','dong_tre']){
   const hub=hubs.get(id),button=doc.createElement('button'),text=doc.createElement('span'),name=doc.createElement('strong'),note=doc.createElement('small');
   button.type='button';button.className='result atlas-hub-choice';button.dataset.hub=id;
   button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Chọn '+hub.name);
   name.textContent=hub.name;note.textContent=id==='dong_tre'?'Khu luyện cấp thuộc Làng Việt':'Khu làng trong game';
   text.append(name,note);button.append(text);hubList.append(button);hubButtons.set(id,button);
   listen(button,'click',()=>{
    markHub(id);viewerWindow.fit?.();clearGeographicSelection();
    const detail=doc.getElementById('detail'),subheading=doc.getElementById('mapSubheading');
    if(detail){
     const category=doc.createElement('div'),heading=doc.createElement('h2'),description=doc.createElement('p'),locationNote=doc.createElement('p');
     category.className='eyebrow';category.textContent='KHU LÀNG TRONG GAME';heading.textContent=hub.name;
     description.textContent=hub.description||hub.role||'';locationNote.className='footnote';
     locationNote.textContent='Khu làng chưa gán vị trí địa lý. Bản đồ đang hiển thị toàn quốc, không đánh dấu vị trí của khu làng.';
     detail.replaceChildren(category,heading,description,locationNote);
    }
    if(subheading)subheading.textContent='Khu làng chưa gán vị trí địa lý';
    notify('hub',hub);
   });
  }
  const hubNote=doc.createElement('p');hubNote.className='small muted';hubNote.textContent='Các khu làng chưa gán vị trí địa lý trên bản đồ quốc gia.';hubList.append(hubNote);
  const style=doc.createElement('style');style.textContent=`
   .hubs.village-atlas-hubs{margin:14px 0 18px;border:1px solid #647956;border-radius:10px;padding:10px;background:#16372f}
   .village-atlas-hubs summary{font-weight:700;color:#f0d99a}
   .village-atlas-hubs #hubList{display:grid;gap:7px;margin-top:10px}
   .village-atlas-hubs .atlas-hub-choice{width:100%;min-height:52px;margin:0;justify-content:flex-start;text-align:left}
   .village-atlas-hubs .atlas-hub-choice strong,.village-atlas-hubs .atlas-hub-choice small{display:block}
   .village-atlas-hubs .atlas-hub-choice[aria-pressed="true"]{border-color:#f0d99a;background:#294a3c}
   .village-atlas-hubs p{margin:3px 0 0;line-height:1.45}
  `;doc.head.append(style);
  listen(doc,'keydown',event=>{
   if(event.key==='Escape'&&!event.isComposing){event.preventDefault();event.stopImmediatePropagation();onClose();}
  },true);
  // Let native buttons, search fields and the viewer handle keys before stopping bubbling.
  listen(doc,'keydown',event=>event.stopPropagation());
  listen(doc,'keyup',event=>event.stopPropagation());

  function dispose(){
   if(disposed)return;disposed=true;
   for(const remove of listeners)remove();
   if(viewerWindow.selectSite===selectSite)viewerWindow.selectSite=originalSite;
   if(viewerWindow.selectProvince===selectProvince)viewerWindow.selectProvince=originalProvince;
   if(viewerWindow.renderLists===renderLists)viewerWindow.renderLists=originalRenderLists;
   if(inspection.selectSite===selectSite)inspection.selectSite=originalInspectionSite;
   if(inspection.selectProvince===selectProvince)inspection.selectProvince=originalInspectionProvince;
   if(guardedLayout){
    if(viewerWindow.applyView===applyView)viewerWindow.applyView=originalApplyView;
    if(viewerWindow.fit===fit)viewerWindow.fit=originalFit;
    if(inspection.fit===fit)inspection.fit=originalInspectionFit;
   }
   style.remove();hubList.replaceChildren(...oldHubNodes);hubSection.open=oldHubOpen;hubSection.className=oldHubClass;
   oldHubParent.insertBefore(hubSection,oldHubNext?.parentNode===oldHubParent?oldHubNext:null);
   for(const [element,nodes] of textRestores)element.replaceChildren(...nodes);
   if(connections.get(viewerWindow)===connection)connections.delete(viewerWindow);
  }
  const connection=Object.freeze({data,dispose});connections.set(viewerWindow,connection);return connection;
 };
})(typeof window==='undefined'?globalThis:window);
