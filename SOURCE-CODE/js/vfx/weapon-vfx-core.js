/* WeaponVFXCore — shared 3D VFX lifecycle for Three.js r160 WebGLRenderer.
 * Only owns its effect groups and particle pool. No renderer, RAF or damage logic.
 */
(function(root,factory){
  if(typeof module==='object' && module.exports) module.exports=factory();
  else root.WeaponVFXCore=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const VERTEX = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const RIBBON = `
    uniform vec3 uColor;
    uniform float uTime, uOpacity;
    varying vec2 vUv;
    void main() {
      float edge = pow(max(0.0, sin(vUv.y * 3.14159265)), 1.3);
      float tail = smoothstep(0.0, 0.18, vUv.x);
      float ripples = 0.65 + 0.35 * sin(vUv.x * 60.0 - uTime * 19.0 + vUv.y * 12.0);
      float core = pow(max(0.0, 1.0 - abs(vUv.y - 0.5) * 2.0), 7.0);
      float alpha = (edge * ripples * 0.55 + core * 0.55) * tail * uOpacity;
      gl_FragColor = vec4(uColor + vec3(core * 0.18), alpha);
    }
  `;
  const BEAM = `
    uniform vec3 uColor;
    uniform float uTime, uOpacity;
    varying vec2 vUv;
    void main() {
      float streak = pow(0.5 + 0.5 * sin(vUv.x * 88.0 + sin(vUv.y * 12.0 - uTime * 8.0)), 7.0);
      float heightFade = sin(vUv.y * 3.14159265);
      gl_FragColor = vec4(uColor, (0.06 + streak * 0.7) * heightFade * uOpacity);
    }
  `;
  const SPHERE_VERTEX = `
    varying vec3 vNormal, vView;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const SPHERE_FRAGMENT = `
    uniform vec3 uColor;
    uniform float uTime, uOpacity;
    varying vec3 vNormal, vView;
    varying vec2 vUv;
    void main() {
      float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.3);
      float meridian = pow(0.5 + 0.5 * sin(vUv.x * 75.3982), 25.0);
      float latitude = pow(0.5 + 0.5 * sin(vUv.y * 43.9823 - uTime * 1.4), 30.0);
      float wave = 0.5 + 0.5 * sin(vUv.y * 32.0 - uTime * 3.0 + sin(vUv.x * 35.0));
      float alpha = (0.025 + fresnel * 0.35 + meridian * 0.07 + latitude * 0.06 + wave * 0.028) * uOpacity;
      gl_FragColor = vec4(uColor, alpha);
    }
  `;
  const SIGIL = `
    uniform vec3 uColor;
    uniform float uTime, uOpacity;
    varying vec2 vUv;
    float segment(vec2 p, vec2 a, vec2 b) {
      vec2 pa = p - a, ba = b - a;
      return 1.0 - smoothstep(0.018, 0.038, length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)));
    }
    void main() {
      vec2 p = vUv;
      float glyph = segment(p, vec2(0.5, 0.15), vec2(0.5, 0.85));
      glyph = max(glyph, segment(p, vec2(0.2, 0.65), vec2(0.8, 0.65)));
      glyph = max(glyph, segment(p, vec2(0.22, 0.48), vec2(0.5, 0.8)));
      glyph = max(glyph, segment(p, vec2(0.78, 0.48), vec2(0.5, 0.8)));
      glyph = max(glyph, segment(p, vec2(0.25, 0.28), vec2(0.5, 0.48)));
      glyph = max(glyph, segment(p, vec2(0.75, 0.28), vec2(0.5, 0.48)));
      float border = max(segment(p, vec2(0.1, 0.1), vec2(0.1, 0.9)), segment(p, vec2(0.9, 0.1), vec2(0.9, 0.9)));
      border = max(border, segment(p, vec2(0.1, 0.1), vec2(0.9, 0.1)));
      border = max(border, segment(p, vec2(0.1, 0.9), vec2(0.9, 0.9)));
      gl_FragColor = vec4(uColor, (glyph + border * 0.5) * uOpacity * (0.85 + sin(uTime * 2.0) * 0.15));
    }
  `;

  // Tất cả hạt dùng một Points và một buffer; không tạo mesh mới mỗi frame.
  class ParticlePool {
    constructor(THREE, scene, capacity) {
      this.T = THREE; this.capacity = capacity; this.cursor = 0; this.count = 0;
      this.active = new Uint16Array(capacity);
      this.free = Uint16Array.from({length:capacity}, (_, i) => capacity - i - 1);
      this.freeCount = capacity;
      this.indexDirty = false;
      this.dirty = {position:[capacity,-1],aColor:[capacity,-1],aAlpha:[capacity,-1],aSize:[capacity,-1]};
      this.position = new Float32Array(capacity * 3);
      this.origin = new Float32Array(capacity * 3);
      this.velocity = new Float32Array(capacity * 3);
      this.color = new Float32Array(capacity * 3);
      this.alpha = new Float32Array(capacity);
      this.size = new Float32Array(capacity);
      this.age = new Float32Array(capacity);
      this.life = new Float32Array(capacity);
      this.gravity = new Float32Array(capacity);
      this.baseAlpha = new Float32Array(capacity);
      this.geometry = new THREE.BufferGeometry();
      this.geometry.setAttribute('position', new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
      this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
      this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
      this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
      this.geometry.setIndex(new THREE.BufferAttribute(this.active, 1).setUsage(THREE.DynamicDrawUsage));
      this.geometry.setDrawRange(0, 0);
      this.material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uPointScale: { value: 300 } },
        vertexShader: `
          attribute vec3 aColor;
          attribute float aAlpha, aSize;
          uniform float uPointScale;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vColor = aColor; vAlpha = aAlpha;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = aAlpha > 0.0 ? clamp(aSize * uPointScale / max(0.1, -mv.z), 1.0, 64.0) : 0.0;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0 || vAlpha < 0.001) discard;
            float soft = pow(1.0 - d, 1.8);
            gl_FragColor = vec4(vColor, soft * vAlpha);
            #include <colorspace_fragment>
          }
        `
      });
      this.mesh = new THREE.Points(this.geometry, this.material);
      this.mesh.name = 'weapon-vfx-particle-pool';
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 12;
      this.mesh.visible = false;
      scene.add(this.mesh);
      this.tempColor = new THREE.Color();
    }
    spawn(pos, vel, color, life, size, gravity = 0, opacity = 1) {
      if (!this.freeCount) return false;
      const i = this.free[--this.freeCount], j = i * 3;
      this.cursor = (i + 1) % this.capacity;
      this.active[this.count++] = i;
      this.indexDirty = true;
      this.position[j] = this.origin[j] = pos.x;
      this.position[j + 1] = this.origin[j + 1] = pos.y;
      this.position[j + 2] = this.origin[j + 2] = pos.z;
      this.velocity[j] = vel.x; this.velocity[j + 1] = vel.y; this.velocity[j + 2] = vel.z;
      this.tempColor.set(color).toArray(this.color, j);
      this.age[i] = 0; this.life[i] = life; this.gravity[i] = gravity;
      this.alpha[i] = this.baseAlpha[i] = opacity; this.size[i] = size;
      for (const key of ['position', 'aColor', 'aAlpha', 'aSize']) this._mark(key, i, i);
      this.geometry.setDrawRange(0, this.count);
      this.mesh.visible = true;
      return true;
    }
    _mark(key, first, last) {
      const range = this.dirty[key];
      range[0] = Math.min(range[0], first); range[1] = Math.max(range[1], last);
    }
    update(dt) {
      if (!this.count) return;
      let first = this.capacity, last = -1;
      for (let entry = 0; entry < this.count;) {
        const i = this.active[entry];
        const age = this.age[i] += dt;
        if (age >= this.life[i]) {
          this.life[i] = 0; this.alpha[i] = 0;
          this.active[entry] = this.active[--this.count]; this.free[this.freeCount++] = i;
          this.indexDirty = true;
          continue;
        }
        const j = i * 3, p = age / this.life[i];
        this.position[j] = this.origin[j] + this.velocity[j] * age;
        this.position[j + 1] = this.origin[j + 1] + this.velocity[j + 1] * age - 0.5 * this.gravity[i] * age * age;
        this.position[j + 2] = this.origin[j + 2] + this.velocity[j + 2] * age;
        this.alpha[i] = this.baseAlpha[i] * Math.pow(1 - p, 1.4);
        first = Math.min(first, i); last = Math.max(last, i); entry++;
      }
      if (last >= first) { this._mark('position', first, last); this._mark('aAlpha', first, last); }
      this.geometry.setDrawRange(0, this.count);
      this.mesh.visible = this.count > 0;
    }
    flush() {
      // Flush after spawning: static colour/size data changes only for new particles.
      for (const key of ['position', 'aColor', 'aAlpha', 'aSize']) {
        const range = this.dirty[key];
        if (range[1] >= range[0]) {
          const attribute = this.geometry.attributes[key];
          let start = range[0] * attribute.itemSize, end = (range[1] + 1) * attribute.itemSize;
          // The host can advance several simulation steps before rendering once.
          for (const pending of attribute.updateRanges) {
            start = Math.min(start, pending.start); end = Math.max(end, pending.start + pending.count);
          }
          attribute.clearUpdateRanges();
          attribute.addUpdateRange(start, end - start);
          attribute.needsUpdate = true;
          range[0] = this.capacity; range[1] = -1;
        }
      }
      if (this.indexDirty && this.count) {
        this.geometry.index.clearUpdateRanges();
        this.geometry.index.addUpdateRange(0, this.count);
        this.geometry.index.needsUpdate = true;
      }
      this.indexDirty = false;
    }
    clear() {
      while (this.count) {
        const i = this.active[--this.count];
        this.life[i] = this.alpha[i] = 0; this.free[this.freeCount++] = i;
      }
      this.mesh.visible = false; this.geometry.setDrawRange(0, 0); this.indexDirty = false;
      for (const range of Object.values(this.dirty)) { range[0] = this.capacity; range[1] = -1; }
    }
    dispose() { this.mesh.removeFromParent(); this.geometry.dispose(); this.material.dispose(); }
  }

  // Two ways to replace the generic builder for one skill id; both share this
  // lifecycle, timeline, events, pool and disposal:
  // - registerSkillRenderer(id, {build, tick}): default placement; tick runs after
  //   the generic uTime/uOpacity pass (Côn Quét, staff-sweep.js).
  // - registerEffect(id, {build, tick, place?, release?, onHit?}): owns placement,
  //   timing and opacity itself (Hộ Thân, Chấn Địa, staff-skill-effects.js).
  const registry = new Map(), skillRenderers = new Map(), effects = new Map();
  const QUALITY = Object.freeze({
    low: {particles:450,segments:36,sphereSegments:24,debris:18},
    medium: {particles:1100,segments:64,sphereSegments:36,debris:36},
    high: {particles:2200,segments:96,sphereSegments:48,debris:60}
  });
  // Chấn Địa (slam) strikes where the staff meets the ground in front of the
  // player, so it is not a point-aimed skill.
  const AIMED = new Set(['projectile','volley','rain','thrust','cleave','armor-break']);
  class WeaponVFXCore {
    static registerSkillRenderer(id, renderer) {
      if(!id||typeof renderer?.build!=='function'||typeof renderer?.tick!=='function')throw new TypeError('Invalid skill renderer');
      skillRenderers.set(id,renderer);
    }
    static registerWeapon(config) {
      if (!config?.weaponId || !Array.isArray(config.skills) || config.skills.length !== 3)
        throw new TypeError('Mỗi cấu hình cần weaponId và đúng 3 chiêu.');
      for (const skill of config.skills) {
        if (skill.id !== config.weaponId+'.'+skill.localId || !skill.type ||
            !(skill.duration>0) || !(skill.cooldown>0) || skill.activeAt<0 ||
            skill.activeEnd<skill.activeAt || skill.activeEnd>skill.duration)
          throw new TypeError('Cấu hình chiêu hoặc mốc thời gian không hợp lệ.');
      }
      if (new Set(config.skills.map(s=>s.id)).size!==3) throw new TypeError('Mã chiêu trùng.');
      registry.set(config.weaponId,config);
      return config;
    }
    static getWeaponConfigs() { return Array.from(registry.values()); }
    static registerEffect(skillId, effect) {
      if (typeof skillId !== 'string' || !effect || typeof effect.build !== 'function' || typeof effect.tick !== 'function')
        throw new TypeError('Hiệu ứng riêng cần mã chiêu, build() và tick().');
      effects.set(skillId, effect); return effect;
    }
    static get aimedTypes() { return Array.from(AIMED); }
    static createWeaponClass(weaponId) {
      return class extends WeaponVFXCore {
        static get config() { return registry.get(weaponId); }
        cast(id,options) {
          const full=id.includes('.')?id:weaponId+'.'+id;
          if (!full.startsWith(weaponId+'.')) return {ok:false,reason:'wrong-weapon'};
          return super.cast(full,options);
        }
        cooldownRemaining(id,caster) { return super.cooldownRemaining(id.includes('.')?id:weaponId+'.'+id,caster); }
      };
    }
    constructor({THREE,scene,quality='medium',maxActive=8,onEvent=null,getGroundY=()=>0,
      getEquippedWeapon=null,random=Math.random}={}) {
      if(!THREE || !scene?.isScene) throw new TypeError('Cần THREE và THREE.Scene của game.');
      if(!QUALITY[quality]) throw new RangeError('quality: low, medium hoặc high.');
      if(!Number.isInteger(maxActive)||maxActive<1||maxActive>32) throw new RangeError('maxActive: 1..32.');
      if(typeof getGroundY!=='function'||typeof random!=='function'||
        (getEquippedWeapon!==null&&typeof getEquippedWeapon!=='function')||
        (onEvent!==null&&typeof onEvent!=='function')) throw new TypeError('Hook phải là hàm.');
      this.THREE=THREE;this.scene=scene;this.quality=quality;this.maxActive=maxActive;
      this.onEvent=onEvent;this.getGroundY=getGroundY;this.getEquippedWeapon=getEquippedWeapon;this.random=random;
      this.skills=new Map();this.configs=new Map(registry);
      for(const c of this.configs.values()) for(const s of c.skills) this.skills.set(s.id,{...s,weaponId:c.weaponId});
      this.time=0;this.serial=0;this.effects=[];this.cooldowns=new WeakMap();this.disposed=false;this.shared=new Map();
      this.pool=new ParticlePool(THREE,scene,QUALITY[quality].particles);
    }
    get stats() {return {active:this.effects.length,particles:this.pool.count,capacity:this.pool.capacity,time:this.time,quality:this.quality,disposed:this.disposed};}
    get hasActiveEffects() {return this.effects.length > 0 || this.pool.count > 0;}
    // Geometry/material/texture shared by many casts: created once, disposed only with the manager.
    sharedResource(key,create) {
      if(!this.shared.has(key))this.shared.set(key,create(this.THREE));
      return this.shared.get(key);
    }
    // Surface normal from the game's own height function (finite differences).
    groundNormal(x,z,out=new this.THREE.Vector3(),step=.25) {
      const sample=(a,b)=>{const y=this.getGroundY(new this.THREE.Vector3(a,0,b));return Number.isFinite(y)?y:0;};
      const hx=sample(x+step,z)-sample(x-step,z),hz=sample(x,z+step)-sample(x,z-step);
      return out.set(-hx,2*step,-hz).normalize();
    }
    // A real hit on a caster: forwarded to its active shield effect, if any.
    hitShield(caster,point) {
      if(this.disposed||!caster||!point||![point.x,point.y,point.z].every(Number.isFinite))return false;
      for(const fx of this.effects)if(fx.alive&&fx.caster===caster&&fx.custom?.onHit&&fx.custom.onHit(this,fx,point))return true;
      return false;
    }
    cooldownRemaining(id,caster) {return Math.max(0,(this.cooldowns.get(caster)?.get(id)||0)-this.time);}
    _ground(p) {const y=this.getGroundY(p.clone());if(!Number.isFinite(y)) throw new TypeError('getGroundY phải trả về số hữu hạn.');return y;}
    _pose(caster) {
      const T=this.THREE,p=caster.getWorldPosition(new T.Vector3());
      const d=new T.Vector3(0,0,-1).applyQuaternion(caster.getWorldQuaternion(new T.Quaternion()));
      d.y=0;if(d.lengthSq()<1e-8)d.set(0,0,-1);d.normalize();return {p,d};
    }
    cast(id,{caster,point=null,weaponTip=null,weapon=null,casterHeight=null}={}) {
      if(this.disposed)return {ok:false,reason:'disposed'};
      const s=this.skills.get(id);if(!s)return {ok:false,reason:'unknown-skill'};
      if(!caster?.isObject3D)return {ok:false,reason:'missing-caster'};
      if(weaponTip&&!weaponTip.isObject3D)return {ok:false,reason:'invalid-weapon-tip'};
      if(weapon&&!weapon.isObject3D)return {ok:false,reason:'invalid-weapon'};
      if(point&&![point.x,point.y,point.z].every(Number.isFinite))return {ok:false,reason:'invalid-point'};
      if(this.getEquippedWeapon&&this.getEquippedWeapon(caster)!==s.weaponId)return {ok:false,reason:'wrong-weapon'};
      const {p,d}=this._pose(caster),T=this.THREE;
      if(point&&AIMED.has(s.type)&&Math.hypot(point.x-p.x,point.z-p.z)>s.range+1e-6)return {ok:false,reason:'out-of-range'};
      const retryAfter=this.cooldownRemaining(id,caster);if(retryAfter>0)return {ok:false,reason:'cooldown',retryAfter};
      if(this.effects.length>=this.maxActive)return {ok:false,reason:'capacity'};
      const fx={handle:++this.serial,skill:s,caster,weaponTip,weapon,casterHeight:Number.isFinite(casterHeight)&&casterHeight>0?casterHeight:2.35,custom:effects.get(id)||null,point:point?new T.Vector3(point.x,point.y,point.z):null,
        palette:{...this.configs.get(s.weaponId).palette},quality:QUALITY[this.quality],group:new T.Group(),age:0,
        geometries:new Set(),materials:new Set(),emitted:new Set(),alive:true,impactLocked:false,particleCarry:0};
      fx.group.name=id+'-vfx';
      if(s.type==='sweep'&&fx.palette.sweep)fx.palette.primary=fx.palette.sweep;
      fx.start=p.clone();fx.start.y=this._ground(p)+1.35;
      if(['projectile','volley','thrust'].includes(s.type))fx.start.addScaledVector(d,s.forwardOffset);
      if(weaponTip)weaponTip.getWorldPosition(fx.start);
      fx.direction=d.clone();
      if(point&&AIMED.has(s.type)) {fx.direction.set(point.x-p.x,0,point.z-p.z);if(fx.direction.lengthSq()>1e-8)fx.direction.normalize();else fx.direction.copy(d);}
      fx.target=point&&AIMED.has(s.type)?fx.point.clone():p.clone().addScaledVector(d,s.type==='rain'?s.forwardOffset:
        ['projectile','volley','thrust'].includes(s.type)?s.range:s.forwardOffset);
      fx.target.y=this._ground(fx.target);
      this._place(fx);
      try {this._build(fx);} catch(error) {this._disposeResources(fx);throw error;}
      this.scene.add(fx.group);this.effects.push(fx);
      let map=this.cooldowns.get(caster);if(!map)this.cooldowns.set(caster,map=new Map());map.set(id,this.time+s.cooldown);
      this._emit('cast',fx);
      return {ok:true,handle:fx.handle,skillId:id};
    }
    _place(fx) {
      if(fx.custom?.place){fx.custom.place(this,fx);return;}
      if(fx.impactLocked)return;
      const {p,d}=this._pose(fx.caster),type=fx.skill.type;
      if(['projectile','volley','rain','thrust','cleave','armor-break'].includes(type)) {
        fx.group.position.copy(type==='rain'||type==='cleave'||type==='armor-break'?fx.target:p);
        fx.impactLocked=true;
      } else {
        fx.group.position.copy(p);
        if(type==='slam')fx.group.position.copy(fx.point||p.addScaledVector(d,fx.skill.forwardOffset));
        if(type==='combo')fx.group.position.addScaledVector(d,fx.skill.forwardOffset);
      }
      fx.group.position.y=this._ground(fx.group.position);
      fx.group.rotation.y=Math.atan2(-fx.direction.x,-fx.direction.z);
      if(['sweep','shield','combo','lotus','vortex','cyclone','slam'].includes(type))fx.group.rotation.y=Math.atan2(-d.x,-d.z);
    }
    update(dt) {
      if(!Number.isFinite(dt)||dt<0)throw new RangeError('deltaSeconds phải hữu hạn và >= 0.');
      if(this.disposed||dt===0)return;
      this.time+=dt;
      if(!this.hasActiveEffects)return;
      this.pool.update(dt);
      for(const fx of this.effects.slice()) {
        if(!fx.alive)continue;
        fx.age+=dt;this._place(fx);if(fx.custom)fx.custom.tick(this,fx,dt);else this._tick(fx,dt);
        if(fx.alive&&fx.age>=fx.skill.duration)this._release(fx,'complete');
      }
      this.pool.flush();
    }
    cancel(handle) {const fx=this.effects.find(f=>f.handle===handle);if(!fx)return false;this._release(fx,'cancel');return true;}
    cancelAll({resetCooldowns=false}={}) {for(const f of this.effects.slice())this._release(f,'cancel');this.pool.clear();if(resetCooldowns)this.cooldowns=new WeakMap();}
    setQuality(quality) {
      if(!QUALITY[quality])throw new RangeError('quality: low, medium hoặc high.');
      if(this.disposed)return;if(quality===this.quality)return;
      this.cancelAll();this.pool.dispose();this.quality=quality;this.pool=new ParticlePool(this.THREE,this.scene,QUALITY[quality].particles);
    }
    dispose() {if(this.disposed)return;this.disposed=true;this.cancelAll();this.pool.dispose();
      for(const resource of this.shared.values()){if(resource?.dispose)resource.dispose();else if(resource&&typeof resource==='object')for(const item of Object.values(resource))item?.dispose?.();}
      this.shared.clear();}
    _emit(type,fx,extra={},key=type) {
      if(fx.emitted.has(key))return false;fx.emitted.add(key);
      if(this.onEvent)this.onEvent({type,handle:fx.handle,skillId:fx.skill.id,weaponId:fx.skill.weaponId,skillType:fx.skill.type,
        caster:fx.caster,position:fx.group.position.clone(),radius:fx.skill.radius,time:this.time,...extra});
      return true;
    }
    _impact(fx,index,at,position=fx.group.position) {
      if(!fx.alive||fx.age<at)return;
      if(fx.skill.type==='slam')fx.impactLocked=true;
      if(this._emit('impact',fx,{hitIndex:index,position:position.clone(),activeSeconds:fx.skill.activeEnd-fx.skill.activeAt},'hit'+index)&&fx.alive&&fx.age<fx.skill.duration)
        this._burst(fx,position,fx.skill.type==='rain'?8:fx.quality.debris*2);
    }
    _shader(fx,color,fragmentShader=RIBBON,vertexShader=VERTEX) {
      const T=this.THREE,m=new T.ShaderMaterial({uniforms:{uColor:{value:new T.Color(color)},uTime:{value:0},uOpacity:{value:0}},
        vertexShader,fragmentShader:fragmentShader.replace(/\}\s*$/, '\n#include <colorspace_fragment>\n}'),transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
      fx.materials.add(m);return m;
    }
    _mesh(fx,g,m,parent=fx.group) {fx.geometries.add(g);fx.materials.add(m);const n=new this.THREE.Mesh(g,m);n.renderOrder=8;parent.add(n);return n;}
    _arc(fx,r,width,angle=TAU,y=0,wave=0,color=fx.palette.primary,parent=fx.group) {
      const T=this.THREE,pos=[],uv=[],indices=[],steps=fx.quality.segments;
      for(let i=0;i<=steps;i++){const u=i/steps,a=u*angle;for(let v=0;v<2;v++){
        const radius=r+(v-.5)*width;pos.push(Math.sin(a)*radius,y+Math.sin(a*2+u)*wave,Math.cos(a)*radius);uv.push(u,v);}
        if(i<steps){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
      return this._mesh(fx,g,this._shader(fx,color),parent);
    }
    _opacity(mesh,value) {
      if(mesh?.material?.uniforms?.uOpacity) {
        mesh.material.uniforms.uOpacity.value=value;
        mesh.visible=value>0;
      }
    }
    _build(fx) {
      if(fx.custom){fx.custom.build(this,fx);return;}
      const custom=skillRenderers.get(fx.skill.id);
      if(custom){fx.customRenderer=custom;custom.build(this,fx);return;}
      const type=fx.skill.type;
      if(type==='sweep')this._buildSweep(fx);
      else if(type==='shield')this._buildShield(fx);
      else if(type==='slam'||type==='cleave')this._buildGround(fx,type==='cleave');
      else if(type==='combo')this._buildCombo(fx);
      else if(type==='lotus')this._buildLotus(fx);
      else if(type==='projectile'||type==='volley'||type==='thrust')this._buildFlight(fx);
      else if(type==='rain')this._buildRain(fx);
      else if(type==='vortex'||type==='cyclone')this._buildVortex(fx);
      else if(type==='armor-break')this._buildArmor(fx);
      else throw new RangeError('Chưa có builder: '+type);
    }
    _buildSweep(fx) {
      const T=this.THREE,r=fx.skill.radius;fx.swirl=new T.Group();fx.group.add(fx.swirl);
      fx.ribbons=[this._arc(fx,r*.86,r*.22,Math.PI*1.65,.9,.14,fx.palette.primary,fx.swirl),
        this._arc(fx,r*.96,.06,Math.PI*1.7,.85,.12,fx.palette.secondary,fx.swirl),
        this._arc(fx,r*.7,.12,Math.PI*1.5,1.13,.2,fx.palette.core,fx.swirl)];
      fx.floor=this._arc(fx,r*.82,.15,TAU,.04,0,fx.palette.primary);
    }
    _buildShield(fx) {
      const T=this.THREE,r=fx.skill.radius;
      fx.shell=this._mesh(fx,new T.SphereGeometry(r,fx.quality.sphereSegments,24),this._shader(fx,fx.palette.primary,SPHERE_FRAGMENT,SPHERE_VERTEX));fx.shell.position.y=1.48;
      fx.orbits=[];
      for(let i=0;i<4;i++){const g=new T.Group();g.position.y=1.48;g.rotation.z=i%2?.35:-.22;g.rotation.x=i===2?.9:.08;fx.group.add(g);
        this._arc(fx,r,.1,TAU,0,0,i%2?fx.palette.secondary:fx.palette.primary,g);fx.orbits.push(g);}
      fx.sigils=new T.Group();fx.group.add(fx.sigils);const g=new T.PlaneGeometry(.28,.7),m=this._shader(fx,fx.palette.secondary,SIGIL);
      for(let i=0;i<8;i++){const a=i/8*TAU,n=this._mesh(fx,g,m,fx.sigils);n.position.set(Math.sin(a)*r,1.4,Math.cos(a)*r);n.rotation.y=a;}
      fx.floor=this._arc(fx,r+.15,.14,TAU,.045,0,fx.palette.secondary);
    }
    _cracks(fx) {
      const T=this.THREE,pos=[],uv=[],r=fx.skill.radius;
      for(let i=0;i<14;i++){let x=0,z=0;const a=i/14*TAU;
        for(let j=1;j<=5;j++){const rr=r*j/5,aa=a+(this.random()-.5)*.22,bx=Math.sin(aa)*rr,bz=Math.cos(aa)*rr;
          const dx=bx-x,dz=bz-z,len=Math.hypot(dx,dz),w=.045-j*.005,nx=-dz/len*w,nz=dx/len*w;
          for(const [xx,zz,u,v] of [[x-nx,z-nz,0,0],[x+nx,z+nz,0,1],[bx-nx,bz-nz,1,0],[x+nx,z+nz,0,1],[bx+nx,bz+nz,1,1],[bx-nx,bz-nz,1,0]]){pos.push(xx,.055,zz);uv.push(u,v);}x=bx;z=bz;}}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeBoundingSphere();
      return this._mesh(fx,g,this._shader(fx,fx.palette.secondary,'uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;void main(){gl_FragColor=vec4(uColor,uOpacity*.85);}'));
    }
    _debris(fx,shards=false) {
      const T=this.THREE,g=shards?new T.OctahedronGeometry(1,0):new T.IcosahedronGeometry(1,0),m=new T.MeshStandardMaterial({color:shards?fx.palette.secondary:fx.palette.earth,roughness:.8,metalness:shards?.6:0});
      fx.geometries.add(g);fx.materials.add(m);fx.rocks=new T.InstancedMesh(g,m,fx.quality.debris);fx.rocks.frustumCulled=false;fx.rocks.visible=false;fx.group.add(fx.rocks);fx.dummy=new T.Object3D();fx.rockState=[];
      for(let i=0;i<fx.quality.debris;i++)fx.rockState.push({angle:this.random()*TAU,r:.3+this.random()*1.3,vy:2.4+this.random()*4.5,speed:1+this.random()*3,size:.06+this.random()*.17,phase:this.random()*TAU});
    }
    _buildGround(fx,cleave) {
      const T=this.THREE;fx.waves=[this._arc(fx,1,.17,TAU,.06,0,fx.palette.primary),this._arc(fx,1,.06,TAU,.08,0,fx.palette.secondary)];
      fx.cracks=this._cracks(fx);fx.telegraph=this._arc(fx,.6,.08,TAU,.035,0,fx.palette.secondary);
      fx.column=this._mesh(fx,new T.CylinderGeometry(.15,.38,5,24,1,true),this._shader(fx,fx.palette.primary,BEAM));fx.column.position.y=2.5;
      if(cleave){fx.cut=this._arc(fx,2.3,.6,Math.PI*1.25,0,.05,fx.palette.primary);fx.cut.rotation.z=Math.PI/2;fx.cut.position.y=1.9;}
      this._debris(fx);
    }
    _buildCombo(fx) {
      fx.slashes=[];for(let i=0;i<3;i++){const m=this._arc(fx,1.8+i*.25,.34,Math.PI*1.3,0,.08,i===1?fx.palette.core:fx.palette.primary);
        m.rotation.z=(i===1?-1:1)*(.5+i*.4);m.position.set(0,1.2,-1-i*.5);fx.slashes.push(m);}
      fx.floor=this._arc(fx,2.4,.09,TAU,.04,0,fx.palette.secondary);
    }
    _buildLotus(fx) {
      const T=this.THREE;fx.flower=new T.Group();fx.group.add(fx.flower);fx.petals=[];
      // Curved surfaces: roots at caster feet, tips spread outward and upward.
      for(let i=0;i<12;i++){const pos=[],uv=[],idx=[],a=i/12*TAU;
        for(let j=0;j<=20;j++){const t=j/20,r=.4+t*2.9,y=.14+Math.sin(t*Math.PI*.8)*2.25;
          for(let k=0;k<2;k++){const theta=a+(k-.5)*Math.sin(t*Math.PI)*.65;pos.push(Math.sin(theta)*r,y,Math.cos(theta)*r);uv.push(t,k);}
          if(j<20){const n=j*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}}
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();
        fx.petals.push(this._mesh(fx,g,this._shader(fx,i%3===0?fx.palette.core:fx.palette.primary),fx.flower));}
      fx.floor=this._arc(fx,3.25,.14,TAU,.04,0,fx.palette.secondary);
    }
    _buildFlight(fx) {
      const T=this.THREE,type=fx.skill.type,n=type==='volley'?3:1;fx.flights=[];
      fx.charge=this._arc(fx,.65,.1,TAU,0,0,fx.palette.secondary);fx.charge.rotation.x=Math.PI/2;fx.charge.position.set(0,1.35,-.65);
      for(let i=0;i<n;i++){
        const g=new T.Group();fx.group.add(g);const end=fx.target.clone();
        if(n===3){const side=new T.Vector3(-fx.direction.z,0,fx.direction.x);end.addScaledVector(side,(i-1)*Math.min(1.1,fx.skill.range*.09));
          const cp=this._pose(fx.caster).p,dist=Math.hypot(end.x-cp.x,end.z-cp.z);if(dist>fx.skill.range)end.set(cp.x+(end.x-cp.x)*fx.skill.range/dist,end.y,cp.z+(end.z-cp.z)*fx.skill.range/dist);}
        end.y+=1.35;
        const direction=end.clone().sub(fx.start).normalize(),quaternion=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,-1),direction);
        // Solid core is aligned to -Z: sword broad blade, arrows thin shaft.
        const isSword=fx.skill.weaponId==='sword',len=isSword?1.65:1.25;
        const core=this._mesh(fx,new T.CylinderGeometry(isSword?.07:.025,isSword?.15:.045,len,8),this._shader(fx,fx.palette.core,BEAM),g);core.rotation.x=Math.PI/2;
        const head=this._mesh(fx,new T.ConeGeometry(isSword?.21:.11,.5,4),this._shader(fx,fx.skill.weaponId==='bow'?fx.palette.primary:fx.palette.secondary,BEAM),g);head.rotation.x=-Math.PI/2;head.position.z=-len*.5-.1;
        const tails=[];for(let j=0;j<2;j++){const m=this._mesh(fx,new T.PlaneGeometry(isSword?.5:.13,2.8),this._shader(fx,fx.skill.weaponId==='bow'?(j?fx.palette.primary:fx.palette.secondary):(j?fx.palette.secondary:fx.palette.primary)),g);m.rotation.x=Math.PI/2;m.rotation.z=j*Math.PI/2;m.position.z=.95;tails.push(m);}
        const helices=[];if(fx.skill.weaponId==='bow')for(let j=0;j<2;j++){const m=this._arc(fx,.2,.07,TAU*1.5,0,.08,fx.palette.secondary,g);m.rotation.x=Math.PI/2;m.position.z=.2+j*.5;helices.push(m);}
        const ring=this._arc(fx,.7,.12,TAU,0,0,fx.palette.primary);ring.rotation.x=Math.PI/2;ring.position.copy(end.clone().sub(fx.group.position).applyAxisAngle(new T.Vector3(0,1,0),-fx.group.rotation.y));
        fx.flights.push({g,end,direction,quaternion,core,head,tails,helices,ring,launch:fx.skill.activeAt+i*.12,impact:fx.skill.activeEnd-(n-1-i)*.12});
      }
      if(type==='thrust') {fx.lance=this._mesh(fx,new T.CylinderGeometry(.03,.14,1,12,1,true),this._shader(fx,fx.palette.secondary,BEAM));fx.lance.rotation.x=Math.PI/2;}
    }
    _buildRain(fx) {
      const T=this.THREE;fx.sky=this._arc(fx,fx.skill.radius,.22,TAU,6.5,0,fx.palette.secondary);fx.floor=this._arc(fx,fx.skill.radius,.13,TAU,.04,0,fx.palette.primary);fx.rain=[];
      const shaft=new T.CylinderGeometry(.025,.025,1,6),head=new T.ConeGeometry(.08,.23,4),m=this._shader(fx,fx.palette.primary,BEAM),tip=this._shader(fx,fx.palette.core,BEAM);
      for(let i=0;i<12;i++){const g=new T.Group();fx.group.add(g);this._mesh(fx,shaft,m,g);const h=this._mesh(fx,head,tip,g);h.position.y=-.6;h.rotation.z=Math.PI;
        const a=i*2.399963,r=fx.skill.radius*Math.sqrt((i+.5)/12)*.88,offset=new T.Vector3(Math.sin(a)*r,0,Math.cos(a)*r);
        fx.rain.push({g,offset,launch:fx.skill.activeAt+i*.1,impact:fx.skill.activeAt+.5+i*.1});}
    }
    _buildVortex(fx) {
      const T=this.THREE;fx.swirl=new T.Group();fx.group.add(fx.swirl);fx.ribbons=[];const cyclone=fx.skill.type==='cyclone';
      for(let i=0;i<8;i++){const y=.2+i*.42,r=cyclone?.5+i*.4:fx.skill.radius*.9-i*.33;
        const ring=this._arc(fx,r,.18+i*.024,TAU*.87,y,.28,i%3?fx.palette.primary:fx.palette.secondary,fx.swirl);ring.rotation.y=i*.85;fx.ribbons.push(ring);}
      fx.floor=this._arc(fx,fx.skill.radius*.92,.18,TAU,.04,0,fx.palette.secondary);this._debris(fx);
    }
    _buildArmor(fx) {
      const T=this.THREE;fx.armor=[];const g=new T.OctahedronGeometry(.45,0),m=new T.MeshStandardMaterial({color:0x87959b,metalness:.85,roughness:.3});
      for(let i=0;i<8;i++){const a=i/8*TAU,n=this._mesh(fx,g,m);n.position.set(Math.sin(a)*.55,1.3+Math.cos(a)*.55,0);n.scale.set(.6,1,.18);fx.armor.push(n);}
      fx.flash=this._arc(fx,1,.28,TAU,0,0,fx.palette.primary);fx.flash.rotation.x=Math.PI/2;fx.flash.position.y=1.35;
      fx.floor=this._arc(fx,1,.15,TAU,.055,0,fx.palette.secondary);this._debris(fx,true);
    }
    _burst(fx,origin,amount) {
      const T=this.THREE,p=new T.Vector3(),v=new T.Vector3();
      for(let i=0;i<amount;i++){const a=this.random()*TAU,r=this.random()*.6,speed=1+this.random()*3;
        p.set(origin.x+Math.sin(a)*r,origin.y+.08,origin.z+Math.cos(a)*r);v.set(Math.sin(a)*speed,.6+this.random()*3,Math.cos(a)*speed);
        const dust=i%3===0;this.pool.spawn(p,v,dust?fx.palette.earth:i%2?fx.palette.primary:fx.palette.secondary,.45+this.random()*.9,dust?.35:.075,dust?.4:3,dust?.25:.9);}
    }
    _trail(fx,dt,rate=80) {
      fx.particleCarry+=dt*rate;const n=Math.min(60,Math.floor(fx.particleCarry));fx.particleCarry-=n;
      const T=this.THREE,p=new T.Vector3(),v=new T.Vector3();
      for(let i=0;i<n;i++){const a=fx.age*6+this.random()*.4,r=fx.skill.radius*.85;
        p.set(fx.group.position.x+Math.sin(a)*r,fx.group.position.y+.9,fx.group.position.z+Math.cos(a)*r);
        if(fx.weaponTip&&['sweep','combo','thrust'].includes(fx.skill.type))fx.weaponTip.getWorldPosition(p);
        v.set(Math.cos(a)*.5,.2,-Math.sin(a)*.5);this.pool.spawn(p,v,i%3?fx.palette.primary:fx.palette.secondary,.35+this.random()*.4,.055,.2,.85);}
    }
    _rocksTick(fx,after,vortex=false) {
      fx.rocks.visible=after>=0&&fx.age<fx.skill.duration;
      if(!fx.rocks.visible)return;
      const d=fx.dummy;
      fx.rockState.forEach((rock,i)=>{const a=rock.angle+(vortex?after*4:0),r=rock.r+(vortex?0:rock.speed*after);
        d.position.set(Math.sin(a)*r,vortex?.35+((i*.31+after*1.7)%3):Math.max(.04,rock.vy*after-4.9*after*after),Math.cos(a)*r);
        d.rotation.set(rock.phase+after*3,after*2,rock.phase);d.scale.setScalar(rock.size*(vortex?1:1-smooth(.7,1.4,after)));d.updateMatrix();fx.rocks.setMatrixAt(i,d.matrix);});fx.rocks.instanceMatrix.needsUpdate=true;
    }
    _tick(fx,dt) {
      const T=this.THREE,s=fx.skill,t=fx.age,type=s.type,phase=clamp((t-s.activeAt)/(s.activeEnd-s.activeAt)),after=t-s.activeAt;
      const energy=smooth(0,Math.max(.04,s.activeAt),t)*(1-smooth(s.activeEnd,s.duration,t));
      for(const m of fx.materials)if(m.uniforms?.uTime){m.uniforms.uTime.value=t;m.uniforms.uOpacity.value=energy;}
      if(fx.customRenderer){fx.customRenderer.tick(this,fx,dt);return;}
      if(type==='shield') {
        if(t>=s.activeAt)this._emit('shield-start',fx,{activeSeconds:s.activeEnd-s.activeAt});
        if(!fx.alive)return;if(t>=s.activeEnd)this._emit('shield-end',fx);
        fx.shell.scale.set(energy,energy*1.1,energy);fx.orbits.forEach((g,i)=>{g.rotation.y=t*(i%2?-.6:.85)+i*.8;g.scale.setScalar(.4+energy*.6);});fx.sigils.rotation.y=-t*.36;
      } else if(type==='sweep') {
        this._impact(fx,0,s.activeAt);fx.swirl.rotation.y=phase*TAU;fx.swirl.scale.setScalar(.65+smooth(.05,.3,t)*.35);this._opacity(fx.floor,energy*.45);
      } else if(type==='slam'||type==='cleave') {
        this._impact(fx,0,s.activeAt);if(!fx.alive)return;
        this._opacity(fx.telegraph,t<s.activeAt?energy*.6:0);
        fx.waves.forEach((n,i)=>{const p=clamp((after-i*.12)/.95);n.scale.setScalar(.12+p*(s.radius-.12));this._opacity(n,after>=i*.12?1-p:0);});
        this._opacity(fx.cracks,after>=0?(1-smooth(.55,s.duration-s.activeAt,after))*.8:0);
        this._opacity(fx.column,after>=0?1-smooth(.06,.65,after):0);
        if(fx.cut){fx.cut.rotation.x=-.8+phase*1.8;this._opacity(fx.cut,t<s.activeAt?energy:Math.max(0,1-after*4));}
        this._rocksTick(fx,after);
      } else if(type==='combo') {
        this._impact(fx,0,s.activeAt);fx.slashes.forEach((m,i)=>{const p=clamp((t-s.activeAt-i*.16)/.5);m.rotation.y=-1+p*2.5;this._opacity(m,(t>=s.activeAt+i*.16?Math.sin(p*Math.PI):0));});this._opacity(fx.floor,energy*.3);
      } else if(type==='lotus') {
        this._impact(fx,0,s.activeAt);fx.flower.rotation.y=t*.65;fx.flower.scale.setScalar(.15+energy*.85);this._opacity(fx.floor,energy*.65);
      } else if(type==='projectile'||type==='volley'||type==='thrust') {
        this._opacity(fx.charge,t<s.activeAt?energy:Math.max(0,1-after*4));
        for(let i=0;i<fx.flights.length;i++){const f=fx.flights[i],p=clamp((t-f.launch)/(f.impact-f.launch));
          f.g.visible=t>=f.launch&&t<=f.impact;
          const world=fx.start.clone().lerp(f.end,p);f.g.position.copy(world.sub(fx.group.position).applyAxisAngle(new T.Vector3(0,1,0),-fx.group.rotation.y));
          f.g.quaternion.copy(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-fx.group.rotation.y).multiply(f.quaternion));
          for(const h of f.helices)h.rotation.z=t*8+i;
          const hitGround=f.end.clone();hitGround.y=this._ground(hitGround);this._impact(fx,i,f.impact,hitGround);
          const q=clamp((t-f.impact)/.35);f.ring.scale.setScalar(.25+q*1.5);this._opacity(f.ring,t>=f.impact?1-q:0);
          if(fx.alive&&f.g.visible&&t<s.duration){const v=f.direction.clone().multiplyScalar(-.7);this.pool.spawn(fx.start.clone().lerp(f.end,p),v,fx.palette.primary,.35,.07,0,.8);}
        }
        if(fx.lance){
          const f=fx.flights[0],end=fx.start.clone().lerp(f.end,phase);
          const localRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-fx.group.rotation.y);
          fx.lance.position.copy(fx.start.clone().add(end).multiplyScalar(.5).sub(fx.group.position).applyQuaternion(localRotation));
          fx.lance.quaternion.copy(localRotation.multiply(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),f.direction)));
          fx.lance.scale.y=fx.start.distanceTo(end);this._opacity(fx.lance,t<=s.activeEnd?energy:0);
        }
      } else if(type==='rain') {
        this._opacity(fx.floor,energy*.55);this._opacity(fx.sky,energy);
        fx.rain.forEach((f,i)=>{const p=clamp((t-f.launch)/(f.impact-f.launch));
          const hit=f.offset.clone().applyAxisAngle(new T.Vector3(0,1,0),fx.group.rotation.y).add(fx.group.position);hit.y=this._ground(hit);
          // Cone head tip is 0.715 below the arrow group: finish on each arrow's terrain sample.
          const localGround=hit.y-fx.group.position.y,endY=localGround+.715;
          f.g.visible=t>=f.launch&&t<f.impact;f.g.position.set(f.offset.x,6.8+(endY-6.8)*p,f.offset.z);
          this._impact(fx,i,f.impact,hit);});
      } else if(type==='vortex'||type==='cyclone') {
        this._impact(fx,0,s.activeAt);fx.swirl.rotation.y=t*(type==='cyclone'?-5:3.5);fx.swirl.scale.setScalar(.35+energy*.65);this._rocksTick(fx,after,true);
      } else if(type==='armor-break') {
        this._impact(fx,0,s.activeAt);fx.armor.forEach((n,i)=>{const a=i/8*TAU,r=.55+Math.max(0,after)*3;n.position.set(Math.sin(a)*r,1.3+Math.cos(a)*r,Math.max(0,after)*-.6);n.rotation.set(after*3,i+after*4,after*2);n.scale.set(.6,1,.18).multiplyScalar(1-smooth(.4,1.1,after));});
        fx.flash.scale.setScalar(.4+Math.max(0,after)*3);this._opacity(fx.flash,after>=0?1-smooth(.05,.45,after):0);fx.floor.scale.setScalar(.2+Math.max(0,after)*s.radius);this._rocksTick(fx,after);
      }
      if(fx.alive&&t>=s.activeAt&&t<s.activeEnd&&t<s.duration)this._trail(fx,dt,type==='shield'?24:75);
    }
    _disposeResources(fx) {
      fx.group.removeFromParent();fx.group.traverse(n=>{if(n.isInstancedMesh&&n.dispose)n.dispose();});
      for(const g of fx.geometries)g.dispose();for(const m of fx.materials)m.dispose();
    }
    _release(fx,reason) {
      if(!fx.alive)return;fx.alive=false;
      const i=this.effects.indexOf(fx);if(i>=0)this.effects.splice(i,1);
      if(fx.emitted.has('shield-start')&&!fx.emitted.has('shield-end'))this._emit('shield-end',fx,{cancelled:reason==='cancel'});
      try{fx.custom?.release?.(this,fx,reason);}catch(_){/* Visual clean-up must never block disposal. */}
      this._disposeResources(fx);this._emit(reason,fx);
    }
  }
  return WeaponVFXCore;
});

