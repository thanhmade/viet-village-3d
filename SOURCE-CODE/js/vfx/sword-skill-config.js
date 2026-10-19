/* VIET VILLAGE 3D — Kiếm: 3 kỹ năng riêng.
 * Thời gian: giây; khoảng cách: mét (quy ước 1 đơn vị Three.js = 1 mét).
 * Các trị số là mặc định thử nghiệm do thiết kế, không đo từ ảnh.
 * Hướng trước trong local space là -Z; scene cần dùng hệ trục Y-up.
 */
(function (root, factory) {
  'use strict';
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  if (root) root.SwordSkillConfig = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
  "weaponId": "sword",
  "name": "Kiếm",
  "palette": {
    "primary": "#80c9ff",
    "secondary": "#e7f6ff",
    "core": "#ffffff",
    "earth": "#d5b77a"
  },
  "skills": [
    {
      "id": "sword.nhat-kiem",
      "localId": "nhat-kiem",
      "name": "Nhất Kiếm",
      "type": "combo",
      "slot": 1,
      "duration": 1.8,
      "activeAt": 0.25,
      "activeEnd": 1.29,
      "cooldown": 1.5,
      "radius": 3.0,
      "range": 3.6,
      "forwardOffset": 0.25,
      "description": "Liên hoàn nhiều vệt chém cong xanh băng, lõi trắng và điểm va chạm lóe sáng."
    },
    {
      "id": "sword.kiem-hoa",
      "localId": "kiem-hoa",
      "name": "Kiếm Hoa",
      "type": "lotus",
      "slot": 2,
      "duration": 3.6,
      "activeAt": 0.55,
      "activeEnd": 2.65,
      "cooldown": 3.0,
      "radius": 3.8,
      "range": 3.8,
      "forwardOffset": 0.0,
      "description": "Ba vòng chém cao–ngang–thấp mở sáu cánh kiếm khí xanh trắng; hoa nở, cánh tan và thu kiếm trong 3,6 giây."
    },
    {
      "id": "sword.kiem-khi",
      "localId": "kiem-khi",
      "name": "Kiếm Khí",
      "type": "projectile",
      "slot": 3,
      "duration": 3.2,
      "activeAt": 1.04,
      "activeEnd": 1.56,
      "cooldown": 2.2,
      "radius": 0.35,
      "range": 11.0,
      "forwardOffset": 1.0,
      "description": "Hạ tấn tụ vòng khí, đâm kiếm phóng một mũi kiếm khí xanh trắng lõi vàng; va chạm thật và hồi thế trong 3,2 giây."
    }
  ]
};
});
