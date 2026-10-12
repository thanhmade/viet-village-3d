# Đồng Tre — bật gameplay và kiểm thử hồ sơ riêng

Ngày kiểm tra: 11/10/2026. Thư mục: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`; Git root đúng thư mục này, nhánh `cap-nhat`.

## Cấu hình cuối

- `MAP/region-access.js`: `mode: 'gameplay'`.
- MAP `ngoai-lang-dong-tre`: cấp tối thiểu 1, phí 0.
- Phải còn sống, không đang dựng/chuyển MAP hoặc chuyển nội thất; giữ yêu cầu phiên Google hợp lệ.
- Phải tự đi ít nhất 3 m sau xử lý va chạm và thực hiện một chiêu thành công. Đi tự động đến cổng, dịch chuyển, chỉ chọn vũ khí hoặc chiêu thất bại không được tính.
- MAP, factory và spawn phải đăng ký; cảnh dựng được và spawn trên nền đi được, ngoài vùng kích hoạt. Atlas dùng `village-entry`, cổng E dùng `from-lang-viet`.
- Atlas và cổng E vẫn dùng chung `checkTravelAccess`; giữ cơ chế kiểm lại trước chuyển và giữ MAP nguồn khi tải/kiểm tra đích thất bại. Không thay đổi hàm admission trong lần chuyển cấu hình này.

## Hồ sơ kiểm thử và bảo toàn dữ liệu

Dùng hồ sơ cục bộ riêng `dong-tre-gameplay-77323451`, với phiên Google thật đang đăng nhập. Đây **không phải tài khoản Google thứ hai**. Trang kiểm thử giữ nguyên hàm đọc Firebase UID và toàn bộ mã game; chỉ cấp bộ lưu journey có tiền tố riêng:

`viet-village:qa:dong-tre-gameplay-77323451:...`

Không sửa UID, giả đăng nhập hoặc đặt cờ hoàn thành bằng công cụ trình duyệt. Hoàn thành hai hướng dẫn bằng thao tác WASD và bấm chiêu thật. Không xóa hay đặt lại hồ sơ gốc.

Trang kiểm thử đối chiếu toàn bộ khóa/value journey gốc (`viet-village:journey:v1:`) và tiến độ Toán (`math-island-3d-v1-`) với bản đọc trước khi chơi. Trước, sau chuyển MAP và sau reload đều hiển thị **Hồ sơ cũ: nguyên vẹn**. Bộ lưu chính, phiên bản schema và mã xử lý lưu của game không đổi.

Tệp kiểm thử, bằng chứng và ảnh đặt trong `.cache/dong-tre-gameplay-77323451/`, được Git bỏ qua. Trang game bình thường không tải đoạn mã cách ly này.

## Thao tác thực tế trên localhost

Trình duyệt Codex, cổng 8001, trang kiểm thử dùng cùng mã từ `/SOURCE-CODE/` và tài nguyên dự án.

| Thao tác | Kết quả quan sát |
|---|---|
| Hồ sơ mới, chọn Đồng Tre trên bản đồ tổng | Nút Đến khu vực bị vô hiệu; hiện đầy đủ lý do thiếu hướng dẫn di chuyển và kỹ năng. |
| Đến gần cổng rồi nhấn E, chưa làm hướng dẫn | Hiện cùng lý do, vẫn ở Làng Việt; lần nhấn đã tiêu thụ kích hoạt cổng, không chuyển lặp. |
| Giữ W khoảng 1,1 giây | Thông báo hoàn thành đi bộ ít nhất 3 m. Atlas vẫn chặn, chỉ còn thiếu kỹ năng. |
| Chọn Kiếm rồi dùng Nhất Kiếm | Thông báo hoàn thành hướng dẫn kỹ năng; nút chiêu vào cooldown. |
| Mở atlas, chọn Đồng Tre | Hiện Sẵn sàng · Chế độ chơi · Cấp tối thiểu 1 · Phí 0; nút Đến khu vực được bật. |
| Bấm Đến khu vực | Đến Đồng Tre, giữ `alive: true`, cấp 1, Kiếm, hai cờ hướng dẫn và tiến độ Toán. |
| Dùng Kiếm Hoa tại Đồng Tre | Chiêu hoạt động và nút vào cooldown. |
| Đi tới cổng, nhấn E trở về | Về Làng Việt, giữ các trạng thái trên. |
| Từ Làng Việt đi tới cổng và nhấn E | Vào Đồng Tre thành công khi đủ điều kiện; Kiếm Khí vẫn dùng được. |
| Tải lại trang cùng hồ sơ thử nghiệm | Google xác thực lại; cả hai hướng dẫn vẫn hoàn thành trước bất kỳ thao tác đi bộ/chiêu mới nào. |
| Mở game rồi chọn Đồng Tre sau reload | Atlas vẫn Sẵn sàng; bấm để vào được ngay, không làm lại hướng dẫn. |

Ở lượt tiếp cận cổng đầu, đường tự đi dừng trước vòng; bấm lại Đi tới cổng đã tiếp cận được. Không sửa cơ chế tự dẫn đường trong đợt chuyển cấu hình này. Nhấn E được kiểm tra khi nhân vật đã thật sự vào bán kính cổng và tiêu điểm nằm trong cảnh, không nằm trên nút giao diện.

## Kiểm tự động và giới hạn

- `npm test`: **159/159 Node tests đạt**, cộng **4 kiểm tra logic/hình học/môi trường đạt**. Không có bước build riêng cho game HTML/JS tĩnh.
- Bổ sung test giữ nguyên cấu hình phát hành và chứng minh hồ sơ mới bị chặn trong gameplay. Các tình huống testing cũ chỉ ghi đè mode trong VM kiểm thử riêng.
- Bộ kiểm hiện có tiếp tục kiểm chết/cấp thiếu, khóa chuyển cảnh, cảnh dựng lỗi, spawn thiếu/không an toàn, rollback, UID và lưu trữ cục bộ. Các lỗi này được mô phỏng trong harness, không gây hỏng MAP ở tab người dùng.
- Không ghi nhận lỗi JavaScript/WebGL trong log lỗi của tab ở lượt thử. Các kiểm tự động vẫn có cảnh báo Three.js classic deprecated đã có từ trước.
- Đối chiếu SHA-256: 30/30 ảnh Đồng Tre và tệp gói bản đồ tổng trong manifest kiểm tra trước vẫn nguyên vẹn. Sau kiểm thử đã trả tab về trang game bình thường và xác nhận phiên Google còn hợp lệ.
- **Game chưa có chỉ số máu HP dạng số**, sát thương hoặc hồi sinh thực tế. Đã xác minh giữ cờ `alive: true`; chưa thể khẳng định bảo toàn số HP qua chuyển cảnh.
- Sau reload, lựa chọn vũ khí trở về chưa cầm theo hành vi sẵn có. Trang bị được giữ khi chuyển MAP; yêu cầu lưu hai hướng dẫn qua reload đã đạt. Không thêm lưu vũ khí qua reload trong lần này.
- Kiểm bằng một phiên Google thật và hồ sơ cục bộ cách ly, chưa kiểm tài khoản Google thứ hai, điện thoại vật lý hoặc multiplayer/Firebase thật.
- `git diff --check` cho `SOURCE-CODE/index.html` đạt. Kiểm toàn worktree báo khoảng trắng/CRLF trong README và các thay đổi có sẵn ngoài phạm vi đợt này; giữ nguyên chúng.

## Tệp sửa trong đợt này

1. `MAP/region-access.js`: bật gameplay, cập nhật chú thích.
2. `SOURCE-CODE/index.html`: đổi phiên bản cache của script chính sách sang `20261011-gameplay1`.
3. `SOURCE-CODE/tests/region-access.test.cjs`: kiểm cấu hình gameplay được phát hành; tách mode của fixture testing.
4. `SOURCE-CODE/tests/dong-tre-travel.test.cjs`: fixture chuyển cảnh đã hoàn thành hướng dẫn, để tiếp tục kiểm hình học và bảo toàn trạng thái.
5. `SOURCE-CODE/docs/dong-tre-access.md`: ghi cấu hình gameplay hiện tại, phân biệt báo cáo đợt testing cũ.
6. `SOURCE-CODE/docs/dong-tre.md`: cập nhật điều kiện hiện tại.
7. `SOURCE-CODE/docs/dong-tre-gameplay-check.md`: báo cáo này.

Tạo thêm trang cách ly và ảnh/log trong `.cache/` chỉ để kiểm thử. Không sửa bản chính, không commit/push, không thay đổi Firebase hoặc triển khai website.

Game bình thường: <http://localhost:8001/SOURCE-CODE/index.html>. Khi có cache cũ, nhấn Ctrl+F5.
