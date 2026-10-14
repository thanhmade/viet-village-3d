'use strict';

// Geometry reconstructed from the readable FRONT/RIGHT/LEFT/BACK source images.
// This is intentionally unrigged: rigid doors and lids expose named hinge pivots.
// Dimensions are proposed game metres, not measurements supplied by the artwork.
const defaultHelpers = require('./geometry.cjs');
const furnitureNotes = {
 LV_BAN_GO_01: {label:'Bàn gỗ', observed:'Mặt ghép ván, bốn chân nghiêng nhẹ, giằng ngang và chốt mộng.', assumptions:'Ảnh FRONT hỏng; mặt trước suy ra từ RIGHT/LEFT/BACK. Kích thước 1,8 × 0,82 m; cao 0,92 m.'},
 LV_BAN_HOC_GO_01: {label:'Bàn học gỗ', observed:'Bàn bốn chân, ngăn kéo giữa, sách xanh, giấy, nghiên mực và bút.', assumptions:'Ảnh LEFT hỏng; phía khuất đối xứng với RIGHT. Sách và chữ trên giấy không có nội dung học tập mới.'},
 LV_BEP_CUI_01: {label:'Bếp củi', observed:'Bếp đất nung trên đế, cửa vòm rỗng, củi, nồi có quai và nắp.', assumptions:'FRONT hỏng; dựng cửa vòm từ hai ảnh nghiêng. Chưa thêm lửa hoặc sát thương.'},
 LV_BO_AM_TRA_01: {label:'Bộ ấm trà', observed:'Khay gỗ chữ nhật, ấm men nâu có vòi/quai/nắp, bốn chén.', assumptions:'FRONT/BACK hỏng; bố trí theo LEFT/RIGHT. Men màu trơn; không tái tạo vết men bằng ảnh phẳng.'},
 LV_CHAU_HOA_01: {label:'Chậu hoa cúc', observed:'Chậu đất nung bo vành, đất, lá xanh và cúc vàng.', assumptions:'Lá/hoa giản lược bằng hình học có độ dày; số lá giảm để phù hợp game.'},
 LV_CHUM_NUOC_01: {label:'Chum nước', observed:'Chum men nâu tròn vai, miệng mở, thành trong, hai tai và mặt nước.', assumptions:'ZIP bị hỏng nhưng phục hồi FRONT/LEFT/BACK có CRC hợp lệ; mặt RIGHT suy đối xứng.'},
 LV_COI_GIA_GAO_01: {label:'Cối giã gạo', observed:'Cối gỗ lõm miệng, thân thắt nhẹ, chày nghiêng đặt trong cối.', assumptions:'Bề dày đáy và lòng cối được suy luận; chưa có tương tác giã.'},
 LV_CUA_GO_01: {label:'Cửa gỗ hai cánh', observed:'Khung dày, hai cánh ghép ván, đai ngang, hai vòng tay nắm.', assumptions:'ZIP phục hồi LEFT/BACK; FRONT/RIGHT thiếu. Bản lề hai bên được suy luận từ cấu tạo cánh. Mở bằng runtime, không có clip GLB.'},
 LV_CUA_SO_GO_01: {label:'Cửa sổ gỗ', observed:'Khung gỗ dày, năm song đứng, một thanh ngang phía trên.', assumptions:'Giữ khe hở thật giữa song; không có kính hoặc cánh đóng trong ảnh.'},
 LV_CUI_XEP_01: {label:'Củi xếp', observed:'Chồng củi chẻ trên hai thanh kê, mặt cắt sáng và vỏ tối.', assumptions:'Số khúc gỗ giảm; bề mặt nứt/vân chỉ giản lược bằng hình học.'},
 LV_DEN_LONG_01: {label:'Đèn lồng tre', observed:'Đèn sáu mặt giấy vàng, khung tre, chóp đan và vòng treo.', assumptions:'Chỉ thêm vật liệu giấy phát sáng nhẹ; chiếu sáng điểm do hệ thống môi trường quyết định.'},
 LV_GANH_TRE_01: {label:'Gánh tre', observed:'Đòn tre hơi cong, hai giỏ mở miệng và dây treo.', assumptions:'Vật thể trưng bày tĩnh, đáy giỏ chạm nền; chưa gắn vào NPC.'},
 LV_GHE_GO_01: {label:'Ghế gỗ dài', observed:'Ghế không tựa, mặt ghép ván, bốn chân, giằng thấp.', assumptions:'Cao ngồi 0,52 m; không có hoạt ảnh ngồi mới.'},
 LV_GIO_TRE_01: {label:'Giỏ tre', observed:'Giỏ đan mở miệng, đáy nhỏ, vành lớn, quai cung.', assumptions:'Nan đan được giản lược thành nan/rãnh nổi có hình học. Đáy và thành có độ dày.'},
 LV_GIUONG_TRE_01: {label:'Giường tre', observed:'Bốn chân tre, đầu giường cao, nan mặt giường, chiếu và gối.', assumptions:'Chiếu dệt giản lược; mặt giường 1,3 × 2,4 m. Không có cơ chế ngủ mới.'},
 LV_KE_BEP_GO_01: {label:'Kệ bếp gỗ', observed:'Kệ ba tầng, giằng chữ X sau lưng, bát/chum/nồi/nia.', assumptions:'LEFT/BACK hỏng; giằng và chiều sâu suy từ FRONT/RIGHT.'},
 LV_NIA_TRE_01: {label:'Nia tre', observed:'Nia tròn phẳng, vành tre quấn dây, lớp thóc.', assumptions:'BACK hỏng; đáy đan suy luận, hạt thóc giản lược. Không tạo vật phẩm thu thập.'},
 LV_RUONG_GO_01: {label:'Rương gỗ', observed:'Hộp ghép ván, bốn chân thấp, nắp phẳng, khóa trước và quai hai bên.', assumptions:'Lòng rương dựng rỗng theo kết cấu hộp; bản lề nắp sau. Không có vật phẩm/phần thưởng bên trong.'},
 LV_THUNG_GO_01: {label:'Thùng gỗ', blocked:'ZIP hỏng, chưa có ảnh đọc được; chưa dựng hoặc xuất GLB thay thế.'},
 LV_TU_GO_01: {label:'Tủ gỗ', observed:'Tủ đứng ghép ván, khung bốn chân và nắp nhô, ảnh hai bên.', assumptions:'FRONT/BACK hỏng và ảnh bên không xác nhận cánh trước; đề xuất hai cánh bản lề và hai đợt trong, cần bổ sung ảnh để đối chiếu.'},
 LV_XE_KEO_GO_01: {label:'Xe kéo gỗ', observed:'Thùng ván mở, hai bánh nan hoa viền sắt, hai càng và chân chống.', assumptions:'Xe tĩnh, không tự thêm cơ chế lái/kéo. Nan bánh và mộng gỗ giản lược.'}
};

