/* VIET VILLAGE 3D — Côn / Gậy: 3 kỹ năng riêng.
 * Thời gian: giây; khoảng cách: mét (quy ước 1 đơn vị Three.js = 1 mét).
 * Côn Quét: nhịp 4 pha do thiết kế (staff-sweep.js, docs/staff-sweep-20261016.md).
 * Hộ Thân giữ thời gian 3 s; động tác tụ khí 0,7 s độc lập thời gian bảo vệ.
 * Chấn Địa: activeAt/activeEnd khớp đoạn hoạt ảnh GLB trong staff-vfx-config.js
 * (đo từ clip thật: thế thủ, điểm côn chạm đất); các trị số khác là mặc định thiết kế,
 * không đo từ ảnh.
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
      "sweepRadius": 2.1,
      "containRadius": 1.65,
      "phases": {"windup": 0.14, "openEnd": 0.36, "accelerateEnd": 0.82, "closeEnd": 1.06, "releaseAt": 1.12, "releaseEnd": 1.48},
      "slot": 1,
      "duration": 1.8,
      "activeAt": 0.14,
      "activeEnd": 1.48,
      "cooldown": 2.4,
      "radius": 3.2,
      "range": 3.2,
      "forwardOffset": 0.0,
      "description": "Quét ngang liên tục: mở cung, tăng lực, khép vòng — dải khí xanh ngọc bám theo thân côn, mép vàng; rồi phát một sóng xanh ngọc viền vàng sát đất. Tầm côn 2,1 m; sóng 3,2 m."
    },
    {
      "id": "staff.ho-than",
      "localId": "ho-than",
      // Proposed balance for session combat, separate from visual size/intensity.
      "guard": {"maxHpRatio": 0.30},
      "name": "Hộ Thân",
      "type": "shield",
      "slot": 2,
      "duration": 3.0,
      "activeAt": 0.25,
      "activeEnd": 2.65,
      "cooldown": 5.0,
      "radius": 1.55,
      "range": 0,
      "forwardOffset": 0.0,
      "description": "Hộ thể bằng cầu khí ngọc, ba vòng khí vàng và phù văn. Hấp thụ tối đa 30% HP tối đa trong 2,4 giây; hết dung lượng thì vỡ. Mức bảo vệ thử nghiệm, chỉnh tại guard.maxHpRatio."
    },
    {
      "id": "staff.chan-dia",
      "localId": "chan-dia",
      "name": "Chấn Địa",
      "type": "slam",
      "slot": 3,
      "duration": 1.8,
      "activeAt": 0.72,
      "activeEnd": 1.5,
      "cooldown": 3.6,
      "radius": 4.5,
      "range": 4.5,
      "forwardOffset": 0.65,
      "description": "Tụ khí ở đầu côn rồi nện xuống đất: chớp sáng, cột sáng thấp, sóng chấn động bám địa hình, vết nứt phát sáng và đá văng."
    }
  ]
};
});
