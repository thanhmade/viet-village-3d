# Kết quả kiểm tra v2 — 2026-10-11

Đã kiểm tra mã của cả 5 vũ khí và 15 chiêu. Các kết quả dưới đây xác định rõ lớp được kiểm tra; không thay cho việc thử trên renderer và máy đích của game.

| Kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| Node / Three.js r160 thật | **16/16 đạt** | Timeline, sự kiện, transform, cooldown, pool và dọn tài nguyên |
| 15 chiêu với 4 delta | **60/60 tổ hợp đạt** | 1/30, 1/60, 0.37 và 10 giây; không mất sự kiện khi frame đi qua nhiều mốc |
| Giao diện qua VM | **13 kiểm tra đạt** | DOM/renderer mô phỏng, geometry và camera Three.js thật |
| Shader và cảnh qua Mesa EGL | **7 chương trình shader link thành công**, 15 cảnh dựng được, GL error = 0 | 6 shader VFX và 1 shader chiếu sáng cho scene thử |
| 10 PNG | **10/10 SHA-256 trùng nguồn** | Bản sao nguyên nội dung, chỉ đổi tên/đường dẫn |
| Đường dẫn HTML | Các script/CSS được tham chiếu đều tồn tại | Đường dẫn tương đối trong gói |

## Logic và định vị

Suite có trong `SOURCE-CODE/tests/weapons-vfx.test.cjs`, chạy bằng:

```bash
node --test SOURCE-CODE/tests/weapons-vfx.test.cjs
```

Kiểm tra 15 ID riêng, đúng ba ô mỗi vũ khí; complete/impact/khiên không phát trùng; hồi chiêu tách theo caster và chiêu; từ chối sai trang bị/quá tầm/thiếu đầu vào không trừ cooldown; giới hạn số hiệu ứng và hạt; đổi chất lượng; cancel/dispose chỉ giải phóng tài nguyên do manager tạo. Liên Tiễn giữ đủ ba tác động, Mưa Tên giữ đủ 12 điểm rơi kể cả delta lớn.

Khiên đọc tọa độ thế giới dưới parent quay và theo nhân vật di chuyển. Chấn Địa khóa điểm nền sau va chạm. Hạt ở weaponTip đúng world transform. Test riêng Mưa Tên dùng parent quay, caster di chuyển và nền dốc: cả 12 đầu tên chạm đúng vị trí địa hình được phát trong sự kiện. Đã sửa lỗi tên rơi tới độ cao tâm vùng thay vì độ cao từng điểm rơi.

## Giao diện và hình ảnh

Mô phỏng VM đã kiểm tra chọn năm vũ khí, ba ô chiêu, năm mô hình hình học khác nhau, hủy khi đổi vũ khí và giữ cooldown, thi triển đủ 15 chiêu, phím tắt, di chuyển khi giữ khiên, pause, đổi chất lượng, chạy tự động đủ 15 chiêu, 10 đường dẫn ảnh và camera khi đổi kích thước màn hình. Đây là kiểm tra logic UI với renderer stub, không phải screenshot hay trải nghiệm trình duyệt thật.

Kiểm tra EGL dùng llvmpipe / OpenGL ES 3.2 Mesa, xuất geometry và các shader VFX từ Three.js rồi biên dịch/link/draw. Chunk màu được lấy từ Three.js r160 và dùng chuyển đổi sRGB như renderer demo. Mesh instance được mở thành từng transform để dựng cảnh kiểm tra; vật liệu tiêu chuẩn của nhân vật/đá dùng shader chiếu sáng giản lược. Đã xem ảnh render của 15 cảnh để rà hình dạng, màu và hướng hiệu ứng.

Kiểm tra này không xác minh toàn bộ WebGLRenderer, shadow/postprocessing, browser input, màu cuối trên mọi màn hình hoặc hiệu năng GPU điện thoại. Chạy Chromium trong môi trường kiểm tra bị chặn ở bước tạo socket nên chưa có xác minh trực tiếp trên trình duyệt. Demo vẫn cần được mở trên Chrome/Edge của máy đích.

## Báo cáo đi kèm

| File | Nội dung |
|---|---|
| `node-tests.tap` | Kết quả chạy suite cuối cùng |
| `demo-vm-results.json` | 13 kiểm tra giao diện mô phỏng |
| `shader-render-results.json` | Renderer EGL, số shader và GL error từng chiêu |
| `validation-results.json` | Kết quả tổng hợp và cờ phạm vi xác minh |
| `MANIFEST-ANH-THAM-CHIEU.json` | Tên nguồn, đường dẫn đích, kích thước và SHA-256 của 10 ảnh |
| `SHA256SUMS.txt` | Hash các file trong gói, trừ chính file danh sách hash |

Ảnh render dùng nội bộ để QA; gói chứa báo cáo và ảnh tham chiếu do thầy cung cấp. Không có model GLB final, animation rigged, âm thanh, damage/hitbox hoặc game chính đã nối sẵn. Các tham số và số tên của demo là lựa chọn thiết kế thử nghiệm.
