/* VIET VILLAGE 3D — Rìu: 3 kỹ năng riêng.
 * Thời gian: giây; khoảng cách: mét (quy ước 1 đơn vị Three.js = 1 mét).
 * Timeline 3.4 / 2.8 / 4.8 s được biên đạo theo ảnh; không phải đo từ ảnh tĩnh.
 * Giữ nguyên ID, cooldown, range, radius và forwardOffset của cấu hình có sẵn.
 * Hướng trước trong local space là -Z; scene cần dùng hệ trục Y-up.
 */
(function (root, factory) {
  'use strict';
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  if (root) root.AxeSkillConfig = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
  "weaponId": "axe",
  "name": "Rìu",
  "palette": {
    "primary": "#ff7a28",
    "secondary": "#e9361b",
    "core": "#ffeab3",
    "earth": "#a26d49"
  },
  "skills": [
    {
      "id": "axe.khai-son",
      "localId": "khai-son",
      "name": "Khai Sơn",
      "type": "cleave",
      "slot": 1,
      "duration": 3.4,
      "activeAt": 0.95,
      "activeEnd": 1.5,
      "cooldown": 2.2,
      "radius": 2.8,
      "range": 3.3,
      "forwardOffset": 1.5,
      "description": "Trụ tấn nâng rìu hai tay, nén khí rồi bổ dọc; luồng khí vàng trắng bùng theo mặt phẳng đứng, đá vỡ và vết nứt sát nền."
    },
    {
      "id": "axe.pha-giap",
      "localId": "pha-giap",
      "name": "Phá Giáp",
      "type": "armor-break",
      "slot": 2,
      "duration": 2.8,
      "activeAt": 0.78,
      "activeEnd": 1.3,
      "cooldown": 2.8,
      "radius": 2.25,
      "range": 3.0,
      "forwardOffset": 1.5,
      "description": "Vặn hông chém chéo, tạo nêm xung lực thấp màu vàng cam; mảnh giáp chỉ xuất hiện ở mục tiêu được xác nhận trúng, không tự thêm hiệu ứng giảm giáp."
    },
    {
      "id": "axe.cuong-phong",
      "localId": "cuong-phong",
      "name": "Cuồng Phong",
      "type": "cyclone",
      "slot": 3,
      "duration": 4.8,
      "activeAt": 0.65,
      "activeEnd": 3.95,
      "cooldown": 4.5,
      "radius": 3.6,
      "range": 3.6,
      "forwardOffset": 0.0,
      "description": "Trụ bộ, xoay thân và rìu bốn vòng giữa dải khí vàng cam, bụi nâu và đá cuốn; mỗi mục tiêu chỉ được xác nhận một lần trong toàn chiêu."
    }
  ]
};
});
