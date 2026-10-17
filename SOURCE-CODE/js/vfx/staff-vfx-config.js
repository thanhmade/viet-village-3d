/* VIET VILLAGE 3D — tunable art values for the three CÔN (staff) skills.
 * Units: seconds and metres (1 Three.js unit = 1 m). Colours are sRGB hex.
 * Côn Quét keeps the designed four-phase timeline and two-hand pose of
 * staff-sweep.js; only its staff ribbon is tuned here (`sweep`).
 * Hộ Thân / Chấn Địa timings are measured from the real player GLB clips
 * (right-hand bone sampled at 30 Hz):
 *   cast_a_spell 2.10–2.50 s: gathering gesture            → Hộ Thân
 *   slash 1.40–1.90 s raise, 1.90–2.20 s downward strike,
 *   lowest hand point ≈ 2.17 s                            → Chấn Địa impact
 * Visual only: damage, cooldown and rewards live elsewhere.
 */
(function (root, factory) {
  'use strict';
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  if (root) root.StaffVFXConfig = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return Object.freeze({
    colors: Object.freeze({jade: '#2fe0b8', jadeDeep: '#0f8f76', gold: '#ffd36b', goldDeep: '#d9962b', core: '#f2fff9', dust: '#b49a76', rock: '#8c7a62'}),
    // Global brightness cap: additive layers stay below full white on the character.
    intensity: 1.0,
    cameraShake: Object.freeze({enabled: true, sweep: 0.035, slam: 0.075, decay: 11}),
    quality: Object.freeze({
      low: {trailSamples: 28, sparks: 10, dust: 14, rocks: 8, ringSegments: 48, crackGrid: 10, sphereSegments: 28},
      medium: {trailSamples: 40, sparks: 18, dust: 24, rocks: 14, ringSegments: 72, crackGrid: 14, sphereSegments: 40},
      high: {trailSamples: 56, sparks: 28, dust: 36, rocks: 22, ringSegments: 96, crackGrid: 18, sphereSegments: 56}
    }),
    // Animation segment played on the GLB avatar (from/to in clip seconds). Côn Quét
    // has none: it uses the two-hand staff pose driven by staff-sweep.js.
    animation: Object.freeze({
      // Gathering pose ends after 0.7 s; locomotion resumes while the shield holds.
      'staff.ho-than': Object.freeze({clip: 'cast_a_spell', from: 1.95, to: 2.65}),
      // Shifted +0.09 s (was 1.45–3.25): on both player GLBs the striking staff end is lowest
      // at clip 2.25–2.27 s, i.e. at the 0.72 s ground contact (measured in game, 17/10/2026).
      'staff.chan-dia': Object.freeze({clip: 'slash', from: 1.54, to: 3.34})
    }),
    // Côn Quét staff ribbon (sparks, ground band, wave, grit and light: staff-sweep.js).
    // Spec: SKILL-THAM-CHIEU/CON_QUET_DAC_TA_VFX (BODY_RIBBON, LEADING_RIM, FLOW_FILAMENTS, STAFF_GLOW).
    sweep: Object.freeze({
      // One branch on the long end of the held staff, weapon-local metres (staff spans x −1.4…+1.4).
      // End grip: right palm +1.08, left palm +0.62. Only the long striking side emits.
      // The .40 start clears both hands; the short butt emits no mirrored attack ribbon.
      inner: Object.freeze([0.40, 0, 0]), outer: Object.freeze([-1.42, 0, 0]),
      mirror: false,            // no ribbon on the short butt beside the hands
      mirrorInner: Object.freeze([-0.78, 0, 0]), mirrorOuter: Object.freeze([-1.42, 0, 0]),
      // Starting values from the spec (not a colour measurement): jade body, pale inner light, warm white rim.
      colors: Object.freeze({body: '#65cdbd', inner: '#c5ffe9', rim: '#fff0bf'}),
      filaments: 0.72,         // lengthwise flow lines inside the band
      glow: Object.freeze({radius: 0.07, opacity: 0.5}), // thin light layer on the active staff segment
      life: 0.18,              // seconds a trail sample stays visible
      maxStep: 0.12,           // metres between inserted samples (fast swings)
      maxInsertPerFrame: 48,
      // A frame-to-frame jump of the tip larger than this many times its distance from the
      // grip (world metres, from the actual staff scale) is a teleport: the history restarts.
      teleportFactor: 2.5,
      opacity: 0.95, mirrorOpacity: 0.45
    }),
    shield: Object.freeze({
      radiusFactor: 0.6,       // × character height (2.35 m → 1.41 m), at least skill.radius
      centerFactor: 0.5,       // sphere centre height × character height
      rimPower: 2.4, rimOpacity: 0.5, baseOpacity: 0.025,
      bandSpeed: [0.9, -0.65, 0.42], bandTilt: [0.42, -0.62, 1.12], bandWidth: 0.07,
      patternOpacity: 0.035,
      rippleSpeed: 2.0,        // radians of arc per second across the sphere
      rippleLife: 1.2,
      fadeOut: 0.32            // seconds after activeEnd to dissolve
    }),
    slam: Object.freeze({
      // Art proposal from the Chấn Địa still; gameplay timings/radius remain in StaffSkillConfig.
      staffEnd: 1.4, contactMin: 0.35, contactMax: 2.3, contactFallback: 1.35,
      chargeRadius: 0.3, flash: 0.12, columnHeight: 4.2, columnLife: 0.52,
      waveRadius: 4.5, waveLife: 0.78, waveWidth: 0.5, secondWaveDelay: 0.1,
      crackRadius: 3.4, crackLife: 1.02, decalLift: 0.035,
      rockSpeed: [1.8, 4.0], rockUp: [3.0, 6.0], rockSize: [0.07, 0.20], rockLife: [0.75, 1.03], gravity: 13.5, bounce: 0.2,
      dustLife: [0.65, 1.0],
      slabs: Object.freeze({low: 16, medium: 28, high: 40}),
      slabRadius: 2.9, slabHeight: 0.45, slabLife: 1.02,
      hitHeight: 0.8, // target feet tolerance above their sampled terrain; no HP changes in the VFX
      reducedFlash: 0.65
    })
  });
});
