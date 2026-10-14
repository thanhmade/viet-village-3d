(function (root, factory) {
  'use strict';
  const config = typeof module === 'object' && module.exports
    ? require('./experience-config.js') : root.VillageExperienceConfig;
  const api = factory(config);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.VillageExperienceCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (config) {
  'use strict';
  if (!config) throw new Error('Thiếu bảng EXP: phải tải experience-config.js trước experience-core.js.');
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const integer = value => Number.isSafeInteger(value) && value >= 0;

  function fail(code, message) {
    const error = new Error(message); error.code = code; throw error;
  }
  function rewardIdIsValid(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 200
      && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
  }
  function initialState() {
    return {schemaVersion: config.schemaVersion, tableVersion: config.tableVersion,
      level: 1, exp: 0, receipts: {}};
  }
  function normalize(saved) {
    if (saved === null || saved === undefined) return initialState();
    if (!object(saved)) fail('invalid-state', 'Tiến độ EXP đã lưu không hợp lệ; chưa ghi đè dữ liệu.');
    for (const key of ['schemaVersion', 'tableVersion']) {
      if (own(saved, key) && saved[key] !== config[key]) {
        fail('unsupported-' + key, 'Phiên bản tiến độ EXP chưa được hỗ trợ; chưa ghi đè dữ liệu.');
      }
    }
    // Missing fields are an older character, not an instruction to reset it.
    // Existing levels above the Alpha limit are retained, including their EXP.
    let level = own(saved, 'level') ? saved.level : own(saved, 'lv') ? saved.lv : 1;
    let exp = own(saved, 'exp') ? saved.exp : own(saved, 'xp') ? saved.xp : 0;
    if (!integer(level) || level < 1 || !integer(exp)) {
      fail('invalid-state', 'LV hoặc EXP đã lưu không hợp lệ; chưa ghi đè dữ liệu.');
    }
    let receipts = {};
    if (own(saved, 'receipts')) {
      if (!object(saved.receipts)) fail('invalid-receipts', 'Sổ nhận thưởng không hợp lệ; chưa ghi đè dữ liệu.');
      const entries = Object.entries(saved.receipts);
      if (entries.some(([id, receipt]) => !rewardIdIsValid(id) || !(receipt === true || object(receipt)))) {
        fail('invalid-receipts', 'Sổ nhận thưởng không hợp lệ; chưa ghi đè dữ liệu.');
      }
      // fromEntries preserves keys such as __proto__ as data, never a prototype.
      receipts = Object.fromEntries(entries.map(([id, receipt]) => [id, receipt === true ? true : {...receipt}]));
    }
    // Carry old surplus forward without losing EXP when an old profile reaches
    // the Alpha boundary. New rewards at the cap are rejected by grant below.
    while (level < config.alphaMaxLevel && exp >= config.expToNextLevel[level]) {
      exp -= config.expToNextLevel[level]; level += 1;
    }
    return {...saved, schemaVersion: config.schemaVersion, tableVersion: config.tableVersion,
      level, exp, receipts};
  }
  function grant(saved, reward) {
    if (!object(reward) || !Number.isSafeInteger(reward.amount) || reward.amount <= 0) {
      fail('invalid-amount', 'EXP thưởng phải là số nguyên dương hữu hạn trong giới hạn an toàn.');
    }
    if (!rewardIdIsValid(reward.rewardId)) fail('invalid-reward-id', 'Thiếu mã lần nhận thưởng hợp lệ.');
    const state = normalize(saved);
    if (own(state.receipts, reward.rewardId)) {
      return {state, awarded: 0, levelsGained: 0, duplicate: true,
        capped: state.level >= config.alphaMaxLevel, discarded: 0};
    }
    let {level, exp} = state;
    let remaining = reward.amount, awarded = 0, levelsGained = 0;
    // Never add two unbounded integers together: consume one threshold at a
    // time, so even a safe-integer reward cannot overflow the stored EXP.
    while (remaining > 0 && level < config.alphaMaxLevel) {
      const increment = Math.min(remaining, config.expToNextLevel[level] - exp);
      exp += increment; remaining -= increment; awarded += increment;
      if (exp === config.expToNextLevel[level]) { exp = 0; level += 1; levelsGained += 1; }
    }
    const receipt = {amount: reward.amount, awarded, levelAfter: level, expAfter: exp,
      tableVersion: config.tableVersion};
    const next = {...state, level, exp, receipts: {...state.receipts, [reward.rewardId]: receipt}};
    return {state: next, awarded, levelsGained, duplicate: false,
      capped: level >= config.alphaMaxLevel, discarded: remaining};
  }
  function describe(saved) {
    const state = normalize(saved);
    const capped = state.level >= config.alphaMaxLevel;
    const required = capped ? null : config.expToNextLevel[state.level];
    const percent = capped ? 100 : state.exp / required * 100;
    const numbers = new Intl.NumberFormat('vi-VN');
    const percentage = new Intl.NumberFormat('vi-VN', {minimumFractionDigits: 1, maximumFractionDigits: 1});
    const text = capped
      ? 'LV ' + numbers.format(state.level) + ' · Đã đạt giới hạn Alpha (LV ' + config.alphaMaxLevel + ')'
      : 'LV ' + numbers.format(state.level) + ' · ' + numbers.format(state.exp) + ' / '
        + numbers.format(required) + ' EXP · ' + percentage.format(percent) + '%';
    return Object.freeze({level: state.level, exp: state.exp, tableVersion: state.tableVersion,
      required, remaining: capped ? 0 : required - state.exp, percent, capped,
      levelCap: config.alphaMaxLevel, text});
  }
  return Object.freeze({config, initialState, normalize, grant, describe});
});
