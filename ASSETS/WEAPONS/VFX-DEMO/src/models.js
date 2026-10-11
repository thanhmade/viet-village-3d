/**
 * VIET VILLAGE 3D — procedural weapon previews.
 * Exported as a pure factory so it can use the same THREE version as the host game.
 * The five reference PNGs are orthographic 2D concept art, not 3D geometry.
 */
export const WEAPON_DATA = [
  {id:'sword', name:'Long Văn Kiếm', category:'Kiếm', element:'Băng lam', color:'#60dcff', rgb:0x67dfff, desc:'Trảm kích ánh bạc, kiếm khí lưỡi liềm và kiếm trận băng lam.', attacks:['Ngân quang trảm','Song nguyệt kiếm khí','Thiên kiếm băng trận'], ref:'references/01-kiem.png'},
  {id:'staff', name:'Long Vân Côn', category:'Côn', element:'Kim – Thổ', color:'#eec66e', rgb:0xffd47a, desc:'Côn xoay phá giáp, luồng khí xoắn và chấn động lan trên mặt đất.', attacks:['Phá phong côn','Long quyển côn pháp','Thiên địa chấn'], ref:'references/02-con.png'},
  {id:'axe', name:'Huyền Thiết Phủ', category:'Phủ / Rìu', element:'Hỏa', color:'#ff9763', rgb:0xff8744, desc:'Phủ quét hỏa quang, tạo dư chấn và cột lửa va chạm.', attacks:['Liệt hỏa phách','Toái địa phủ','Hỏa thiên khai sơn'], ref:'references/03-riu.png'},
  {id:'spear', name:'Xích Anh Thương', category:'Thương', element:'Phong – Lôi', color:'#70ffe8', rgb:0x62ffe4, desc:'Đâm xuyên cực nhanh, thương ảnh liên kích và xuyên phá năng lượng.', attacks:['Nhất điểm xuyên','Tam liên thương ảnh','Lôi long phá trận'], ref:'references/04-thuong.png'},
  {id:'bow', name:'Kim Long Cung', category:'Cung', element:'Phong – Mộc', color:'#aaff89', rgb:0xa8ff83, desc:'Mũi tên ánh sáng, liên châu tiễn và vũ tiễn nổ trên mục tiêu.', attacks:['Truy phong tiễn','Tam tinh liên châu','Vạn tiễn quy tông'], ref:'references/05-cung.png'}
];

