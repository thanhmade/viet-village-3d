# Chấn Địa — nhảy, tụ khí, giáng côn trong 5,4 giây

Cập nhật ngày 17/10/2026 trên `thanhmade/viet-village-3d`, nhánh `cap-nhat`.

Chiêu dùng khi trang bị Côn, phím 3 / nút Chấn Địa. Tổng thời gian 5,4 giây, đúng 3 lần Côn Quét 1,8 giây.

| Mốc | Động tác và hiệu ứng |
| --- | --- |
| 0–0,75 s | Hạ trọng tâm, dồn lực; khí bắt đầu quy tụ, vòng ấn hiện dưới chân. |
| 0,75–1,45 s | Bật nhảy, co chân, đưa côn lên đầu. |
| 1,45–3,35 s | Giữ thế trên không; dải khí ngọc viền vàng xoáy quanh thân, hạt sáng hút vào người và đầu côn. |
| 3,35–3,90 s | Tăng tốc giáng côn, hạ người xuống điểm đánh. |
| 3,90–4,95 s | Côn chạm đất; sóng chấn động lan ra, vết nứt sáng và đá bật lên. |
| 4,65–5,40 s | Hồi thế trong khi hiệu ứng đất tàn dần. |

Tư thế nam/nữ giải IK trên bộ xương GLB thật; hai tay giữ cùng thân côn, không kéo dài xương. Nhân vật hình khối ban đầu cũng có động tác nhảy và giơ côn. Bước nhảy của chiêu chỉ nâng phần hiển thị; bộ điều khiển va chạm vẫn ở mặt đất, khóa di chuyển trong 5,4 giây. Không thêm bất tử hoặc khả năng né sát thương.

Chỉ phát một lần va chạm ở 3,9 giây. Sóng giữ bán kính 4,5 m và kiểm tra dải quét giữa hai khung hình để tránh mất hoặc lặp tác động khi khung hình chậm. Giữ hồi chiêu cấu hình 3,6 giây tính từ lúc kích hoạt; khóa thi triển chiêu mới đến khi toàn bộ động tác 5,4 giây kết thúc. Hủy chiêu không đặt lại hồi chiêu. Hủy trước lúc chạm đất thì không phát sóng.

Rung camera dùng tùy chọn đang có. Không ép xoay camera trong gameplay; trang xem thử có tùy chọn camera điện ảnh riêng. Chất lượng thấp dùng hai dải khí, vừa/cao dùng ba; tài nguyên hiệu ứng được thu hồi khi hết hoặc hủy chiêu.

## Các điểm tích hợp

| Tệp | Vai trò |
| --- | --- |
| `SOURCE-CODE/js/vfx/staff-slam.js` | Timeline, độ cao nhảy, tư thế cầm côn và mốc tiếp đất dùng chung. |
| `SOURCE-CODE/js/vfx/staff-skill-config.js` | Thời lượng, pha, cửa sổ tác động và mô tả chiêu. |
| `CHARACTERS/player-gltf.js` | Tư thế nam/nữ, IK hai tay/chân, hồi thế và hủy. |
| `SOURCE-CODE/js/player-avatar.js` | Gọi động tác Chấn Địa từ hệ nhân vật. |
| `SOURCE-CODE/js/weapons-village.js` | Điều phối chiêu, nhân vật ban đầu, khóa thi triển và đồng bộ hủy. |
| `SOURCE-CODE/js/app.js` | Khóa di chuyển trong khi Chấn Địa còn hoạt động. |
| `SOURCE-CODE/js/vfx/staff-skill-effects.js` | Khí quanh thân, vòng ấn, chấn động và quản lý tài nguyên. |
| `SOURCE-CODE/index.html`, `SOURCE-CODE/load-order.json` | Nạp `staff-slam.js` trước `staff-skill-effects.js`; cập nhật mã cache. |
| `SOURCE-CODE/chan-dia-con-preview.html` | Xem riêng nam/nữ, các mức chất lượng và bước thời gian 0,05 giây. |

Các trang xem thử Côn Quét, Hộ Thân và sân luyện cũng đã được bổ sung phụ thuộc mới. Bộ biểu tượng hiện có trong `ASSETS/ui/skills/staff` tiếp tục dùng nguyên trạng.

## Kiểm tra đã chạy

```sh
npm run test:vfx
node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs
```

Kết quả: 93/93 kiểm tra VFX và 43/43 kiểm tra nhân vật đạt. Bộ mới kiểm tra trên GLB nam/nữ thật ở bước thời gian 30/60/120 Hz: độ cao, chiều dài xương, tiếp xúc hai tay, đầu côn chạm đất, hồi thế và hủy ở nhiều pha. Kiểm tra sóng đất bao gồm khung hình dài, bỏ qua cả timeline, chống tác động trùng và hủy trước va chạm. Kiểm tra vòng lặp game xác nhận khóa di chuyển và hoàn trả nhân vật ban đầu.

Đây là kiểm tra logic và hình học trong Node; renderer được giả lập, nên không thay cho việc xem shader, ánh sáng và hiệu năng GPU trong trình duyệt. Chưa triển khai Firebase từ môi trường này. Chưa chạy trọn gói Hosting tại đây vì ba PNG biểu tượng có trên GitHub chưa tải được qua kết nối đọc tệp nhị phân; không thay ảnh bằng tệp giả.

## Kiểm tra trên máy triển khai

1. Đồng bộ nhánh `cap-nhat` vào dự án hiện có; giữ các thay đổi chưa commit của người dùng và xử lý chênh lệch trước khi áp dụng.
2. Chạy hai lệnh kiểm tra trên, rồi `npm run build:hosting` và `npm run test:hosting`. Bản build tự thu thập module mới qua thẻ script trong trang game.
3. Mở `SOURCE-CODE/chan-dia-con-preview.html` qua HTTP, thử nam/nữ và chất lượng thấp/vừa/cao. Kiểm tra lúc 0,75; 1,45; 3,35; 3,90 và 5,40 giây. Thử hủy lúc đang ở trên không; nhân vật phải về mặt đất ngay.
4. Trong game, dùng Côn → phím 3. Kiểm tra hai tay ôm côn, khí bao quanh thân, không có sóng đất sớm, và có thể đi lại sau khi hồi thế. Thử đổi vũ khí, mở bảng, đổi nhân vật, mất tiêu điểm, mất HP và đăng xuất giữa chiêu.
5. Dùng phiên Firebase đã đăng nhập trên máy để cập nhật đúng kênh Hosting Alpha hiện có của `viet-village-3d`; kiểm tra URL Alpha sau triển khai. Không cần tạo phiên đăng nhập mới nếu CLI hiện tại vẫn hoạt động.

Không có thay đổi backend, quyền dữ liệu, tag/release hoặc nhánh `main` trong gói này.
