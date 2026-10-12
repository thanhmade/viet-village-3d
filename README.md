# VIET-VILLAGE-3D — Game 3D Ngôi Làng

> Cập nhật quy trình Git 12/10/2026: xem [GIT-WORKFLOW.md](GIT-WORKFLOW.md) về hai nhánh, tài nguyên được lưu, chạy từ bản clone và cấu hình tắt tự triển khai Vercel. Các báo cáo giai đoạn bên dưới giữ mốc thời gian ban đầu.

Bối cảnh làng quê Việt Nam dựng bằng HTML, CSS, JavaScript và Three.js: bản đồ làng, cổng, nhà dân, nội thất, chu kỳ ngày đêm và thời tiết. Dự án hướng tới trò chơi Toán cho học sinh; phiên bản hiện tại chủ yếu phục vụ khám phá bối cảnh 3D. Nhân vật hoàn chỉnh và phần chơi câu hỏi/cấp độ còn cần phát triển.

Nguồn xuất từ ChatGPT Sites ngày 10/10/2026, bản v8 tại commit `d36f5be347d606e23e4f06a42630707fd14435d3`. Thư mục phát triển trên máy: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D`. Repository: [thanhmade/viet-village-3d](https://github.com/thanhmade/viet-village-3d), đã xác minh **Private** trong giai đoạn kết nối ngày 10/10/2026. Dự án bắt đầu lịch sử Git mới trên nhánh `main`; bundle cũ giữ riêng trên máy. Commit đầu tiên là `130c5c1`. Worktree thử nghiệm dùng nhánh `cap-nhat` tại `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`; phát triển và đồng bộ độc lập với bản chính `main`.

## Chạy bằng localhost

Máy đã có Python 3, Node.js và Git. Game dùng Three.js r160 được lưu trong dự án; Google Login dùng Firebase JavaScript SDK 13.0.0 qua CDN chính thức và cần Internet. Không cần npm hoặc bước build để mở game. Trình duyệt cần hỗ trợ WebGL và JavaScript modules.

1. Chạy lệnh PowerShell dưới đây từ worktree CAP-NHAT; dùng cổng 8001 để chạy cùng bản chính ở cổng 8000. Giữ cửa sổ máy chủ mở.
2. Mở [game tại localhost](http://localhost:8001/SOURCE-CODE/index.html).
3. Bấm **Đăng nhập bằng Google**, xác thực tài khoản rồi chọn **Khám phá làng 3D**.

Hoặc chạy trong PowerShell:

```powershell
Set-Location -LiteralPath 'H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT'
python -B -m http.server 8001 --bind 127.0.0.1
```

Nếu dùng bản clone ở nơi khác, chạy lệnh máy chủ từ thư mục gốc của bản clone. Có thể thay `python` bằng `py` khi máy có Python Launcher. Dừng bằng Ctrl+C. Nếu cổng 8001 đã phục vụ đúng worktree, dùng địa chỉ hiện có; nếu bị chương trình khác chiếm, chọn một cổng trống và đổi URL tương ứng. `START-SERVER.bat` gốc vẫn dùng cổng 8000.

Điểm vào gốc `index.html` chuyển tới `SOURCE-CODE/index.html`. Giữ toàn bộ cấu trúc thư mục khi giải nén hoặc clone. `START-GAME.bat` là cách mở HTML trực tiếp có sẵn từ gói xuất; ưu tiên HTTP localhost để kiểm tra và phát triển.

## Phần thử nghiệm trên cap-nhat

- Hồ sơ, phòng tối đa 8 người, backend và Security Rules: xem [hướng dẫn Firebase](firebase/README.md). `onlineConfig.enabled` vẫn là `false`; chưa bật ghi hồ sơ/phòng lên Firebase thật.
- **Vũ khí v2 gắn vào nhân vật trong làng:** sau Google Login chọn **Cầm vũ khí trong làng**, hoặc vào game rồi chọn **Vũ khí**. Chọn Côn, Kiếm, Thương, Cung hoặc Rìu; bấm ba nút chiêu tương ứng hoặc dùng phím 1/2/3 khi đang điều khiển nhân vật. Dùng WASD/mũi tên, chạm nền hoặc cần điều khiển trên thiết bị cảm ứng để đi lại.
- **Đổi vũ khí** mở lại bảng trang bị; **Cất vũ khí** kết thúc chế độ diễn họa. Hiệu ứng sử dụng scene, nhân vật, độ cao địa hình và vòng lặp hiện có. Chuyển vào nhà, đổi chế độ xem, mở hộp thoại hoặc mất phiên đăng nhập sẽ dừng hiệu ứng phù hợp.
- Nút **Diễn họa vũ khí** mở sân luyện riêng tại [localhost:8001/SOURCE-CODE/weapons-vfx-demo.html](http://localhost:8001/SOURCE-CODE/weapons-vfx-demo.html). Sân luyện có chạy lần lượt 15 chiêu, so sánh ảnh, mức chất lượng và điều khiển camera bằng chuột hoặc hai ngón. Đây là trang diễn họa cục bộ, không đọc/ghi hồ sơ Firebase.
- Mã v2 nằm tại `SOURCE-CODE/js/vfx`, ảnh gốc tại `ASSETS/reference`. Dùng chung Three.js r160 đã có, không tải thêm CDN cho phần VFX. Xem [hướng dẫn mã VFX](SOURCE-CODE/docs/weapons-vfx/README.md).
- VFX hiện chỉ diễn họa cục bộ: chưa có sát thương, HP, kiểm tra trúng địch hoặc đồng bộ trang bị/chiêu qua phòng multiplayer. Bản sao nhân vật từ xa không mang nhầm trang bị cục bộ.
- Gói ZIP và hai thư mục giải nén gốc được giữ trên máy, không dùng làm đường dẫn chạy. Các thư mục VFX v1 đã bị xóa trước đợt tích hợp v2; không tự khôi phục hoặc xóa thêm dữ liệu cũ.
- Cập nhật v2 chưa commit/push, chưa nhập vào `main`, chưa triển khai website hoặc thay đổi Firebase.

## Điều khiển và chức năng

- Ngoài làng: kéo chuột để xoay; cuộn để phóng to/thu nhỏ. Chọn **Nhà dân 3D**, **Cổng làng** và các góc nhìn để xem công trình.
- Chọn **Vào nhà** để vào một trong sáu nhà; kéo để nhìn quanh, dùng WASD/phím mũi tên hoặc nút trên màn hình để di chuyển. **Ra sân** hoặc Esc để thoát.
- Trong **Thời gian & thời tiết**, chọn giờ thực UTC+7, giờ thủ công hoặc tua 24 giờ. Có ban ngày, trưa, chiều, hoàng hôn, tối và khuya.
- Có mùa khô/mưa, trời quang, nhiều mây, mưa rào, sương; chất lượng hiển thị và độ sáng ban đêm có thể điều chỉnh.
- Nắng, trăng, sao, cửa sổ sáng, đèn hiên và đèn trong nhà thay đổi theo thời gian. Thời tiết là mô phỏng cục bộ, không dùng API dự báo.

## Cấu trúc mã nguồn

| Đường dẫn | Vai trò |
|---|---|
| `index.html` | Chuyển tới trang chạy |
| `SOURCE-CODE/index.html`, `css/`, `js/` | Giao diện, câu hỏi lưu trong mã, điều khiển và vòng lặp |
| `SOURCE-CODE/load-order.json`, `tests/` | Thứ tự tải script và bộ kiểm tra logic |
| `ASSETS/` | Three.js r160, giấy phép, hình học cơ bản, 17 ảnh giao diện |
| `MAP/` | Nền làng, cảnh quan, bản đồ, điều hướng, mô hình JSON và ảnh tham chiếu |
| `BUILDINGS/` | Nhà dân, đình, cổng, mô hình JSON và ảnh công trình |
| `CHARACTERS/` | Mã nhân vật khối, mô hình JSON và ảnh tham chiếu |
| `INTERIORS/` | Nội thất, di chuyển trong nhà, mô hình JSON và ảnh tham chiếu |
| `ENVIRONMENT/` | Đồng hồ, mùa, thời tiết, ánh sáng mặt trời/trăng và đèn nhà |
| `DOCUMENTS/` | Git giữ báo cáo giới hạn nguồn và phạm vi kiểm tra; bài giảng, kiểm kê, ngữ cảnh và báo cáo kết nối chỉ lưu trên máy |
| `BACKUP/` | Chỉ lưu trên máy: bundle lịch sử Git, bản v8, HTML cũ, upload và helper phát triển; không có trong bản clone GitHub |

Trang chạy tải **Three.js và 16 script của dự án** theo `SOURCE-CODE/load-order.json`. Đây là script thông thường dùng chung trạng thái; không đổi thứ tự hoặc tự thêm `async`. Các đường dẫn `../ASSETS`, `../MAP`, `../BUILDINGS` và các thư mục tương ứng phải còn hợp lệ. Không lấy riêng `SOURCE-CODE` làm toàn bộ thư mục website.

## Tài nguyên 3D và giới hạn hiện tại

Cảnh được dựng từ hình học Three.js, vật liệu màu và instancing. Năm tệp `*.three.json` xuất từ `Object3D.toJSON()` giữ dữ liệu mô hình; có thể đọc bằng `THREE.ObjectLoader`. Trang hiện tại dựng cảnh bằng JavaScript, chưa tải trực tiếp các JSON này.

Chưa có GLB/GLTF/FBX/OBJ/Blender, rig hoặc animation nhân vật hoàn chỉnh, âm thanh và bộ texture PBR. Ảnh tham chiếu/bộ sưu tập ảnh không tự trở thành texture hoặc mô hình 3D. Nhân vật khối hiện có đang ẩn trong chế độ xem bối cảnh. Bộ câu hỏi Toán còn trong mã nhưng luồng khởi động đang vào bối cảnh, chưa chạy thành trò chơi câu hỏi/cấp độ hoàn chỉnh.

Nội thất ban ngày còn tối; ánh đèn/bóng đổ ban đêm cần tinh chỉnh. Đã thử bối cảnh, vào/ra sáu nhà và các chế độ thời gian/thời tiết trên trình duyệt trong Codex ở giai đoạn 2; chưa đo FPS hay kiểm tra đầy đủ Chrome/Edge, điện thoại và máy học sinh. Quỹ đạo mặt trời/trăng và thời tiết là mô phỏng phục vụ hình ảnh.

Gói xuất gốc có 96 tệp đuôi `.png` giải mã được; 68 tệp thực tế chứa JPEG. Khi đối chiếu cuối giai đoạn 3 có thêm hai PNG trong `ASSETS/PORTALS`: `vao-nha.png` và `ra-san.png`, tổng cộng 98 ảnh. Hai ảnh mới giải mã được, chưa được mã chạy hiện tại tham chiếu và được giữ trong danh sách Git dự kiến. Chưa đổi tên hoặc chuyển đổi ảnh trong giai đoạn chuẩn bị. Xem [trạng thái xuất](DOCUMENTS/EXPORT-STATUS.md) và [phạm vi kiểm tra gói xuất](DOCUMENTS/VALIDATION.md); các tài liệu xuất phản ánh thời điểm đóng gói trước khi kiểm tra localhost.

## Kiểm tra sau khi phát triển

Không cần Node.js để chơi. Máy đã có Node.js để chạy bộ kiểm tra logic từ thư mục gốc:

```powershell
node SOURCE-CODE/tests/run-checks.cjs
```

Bộ kiểm tra dùng Three.js thật với renderer/DOM mô phỏng; cần thử thêm trình duyệt để xác nhận WebGL, shader, bóng, thao tác và tốc độ trên thiết bị thật. Sau mỗi thay đổi tài nguyên, kiểm tra Network/Console và đường dẫn phân biệt chữ hoa/thường của máy chủ online.

## Git, bản sao lưu và lịch sử

`.gitignore` giữ mã nguồn, ảnh, mô hình, hai tài liệu phát triển cần thiết và giấy phép; loại trừ tệp tạm, cache, môi trường cục bộ, thông tin xác thực và **toàn bộ `BACKUP`**, bao gồm bundle. PowerPoint gốc, ngữ cảnh cuộc trò chuyện, danh mục/checksum, provenance và báo cáo kiểm toán/kết nối không đưa lên GitHub. Các tệp bị bỏ qua vẫn nằm nguyên trên máy và không xuất hiện trong bản clone mới.

Bundle đã được kiểm tra: **9 commit**, nhánh `main` và `HEAD` cùng trỏ tới commit v8, checksum pack hợp lệ, không có prerequisite còn thiếu. Theo lựa chọn giai đoạn 4, dùng lịch sử Git mới; chưa clone, unbundle, checkout hoặc nhập 9 commit vào repository mới. `BACKUP/source-history.bundle` giữ nguyên trên ổ H để phục hồi khi cần. Cần sao lưu bundle và toàn bộ dữ liệu bị bỏ qua ở nơi riêng, vì GitHub không lưu các tệp đó.

`DOCUMENTS/FILE-INVENTORY.json`, `FILE-INVENTORY.csv` và `SHA256SUMS.txt` là danh mục của **gói xuất ban đầu**, không phải danh mục repository sau này. README được cập nhật ở giai đoạn 3 và có tệp chuẩn bị mới nên kiểm tra toàn bộ cây hiện tại bằng checksum gốc sẽ có khác biệt đã biết. Không ghi đè các danh mục gốc hoặc BACKUP.

## Website tự cập nhật

Phương án đề xuất: phát triển trên máy → GitHub Private → kiểm tra bản preview → triển khai nhánh `main` trên Vercel. Vercel hỗ trợ tự triển khai khi GitHub có push; quyền tài khoản và điều kiện gói phải phù hợp với chủ repository. [Tài liệu Vercel cho GitHub](https://vercel.com/docs/git/vercel-for-github).

Gói web công khai chỉ nên chứa các tệp thực sự dùng để chạy game, giữ nguyên đường dẫn. Không phục vụ toàn bộ thư mục dự án: BACKUP, bundle lịch sử, PowerPoint, tài liệu kiểm kê và tài nguyên không được game dùng cần nằm ngoài thư mục xuất bản. Báo cáo chuẩn bị/kết nối trong `DOCUMENTS` chỉ lưu trên máy; chưa tạo pipeline hoặc triển khai.

Repository Private hạn chế người xem kho mã; HTML/JavaScript và tài nguyên đã phục vụ cho trình duyệt trên website công khai vẫn tải được. Firebase Web config trong mã là cấu hình ứng dụng công khai; không chứa mật khẩu, token đăng nhập hay private key máy chủ.

## Giấy phép

Three.js giữ giấy phép MIT tại `ASSETS/vendor/LICENSE-THREE.txt`. Chưa đặt giấy phép chung cho mã game, ảnh và tài liệu người dùng. Cần xác nhận quyền sử dụng các nội dung trước khi xuất bản website cho học sinh.
