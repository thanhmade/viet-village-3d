# Làng Việt và Làng Tân Thủ — báo cáo tích hợp 3D

Ngày kiểm tra: 11/10/2026.

## Phạm vi

- Thư mục thực hiện: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`.
- Git root khớp thư mục trên, nhánh `cap-nhat`, HEAD `1381d5cc7c267b462cf0ce07832046b3f49f525a`.
- Bản chính vẫn ở nhánh `main`, commit `3fcaa05`. Không sửa bản chính, commit, push, deploy hoặc thay đổi Firebase thật.
- Giữ nguyên thay đổi chưa commit có trước, gồm trạng thái xóa 40 tệp VFX v1 đã tồn tại trước nhiệm vụ.
- Sao chép các tệp tích hợp trước khi sửa vào `.cache/regions-before-20261011-195846/`; không ghi đè BACKUP.

## Hai MAP chơi được

| MAP | Đối chiếu ảnh | Cảnh và chức năng |
| --- | --- | --- |
| `lang-viet` | 5 ảnh JPEG trong `MAP/regions/lang-viet/references/` | Cảnh Three.js hiện có đã khớp các mốc chính: sáu nhà, đình, cây đa, cổng, vườn rau, ao sen, cầu và lũy tre. Đăng ký cảnh này vào hệ thống vùng, giữ toàn bộ hình học, sáu nội thất và các vòng VÀO NHÀ / RA SÂN. |
| `lang-tan-thu` | 4 ảnh PNG trước/trái/phải/sau trong `MAP/regions/lang-tan-thu/references/` | Cảnh Three.js riêng: nhà cộng đồng, ba nhà tranh, một nhà ngói, hai ruộng lúa, cây đa, giếng, sân tập, dòng suối, cầu có dốc, bến, thuyền, cổng và hàng rào. |

Cảnh dùng geometry 3D; ảnh chỉ phục vụ đối chiếu trong nút **Ảnh mẫu**, không làm mặt phẳng thay cho MAP. Các vùng còn lại trong `MAP/regions/` vẫn là tài nguyên tham chiếu, chưa được đăng ký chơi.

## Dịch chuyển và trạng thái

- Mỗi vùng có vòng xanh tại `(x=0, y=0.335, z=20)`, nằm trên nền phẳng trước cổng, ngoài mái che. Bán kính Làng Việt 0.8, Tân Thủ 1.05.
- Đứng liên tục 0.8 giây sau khi đi vào vòng để chuyển. Viền vòng và trạng thái trên bảng tên hiển thị tiến trình; ra ngoài trước thời hạn sẽ hủy.
- Điểm đến của cả hai vùng là `(0, 0.3, 16.5)`, ngoài vòng, trên nền hợp lệ. Cần rời vùng kích hoạt sau khi hủy hoặc tạm dừng mới được kích hoạt tiếp.
- Nút **Đi tới cổng…** tìm đường cho nhân vật; không bỏ qua thời gian đứng trong vòng. Menu dọc tự đóng vẫn giữ lệnh đi bộ.
- Đích được dựng một lần, xác thực nền/va chạm/vòng trước khi đổi cảnh; lần sau dùng lại. Nếu dựng hoặc chuyển thất bại, giữ cảnh và nhân vật ở vùng nguồn, phục hồi cả vị trí/hướng camera, báo lỗi và cho phép thử lại.
- Giữ cùng `player`, `body`, `scene`, `camera`, avatar, trang bị, túi đồ, điểm và tiến độ. Hướng nhân vật không bị đặt lại bởi thao tác chuyển. Di chuyển đến cổng vẫn xoay nhân vật theo hướng đi bình thường.
- Chỉ đổi tọa độ sang điểm đến và cập nhật camera, bộ va chạm, độ cao cầu/sàn, mái che mưa và đèn của vùng. Không đặt lại giờ, mùa hoặc thời tiết.
- Dừng đường đi, phím đang giữ và hiệu ứng chiêu còn bay khi chuyển, tránh lệnh cũ tiếp tục tác động ở MAP mới; vũ khí và thời gian hồi chiêu vẫn được giữ.
- Ẩn đèn và hình học của vùng không hoạt động; không tạo thêm renderer hoặc vòng lặp animation.

## Tệp tạo mới

1. `MAP/regions/lang-viet/scene.js` — mô tả vùng, ảnh, địa điểm và điểm dịch chuyển Làng Việt.
2. `MAP/regions/lang-tan-thu/scene.js` — cảnh 3D, instancing, va chạm, sàn, mái, cầu và đèn Tân Thủ.
3. `SOURCE-CODE/js/region-travel.js` — vòng 3D, bộ quản lý hai vùng, thời gian giữ, tìm đường, chuẩn bị đích, phục hồi khi lỗi.
4. `SOURCE-CODE/css/regions.css` — trạng thái vùng/cổng trong HUD.
5. `SOURCE-CODE/tests/lang-tan-thu-scene.test.cjs` — 8 kiểm thử cảnh và hình học.
6. `SOURCE-CODE/tests/region-travel.test.cjs` — 10 kiểm thử tích hợp, bảo toàn trạng thái, lỗi chuyển và ánh sáng.
7. `DOCUMENTS/MAP-3D-REGIONS-REPORT.md` — báo cáo này.

## Tệp hiện có được chỉnh trong nhiệm vụ này

| Tệp | Nội dung thay đổi |
| --- | --- |
| `MAP/navigation.js` | Chọn va chạm, độ cao sàn/cầu và minimap theo vùng. |
| `SOURCE-CODE/js/app.js` | Khởi tạo và tick bộ vùng; giữ luồng nhân vật, kiểm tra đăng nhập; gửi đúng mapId. |
| `SOURCE-CODE/js/house-travel.js` | Chỉ kích hoạt vòng nhà Làng Việt tại đúng vùng. |
| `INTERIORS/house-interior.js` | Giữ nội thất cũ; chặn vào nhầm nhà Làng Việt từ Tân Thủ; cập nhật trạng thái công cụ khi vào/ra. |
| `ENVIRONMENT/house-lighting.js` | Đèn Làng Việt tiếp tục hoạt động sau khi gom vào root của vùng; không chiếu sang vùng khác. |
| `ENVIRONMENT/weather-lighting.js` | Lấy mái che mưa và điều chỉnh đèn/vật liệu theo vùng. |
| `SOURCE-CODE/js/legacy-game-controls.js` | Thư viện ảnh hiển thị thêm ảnh của MAP đang mở. |
| `SOURCE-CODE/index.html` | Nút đi tới cổng, tên vùng, tiến trình, thư viện ảnh và nạp các module mới. Các ID nút cũ được giữ. |
| `SOURCE-CODE/load-order.json` | Thêm ba script vùng trước app. |
| `SOURCE-CODE/tests/portal-access.test.cjs` | Kiểm tra sáu nền vào nhà trong root Làng Việt; vẫn kiểm tra không trùng lặp. |
| `SOURCE-CODE/js/remote-players.js` | Đặt đúng vị trí/hướng khi avatar từ xa đổi MAP hoặc hiện trở lại, không nội suy xuyên vùng. |
| `SOURCE-CODE/tests/online-unit.test.mjs` | Thêm kiểm tra đổi vùng của avatar từ xa. |
| `firebase/database.rules.json` | Chuẩn bị cho phép riêng mapId `lang-tan-thu`, giữ `village` và `house-1`…`house-6`; giữ nguyên quyền UID/thành viên/session. |
| `SOURCE-CODE/tests/firebase-emulator.test.mjs` | Kiểm chứng mapId mới hợp lệ, ID tùy tiện và truy cập không có quyền bị từ chối. |
| `package.json` | Thêm `test:regions` vào bộ kiểm tra. Không thêm thư viện. |

## Kết quả kiểm tra

- Bốn nhóm kiểm tra logic/hình học cũ: đạt (nội thất, khí hậu, đèn nhà, ánh trăng).
- 92 kiểm thử có trước/nhóm liên quan: đạt — online 8, hiệu năng 10, VFX 40, nhà/cổng/toolbar 34.
- 18 kiểm thử vùng: đạt — cảnh Tân Thủ 8, tích hợp chuyển vùng 10. Bộ `npm test` cuối gồm tổng cộng 110 kiểm thử đạt, ngoài bốn nhóm kiểm tra logic/hình học.
- Mười chuyến khứ hồi / 20 lần chuyển giữ nguyên các đối tượng nhân vật, trang bị, túi đồ, tiến độ, camera và môi trường; số object/geometry/material không tăng sau khi hai cảnh đã dựng.
- Kiểm tra đi ngang vòng, rời sớm, khung hình gián đoạn, overlay, hết phiên đăng nhập, lỗi dựng đích, lỗi sau khi đổi camera và thử lại: đạt.
- Sáu nội thất sau khi trở về Làng Việt; cổng nhà không chạy ở Tân Thủ; điều khiển joystick vẫn qua kiểm tra va chạm: đạt.
- Raycast đối chiếu sàn 3D của cầu, bến, bậc thềm/hiên với độ cao đi bộ; dòng nước, hàng rào, nhà đóng và đồ vật chặn di chuyển: đạt.
- Firebase emulator: **10/10 đạt**. Không dùng Firebase production; emulator đã tắt. Các dòng `permission_denied` của ca từ chối là kết quả dự kiến.
- Đường dẫn: 64 tài nguyên HTML tồn tại, 38 script lõi đúng thứ tự, 9 ảnh hai vùng đọc được (1536×1024). Kiểm tra cú pháp 49 tệp JS/CJS/MJS mới hoặc đang thay đổi đạt.
- SHA-256: 115 tệp bản chính, 11 ZIP nhập, 45 ảnh đã giải nén và 86 tài nguyên có trước giữ nguyên.
- `git diff --check` trên các tệp đã sửa trong nhiệm vụ này đạt. Kiểm tra toàn bộ thư mục còn cảnh báo xuống dòng/khoảng trắng ở README có từ trước; không sửa README trong nhiệm vụ này.

### Trình duyệt thật

- Chạy bản CAP-NHAT bằng HTTP tại `http://localhost:8001/SOURCE-CODE/index.html`, qua phiên Google thật do người dùng xác nhận.
- Đã xem hai cảnh 3D, đi qua cổng hai chiều; trở về Làng Việt vẫn giữ vũ khí và thời tiết đã chọn.
- Đã trở lại Làng Việt trong mưa, tự đi vào nội thất nhà 05 qua vòng cũ và đi qua vòng RA SÂN để trở lại đúng nhà; kiếm vẫn được giữ.
- Kích thước 390×844: menu dọc tự đóng sau chọn cổng, tiến trình tăng và tới Tân Thủ thành công; kiếm được giữ, chiêu Nhất Kiếm vẫn chạy và hiển thị hồi chiêu. Đây là kiểm tra viewport máy tính, không phải thử trên điện thoại vật lý.
- Bốn ảnh Tân Thủ trong gallery tải thành công qua localhost, `naturalWidth=1536` và `naturalHeight=1024`.
- Không thấy lỗi JavaScript/WebGL trong console của lượt kiểm tra. Cảnh báo deprecation của bản Three.js đóng gói sẵn vẫn có.
- Cảnh Tân Thủ riêng có 30 draw calls, 75.028 tam giác và hai đèn không đổ bóng. Đây là số hình học của cảnh, chưa cộng nhân vật, khí hậu và VFX. UI có mẫu đo 60 FPS trên máy kiểm thử; không coi đây là bảo đảm hiệu năng trên mọi thiết bị.
- Bằng chứng hình: `.cache/lang-tan-thu-overview.jpg`, `.cache/regions-mobile-verified.jpg`. Log thành công cuối: `.cache/regions-tests-verified.log`, `.cache/regions-final-focused.log`, `.cache/regions-asset-check.json`.

