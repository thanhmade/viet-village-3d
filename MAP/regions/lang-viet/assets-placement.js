(function(global){
 'use strict';
 // Measured against the existing village, never against schematic drawing coordinates.
 const groups=[];
 const asset=(id,x,y,z,options={})=>({id:'LV_'+id,position:[x,y,z],...options});
 const add=(id,placements,options={})=>groups.push({id,placements,...options});
 for(const [index,[x,z]] of [[-11,-10],[-11,0],[-11,10],[11,-10],[11,0],[11,10]].entries()){
  const items=[asset(index%2?'NHA_DAN_B':'NHA_DAN_A',x,.24,z),asset('CHUM_NUOC_01',x-3.48,.3,z+2.95,{size:[.7,.9,.7]}),
   asset('CHAU_HOA_01',x+3.48,.3,z+3.35,{size:[.65,.85,.65]}),asset('CAY_CHUOI_01',x+3.5,.3,z+1.35,{size:[1.7,2.9,1.7]}),
   asset('CUI_XEP_01',x+3.55,.3,z-1,{size:[.7,.5,.75]}),asset('SAN_GACH_01',x,.25,z+4.05,{size:[6,.06,2.4]})];
  // Keep exactly the former fence lines and their central doorway gap.
  items.push(asset('HANG_RAO_TRE_01',x,.3,z-2.9,{size:[7.6,.85,.12]}));
  for(const side of [-1,1]){
   items.push(asset('HANG_RAO_TRE_01',x+side*3.8,.3,z+1.075,{size:[7.95,.85,.12],yaw:Math.PI/2}));
   items.push(asset('HANG_RAO_TRE_01',x+side*2.325,.3,z+5.05,{size:[2.95,.85,.12]}));
  }
  add('house-'+(index+1),items,{location:'Sân và ngoại thất nha-'+String(index+1).padStart(2,'0')});
 }
 add('temple',[asset('DINH_LANG_01',0,.24,-19)],{location:'Đình làng, giữ bậc và các cột đã đo'});
 add('banyan',[asset('BON_CAY_DA_01',0,.25,0),asset('CAY_DA_01',0,.25,0)],{location:'Sân trung tâm'});
 add('garden',[asset('VUON_RAU_01',-15,.32,17),asset('GIAN_MUOP_01',-17.5,.3,19,{size:[4.3,2.8,2.7]}),
  asset('GIAN_LEO_TRE_01',-18,.3,14.2,{size:[3.5,2.7,1.8]}),asset('CONG_VUON_TRE_01',-9.5,.3,16.4,{size:[1.7,1.6,.15],yaw:Math.PI/2,hingeOpen:1}),
  asset('HANG_RAO_TRE_GOC_01',-20.1,.3,20.5,{size:[1.2,1,1.2]}),asset('DUONG_DAT_01',-8.35,.25,18.6,{size:[1.8,.02,4.2]})],{location:'Vườn rau phía trái, bảo toàn đường nâng trước nha-03'});
 // Supplied pond has its own lotus. Preserve the existing independent bridge and willow.
 add('pond',[asset('AO_SEN_01',15,.1337,18,{scale:.94,yaw:Math.PI/2,pond:{rx:3.29,rz:2.84,power:2.24,irregular:.013}}),asset('CAU_AO_SEN_01',15,.34,18),
  asset('CAY_LIEU_01',23,.3,21,{size:[4.3,5.1,4]})],{location:'Ao sen và cầu đi bộ'});
 const gate=[asset('CONG_LANG_01',0,.24,24),asset('CHUM_NUOC_01',-5.25,.3,24.85,{size:[1.25,1.3,1.25]})];
 for(const side of [-1,1])gate.push(asset('HANG_RAO_TRE_01',side*15.7,.3,24,{size:[16.6,1.4,.13]}),asset('HANG_RAO_TRE_01',side*5.55,.3,24,{size:[2.9,1.4,.13]}));
 add('gate',gate,{location:'Cổng phía nam, chừa đường giữa và Tuần đinh'});
 add('bamboo',[-13,-9,-5,-1,3,7].map(z=>asset('CAY_TRE_01',-22,.3,z,{size:[2.5,6.1,2.6],collider:{w:.7,d:.7}})),{location:'Lũy tre bên trái'});
 const trees=[[-19,-22],[20,-22],[-18,6],[20,5],[-17,-19],[17,-18]].map(([x,z])=>asset('CAY_TAN_RONG_01',x,.3,z,{size:[4.1,5,4.1],collider:{w:.26,d:.26}}));
 for(const [x,z] of [[-19,10],[-20,-18],[20,-10],[22,10],[-5,-22],[19,0],[23,1]])trees.push(asset('CAY_CHUOI_01',x,.3,z,{size:[2.3,2.9,2.3],collider:{w:.2,d:.2}}));
 trees.push(asset('CAY_CAU_01',20,.3,-24,{size:[2.8,6.2,2.8],collider:{w:.22,d:.22}}));add('trees',trees,{location:'Vành cây theo cảnh cũ'});
 const edges=[];
 for(const [i,[x,z]] of [[-23,-22],[23,-22],[-23,11],[23,10],[-18,-24],[18,-24],[-22,22],[23,24]].entries()){
  edges.push(asset('BUI_CO_01',x,.27,z,{size:[1.4,.45,1.1]}),asset('BUI_HOA_01',x+1,.27,z,{size:[1.1,.7,1.1]}));
 }
 edges.push(asset('THAM_CO_01',-20,.25,-23.5,{size:[4,.25,3]}));add('flowers',edges,{location:'Viền cảnh, tránh lối chính'});
 // Additional role props are outside the NPC approaches and portal/spawn safety areas.
 add('role-props',[
  asset('GIENG_NUOC_01',-18,.3,-6,{size:[2.8,1.2,2.8],collider:{w:1.5,d:1.5},role:'Nguồn nước chung'}),
  asset('DONG_ROM_01',-18.5,.3,10,{size:[2.3,2.1,2.3],collider:{w:1.2,d:1.2},role:'Nông dân'}),
  asset('XE_KEO_GO_01',18,.3,10,{size:[2,1.4,2.6],collider:{w:1.05,d:1.4},role:'Tạp hóa'}),
  asset('COI_GIA_GAO_01',-18,.3,2,{size:[1.4,1.3,1.4],collider:{w:.8,d:.8},role:'Nhà dân'}),
  asset('GANH_TRE_01',-7.4,.3,20.9,{size:[1.5,.7,.7],collider:{w:.85,d:.45},role:'Nông dân'}),
  asset('NIA_TRE_01',-13.4,.57,14,{size:[.9,.14,.9],role:'Thợ rèn, sân cạnh nhà'}),
  asset('GIO_TRE_01',14.15,.36,14.2,{size:[.5,.5,.5],collider:{w:.28,d:.28},role:'Tạp hóa'}),
  
  asset('SAN_GACH_01',8.1,.25,-16.6,{size:[4.5,.05,4],role:'Sân tập Võ sư'}),
  asset('DEN_LONG_01',-3,3.3,-15.7,{size:[.5,.8,.5],role:'Hiên đình'})
 ],{location:'Các khu chức năng, không thay NPC hay nhiệm vụ'});
 // Interior furniture is an actual 3D room; the kitchen layout is only used in nha-01.
 add('interior-furniture',[
  asset('BAN_HOC_GO_01',-3.08,.03,-.38,{size:[1.08,.93,1.75],houses:[1,2,3,4,5],role:'Nhà học / bàn viết'}),
  asset('GHE_GO_01',-2.3,.03,-.25,{size:[.46,.5,.46],houses:[1,2,3,4,5],collider:{w:.23,d:.23}}),
  asset('BEP_CUI_01',-3.08,.03,0,{size:[1.08,.8,1],houses:[0],role:'Bếp nha-01'}),
  asset('KE_BEP_GO_01',-3.08,.03,-1.1,{size:[1.08,1.6,.5],houses:[0],role:'Kệ cạnh bếp nha-01'}),
  asset('RUONG_GO_01',-3.1,.03,1.82,{size:[1.12,.82,.92]}),asset('GIUONG_TRE_01',2.84,.03,1.02,{size:[1.4,.92,2.4]}),
  asset('TU_GO_01',3.08,.03,-1.94,{size:[1.24,2.73,1.03]}),asset('BAN_GO_01',0,.03,-1.99,{size:[1.62,.74,.89]}),
  asset('GHE_GO_01',-1.4,.03,-1.99,{size:[.45,.48,1.1]}),asset('GHE_GO_01',1.4,.03,-1.99,{size:[.45,.48,1.1]}),
  asset('BO_AM_TRA_01',0,.77,-1.99,{size:[.95,.35,.6]}),asset('DEN_LONG_01',-3.03,.884,.28,{size:[.25,.4,.25],houses:[1,2,3,4,5]})
 ],{interior:true,location:'Nội thất dùng chung, cửa vào +Z; nha-02 giữ bàn học cho Thầy đồ'});
 add('interior-door',[asset('CUA_GO_01',0,0,2.97,{size:[1.62,2.7,.12],hingeOpen:.92})],{interior:true,location:'Cửa chính nội thất, hai cánh có trục xoay'});
 add('interior-windows',[
  asset('CUA_SO_GO_01',-1.75,1.2,-2.94,{size:[1.24,1.6,.16]}),asset('CUA_SO_GO_01',1.75,1.2,-2.94,{size:[1.24,1.6,.16]}),
  asset('CUA_SO_GO_01',-2.48,1.2,2.94,{size:[1.24,1.6,.16]}),asset('CUA_SO_GO_01',2.48,1.2,2.94,{size:[1.24,1.6,.16]}),
  asset('CUA_SO_GO_01',-3.94,1.2,0,{size:[1.24,1.6,.16],yaw:Math.PI/2})
 ],{interior:true,location:'Các cửa sổ có lỗ thật trong tường nội thất'});
 global.VietVillageAssetPlacements=Object.freeze({version:1,groups,wind:{enabled:true,strength:.32,rainBoost:.2,frequency:.8},pathAsset:'LV_DUONG_DA_01'});
})(typeof window==='undefined'?globalThis:window);
