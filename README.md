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

### Chọn/tạo nhân vật, bảng Nhân vật và cụm chiêu (Claude, 16/10/2026)

- **Chọn nhân vật:** danh sách bên trái lấy từ hồ sơ thật (chân dung chụp từ mô hình, tên, LV); mỗi tài khoản hiện lưu **1 nhân vật** nên ô **+ Tạo nhân vật mới** chỉ hiện khi còn trống. Tạo xong nhân vật được thêm vào danh sách và chọn sẵn; bấm **Vào làng** để chơi.
- **Bảng Nhân vật:** bấm chân dung trên HUD hoặc phím **C** (Esc/C để đóng). Thẻ Thuộc tính · Trang bị · Kỹ năng · Hành trình đọc trực tiếp LV/EXP, HP, tốc độ di chuyển, vũ khí và hồi chiêu đang chạy; chưa có chỉ số công/thủ hay tài nguyên kỹ năng nên không hiển thị.
- **Cụm chiêu (khi cầm vũ khí):** ô 1 là đòn chính (nút lớn, phím **J** hoặc **1**), ô 2–3 xếp vòng cung (phím **2**, **3**). Điện thoại: chạm để dùng, **giữ và kéo** để ngắm các chiêu ngắm hướng/vùng, thả vào **✕ Hủy** để hủy (không tốn hồi chiêu). Máy tính: phím chiêu ngắm bật vòng ngắm theo chuột, nhấp trái để dùng, Esc/chuột phải để hủy; kéo chuột phải xoay camera. Hồi chiêu hiện bằng lớp phủ và số giây; joystick và chiêu dùng được cùng lúc.

### Dấu nhiệm vụ NPC, chọn nhân vật, HUD và màn hình ngang (Claude, 15/10/2026)

- **Dấu trên đầu NPC** theo tiến độ riêng của từng nhân vật: `!` vàng có thể nhận, `?` xám đang làm, `?` vàng đủ điều kiện trả đúng NPC nhận, khóa nhỏ màu dịu cho nhiệm vụ đã được phép biết nhưng chưa mở. Khung kim cương = chính tuyến, tròn = phụ tuyến, vuông bo = học tập. Dấu, hội thoại, nhật ký **Dân làng**, bảng theo dõi và minimap dùng chung một kết quả (`SOURCE-CODE/js/quest-status.js`), chỉ tính lại khi có sự kiện. Điều kiện LV, nhiệm vụ trước (đủ tất cả / một trong các) được kiểm tra lại khi nhận; trả nhiệm vụ vẫn kiểm tra đúng NPC và lưu một lần (EXP theo biên nhận).
- **Màn nhân vật:** nhân vật mới tạo bằng mô hình Nam/Nữ thật trên nền cổng làng; nhân vật đã có hiện màn **Chọn nhân vật** và chỉ vào game khi bấm **Vào làng** (không tạo lại, không ghi hồ sơ khi xem). Chân dung trên HUD chụp từ chính mô hình.
- **HUD:** chân dung/tên/LV/HP góc trên trái, bảng theo dõi nhiệm vụ thu gọn được (Đi tới · Chi tiết · Đổi), minimap và menu **Công cụ** góc trên phải, joystick góc dưới trái và nút hành động góc dưới phải trên màn hình cảm ứng.
- **Điện thoại:** khi bấm Tạo/Vào làng, game thử toàn màn hình và khóa ngang; trình duyệt từ chối thì vẫn vào game. Cầm dọc trong lúc chơi sẽ hiện lớp **“Vui lòng xoay ngang điện thoại để tiếp tục”**, nhả joystick/phím và chặn thao tác phía sau; không chặn đăng nhập Google hay ô nhập tên. Không xoay giao diện bằng CSS và không tải lại trang.
- Báo cáo, ảnh và giới hạn (chưa thử điện thoại thật): `DOCUMENTS/CLAUDE-REVIEW.md` mục 14 (chỉ lưu trên máy).

### Kiểm tra và tối ưu ánh sáng theo giờ (Claude, 14/10/2026)

