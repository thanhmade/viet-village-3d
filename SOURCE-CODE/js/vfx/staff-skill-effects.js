/* VIET VILLAGE 3D — CÔN (staff) skill effects: Hộ Thân, Chấn Địa and the Côn Quét staff ribbon.
 * Plugged into WeaponVFXCore by skill id, so they share its timeline, events,
 * particle pool, cancel and disposal. Visual only: no damage or cooldown logic,
 * no render loop and no timers; everything advances with the game's delta.
 * Textures/geometries used by every cast are created once per manager
 * (core.sharedResource) and disposed with it; per-cast buffers and materials
 * live in fx.geometries / fx.materials and are disposed exactly once.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./weapon-vfx-core.js'), require('./staff-vfx-config.js'), require('./staff-slam.js'));
  else root.StaffSkillEffects = factory(root.WeaponVFXCore, root.StaffVFXConfig, root.StaffSlam);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core, VFX, Slam) {
  'use strict';
  if (!Core || !VFX) throw new Error('Nạp weapon-vfx-core.js và staff-vfx-config.js trước staff-skill-effects.js.');
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rand = (core, a, b) => a + core.random() * (b - a);
  const tier = core => VFX.quality[core.quality] || VFX.quality.medium;

  // ---------------- procedural textures (pure data: no image files, no canvas) ----------------
  function hash(x, y, seed) { let h = (x * 374761393 + y * 668265263 + seed * 362437) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function valueNoise(size, cell, seed) {
    const out = new Float32Array(size * size), cells = size / cell, wrap = i => ((i % cells) + cells) % cells;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = hash(wrap(ix), wrap(iy), seed), b = hash(wrap(ix + 1), wrap(iy), seed), c = hash(wrap(ix), wrap(iy + 1), seed), d = hash(wrap(ix + 1), wrap(iy + 1), seed);
      const top = a + (b - a) * sx, bottom = c + (d - c) * sx; out[y * size + x] = top + (bottom - top) * sy;
    }
    return out;
  }
  function dataTexture(T, size, fill, repeat) {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) data.set(fill(x, y).map(v => Math.round(clamp(v) * 255)), (y * size + x) * 4);
    const tex = new T.DataTexture(data, size, size, T.RGBAFormat);
    tex.wrapS = tex.wrapT = repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping;
    tex.magFilter = tex.minFilter = T.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
    return tex;
  }
  // Tileable value noise for dissolve edges and streaks.
  function noiseTexture(T) {
    const size = 64, a = valueNoise(size, 8, 11), b = valueNoise(size, 4, 23);
    return dataTexture(T, size, (x, y) => { const i = y * size + x; return [a[i] * .65 + b[i] * .35, b[i], a[i], 1]; }, true);
  }
  // Soft round glow (alpha) with a little texture so it is not a flat disc.
  function softDotTexture(T) {
    const size = 64, n = valueNoise(size, 8, 5);
    return dataTexture(T, size, (x, y) => {
      const r = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
      return [1, 1, 1, clamp(1 - r) ** 1.8 * (.78 + .22 * n[y * size + x])];
    }, false);
  }
  // Branching crack mask: R = crack line, G = glow halo, A = radial fade.
  function crackTexture(T) {
    const size = 256, line = new Float32Array(size * size);
    let seed = 97; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const stamp = (x, y, r) => {
      for (let j = Math.max(0, Math.floor(y - r - 2)); j < Math.min(size, Math.ceil(y + r + 2)); j++)
        for (let i = Math.max(0, Math.floor(x - r - 2)); i < Math.min(size, Math.ceil(x + r + 2)); i++)
          line[j * size + i] = Math.max(line[j * size + i], clamp(1 - Math.hypot(i - x, j - y) / (r + .8)));
    };
    const branch = (x, y, angle, length, width, depth) => {
      for (let k = 0; k < length; k++) {
        angle += (rnd() - .5) * .5; x += Math.cos(angle) * 1.6; y += Math.sin(angle) * 1.6;
        stamp(x, y, Math.max(.6, width * (1 - k / length)));
        if (depth > 0 && rnd() < .035) branch(x, y, angle + (rnd() < .5 ? -1 : 1) * (.5 + rnd() * .6), length * .45, width * .6, depth - 1);
        if (Math.hypot(x - size / 2, y - size / 2) > size * .47) break;
      }
    };
    for (let i = 0; i < 9; i++) branch(size / 2, size / 2, i / 9 * TAU + rnd() * .4, 58 + rnd() * 30, 2.4, 2);
    const halo = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let sum = 0, count = 0;
      for (let j = -4; j <= 4; j += 2) for (let i = -4; i <= 4; i += 2) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < size && yy < size) { sum += line[yy * size + xx]; count++; } }
      halo[y * size + x] = sum / count;
    }
    return dataTexture(T, size, (x, y) => {
      const r = Math.hypot(x / size - .5, y / size - .5) * 2;
      return [line[y * size + x], clamp(halo[y * size + x] * 2.2), 0, 1 - smooth(.72, 1, r)];
    }, false);
  }
  // Thin closed band of unit radius (the shield's tilted rings).
  function bandGeometry(T, segments) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= segments; i++) {
      const u = i / segments, a = u * TAU;
      for (let v = 0; v < 2; v++) { pos.push(Math.sin(a), v - .5, Math.cos(a)); uv.push(u, v); }
      if (i < segments) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere();
    return g;
  }
  function sharedFor(core) {
    const q = tier(core);
    return core.sharedResource('staff-vfx:' + core.quality, T => {
      const column = new T.CylinderGeometry(1, 1, 1, 28, 1, true); column.translate(0, .5, 0);
      const r = {
        noise: noiseTexture(T), dot: softDotTexture(T), crack: crackTexture(T),
        sphere: new T.SphereGeometry(1, q.sphereSegments, Math.round(q.sphereSegments * .7)),
        band: bandGeometry(T, 96), quad: new T.PlaneGeometry(1, 1), column,
        rock: new T.DodecahedronGeometry(1, 0),
        rockMaterial: new T.MeshStandardMaterial({color: VFX.colors.rock, roughness: .92, metalness: 0, flatShading: true})
      };
      Object.defineProperty(r, 'dispose', {value() { for (const value of Object.values(r)) value.dispose(); }});
      return r;
    });
  }
  const palette = T => Object.fromEntries(Object.entries(VFX.colors).map(([k, v]) => [k, new T.Color(v)]));
  function material(core, fx, options) {
    const T = core.THREE, m = new T.ShaderMaterial({transparent: true, depthWrite: false, toneMapped: false,
      blending: T.AdditiveBlending, side: T.DoubleSide, ...options,
      fragmentShader: options.fragmentShader.replace(/\}\s*$/, '\n#include <colorspace_fragment>\n}')});
    fx.materials.add(m); return m;
  }
  function mesh(core, fx, geometry, mat, parent, order = 9) {
    const n = new core.THREE.Mesh(geometry, mat); n.renderOrder = order; parent.add(n); return n;
  }
  // World-space layer: fx.group never rotates, so a child at -group.position is
  // in world coordinates while the group itself still marks the effect's anchor.
  function worldLayer(core, fx) { fx.world = new core.THREE.Group(); fx.world.name = 'world-space'; fx.group.add(fx.world); }
  function syncWorld(fx) { fx.group.rotation.set(0, 0, 0); if (fx.world) fx.world.position.copy(fx.group.position).negate(); }
  function anchorAtCaster(core, fx) { const p = fx.caster.getWorldPosition(fx.anchor || (fx.anchor = new core.THREE.Vector3())); fx.group.position.set(p.x, core._ground(p), p.z); }

  // Per-cast dust: soft sprites (normal blending so dust darkens nothing and never glows).
  function createDust(core, fx, capacity, color) {
    const T = core.THREE, g = new T.BufferGeometry();
    const position = new Float32Array(capacity * 3), alpha = new Float32Array(capacity), size = new Float32Array(capacity);
    g.setAttribute('position', new T.BufferAttribute(position, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aAlpha', new T.BufferAttribute(alpha, 1).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aSize', new T.BufferAttribute(size, 1).setUsage(T.DynamicDrawUsage));
    g.setDrawRange(0, 0); fx.geometries.add(g);
    const m = material(core, fx, {blending: T.NormalBlending, side: T.FrontSide,
      uniforms: {uMap: {value: sharedFor(core).dot}, uColor: {value: new T.Color(color)}, uScale: {value: 300}},
      vertexShader: 'attribute float aAlpha;attribute float aSize;varying float vAlpha;uniform float uScale;void main(){vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(aSize*uScale/max(.1,-mv.z),1.,96.);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform sampler2D uMap;uniform vec3 uColor;varying float vAlpha;void main(){float a=texture2D(uMap,gl_PointCoord).a*vAlpha;if(a<.01)discard;gl_FragColor=vec4(uColor,a);}'});
    const points = new T.Points(g, m); points.frustumCulled = false; points.renderOrder = 7; points.visible = false; fx.world.add(points);
    const velocity = new Float32Array(capacity * 3), age = new Float32Array(capacity), life = new Float32Array(capacity), base = new Float32Array(capacity), grow = new Float32Array(capacity);
    let count = 0;
    const move = (to, from) => {
      position.copyWithin(to * 3, from * 3, from * 3 + 3); velocity.copyWithin(to * 3, from * 3, from * 3 + 3);
      age[to] = age[from]; life[to] = life[from]; base[to] = base[from]; size[to] = size[from]; grow[to] = grow[from]; alpha[to] = alpha[from];
    };
    return {
      get count() { return count; },
      spawn(x, y, z, vx, vy, vz, s, l, a) {
        if (count >= capacity) return false; const i = count++;
        position[i * 3] = x; position[i * 3 + 1] = y; position[i * 3 + 2] = z; velocity[i * 3] = vx; velocity[i * 3 + 1] = vy; velocity[i * 3 + 2] = vz;
        age[i] = 0; life[i] = l; base[i] = a; size[i] = s; grow[i] = s * 1.6; alpha[i] = 0; return true;
      },
      update(dt) {
        if (!count) { points.visible = false; return; }
        const drag = Math.exp(-dt * 2.4);
        for (let i = 0; i < count; i++) {
          age[i] += dt; const k = age[i] / life[i];
          if (k >= 1) { if (i !== --count) move(i, count); i--; continue; }
          const j = i * 3; velocity[j] *= drag; velocity[j + 1] = velocity[j + 1] * drag + .12 * dt; velocity[j + 2] *= drag;
          position[j] += velocity[j] * dt; position[j + 1] += velocity[j + 1] * dt; position[j + 2] += velocity[j + 2] * dt;
          alpha[i] = base[i] * smooth(0, .12, k) * (1 - smooth(.45, 1, k)) * VFX.intensity; size[i] += grow[i] * dt / life[i];
        }
        g.setDrawRange(0, count); points.visible = count > 0;
        for (const name of ['position', 'aAlpha', 'aSize']) g.attributes[name].needsUpdate = true;
      }
    };
  }

  // ---------------- shaders ----------------
  const UV_VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  // Camera-facing quad: no camera reference needed, scale comes from the object.
  const BILLBOARD_VERTEX = 'varying vec2 vUv;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);mv.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));gl_Position=projectionMatrix*mv;}';
  const GLOW_FRAGMENT = 'uniform sampler2D uMap;uniform vec3 uColor,uCore;uniform float uOpacity;varying vec2 vUv;void main(){float a=texture2D(uMap,vUv).a;gl_FragColor=vec4(mix(uColor,uCore,smoothstep(.5,1.,a)),a*uOpacity);}';
  const TRAIL_VERTEX = 'attribute float aAge;attribute float aSide;varying float vAge;varying float vSide;varying float vHeight;void main(){vAge=aAge;vSide=aSide;vec4 w=modelMatrix*vec4(position,1.);vHeight=w.y;gl_Position=projectionMatrix*viewMatrix*w;}';
  // side 0 = inner staff point, 1 = tip. Age 0 = newest sample (leading edge).
  const TRAIL_FRAGMENT = `uniform vec3 uJade,uGold,uCore;uniform float uOpacity,uTime,uFilament;uniform sampler2D uNoise;
    varying float vAge;varying float vSide;varying float vHeight;
    void main(){
      float age=clamp(vAge,0.,1.),side=clamp(vSide,0.,1.);
      float body=smoothstep(0.,.45,side)*(1.-.4*smoothstep(.96,1.,side));
      float d=(side-.86)/.06;float coreLine=exp(-d*d); // x*x: GLSL pow() is undefined for x<0
      float r=(side-.965)/.022;float rim=exp(-r*r);      // thin warm-white leading rim
      float lead=1.-smoothstep(0.,.28,age);
      float n=texture2D(uNoise,vec2(age*1.7+uTime*.45,side*1.3+vHeight*.2)).r;
      float wobble=texture2D(uNoise,vec2(side*.9+uTime*.07,age*.6)).g;
      // Flow filaments run along the band (constant side), drift with age and time.
      float fil=pow(.5+.5*sin((side+(wobble-.5)*.08)*6.2831*6.+age*2.5-uTime*3.),10.)*smoothstep(.08,.35,side)*(1.-smoothstep(.9,.98,side));
      float dissolve=smoothstep(age-.12,age+.1,n*1.2);
      float fade=pow(1.-age,1.5);
      vec3 col=mix(uJade,uCore,clamp(coreLine*.6+fil*.35,0.,1.));
      col=mix(col,uGold,clamp(rim*.9+lead*.5,0.,1.));
      float a=(body*.55+coreLine*.85+fil*uFilament*.5+rim*.8+lead*.35*smoothstep(.5,1.,side))*fade*dissolve*uOpacity;
      gl_FragColor=vec4(col,min(a,.95));
    }`;
  // Thin light layer on the active staff segment (STAFF_GLOW): brighter where the tube faces the camera.
  const STAFF_GLOW_FRAGMENT = `uniform vec3 uColor,uCore;uniform float uOpacity;varying vec3 vN;varying vec3 vView;varying vec3 vLocal;
    void main(){float facing=abs(dot(normalize(vN),normalize(vView)));float centre=facing*facing;
      gl_FragColor=vec4(mix(uColor,uCore,centre),(centre*.7+(1.-facing)*.25)*uOpacity);}`;
  const SHELL_VERTEX = 'varying vec3 vN;varying vec3 vView;varying vec3 vLocal;void main(){vLocal=normalize(position);vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}';
  // uHits[i] = (direction in shell space, start time; w < 0 = unused slot).
  const SHELL_FRAGMENT = `uniform vec3 uJade,uGold;uniform float uOpacity,uTime,uDissolve,uRimPower,uRim,uBase,uPattern,uRippleSpeed,uRippleLife;
    uniform vec4 uHits[4];uniform sampler2D uNoise;varying vec3 vN;varying vec3 vView;varying vec3 vLocal;
    void main(){
      float facing=abs(dot(normalize(vN),normalize(vView)));
      float rim=pow(1.-facing,uRimPower);
      float lat=asin(clamp(vLocal.y,-1.,1.)),lon=atan(vLocal.z,vLocal.x);
      float lattice=pow(.5+.5*sin(lon*12.+lat*3.),26.)+pow(.5+.5*sin(lat*16.-uTime*.6),30.);
      float n=texture2D(uNoise,vec2(lon*.32+uTime*.03,lat*.5)).r;
      float ripple=0.;
      for(int i=0;i<4;i++){
        if(uHits[i].w<0.)continue;float age=uTime-uHits[i].w;if(age<0.||age>uRippleLife)continue;
        float ang=acos(clamp(dot(vLocal,normalize(uHits[i].xyz)),-1.,1.));
        float d=(ang-age*uRippleSpeed)/.16; // x*x: GLSL pow() is undefined for x<0
        ripple+=exp(-d*d)*(1.-age/uRippleLife)+exp(-ang*ang*22.)*(1.-smoothstep(0.,.22,age))*1.4;
      }
      float dissolve=smoothstep(uDissolve-.08,uDissolve+.08,n);
      vec3 col=mix(mix(uJade,uGold,clamp(rim*.4+lattice*uPattern*2.,0.,1.)),uGold,clamp(ripple,0.,1.));
      float a=(uBase+rim*uRim+lattice*uPattern*(.4+.6*rim)+ripple*1.1)*dissolve*uOpacity;
      gl_FragColor=vec4(col,min(a,.85));
    }`;
  const BAND_FRAGMENT = `uniform vec3 uJade,uGold;uniform float uOpacity,uTime,uSpeed;varying vec2 vUv;
    void main(){float across=1.-abs(vUv.y-.5)*2.;float dash=smoothstep(.15,.75,.5+.5*sin(vUv.x*6.2831*7.-uTime*uSpeed*6.));
      float head=pow(fract(vUv.x-uTime*uSpeed*.16),6.);
      gl_FragColor=vec4(mix(uJade,uGold,.65+.35*head),across*across*(.25+.55*dash+.6*head)*uOpacity);}`;
  const SIGIL_FRAGMENT = `uniform vec3 uGold;uniform float uOpacity,uTime;varying vec2 vUv;
    float seg(vec2 p,vec2 a,vec2 b){vec2 ba=b-a;return 1.-smoothstep(.025,.065,length(p-a-ba*clamp(dot(p-a,ba)/dot(ba,ba),0.,1.)));}
    void main(){float cell=floor(vUv.x*16.);vec2 p=vec2(vUv.y,fract(vUv.x*16.-uTime*.12));
      float g=seg(p,vec2(.5,.12),vec2(.5,.88));
      g=max(g,seg(p,vec2(.22,.7),vec2(.78,.7)));g=max(g,seg(p,vec2(.28,.38),vec2(.72,.38)));
      g=max(g,seg(p,vec2(.5,.5),vec2(.2+mod(cell,2.)*.6,.2)));
      float rails=(1.-smoothstep(.012,.028,abs(p.x-.06)))+(1.-smoothstep(.012,.028,abs(p.x-.94)));
      gl_FragColor=vec4(uGold,(g*.8+rails*.25)*uOpacity);}`;
  // Concentric seal rings with angular strokes. Abstract ornament, no fabricated text.
  const SEAL_FRAGMENT = `uniform vec3 uJade,uGold;uniform float uOpacity,uTime;varying vec2 vUv;
    float ring(float r,float at,float w){return 1.-smoothstep(w,w+.008,abs(r-at));}
    void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x)+uTime*.12;
      float rings=ring(r,.91,.006)+ring(r,.84,.003)+ring(r,.61,.004)+ring(r,.48,.002);
      float sectors=pow(max(0.,cos(a*24.)),16.);
      float strokes=sectors*smoothstep(.64,.66,r)*(1.-smoothstep(.79,.81,r));
      float knots=pow(max(0.,cos(a*8.)),12.)*ring(r,.54,.025);
      float halo=exp(-abs(r-.87)*38.)*.2;
      float alpha=(rings*.7+strokes*.8+knots*.6+halo)*uOpacity*(1.-smoothstep(.97,1.,r));
      gl_FragColor=vec4(mix(uJade,uGold,clamp(rings+strokes,0.,1.)),alpha);}`;
  const COLUMN_FRAGMENT = `uniform vec3 uJade,uGold,uCore;uniform float uOpacity,uTime;uniform sampler2D uNoise;varying vec2 vUv;
    void main(){float h=vUv.y;float n=texture2D(uNoise,vec2(vUv.x*3.,h*1.2-uTime*1.8)).r;
      float streak=smoothstep(.42,.86,n);float filament=pow(.5+.5*sin(vUv.x*6.2831*11.+h*2.-uTime*4.),16.);float fade=pow(1.-h,.8)*smoothstep(0.,.045,h);
      vec3 c=mix(uJade,uCore,streak*.6+(1.-h)*.3);c=mix(c,uGold,smoothstep(.75,1.,1.-h)*.35);
      gl_FragColor=vec4(c,(.12+.42*streak+.7*filament)*fade*uOpacity);}`;
  // uv.y: 0 inner edge → 1 leading (outer) edge of the shock ring.
  const RING_FRAGMENT = `uniform vec3 uJade,uGold,uCore;uniform float uOpacity,uTime;uniform sampler2D uNoise;varying vec2 vUv;
    void main(){float across=vUv.y;float leading=smoothstep(.55,1.,across)*(1.-smoothstep(.93,1.,across));
      float body=smoothstep(0.,.6,across)*(1.-smoothstep(.93,1.,across));float n=texture2D(uNoise,vec2(vUv.x*8.,uTime*.5)).r;
      vec3 c=mix(uJade,uGold,leading);c=mix(c,uCore,pow(leading,4.)*.5);
      gl_FragColor=vec4(c,(body*.45+leading*.8)*(.7+.3*n)*uOpacity);}`;
  const CRACK_FRAGMENT = `uniform sampler2D uMap;uniform vec3 uJade,uGold,uCore;uniform float uOpacity,uHeat,uRot,uReveal;varying vec2 vUv;
    void main(){vec2 p=vUv-.5;float c=cos(uRot),s=sin(uRot);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+.5;
      vec4 m=texture2D(uMap,p);float line=m.r,halo=m.g;vec3 col=mix(uJade,uGold,line*uHeat);col=mix(col,uCore,line*line*uHeat*.6);
      float radius=length(vUv-.5)*2.;float reveal=1.-smoothstep(uReveal-.08,uReveal+.06,radius);
      gl_FragColor=vec4(col,(line*.75+halo*.22)*m.a*uOpacity*reveal);}`;

  // ---------------- Côn Quét: ribbon trail bound to two points on the staff ----------------
  // Used by staff-sweep.js (Côn Quét timeline, hit windows, wave): the ribbon replaces a
  // single-point tip trail with the band swept by the staff itself.
  function makeTrail(core, fx, samples, opacityScale, parent) {
    const T = core.THREE, g = new T.BufferGeometry(), c = VFX.sweep.colors;
    const position = new Float32Array(samples * 6), age = new Float32Array(samples * 2), side = new Float32Array(samples * 2), index = [];
    for (let i = 0; i < samples; i++) { side[i * 2 + 1] = 1; if (i < samples - 1) { const j = i * 2; index.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); } }
    g.setAttribute('position', new T.BufferAttribute(position, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aAge', new T.BufferAttribute(age, 1).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aSide', new T.BufferAttribute(side, 1)); g.setIndex(index); g.setDrawRange(0, 0); fx.geometries.add(g);
    // Bounds follow the live samples each frame, so the band can stay frustum-culled.
    g.boundingSphere = new T.Sphere();
    const m = material(core, fx, {uniforms: {uJade: {value: new T.Color(c.body)}, uGold: {value: new T.Color(c.rim)}, uCore: {value: new T.Color(c.inner)},
      uOpacity: {value: 0}, uTime: {value: 0}, uFilament: {value: VFX.sweep.filaments}, uNoise: {value: sharedFor(core).noise}},
      vertexShader: TRAIL_VERTEX, fragmentShader: TRAIL_FRAGMENT});
    const n = mesh(core, fx, g, m, parent, 11); n.visible = false;
    return {mesh: n, geometry: g, material: m, position, age, opacityScale, head: 0, count: 0,
      ring: Array.from({length: samples}, () => ({inner: new T.Vector3(), outer: new T.Vector3(), time: 0})),
      last: {inner: new T.Vector3(), outer: new T.Vector3(), time: 0, valid: false}};
  }
  function pushSample(trail, inner, outer, time) {
    const slot = trail.ring[trail.head]; slot.inner.copy(inner); slot.outer.copy(outer); slot.time = time;
    trail.head = (trail.head + 1) % trail.ring.length; trail.count = Math.min(trail.count + 1, trail.ring.length);
  }
  // Newest sample first; samples older than `life` are dropped from the history.
  function writeTrail(trail, now, life) {
    const total = trail.ring.length, p = trail.position; let n = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let k = 0; k < trail.count; k++) {
      const s = trail.ring[(trail.head - 1 - k + total) % total], a = (now - s.time) / life;
      if (a > 1) break;
      const j = n * 6; p[j] = s.inner.x; p[j + 1] = s.inner.y; p[j + 2] = s.inner.z;
      p[j + 3] = s.outer.x; p[j + 4] = s.outer.y; p[j + 5] = s.outer.z;
      for (let o = 0; o < 6; o += 3) {
        minX = Math.min(minX, p[j + o]); minY = Math.min(minY, p[j + o + 1]); minZ = Math.min(minZ, p[j + o + 2]);
        maxX = Math.max(maxX, p[j + o]); maxY = Math.max(maxY, p[j + o + 1]); maxZ = Math.max(maxZ, p[j + o + 2]);
      }
      trail.age[n * 2] = trail.age[n * 2 + 1] = clamp(a); n++;
    }
    trail.count = n; trail.mesh.visible = n >= 2 && trail.material.uniforms.uOpacity.value > 0;
    const sphere = trail.geometry.boundingSphere;
    if (n) {
      sphere.center.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      sphere.radius = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2 + .01;
    } else sphere.radius = 0;
    trail.geometry.setDrawRange(0, Math.max(0, n - 1) * 6);
    trail.geometry.attributes.position.needsUpdate = trail.geometry.attributes.aAge.needsUpdate = true;
  }
  /* createStaffRibbon(core, fx) → {trails, glows, meshes, update(t, {emitting, opacity, tip})}
   * `opacity` is a 0…1 envelope from the caller's timeline (× sweep.opacity).
   * Two branches on the held staff (fx.weapon, sweep.inner/outer and mirrorInner/mirrorOuter in
   * weapon-local metres) are sampled after this frame's animation/IK. Between frames the staff
   * pose is interpolated (position lerp + rotation slerp), so a fast swing fills in along its
   * arc rather than along a straight chord. Optional spinAngle/spinPivot retain unwrapped
   * whole-body rotation when a frame spans more than half a turn. A jump larger than teleportFactor × the tip's
   * distance from the grip restarts the history. Vertices are in world space under a layer that
   * cancels fx.group's transform, so the history never turns or slides with the caster.
   * Without a staff model the band runs from the given tip toward the caster.
   * Buffers/materials belong to fx and are disposed with it. */
  function createStaffRibbon(core, fx) {
    const T = core.THREE, q = tier(core), cfg = VFX.sweep, shared = sharedFor(core);
    const layer = new T.Group(); layer.name = 'staff-ribbon-world'; layer.matrixAutoUpdate = false; fx.group.add(layer);
    const branches = [{inner: cfg.inner, outer: cfg.outer, scale: 1}];
    if (cfg.mirror && fx.weapon) branches.push({inner: cfg.mirrorInner, outer: cfg.mirrorOuter, scale: cfg.mirrorOpacity});
    const trails = branches.map(branch => makeTrail(core, fx, q.trailSamples, branch.scale, layer));
    const glowMaterial = material(core, fx, {uniforms: {uColor: {value: new T.Color(cfg.colors.body)}, uCore: {value: new T.Color(cfg.colors.inner)}, uOpacity: {value: 0}},
      vertexShader: SHELL_VERTEX, fragmentShader: STAFF_GLOW_FRAGMENT});
    const glows = fx.weapon ? branches.map(branch => {
      const m = branch.scale === 1 ? glowMaterial : material(core, fx, {uniforms: {uColor: glowMaterial.uniforms.uColor, uCore: glowMaterial.uniforms.uCore, uOpacity: {value: 0}},
        vertexShader: SHELL_VERTEX, fragmentShader: STAFF_GLOW_FRAGMENT});
      const tube = mesh(core, fx, shared.column, m, layer, 12); tube.visible = false; tube.name = 'staff-ribbon-glow';
      return {mesh: tube, material: m, branch};
    }) : [];
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), d = new T.Vector3(), centre = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    // Staff pose history (world): current, previous, interpolated.
    const pose = {p: new T.Vector3(), q: new T.Quaternion(), s: new T.Vector3(), lp: new T.Vector3(), lq: new T.Quaternion(), ls: new T.Vector3(),
      ip: new T.Vector3(), iq: new T.Quaternion(), is: new T.Vector3(), valid: false};
    const place = (local, p, rotation, s, out) => out.set(local[0] * s.x, local[1] * s.y, local[2] * s.z).applyQuaternion(rotation).add(p);
    function reset() { for (const trail of trails) { trail.count = 0; trail.last.valid = false; } pose.valid = false; }
    const spin = {previous: null, pivot: new T.Vector3(), inverse: new T.Quaternion(), lastInverse: new T.Quaternion(),
      rotation: new T.Quaternion(), fromP: new T.Vector3(), toP: new T.Vector3(), fromQ: new T.Quaternion(), toQ: new T.Quaternion(), pivotAt: new T.Vector3()};
    function sampleStaff(t, spinAngle, spinPivot) {
      fx.weapon.updateWorldMatrix(true, false); fx.weapon.matrixWorld.decompose(pose.p, pose.q, pose.s);
      const gripX = Number.isFinite(fx.weapon.userData.staffSweepGripX) ? fx.weapon.userData.staffSweepGripX : 0;
      const reach = Math.abs(cfg.outer[0] - gripX) * Math.abs(pose.s.x);
      if (pose.valid) {
        place(cfg.outer, pose.lp, pose.lq, pose.ls, c); place(cfg.outer, pose.p, pose.q, pose.s, d);
        if (c.distanceTo(d) > cfg.teleportFactor * reach) reset();
      }
      if (!pose.valid) {
        trails.forEach((trail, i) => { place(branches[i].inner, pose.p, pose.q, pose.s, a); place(branches[i].outer, pose.p, pose.q, pose.s, b);
          pushSample(trail, a, b, t); trail.last.time = t; trail.last.valid = true; });
      } else {
        place(cfg.outer, pose.lp, pose.lq, pose.ls, c); place(cfg.outer, pose.p, pose.q, pose.s, d);
        // Strip the known whole-body rotation before slerping the residual pose.
        // Plain quaternion slerp loses winding for frames crossing >180° or a complete turn.
        const winding = Number.isFinite(spinAngle) && Number.isFinite(spin.previous) && spinPivot;
        const delta = winding ? spinAngle - spin.previous : 0;
        if (winding) {
          spin.lastInverse.setFromAxisAngle(up, -spin.previous); spin.inverse.setFromAxisAngle(up, -spinAngle);
          spin.fromP.copy(pose.lp).sub(spin.pivot).applyQuaternion(spin.lastInverse);
          spin.toP.copy(pose.p).sub(spinPivot).applyQuaternion(spin.inverse);
          spin.fromQ.copy(spin.lastInverse).multiply(pose.lq); spin.toQ.copy(spin.inverse).multiply(pose.q);
        }
        const frameTime = t - trails[0].last.time;
        const first = frameTime > cfg.life ? 1 - cfg.life / frameTime : 0;
        const travel = Math.max(c.distanceTo(d), winding ? Math.abs(delta) * Math.max(c.distanceTo(spin.pivot), d.distanceTo(spinPivot)) : 0);
        const steps = Math.min(cfg.maxInsertPerFrame, Math.max(1, Math.ceil(travel * (1 - first) / cfg.maxStep)));
        for (let i = 1; i <= steps; i++) {
          const k = first + (1 - first) * i / steps;
          pose.is.lerpVectors(pose.ls, pose.s, k);
          if (winding) {
            spin.rotation.setFromAxisAngle(up, spin.previous + delta * k);
            spin.pivotAt.lerpVectors(spin.pivot, spinPivot, k);
            pose.ip.lerpVectors(spin.fromP, spin.toP, k).applyQuaternion(spin.rotation).add(spin.pivotAt);
            pose.iq.slerpQuaternions(spin.fromQ, spin.toQ, k).premultiply(spin.rotation);
          } else {
            pose.ip.lerpVectors(pose.lp, pose.p, k); pose.iq.slerpQuaternions(pose.lq, pose.q, k);
          }
          trails.forEach((trail, j) => {
            place(branches[j].inner, pose.ip, pose.iq, pose.is, a); place(branches[j].outer, pose.ip, pose.iq, pose.is, b);
            pushSample(trail, a, b, trail.last.time + (t - trail.last.time) * k);
          });
        }
        for (const trail of trails) trail.last.time = t;
      }
      spin.previous = Number.isFinite(spinAngle) && spinPivot ? spinAngle : null;
      if (spinPivot) spin.pivot.copy(spinPivot);
      pose.lp.copy(pose.p); pose.lq.copy(pose.q); pose.ls.copy(pose.s); pose.valid = true;
    }
    function sampleTip(t, tip) {
      const trail = trails[0];
      fx.caster.getWorldPosition(centre); centre.y = tip.y; b.copy(tip);
      const towards = centre.sub(tip), length = towards.length();
      a.copy(tip).addScaledVector(towards, length > 1e-6 ? Math.min(Math.abs(cfg.outer[0] - cfg.inner[0]), length) / length : 0);
      if (trail.last.valid && b.distanceTo(trail.last.outer) > cfg.teleportFactor * Math.abs(cfg.outer[0])) reset();
      if (!trail.last.valid) pushSample(trail, a, b, t);
      else {
        const steps = Math.min(cfg.maxInsertPerFrame, Math.max(1, Math.ceil(b.distanceTo(trail.last.outer) / cfg.maxStep)));
        for (let i = 1; i <= steps; i++) {
          const k = i / steps; c.lerpVectors(trail.last.inner, a, k); d.lerpVectors(trail.last.outer, b, k);
          pushSample(trail, c, d, trail.last.time + (t - trail.last.time) * k);
        }
      }
      trail.last.inner.copy(a); trail.last.outer.copy(b); trail.last.time = t; trail.last.valid = true;
    }
    return {
      trails, glows, meshes: trails.map(trail => trail.mesh), reset,
      update(t, {emitting = false, opacity = 0, tip = null, spinAngle = null, spinPivot = null} = {}) {
        fx.group.updateWorldMatrix(true, false); layer.matrix.copy(fx.group.matrixWorld).invert(); layer.matrixWorldNeedsUpdate = true;
        const envelope = clamp(opacity) * VFX.intensity;
        for (const trail of trails) { const u = trail.material.uniforms; u.uTime.value = t; u.uOpacity.value = envelope * cfg.opacity * trail.opacityScale; }
        if (emitting) { if (fx.weapon) sampleStaff(t, spinAngle, spinPivot); else if (tip) sampleTip(t, tip); }
        for (const trail of trails) writeTrail(trail, t, cfg.life);
        // STAFF_GLOW: only while the staff is actually sweeping.
        for (const glow of glows) {
          const show = emitting && envelope > 0 && pose.valid;
          glow.mesh.visible = show; glow.material.uniforms.uOpacity.value = show ? envelope * cfg.glow.opacity * glow.branch.scale : 0;
          if (!show) continue;
          place(glow.branch.inner, pose.p, pose.q, pose.s, a); place(glow.branch.outer, pose.p, pose.q, pose.s, b);
          const radius = cfg.glow.radius * pose.s.x, length = a.distanceTo(b);
          glow.mesh.position.copy(a); glow.mesh.quaternion.setFromUnitVectors(up, d.subVectors(b, a).normalize());
          glow.mesh.scale.set(radius, length, radius);
        }
      }
    };
  }

  // ---------------- Hộ Thân: Fresnel shell, tilted bands, real-hit ripples ----------------
  const ProtectiveShieldEffect = {
    build(core, fx) {
      const T = core.THREE, cfg = VFX.shield, shared = sharedFor(core), c = palette(T);
      const height = fx.casterHeight, radius = Math.max(fx.skill.radius * .75, height * cfg.radiusFactor), center = height * cfg.centerFactor;
      const time = {value: 0}, hits = {value: Array.from({length: 4}, () => new T.Vector4(0, 1, 0, -1))}, dissolve = {value: -.2};
      const shellUniforms = rim => ({uJade: {value: c.jade}, uGold: {value: c.gold}, uOpacity: {value: 0}, uTime: time, uDissolve: dissolve,
        uRimPower: {value: cfg.rimPower}, uRim: {value: rim}, uBase: {value: cfg.baseOpacity}, uPattern: {value: cfg.patternOpacity},
        uRippleSpeed: {value: cfg.rippleSpeed}, uRippleLife: {value: cfg.rippleLife}, uHits: hits, uNoise: {value: shared.noise}});
      const root = new T.Group(); root.name = 'shield-shell'; root.position.y = center; fx.group.add(root);
      const back = material(core, fx, {uniforms: shellUniforms(cfg.rimOpacity * .3), side: T.BackSide, vertexShader: SHELL_VERTEX, fragmentShader: SHELL_FRAGMENT});
      const front = material(core, fx, {uniforms: shellUniforms(cfg.rimOpacity), side: T.FrontSide, vertexShader: SHELL_VERTEX, fragmentShader: SHELL_FRAGMENT});
      const inner = mesh(core, fx, shared.sphere, back, root, 8); inner.scale.setScalar(radius * .995);
      const shell = mesh(core, fx, shared.sphere, front, root, 10); shell.scale.setScalar(radius);
      const bands = cfg.bandTilt.map((tilt, i) => {
        const pivot = new T.Group(); pivot.rotation.set(tilt, i * 1.3, i ? .3 : -.18); root.add(pivot);
        const m = material(core, fx, {uniforms: {uJade: {value: c.jade}, uGold: {value: c.gold}, uOpacity: {value: 0}, uTime: time, uSpeed: {value: cfg.bandSpeed[i]}},
          vertexShader: UV_VERTEX, fragmentShader: BAND_FRAGMENT});
        const band = mesh(core, fx, shared.band, m, pivot, 10); band.scale.set(radius * (1.04 + i * .05), cfg.bandWidth, radius * (1.04 + i * .05));
        return {pivot, material: m, speed: cfg.bandSpeed[i]};
      });
      const sigilMaterial = material(core, fx, {uniforms: {uGold: {value: c.gold}, uOpacity: {value: 0}, uTime: time}, vertexShader: UV_VERTEX, fragmentShader: SIGIL_FRAGMENT});
      const sigils = new T.Group(); root.add(sigils);
      for (let i = 0; i < 3; i++) {
        const pivot = new T.Group(); pivot.rotation.y = i / 3 * Math.PI; sigils.add(pivot);
        const n = mesh(core, fx, shared.band, sigilMaterial, pivot, 10);
        n.rotation.z = Math.PI / 2; n.scale.set(radius * 1.015, .16, radius * 1.015);
      }
      const floorMaterial = material(core, fx, {uniforms: {uJade: {value: c.jade}, uGold: {value: c.gold}, uTime: time, uOpacity: {value: 0}}, vertexShader: UV_VERTEX, fragmentShader: SEAL_FRAGMENT});
      const floor = mesh(core, fx, shared.quad, floorMaterial, fx.group, 7); floor.rotation.x = -Math.PI / 2; floor.position.y = .035; floor.scale.setScalar(radius * 2.6);
      fx.shield = {root, shell, bands, sigils, sigilMaterial, floorMaterial, floor, center, endAt: fx.skill.activeEnd, broken: false, front, back, time, hits: hits.value, dissolve, radius, hitIndex: 0, hitCount: 0, moteCarry: 0,
        p: new T.Vector3(), v: new T.Vector3()};
    },
    // Centred on the character's world position (feet on the ground), never tilted by hands or swing.
    place(core, fx) {
      anchorAtCaster(core, fx); syncWorld(fx);
      const sh = fx.shield; if (!sh) return; fx.caster.getWorldPosition(sh.p);
      sh.root.position.y = sh.center + sh.p.y - fx.group.position.y;
      sh.floor.quaternion.setFromUnitVectors(sh.v.set(0, 0, 1), core.groundNormal(sh.p.x, sh.p.z, sh.p));
    },
    tick(core, fx, dt) {
      const s = fx.skill, t = fx.age, cfg = VFX.shield, sh = fx.shield;
      if (t >= s.activeAt) core._emit('shield-start', fx, {activeSeconds: s.activeEnd - s.activeAt});
      if (!fx.alive) return;
      if (t >= sh.endAt) core._emit('shield-end', fx, {reason: sh.broken ? 'depleted' : 'expired'});
      const grow = smooth(s.activeAt - .1, s.activeAt + .22, t), pop = 1 + .08 * Math.sin(clamp((t - s.activeAt) / .35) * Math.PI);
      const fade = smooth(sh.endAt, sh.endAt + cfg.fadeOut, t), flash = sh.broken ? .45 * (1 - smooth(sh.endAt, sh.endAt + .09, t)) : 0;
      const energy = grow * VFX.intensity * (1 + flash), held = energy * (1 - fade);
      sh.time.value = t; sh.dissolve.value = -.2 + fade * 1.3;
      sh.front.uniforms.uOpacity.value = sh.back.uniforms.uOpacity.value = energy;
      sh.root.visible = energy > 0 && fade < 1;
      sh.root.scale.setScalar(Math.max(.001, (.55 + .45 * grow) * pop * (1 + fade * (sh.broken ? .22 : .06))));
      for (const b of sh.bands) { b.pivot.rotation.y += b.speed * dt; b.material.uniforms.uOpacity.value = held * .9; }
      sh.sigils.rotation.y = -t * .12; sh.sigilMaterial.uniforms.uOpacity.value = held * smooth(s.activeAt + .2, s.activeAt + .6, t) * .55;
      sh.floorMaterial.uniforms.uOpacity.value = held * .65;
      // A few jade/gold motes drift up inside the shell while it holds.
      if (t >= s.activeAt && t < sh.endAt) {
        sh.moteCarry += Math.min(dt, .1) * 10; const n = Math.min(4, Math.floor(sh.moteCarry)); sh.moteCarry -= n;
        for (let i = 0; i < n; i++) {
          const a = core.random() * TAU, r = core.random() * sh.radius * .8;
          sh.p.set(fx.group.position.x + Math.sin(a) * r, fx.group.position.y + .2, fx.group.position.z + Math.cos(a) * r);
          core.pool.spawn(sh.p, sh.v.set(0, rand(core, .35, .8), 0), i % 2 ? VFX.colors.jade : VFX.colors.gold, rand(core, .7, 1.2), rand(core, .03, .05), -.2, .55);
        }
      }
    },
    end(core, fx, reason) {
      const sh = fx.shield;
      if (!sh || fx.age >= sh.endAt) return false;
      sh.endAt = fx.age; sh.broken = reason === 'depleted';
      core._emit('shield-end', fx, {reason});
      if (sh.broken) {
        sh.root.getWorldPosition(sh.p);
        for (let i = 0; i < (core.quality === 'low' ? 12 : 20); i++) {
          const a = core.random() * TAU, y = rand(core, -.6, .8);
          sh.v.set(Math.sin(a), y, Math.cos(a)).normalize();
          const point = sh.p.clone().addScaledVector(sh.v, sh.radius);
          core.pool.spawn(point, sh.v.multiplyScalar(rand(core, .8, 1.6)), i % 2 ? VFX.colors.gold : VFX.colors.jade, .32, .055, .5, .85);
        }
      }
      return true;
    },
    // A real hit (world point) → ripple from the matching point on the shell.
    onHit(core, fx, point) {
      const s = fx.skill, sh = fx.shield;
      if (!sh || fx.age + 1e-9 < s.activeAt || fx.age + 1e-9 >= sh.endAt) return false;
      sh.shell.updateWorldMatrix(true, false);
      const local = sh.shell.worldToLocal(sh.p.set(point.x, point.y, point.z));
      if (local.lengthSq() < 1e-8) local.set(0, 0, 1);
      local.normalize(); sh.hits[sh.hitIndex].set(local.x, local.y, local.z, fx.age);
      sh.hitIndex = (sh.hitIndex + 1) % sh.hits.length; sh.hitCount++;
      const surface = sh.shell.localToWorld(sh.v.copy(local)), normal = sh.p.copy(surface).sub(sh.shell.getWorldPosition(new core.THREE.Vector3())).normalize();
      for (let i = 0; i < 10; i++) {
        const v = new core.THREE.Vector3(normal.x * rand(core, 1, 2.4) + rand(core, -.7, .7), normal.y * rand(core, 1, 2.4) + rand(core, -.2, .9), normal.z * rand(core, 1, 2.4) + rand(core, -.7, .7));
        core.pool.spawn(surface, v, i % 3 ? VFX.colors.gold : VFX.colors.core, rand(core, .2, .4), rand(core, .04, .065), 3, .95);
      }
      core._emit('shield-hit', fx, {position: new core.THREE.Vector3(point.x, point.y, point.z), hitCount: sh.hitCount}, 'shield-hit-' + sh.hitCount);
      return true;
    }
  };

  // ---------------- Chấn Địa: charge at the tip → one impact where the staff meets the ground ----------------
  function terrainRing(core, fx, segments) {
    const T = core.THREE, g = new T.BufferGeometry(), position = new Float32Array((segments + 1) * 6), uv = new Float32Array((segments + 1) * 4), index = [];
    for (let i = 0; i <= segments; i++) { uv.set([i / segments, 0, i / segments, 1], i * 4); if (i < segments) { const j = i * 2; index.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); } }
    g.setAttribute('position', new T.BufferAttribute(position, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(index); fx.geometries.add(g);
    return {geometry: g, position, segments, v: new T.Vector3()};
  }
  // Each ring vertex sits on the terrain (steps, slopes and bridge edges included).
  function drawRing(core, ring, center, inner, outer, lift) {
    const v = ring.v;
    for (let i = 0; i <= ring.segments; i++) {
      const a = i / ring.segments * TAU, sx = Math.sin(a), sz = Math.cos(a);
      for (let k = 0; k < 2; k++) {
        const r = k ? outer : inner, j = (i * 2 + k) * 3; v.set(center.x + sx * r, center.y, center.z + sz * r);
        ring.position[j] = v.x; ring.position[j + 1] = core._ground(v) + lift; ring.position[j + 2] = v.z;
      }
    }
    ring.geometry.attributes.position.needsUpdate = true;
  }
  // Ground slabs are temporary VFX meshes, never edits to terrain/collision/navmesh.
  function slamSlabs(core, fx) {
    const T = core.THREE, cfg = VFX.slam, count = cfg.slabs[core.quality] || cfg.slabs.medium;
    const shared = sharedFor(core);
    const mesh = new T.InstancedMesh(shared.rock, shared.rockMaterial, count);
    for (let i = 0; i < count; i++) mesh.setColorAt(i, new T.Color().setScalar(rand(core, .55, .8)));
    mesh.name = 'chan-dia-lifted-stone-plates'; mesh.visible = false; mesh.frustumCulled = false; fx.world.add(mesh);
    const state = Array.from({length: count}, (_, i) => {
      const a = i / count * TAU * 2 + rand(core, -.12, .12);
      const r = cfg.slabRadius * (i % 2 ? .8 : .46) * rand(core, .88, 1.12);
      return {a, r, x: 0, y: 0, z: 0, width: rand(core, .28, .53), depth: rand(core, .2, .4), lift: rand(core, .22, cfg.slabHeight), tilt: rand(core, .2, .65)};
    });
    return {mesh, state, dummy: new T.Object3D()};
  }
  // Identical radius progression drives the visible leading wave and swept hit windows.
  function slamRadius(age, skill) {
    const k = clamp((age - skill.activeAt) / Math.max(.001, skill.activeEnd - skill.activeAt));
    return skill.radius * (1 - (1 - k) * (1 - k));
  }
  function slamHitWindow(core, fx, previous, current) {
    const s = fx.skill, sl = fx.slam;
    if (current < s.activeAt || previous >= s.activeEnd || !fx.alive) return;
    const from = Math.max(previous, s.activeAt), to = Math.min(current, s.activeEnd);
    const e = {type: 'hit-window', kind: 'ground-wave', handle: fx.handle, skillId: s.id, weaponId: s.weaponId,
      caster: fx.caster, time: core.time, position: sl.contact.clone(), hitIndex: 0,
      innerRadius: slamRadius(from, s), outerRadius: slamRadius(to, s), height: VFX.slam.hitHeight,
      hitTargets: sl.hitTargets};
    let accepting = true;
    e.testTarget = (id, point, radius = 0) => {
      if (!accepting || !fx.alive || id == null || id === fx.caster.uuid || sl.hitTargets.has(id) ||
          !point || ![point.x, point.y, point.z, radius].every(Number.isFinite) || radius < 0) return false;
      const d = Math.hypot(point.x - e.position.x, point.z - e.position.z);
      if (d + radius < e.innerRadius || d - radius > e.outerRadius) return false;
      sl.p.set(point.x, point.y, point.z);
      if (Math.abs(point.y - core._ground(sl.p)) > e.height) return false;
      // Owner checks team, target validity and occlusion BEFORE consuming this test.
      sl.hitTargets.add(id); return true;
    };
    try { core.onEvent?.(e); } finally { accepting = false; }
  }
  function buildSlamAura(core,fx){
    const T=core.THREE,shared=sharedFor(core),c=palette(T),root=new T.Group();root.name='chan-dia-gathering-aura';fx.world.add(root);root.visible=false;
    const bands=Array.from({length:core.quality==='low'?2:3},(_,i)=>{
      const pivot=new T.Group();pivot.rotation.set(.30+i*.27,i*2.1,i%2?.30:-.25);root.add(pivot);
      const m=material(core,fx,{uniforms:{uJade:{value:c.jade},uGold:{value:c.gold},uOpacity:{value:0},uTime:{value:0},uSpeed:{value:2.5+i}},vertexShader:UV_VERTEX,fragmentShader:BAND_FRAGMENT});
      const band=mesh(core,fx,shared.band,m,pivot,11);band.scale.set(1,.07,1);return {pivot,band,material:m};
    });
    const sealMaterial=material(core,fx,{uniforms:{uJade:{value:c.jade},uGold:{value:c.gold},uOpacity:{value:0},uTime:{value:0}},vertexShader:UV_VERTEX,fragmentShader:SEAL_FRAGMENT});
    const seal=mesh(core,fx,shared.quad,sealMaterial,fx.world,8);seal.name='chan-dia-charge-seal';seal.rotation.x=-Math.PI/2;seal.visible=false;
    const light=new T.PointLight(c.jade,0,5,2);light.castShadow=false;root.add(light);
    return {root,bands,seal,sealMaterial,light,carry:0,center:new T.Vector3()};
  }
  function tickSlamAura(core,fx,dt){
    const sl=fx.slam,a=sl.aura,t=fx.age,pose=Slam.sample(t,fx.skill),p=core._pose(fx.caster).p;
    const k=pose.charge; a.root.visible=t<fx.skill.activeAt&&k>0;
    a.center.copy(p);a.center.y+=pose.lift+fx.casterHeight*.56;a.root.position.copy(a.center);
    a.light.intensity=a.root.visible?(.35+k*1.8)*VFX.intensity:0;
    a.bands.forEach((b,i)=>{b.pivot.rotation.y=t*(1.1+i*.65);const r=(.72+i*.18)*(1+.24*k);b.band.scale.set(r,.045+.065*k,r);b.material.uniforms.uTime.value=t;b.material.uniforms.uOpacity.value=a.root.visible?k*(i?.48:.65)*VFX.intensity:0;});
    a.seal.visible=a.root.visible;a.seal.position.set(p.x,core._ground(p)+.045,p.z);a.seal.scale.setScalar(2.1+.65*k);a.sealMaterial.uniforms.uTime.value=t;a.sealMaterial.uniforms.uOpacity.value=a.root.visible*k*.36;
    if(!a.root.visible)return;
    a.carry+=Math.min(dt,.1)*(core.quality==='low'?16:28)*k;const n=Math.min(4,Math.floor(a.carry));a.carry-=n;
    for(let i=0;i<n;i++){
      const angle=t*5+i*2.4,r=1.0+core.random()*.4;
      sl.p.set(a.center.x+Math.cos(angle)*r,a.center.y+rand(core,-.65,.65),a.center.z+Math.sin(angle)*r);
      sl.v.subVectors(a.center,sl.p).multiplyScalar(1.8);sl.v.y+=.35;
      core.pool.spawn(sl.p,sl.v,i%2?VFX.colors.gold:VFX.colors.jade,.40,.035,0,.65);
    }
  }
  const GroundSlamEffect = {
    build(core, fx) {
      const T = core.THREE, q = tier(core), shared = sharedFor(core), c = palette(T), cfg = VFX.slam; worldLayer(core, fx);
      const tinted = () => ({uJade: {value: c.jade}, uGold: {value: c.gold}, uCore: {value: c.core}, uOpacity: {value: 0}, uTime: {value: 0}, uNoise: {value: shared.noise}});
      const glow = (color, centre) => material(core, fx, {uniforms: {uMap: {value: shared.dot}, uColor: {value: color}, uCore: {value: centre}, uOpacity: {value: 0}}, vertexShader: BILLBOARD_VERTEX, fragmentShader: GLOW_FRAGMENT});
      const orbMaterial = glow(c.jade, c.core), orb = mesh(core, fx, shared.quad, orbMaterial, fx.world, 12); orb.visible = false; orb.frustumCulled = false;
      const impact = new T.Group(); impact.name = 'slam-impact'; impact.visible = false; fx.world.add(impact);
      const flashMaterial = glow(c.gold, c.core), flash = mesh(core, fx, shared.quad, flashMaterial, impact, 12); flash.position.y = .3; flash.visible = false; flash.frustumCulled = false;
      const columnMaterial = material(core, fx, {uniforms: tinted(), vertexShader: UV_VERTEX, fragmentShader: COLUMN_FRAGMENT});
      // Named `column` like the generic slam: invisible until the contact frame.
      fx.column = mesh(core, fx, shared.column, columnMaterial, impact, 10); fx.column.scale.set(.3, cfg.columnHeight, .3); fx.column.visible = false;
      const waves = [0, 1].map(() => {
        const ring = terrainRing(core, fx, q.ringSegments);
        const m = material(core, fx, {uniforms: tinted(), vertexShader: UV_VERTEX, fragmentShader: RING_FRAGMENT, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
        const n = mesh(core, fx, ring.geometry, m, fx.world, 9); n.frustumCulled = false; n.visible = false; return {ring, mesh: n, material: m};
      });
      // Crack decal: a small terrain-following grid, heights sampled once at contact.
      const crackGeometry = new T.PlaneGeometry(cfg.crackRadius * 2, cfg.crackRadius * 2, q.crackGrid, q.crackGrid); crackGeometry.rotateX(-Math.PI / 2); fx.geometries.add(crackGeometry);
      const crackMaterial = material(core, fx, {uniforms: {uMap: {value: shared.crack}, uJade: {value: c.jade}, uGold: {value: c.gold}, uCore: {value: c.core}, uOpacity: {value: 0}, uHeat: {value: 1}, uRot: {value: core.random() * TAU}, uReveal: {value: 0}},
        vertexShader: UV_VERTEX, fragmentShader: CRACK_FRAGMENT, side: T.FrontSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3});
      const cracks = mesh(core, fx, crackGeometry, crackMaterial, fx.world, 8); cracks.visible = false; cracks.frustumCulled = false;
      const rocks = new T.InstancedMesh(shared.rock, shared.rockMaterial, q.rocks); rocks.visible = false; rocks.frustumCulled = false; fx.world.add(rocks);
      fx.slam = {orb, orbMaterial, impact, flash, flashMaterial, columnMaterial, waves, cracks, crackMaterial, crackGeometry, rocks,
        aura: buildSlamAura(core,fx), slabs: slamSlabs(core, fx), hitTargets: new Set(), previousAge: 0,
        crackBase: Float32Array.from(crackGeometry.attributes.position.array),
        rockState: Array.from({length: q.rocks}, () => ({p: new T.Vector3(), v: new T.Vector3(), spin: new T.Vector3(), size: 0, life: 0, age: 0, alive: false, bounced: false})),
        dust: createDust(core, fx, q.dust, VFX.colors.dust), contact: new T.Vector3(), normal: new T.Vector3(0, 1, 0), up: new T.Vector3(0, 1, 0),
        tip: new T.Vector3(), p: new T.Vector3(), v: new T.Vector3(), dummy: new T.Object3D(), impacted: false, chargeCarry: 0};
      syncWorld(fx);
    },
    // Before contact the anchor follows the caster; from contact on it stays on the struck ground.
    place(core, fx) { if (!fx.slam?.impacted) anchorAtCaster(core, fx); syncWorld(fx); },
    tipWorld(core, fx, out) {
      if (fx.weaponTip) { fx.weaponTip.updateWorldMatrix(true, false); return fx.weaponTip.getWorldPosition(out); }
      const {p, d} = core._pose(fx.caster); return out.copy(p).addScaledVector(d, .5).setY(core._ground(p) + 2.25);
    },
    // The striking end is the lower end of the staff at contact (the clip lands it front-left).
    strikeEnd(core, fx, out) {
      if (!fx.weapon) return fx.weaponTip ? this.tipWorld(core, fx, out) : null;
      const L = VFX.slam.staffEnd; fx.weapon.updateWorldMatrix(true, false);
      const a = fx.weapon.localToWorld(out.set(L, 0, 0)), ay = a.y, ax = a.x, az = a.z;
      const b = fx.weapon.localToWorld(fx.slam.p.set(-L, 0, 0));
      return b.y < ay ? out.copy(b) : out.set(ax, ay, az);
    },
    // That end projected on the terrain. Only a missing staff, an end behind the player
    // or out of reach falls back to the ground straight ahead of the feet.
    contactPoint(core, fx, out) {
      const cfg = VFX.slam, {p, d} = core._pose(fx.caster);
      if(fx.slam.authoredLeap){
        const contact=fx.slam.contactOffset||Slam.contact;
        out.copy(p).addScaledVector(d,contact.z);out.x+=d.z*contact.x;out.z-=d.x*contact.x;
        out.y=core._ground(out);return out;
      }
      const end = this.strikeEnd(core, fx, fx.slam.tip);
      let dx = end ? end.x - p.x : 0, dz = end ? end.z - p.z : 0;
      const reach = Math.hypot(dx, dz), ahead = dx * d.x + dz * d.z;
      if (!end || !(reach >= cfg.contactMin && reach <= cfg.contactMax) || ahead < -.1) { dx = d.x * cfg.contactFallback; dz = d.z * cfg.contactFallback; }
      out.set(p.x + dx, p.y, p.z + dz); out.y = core._ground(out); return out;
    },
    impactNow(core, fx) {
      const cfg = VFX.slam, sl = fx.slam, q = tier(core);
      this.contactPoint(core, fx, sl.contact); core.groundNormal(sl.contact.x, sl.contact.z, sl.normal);
      fx.group.position.copy(sl.contact); syncWorld(fx); fx.impactLocked = true;
      sl.impact.position.copy(sl.contact); sl.impact.quaternion.setFromUnitVectors(sl.up, sl.normal); sl.impact.visible = true;
      const pos = sl.crackGeometry.attributes.position, base = sl.crackBase;
      for (let i = 0; i < pos.count; i++) {
        sl.p.set(sl.contact.x + base[i * 3], sl.contact.y, sl.contact.z + base[i * 3 + 2]);
        pos.setXYZ(i, sl.p.x, core._ground(sl.p) + cfg.decalLift, sl.p.z);
      }
      pos.needsUpdate = true; sl.cracks.visible = true;
      for (const plate of sl.slabs.state) {
        plate.x = sl.contact.x + Math.sin(plate.a) * plate.r; plate.z = sl.contact.z + Math.cos(plate.a) * plate.r;
        sl.p.set(plate.x, sl.contact.y, plate.z); plate.y = core._ground(sl.p);
      }
      for (const rock of sl.rockState) {
        const a = core.random() * TAU, speed = rand(core, cfg.rockSpeed[0], cfg.rockSpeed[1]);
        const r = rand(core, .25, 1.5);
        rock.p.set(sl.contact.x + Math.sin(a) * r, sl.contact.y, sl.contact.z + Math.cos(a) * r);
        rock.p.y = core._ground(rock.p) + .09;
        rock.v.set(Math.sin(a) * speed, rand(core, cfg.rockUp[0], cfg.rockUp[1]), Math.cos(a) * speed);
        rock.spin.set(rand(core, -9, 9), rand(core, -9, 9), rand(core, -9, 9)); rock.size = rand(core, cfg.rockSize[0], cfg.rockSize[1]);
        rock.life = rand(core, cfg.rockLife[0], cfg.rockLife[1]); rock.age = 0; rock.alive = true; rock.bounced = false;
      }
      for (let i = 0; i < q.dust; i++) {
        const a = core.random() * TAU, r = rand(core, .6, 2.5), speed = rand(core, 1.4, 3.8);
        sl.p.set(sl.contact.x + Math.sin(a) * r, sl.contact.y, sl.contact.z + Math.cos(a) * r);
        if (!sl.dust.spawn(sl.p.x, core._ground(sl.p) + .1, sl.p.z, Math.sin(a) * speed, rand(core, .05, .3), Math.cos(a) * speed, rand(core, .7, 1.3), rand(core, cfg.dustLife[0], cfg.dustLife[1]), .38)) break;
      }
      for (let i = 0; i < q.sparks; i++) {
        const a = core.random() * TAU, speed = rand(core, 1.5, 4.5);
        sl.p.copy(sl.contact); sl.p.y += .12; sl.v.set(Math.sin(a) * speed, rand(core, 1.5, 4), Math.cos(a) * speed);
        core.pool.spawn(sl.p, sl.v, i % 3 ? VFX.colors.gold : VFX.colors.jade, rand(core, .3, .6), rand(core, .04, .07), 6, .9);
      }
      core._emit('impact', fx, {hitIndex: 0, position: sl.contact.clone(), normal: sl.normal.clone(), activeSeconds: fx.skill.activeEnd - fx.skill.activeAt,
        shake: VFX.cameraShake.enabled ? VFX.cameraShake.slam : 0}, 'hit0');
    },
    tick(core, fx, dt) {
      const s = fx.skill, t = fx.age, cfg = VFX.slam, sl = fx.slam, after = t - s.activeAt;
      const previous = sl.previousAge; sl.previousAge = t;
      tickSlamAura(core,fx,dt);
      for (const m of fx.materials) if (m.uniforms?.uTime) m.uniforms.uTime.value = t;
      // Charge: energy gathers at the staff tip during the raise; no ground effect yet.
      if (after < 0) {
        const k = smooth(0, s.activeAt, t), tip = this.tipWorld(core, fx, sl.tip);
        sl.orb.visible = k > 0; sl.orb.position.copy(tip);
        sl.orb.scale.setScalar(cfg.chargeRadius * 2 * (.35 + .65 * k) * (1 + .12 * Math.sin(t * 38)));
        sl.orbMaterial.uniforms.uOpacity.value = k * .95 * VFX.intensity;
        sl.chargeCarry += Math.min(dt, .1) * 40 * k; const n = Math.min(4, Math.floor(sl.chargeCarry)); sl.chargeCarry -= n;
        for (let i = 0; i < n; i++) {
          const a = core.random() * TAU, b = rand(core, -1, 1), r = rand(core, .45, .8), ring = Math.sqrt(1 - b * b) * r;
          sl.p.set(tip.x + Math.cos(a) * ring, tip.y + b * r, tip.z + Math.sin(a) * ring);
          core.pool.spawn(sl.p, sl.v.subVectors(tip, sl.p).multiplyScalar(2.4), i % 2 ? VFX.colors.jade : VFX.colors.gold, .32, .04, 0, .85);
        }
        return;
      }
      // Exactly one contact per cast, even when one frame jumps past the whole timeline.
      if (!sl.impacted) { sl.impacted = true; this.impactNow(core, fx); if (!fx.alive) return; }
      slamHitWindow(core, fx, previous, t); if (!fx.alive) return;
      const elapsedAfter = Math.max(0, t - Math.max(previous, s.activeAt));
      sl.orb.visible = false; sl.orbMaterial.uniforms.uOpacity.value = 0;
      const flash = 1 - smooth(0, cfg.flash, after);
      sl.flash.visible = flash > 0; sl.flashMaterial.uniforms.uOpacity.value = flash * cfg.reducedFlash * VFX.intensity; sl.flash.scale.setScalar(.9 + after * 10);
      const column = 1 - smooth(.03, cfg.columnLife, after);
      sl.columnMaterial.uniforms.uOpacity.value = column * VFX.intensity; fx.column.visible = column > 0;
      fx.column.scale.set(.22 + after * .45, cfg.columnHeight * (.55 + .45 * smooth(0, .08, after)), .22 + after * .45);
      // Two expanding shock rings, re-fitted to the terrain every frame.
      sl.waves.forEach((w, i) => {
        const life = Math.max(.001, s.activeEnd - s.activeAt);
        const k = clamp((after - i * cfg.secondWaveDelay) / life); w.mesh.visible = k > 0 && k < 1;
        if (!w.mesh.visible) { w.material.uniforms.uOpacity.value = 0; return; }
        const r = s.radius * (i ? .88 : 1) * (1 - (1 - k) * (1 - k)), width = Math.min(r, cfg.waveWidth * (1 - k * .5));
        drawRing(core, w.ring, sl.contact, Math.max(.05, r - width), r, .045 + i * .01);
        w.material.uniforms.uOpacity.value = Math.pow(1 - k, .7) * (i ? .6 : .95) * VFX.intensity;
      });
      // Cracks glow hot, cool and vanish; the ground itself is never modified.
      const crack = 1 - smooth(cfg.crackLife * .55, cfg.crackLife, after);
      sl.crackMaterial.uniforms.uOpacity.value = crack * smooth(0, .06, after) * VFX.intensity; sl.crackMaterial.uniforms.uHeat.value = 1 - smooth(.1, .8, after);
      sl.crackMaterial.uniforms.uReveal.value = smooth(0, .32, after) * 1.08;
      sl.cracks.visible = crack > 0;
      // Each plate erupts after the pressure front arrives, then settles before cleanup.
      let visiblePlates = 0;
      sl.slabs.state.forEach((plate, i) => {
        const a = after - plate.r / s.radius * .12, rise = smooth(0, .11, a);
        const fade = 1 - smooth(cfg.slabLife * .55, cfg.slabLife, after), d = sl.slabs.dummy;
        const lift = rise * fade;
        d.position.set(plate.x, plate.y + plate.lift * lift, plate.z);
        d.rotation.set(plate.tilt * lift, -plate.a, plate.tilt * .35 * lift);
        d.scale.set(plate.width, .10 + .08 * rise, plate.depth).multiplyScalar(lift);
        if (lift > .001) visiblePlates++;
        d.updateMatrix(); sl.slabs.mesh.setMatrixAt(i, d.matrix);
      });
      sl.slabs.mesh.instanceMatrix.needsUpdate = true; sl.slabs.mesh.visible = visiblePlates > 0;
      // Rocks: launch velocity, gravity, one damped bounce, shrink out (sub-stepped for stability).
      let remaining = Math.min(elapsedAfter, s.duration - s.activeAt), alive = 0;
      while (remaining > 1e-6) {
        const h = Math.min(remaining, 1 / 30); remaining -= h;
        for (const rock of sl.rockState) {
          if (!rock.alive) continue; rock.age += h; if (rock.age >= rock.life) { rock.alive = false; continue; }
          rock.v.y -= cfg.gravity * h; rock.p.addScaledVector(rock.v, h);
          const ground = core._ground(rock.p) + rock.size * .6;
          if (rock.p.y < ground) {
            rock.p.y = ground;
            if (!rock.bounced && rock.v.y < -.5) { rock.v.set(rock.v.x * .55, -rock.v.y * cfg.bounce, rock.v.z * .55); rock.bounced = true; }
            else rock.v.set(rock.v.x * .7, 0, rock.v.z * .7);
          }
        }
      }
      sl.rockState.forEach((rock, i) => {
        const d = sl.dummy;
        if (rock.alive) { alive++; d.position.copy(rock.p); d.rotation.set(rock.spin.x * rock.age, rock.spin.y * rock.age, rock.spin.z * rock.age); d.scale.setScalar(rock.size * (1 - smooth(.7, 1, rock.age / rock.life))); }
        else d.scale.setScalar(0);
        d.updateMatrix(); sl.rocks.setMatrixAt(i, d.matrix);
      });
      sl.rocks.instanceMatrix.needsUpdate = true; sl.rocks.visible = alive > 0;
      sl.dust.update(Math.min(elapsedAfter, s.duration - s.activeAt));
    }
  };

  // Côn Quét is rendered by staff-sweep.js (registerSkillRenderer) and uses createStaffRibbon.
  Core.registerEffect('staff.ho-than', ProtectiveShieldEffect);
  Core.registerEffect('staff.chan-dia', GroundSlamEffect);
  return Object.freeze({createStaffRibbon, ProtectiveShieldEffect, GroundSlamEffect});
});
