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
      "duration": 1.05,
      "activeAt": 0.14,
      "activeEnd": 0.75,
      "cooldown": 1.3,
      "radius": 0.5,
      "range": 6.0,
      "forwardOffset": 0.8,
      "description": "Đâm thẳng tạo luồng sáng vàng trắng hẹp, tia ngắn và vòng lóe tại điểm kết thúc."
    },
    {
      "id": "spear.thuong-phong",
      "localId": "thuong-phong",
      "name": "Thương Phong",
      "type": "sweep",
      "slot": 2,
      "duration": 1.35,
      "activeAt": 0.15,
      "activeEnd": 0.95,
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
      "duration": 2.2,
      "activeAt": 0.25,
      "activeEnd": 1.85,
      "cooldown": 4.0,
      "radius": 4.3,
      "range": 4.3,
      "forwardOffset": 0.0,
      "description": "Xoay thương tích lực tạo nhiều vòng xoắn vàng trắng theo chiều cao và đá văng."
    }
  ]
};
});
