/* VIET VILLAGE 3D — tunable art values for the three CÔN (staff) skills.
 * Units: seconds and metres (1 Three.js unit = 1 m). Colours are sRGB hex.
 * Timings are measured from the real player GLB clips (right-hand bone sampled
 * at 30 Hz, see DOCUMENTS/CLAUDE-REVIEW.md §17):
 *   cast_a_spell 0.70–1.45 s: fast horizontal hand sweep  → Côn Quét
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
    cameraShake: Object.freeze({enabled: true, slam: 0.075, decay: 11}),
    quality: Object.freeze({
      low: {trailSamples: 28, sparks: 10, dust: 14, rocks: 8, ringSegments: 48, crackGrid: 10, sphereSegments: 28},
      medium: {trailSamples: 40, sparks: 18, dust: 24, rocks: 14, ringSegments: 72, crackGrid: 14, sphereSegments: 40},
      high: {trailSamples: 56, sparks: 28, dust: 36, rocks: 22, ringSegments: 96, crackGrid: 18, sphereSegments: 56}
    }),
    // Animation segment each skill plays on the GLB avatar (from/to in clip seconds).
    animation: Object.freeze({
      'staff.con-quet': Object.freeze({clip: 'cast_a_spell', from: 0.55, to: 1.75}),
      'staff.ho-than': Object.freeze({clip: 'cast_a_spell', from: 1.95, to: 4.95}),
      'staff.chan-dia': Object.freeze({clip: 'slash', from: 1.45, to: 3.25})
    }),
    sweep: Object.freeze({
      // Two points on the staff in weapon-local metres (staff spans x −1.4…+1.4).
      inner: Object.freeze([0.15, 0, 0]), outer: Object.freeze([1.42, 0, 0]),
      mirror: true,            // second, fainter trail from the other end
      life: 0.32,              // seconds a trail sample stays visible
      maxStep: 0.12,           // metres between inserted samples (fast swings)
      maxInsertPerFrame: 8,
      teleportDistance: 2.5,   // a jump larger than this resets the history
      opacity: 0.95, mirrorOpacity: 0.45,
      sparkMinSpeed: 4.0,      // tip speed (m/s) before gold sparks detach
      dustAt: 0.22             // seconds after the trail starts: dust at the feet
    }),
    shield: Object.freeze({
      radiusFactor: 0.6,       // × character height (2.35 m → 1.41 m), at least skill.radius
      centerFactor: 0.5,       // sphere centre height × character height
      rimPower: 2.4, rimOpacity: 0.5, baseOpacity: 0.025,
      bandSpeed: [0.9, -0.65], bandTilt: [0.42, -0.62], bandWidth: 0.07,
      patternOpacity: 0.16,
      rippleSpeed: 2.0,        // radians of arc per second across the sphere
      rippleLife: 1.2,
      fadeOut: 0.32            // seconds after activeEnd to dissolve
    }),
    slam: Object.freeze({
      // Striking (lower) staff end: metres from the feet; outside this, ground ahead of the feet.
      staffEnd: 1.4, contactMin: 0.35, contactMax: 2.3, contactFallback: 1.35,
      chargeRadius: 0.24, flash: 0.14, columnHeight: 1.7, columnLife: 0.42,
      waveRadius: 3.8, waveLife: 0.9, waveWidth: 0.42, secondWaveDelay: 0.11,
      crackRadius: 2.1, crackLife: 1.25, decalLift: 0.035,
      rockSpeed: [1.4, 3.4], rockUp: [2.2, 4.4], rockSize: [0.03, 0.085], rockLife: [0.9, 1.35], gravity: 9.8, bounce: 0.28,
      dustLife: [0.8, 1.4]
    })
  });
});
