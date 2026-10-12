/* VIET VILLAGE 3D — Cung: 3 kỹ năng riêng.
 * Thời gian: giây; khoảng cách: mét (quy ước 1 đơn vị Three.js = 1 mét).
 * Các trị số là mặc định thử nghiệm do thiết kế, không đo từ ảnh.
 * Hướng trước trong local space là -Z; scene cần dùng hệ trục Y-up.
 */
(function (root, factory) {
  'use strict';
  const config = factory();
  if (typeof module === 'object' && module.exports) module.exports = config;
  if (root) root.BowSkillConfig = config;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
  "weaponId": "bow",
  "name": "Cung",
  "palette": {
    "primary": "#ffbb4d",
    "secondary": "#549eff",
    "core": "#fff3d2",
    "earth": "#9d7858"
  },
  "skills": [
    {
      "id": "bow.xuyen-tien",
      "localId": "xuyen-tien",
      "name": "Xuyên Tiễn",
      "type": "projectile",
      "slot": 1,
      "duration": 1.5,
      "activeAt": 0.18,
      "activeEnd": 1.15,
      "cooldown": 1.8,
      "radius": 0.26,
      "range": 12.0,
      "forwardOffset": 1.0,
      "description": "Một mũi tên năng lượng vàng với luồng khí xanh dọc đường bay và chớp sáng khi kết thúc."
    },
    {
      "id": "bow.lien-tien",
      "localId": "lien-tien",
      "name": "Liên Tiễn",
      "type": "volley",
      "slot": 2,
      "duration": 1.8,
      "activeAt": 0.25,
      "activeEnd": 1.45,
      "cooldown": 3.0,
      "radius": 0.28,
      "range": 11.0,
      "forwardOffset": 1.0,
      "description": "Nhiều tên vàng phóng liên tiếp theo hình quạt, mỗi tên có vệt xanh và lóe va chạm."
    },
    {
      "id": "bow.mua-ten",
      "localId": "mua-ten",
      "name": "Mưa Tên",
      "type": "rain",
      "slot": 3,
      "duration": 2.7,
      "activeAt": 0.65,
      "activeEnd": 2.3,
      "cooldown": 5.0,
      "radius": 3.8,
      "range": 10.0,
      "forwardOffset": 7.0,
      "description": "Vòng triệu hồi trên cao, nhiều tên vàng xanh rơi xuống vùng tròn phía trước."
    }
  ]
};
});
