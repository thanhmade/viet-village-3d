# Tối ưu hiệu năng CAP-NHAT — 11/10/2026

Thực hiện tại worktree `VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`. Không commit, push, deploy hoặc thay đổi Firebase. Giữ nguyên cấu trúc làng, nhà, nội thất, 5 vũ khí và 15 chiêu.

## Thay đổi

- Thêm bộ điều chỉnh chất lượng tự động: giới hạn số pixel, giảm bóng/đèn khi FPS dưới 42 trong nhiều mẫu liên tiếp; chỉ tăng lại sau thời gian ổn định để tránh đổi qua lại. Lựa chọn Đẹp/Ưu tiên mượt vẫn do người chơi quyết định và được nhớ trên máy.
- Chất lượng Tự động bắt đầu với tối đa 1,5 triệu pixel, bóng mặt trời 1024, 6 đèn nhà thật và 1 bóng đèn nhà. Mức nhẹ dùng 2 đèn nhà và bỏ bóng; Đẹp giữ tối đa 18 đèn nhà. Các cửa sổ phát sáng vẫn tồn tại ở mọi mức.
- Giới hạn dựng hình tối đa khoảng 60 FPS, phù hợp cả màn hình 75/120/144 Hz; bỏ dựng hình khi tab ẩn, giảm tần suất ở màn hình chào. Demo cũng dừng RAF khi ẩn và không nhảy thời gian khi quay lại.
- Bóng cập nhật 15 lần/giây ở chế độ cân bằng, 30 lần/giây ở Đẹp. Tắt MSAA; vẫn giữ tone mapping, vật liệu, ánh sáng và màu của cảnh.
- Gộp 64 hình mây vào một InstancedMesh, giữ nguyên hình học/vị trí. Tính sẵn độ cao mái che của hạt mưa thay vì quét toàn bộ nhà cho từng hạt ở mỗi frame. Chất lượng tự động dùng tối đa 700 hạt mưa, nhẹ 400, đẹp 1400.
- Giảm cập nhật thời tiết và bản đồ nhỏ/nút cửa; tái sử dụng vector/màu; chỉ ghi nhãn giao diện khi nội dung đổi.
- Vũ khí chỉ dựng khi trang bị lần đầu. Chỉ gắn mô hình đang cầm vào scene, giữ các mô hình khác để dùng lại. Bỏ cập nhật toàn bộ ma trận nhân vật và ghi lại DOM ở mỗi frame đứng yên.
- VFX chỉ gửi hạt còn sống cho GPU; không gửi buffer khi pool trống. Màu/kích thước hạt chỉ gửi khi phát hạt mới, mesh hoàn toàn trong suốt tạm ngừng vẽ. Hồi chiêu và 15 timeline vẫn giữ nguyên.
- Thêm chỉ số FPS trong bảng Thời gian · Thời tiết và đổi phiên bản URL các script sửa để tránh tải nhầm cache cũ.

## Kiểm chứng

`npm.cmd test` đạt: 4 nhóm logic/hình học, 7 online-unit, 10 hiệu năng/môi trường, 40 VFX/input/tích hợp. Tổng 57 bài Node bên cạnh 4 nhóm cũ. Không có bài nào bị bỏ qua. Renderer trong harness được mô phỏng; các số đo CPU bên dưới không phải FPS GPU.

- Adapter vũ khí, 600 frame đứng yên: 4.200 lần ghi DOM, 1.200 thay đổi class và 600 lượt duyệt toàn bộ ma trận giảm về 0.
- Core VFX low, 60.000 cập nhật đứng yên: khoảng 60,36 ms → 2,63 ms trong Node. Pool trống không còn cập nhật 4 buffer mỗi frame.
- Môi trường mưa: khoảng 2,402 ms → 0,027 ms mỗi lần cập nhật trong harness; cần hiểu đây là số đo cục bộ có sai số, không phải mức tăng FPS của cả game.
- 74/74 tài nguyên được kiểm tra qua localhost trả HTTP 200, đúng chữ hoa/thường và nội dung giống tệp trên đĩa. Không kiểm tra CDN Firebase bằng phép đối chiếu tài nguyên này.
- Trình duyệt localhost dùng phiên Google đã có thật: mở làng, trang bị kiếm, thi triển Kiếm Hoa/Kiếm Khí, mưa ban đêm, vào nội thất, chọn mức nhẹ, ra sân và đổi toàn cảnh. Các mẫu ổn định hiển thị khoảng 60 FPS; không có lỗi JavaScript/WebGL mới trong quá trình này.
- Ghi nhận một mẫu 11 FPS trong lúc đổi liên tiếp nội thất/ngoại cảnh, ánh sáng và chất lượng; sau khi cảnh ổn định trở lại khoảng 60 FPS. Chưa tách riêng chi phí biên dịch shader với chi phí chuyển cảnh nên không khẳng định nguyên nhân của mẫu tụt đó. Tối ưu này không bảo đảm không bao giờ khựng ở lần tải/chuyển chế độ đầu.

Chưa đo trên điện thoại vật lý, chưa kiểm thử tải nhiều người chơi thật và chưa có FPS trước/sau trong cùng cảnh trên mọi thiết bị. Không coi các số đo Node là bằng chứng cho những trường hợp này.

## Tệp của đợt tối ưu

- Thêm `SOURCE-CODE/js/performance.js`, `SOURCE-CODE/tests/performance.test.cjs`, `SOURCE-CODE/tests/environment-performance.test.cjs` và tài liệu này.
- Sửa `SOURCE-CODE/js/app.js`, `SOURCE-CODE/js/legacy-game-controls.js`, `SOURCE-CODE/js/weapons-village.js`, `SOURCE-CODE/js/vfx/weapon-vfx-core.js`, `SOURCE-CODE/js/demo/weapons-vfx-demo.js`.
- Sửa `ENVIRONMENT/climate-state.js`, `ENVIRONMENT/house-lighting.js`, `ENVIRONMENT/weather-lighting.js`.
- Sửa `SOURCE-CODE/index.html`, `SOURCE-CODE/weapons-vfx-demo.html`, `SOURCE-CODE/load-order.json`, `package.json`.
- Bổ sung kiểm tra vào `SOURCE-CODE/tests/weapons-village.test.cjs`, `SOURCE-CODE/tests/weapons-vfx.test.cjs`, `SOURCE-CODE/tests/weapons-demo-input.test.cjs`.

## Chơi thử

Mở `http://localhost:8001/SOURCE-CODE/index.html`, nhấn Ctrl+F5. Giữ Hình ảnh ở Tự động; nếu máy vẫn chậm, chọn Ưu tiên mượt trên màn hình chào hoặc Nhẹ · Tắt bóng đổ trong bảng Thời gian · Thời tiết. Chỉ số FPS nằm trong bảng này. Không cần cài thêm thư viện.
