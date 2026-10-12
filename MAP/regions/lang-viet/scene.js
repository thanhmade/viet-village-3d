(function(global){
  'use strict';
  // Register the existing walkable village; keep its geometry, lights and house portals intact.
  global.createLangVietRegion=function({THREE,root,canWalk,groundHeight,roofHeight,cameraBounds,water,wetMaterials=[]}){
    if(!THREE||!root?.isObject3D||typeof canWalk!=='function'||typeof groundHeight!=='function'||typeof roofHeight!=='function')
      throw new Error('Thiếu cảnh 3D hoặc cấu hình di chuyển của Làng Việt.');

    const references=[
      ['1791683938686_358328111282379811_g838016562893130619_efdb7057f693069b579fb0623b2e26ab.jpg','Chính diện từ cổng làng'],
      ['1791683938746_358328111282379811_g838016562893130619_5be600a3ffb9f2cbdef78441f0298152.jpg','Phía sau đình làng'],
      ['1791683938800_358328111282379811_g838016562893130619_21a11f87c8097995d4d08d2678246854.jpg','Hông bên lũy tre'],
      ['1791683938885_358328111282379811_g838016562893130619_df44917d2b4ac61ca9802a56d21a9d84.jpg','Hông bên ao sen'],
      ['1791683938969_358328111282379811_g838016562893130619_60b1f7d3c0bb3522413686cedeac6b11.jpg','Toàn cảnh phối cảnh']
    ].map(([filename,label])=>({path:'../MAP/regions/lang-viet/references/'+filename,label}));

    const landmark=(id,name,type,x,y,z)=>({id,name,type,position:{x,y,z}});
    const houses=[[-11,-10],[-11,0],[-11,10],[11,-10],[11,0],[11,10]];
    const landmarks=[
      landmark('cong-lang','Cổng làng','gate',0,.24,24),
      landmark('dinh-lang','Đình làng','temple',0,.24,-19),
      landmark('cay-da','Cây đa và sân trung tâm','tree',0,.25,0),
      ...houses.map(([x,z],index)=>landmark('nha-'+String(index+1).padStart(2,'0'),'Nhà dân '+(index+1),'house',x,.24,z)),
      landmark('vuon-rau','Vườn rau và giàn tre','garden',-15,.32,17),
      landmark('ao-sen','Ao sen','pond',15,.34,18),
      landmark('cau-go','Cầu gỗ qua ao','bridge',15,1.70,18),
      landmark('luy-tre','Lũy tre phía trái','bamboo',-21.3,.3,-3.5)
    ];

    root.userData.regionId='lang-viet';
    root.userData.regionName='Làng Việt';
    root.userData.networkMapId='village';
    root.userData.preservedVillageGeometry=true;
    root.userData.referenceImageCount=references.length;
    if(!root.name)root.name='region-lang-viet';

    const spawn={x:0,y:.3,z:16.5};
    const spawns=Object.freeze({'village-entry':spawn,'from-dong-tre':{x:5,y:.3,z:16.5}});
    // Keep the original connections and arrival IDs; both now share one physical ring.
    const choices=Object.freeze([
      Object.freeze({id:'dong-tre',label:'Đồng Tre',targetMapId:'ngoai-lang-dong-tre',targetSpawnId:'from-lang-viet'}),
      Object.freeze({id:'lang-tan-thu',label:'Làng Tân Thủ',targetMapId:'lang-tan-thu',targetSpawnId:'village-entry'})
    ]);
    return {
      id:'lang-viet',networkMapId:'village',name:'Làng Việt',root,
      spawn,spawns,manualPortals:[],defaultSpawnId:'village-entry',
      portal:{id:'village-travel',activation:'select',x:0,y:.335,z:20,radius:.8,choices},
      canWalk,groundHeight,roofHeight,cameraBounds,
      waterMeshes:water?[water]:[],wetMaterials,landmarks,references
    };
  };
})(typeof window==='undefined'?globalThis:window);
