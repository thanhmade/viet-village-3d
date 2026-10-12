'use strict';
// Gameplay requires completed movement and skill tutorials before entering Đồng Tre.
// This is local gameplay policy, not a replacement for authoritative server rules.
window.VietVillageRegionAccess = Object.freeze({
  mode: 'gameplay',
  policies: Object.freeze({
    'ngoai-lang-dong-tre': Object.freeze({minimumLevel: 1, fee: 0,
      tutorials: Object.freeze(['movement', 'skills'])})
  }),
  evaluate({mapId, character, transitioning, mode, policy}) {
    const deny = (code, message) => ({ok: false, code, message});
    if (transitioning) return deny('region/transition-busy', 'Đang chuyển MAP. Hãy chờ chuyển xong rồi thử lại.');
    if (!character || typeof character.alive !== 'boolean' || !Number.isInteger(character.level) || character.level < 0)
      return deny('region/character-unavailable', 'Chưa đọc được trạng thái nhân vật. Hãy vào lại game để kiểm tra.');
    if (!character.alive) return deny('region/character-dead', 'Nhân vật đã gục. Hãy hồi sinh trước khi chuyển MAP.');
    if (!policy) return {ok: true};
    if (mode !== 'testing' && mode !== 'gameplay') return deny('region/invalid-mode', 'Chế độ vào khu vực chưa được cấu hình hợp lệ.');
    if (character.level < policy.minimumLevel)
      return deny('region/level-required', 'Cần nhân vật cấp ' + policy.minimumLevel + ' để vào Đồng Tre. Cấp hiện tại: ' + character.level + '.');
    if (mode === 'gameplay') {
      const labels = {movement: 'hướng dẫn di chuyển (tự đi 3 mét bằng WASD, phím mũi tên hoặc cần điều khiển)',
        skills: 'hướng dẫn sử dụng kỹ năng (trang bị vũ khí rồi ra một chiêu thành công)'};
      const missing = policy.tutorials.filter(id => character.tutorials?.[id] !== true);
      if (missing.length) return deny('region/tutorial-required', 'Cần hoàn thành: ' + missing.map(id => labels[id]).join('; ') + '.');
    }
    // Fee is explicitly zero. Never read, deduct or change the player's score/wallet.
    return {ok: true, requirements: {minimumLevel: policy.minimumLevel, fee: policy.fee, mode}};
  }
});
