# Khôi phục vòng nhà dân và thanh công cụ — 11/10/2026

Phạm vi: worktree `VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`. Không commit, push, triển khai hay thay đổi Firebase. Bản chính có hai chức năng này tại commit `3fcaa05`; nhánh thử nghiệm bắt đầu trước commit đó. Chỉ tích hợp phần cần thiết để giữ Google Login, hồ sơ/phòng thử nghiệm, VFX v2 và tối ưu hiệu năng hiện có.

## Chơi thử

Mở http://localhost:8001/SOURCE-CODE/index.html và Ctrl+F5. Đăng nhập Google như trước, chọn **Khám phá làng 3D** hoặc **Cầm vũ khí trong làng**.

- Nhân vật có thể đi tới một trong sáu vòng **VÀO NHÀ**. Đứng liên tục 0,8 giây; viền vàng hiển thị tiến trình. Rời vòng sớm sẽ hủy tiến trình.
- **Công cụ → Vào nhà** hướng dẫn nhân vật đi tới nhà 05. **Đi bộ** trở lại chế độ điều khiển nhân vật sau khi xem toàn cảnh/cổng/nhà mẫu.
- Trong nhà, đi tới vòng **RA SÂN**, hoặc chọn **Đi tới vòng RA SÂN**. Nhân vật quay về đúng sân căn nhà đã vào, ngoài vòng kích hoạt. WASD, nút di chuyển và joystick được giữ.
- Nếu lượt dịch chuyển bị gián đoạn khi đang đứng trong vòng, rời vòng rồi vào lại. Nút hướng dẫn sẽ tự tìm đường ra ngoài vòng trước khi quay lại.
- **Thu gọn** đóng các công cụ; **☰ Công cụ** mở lại. Điện thoại mặc định thu gọn, menu dọc có cuộn. Trạng thái desktop/mobile lưu riêng. Enter/Space, Tab, ArrowDown và Escape được hỗ trợ.

Nếu cần khởi động lại HTTP server, chạy từ gốc CAP-NHAT: `python -B -m http.server 8001 --bind 127.0.0.1`. Không chạy thêm server nếu cổng này đang phục vụ đúng thư mục.

## Các tệp của lần sửa này

