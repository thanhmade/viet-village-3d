/**
 * Reusable real-time weapon VFX layer for Three.js r160.
 * No texture files, particle plugins, physics engine or GPU shaders are required.
 * Attack visual timing is decoupled from actual game combat stats.
 */
export class WeaponVFX {
  constructor(THREE, scene, {quality='high'}={}) {
    this.T=THREE; this.scene=scene; this.active=[];this.queue=[];this.quality=quality;
    this.glowTexture=this.makeGlow();
  }
  makeGlow(){
    const c=document.createElement('canvas');c.width=c.height=128;
    const ctx=c.getContext('2d');const g=ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.14,'rgba(255,255,255,.95)');
    g.addColorStop(.43,'rgba(255,255,255,.30)');g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
    return new this.T.CanvasTexture(c);
  }
  count(n){return this.quality==='low'?Math.round(n*.36):this.quality==='medium'?Math.round(n*.65):n;}
  schedule(seconds,fn){this.queue.push({time:seconds,fn});}
  animate(object,duration,step){
    this.scene.add(object);this.active.push({object,duration,age:0,step});return object;
  }
  update(delta){
    const dt=Math.min(.08,Math.max(0,delta));
    for(let i=this.queue.length-1;i>=0;i--){
      const q=this.queue[i];q.time-=dt;
      if(q.time<=0){this.queue.splice(i,1);q.fn();}
    }
    for(let i=this.active.length-1;i>=0;i--){
      const e=this.active[i];e.age+=dt;
      const p=Math.min(1,e.age/e.duration);
      e.step(p,e.age,dt);
      if(p>=1){this.scene.remove(e.object);this.dispose(e.object);this.active.splice(i,1);}
    }
  }
  dispose(object){
    object.traverse?.(o=>{
      if(o.geometry)o.geometry.dispose();
      const mats=o.material?Array.isArray(o.material)?o.material:[o.material]:[];
      mats.forEach(m=>{if(m.map && m.map!==this.glowTexture)m.map.dispose();m.dispose();});
    });
  }
  clear(){this.queue.length=0;for(const e of this.active){this.scene.remove(e.object);this.dispose(e.object);}this.active.length=0;}
  destroy(){this.clear();this.glowTexture.dispose();}
  vec(x,y,z){return new this.T.Vector3(x,y,z);}
  material(color,opacity=1){return new this.T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:this.T.DoubleSide,blending:this.T.AdditiveBlending});}
  sprite(pos,color,size=1,lifetime=.8,drift=null){
    const T=this.T;
    const m=new T.SpriteMaterial({map:this.glowTexture,color,transparent:true,opacity:1,blending:T.AdditiveBlending,depthWrite:false});
    const s=new T.Sprite(m);s.position.copy(pos);s.scale.set(size,size,1);
    const start=pos.clone();
    this.animate(s,lifetime,(p)=>{
      s.material.opacity=(1-p)*(p<.12?p/.12:.92);
      s.scale.setScalar(size*(.75+p*.8));
      if(drift)s.position.copy(start).addScaledVector(drift,p);
    });
    return s;
  }
  // Points are updated in-place without allocating a mesh per spark.
  sparks(pos,color,count=60,{speed=2.2,gravity=1.8,lifetime=1.1,scale=.11,dir=null}={}){
    const T=this.T;count=this.count(count);
    const positions=new Float32Array(count*3),speeds=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const theta=Math.random()*Math.PI*2,up=(Math.random()-.20)*2;
      let vx=Math.cos(theta),vy=up,vz=Math.sin(theta);
      if(dir){vx+=dir.x*1.4;vy+=dir.y*.8;vz+=dir.z*1.2;}
      const v=(.38+Math.random())*speed;
      speeds[i*3]=vx*v;speeds[i*3+1]=vy*v;speeds[i*3+2]=vz*v;
      positions[i*3]=pos.x;positions[i*3+1]=pos.y;positions[i*3+2]=pos.z;
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));
    const mat=new T.PointsMaterial({color,size:scale,transparent:true,opacity:1,blending:T.AdditiveBlending,depthWrite:false,map:this.glowTexture,sizeAttenuation:true});
    const points=new T.Points(geo,mat);
    this.animate(points,lifetime,(p,t)=>{
      for(let i=0;i<count;i++){
        const k=i*3;
        positions[k]=pos.x+speeds[k]*t;
        positions[k+1]=pos.y+speeds[k+1]*t-gravity*t*t*.5;
        positions[k+2]=pos.z+speeds[k+2]*t;
      }
      geo.attributes.position.needsUpdate=true;
      mat.opacity=Math.pow(1-p,1.35);
      mat.size=scale*(1-p*.38);
    });
  }
  // Annular ribbon in the vertical XY camera plane.
  arc(center,{radius=1,start=-1,end=2.0,width=.12,color=0x88eeff,lifetime=.55,tilt=0,spin=0,layer=0}={}){
    const T=this.T,n=44, verts=[];
    for(let i=0;i<=n;i++){
      const a=start+(end-start)*i/n;
      for(let s of [-1,1]){
        const r=radius+s*width*.5;
        verts.push(Math.cos(a)*r,Math.sin(a)*r,0);
      }
    }
    const idx=[];for(let i=0;i<n;i++){const k=i*2;idx.push(k,k+1,k+2,k+2,k+1,k+3);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
    const m=this.material(color,.9),mesh=new T.Mesh(g,m);
    mesh.position.copy(center);mesh.position.z+=layer;
    mesh.rotation.z=tilt;
    this.animate(mesh,lifetime,(p)=>{
      mesh.scale.setScalar(.67+.45*p);
      mesh.rotation.z=tilt+spin*p;
      m.opacity=.95*(1-p)*(p<.13?p/.13:1);
    });
    return mesh;
  }
  ring(pos,{color=0xffd88b,radius=.45,expand=2,lifetime=.8,ground=true,opacity=.85,tube=.025}={}){
    const T=this.T;
    const material=this.material(color,opacity);
    const m=new T.Mesh(new T.TorusGeometry(radius,tube,6,72),material);
    m.position.copy(pos);
    if(ground)m.rotation.x=Math.PI/2;
    this.animate(m,lifetime,(p)=>{
      const r=1+(expand-1)*(1-Math.pow(1-p,2));m.scale.setScalar(r);
      material.opacity=opacity*(1-p)*(p<.08?p/.08:1);
    });return m;
  }
  beam(from,to,{color=0x74f6ff,width=.055,lifetime=.4,glow=true}={}){
    const T=this.T;
    const d=to.clone().sub(from), len=d.length();
    const mesh=new T.Mesh(new T.CylinderGeometry(width*.55,width,len,9,1,false),this.material(color,.8));
    mesh.position.copy(from).addScaledVector(d,.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
    this.animate(mesh,lifetime,(p)=>{mesh.material.opacity=.82*(1-p);mesh.scale.x=mesh.scale.z=1+.4*p;});
    if(glow){const m=new T.Mesh(new T.CylinderGeometry(width*2.4,width*2.4,len,9),this.material(color,.16));
      m.position.copy(mesh.position);m.quaternion.copy(mesh.quaternion);
      this.animate(m,lifetime,(p)=>{m.material.opacity=.24*(1-p);m.scale.x=m.scale.z=1+.55*p;});}
  }
  lightning(from,to,color=0x81eaff,count=4,lifetime=.4){
    const T=this.T,steps=12;
    for(let j=0;j<this.count(count);j++){
      const pts=[];
      for(let i=0;i<=steps;i++){
        const p=from.clone().lerp(to,i/steps);
        if(i!==0&&i!==steps){p.y+=(Math.random()-.5)*.4;p.z+=(Math.random()-.5)*.35;p.x+=(Math.random()-.5)*.1;}
        pts.push(p);
      }
      const geometry=new T.TubeGeometry(new T.CatmullRomCurve3(pts),steps*2,.009+j*.004,4,false);
      const mesh=new T.Mesh(geometry,this.material(color,.9));
      this.animate(mesh,lifetime,(p)=>{mesh.material.opacity=(1-p)*.85;});
    }
  }
  swirl(center,{color=0xf6cb68,count=4,height=2,lifetime=1.35,rad=.45}={}){
    const T=this.T;
    for(let i=0;i<this.count(count);i++){
      const pts=[];for(let k=0;k<55;k++){
        const t=k/54,a=t*Math.PI*4.7+i*Math.PI*2/count;
        const r=rad*(1-t*.55);pts.push(this.vec(Math.cos(a)*r,t*height,Math.sin(a)*r));
      }
      const curve=new T.CatmullRomCurve3(pts);
      const mesh=new T.Mesh(new T.TubeGeometry(curve,90,.017,4,false),this.material(color,.75));
      mesh.position.copy(center);
      this.animate(mesh,lifetime,(p)=>{mesh.rotation.y=p*3.9;mesh.material.opacity=.7*(1-p);});
    }
  }
  column(center,{color=0xff7b34,height=3.2,width=.12,lifetime=1}={}){
    const T=this.T;
    const cylinder=new T.Mesh(new T.CylinderGeometry(width*.16,width,height,16,1,true),this.material(color,.55));
    cylinder.position.copy(center).add(this.vec(0,height*.5,0));
    this.animate(cylinder,lifetime,(p)=>{cylinder.scale.x=cylinder.scale.z=1+p*3;cylinder.material.opacity=.7*(1-p);});
    for(let i=0;i<this.count(6);i++){
      const p=center.clone().add(this.vec((Math.random()-.5)*.5,.25+Math.random()*height,0));
      this.sprite(p,color,.45,.65,this.vec(0,1.1,0));
    }
  }
  missile(from,to,color,{lifetime=.57,radius=.048,arrow=false,onImpact=null}={}){
    const T=this.T;
    const object=new T.Group();
    const vector=to.clone().sub(from),dir=vector.clone().normalize();
    const body=new T.Mesh(new T.CylinderGeometry(radius*.47,radius*.47,arrow?.85:.53,9),this.material(arrow?0xe9bb65:color,.95));
    object.add(body);
    const tip=new T.Mesh(new T.ConeGeometry(radius*1.8,arrow?.22:.30,8),this.material(color,1));
    tip.position.y=arrow?.54:.38;object.add(tip);
    if(arrow){const tail=new T.Mesh(new T.ConeGeometry(radius*2,.16,4),this.material(color,.7));tail.rotation.z=Math.PI;tail.position.y=-.41;object.add(tail);}
    object.quaternion.setFromUnitVectors(this.vec(0,1,0),dir);
    object.position.copy(from);
    const tailGlow=new T.Sprite(new T.SpriteMaterial({map:this.glowTexture,color,blending:T.AdditiveBlending,transparent:true,opacity:.8,depthWrite:false}));
    tailGlow.scale.set(radius*10,radius*10,1);object.add(tailGlow);
    this.animate(object,lifetime,(p)=>{
      const ease=p*p*(3-2*p);
      object.position.copy(from).lerp(to,ease);
      tailGlow.material.opacity=1-p*.6;
      if(p>=1 && onImpact)onImpact(to);
    });
    this.beam(from,to,{color,width:radius*.36,lifetime:lifetime*.75,glow:false});
  }
  burst(pos,color,power=1){
    this.sprite(pos,color,.88*power,.57);
    this.sparks(pos,color,Math.round(56*power),{speed:2.7*power,gravity:2,scale:.13});
    this.ring(pos,{ground:false,color,radius:.12,expand:8*power,lifetime:.64});
  }
  impact(pos,color,onHit,power=1){
    this.burst(pos,color,power);
    this.ring(this.vec(pos.x,0.10,pos.z),{color,radius:.28,expand:7*power,lifetime:.75});
    if(onHit)onHit();
  }
  /** mode: 0=normal, 1=skill, 2=ultimate. Coordinates are world-space Vector3. */
  attack(type,mode,from,to,onHit){
    const T=this.T;
    const p=to.clone();
    const ground=this.vec(p.x,.085,p.z);
    if(type==='sword'){
      const c=0x86dfff;
      if(mode===0){
        this.arc(p,{radius:.87,start:-2.45,end:1.25,width:.13,color:0xebffff,tilt:-.42});
        this.arc(p,{radius:.95,start:-2.48,end:1.3,width:.22,color:c,lifetime:.67,tilt:-.42,layer:-.05});
        this.schedule(.29,()=>this.impact(p,c,onHit));
      }else if(mode===1){
        for(let i=0;i<2;i++)this.schedule(i*.22,()=>{
          this.arc(p,{radius:1.08,start:-2.3,end:1.5,width:.20,color:i?0x99d8ff:0xc4fdff,tilt:i?.7:-.9,spin:.75});
          this.sparks(p,c,40,{speed:2.5});
        });
        this.schedule(.54,()=>this.impact(p,c,onHit,1.25));
        this.ring(ground,{color:0x7ccfff,radius:.23,expand:8,lifetime:1.0});
      }else{
        this.swirl(ground,{color:0x5adaff,count:7,height:2.7,lifetime:1.65,rad:.85});
        this.ring(ground,{color:c,radius:.34,expand:9,lifetime:1.4});
        for(let i=0;i<6;i++)this.schedule(i*.16,()=>{
          this.arc(p.clone().add(this.vec((i-2.5)*.12,0,0)),{radius:.85+(i%3)*.16,start:-2.5,end:1.5,width:.17,color:i%2?0x88aaff:0xd5fdff,tilt:i*Math.PI/3,lifetime:.8});
          this.sparks(p,c,16,{speed:3.6});
        });
        this.schedule(1.0,()=>this.impact(p,0x9feaff,onHit,1.8));
      }
    }
    else if(type==='staff'){
      const c=0xffd47b;
      if(mode===0){
        this.arc(p,{radius:.65,start:-2.5,end:1.2,width:.12,color:c,tilt:.4});
        this.ring(ground,{color:c,expand:6,lifetime:.65});
        this.schedule(.24,()=>this.impact(p,c,onHit,.85));
      }else if(mode===1){
        this.swirl(ground,{color:0xf5c16b,count:5,height:2.45,lifetime:1.15});
        this.swirl(ground,{color:0x8effae,count:2,height:1.7,lifetime:1.05,rad:.8});
        for(let i=0;i<3;i++)this.schedule(i*.25,()=>this.ring(ground,{color:i%2?0x8dff9b:c,radius:.3,expand:8,lifetime:.85}));
        this.schedule(.75,()=>this.impact(p,c,onHit,1.25));
      }else{
        this.swirl(ground,{color:0xffda8b,count:8,height:3.7,lifetime:1.75,rad:1.25});
        for(let i=0;i<5;i++)this.schedule(i*.22,()=>{
          this.ring(ground,{color:i%2?0x84ffb3:0xffd78b,radius:.35,expand:11,lifetime:1.2});
          this.sparks(ground.clone().add(this.vec(0,.35,0)),c,24,{speed:3.4});
        });
        this.schedule(1.21,()=>this.impact(p,c,onHit,1.85));
      }
    }
    else if(type==='axe'){
      const c=0xff8a45;
      if(mode===0){
        this.arc(p,{radius:1.03,start:-2.1,end:1.2,width:.25,color:0xffbd5c,tilt:-.5,lifetime:.68});
        this.arc(p,{radius:1.10,start:-2.25,end:1.3,width:.40,color:0xff4b30,tilt:-.5,lifetime:.63,layer:-.10});
        this.schedule(.40,()=>{this.column(ground,{color:0xff7133,height:1.15,width:.15,lifetime:.55});this.impact(p,c,onHit,1.2);});
      }else if(mode===1){
        this.arc(p,{radius:1.2,start:-2.5,end:1.55,width:.4,color:0xff5c2f,tilt:-.35,lifetime:.8});
        for(let i=0;i<3;i++)this.schedule(i*.25,()=>{
          this.column(ground.clone().add(this.vec((i-1)*.65,0,0)),{color:0xff6430,height:1.6,width:.18,lifetime:.8});
          this.ring(ground,{color:c,radius:.18,expand:10,lifetime:1.0});
        });
        this.schedule(.75,()=>this.impact(p,c,onHit,1.5));
      }else{
        for(let i=0;i<7;i++)this.schedule(i*.16,()=>{
          const offset=this.vec((Math.random()-.5)*1.55,0,(Math.random()-.5)*1.2);
          this.column(ground.clone().add(offset),{color:i%2?0xffc05e:0xff4428,height:2.2+Math.random()*1.5,width:.19,lifetime:1.1});
          this.sparks(p.clone().add(offset),0xffba5b,25,{speed:3.5});
        });
        this.ring(ground,{color:0xff7b33,radius:.45,expand:11,lifetime:1.75});
        this.schedule(1.25,()=>this.impact(p,0xffaa44,onHit,2.2));
      }
    }
    else if(type==='spear'){
      const c=0x72ffeb;
      if(mode===0){
        this.beam(from,p,{color:0xd7fff9,width:.060,lifetime:.45});
        this.missile(from,p,c,{lifetime:.35,radius:.042});
        this.schedule(.35,()=>this.impact(p,c,onHit,1.0));
      }else if(mode===1){
        for(let i=0;i<3;i++)this.schedule(i*.16,()=>{
          const dest=p.clone().add(this.vec(0,(i-1)*.33,(i-1)*.27));
          this.missile(from.clone().add(this.vec(0,(i-1)*.22,0)),dest,c,{lifetime:.42,radius:.045});
          this.ring(from.clone().lerp(dest,.65),{ground:false,color:c,expand:3.2,radius:.14,lifetime:.56});
          this.schedule(.42,()=>this.sparks(dest,c,38,{speed:2.9}));
        });
        this.schedule(.86,()=>this.impact(p,c,onHit,1.35));
      }else{
        this.swirl(from,{color:0x94ffe6,count:4,height:1.0,lifetime:1.35,rad:.40});
        for(let i=0;i<5;i++)this.schedule(i*.18,()=>{
          this.beam(from,p,{color:i%2?0x69eaff:0xbafffc,width:.08+i*.008,lifetime:.64});
          this.lightning(from,p,0x89eaff,5,.42);
          this.ring(from.clone().lerp(p,.25+i*.13),{ground:false,color:c,radius:.16,expand:3.5,lifetime:.52});
        });
        this.schedule(1.0,()=>this.impact(p,0x90ecff,onHit,1.9));
      }
    }
    else if(type==='bow'){
      const c=0xa3ff84;
      const arrows=mode===0?1:mode===1?3:9;
      if(mode===2){this.swirl(from,{color:0x9dff7b,count:4,height:1.6,lifetime:1.35});this.ring(from,{color:c,ground:false,radius:.3,expand:5,lifetime:1.25});}
      for(let i=0;i<arrows;i++)this.schedule((mode===2?i*.09:i*.13),()=>{
        const offset=mode===0?0:mode===1?(i-1)*.34:Math.sin(i*2.399)*.55;
        const dest=p.clone().add(this.vec(0,offset,mode===2?Math.cos(i*2.399)*.45:0));
        const start=from.clone().add(this.vec(0,mode===2?Math.cos(i*2.2)*.26:0,0));
        this.missile(start,dest,i%3===1?0xe9ffb3:c,{lifetime:mode===2?.55:.50,radius:.042,arrow:true});
        this.schedule(mode===2?.55:.50,()=>{
          this.sparks(dest,c,mode===2?20:38,{speed:2.8,scale:.11});
          this.sprite(dest,c,.65,.46);
        });
      });
      const delay=(arrows-1)*(mode===2?.09:.13)+.52;
      this.schedule(delay,()=>this.impact(p,c,onHit,mode===2?1.9:mode===1?1.2:.9));
    }
  }
}
