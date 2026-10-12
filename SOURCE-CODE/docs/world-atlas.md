# Tích hợp bản đồ tổng Việt Nam — 11/10/2026

Thực hiện tại `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, Git root cùng đường dẫn, nhánh `cap-nhat`. Giữ các thay đổi có trước; không commit, push, merge, triển khai hoặc thay đổi Firebase/bản chính.

> Cập nhật Đồng Tre: đã dựng và mở khu vực thứ ba. Xem [báo cáo Đồng Tre](dong-tre.md) cho thay đổi và kiểm thử mới nhất.

## Cách dùng

Mở <http://localhost:8001/SOURCE-CODE/index.html>, đăng nhập Google như trước, chọn **Khám phá làng 3D → Công cụ → Bản đồ tổng**. Chọn một làng rồi nhấn **Đến khu vực**. **Trở lại game** hoặc Escape đóng bản đồ. Khi đang trong nội thất, có thể xem bản đồ nhưng cần ra sân trước khi chuyển vùng.

Nếu cần khởi động lại HTTP server, chạy tại thư mục CAP-NHAT:

```powershell
python -m http.server 8001 --bind 127.0.0.1
```

Không cần cài thư viện mới hoặc bước build.

## Gói nguồn và cách tích hợp

- Đã đọc README, MANIFEST, `data/map-data.json`, dữ liệu nguồn và logic trang xem.
- Trang thật: `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/04_Xem_Ban_Do.html`.
- Trang tự chứa SVG và JSON: 34 vùng hành chính, 14 địa danh, hai khu làng chưa có tọa độ địa lý và khu Đồng Tre thuộc Làng Việt. Các liên kết tư liệu bên ngoài giữ nguyên; không cần tải chúng để xem bản đồ.
- Giữ nguyên toàn bộ 26 tệp trong `source-package`, gồm 25 mục của MANIFEST và chính MANIFEST. Không di chuyển, đổi tên hoặc tái tạo ảnh/dữ liệu.
- Catalog `MAP/atlas-destinations.js` khai báo loại `region-selector`; đây là giao diện chọn vùng, không được đăng ký như một cảnh Three.js mới.
- Game tải trang nguồn trong iframe cùng origin tại URL hiện tại. `atlas-viewer-bridge.js` kết nối hàm chọn điểm, bổ sung lựa chọn khu làng và chỉ sửa DOM trong bộ nhớ; không sửa nội dung gói nguồn trên ổ đĩa.
- Hai làng nằm trong mục riêng, không gán tọa độ tùy ý lên một tỉnh hoặc di tích. Chọn làng đưa khung nhìn về toàn quốc và xóa lựa chọn địa danh cũ.
- Dialog có nút đóng, Escape, focus modal và chặn sự kiện đầu vào lọt xuống cảnh. Khi mở, xóa thao tác di chuyển/chiêu đang diễn ra, tạm ngừng render 3D bên dưới; cập nhật online vẫn được gọi. Đóng lại tiếp tục game, giữ vùng đang xem và mức zoom bản đồ.

## Bảng liên kết ID

Chỉ ID MAP được manager đăng ký và có điểm xuất hiện hợp lệ mới được bật nút di chuyển. `null` không phải ID MAP để game tải.

| ID trong gói | Khu vực | mapId chơi được | spawnId | Trạng thái/thành phần thiếu |
|---|---|---|---|---|
| `lang_viet` | Làng Việt | `lang-viet` | `village-entry` | Đã nối; điểm an toàn ngoài vòng dịch chuyển |
| `lang_tan_thu` | Làng Tân Thủ | `lang-tan-thu` | `village-entry` | Đã nối; điểm an toàn ngoài vòng dịch chuyển |
| `dong_tre` | Ngoại ô Làng Việt – Đồng Tre | `ngoai-lang-dong-tre` | `village-entry` | Sẵn sàng; có scene 3D, sàn/va chạm, spawn và cổng E hai chiều |
| `thang_long` | Thăng Long | null | null | Chưa mở; thiếu scene 3D/spawn |
| `hoa_lu` | Hoa Lư | null | null | Chưa mở; thiếu scene 3D/spawn |
| `thanh_nha_ho` | Thành Nhà Hồ | null | null | Chưa mở; thiếu scene 3D/spawn |
| `hue` | Huế | null | null | Chưa mở; ảnh tại `dai-noi-hue`, thiếu scene 3D/spawn |
| `hoi_an` | Hội An | null | null | Chưa mở; thiếu scene 3D/spawn |
| `my_son` | Mỹ Sơn | null | null | Chưa mở; thiếu scene 3D/spawn |
| `co_loa` | Cổ Loa | null | null | Chưa mở; thiếu scene 3D/spawn |
| `van_don` | Vân Đồn | null | null | Chưa mở; thiếu scene 3D/spawn |
| `bach_dang` | Bạch Đằng | null | null | Chưa mở; thiếu scene 3D/spawn |
| `lam_kinh` | Lam Kinh | null | null | Chưa mở; thiếu scene 3D/spawn |
| `hoang_de` | Thành Hoàng Đế | null | null | Đề xuất; chưa có scene 3D/spawn |
| `gia_dinh` | Gia Định | null | null | Đề xuất; chưa có scene 3D/spawn |
| `ha_tien` | Hà Tiên | null | null | Đề xuất; chưa có scene 3D/spawn |
| `chau_doc` | Châu Đốc – Vĩnh Tế | null | null | Đề xuất; chưa có scene 3D/spawn |

34 vùng hành chính dùng để tra cứu, chưa có liên kết trực tiếp tới cảnh 3D. Ảnh tham chiếu không đủ điều kiện bật nút **Đến khu vực**.

## Cơ chế chuyển và bảo toàn trạng thái

Manager hiện có bổ sung `destinations`, `canTravelTo(mapId, spawnId)` và `travelTo(mapId, spawnId)`. Việc chuyển dùng lại `prepare`/`commit`, cùng scene, camera, renderer, nhân vật và hệ thống môi trường. Bảng `spawns` ở ba descriptor đặt tên cho các điểm xuất hiện đã kiểm tra của mỗi MAP. Đồng Tre có thêm `from-lang-viet`; Làng Việt có `from-dong-tre`. Trạng thái Sẵn sàng vẫn được tính từ đăng ký manager và spawn thực tế, không gán cứng trong viewer.

Trước khi chuyển, kiểm đăng nhập, trạng thái đã vào game, MAP được đăng ký, spawn và sàn đi được. Đích được dựng và kiểm tra trước khi đổi cảnh. Khi lỗi, thông báo rõ và phục hồi MAP hiện tại/vị trí/camera/chế độ nhìn. Không tải lại trang, đăng nhập lại hoặc tạo lại nhân vật. Giữ đối tượng túi đồ, tiến độ/điểm hiện có, trang bị và thời gian hồi chiêu; hoạt ảnh chiêu đang diễn ra được dừng khi mở bản đồ.

## Tệp tạo và chỉnh sửa

Tạo mới:

- `MAP/atlas-destinations.js`: bảng liên kết 17 ID và URL bản đồ tổng.
- `SOURCE-CODE/js/world-atlas.js`: dialog, tải lại khi lỗi, chọn/đến khu vực, khóa đầu vào.
- `SOURCE-CODE/js/atlas-viewer-bridge.js`: kết nối viewer gốc, lựa chọn khu làng, Escape và bảo vệ viewport khi đóng/mở.
- `SOURCE-CODE/css/world-atlas.css`: bố cục desktop/mobile.
- `SOURCE-CODE/tests/world-atlas.test.cjs`: 12 kiểm thử tích hợp/đường dẫn/checksum.
- `SOURCE-CODE/docs/world-atlas.md`: báo cáo này.

Chỉnh sửa:

- `SOURCE-CODE/index.html`: nút Bản đồ tổng, dialog, CSS và script; giữ ID/sự kiện của các nút cũ.
- `SOURCE-CODE/load-order.json`: tải catalog/bridge/controller trước app.
- `SOURCE-CODE/js/app.js`: khởi tạo atlas, đóng khi mất xác thực, dừng render dưới dialog và tiếp tục tick online.
- `SOURCE-CODE/js/legacy-game-controls.js`: thêm trạng thái atlas vào kiểm tra khóa điều khiển.
- `SOURCE-CODE/js/region-travel.js`: API chọn MAP/spawn trực tiếp, kiểm tra và hoàn tác khi lỗi.
- `MAP/regions/lang-viet/scene.js`, `MAP/regions/lang-tan-thu/scene.js`: tên điểm `village-entry`.
- `SOURCE-CODE/tests/region-travel.test.cjs`: kiểm thử chọn trực tiếp, bảo toàn trạng thái và lỗi.
- `package.json`: thêm `test:atlas` vào nhóm kiểm tra hiện có.

Ảnh, dữ liệu gói bản đồ, mô hình, nội thất và mã đăng nhập không được chỉnh sửa. Tệp log/snapshot trước sửa/ảnh kiểm thử chỉ lưu tại `.cache/atlas-integration/`.

## Kết quả kiểm tra đợt tích hợp atlas ban đầu

Các số liệu dưới đây thuộc đợt atlas trước khi dựng Đồng Tre. Kết quả hiện tại nằm trong [dong-tre.md](dong-tre.md).

- `npm test`: các nhóm kiểm tra hiện có đều đạt; gồm 4 chương trình kiểm tra hình học/môi trường và 114 Node tests ngoài atlas. Nhóm atlas cuối cùng `npm run test:atlas` đạt **12/12**. Tổng **126/126 Node tests** đạt.
- Kiểm tra cú pháp và `git diff --check` trên các tệp tracked chỉnh trong lượt này đạt. Không sửa các thay đổi không liên quan đã có trước.
- 26/26 tệp gói nguồn khớp SHA-256 trước sửa; cả 25 mục MANIFEST đúng kích thước/hash.
- Tài nguyên HTML/CSS/script được kiểm tên và chữ hoa/thường. 7 URL tích hợp quan trọng qua HTTP localhost trả 200, nội dung đúng checksum tệp tại CAP-NHAT.
- Trình duyệt localhost dùng phiên Google thật đang có: mở game, mở atlas, chọn Làng Tân Thủ, quay về Làng Việt; đã quan sát vũ khí Kiếm và ba nút chiêu giữ nguyên.
- Chọn Bạch Đằng bằng bàn phím trên marker: hiện Chưa mở, nút vô hiệu hóa. Đồng Tre bị khóa trong đợt đó; hiện đã mở sau khi dựng scene và đăng ký spawn. Các trường hợp còn lại có test danh mục/allowlist.
- Nút +/−, kéo bản đồ, giữ zoom khi đóng/mở, ba chu kỳ đóng/mở liên tục, Escape từ iframe đều đạt. Sau chọn di tích rồi chọn làng, khung nhìn quay về toàn quốc và không gắn làng vào di tích.
- Viewport điện thoại 390×844: bố cục cuộn, chọn làng, nút di chuyển, chuyển vùng và Escape đạt; đã trả viewport về kích thước ban đầu.
- Console phiên kiểm thử không có lỗi JavaScript/WebGL. Có cảnh báo cũ về bản Three.js classic/deprecated, không phát sinh từ atlas.
- Kiểm thử lỗi tải timeout, URL sai, lỗi truy cập iframe, lỗi kết nối bridge và lỗi chuẩn bị/chuyển MAP dùng mock có chủ đích trong automated tests; xác nhận nút thử lại và giữ cảnh gốc. Không giả lập thành công đăng nhập hoặc Firebase.

## Giới hạn và việc tiếp theo

- Chưa thử cảm ứng đa điểm trên điện thoại vật lý; có kiểm bố cục kích thước điện thoại, kéo con trỏ và nút thu/phóng.
- Chưa gây lỗi mạng thật trên tab người dùng và chưa kiểm hai tài khoản/phòng online trong lượt này; xử lý lỗi/giữ trạng thái đã kiểm tự động. Không thay đổi rules hoặc dữ liệu Firebase.
- Hiện còn 14 khu vực khóa cần cảnh 3D, sàn/va chạm, điểm xuất hiện/cổng và đăng ký manager trước khi đi được. Sau đó cập nhật riêng bảng liên kết bằng mapId/spawnId thực tế; không chỉ đổi trạng thái ảnh tham chiếu.
- Không đánh giá lại độ chính xác địa lý/hành chính của gói nguồn. Nguồn và chú thích gốc được giữ nguyên.