| Tệp | Thay đổi |
| --- | --- |
| `MAP/house-portals.js` | Mới: sáu mã nhà, map đích, vòng, điểm xuất hiện và nền tiếp cận. |
| `MAP/navigation.js` | Đường đi qua cửa hàng rào; va chạm bậc/nhà; tìm đường trong nội thất. |
| `MAP/landscape.js` | Chừa lối đi trước nhà 03 và 06 qua khu vườn/ao. |
| `INTERIORS/portal-destinations.js` | Mới: cấu hình và xác minh nội thất/điểm trở về trước khi chuyển. |
| `INTERIORS/house-interior.js` | Giữ mô hình nội thất; kết nối vào/ra, điểm xuất hiện an toàn, joystick và đường đi tới cửa. |
| `SOURCE-CODE/js/house-portals.js` | Mới: vòng Three.js thật, biểu tượng nổi, nhãn, tiến trình và bộ điều khiển 0,8 giây. |
| `SOURCE-CODE/js/house-travel.js` | Mới: nối game với portal; đường hướng dẫn, hủy khi gián đoạn, tránh camera bị mái nhà/cổng che. |
| `SOURCE-CODE/css/house-travel.css` | Mới: điều khiển trên cảm ứng và bố trí nội thất. |
| `SOURCE-CODE/js/toolbar.js` | Mới: đóng/mở 250 ms, lưu trạng thái, ARIA/focus, chặn sự kiện lọt xuống cảnh. |
| `SOURCE-CODE/css/toolbar.css` | Mới: ngang desktop, menu dọc mobile, cuộn, hover và focus. |
| `SOURCE-CODE/index.html` | Wrapper toolbar giữ nguyên ID nút cũ; thêm nút Đi bộ; nạp các module/CSS và hướng dẫn. |
| `SOURCE-CODE/js/app.js` | Tích hợp vào vòng lặp hiện có; chế độ đi bộ; camera và gián đoạn thời gian. |
| `SOURCE-CODE/js/legacy-game-controls.js` | Điều phối click/các chế độ xem và chuyển động. |
| `SOURCE-CODE/load-order.json` | Thứ tự module cho game harness. |
| `SOURCE-CODE/tests/house-portals.test.cjs` | Mới: 13 bài kiểm tra dwell, hủy, lỗi, async, khóa chống lặp và tài nguyên. |
| `SOURCE-CODE/tests/portal-access.test.cjs` | Mới: 3 bài kiểm tra sáu vòng, nền, va chạm và đường tiếp cận. |
| `SOURCE-CODE/tests/house-travel.test.cjs` | Mới: 8 bài kiểm tra tích hợp sáu nhà, trạng thái, thao tác lại, input và camera. |
| `SOURCE-CODE/tests/toolbar.test.cjs` | Mới: 10 bài kiểm tra menu, keyboard, responsive, lưu trạng thái và không hủy lệnh vừa chọn. |
| `SOURCE-CODE/tests/check-moonlight.cjs` | Kiểm tra bóng trăng riêng cho đi bộ và toàn cảnh, theo chế độ mở game mới. |
| `SOURCE-CODE/tests/online-unit.test.mjs` | Xác nhận đi bộ cục bộ vẫn bắt buộc đăng nhập và không cần phòng; giữ kiểm tra toàn cảnh. |
| `package.json` | Kết nối các bài kiểm tra mới vào `npm test` và `npm run test:portals`. |
| `SOURCE-CODE/docs/house-portals-toolbar.md` | Báo cáo này. |

## Kết quả

- `npm test`: 4 nhóm logic/hình học cũ và **91/91 kiểm thử** đạt: online 7, hiệu năng 10, VFX 40, portal/toolbar 34. WebGL và Firebase được giả lập trong harness; không dùng kết quả này để khẳng định đăng nhập thật.
- Trình duyệt localhost dùng phiên Google đã được Firebase xác nhận: vào nhà 05 qua vòng, đi ra sân, giữ côn và dùng Hộ Thân sau khi ra sân. Vòng 3D và nội thất hiển thị được; nút thu gọn/mở lại, lưu qua tải lại và menu 390 × 844 đã kiểm tra.
- 60 liên kết tài nguyên cục bộ trong HTML trả nội dung khớp tệp trên ổ đĩa qua HTTP. Không có lỗi JavaScript/WebGL mới trong log của phiên kiểm thử.
- Tất cả 115 tệp bản chính trong danh sách hash bảo toàn đều không đổi. Các thay đổi và tệp bị xóa có sẵn từ trước được giữ nguyên; chưa thực hiện thao tác Git ghi lịch sử.

## Phạm vi và giới hạn

Sáu map nội thất có mã riêng nhưng dùng chung mẫu nhà 3D hiện có. Vòng dựng bằng hình học Three.js, dựa trên `ASSETS/PORTALS/vao-nha.png` và `ra-san.png`; ảnh không thay thế cảnh 3D. Nội thất được dựng sẵn tại khởi tạo nên không phát sinh tải map mạng mới. Nếu xác minh điểm đến thất bại, nhân vật giữ map cũ và nhận thông báo.

Portal dùng chung geometry/material, không thêm đèn động, bóng đổ hay vòng requestAnimationFrame. Các tối ưu VFX và chất lượng tự động vẫn hoạt động. Chưa đo hiệu năng trên điện thoại vật lý; kiểm tra 390 × 844 là kiểm tra responsive bằng trình duyệt máy tính. Chưa thử touch thật, multiplayer hai tài khoản hoặc thay đổi backend trong lần sửa này.
