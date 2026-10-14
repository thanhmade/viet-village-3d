// Inventory inspected from the actual assets in CAP-NHAT. A missing model has no guessed URL.
export const characterModels=Object.freeze([
 Object.freeze({id:'male-base',avatarId:'male',label:'Nam',available:true,url:'../CHARACTERS/PLAYER/MALE/PLAYER_BASE_MALE_GLB.glb',
  height:2.35,visual:Object.freeze({modelId:'male-base',height:2.35,forwardYaw:0}),
  outfit:'Bộ tân thủ mặc định',meshCount:1,materialCount:1,morphTargets:0,bones:65,customization:Object.freeze({})}),
 Object.freeze({id:'female-base',avatarId:'female',label:'Nữ',available:true,defaultChoice:true,url:'../CHARACTERS/PLAYER/FEMALE/PLAYER_BASE_FEMALE_GLB.glb',
  height:2.35,visual:Object.freeze({modelId:'female-base',height:2.35,forwardYaw:0}),
  outfit:'Bộ tân thủ mặc định',meshCount:1,materialCount:1,morphTargets:0,bones:65,customization:Object.freeze({})})
]);
// The existing game/controller uses classic scripts; both readers share this
// frozen inventory, so preview and live avatar cannot drift to different URLs.
globalThis.VietVillageCharacterModels=characterModels;
export const appearanceGroups=Object.freeze(['Tóc','Khuôn mặt','Mắt','Mũi','Miệng','Tai','Độ tuổi','Chiều cao']);
