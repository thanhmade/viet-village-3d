# VIET-VILLAGE-3D — Game 3D Ngôi Làng

> Đưa bản CAP-NHAT đã duyệt vào main ngày 12/10/2026: xem [phiên bản, phạm vi ghép và cách khôi phục](SOURCE-CODE/docs/main-promotion-20261012.md). Chạy BAT trong đúng checkout và dùng URL được in; nhãn CAP-NHAT trong giao diện được giữ từ phiên bản đã kiểm tra.

> Cập nhật quy trình Git 12/10/2026: xem [GIT-WORKFLOW.md](GIT-WORKFLOW.md) về hai nhánh, tài nguyên được lưu, chạy từ bản clone và cấu hình tắt tự triển khai Vercel. Các báo cáo giai đoạn bên dưới giữ mốc thời gian ban đầu.

Bối cảnh làng quê Việt Nam dựng bằng HTML, CSS, JavaScript và Three.js: bản đồ làng, cổng, nhà dân, nội thất, chu kỳ ngày đêm và thời tiết. Dự án hướng tới trò chơi Toán cho học sinh; phiên bản hiện tại chủ yếu phục vụ khám phá bối cảnh 3D. Nhân vật hoàn chỉnh và phần chơi câu hỏi/cấp độ còn cần phát triển.

Nguồn xuất từ ChatGPT Sites ngày 10/10/2026, bản v8 tại commit `d36f5be347d606e23e4f06a42630707fd14435d3`. Thư mục phát triển trên máy: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D`. Repository: [thanhmade/viet-village-3d](https://github.com/thanhmade/viet-village-3d), đã xác minh **Private** trong giai đoạn kết nối ngày 10/10/2026. Dự án bắt đầu lịch sử Git mới trên nhánh `main`; bundle cũ giữ riêng trên máy. Commit đầu tiên là `130c5c1`. Worktree thử nghiệm dùng nhánh `cap-nhat` tại `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`; phát triển và đồng bộ độc lập với bản chính `main`.

## Chạy bằng localhost

Trên Windows cần **Python 3.10 trở lên**, Chrome/Edge có WebGL và Internet cho Google Login. Không cần Node.js, npm, Git hoặc bước build để chơi. Three.js r160 và bộ tải GLB có sẵn trong dự án; Firebase SDK 13.0.0 tải từ CDN chính thức.

1. Nhấp đúp **START-GAME.bat** ở gốc CAP-NHAT. Launcher kiểm tra entry point, thứ tự tải, tệp MAP/NPC và môi trường Python trước khi mở trình duyệt.
2. Dùng đúng URL **Game: http://localhost:<cổng>/SOURCE-CODE/index.html** được in trong cửa sổ. Cổng ưu tiên là 8001; cổng thực tế có thể khác. Giữ cửa sổ này mở nếu vừa khởi động server mới.
3. Bấm **Đăng nhập bằng Google**, rồi **Khám phá làng 3D**. Màn hình đăng nhập ghi “Bản thử nghiệm CAP-NHAT” và hostname/cổng. Tại Làng Việt, mở **Công cụ → Dân làng** để xem 8 NPC; ở MAP khác cần quay về Làng Việt.

**START-SERVER.bat** dùng cùng quy trình. Có thể chạy trong PowerShell (ví dụ chọn cổng ưu tiên 8002, không tự mở trình duyệt):

```powershell
Set-Location -LiteralPath 'H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT'
.\START-SERVER.bat --port 8002 --no-browser
```

Launcher xác định root từ chính vị trí tệp, nên chạy được khi clone ở ổ đĩa khác hoặc gọi BAT từ thư mục khác. Nếu Python launcher `py -3` không chạy được, thử `python`; thiếu cả hai thì hiện hướng dẫn, giữ thông báo lỗi khi mở bằng nhấp đúp và không tự cài phần mềm. Tham số `--no-browser` cũng bỏ qua chờ phím khi có lỗi để dùng trong terminal/kiểm thử.

- **Dùng lại server:** chỉ khi endpoint nhận diện xác nhận đúng đường dẫn checkout và đúng phiên bản launcher. Mở BAT lần nữa sẽ mở lại URL đó, không tạo server mới.
- **Cổng bận:** giữ nguyên tiến trình đang có, thử các cổng kế tiếp; nếu dải cổng bận thì nhờ Windows chọn cổng trống. Máy chủ Python cũ chạy bằng `http.server` không có nhận diện nên được để nguyên và chọn cổng khác, kể cả khi nó đang phục vụ cùng thư mục. Không mặc định rằng localhost:8001 luôn là bản mới.
- **Mã mới:** server của launcher gửi `Cache-Control: no-store` và bỏ qua cache validator cũ cho HTML/JS/JSON/GLB. Tải lại trang sau khi sửa code để chạy mã mới. Các máy chủ cũ chưa có hành vi này.
- **Không mở file HTML trực tiếp:** `index.html` ở gốc chỉ chuyển trang khi dùng HTTP/HTTPS. Nếu mở qua `file://`, nó hướng dẫn chạy START-GAME.bat. SOURCE-CODE/index.html cũng hiện thông báo rõ bằng script thường, vì module Firebase có thể bị chặn trước khi tự báo lỗi.
- **Đúng cấu trúc:** giữ ASSETS, MAP, CHARACTERS, BUILDINGS, INTERIORS, ENVIRONMENT và SOURCE-CODE cùng gốc. Không dùng riêng SOURCE-CODE làm root server; các đường dẫn `../MAP`, `../CHARACTERS` sẽ sai.
- **Phiên đăng nhập và tiến độ:** thay đổi cổng tạo origin trình duyệt khác, có thể phải đăng nhập lại và thấy tiến độ cục bộ khác. Dữ liệu ở origin cũ vẫn giữ nguyên; không có thao tác sao chép token hoặc hồ sơ giữa các cổng. Firebase phải cho phép hostname localhost. Launcher không thay đổi Firebase/Rules.
- Dừng server do mình mở bằng Ctrl+C. Launcher không tự dừng tiến trình nào đang chiếm cổng.

