'use strict';
// Quality changes are infrequent; simulation and controls keep their existing frame loop.
window.createVillagePerformance = function ({renderer, getSun, getSize, readout, storage}) {
  let mode = 'auto', tier = 2, policy, sampleStart = null, sampleFrames = 0;
  let slowSeconds = 0, fastSeconds = 0, settleUntil = 0, nextShadow = 0, fps = 0;
  try { const saved = storage?.getItem('viet-village-render-quality'); if (['auto','low','high'].includes(saved)) mode = saved; } catch {}
  function apply() {
    const {width, height, dpr, mobile} = getSize();
    const level = mode === 'high' ? 3 : mode === 'low' ? 0 : tier;
    const ratios = [.8, 1, mobile ? 1 : 1.25, 1.5];
    const pixels = [750000, 1100000, 1500000, 3000000];
    policy = Object.freeze({level, pixelRatio: Math.min(dpr || 1, ratios[level], Math.sqrt(pixels[level] / Math.max(1,width * height))),
      shadows: level >= 2, houseLights: [2,2,6,18][level], houseShadows: [0,0,1,2][level],
      rainCount: [400,400,700,1400][level], shadowHz: level === 3 ? 30 : 15});
    renderer.setPixelRatio(policy.pixelRatio);
    renderer.shadowMap.enabled = policy.shadows;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    nextShadow = 0;
    const sun = getSun();
    if (sun) {
      const size = level === 3 ? 2048 : 1024;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size,size);
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      }
    }
  }
  function resetSample() { sampleStart = null; sampleFrames = 0; slowSeconds = fastSeconds = 0; }
  function setMode(value) {
    mode = ['auto','low','high'].includes(value) ? value : 'auto';
    tier = 2; resetSample(); settleUntil = 0; apply();
    try { storage?.setItem('viet-village-render-quality',mode); } catch {}
  }
  function sample(ms, playing) {
    if (!playing) { resetSample(); return; }
    if (sampleStart === null) { sampleStart = ms; sampleFrames = 0; return; }
    sampleFrames++;
    const elapsed = ms - sampleStart;
    if (elapsed < 1000) return;
    fps = sampleFrames * 1000 / elapsed;
    sampleStart = ms; sampleFrames = 0;
    if (mode === 'auto' && ms >= settleUntil) {
      slowSeconds = fps < 42 ? slowSeconds + elapsed / 1000 : 0;
      fastSeconds = fps > 57 ? fastSeconds + elapsed / 1000 : 0;
      if (slowSeconds >= 2 && tier > 0) { tier--; apply(); resetSample(); settleUntil = ms + 6000; }
      else if (fastSeconds >= 20 && tier < 2) { tier++; apply(); resetSample(); settleUntil = ms + 15000; }
    }
    if (readout) {
      const label = mode === 'high' ? 'Đẹp' : mode === 'low' ? 'Ưu tiên mượt' : 'Tự động · ' + (tier >= 2 ? 'Cân bằng' : 'Ưu tiên mượt');
      const text = Math.round(fps) + ' FPS · ' + label;
      if (readout.textContent !== text) readout.textContent = text;
      // Read-only diagnostics, useful for reproducing a slow scene without exposing account data.
      readout.setAttribute?.('data-render-calls',String(renderer.info?.render.calls || 0));
      readout.setAttribute?.('data-triangles',String(renderer.info?.render.triangles || 0));
    }
  }
  apply();
  return Object.freeze({get mode(){return mode;}, get policy(){return policy;},get fps(){return fps;},
    setMode, resize: apply, sample, resetSample,
    beforeRender(ms) { if (policy.shadows && ms >= nextShadow) { renderer.shadowMap.needsUpdate = true; nextShadow = ms + 1000 / policy.shadowHz; } }
  });
};
