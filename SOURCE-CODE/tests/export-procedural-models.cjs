// Export derived Object3D JSON from the existing procedural code, without a GPU.
const fs=require('fs'),path=require('path');
const {run,root}=require('./harness.cjs')();
function output(rel,expression,label){
 const json=run(`(()=>{const o=${expression};o.updateMatrixWorld(true);return o.toJSON();})()`);
 json.metadata.exportNote=label;
 const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(json));
 console.log(rel,fs.statSync(p).size,'bytes');
}
output('CHARACTERS/models/player-procedural.three.json','(()=>{let c=player.clone();c.visible=true;return c;})()','Mô hình khối đơn giản đang có trong mã; không phải mô hình cậu bé của ảnh tham chiếu.');
output('MAP/models/village-procedural.three.json','world','Map dựng bằng mã; gồm hình học đã gộp, instancing và đèn nhà; không chứa sky và mặt trời từ scene.');
output('BUILDINGS/models/house-procedural.three.json','(()=>{let c=housePreview.clone();c.visible=true;return c;})()','Nhà xem riêng có tọa độ X=11 của bản đang chạy.');
output('INTERIORS/models/interior-procedural.three.json','(()=>{let c=interiorRoot.clone();c.visible=true;return c;})()','Nội thất mẫu dùng chung cho sáu nhà; root tách biệt với map.');
run('world=new THREE.Group();village.batches=new Map();seed=812;entrance();flushInstances();');
output('BUILDINGS/models/gate-procedural.three.json','world','Cổng tái dựng từ đúng hàm entrance/gateRoof hiện có; cây trang trí dùng seed 812. Bản dẫn xuất lúc xuất dự án, không phải tài nguyên tác giả dạng GLB.');
