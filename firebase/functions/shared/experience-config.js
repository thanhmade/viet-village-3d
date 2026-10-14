(function (root, factory) {
  'use strict';
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  root.VillageExperienceConfig = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Index is the current character level; each value is EXP needed for the NEXT
  // level. Index 0 is unused. LV 100 has no next level. Keep this source shared
  // by the classic browser scripts and Cloud Functions; do not copy the table.
  // Version 1: 50 * level * (level + 1). Changing existing thresholds requires
  // an explicit migration before raising tableVersion.
  const expToNextLevel = Object.freeze([
    null, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500,
    5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000,
    21000, 23100, 25300, 27600, 30000, 32500, 35100, 37800, 40600, 43500,
    46500, 49600, 52800, 56100, 59500, 63000, 66600, 70300, 74100, 78000,
    82000, 86100, 90300, 94600, 99000, 103500, 108100, 112800, 117600, 122500,
    127500, 132600, 137800, 143100, 148500, 154000, 159600, 165300, 171100, 177000,
    183000, 189100, 195300, 201600, 208000, 214500, 221100, 227800, 234600, 241500,
    248500, 255600, 262800, 270100, 277500, 285000, 292600, 300300, 308100, 316000,
    324000, 332100, 340300, 348600, 357000, 365500, 374100, 382800, 391600, 400500,
    409500, 418600, 427800, 437100, 446500, 456000, 465600, 475300, 485100, 495000,
    null
  ]);
  const quests = Object.freeze({QUEST_LV_01: 60, QUEST_LV_02: 100});
  const lessons = Object.freeze({'core:0': 40});

  return Object.freeze({
    schemaVersion: 1,
    tableVersion: 1,
    maxLevel: 100,
    alphaMaxLevel: 20,
    expToNextLevel,
    rewards: Object.freeze({quests, lessons}),
    // Learning assessment is independent of game EXP and character level.
    // These names have no automatic conversion from/to character level.
    knowledgeBands: Object.freeze(['Yếu–kém', 'Trung bình', 'Trung bình khá', 'Khá', 'Giỏi'])
  });
});
