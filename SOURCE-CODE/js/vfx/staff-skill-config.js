/* VIET VILLAGE 3D — Côn / Gậy: 3 kỹ năng riêng.
 * Thời gian: giây; khoảng cách: mét (quy ước 1 đơn vị Three.js = 1 mét).
 * Các trị số là mặc định thử nghiệm do thiết kế, không đo từ ảnh.
 * Hướng trước trong local space là -Z; scene cần dùng hệ trục Y-up.
 */
(function (root, factory) {
  'use strict';
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  if (root) root.StaffSkillConfig = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
  "weaponId": "staff",
  "name": "Côn / Gậy",
  "palette": {
    "primary": "#77e6c5",
    "secondary": "#f1d181",
    "core": "#e9fff6",
    "earth": "#a88b68"
  },
  "skills": [
    {
      "id": "staff.con-quet",
      "localId": "con-quet",
      "name": "Côn Quét",
      "type": "sweep",
      "slot": 1,
      "duration": 1.2,
      "activeAt": 0.12,
      "activeEnd": 0.75,
      "cooldown": 1.4,
      "radius": 3.2,
      "range": 3.2,
      "forwardOffset": 0.0,
      "description": "Quét côn ngang tạo dải khí xanh ngọc, mép vàng, bụi đất và mảnh đá quanh chân."
    },
    {
      "id": "staff.ho-than",
      "localId": "ho-than",
      "name": "Hộ Thân",
      "type": "shield",
      "slot": 2,
      "duration": 3.0,
      "activeAt": 0.18,
      "activeEnd": 2.65,
      "cooldown": 5.0,
      "radius": 1.55,
      "range": 0,
      "forwardOffset": 0.0,
      "description": "Cầu khí xanh ngọc trong suốt quanh người, nhiều vòng sáng và phù hiệu vàng quay."
    },
    {
      "id": "staff.chan-dia",
      "localId": "chan-dia",
      "name": "Chấn Địa",
      "type": "slam",
      "slot": 3,
      "duration": 1.8,
      "activeAt": 0.38,
      "activeEnd": 1.25,
      "cooldown": 3.6,
      "radius": 4.5,
      "range": 4.5,
      "forwardOffset": 0.65,
      "description": "Nện côn xuống đất tạo cột sáng đứng, vòng chấn động, vết nứt sáng và đá văng."
    }
  ]
};
});