Đối chiếu ngày 12/10/2026: 8000 phục vụ bản main, không có hệ thống 8 NPC mới; 8001 phục vụ đúng CAP-NHAT nhưng là server Python cũ. Đây là hai phiên bản khác nhau, không phải cùng một URL game bị mất dữ liệu. Dùng URL launcher in ra cho lần mở hiện tại.

BAT đã được chạy thật và chọn cổng 8002; mở lần hai dùng lại đúng server. Người dùng đã xác nhận đăng nhập Google thật và thấy đủ 8 NPC tại URL này. Cổng có thể thay đổi ở lần chạy khác.

Kiểm thử launcher: `py -3 -B -m unittest discover -s scripts/tests -v`; kiểm tra entry/file guard: `node --test SOURCE-CODE/tests/launch-entry.test.cjs`. Xem [báo cáo khởi chạy Windows](SOURCE-CODE/docs/windows-launcher.md).

## Phần thử nghiệm trên cap-nhat

- Hồ sơ, phòng tối đa 8 người, backend và Security Rules: xem [hướng dẫn Firebase](firebase/README.md). `onlineConfig.enabled` vẫn là `false`; chưa bật ghi hồ sơ/phòng lên Firebase thật.
- **Vũ khí v2 gắn vào nhân vật trong làng:** sau Google Login chọn **Cầm vũ khí trong làng**, hoặc vào game rồi chọn **Vũ khí**. Chọn Côn, Kiếm, Thương, Cung hoặc Rìu; bấm ba nút chiêu tương ứng hoặc dùng phím 1/2/3 khi đang điều khiển nhân vật. Dùng WASD/mũi tên, chạm nền hoặc cần điều khiển trên thiết bị cảm ứng để đi lại.
- **Đổi vũ khí** mở lại bảng trang bị; **Cất vũ khí** kết thúc chế độ diễn họa. Hiệu ứng sử dụng scene, nhân vật, độ cao địa hình và vòng lặp hiện có. Chuyển vào nhà, đổi chế độ xem, mở hộp thoại hoặc mất phiên đăng nhập sẽ dừng hiệu ứng phù hợp.
- Nút **Diễn họa vũ khí** mở sân luyện riêng tại `SOURCE-CODE/weapons-vfx-demo.html` trên cùng hostname/cổng đang chơi. Sân luyện có chạy lần lượt 15 chiêu, so sánh ảnh, mức chất lượng và điều khiển camera bằng chuột hoặc hai ngón. Đây là trang diễn họa cục bộ, không đọc/ghi hồ sơ Firebase.
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

Trang CAP-NHAT tải **50 script theo `SOURCE-CODE/load-order.json`**, cùng các script giao diện và module đăng nhập. Các script toàn cục dùng chung trạng thái; không đổi thứ tự hoặc tự thêm `async`. Các đường dẫn `../ASSETS`, `../MAP`, `../BUILDINGS` và các thư mục tương ứng phải còn hợp lệ. Không lấy riêng `SOURCE-CODE` làm toàn bộ thư mục website.

## Tài nguyên 3D và giới hạn hiện tại

Cảnh được dựng từ hình học Three.js, vật liệu màu và instancing. Năm tệp `*.three.json` xuất từ `Object3D.toJSON()` giữ dữ liệu mô hình; có thể đọc bằng `THREE.ObjectLoader`. Trang hiện tại dựng cảnh bằng JavaScript, chưa tải trực tiếp các JSON này.

Bản CAP-NHAT hiện có **8 NPC Làng Việt dạng GLB với animation và texture**, cấu hình tại `MAP/regions/lang-viet/gameplay.json`, mô hình trong `CHARACTERS/NPC/LANG_VIET/`. Các NPC tải sau đăng nhập và hiển thị trong MAP Làng Việt. Ảnh tham chiếu/bộ sưu tập ảnh không tự trở thành texture hoặc mô hình 3D. Các báo cáo xuất gốc bên dưới phản ánh phiên bản trước khi tích hợp NPC.

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
