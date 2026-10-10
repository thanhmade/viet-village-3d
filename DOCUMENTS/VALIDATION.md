# Kiểm tra gói xuất

Ngày kiểm tra: 10/10/2026. Chi tiết số lượng và lỗi nằm trong `validation-results.json`; trạng thái ZIP cuối cùng ở `ZIP-VALIDATION.txt` (đi kèm tệp tải).

## Đã thực hiện

- Kiểm tra đường dẫn `src`/`href` của trang gốc, SOURCE-CODE/index.html và BACKUP/live-v8/index.html. Tất cả tài nguyên chạy nằm trong gói.
- Kiểm tra cú pháp bằng Node.js cho Three.js và 16 phần script theo thứ tự tải.
- Khởi tạo cảnh bằng Three.js thật trong môi trường Node VM, với renderer và DOM mô phỏng. Kiểm tra hình học không có tọa độ NaN/Infinity.
- Kiểm tra sáu lối vào/ra, bốn góc nhìn phòng, đi lại, giới hạn tường và đồ nội thất, giữ góc nhìn khi quay ra sân.
- Kiểm tra chuyển UTC+7, mùa khô/mưa, hướng nắng sáng/chiều, nắng trưa, tắt nắng ban đêm, sao, mưa, độ ướt, tránh mưa trong nhà và thay chất lượng bóng.
- Kiểm tra đèn sáu nhà và bản xem riêng: sáng dần chiều tối, sáng lúc khuya, tắt dần sáng sớm, tắt ban ngày; giới hạn đèn đổ bóng và chuyển vào/ra nội thất.
- Kiểm tra ánh trăng cùng hướng với đĩa trăng, tăng sáng đường, giảm theo mây/mưa, giảm sáng nền trong phòng, tắt ban ngày, thanh độ sáng và chế độ tắt bóng.
- Xác nhận backup/live-v8 có nội dung byte giống nguồn dist; xác nhận Git bundle chứa lịch sử đầy đủ của checkout 9 commit truy cập được.
- Kiểm tra các PNG giải mã được; 4 PPTX có cấu trúc và CRC hợp lệ. Không sửa nội dung bài giảng.
- Kiểm tra 5 JSON mô hình bằng ObjectLoader và dữ liệu hình học; kiểm tra CRC và cấu trúc thư mục ZIP cuối cùng.

## Chưa thực hiện

Chưa chạy trình duyệt/GPU thật trong phiên xuất, chưa đo FPS, chưa thử điện thoại/màn hình tương tác, chưa xác nhận độ giống ảnh tham chiếu bằng render thực tế. Renderer mô phỏng không chứng minh shader/ảnh/bóng trên từng thiết bị hoạt động hoặc đạt chất lượng mong muốn. Tệp BAT được kiểm tra nội dung và đường dẫn nhưng chưa chạy trên máy Windows của người dùng.

Các HTML lịch sử và helper phát triển trong BACKUP được giữ nguyên để lưu trữ; không nằm trong kiểm tra đường dẫn chạy hiện tại. Dùng Git bundle để phục hồi một bản lịch sử có cấu trúc dist đầy đủ.

Three.js bản UMD cũ in cảnh báo deprecated khi kiểm tra. Không tự nâng cấp thư viện trong tác vụ xuất vì thay đổi đó cần kiểm thử tương thích riêng.
