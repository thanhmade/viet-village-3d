/* VIET VILLAGE 3D — Thương / Giáo: 3 kỹ năng riêng.
 * Thời gian: giây; khoảng cách: mét (quy ước 1 đơn vị Three.js = 1 mét).
 * Các trị số là mặc định thử nghiệm do thiết kế, không đo từ ảnh.
 * Hướng trước trong local space là -Z; scene cần dùng hệ trục Y-up.
 */
(function (root, factory) {
  'use strict';
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  if (root) root.SpearSkillConfig = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
  "weaponId": "spear",
  "name": "Thương / Giáo",
  "palette": {
    "primary": "#fff3cc",
    "secondary": "#e3b454",
    "core": "#ffffff",
    "earth": "#71614b",
    "sweep": "#80d6c5"
  },
  "skills": [
    {
      "id": "spear.xuyen-kich",
      "localId": "xuyen-kich",
      "name": "Xuyên Kích",
      "type": "thrust",
      "slot": 1,
      "duration": 2.6,
      "activeAt": 1.04,
      "activeEnd": 1.58,
      "cooldown": 1.3,
      "radius": 0.5,
      "range": 6.0,
      "forwardOffset": 0.8,
      "description": "Hạ tấn tụ khí, đâm thương phóng luồng khí vàng trắng hẹp; vòng va chạm chỉ hiện khi trúng mục tiêu hoặc vật cản."
    },
    {
      "id": "spear.thuong-phong",
      "localId": "thuong-phong",
      "name": "Thương Phong",
      "type": "sweep",
      "slot": 2,
      "duration": 3.2,
      "activeAt": 1.05,
      "activeEnd": 1.78,
      "cooldown": 2.0,
      "radius": 3.8,
      "range": 3.8,
      "forwardOffset": 0.0,
      "description": "Quét thương ngang tạo luồng phong rộng xanh ngọc và trắng, viền vàng nhạt."
    },
    {
      "id": "spear.pha-tran",
      "localId": "pha-tran",
      "name": "Phá Trận",
      "type": "vortex",
      "slot": 3,
      "duration": 4.2,
      "activeAt": 1.15,
      "activeEnd": 2.75,
      "cooldown": 4.0,
      "radius": 4.3,
      "range": 4.3,
      "forwardOffset": 0.0,
      "description": "Tụ lực, xoay thân cùng thương hai vòng giữa các dải khí vàng, kết thúc bằng dư chấn sát nền; mỗi mục tiêu được xác nhận tối đa một lần."
    }
  ]
};
});
