# VIET VILLAGE 3D — WEAPON VFX COMBAT LAB (v1.1)

Bản thử nghiệm **độc lập**, dành cho dự án `VIET VILLAGE 3D`. Không tự thay đổi dữ liệu Firebase, GitHub, hoặc mã nguồn game chính. Thử nghiệm theo 5 ảnh 2D người dùng gửi: **kiếm / côn / rìu / thương / cung**.

## Cập nhật 1.1 — sửa lỗi chuyển vũ khí

Đã sửa hàm `band()` gán nhầm `22` vào vật liệu Three.js, bổ sung cơ chế chuyển vũ khí an toàn và kiểm thử 25 cặp chuyển đổi. Nếu nâng cấp từ 1.0, xem `docs/BUGFIX-V1.1.md`.

## Kết quả hiện có

- 5 mô hình 3D Three.js dựng bằng `BufferGeometry`, `ExtrudeGeometry`, `CylinderGeometry`, `TubeGeometry` và `MeshStandardMaterial`. Phong cách thép xám, đồng cổ, gỗ và dây quấn. Đây là **mô hình minh họa thủ tục**, không phải GLB/FBX high-poly, chưa có texture PBR chính xác hay rig tay nhân vật.
- 3 kiểu chiêu cho mỗi vũ khí: đánh thường / kỹ năng / tuyệt kỹ = **15 đường thi triển hiệu ứng**. Kích hoạt không cần câu hỏi.
- VFX sinh bằng JavaScript: vệt kiếm bán trong suốt, vòng phép, xoáy, chùm sét, cột lửa, tia thương, mũi tên bay, particle glow, shockwave và chạm mục tiêu.
- Dựng sẵn mục tiêu huấn luyện với HP, hiện sát thương, hồi chiêu, chế độ chất lượng, FPS, nút âm thanh, góc xoay camera.
- Điều khiển bằng phím / chuột (PC) hoặc chạm / vuốt (điện thoại), responsive.
- 5 ảnh PNG tham chiếu gốc giữ nguyên, ở thư mục `references/`.
- Không có kết nối server game, vật phẩm/túi đồ, kiểm tra đánh trúng theo hitbox thực, animation theo xương, mạng đa người chơi hoặc dữ liệu Firebase. Các số sát thương trong demo **chỉ là số minh họa**.

## Khởi chạy trên Windows

1. Giải nén ZIP (có thư mục gốc `VIET-VILLAGE-3D-WEAPON-VFX`).
2. Cài **Python 3** nếu máy chưa có.
3. Nhấp đúp `START-DEMO.bat`. Trình duyệt mở `http://localhost:8765/`.
4. Máy cần truy cập Internet để tải **Three.js r160** và **OrbitControls** từ CDN (đã cố định phiên bản trong `index.html`). JS hiệu ứng và ảnh tham chiếu nằm trong ZIP, không tải từ server bên ngoài.

Nếu không muốn chạy `.bat`, trong thư mục dự án thực hiện:

```bat
py -m http.server 8765 --bind 127.0.0.1
```

Sau đó truy cập `http://localhost:8765/`. Dùng Chrome hoặc Edge có WebGL. Không mở trực tiếp `index.html` từ `file://` vì trình duyệt có thể chặn module JavaScript.

### Xem thử trên điện thoại (cùng mạng Wi-Fi với PC)

1. Trên PC chạy `START-DEMO-LAN.bat` thay cho `START-DEMO.bat`.
2. Dùng `ipconfig` trên PC để tìm **IPv4 Address** của Wi-Fi, ví dụ `192.168.1.12`.
3. Điện thoại mở `http://192.168.1.12:8765/` (thay địa chỉ bằng IP thật của PC).
4. Nếu Windows Firewall hỏi, chỉ cho phép trên mạng **Private / tin cậy**. Không mở port trên router ra Internet.

Muốn dùng trực tiếp trên điện thoại không cần PC đang bật: triển khai nội dung ZIP lên static hosting HTTPS như Firebase Hosting hoặc GitHub Pages. Demo không sử dụng API backend hay Firebase Authentication.

## Điều khiển

