'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),h=require('./lang-viet-assets/geometry.cjs'),encode=require('./lang-viet-assets/glb.cjs');
const {buildNature}=require('./lang-viet-assets/nature.cjs'),{buildStructure}=require('./lang-viet-assets/structures.cjs');
const names={AO_SEN_01:'Ao sen',BAN_GO_01:'Bàn gỗ',BAN_HOC_GO_01:'Bàn học gỗ',BEP_CUI_01:'Bếp củi',BO_AM_TRA_01:'Bộ ấm trà',BON_CAY_DA_01:'Bồn cây đa',BUI_CO_01:'Bụi cỏ',BUI_HOA_01:'Bụi hoa',CAU_AO_SEN_01:'Cầu ao sen',CAY_CAU_01:'Cây cau',CAY_CHUOI_01:'Cây chuối',CAY_DA_01:'Cây đa',CAY_LIEU_01:'Cây liễu',CAY_TAN_RONG_01:'Cây tán rộng',CAY_TRE_01:'Cụm tre',CHAU_HOA_01:'Chậu hoa',CHUM_NUOC_01:'Chum nước',COI_GIA_GAO_01:'Cối giã gạo',CONG_LANG_01:'Cổng làng',CONG_VUON_TRE_01:'Cổng vườn tre',CUA_GO_01:'Cửa gỗ',CUA_SO_GO_01:'Cửa sổ gỗ',CUI_XEP_01:'Củi xếp',CUM_DA_01:'Cụm đá',CUM_SEN_01:'Cụm sen',DEN_LONG_01:'Đèn lồng',DINH_LANG_01:'Đình làng',DONG_ROM_01:'Đống rơm',DUONG_DA_01:'Đường đá',DUONG_DAT_01:'Đường đất',GANH_TRE_01:'Gánh tre',GHE_GO_01:'Ghế gỗ',GIAN_LEO_TRE_01:'Giàn leo tre',GIAN_MUOP_01:'Giàn mướp',GIENG_NUOC_01:'Giếng nước',GIO_TRE_01:'Giỏ tre',GIUONG_TRE_01:'Giường tre',HANG_RAO_TRE_01:'Hàng rào tre',HANG_RAO_TRE_GOC_01:'Góc hàng rào tre',KE_BEP_GO_01:'Kệ bếp gỗ',NHA_DAN_A:'Nhà dân A',NHA_DAN_B:'Nhà dân B',NIA_TRE_01:'Nia tre',RUONG_GO_01:'Rương gỗ',SAN_GACH_01:'Sân gạch',THAM_CO_01:'Thảm cỏ',THUNG_GO_01:'Thùng gỗ',TU_GO_01:'Tủ gỗ',VUON_RAU_01:'Vườn rau',XE_KEO_GO_01:'Xe kéo gỗ'};
async function main(){
 const manifestPath=path.join(root,'DOCUMENTS/LANG-VIET-ASSET-MANIFEST.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 const furnitureModule=require('./lang-viet-assets/furniture.cjs'),buildFurniture=furnitureModule.buildFurniture||furnitureModule;
 const catalogPath=path.join(root,'MAP/regions/lang-viet/assets-3d.json');
 const previous=fs.existsSync(catalogPath)?JSON.parse(fs.readFileSync(catalogPath,'utf8')):null;
 const imported=new Map((previous?.assets||[]).filter(a=>a.sourceType==='imported-glb').map(a=>[a.id,a]));
 global.THREE=h.T;const {GLTFLoader}=await import('../ASSETS/vendor/gltf-r160/GLTFLoader.js'),loader=new GLTFLoader();
 const catalog={version:1,mapId:'lang-viet',style:'Dựng thủ công bằng hình học theo ảnh; vật liệu màu PBR, chưa có texture quét ảnh.',motionImplementation:'Runtime pivots, không có skeleton/rig hoặc clip animation trong GLB.',assets:[]};
 const dir=path.join(root,'MAP/models/lang-viet');fs.mkdirSync(dir,{recursive:true});let built=0,totalBytes=0,totalTriangles=0;
 for(const item of manifest.assets){
  const id=item.code,views=item.images.filter(im=>im.imageReadable),entry={id,name:names[id.slice(3)]||id,status:'blocked',url:null,references:Object.fromEntries(views.map(im=>[im.angle.toUpperCase(),'../'+im.comparisonPath])),missingAngles:item.missingAngles,referenceStatus:item.referenceStatus,assumptions:[],motion:[]};catalog.assets.push(entry);
  // Supplied models are authoritative. Never regenerate or replace their catalog
  // with a reference reconstruction, even when running the general asset build.
  if(imported.has(id)){
   const saved=imported.get(id);
   for(const [url,expected] of [[saved.url,saved.sha256],[saved.lod1Url,saved.lod1?.sha256]]){
    if(!url)continue;
    const file=path.resolve(root,'SOURCE-CODE',url);
    if(!file.startsWith(path.join(root,'MAP','models')+path.sep)||!fs.existsSync(file))throw Error('Imported model unavailable: '+id);
    if(expected&&crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected)throw Error('Imported model changed; review first: '+id);
   }
   Object.assign(entry,saved);built++;totalBytes+=saved.bytes;totalTriangles+=saved.triangles;
   continue;
  }
  if(!views.length){entry.assumptions.push('ZIP hỏng; không có ảnh kiểm chứng. Chưa dựng hoặc thay tài nguyên cũ.');item.modelStatus='blocked-no-readable-reference';continue;}
  try{
   const model=buildNature(id)||buildStructure(id)||buildFurniture(id,h);if(!model)throw Error('Chưa có bộ dựng cho '+id);
   model.name=id;model.userData={...model.userData,assetId:id,generatorVersion:1,referenceViews:views.map(im=>im.angle),rigged:false};
   // Architectural reference origins intentionally match the old floor and bridge
   // height contracts. All other small props are normalized to a ground plane.
   if(!/LV_(NHA_DAN|DINH_LANG|CONG_LANG|CAU_AO_SEN|AO_SEN)/.test(id)){
    const b=new h.T.Box3().setFromObject(model);model.position.y-=b.min.y;
   }
   h.compact(model);const data=encode(model),decoded=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
   let meshes=0,triangles=0,rigged=false;const motion=new Set();decoded.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=o.geometry.attributes.position.count/3;}if(o.isSkinnedMesh||o.isBone)rigged=true;if(o.userData.motion)motion.add(o.userData.motion);});
   const bounds=new h.T.Box3().setFromObject(decoded.scene),size=bounds.getSize(new h.T.Vector3());
   if(!meshes||rigged||decoded.animations.length||!size.toArray().every(n=>Number.isFinite(n)&&n>0))throw Error('GLB reload validation failed');
   const file=path.join(dir,id+'.glb');
   if(fs.existsSync(file)){const old=fs.readFileSync(file);if(!old.includes(Buffer.from('Viet Village reference reconstruction v1')))throw Error('Refusing to overwrite an unrecognized existing model');}
   fs.writeFileSync(file,data);
   Object.assign(entry,{status:'built',url:'../MAP/models/lang-viet/'+id+'.glb',bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),meshes,triangles,dimensions:{x:size.x,y:size.y,z:size.z},bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},motion:[...motion],reloadVerified:true});
   entry.assumptions.push('Kích thước đề xuất theo nhân vật 2,35 m và mặt bằng game; ảnh không có đơn vị đo.','Chi tiết mặt khuất và kết cấu giản lược được suy luận; không phải bản scan 3D chính xác.');
   if(item.missingAngles.length)entry.assumptions.push('Thiếu ảnh hợp lệ: '+item.missingAngles.join(', ')+'. Hình dáng phía này được suy luận từ các góc còn lại.');
   if(/NHA_DAN|DINH_LANG/.test(id))entry.assumptions.push('Nguồn chỉ có ngoại thất; nội thất đang dùng căn phòng và bố trí riêng của game, chưa có hồ sơ nội thất công trình tương ứng.');
   const notes=furnitureModule.furnitureNotes?.[id];if(notes){entry.observed=notes.observed;entry.assumptions.push(notes.assumptions);}
   Object.assign(item,{modelStatus:'exported-reloaded',modelPath:'MAP/models/lang-viet/'+id+'.glb',modelBytes:data.length,dimensions:entry.dimensions,modelSha256:entry.sha256,integrationStatus:'placement-config-pending-runtime-verification'});
   built++;totalBytes+=data.length;totalTriangles+=triangles;
   console.log(id+': '+triangles+' triangles, '+data.length+' bytes');
  }catch(error){entry.assumptions.push(error.message);item.modelStatus='build-error';item.modelError=error.message;console.error(id+': '+error.message);}
 }
 catalog.summary={discovered:manifest.assets.length,built,blocked:manifest.assets.length-built,bytes:totalBytes,triangles:totalTriangles};
 if(imported.size){catalog.style=previous.style;catalog.motionImplementation=previous.motionImplementation;}
 fs.writeFileSync(path.join(root,'MAP/regions/lang-viet/assets-3d.json'),JSON.stringify(catalog,null,2)+'\n');
 manifest.modelBuild={...catalog.summary,updatedAt:new Date().toISOString(),script:'scripts/build-lang-viet-assets.cjs',validation:'Generated GLBs reloaded through pinned r160 GLTFLoader; imported GLBs preserved and hash-checked separately',importedPreserved:[...imported.keys()]};
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify(catalog.summary));if(built!==manifest.assets.filter(a=>a.images.some(im=>im.imageReadable)).length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