export function createWeapon(THREE, type) {
  const group = new THREE.Group();
  group.name = `WEAPON_${type.toUpperCase()}`;
  const gold = mat(THREE,0xa98548,.63,.35);
  const darkGold = mat(THREE,0x5a4228,.7,.27);
  const wood = mat(THREE,0x513023,.83,.13);
  const steel = mat(THREE,0xd0deeb,.29,.88);
  const steelDark = mat(THREE,0x70818e,.35,.72);
  const grip = mat(THREE,0x171619,.92,.07);
  const wrap = mat(THREE,0x302327,.86,.05);
  const red = mat(THREE,0xa12235,.85,.05);
  const put=(mesh,parent=group)=>{ parent.add(mesh);mesh.castShadow=true;mesh.receiveShadow=true;return mesh; };
  const cylinder=(r1,r2,h,x,y,z,material,segments=14)=>{
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);
    m.position.set(x,y,z); return put(m);
  };
  const ball=(r,x,y,z,material)=>{let m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),material);m.position.set(x,y,z);return put(m);};
  const band=(r,y,material=gold,w=.05)=>cylinder(r,r,w,0,y,0,material,22);
  const ribbon=(points,r,material)=>{
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return put(new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*3),r,5,false),material));
  };
  const blade=(coords,metal=steel,depth=.045)=>{
    const shape=new THREE.Shape();
    shape.moveTo(coords[0][0],coords[0][1]);
    coords.slice(1).forEach(p=>shape.lineTo(p[0],p[1]));
    shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.018,bevelSize:.016,bevelSegments:1,steps:1,curveSegments:3});
    geo.translate(0,0,-depth/2);
    const mesh=new THREE.Mesh(geo,metal);return put(mesh);
  };
  const knot=(y,r=.09)=>{
    const pts=[];
    for(let i=0;i<=24;i++){let t=i/24*Math.PI*2;pts.push([Math.sin(t)*r,y+(i/24)*.23,Math.cos(t)*r]);}
    ribbon(pts,.010,wrap);
  };
  if(type==='sword'){
    // Straight etched silver blade, ornate cross guard, black grip, brass pommel.
    blade([[-.16,.52],[-.145,1.95],[-.055,2.45],[0,2.60],[.055,2.45],[.145,1.95],[.16,.52]],steel,.04);
    blade([[-.035,.58],[-.018,2.36],[0,2.48],[.018,2.36],[.035,.58]],steelDark,.005);
    cylinder(.071,.073,.59,0,.24,0,grip);
    for(let i=0;i<13;i++){
      const y=-.03+i*.042;
      ribbon([[-.074,y,-.028],[0,y+.025,.077],[.074,y+.04,-.026]],.009,darkGold);
    }
    cylinder(.12,.10,.10,0,-.09,0,gold); ball(.13,0,-.13,0,gold);
    const guard=new THREE.Mesh(new THREE.BoxGeometry(.77,.12,.15),gold);
    guard.position.y=.53;put(guard);
    ball(.16,0,.55,.003,gold);
    [-1,1].forEach(s=>{ball(.09,s*.40,.53,0,gold);ball(.055,s*.27,.60,.04,darkGold);});
    const seal=new THREE.Mesh(new THREE.TorusGeometry(.075,.018,6,20),darkGold);seal.position.set(0,.56,.089);put(seal);
    band(.09,.43,gold,.04);
    for(let i=0;i<5;i++){
      const x=(i-2)*.026;
      ribbon([[x,.69,.054],[x*.65,.83,.055],[x*.9,1.02,.055]],.0035,darkGold);
    }
  }
  else if(type==='staff'){
    cylinder(.09,.087,2.55,0,1.25,0,wood,18);
    for(let y of [.06,.26,.85,1.18,1.52,2.10,2.46])band(.101,y,gold,.05);
    cylinder(.105,.105,.14,0,2.58,0,gold);
    cylinder(.112,.102,.15,0,-.02,0,gold);
    for(let i=0;i<16;i++){
      const a=i/16*Math.PI*2;
      const pts=[];for(let j=0;j<15;j++){
        const y=.14+j/14*2.35;
        const t=a+y*4.1;pts.push([Math.cos(t)*.0905,y,Math.sin(t)*.0905]);
      }
      if(i%3===0)ribbon(pts,.004,darkGold);
    }
    for(let i=0;i<13;i++){
      let y=1.1+i*.029;
      ribbon([[.093,y,0],[0,y+.026,.095],[-.09,y+.038,0],[0,y+.050,-.095]],.010,grip);
    }
    for(let i=0;i<3;i++){
      const t=i*2.1;ribbon([[Math.cos(t)*.11,2.40,Math.sin(t)*.11],[Math.cos(t+.7)*.11,2.53,Math.sin(t+.7)*.11]],.013,darkGold);
    }
  }
  else if(type==='axe'){
    cylinder(.081,.087,2.48,0,1.22,0,wood);
    for(let y of [.06,.38,1.23,1.90,2.26,2.46])band(.103,y,gold,.052);
    for(let i=0;i<17;i++){
      const y=.24+i*.039;
      ribbon([[-.09,y,-.025],[0,y+.029,.095],[.09,y+.045,-.02]],.009,grip);
    }
    // Asymmetric wide silver double-headed axe silhouette, golden centerpiece.
    blade([[-.16,2.48],[-.50,2.39],[-.89,2.65],[-.77,2.27],[-.83,1.88],[-.48,2.08],[-.15,2.12],[.16,2.12],[.48,2.08],[.83,1.88],[.77,2.27],[.89,2.65],[.50,2.39],[.16,2.48]],steelDark,.10);
    [-1,1].forEach(s=>{
      blade([[s*.54,2.17],[s*.82,1.94],[s*.92,2.64],[s*.59,2.47]],steel,.012);
      ball(.047,s*.37,2.29,.08,gold);
    });
    cylinder(.19,.19,.45,0,2.27,0,gold);
    const star=new THREE.Mesh(new THREE.TorusGeometry(.095,.021,8,12),darkGold);
    star.rotation.x=Math.PI/2;star.position.set(0,2.30,.17);put(star);
    ball(.065,0,2.30,.19,gold);
    ball(.10,0,-.03,0,gold);
  }
  else if(type==='spear'){
    cylinder(.063,.07,2.37,0,1.12,0,wood,12);
    for(let y of [.09,.25,.72,1.40,2.13])band(.081,y,gold,.035);
    for(let i=0;i<14;i++){
      const y=.16+i*.038;
      ribbon([[-.070,y,0],[0,y+.019,.070],[.070,y+.03,0]],.006,wrap);
    }
    cylinder(.083,.077,.17,0,2.39,0,gold);
    blade([[-.10,2.49],[-.17,2.68],[-.08,2.79],[0,3.11],[.08,2.79],[.17,2.68],[.10,2.49]],steel,.036);
    blade([[-.019,2.58],[0,3.04],[.019,2.58]],steelDark,.005);
    // Red silk tassel fibers below the spearhead.
    for(let i=0;i<19;i++){
      const a=i*2.399,r=.053+(i%3)*.016;
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      ribbon([[x,2.48,z],[x*1.45,2.30,z*1.4],[x*1.8+.016*Math.sin(i),2.02-(i%4)*.06,z*1.35]],.0045,red);
    }
    ball(.06,0,-.09,0,gold);
  }
  else if(type==='bow'){
    const points=[];
    for(let i=0;i<=28;i++){
      const y=i/28*2.66, t=i/28;
      const x=.10+.32*Math.sin(Math.PI*t)+.08*Math.sin(3*Math.PI*t);
      points.push([x,y,0]);
    }
    ribbon(points,.065,wood);
    const goldMat=gold;
    for(const pos of [0,.12,.44,1.14,1.42,2.23,2.55,2.67]){
      const t=pos/2.66, x=.10+.32*Math.sin(Math.PI*t)+.08*Math.sin(3*Math.PI*t);
      ball(pos===0||pos===2.67?.085:.072,x,pos,0,goldMat);
    }
    // Braided center grip & string; string slightly offset for clear silhouette.
    for(let i=0;i<15;i++){
      let y=1.09+i*.022,t=y/2.66;
      let x=.10+.32*Math.sin(Math.PI*t)+.08*Math.sin(3*Math.PI*t);
      ribbon([[x-.05,y,0],[x,y+.012,.065],[x+.05,y+.018,0]],.010,grip);
    }
    const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.10,.08,0),new THREE.Vector3(-.15,1.33,0),new THREE.Vector3(.10,2.62,0)]),new THREE.LineBasicMaterial({color:0xcfc7b8}));put(string);
    // Light decorative lines on the bow limbs.
    for(let s of [0,1]){
      let pts=[];
      for(let i=0;i<=13;i++){
        const t=s===0?i/13*.35:.65+i/13*.35;
        const y=t*2.66;pts.push([.10+.32*Math.sin(Math.PI*t)+.08*Math.sin(3*Math.PI*t)+.065,y,.012]);
      }
      ribbon(pts,.008,gold);
    }
  }
  group.userData = {type, centerY:type==='spear'?1.48:1.25};
  return group;
}
function mat(THREE,color,roughness,metalness){return new THREE.MeshStandardMaterial({color,roughness,metalness,side:THREE.DoubleSide});}
