# Vòng DỊCH CHUYỂN chung tại Làng Việt

Áp dụng trong worktree `VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.

## Hành vi

- Làng Việt có một vòng vùng tại `(0, 0.335, 20)`, bán kính `0.8 m`, biển **DỊCH CHUYỂN**. Vòng riêng Đồng Tre tại `(5, 0.335, 20)` được thay bằng một lựa chọn trong bảng.
- Bước vào vòng mở bảng chọn ngay, dừng đường tự đi/cần điều khiển/phím đang giữ và tạm khóa điều khiển cảnh. Đứng lâu hoặc nhấn E không chuyển MAP.
- Chỉ nút chọn đích mới gọi `travelTo()`. Bảng sử dụng `checkTravelAccess()` chung với bản đồ tổng và cổng E; kiểm tra lại ngay trước khi chuyển.
- Đích chưa đạt điều kiện hoặc tải lỗi bị khóa, có lý do. Lỗi dựng cảnh không bị thử lại mỗi khung hình. Có thể đóng bảng, ra khỏi vòng và bước lại để thử tải lại.
- **Đóng** hoặc **Esc** trả tiêu điểm về cảnh và xóa thao tác đang giữ. Bảng chỉ mở lại sau khi nhân vật thực sự ra khỏi vòng (khoảng đệm 0.15 m) rồi vào lại; việc reset điều khiển, mất tiêu điểm hoặc đóng bảng không tự mở lại bảng.
- Dialog hỗ trợ bàn phím, giữ Tab trong bảng, ngăn sự kiện chuột/chạm/cuộn truyền xuống cảnh; cuộn được ở màn hình thấp.
- Các cổng quay về ở MAP đích giữ hành vi cũ: Đồng Tre dùng E/nút chạm, Làng Tân Thủ đứng trong vòng 0.8 giây.

## Liên kết giữ nguyên

| Lựa chọn / chiều về | mapId | spawnId | Tọa độ xuất hiện |
| --- | --- | --- | --- |
| Đồng Tre (`dong-tre`) | `ngoai-lang-dong-tre` | `from-lang-viet` | `(0, 0.3, 17)` |
| Làng Tân Thủ (`lang-tan-thu`) | `lang-tan-thu` | `village-entry` | `(0, 0.3, 16.5)` |
| Đồng Tre → Làng Việt | `lang-viet` | `from-dong-tre` | `(5, 0.3, 16.5)` |
| Làng Tân Thủ → Làng Việt | `lang-viet` | `village-entry` | `(0, 0.3, 16.5)` |

Các điểm xuất hiện được bộ quản lý MAP kiểm tra mặt đất, va chạm và khoảng cách ngoài mọi vùng kích hoạt. Giữ đối tượng nhân vật, trang bị, hồi chiêu, túi đồ, tiến độ và phiên đăng nhập hiện có; không tạo lại chúng khi chọn đích.

Điều kiện Đồng Tre vẫn ở `gameplay`: nhân vật còn sống, không chuyển cảnh, cấp tối thiểu 1, phí 0, đi bộ thật ít nhất 3 m và dùng một kỹ năng thành công, MAP/điểm xuất hiện hợp lệ.

## Tệp thay đổi

- `MAP/regions/lang-viet/scene.js`: cấu hình vòng chung và hai lựa chọn từ các liên kết cũ.
- `MAP/regions/lang-viet/dialogues.json`: lời hướng dẫn của Tuần đinh phù hợp giao diện mới.
- `SOURCE-CODE/js/region-travel.js`: biển, bảng chọn, khóa mỗi lượt vào, kiểm tra điều kiện và cập nhật nút đi tới vòng.
- `SOURCE-CODE/js/legacy-game-controls.js`: nhận biết bảng chọn đang mở để khóa điều khiển.
- `SOURCE-CODE/js/app.js`: đóng bảng khi phiên đăng nhập bị khóa.
- `SOURCE-CODE/js/village-npcs.js`: hướng dẫn đi Đồng Tre qua bảng chọn.
- `SOURCE-CODE/index.html`, `SOURCE-CODE/css/regions.css`: dialog, kiểu dáng responsive, tiêu điểm và phiên bản đường dẫn để tải mã mới.
- `SOURCE-CODE/tests/region-travel.test.cjs`, `dong-tre-travel.test.cjs`, `region-access.test.cjs`, `world-atlas.test.cjs`, `player-journey.test.cjs`: kiểm tra hành vi mới, giữ kiểm tra các cổng quay về; bài đo quãng đường dùng đường đi thường thay vì đặt nhân vật vào vòng vừa đổi sang mở dialog.
- Tài liệu này.

Không sửa hình học nhà, nội thất, NPC, ánh sáng, thời tiết, dữ liệu tiến độ hoặc cấu hình Firebase. Không thay đổi bản chính, commit, push hay triển khai.

## Kết quả kiểm tra

### Tự động

- `npm test`: **171/171 test đạt, 4 kiểm tra logic/hình học đạt, exit code 0**. Log hoàn tất: `.cache/shared-region-portal/all-tests-passed.log`.
- Có kiểm tra một vòng duy nhất, đúng hai cặp MAP/spawn, đi bộ/cần điều khiển mở bảng, khóa di chuyển, E/đứng lâu không chuyển, đóng rồi ra-vào mới mở lại.
- Có kiểm tra điều kiện dùng chung với atlas, nhân vật chết/cấp thấp, lỗi tải/lỗi trong chuyển cảnh giữ cảnh và camera cũ, điểm xuất hiện an toàn, không sinh thêm cảnh/vòng qua 10 chuyến khứ hồi mỗi tuyến.
- Các kiểm tra hình học dùng Three.js thật trong harness; renderer và xác thực được mô phỏng trong test tự động. Đây không phải bằng chứng đăng nhập Google.

### Thao tác trình duyệt thật

URL: <http://localhost:8001/SOURCE-CODE/index.html>, dùng phiên Google đã có.

- Đến vòng bằng đường đi và bước WASD: bảng tự mở, không cần E.
- Giữ W, bấm E và đứng chờ khi bảng mở: vẫn ở Làng Việt. Esc và nút Đóng hoạt động; đi ra rồi trở lại mở được lần tiếp theo.
- Chọn Đồng Tre → tới Đồng Tre → quay về bằng E: đạt. Chọn Làng Tân Thủ → tới Tân Thủ → quay về bằng vòng 0.8 giây: đạt. Sau khi tới không mở bảng hoặc quay ngược tự động.
- Kích thước 390 × 844: bảng đủ hai nút và nút Đóng; chọn Đồng Tre và quay về bằng nút chạm hoạt động. Chưa kiểm tra trên điện thoại vật lý.
- Hồ sơ lưu riêng `shared-region-picker-20261011`: Đồng Tre bị khóa, hiển thị cả hai hướng dẫn còn thiếu; Tân Thủ vẫn chọn được. Đi bộ thực tế và dùng chiêu kiếm → Đồng Tre được mở. Chuyến khứ hồi giữ kiếm, trạng thái sống, cấp và tiến độ; dữ liệu hồ sơ cũ so sánh trước/sau vẫn nguyên vẹn.
- Không ghi nhận lỗi JavaScript/WebGL trong phiên kiểm tra. Đường dẫn script, CSS và ảnh cục bộ được bộ kiểm tra atlas đối chiếu tên tệp chính xác.

Bằng chứng và bản sao trước sửa nằm trong `.cache/shared-region-portal/` (đã bị Git bỏ qua): ảnh desktop/mobile/vòng chung/trạng thái bị khóa, kết quả hồ sơ thử nghiệm và log kiểm tra. Bản thử nghiệm hồ sơ không được nạp bởi trang game chính.