function buildFurniture(id, h=defaultHelpers) {
 if (!furnitureNotes[id] || furnitureNotes[id].blocked) return null;
 const {T,P,group,mesh,box,cylinder,sphere,beam,torus,lathe,curved} = h;
 const root=group(id);
 const C={wood:P.wood, dark:P.dark, pale:P.lightWood, bamboo:P.bamboo, clay:P.clay,
  cream:P.cream, iron:P.metal, green:P.green, leaf:P.leaf, ceramic:0x855127};
 const colors=[C.wood,0x936540,0x9d7048];
 let serial=0;
 const name=s=>s+'-'+(++serial);
 function plank(parent,w,d,y,x=0,z=0,shade=0,thickness=.075) {
  const g=group(name('plank'),parent,x,y,z);
  box(g,'solid-wood',w,thickness,d,colors[shade%3]);
  // Sparse raised grain strips add depth without using reference-image planes.
  for(let n=0;n<2;n++) box(g,name('grain'),w*.68,.002,.004,C.dark,(n-.5)*w*.12,thickness/2+.001,(n-.5)*d*.35);
  return g;
 }
 function leg(parent,x,z,height,width=.115) {box(parent,name('leg'),width,height,width,C.dark,x,height/2,z);}
 function timberTable(parent,w,d,height,bench=false) {
  const g=group(name(bench?'bench':'table'),parent);
  const count=bench?3:4, slab=.075;
  for(let n=0;n<count;n++) plank(g,w,d/count-.01,height-slab/2,0,-d/2+d/count*(n+.5),n,slab);
  for(const x of [-w/2+.12,w/2-.12]) for(const z of [-d/2+.075,d/2-.075]) {
   const l=group(name('leg-assembly'),g,x,0,z);
   // Straight foot ensures the exported floor is exactly Y=0.
   leg(l,0,0,height-slab,bench?.11:.13);
   box(l,'mortise-peg',.035,.08,.025,C.pale,0,height*.78,Math.sign(z)*.075);
  }
  for(const z of [-d/2+.09,d/2-.09]) box(g,name('apron'),w-.2,.15,.085,C.wood,0,height-.16,z);
  for(const x of [-w/2+.12,w/2-.12]) box(g,name('cross-brace'),.07,.08,d-.11,C.wood,x,height*.30,0);
  box(g,'long-stretcher',w-.2,.095,.09,C.wood,0,height*.30,0);
  return g;
 }
 function bamboo(parent,a,b,r=.038) {
  beam(parent,name('bamboo-culm'),a,b,r,C.bamboo);
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av),length=v.length();
  for(let n=1;n<Math.ceil(length/.32);n++) {
   const t=n/Math.ceil(length/.32),p=av.clone().lerp(bv,t);
   const ring=cylinder(parent,name('bamboo-node'),r*1.10,r*1.10,.021,C.pale,...p.toArray(),8);
   ring.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());
  }
 }
 function bowl(parent,x,y,z,r=.1,height=.09,color=C.ceramic) {
  const g=group(name('hollow-bowl'),parent,x,y,z);
  lathe(g,'outer-inner-wall',[[0,0],[r*.60,0],[r*.79,height*.30],[r,height],[r*.85,height],[r*.67,height*.32],[r*.55,.023],[0,.023]],color);
  torus(g,'rim',r*.925,r*.068,color,0,height,0);
  return g;
 }
 function pot(parent,x,y,z,r=.25,height=.32,handles=true) {
  const g=group(name('pot'),parent,x,y,z);
  lathe(g,'pot-wall',[[0,0],[r*.63,0],[r*.92,height*.19],[r,height*.57],[r*.84,height*.88],[r*.83,height],[r*.73,height],[r*.78,height*.87],[r*.89,height*.53],[r*.77,height*.19],[0,.04]],C.ceramic);
  torus(g,'pot-rim',r*.80,.019,C.dark,0,height,0);
  lathe(g,'pot-lid',[[0,height+.06],[r*.21,height+.055],[r*.68,height+.015],[r*.86,height],[r*.86,height-.025],[0,height-.008]],C.ceramic);
  sphere(g,'lid-handle',.032,C.dark,0,height+.074,0,1,.7,1);
  if(handles) for(const side of [-1,1]) { const handle=torus(g,name('ear-handle'),r*.21,.018,C.dark,side*r*.91,height*.77,0,0);handle.rotation.y=Math.PI/2; }
  return g;
 }
 function basket(parent,x,y,z,r=.33,height=.32,handle=false) {
  const g=group(name('woven-basket'),parent,x,y,z);
  // Closed-thickness bowl, plus woven rings/staves rather than an opaque cylinder.
  lathe(g,'basket-shell',[[0,0],[r*.72,0],[r*.88,height*.40],[r,height],[r-.026,height],[r*.88-.026,height*.40],[r*.72-.026,.025],[0,.025]],C.bamboo);
  for(let k=0;k<6;k++) {const t=k/5,rr=r*(.73+.27*t);const band=mesh(g,name('weft-band'),new T.TorusGeometry(rr,.009,4,20),k%2?C.pale:C.bamboo,0,.012+(height-.012)*t,0);band.rotation.x=Math.PI/2;}
  for(let k=0;k<16;k++) {
   const a=k/16*Math.PI*2;
   const curve=new T.CatmullRomCurve3([[r*.73*Math.cos(a),.013,r*.73*Math.sin(a)],[r*.88*Math.cos(a),height*.44,r*.88*Math.sin(a)],[r*Math.cos(a),height,r*Math.sin(a)]].map(v=>new T.Vector3(...v)));
   mesh(g,name('woven-stave'),new T.TubeGeometry(curve,6,.009,4,false),C.pale);
  }
  torus(g,'thick-rim',r,.024,C.bamboo,0,height,0);
  torus(g,'base-ring',r*.73,.011,C.dark,0,.015,0);
  if(handle) {
   const pts=[];for(let k=0;k<=12;k++){const a=k/12*Math.PI;pts.push([r*Math.cos(a),height+r*.85*Math.sin(a),0]);}
   curved(g,'arched-handle',pts,.024,C.bamboo);
  }
  return g;
 }
 function teaSet(parent,x=0,y=0,z=0,scale=1) {
  const g=group('tea-service',parent,x,y,z);g.scale.setScalar(scale);
  for(let n=0;n<4;n++) plank(g,.86,.64/4-.006,.023,0,-.32+.16*(n+.5),n,.046);
  for(const s of [-1,1]) {box(g,name('tray-rim'),.9,.07,.033,C.wood,0,.065,s*.32);box(g,name('tray-side'),.033,.07,.64,C.wood,s*.435,.065,0);}
  const t=group('teapot',g,0,.047,-.12);
  lathe(t,'teapot-body',[[0,0],[.075,0],[.115,.06],[.127,.15],[.105,.205],[.080,.22],[.070,.22],[.09,.196],[.11,.13],[.095,.05],[0,.018]],C.ceramic);
  lathe(t,'teapot-lid',[[0,.245],[.022,.243],[.07,.235],[.089,.22],[0,.222]],C.ceramic);
  sphere(t,'lid-knob',.018,C.dark,0,.263,0);
  curved(t,'hollow-spout-shape',[[.075,.07,0],[.135,.11,0],[.18,.17,0],[.206,.217,0]],.025,C.ceramic);
  const spoutMouth=torus(t,'spout-rim',.024,.005,C.dark,.206,.217,0,0);spoutMouth.rotation.y=Math.PI/2-.6;
  const handle=torus(t,'teapot-handle',.083,.016,C.ceramic,-.12,.137,0,0);handle.scale.x=.62;
  for(const [xx,zz] of [[-.25,.13],[-.085,.18],[.13,.17],[.28,-.06]])bowl(g,xx,.047,zz,.062,.075);
  return g;
 }
 function hinge(parent,n,x,y,z,axis,openAngle) {
  const g=group(n,parent,x,y,z);g.userData={motion:'hinge',axis,openAngle,closedAngle:0};return g;
 }
 function paneledLeaf(parent,w,height,centerX,frontZ=0) {
  const n=5;
  for(let i=0;i<n;i++) box(parent,name('door-board'),w/n-.005,height,.075,colors[i%3],centerX-w/2+(i+.5)*w/n,height/2,frontZ);
  for(const x of [centerX-w/2+.03,centerX+w/2-.03]) box(parent,name('leaf-stile'),.055,height,.10,C.dark,x,height/2,frontZ+.015);
  for(const y of [.11,height*.48,height-.10]) box(parent,name('leaf-rail'),w,.085,.105,C.wood,centerX,y,frontZ+.018);
 }

 switch(id) {
 case 'LV_BAN_GO_01': timberTable(root,1.80,.82,.92);break;
 case 'LV_GHE_GO_01': timberTable(root,1.65,.43,.52,true);break;
 case 'LV_BAN_HOC_GO_01': {
  timberTable(root,1.60,.87,1.00);
  box(root,'drawer-front',.61,.19,.07,C.wood,0,.82,.439);
  sphere(root,'drawer-knob',.037,C.dark,0,.82,.50,1,1,.65);
  const book=group('blue-school-book',root,-.48,1.034,-.12);
  box(book,'pages',.29,.035,.37,C.cream);for(const s of [-1,1]) box(book,name('book-cover'),.31,.01,.39,0x3d5664,0,s*.023,0);
  box(root,'blank-learning-paper',.45,.006,.40,C.cream,0,1.004,.045);
  box(root,'inkstone',.24,.04,.14,C.iron,.50,1.025,-.16);
  box(root,'inkwell-hollow',.13,.006,.078,0x252925,.50,1.049,-.16);
  beam(root,'writing-brush',[.37,1.073,-.25],[.68,1.073,-.25],.011,C.pale);
  beam(root,'brush-tip',[.34,1.073,-.25],[.39,1.073,-.25],.017,C.iron);break;
 }
 case 'LV_BEP_CUI_01': {
  box(root,'hearth-plinth',1.14,.095,1.0,C.clay,0,.0475,0);
  box(root,'left-stove-wall',.22,.62,.78,C.clay,-.37,.405,0);
  box(root,'right-stove-wall',.22,.62,.78,C.clay,.37,.405,0);
  box(root,'rear-stove-wall',.56,.62,.18,C.clay,0,.405,-.30);
  const arch=new T.Shape();arch.moveTo(-.48,.095);arch.lineTo(-.48,.715);arch.lineTo(.48,.715);arch.lineTo(.48,.095);arch.lineTo(.185,.095);arch.lineTo(.185,.32);arch.absarc(0,.32,.185,0,Math.PI,false);arch.lineTo(-.185,.095);arch.closePath();
  const geom=new T.ExtrudeGeometry(arch,{depth:.14,bevelEnabled:false,curveSegments:10});
  mesh(root,'arched-open-firebox',geom,C.clay,0,0,.25);
  box(root,'soot-floor',.52,.02,.64,C.iron,0,.11,.0);
  const top=lathe(root,'pot-support-collar',[[.24,.62],[.38,.62],[.38,.715],[.24,.715],[.24,.62]],C.clay);top.scale.z=.94;
  pot(root,0,.67,-.035,.25,.23);
  for(let i=0;i<4;i++)beam(root,name('firewood'),[-.15+i*.10,.16,.53],[-.11+i*.10,.20,-.10],.041,C.pale);
  for(const s of [-1,1])for(let n=0;n<3;n++)box(root,name('visible-brick'),.16,.08,.014,n%2?C.clay:0xb5784b,s*.37,.16+n*.18,.40);break;
 }
 case 'LV_BO_AM_TRA_01':teaSet(root);break;
 case 'LV_CHUM_NUOC_01': {
  lathe(root,'glazed-thick-jar',[[0,0],[.29,0],[.38,.14],[.46,.39],[.47,.56],[.42,.73],[.32,.87],[.31,.96],[.27,.96],[.28,.87],[.38,.72],[.43,.55],[.42,.38],[.33,.15],[0,.065]],C.ceramic);
  torus(root,'rolled-mouth',.295,.028,C.clay,0,.956,0);
  for(const s of [-1,1]) {const ear=torus(root,name('jar-ear'),.052,.021,C.clay,s*.405,.79,0,0);ear.rotation.y=Math.PI/2;}
  cylinder(root,'water-inside',.273,.273,.007,0x374f4b,0,.847,0,24);break;
 }
 case 'LV_COI_GIA_GAO_01': {
  lathe(root,'hollow-wooden-mortar',[[0,0],[.32,0],[.34,.045],[.30,.30],[.31,.53],[.345,.70],[.33,.75],[.27,.75],[.24,.63],[.17,.37],[0,.30]],C.wood);
  torus(root,'mortar-mouth',.302,.028,C.pale,0,.733,0);
  for(let n=0;n<15;n++){const a=n/15*Math.PI*2;curved(root,name('wood-grain'),[[.323*Math.cos(a),.08,.323*Math.sin(a)],[.295*Math.cos(a),.35,.295*Math.sin(a)],[.328*Math.cos(a),.69,.328*Math.sin(a)]],.0038,C.dark);}
  beam(root,'pestle',[.035,.39,0],[.35,1.16,-.04],.055,C.pale);sphere(root,'pestle-end',.053,C.wood,.35,1.16,-.04);break;
 }
 case 'LV_CUA_GO_01': {
  for(const s of [-1,1])box(root,name('door-jamb'),.15,2.75,.24,C.dark,s*.875,1.375,0);
  box(root,'door-lintel',2.02,.17,.28,C.wood,0,2.68,0);box(root,'door-threshold',1.85,.085,.24,C.wood,0,.0425,0);
  for(const s of [-1,1]){
   const leaf=hinge(root,s<0?'door-left-hinge':'door-right-hinge',s*.795,.085,0,'y',s*1.32);
   paneledLeaf(leaf,.79,2.49,-s*.395);
   torus(leaf,'brass-ring-handle',.055,.01,0x9d823c,-s*.69,1.12,.10,0);
   for(const y of [.35,2.10])box(leaf,name('hinge-strap'),.15,.045,.024,C.iron,-s*.05,y,-.067);
  }break;
 }
 case 'LV_CUA_SO_GO_01': {
  for(const s of [-1,1]){box(root,name('window-side'),.12,1.28,.18,C.dark,s*.57,.70,0);box(root,name('window-lintel-sill'),1.42,.13,.22,C.wood,0,.065+(s+1)*.65,0);}
  for(let n=0;n<5;n++)box(root,name('wooden-bar'),.046,1.12,.065,C.wood,-.40+n*.20,.70,0);
  box(root,'upper-crossbar',1.03,.057,.09,C.wood,0,1.065,.005);break;
 }
 case 'LV_CUI_XEP_01': {
  for(const z of [-.37,.37])box(root,name('wood-stack-skid'),1.20,.09,.12,C.dark,0,.045,z);
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
   const x=-.43+col*.285+(row%2)*.027,y=.20+row*.215,len=.77+((row+col)%3)*.038;
   const log=cylinder(root,name('split-log'),.132,.142,len,C.pale,x,y,0,5);log.rotation.x=Math.PI/2;log.rotation.y=(col%2)*.04;
   const bark=beam(root,name('bark-ridge'),[x,y+.09,-len/2],[x,y+.09,len/2],.051,C.dark);bark.scale.x=1.4;
   for(const side of [-1,1]){const end=mesh(root,name('end-grain'),new T.TorusGeometry(.063,.0036,3,12),C.wood,x,y,side*(len/2+.002));end.scale.y=.77;}
  }break;
 }
 case 'LV_DEN_LONG_01': {
  const sides=6,r=.22,bot=.095,top=.63;let paperMaterial=null;
  cylinder(root,'grounded-lantern-foot',.171,.171,.010,C.bamboo,0,.005,0,12);
  torus(root,'lantern-foot',.17,.022,C.bamboo,0,.022,0);
  cylinder(root,'foot-platform',.177,.17,.035,C.bamboo,0,.075,0,6);
  for(let n=0;n<sides;n++){
   const a=n/sides*Math.PI*2,b=(n+1)/sides*Math.PI*2;
   const x=r*Math.cos(a),z=r*Math.sin(a),xx=r*Math.cos(b),zz=r*Math.sin(b);
   bamboo(root,[x,bot,z],[x,top,z],.021);bamboo(root,[x,bot,z],[xx,bot,zz],.018);bamboo(root,[x,top,z],[xx,top,zz],.018);
   const panel=box(root,name('paper-panel'),Math.hypot(xx-x,zz-z)-.019,top-bot-.029,.008,0xe8ca86,(x+xx)/2,(top+bot)/2,(z+zz)/2);panel.rotation.y=-Math.atan2(zz-z,xx-x);
   if(!paperMaterial){paperMaterial=panel.material.clone();paperMaterial.emissive.setHex(0xb58230);paperMaterial.emissiveIntensity=.14;}panel.material=paperMaterial;
   beam(root,name('roof-rib'),[x,top,z],[0,.79,0],.012,C.bamboo);
   for(let k=1;k<4;k++){let t=k/4;beam(root,name('roof-lattice'),[x*(1-t),top+(.79-top)*t,z*(1-t)],[xx*(1-t),top+(.79-top)*t,zz*(1-t)],.007,C.bamboo);}
  }
  torus(root,'hanging-ring',.038,.009,C.iron,0,.832,0,0);break;
 }
 case 'LV_GANH_TRE_01': {
  for(const s of [-1,1]){
   basket(root,s*.68,0,0,.31,.37);
   for(const [xx,zz] of [[-.22,0],[.22,0],[0,-.25],[0,.25]])beam(root,name('suspension-rope'),[s*.68+xx,.39,zz],[s*.68,.91,0],.009,C.dark);
  }
  curved(root,'bent-shoulder-yoke',[[-.88,.94,0],[-.44,.97,0],[0,.995,0],[.44,.97,0],[.88,.94,0]],.030,C.bamboo);
  for(const s of [-1,1])for(let k=0;k<3;k++){const tie=torus(root,name('yoke-lashing'),.036,.006,C.dark,s*.68+(k-1)*.015,.95,0,0);tie.rotation.y=Math.PI/2;}break;
 }
 case 'LV_GIO_TRE_01':basket(root,0,0,0,.37,.37,true);break;
 case 'LV_GIUONG_TRE_01': {
  const w=1.30,d=2.40;
  for(const x of [-w/2,w/2])for(const z of [-d/2,d/2]){const ht=z<0?1.03:.61;bamboo(root,[x,.06,z],[x,ht,z],.060);cylinder(root,name('flat-foot'),.057,.060,.13,C.bamboo,x,.065,z,10);}
  for(const x of [-w/2,w/2]){bamboo(root,[x,.49,-d/2],[x,.49,d/2],.057);bamboo(root,[x,.21,-d/2],[x,.21,d/2],.030);}
  for(const z of [-d/2,d/2]){bamboo(root,[-w/2,.49,z],[w/2,.49,z],.058);bamboo(root,[-w/2,.19,z],[w/2,.19,z],.030);}
  for(let n=0;n<24;n++)bamboo(root,[-w/2+.045,.525,-d/2+.07+n*.098],[w/2-.045,.525,-d/2+.07+n*.098],.022);
  box(root,'woven-sleeping-mat',1.19,.024,2.19,C.bamboo,0,.558,0);
  for(let n=0;n<40;n++)box(root,name('mat-weft'),1.17,.006,.009,n%3?C.pale:C.bamboo,0,.573,-1.04+n*.053);
  for(const x of [-.52,.52])box(root,name('mat-border'),.032,.007,2.18,C.dark,x,.575,0);
  bamboo(root,[-w/2,.98,-d/2],[w/2,.98,-d/2],.042);for(let n=0;n<4;n++)bamboo(root,[-.43+n*.285,.59,-d/2],[-.43+n*.285,.95,-d/2],.020);
  sphere(root,'cloth-pillow',.40,C.cream,0,.638,-.82,1.19,.21,.39);break;
 }
 case 'LV_KE_BEP_GO_01': {
  const w=1.20,d=.50,height=1.48;
  for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])leg(root,x,z,height,.085);
  for(const y of [.15,.72,1.32]) for(let n=0;n<3;n++)plank(root,w+.01,d/3-.006,y,0,-d/2+d/3*(n+.5),n,.058);
  beam(root,'rear-diagonal-one',[-.55,.19,-.27],[.55,1.31,-.27],.029,C.dark);beam(root,'rear-diagonal-two',[.55,.19,-.29],[-.55,1.31,-.29],.029,C.dark);
  basket(root,0,.18,0,.22,.09);
  pot(root,0,.75,0,.18,.19);
  for(let n=0;n<3;n++)bowl(root,-.30,1.35+n*.036,0,.09,.055,C.cream);
  const jar=pot(root,.32,1.35,0,.105,.16,false);jar.name='small-jar-on-shelf';break;
 }
 case 'LV_NIA_TRE_01': {
  cylinder(root,'woven-tray-bottom',.56,.54,.028,C.bamboo,0,.014,0,32);torus(root,'woven-tray-rim',.55,.035,C.bamboo,0,.045,0);
  for(let n=0;n<17;n++){const z=-.49+n*.06125,w=2*Math.sqrt(Math.max(0,.515*.515-z*z));box(root,name('woven-strip'),w,.008,.021,n%2?C.pale:C.bamboo,0,.032,z);}
  for(let n=0;n<90;n++){const a=n*2.3999632,r=.45*Math.sqrt((n+.5)/90),grain=box(root,name('rice-grain'),.027,.009,.010,0xd8b568,r*Math.cos(a),.045,r*Math.sin(a));grain.rotation.y=a;}
  for(let n=0;n<24;n++){const a=n/24*Math.PI*2;beam(root,name('rim-tie'),[.523*Math.cos(a),.048,.523*Math.sin(a)],[.58*Math.cos(a),.048,.58*Math.sin(a)],.006,C.dark);}break;
 }
 case 'LV_RUONG_GO_01': {
  const w=1.10,d=.72,height=.67;
  for(const x of [-w/2+.04,w/2-.04])for(const z of [-d/2+.04,d/2-.04])leg(root,x,z,height,.075);
  box(root,'chest-bottom',w-.04,.065,d-.04,C.dark,0,.11,0);
  for(let n=0;n<4;n++){const y=.19+n*.119;for(const s of [-1,1]){box(root,name('chest-front-back-board'),w-.07,.115,.048,colors[n%3],0,y,s*(d/2-.025));box(root,name('chest-side-board'),.048,.115,d-.08,colors[n%3],s*(w/2-.025),y,0);}}
  const lid=hinge(root,'chest-lid-hinge',0,height,-d/2,'x',-1.28);
  for(let n=0;n<4;n++)plank(lid,w+.075,(d+.055)/4-.004,.036,0,(d+.055)/4*(n+.5)-.022,n,.071);
  box(lid,'front-lock-strap',.052,.15,.029,C.iron,0,-.055,d+.018);
  for(const s of [-1,1]){const handle=torus(root,name('chest-side-handle'),.047,.010,C.iron,s*(w/2+.015),.42,0,0);handle.rotation.y=Math.PI/2;box(root,name('back-hinge'),.085,.068,.025,C.iron,s*.35,.62,-d/2-.012);}break;
 }
 case 'LV_TU_GO_01': {
  const w=1.10,d=.66,height=2.08;
  for(const x of [-w/2+.04,w/2-.04])for(const z of [-d/2+.035,d/2-.035])leg(root,x,z,height,.085);
  for(const x of [-w/2+.026,w/2-.026])for(let n=0;n<4;n++)box(root,name('cabinet-side-board'),.053,1.81,d/4-.006,colors[n%3],x,1.075,-d/2+(n+.5)*d/4);
  for(let n=0;n<7;n++)box(root,name('cabinet-back-board'),w/7-.006,1.80,.045,colors[n%3],-w/2+(n+.5)*w/7,1.075,-d/2+.02);
  for(const y of [.18,.85,1.44])box(root,name('interior-shelf'),w-.10,.051,d-.06,C.wood,0,y,0);
  box(root,'cabinet-crown',w+.11,.092,d+.10,C.wood,0,height-.022,0);
  for(const s of [-1,1]){
   const leaf=hinge(root,s<0?'cabinet-left-door':'cabinet-right-door',s*(w/2-.07),.20,d/2+.010,'y',s*1.31);
   paneledLeaf(leaf,w/2-.067,1.76,-s*(w/4-.034));
   torus(leaf,'cabinet-pull',.033,.008,C.iron,-s*(w/2-.125),.82,.078,0);
  }break;
 }
 case 'LV_XE_KEO_GO_01': {
  const w=1.12,d=1.55,deck=.73;
  for(let n=0;n<6;n++)plank(root,w,d/6-.007,deck,0,-d/2+d/6*(n+.5),n,.075);
  for(let n=0;n<3;n++)for(const side of [-1,1]){box(root,name('cart-side-board'),.056,.15,d,colors[n%3],side*w/2,deck+.11+n*.155,0);box(root,name('cart-front-back-board'),w,.15,.056,colors[n%3],0,deck+.11+n*.155,side*d/2);}
  for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(root,name('cart-corner-post'),.092,.62,.092,C.dark,x,deck+.26,z);
  beam(root,'cart-axle',[-.83,.58,-.04],[.83,.58,-.04],.07,C.dark);
  for(const side of [-1,1]){
   const wheel=group(name('spoked-wheel'),root,side*.70,.58,-.04);wheel.rotation.y=Math.PI/2;
   torus(wheel,'wooden-rim',.53,.05,C.wood,0,0,0,0);torus(wheel,'iron-tyre',.565,.015,C.iron,0,0,0,0);
   const hub=cylinder(wheel,'wheel-hub',.10,.10,.16,C.dark,0,0,0,12);hub.rotation.x=Math.PI/2;
   for(let n=0;n<10;n++){const a=n/10*Math.PI*2;beam(wheel,name('wheel-spoke'),[0,0,0],[Math.cos(a)*.51,Math.sin(a)*.51,0],.027,C.wood);}
   beam(root,name('pulling-shaft'),[side*.46,.65,.48],[side*.49,.53,2.16],.045,C.wood);
   sphere(root,name('shaft-rounded-grip'),.048,C.dark,side*.49,.53,2.16,1,1,1.9);
  }
  box(root,'standing-leg',.10,.70,.10,C.dark,0,.35,.64);break;
 }
 case 'LV_CHAU_HOA_01': {
  lathe(root,'terracotta-flowerpot',[[0,0],[.21,0],[.235,.055],[.285,.27],[.292,.43],[.277,.46],[.254,.46],[.253,.40],[.248,.27],[.20,.06],[0,.06]],C.clay);
  torus(root,'thick-pot-lip',.282,.028,C.clay,0,.448,0);cylinder(root,'pot-soil',.252,.24,.020,C.dark,0,.405,0,20);
  for(let n=0;n<9;n++){
   const a=n*2.3999632,r=.09+(n%3)*.080,x=r*Math.cos(a),z=r*Math.sin(a),y=.66+(n%4)*.065;
   beam(root,name('flower-stem'),[0,.405,0],[x,y,z],.008,C.green);
   for(let k=0;k<3;k++){const t=.4+k*.16,xx=x*t,zz=z*t,yy=.405+(y-.405)*t;const leaf=sphere(root,name('thick-leaf'),.077,k%2?C.green:C.leaf,xx+Math.cos(a+k)*.05,yy,zz+Math.sin(a+k)*.05,1.35,.18,.65);leaf.rotation.y=-a-k;leaf.rotation.z=.25;}
   sphere(root,name('flower-heart'),.033,0xe5a727,x,y,z,1,.58,1);
   for(let p=0;p<9;p++){const angle=p/9*Math.PI*2,petal=mesh(root,name('yellow-petal'),new T.SphereGeometry(.037,8,4),0xf1c13a,x+.048*Math.cos(angle),y+.004,z+.048*Math.sin(angle));petal.scale.set(1.5,.22,.62);petal.rotation.y=-angle;}
  }break;
 }
 default: return null;
 }
 root.userData.assetId=id;
 root.userData.referenceBased=true;
 root.userData.generator='scripts/lang-viet-assets/furniture.cjs';
 root.userData.geometryNotes=furnitureNotes[id];
 root.updateMatrixWorld(true);
 return root;
}

module.exports={buildFurniture,furnitureNotes};
