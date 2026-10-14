'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'MAP/regions/lang-viet/assets-3d.json'),'utf8'));
const asset=catalog.assets.find(a=>a.id==='LV_AO_SEN_01');
const expected=[
 ['LV_AO_SEN_01.glb','315392499f46b855a4cb4d41ca17ee75eeabfb597f6228cde841a734379a965d',243936],
 ['LV_AO_SEN_01_LOD1.glb','14d3d3569ecd8303a1f4040109676aaa19e4cbb6962d4545d59939b404d08765',93864]
];
test('pond catalog selects the supplied GLBs, retaining alternatives and exact source hashes',()=>{
 assert.equal(asset.sourceType,'imported-glb');assert.equal(asset.strictModel,true);
 assert.equal(asset.url,'../MAP/models/lang-viet/LV_AO_SEN_01_3D/'+expected[0][0]);
 assert.equal(asset.lod1Url,'../MAP/models/lang-viet/LV_AO_SEN_01_3D/'+expected[1][0]);
 assert.equal(asset.sha256,expected[0][1]);assert.equal(asset.lod1.sha256,expected[1][1]);
 assert.equal(asset.referenceConvention.RIGHT,'-X');
});
for(const [name,sha,triangles] of expected)test(name+' retains real geometry, embedded textures and named animation tracks',()=>{
 const bytes=fs.readFileSync(path.join(root,'MAP/models/lang-viet/LV_AO_SEN_01_3D',name));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha,'Must not regenerate or mutate supplied model');
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
 const jsonLength=bytes.readUInt32LE(12),g=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
 const binary=bytes.subarray(28+jsonLength);
 assert.equal(g.meshes.length,55);assert.equal(g.materials.length,5);assert.equal(g.skins?.length||0,0);
 assert.deepEqual(g.animations.map(a=>a.name).sort(),['WATER_RIPPLE','WIND_LIGHT','WIND_STRONG']);
 assert.equal(g.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+g.accessors[p.indices??p.attributes.POSITION].count/3,0),0),triangles);
 assert.equal(g.images.length,2);
 for(const image of g.images){
  assert.equal(image.uri,undefined);assert.equal(image.mimeType,'image/png');
  const view=g.bufferViews[image.bufferView],png=binary.subarray(view.byteOffset,view.byteOffset+view.byteLength);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),256);assert.equal(png.readUInt32BE(20),256);
 }
 assert(g.buffers.every(b=>!b.uri));
 assert(g.nodes.some(n=>n.name==='WATER_SURFACE'));assert(g.nodes.some(n=>n.name==='EARTH_BANK'));
 assert(g.animations.find(a=>a.name==='WATER_RIPPLE').channels.every(c=>c.target.path==='weights'));
 for(const clip of g.animations.filter(a=>a.name.startsWith('WIND_')))assert(clip.channels.every(c=>c.target.path==='rotation'));
});
