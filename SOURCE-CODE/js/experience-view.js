(function (global) {
  'use strict';
  global.createVillageExperienceView = function ({document, getState, retry}) {
    const el = id => document.getElementById(id);
    let signature = '', noticeTimer;
    function update() {
      const state = getState(), next = JSON.stringify(state);
      if (signature === next) return; signature = next;
      for (const id of ['experienceReadout', 'characterExperienceReadout']) if (el(id)) el(id).textContent = state.text;
      for (const id of ['experienceBar', 'characterExperienceBar']) {
        const bar = el(id); if (!bar) continue;
        bar.style.width = (state.percent || 0) + '%';
        bar.parentElement?.setAttribute('aria-valuenow', String(state.percent || 0));
        bar.parentElement?.setAttribute('aria-valuetext', state.text);
      }
      if (el('experienceRetry')) el('experienceRetry').hidden = state.status !== 'error';
      if (el('characterExperienceScope')) el('characterExperienceScope').textContent = state.status === 'error' ? state.message : 'Tiến độ Alpha lưu trên trình duyệt theo tài khoản · Chưa đồng bộ EXP lên máy chủ. LV không đánh giá năng lực học tập.';
    }
    function reward(result) {
      const node = el('experienceNotice'); if (!node) return;
      node.textContent = result.awarded ? '+' + result.awarded.toLocaleString('vi-VN') + ' EXP' +
        (result.levelsGained ? ' · Lên LV ' + result.state.level + '!' : '') + (result.capped ? ' · Đạt giới hạn Alpha' : '') : 'Đã đạt giới hạn cấp Alpha · Không cộng thêm EXP';
      node.hidden = false; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { node.hidden = true; }, 6500);
    }
    el('experienceRetry')?.addEventListener('click', () => { retry(); update(); });
    for (const type of ['pointerdown', 'pointerup', 'click', 'wheel', 'keydown']) el('experienceHud')?.addEventListener(type, event => event.stopPropagation());
    return Object.freeze({update, reward});
  };
})(typeof window === 'undefined' ? globalThis : window);