## Chạy thử

Mở `http://localhost:8001/SOURCE-CODE/index.html`, tải lại trang, đăng nhập Google và chọn **Khám phá làng 3D** hoặc **Cầm vũ khí trong làng**.

Mở **Công cụ → Đi tới cổng Làng Tân Thủ**, chờ nhân vật đi đến vòng và đứng đủ 0.8 giây. Tại Tân Thủ, cùng nút đổi thành **Đi tới cổng Làng Việt**. Có thể tự đi bộ/chạm đường đến vòng. Nếu đã hủy giữa chừng, bước ra khỏi vòng rồi vào lại, hoặc chọn lại nút đi tới cổng.

Khi cần khởi động lại máy chủ, chạy từ thư mục CAP-NHAT:

```powershell
python -m http.server 8001 --bind 127.0.0.1
```

Kiểm tra tự động, cũng từ CAP-NHAT:

```powershell
npm.cmd test
npm.cmd run test:regions
npm.cmd run test:firebase
```

## Phần chưa mở rộng

- Nhà Tân Thủ hiện là ngoại thất 3D có va chạm, chưa có nội thất riêng. Hai nút nhà cũ bị vô hiệu tại Tân Thủ để tránh mở nhầm nội thất Làng Việt; sáu nhà Làng Việt vẫn vào/ra bình thường.
- Các hình được tái dựng thành cảnh low-poly theo bố cục/mốc kiến trúc, không phải bản sao ảnh chân thực từng chi tiết.
- Chưa kiểm thử trên điện thoại vật lý hoặc hai tài khoản Google đồng thời ở hai vùng. Hệ thống online thật vẫn giữ `onlineConfig.enabled=false`; thay đổi rules chỉ nằm trong dự án và đã kiểm thử bằng emulator.
- MAP hiện tại không được lưu qua lần tải lại trang; mỗi lượt khởi động bắt đầu ở Làng Việt. Trạng thái khi chuyển MAP trong cùng phiên được giữ, không thay đổi cơ chế lưu tiến độ cũ.
