/* VIET VILLAGE 3D — Rìu: 3 kỹ năng riêng.
 * Thời gian: giây; khoảng cách: mét (quy ước 1 đơn vị Three.js = 1 mét).
 * Các trị số là mặc định thử nghiệm do thiết kế, không đo từ ảnh.
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
      "duration": 1.7,
      "activeAt": 0.4,
      "activeEnd": 1.3,
      "cooldown": 2.2,
      "radius": 2.8,
      "range": 3.3,
      "forwardOffset": 1.5,
      "description": "Chém bổ xuống tạo vệt lửa cong đứng, cột bùng nổ, vết nứt và đá văng."
    },
    {
      "id": "axe.pha-giap",
      "localId": "pha-giap",
      "name": "Phá Giáp",
      "type": "armor-break",
      "slot": 2,
      "duration": 1.55,
      "activeAt": 0.32,
      "activeEnd": 1.1,
      "cooldown": 2.8,
      "radius": 2.25,
      "range": 3.0,
      "forwardOffset": 1.5,
      "description": "Đòn rìu tập trung phía trước với lõi bùng sáng, mảnh vỡ và vết nứt màu cam đỏ."
    },
    {
      "id": "axe.cuong-phong",
      "localId": "cuong-phong",
      "name": "Cuồng Phong",
      "type": "cyclone",
      "slot": 3,
      "duration": 2.5,
      "activeAt": 0.2,
      "activeEnd": 2.15,
      "cooldown": 4.5,
      "radius": 3.6,
      "range": 3.6,
      "forwardOffset": 0.0,
      "description": "Lốc nhiều dải lửa cam đỏ quay quanh người, bụi cuộn và mảnh đá theo vòng xoắn."
    }
  ]
};
});
