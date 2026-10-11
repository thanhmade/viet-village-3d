const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=function createHarness({authenticated=true}={}){
const root=path.resolve(__dirname,'../..');
class Element{constructor(id){this.id=id;this.style={};this.children=[];this.textContent='';this.disabled=false;this.tagName='DIV';this.classes=new Set(['quiz','levels','complete','referenceGallery','roomPanel'].includes(id)?['hidden']:[]);this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x)};this.value=id==='quality'?'auto':id==='mode'?'core':'';}append(e){this.children.push(e)}replaceChildren(){this.children=[]}addEventListener(){}getContext(){return new Proxy({},{get:()=>()=>{}})}getBoundingClientRect(){return {left:0,top:0,width:112,height:112}}setPointerCapture(){}}
const els=new Map();const document={getElementById:id=>{if(!els.has(id))els.set(id,new Element(id));return els.get(id)},createElement:()=>new Element('button'),body:new Element('body'),addEventListener(){},documentElement:new Element('html')};
const stored=new Map();const context={console,document,innerWidth:1200,innerHeight:800,devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener(){},requestAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},confirm:()=>true,localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)}};context.window=context;context.testAuthAllowed=authenticated;context.VietVillageAuth={isAuthenticated:()=>context.testAuthAllowed,enterGame:callback=>{if(context.testAuthAllowed)callback();}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'ASSETS/vendor/three.min.js'),'utf8'),context);
vm.runInContext(`THREE.WebGLRenderer=class{constructor(){this.domElement=document.createElement('canvas');this.shadowMap={};}setSize(){}setPixelRatio(){}render(){}};`,context);
const order=JSON.parse(fs.readFileSync(path.join(root,'SOURCE-CODE/load-order.json'),'utf8'));
for(const name of order.slice(1))vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
function run(s){return vm.runInContext(s,context)}
run("VietVillageGame.initialize()");

return {run,context,root};
};
