# Xuyên Tiễn — Cung, vàng kim và khí xanh

Nguồn thiết kế: ảnh Xuyên Tiễn người dùng cung cấp (`xuyen-tien-reference.png`). Ảnh thể hiện giương cung, mũi tên vàng có lõi sáng, hai luồng khí xanh theo đường bay và lóe vàng tại điểm trúng. Ảnh tĩnh không xác định thời gian hoặc chuyển động xương; các chuyển động dưới đây là diễn giải để tích hợp vào game.

Giữ mã `bow.xuyen-tien`, ô kỹ năng 1, phím J/1, hồi 1,8 giây, tầm 12 m và bán kính kiểm tra 0,26 m của cấu hình hiện hành. Không đổi sát thương/cân bằng hoặc hai chiêu Cung còn lại.

| Thời điểm | Động tác / kỹ xảo |
| --- | --- |
| 0–0,18 s | Giơ cung, tay còn lại kéo dây và đuôi tên; khí quy tụ thành vòng sáng ở đầu tên. |
| 0,18 s | Nhả tên: chớp vàng ngắn, mũi tên vàng lõi trắng ấm rời cung. |
| 0,18–1,15 s | Tên bay thẳng, vệt vàng kéo dài tối đa 5 m và hai dải khí xanh xoắn. Xuyên qua nhiều bia, mỗi bia chỉ trúng một lần. |
| 0,18–0,68 s | Dây bật về và tay hồi thế; hết 0,68 s có thể đi lại. |
| Khi trúng | Tia lóe tám nhánh, mảnh sáng vàng–xanh, rung nhẹ theo tùy chọn camera của game. Vật cản chặn tên. |
| 1,15–1,50 s | Không phát sinh mục tiêu mới; tia trúng cuối cùng tàn dần, thu hồi tài nguyên. |

Không tự tạo vụ nổ ở cuối tầm khi bắn hụt. Không ép xoay camera hoặc làm chậm toàn bộ game. Trang xem thử có góc camera bên hông và âm thanh tổng hợp tùy chọn; âm thanh đó chưa thêm vào gameplay.

## Tích hợp

- `ASSETS/ui/skills/bow/xuyen-tien-gold-blue.png`: icon được tạo mới từ mô tả mỹ thuật, không có chữ; CSS dùng trực tiếp trên nút `bow.xuyen-tien`.
- `SOURCE-CODE/css/bow-skill-icons.css`: hình, tương phản, trạng thái hồi chiêu; tên, phím tắt và nhãn hỗ trợ vẫn dùng DOM.
- `SOURCE-CODE/js/vfx/bow-piercing.js`: timeline dùng chung, đường tên, dải khí, kiểm tra quét giữa hai khung hình, điểm trúng và thu hồi tài nguyên.
- `CHARACTERS/player-gltf.js`: IK hai tay cho nam/nữ, giữ chiều dài xương; `weapons-village-models.js` điều khiển dây và tên đặt trên cung.
- `weapons-village.js` và `player-avatar.js`: gọi pose, khóa di chuyển trong thao tác kéo/nhả, hủy khi bị ngắt, đổi vũ khí, đóng gameplay hoặc rời cảnh.
- `app.js`: chỉ gọi hệ bia qua sự kiện `hit-window`, không thưởng luyện tập ngay lúc bấm chiêu.
- `village-npcs.js`: cho phép một tên xuyên nhiều bia, giữ logic cũ cho các chiêu khác.
- `load-order.json` và HTML: nạp `bow-piercing.js` sau cấu hình Cung và trước đăng ký `bow-skill-vfx.js`.

VFX không tự thay HP. Hệ chiến đấu chủ quản gọi `event.testTarget(id, feetPosition, radius, height)` trong sự kiện đồng bộ `hit-window`, rồi mới áp dụng tác động của mình nếu trả về `true`. Callback hết hiệu lực khi sự kiện kết thúc. Hệ hiện tại chỉ nối tới bia luyện tập, chưa có sát thương quái trong bản thay đổi này.

Vật cản hiện lấy từ `travelCameraBounds` của map và mặt đất. Ngoài sân Làng Việt, `projectileBounds()` trong `house-travel.js` thêm hai hộp chỉ dành cho tên: tường đình (x ±5,5 m, z −20,4…−17,35, cao 0,9–4 m) và thân cây đa (±1 m quanh gốc); số đo lấy từ GLB đã đặt trong cảnh, hộp camera giữ nguyên. Những mesh chưa có bounds (cột và vách cổng làng, hàng rào thấp, rễ phụ cây đa) không tự động trở thành vật cản; cần đăng ký bounds đúng nếu muốn chúng chặn tên. Kiểm tra mục tiêu là thể tích đứng đơn giản, không phải va chạm từng tam giác hoặc từng bộ phận cơ thể.

## Kiểm chứng và xem thử

```powershell
npm run test:vfx
node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs
python -m http.server 8000
```

Mở `http://localhost:8000/SOURCE-CODE/xuyen-tien-cung-preview.html`. Chọn nam/nữ và ba mức chất lượng; dùng tạm dừng/+0,05 s để xem dây, tay, tên. Hai bia trước vách phải trúng; bia sau vách không trúng. Trang này để kiểm tra local, không được tự thêm vào gói Hosting.

Node kiểm tra GLB thật nhưng thay giải mã bitmap; không xác nhận pixel, shader GPU hoặc FPS. Cần xem Chrome và một thiết bị di động thật trước khi xác nhận mỹ thuật hoàn tất. Các kiểm tra gồm 30/60/120 Hz, khung hình kéo dài, hủy trước/sau nhả, callback cũ, xuyên nhiều bia, vách gần nòng, bắn hụt, mặt đất, thu hồi tài nguyên và hồi quy Côn.

Các ảnh Côn cũ cần tồn tại trong checkout đầy đủ để build Hosting. Không xóa tham chiếu hoặc thay chúng để vượt kiểm tra. Dùng checkout từ GitHub để nhận đủ tài nguyên hiện có.

Kết quả kiểm tra ngày 17/10/2026: `npm run test:vfx` đạt 104/104; nhóm player-gltf, player-avatar và village-npcs đạt 65/65. Trang xem thử đã kiểm tra cú pháp module và đường dẫn script. Chưa chạy WebGL/GPU hoặc kiểm tra FPS trên thiết bị thật trong môi trường bàn giao này. Build Hosting chưa hoàn tất tại đây do thiếu bản sao icon Côn cũ `ASSETS/ui/skills/staff/con-quet-jade.png`; file đó vẫn có trên nhánh GitHub và không bị thay đổi bởi gói này. Chưa triển khai Alpha.