Đo trên Chrome: lần đầu chuyển ngày ↔ đêm (bình minh, hoàng hôn hoặc nút giờ trong **Thời gian & thời tiết**) game đứng hình tới ~2 giây vì phải biên dịch lại shader, và chế độ chất lượng **Tự động** hiểu nhầm cú khựng đó (cùng lúc nạp GLB) là máy yếu nên tắt bóng đổ. Nay bộ chất lượng bỏ qua khung khựng đơn lẻ và chờ mô hình làng/NPC/nhân vật nạp xong; đèn trăng, ánh sao và đèn nhà bật/tắt theo giờ đích; các cấu hình đèn còn lại được biên dịch nền sau khi tải. Khi bấm nút đổi giờ, cửa sổ phát sáng và đèn trăng đổi ngay thay vì mờ dần; độ sáng chung vẫn chuyển dần. Báo cáo, số đo trước/sau và cách khôi phục: `DOCUMENTS/CLAUDE-REVIEW.md` (chỉ lưu trên máy).

### Tài nguyên 3D Làng Việt (local, 13/10/2026)

Đã xử lý 50 bộ tham chiếu, dựng và tích hợp **48 GLB không rig** vào cảnh Làng Việt và nội thất. Hai bộ `LV_CUM_DA_01`, `LV_THUNG_GO_01` chưa dựng vì không có ảnh đọc được; 23 bộ khác thiếu một hoặc nhiều góc và đã ghi phần suy luận. Mô hình dùng hình học 3D và vật liệu màu PBR, chưa có texture vẽ riêng. Cây chuyển động bằng mã runtime; cửa/nắp có pivot để xem thử.

- Game nguồn: **http://localhost:8002/SOURCE-CODE/index.html**.
- [Trang xem 50 tài nguyên](SOURCE-CODE/lang-viet-assets.html): **http://localhost:8002/SOURCE-CODE/lang-viet-assets.html**; chọn mô hình, bốn góc, ảnh đối chiếu, gió, cửa/nắp và kiểm tra tải toàn bộ.
- Bản đóng gói local: **http://localhost:8002/public-game/**. Đã build lại từ nguồn trong tác vụ này; bản Firebase Alpha online không thay đổi.
- [Báo cáo tổng và danh mục](DOCUMENTS/LANG-VIET-3D-ASSETS-REPORT.md), [bố trí và va chạm](DOCUMENTS/LANG-VIET-ASSET-INTEGRATION.md), [manifest tiếp tục công việc](DOCUMENTS/LANG-VIET-ASSET-MANIFEST.json).
- `npm run build:map-assets`: dựng lại GLB từ mã có sẵn; `npm run test:map-assets`: kiểm thử mô hình và tích hợp; `npm run build:hosting`: đóng gói; `npm run test:hosting`: kiểm tra đầu ra. Node 22 có sẵn tại `.local-tools/node-22/node-v22.23.3-win-x64/`.

Nguồn ảnh bên ngoài chỉ dùng khi nhập tham chiếu; game và bản đóng gói không đọc ổ H: hoặc thư mục nguồn ảnh. Các báo cáo trong DOCUMENTS lưu trên máy theo cấu hình Git hiện có; chưa commit/push/deploy.

### EXP–LV Alpha (local, 13/10/2026)

Đã tích hợp EXP với Journey, HUD và hồ sơ nhân vật: bảng LV1–100, giới hạn Alpha20; thưởng một lần cho Chào làng (60), Làm quen chiến đấu (100) và bài học Thầy đồ (40). Giữ tiến độ cũ, chống thưởng trùng giữa tab. Tiến độ hiện lưu theo tài khoản trên trình duyệt; backend và Rules đã kiểm thử emulator, chưa hoạt động online. Xem [cấu hình, dữ liệu, kiểm thử và phần còn thiếu](SOURCE-CODE/docs/experience-levels.md). Chạy nguồn tại **http://localhost:8002/SOURCE-CODE/index.html**; ở bước EXP chưa cập nhật public-game hoặc Alpha; lần đóng gói tài nguyên 3D bên trên đã đồng bộ public-game local.

### Khởi tạo nhân vật Nam/Nữ (local, 12/10/2026)

Sau Google Login, tài khoản chưa tạo nhân vật sẽ mở **KHỞI TẠO NHÂN VẬT**. Chọn Nam hoặc Nữ, nhập biệt danh, rồi **Tạo nhân vật & vào làng**. Tài khoản đã tạo tự tải lại mẫu đã lưu. **Công cụ → Nhân vật** mở hồ sơ để xem, không tạo lại hay đặt lại tiến độ.

Hồ sơ ngoại hình lưu cục bộ theo Firebase UID trên cùng trình duyệt/origin; chưa đồng bộ lên Firebase hoặc thiết bị khác. Cả Nam và Nữ dùng GLB thật, 65 khớp và 33 animation riêng của từng tệp, chọn theo tên clip. Hai mẫu chưa có morph targets hay vật liệu tách riêng để tùy chỉnh tóc/mặt/trang phục; giao diện ghi rõ phần chưa hỗ trợ. Game vẫn dùng bản đồ, NPC, camera, va chạm và nhiệm vụ hiện tại.