| Nền tảng | Thao tác | Chức năng |
|---|---|---|
| PC | `1` / `2` / `3` / `4` / `5` | Trang bị lần lượt Kiếm / Côn / Rìu / Thương / Cung |
| PC | `J` | Đánh thường |
| PC | `K` | Kỹ năng |
| PC | `L` | Tuyệt kỹ |
| PC | Kéo chuột, lăn chuột | Xoay góc nhìn, phóng to |
| Điện thoại | Chạm lựa chọn vũ khí | Đổi trang bị |
| Điện thoại | Chạm 3 nút kỹ năng | Kích hoạt kỹ năng trực tiếp |
| Điện thoại | Vuốt trên nền 3D, chụm hai ngón | Xoay và thu phóng |

Nhấp **Chất lượng hiệu ứng → Nhẹ (điện thoại)** khi FPS thấp.

## Danh mục vũ khí và 15 chiêu

| ID | Vũ khí | Skill 1 (thường) | Skill 2 | Skill 3 (tuyệt kỹ) |
|---|---|---|---|---|
| `sword` | Long Văn Kiếm | Ngân quang trảm | Song nguyệt kiếm khí | Thiên kiếm băng trận |
| `staff` | Long Vân Côn | Phá phong côn | Long quyển côn pháp | Thiên địa chấn |
| `axe` | Huyền Thiết Phủ | Liệt hỏa phách | Toái địa phủ | Hỏa thiên khai sơn |
| `spear` | Xích Anh Thương | Nhất điểm xuyên | Tam liên thương ảnh | Lôi long phá trận |
| `bow` | Kim Long Cung | Truy phong tiễn | Tam tinh liên châu | Vạn tiễn quy tông |

## Cấu trúc

```text
VIET-VILLAGE-3D-WEAPON-VFX/
├── index.html                Giao diện thử nghiệm 3D độc lập
├── START-DEMO.bat            Khởi chạy server trên Windows
├── START-DEMO-LAN.bat        Cho phép xem từ điện thoại trong Wi-Fi tin cậy
├── README.md
├── docs/
│   └── HUONG-DAN-TICH-HOP.md
├── src/
│   ├── main.js               Cảnh 3D + UI + điều khiển + mục tiêu
│   ├── models.js             Factory dựng 5 mô hình vũ khí
│   ├── effects.js            Hệ hiệu ứng và 15 đường thi triển
│   └── style.css
├── references/               5 ảnh PNG tham chiếu gốc
└── tests/
    ├── vfx-matrix.test.mjs
    └── model-switch.test.mjs   Kiểm tra 5 × 3 đường gọi kỹ năng
```

## Trạng thái kiểm tra

- `node --check` cho 3 tệp JS: **đạt**.
- `node tests/vfx-matrix.test.mjs` và `node tests/model-switch.test.mjs`: **15/15 đường tấn công phát sinh hiệu ứng và đúng một callback đánh trúng**.
- Kiểm tra ảnh, đường dẫn, cấu trúc ZIP: có thể thực hiện bằng script đóng gói.
- **Chưa kiểm thử hiển thị GPU trực tiếp được trong môi trường tạo tệp vì không có kết nối tới CDN Three.js**. Để kiểm tra chính thức hình ảnh, tải ZIP và chạy Chrome/Edge khi có mạng. Độ đẹp, FPS, hiệu ứng chính xác phụ thuộc GPU và trình duyệt.

## Dùng trong dự án chính

Xem [docs/HUONG-DAN-TICH-HOP.md](docs/HUONG-DAN-TICH-HOP.md). Cách an toàn: đặt thư mục này trong nhánh thử nghiệm `VIET-VILLAGE-3D-CAP-NHAT` mà không sửa `SOURCE-CODE/index.html` của bản chính. Chỉ khi duyệt kết quả mới liên kết mô-đun vào nhân vật, túi đồ và combat loop.

## Bản quyền thư viện

Three.js của tác giả và cộng đồng Three.js có giấy phép MIT. Phiên bản này tải từ CDN, không sao chép bản Three.js vào ZIP. Xem https://github.com/mrdoob/three.js/blob/master/LICENSE và giấy phép sẵn có ở `ASSETS/vendor/LICENSE-THREE.txt` trong dự án gốc.


## Cập nhật V1.2 — chọn vũ khí

Phiên bản V1.2 bổ sung nút TỰ KIỂM TRA 5 VŨ KHÍ và thông báo lỗi trực tiếp. Đọc `docs/BUGFIX-V1.2.md`. Dùng `INSTALL-V1.2.bat` để cập nhật vào VFX-DEMO; bản sao lưu nằm trong `BACKUP-BEFORE-V1.2`.
