# Bản vá 1.1 — Lỗi không chuyển được vũ khí

## Biểu hiện

Ở bản thử 1.0, bấm **Long Vân Côn**, **Huyền Thiết Phủ**, **Xích Anh Thương** hoặc **Kim Long Cung**, khung bên phải vẫn hiện **Long Văn Kiếm**. Có thể không thấy vũ khí, trong khi một số chiêu vẫn đổi tên.

## Nguyên nhân (đã xác định trong mã)

`src/models.js`: hàm `band()` gọi hàm `cylinder()` với số `22` tại vị trí **material**. Khi đổi vũ khí, hàm cũ `destroyModel()` gọi `m.dispose()` trên số 22 và gây lỗi JavaScript. Việc thay đổi mô hình bị dừng giữa chừng.

## Thay đổi trong bản 1.1

1. `src/models.js`: sửa `band()` để chuyển đúng `material` và đưa `22` vào đối số `segments`.
2. `src/main.js`: dựng mô hình mới trước khi tháo mô hình cũ; bảo vệ khi có lỗi khởi tạo.
3. `src/main.js`: chỉ giải phóng các geometry/material hợp lệ, một lần cho mỗi tài nguyên dùng chung.
4. `tests/model-switch.test.mjs`: kiểm thử cả 25 cặp chuyển vũ khí; kiểm tra mọi vật liệu và quy trình giải phóng.

## Cập nhật không ảnh hưởng bản game chính

**Đường dẫn:**
`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT\ASSETS\WEAPONS\VFX-DEMO`

Với gói **PATCH-ONLY**, chép đè đúng 2 tệp này:
- `src/models.js`
- `src/main.js`

Giữ nguyên ảnh tham chiếu, hiệu ứng, thư mục game chính, Firebase và GitHub.

**Sau khi chép:** đóng cửa sổ Python/terminal cũ nếu muốn; khởi chạy lại `START-DEMO.bat`, nhấn `Ctrl + Shift + R` để xóa cache HTML/JS, sau đó chọn lần lượt 5 vũ khí (hoặc nhấn 1–5) và thử J/K/L.

## Kiểm thử

```sh
node tests/model-switch.test.mjs
node tests/vfx-matrix.test.mjs
```

Bài test Node chỉ kiểm tra logic và mô hình giả lập, không thay thế cho thử nghiệm thực tế WebGL trên máy của người dùng.
