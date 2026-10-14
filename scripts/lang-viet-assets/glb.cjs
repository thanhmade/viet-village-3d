'use strict';
// Small deterministic glTF 2.0 writer for these static, unrigged PBR assets.
// No external URIs, paid conversion, skeleton or image-plane reconstruction.
module.exports=function encodeGLB(root){
 const json={asset:{version:'2.0',generator:'Viet Village reference reconstruction v1'},scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]};
 const pieces=[],materialIds=new Map();let length=0;
 function accessor(attribute){
  const arr=new Float32Array(attribute.array),data=Buffer.from(arr.buffer),index=json.accessors.length;
  const min=Array(attribute.itemSize).fill(Infinity),max=Array(attribute.itemSize).fill(-Infinity);
  for(let i=0;i<arr.length;i++){if(!Number.isFinite(arr[i]))throw Error('Non-finite geometry');min[i%attribute.itemSize]=Math.min(min[i%attribute.itemSize],arr[i]);max[i%attribute.itemSize]=Math.max(max[i%attribute.itemSize],arr[i]);}
  json.bufferViews.push({buffer:0,byteOffset:length,byteLength:data.length,target:34962});pieces.push(data);length+=data.length;
  json.accessors.push({bufferView:json.bufferViews.length-1,componentType:5126,count:attribute.count,type:'VEC'+attribute.itemSize,min,max});return index;
 }
 function mat(m){if(materialIds.has(m.uuid))return materialIds.get(m.uuid);const i=json.materials.length;materialIds.set(m.uuid,i);
  const result={name:'mat-'+m.color.getHexString(),pbrMetallicRoughness:{baseColorFactor:[m.color.r,m.color.g,m.color.b,1],metallicFactor:m.metalness,roughnessFactor:m.roughness},doubleSided:true};
  if(m.emissive&&(m.emissive.r||m.emissive.g||m.emissive.b))result.emissiveFactor=[m.emissive.r,m.emissive.g,m.emissive.b].map(v=>v*m.emissiveIntensity);
  json.materials.push(result);return i;}
 function node(o){const i=json.nodes.length,n={name:o.name||'part',translation:o.position.toArray(),rotation:o.quaternion.toArray(),scale:o.scale.toArray()};json.nodes.push(n);
  if(Object.keys(o.userData).length)n.extras=o.userData;
  if(o.isMesh){if(o.geometry.index)throw Error('Compact geometry before GLB export');n.mesh=json.meshes.length;json.meshes.push({name:o.name,primitives:[{attributes:{POSITION:accessor(o.geometry.attributes.position),NORMAL:accessor(o.geometry.attributes.normal)},material:mat(o.material),mode:4}]});}
  if(o.children.length)n.children=o.children.map(node);return i;}
 root.updateMatrixWorld(true);node(root);json.buffers[0].byteLength=length;
 const raw=Buffer.from(JSON.stringify(json)),pad=(4-raw.length%4)%4,js=Buffer.concat([raw,Buffer.alloc(pad,32)]),bin=Buffer.concat(pieces),total=12+8+js.length+8+bin.length;
 const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(total,8);jh.writeUInt32LE(js.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 return Buffer.concat([header,jh,js,bh,bin]);
};