Chạy nguồn tại URL launcher in ra (đã kiểm tra **http://localhost:8002/SOURCE-CODE/index.html**). Thêm `?characterTest=1` trên localhost để mở bảng 33 hoạt ảnh qua **Công cụ → Nhân vật → Kiểm tra hoạt ảnh**. Ở bước nhân vật, `public-game` và Firebase Alpha còn giữ phiên bản cũ; lần đóng gói tài nguyên 3D bên trên đã đồng bộ public-game local, Alpha không thay đổi.

Kiểm tra: `npm run test:characters`. Xem [báo cáo tệp, dữ liệu lưu và kết quả kiểm tra](SOURCE-CODE/docs/character-creation.md). Người dùng đã xác nhận vào làng, tải lại vẫn giữ đúng tên và mẫu Nữ.

Hoàn thiện FEMALE: Space hoặc nút **Nhảy** phát động tác nhảy tại chỗ (chưa có vật lý vượt vật cản), phản ứng chào/đồng ý/hoàn thành với NPC, căn cán từng vũ khí vào bàn tay. Cùng tài khoản được xác thực lại giữ vị trí đang chơi; F5 vẫn dùng điểm vào an toàn vì chưa có lưu vị trí. Đã thử thật tạo Nữ, gặp Thầy đồ, dùng kiếm, chuyển MAP và tải lại trong tab Codex; `npm test` đạt 284 test. Xem [báo cáo FEMALE và giới hạn kiểm thử](SOURCE-CODE/docs/female-integration.md).

Mẫu MALE dùng mã hồ sơ `male-base`, cấu hình và căn bàn tay từ GLB Nam; bộ điều khiển dùng chung với Nữ. Đổi mẫu trong **Kiểm tra hoạt ảnh** chỉ áp dụng cho phiên, không ghi đè hồ sơ đã tạo. `npm test` sau khi tích hợp Nam đạt **297/297 test**, cùng 5 script kiểm tra logic. Xem [báo cáo MALE và phạm vi kiểm thử thực tế](SOURCE-CODE/docs/male-integration.md).

Kiểm tra trực tiếp ngày **13/10/2026** trên tab Codex 8002 đã xác thực Google: tạo **Nam thử nghiệm**, lưu rồi vào Làng Việt bằng mô hình Nam, HP 100/100. Sau F5 và sau lần đăng xuất/đăng nhập Google lại riêng biệt, **Công cụ → Nhân vật** vẫn giữ đúng tên/mẫu Nam ở chế độ xem. Không ghi đè hồ sơ Nữ cũ; dữ liệu vẫn chỉ lưu cục bộ theo UID.

### Đóng gói Firebase Hosting và Alpha (12/10/2026)

Bản xuất riêng nằm trong `public-game/`, giữ nguyên cây đường dẫn từ gốc dự án và thứ tự script. Không dùng `START-GAME.bat` để kiểm tra bản xuất: BAT chạy mã nguồn; dùng Hosting Emulator bên dưới để phục vụ đúng `public-game`. Xem [hướng dẫn và kết quả kiểm tra Hosting](SOURCE-CODE/docs/firebase-hosting.md).

Chạy từ gốc CAP-NHAT bằng **Node 22.23.3 LTS** đã có trên máy này:

```powershell
Set-Location -LiteralPath 'H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT'
$hostingNodeDir = Join-Path $PWD '.local-tools\node-22\node-v22.23.3-win-x64'
$env:Path = "$hostingNodeDir;$env:Path"
node --version
npm.cmd run build:hosting
npm.cmd run test:hosting
npm.cmd run preview:hosting
```

Mở **http://localhost:5005/** (tự chuyển đến `SOURCE-CODE/index.html`). Lệnh `preview:hosting` chỉ chạy máy chủ cục bộ; không tạo preview online. Nếu cổng 5005 đang bận, giữ tiến trình đó và xem thông báo CLI; có thể đổi `emulators.hosting.port` sang cổng trống. Dừng phiên emulator do mình mở bằng Ctrl+C. Khi clone sang máy khác, dùng Node 22 và cài dependencies theo lockfile; không cần giữ đường dẫn ổ H trong mã game.

`firebase.json` đã có `hosting.site: viet-village-3d` và `hosting.public: public-game`, không có SPA rewrite hoặc GitHub Action triển khai. Cấu hình backend/rules cũ được giữ nguyên. Bản này vẫn dùng Google Authentication thật của `viet-village-3d`; `onlineConfig.enabled=false` nên chưa đọc/ghi hồ sơ và phòng thật. Không chạy `firebase deploy` hoặc triển khai Rules trong quy trình Alpha. Chủ dự án đã cho phép preview channel `alpha` trong 7 ngày sau khi kiểm tra và push `cap-nhat` thành công; xem [quy trình Alpha](SOURCE-CODE/docs/firebase-hosting-alpha.md).

`public-game/` và kiểm kê `.cache/hosting/` là kết quả tạo lại được, không đưa vào Git. Script dừng nếu gặp tài nguyên thiếu, con trỏ LFS, clip NPC thiếu, đường dẫn sai hoa/thường hoặc dấu hiệu khóa bí mật. Nếu bản xuất cũ có tệp người dùng sửa/thêm, script dừng để bảo toàn; các bản xuất cũ hợp lệ được chuyển vào `.cache/hosting/previous-*` khi đóng gói lại. Danh mục tài nguyên tải động ở `scripts/public-game.config.json` cần được xem lại khi thêm MAP/NPC hoặc một cơ chế tải mới.

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

Trang CAP-NHAT tải **66 script theo `SOURCE-CODE/load-order.json`**, cùng các script giao diện và module đăng nhập. Các script toàn cục dùng chung trạng thái; không đổi thứ tự hoặc tự thêm `async`. Các đường dẫn `../ASSETS`, `../MAP`, `../BUILDINGS` và các thư mục tương ứng phải còn hợp lệ. Không lấy riêng `SOURCE-CODE` làm toàn bộ thư mục website.

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

Kiểm tra giao diện trên trình duyệt không cần đăng nhập Google (chỉ dành cho người phát triển, UID giả, không Firebase, không vào bản Hosting):

```powershell
py -3 -B scripts/ui-check-server.py --port 8014
```

Mở `http://localhost:8014/SOURCE-CODE/tests/ui-check/index.html?player=a` (đổi `player=` để có nhân vật khác). Tiến độ của trang này lưu riêng ở origin `localhost:8014`. Người chơi vẫn dùng `START-GAME.bat`; launcher không phục vụ thư mục `tests`.

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


## Nhiệm vụ học tập (gói Tiếng Việt 1 – Học kì 1)

Gói đầu tiên: 18 tuần, 87 khung, 435 phiên bản; đăng ký trong `LEARNING/packs.json`, thêm gói môn/lớp khác bằng dữ liệu. Bảng **Nhiệm vụ** không còn ô chọn môn/lớp/tuần/mức/chế độ; bài và mức lấy từ bài được giao (`LEARNING/default-assignments.json` khi chưa có giáo viên online), lựa chọn đã lưu và lượt đang chạy. NPC có dấu `!` (nhận), `?` vàng (trả), `?` xám (đang làm/chờ giáo viên).

Thử trên máy tính: `START-GAME.bat --port 8002`, mở URL máy chủ báo (thường `http://localhost:8002/SOURCE-CODE/index.html`), đăng nhập, gặp **Tuần đinh** (dấu `!`) → **Nhiệm vụ học tập** → chọn bài → **Nhận nhiệm vụ** → **Tiếp tục · Đi tìm thẻ học** → nhặt bằng G/nút chạm → làm bài. Máy chủ cục bộ chấm, dừng ở chờ giáo viên, chưa phát EXP. Trên Firebase Hosting, cùng vòng chạy ở chế độ **luyện tập**: trình duyệt tự kiểm tra câu chọn đáp án bằng khóa băm, không cộng EXP; phần đọc/viết/nói luôn chờ giáo viên.

Dùng launcher dự án, **không dùng `python -m http.server` tại root**: root chứa ngân hàng đáp án máy chủ và dữ liệu thử theo tài khoản. Launcher và bản build đã chặn chúng. Giữ `.cache/learning-preview/state.json` nếu muốn giữ tiến trình nhiệm vụ thử. Chưa triển khai backend hoặc Rules.

Kiểm thử: `npm run test:learning`, `npm run test:firebase` (demo emulator), `npm test`. Chi tiết: [client, chế độ, dấu NPC và cách thêm gói](SOURCE-CODE/docs/learning-client.md); [kiến trúc backend](firebase/QUEST-BACKEND.md); [nhập gói ban đầu](DOCUMENTS/TV1-HK1-INTEGRATION.md).
