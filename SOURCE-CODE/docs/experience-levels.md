# EXP–LV Alpha — 13/10/2026

## Phạm vi và hiện trạng đã đọc

Chỉ sửa checkout `VIET-VILLAGE-3D-CAP-NHAT`, Git root đúng thư mục này, nhánh `cap-nhat`. Các thay đổi Nam/Nữ, tài nguyên và archive chưa commit đã có trước được giữ nguyên. Không sửa main, không commit/push, không deploy Hosting/Functions/Rules, không thay `onlineConfig.enabled` hoặc gói dịch vụ.

Entry root `index.html` chuyển hướng HTTP tới `SOURCE-CODE/index.html`. Game dùng các script toàn cục theo `SOURCE-CODE/load-order.json`, rồi module Google Authentication. Không thay thứ tự tương đối của các script cũ.

Trước thay đổi: `player-journey.js` giữ HP/LV trong phiên; LV mặc định 1, chỉ cờ hướng dẫn di chuyển/kỹ năng được lưu theo UID. `village-quests.js` lưu trạng thái nhiệm vụ theo UID; chưa có EXP. Hồ sơ ngoại hình local có thể chứa các trường legacy `level`, `exp`, túi đồ/nhiệm vụ cần giữ. `level` trong `state-and-questions.js` là **chỉ số bài toán 0–11**, không phải LV nhân vật; chế độ câu hỏi/tinh thể cũ đang bị vô hiệu bởi return sớm. Không nối thưởng vào mã chơi đang vô hiệu đó.

Nguồn hoạt động thật: hai nhiệm vụ Chào làng/Làm quen chiến đấu và bài học Thầy đồ `core:0`. Thu thập vật phẩm, quái chiến đấu, kinh tế/túi đồ và nhiệm vụ vườn chưa hoàn chỉnh, không tạo phần thưởng giả cho các phần này.

## Cấu hình cấp và thưởng

Nguồn duy nhất: `firebase/functions/shared/experience-config.js`; trình duyệt và backend cùng dùng `experience-core.js`. Hai tệp chỉ chứa cấu hình/phép tính công khai, không chứa SDK Admin, credential hoặc truy cập database. Bộ đóng gói chỉ cho phép chính xác hai tệp này trong thư mục firebase; các mã backend khác vẫn bị chặn.

- `schemaVersion: 1`, `tableVersion: 1`.
- Bảng `expToNextLevel` có đủ LV 1–100, chỉ số là LV; phần tử 0 là sentinel. LV100 không có cấp kế tiếp.
- Ngưỡng LV1→2: 100; LV2→3: 300; LV3→4: 600. Ngưỡng tăng theo `50 × LV × (LV + 1)` đã ghi thành bảng đầy đủ để dễ chỉnh.
- `alphaMaxLevel: 20`. Nhận đủ EXP có thể lên nhiều cấp, chuyển EXP dư tới cấp sau. Khi chạm LV20, bỏ phần EXP mới vượt giới hạn; thông báo rõ đã đạt giới hạn. Sự kiện vẫn có biên nhận, không thể nhận lại sau khi đổi giới hạn.
- Nhân vật cũ LV >20, kể cả >100, giữ nguyên LV/EXP; không tự hạ cấp. EXP dư của dữ liệu cũ được chuyển cấp trong giới hạn, phần cũ còn lại ở giới hạn được giữ.
- Chỉ nhận số nguyên dương an toàn; từ chối 0, âm, chuỗi, số thập phân, NaN, Infinity và số vượt giới hạn an toàn. Phiên bản mới chưa hỗ trợ hoặc dữ liệu hỏng phải báo lỗi, không ghi đè.

| Hoạt động | Điều kiện local | EXP | Tần suất |
| --- | --- | ---: | --- |
| `QUEST_LV_01` | Nhận từ Tuần đinh, gặp Lý trưởng, trả nhiệm vụ đúng NPC và lưu hoàn thành thành công | 60 | Một lần/nhân vật |
| `QUEST_LV_02` | Hoàn thành prerequisite, nhận từ Võ sư, dùng chiêu hợp lệ hướng vào bia tập trong phạm vi, trả nhiệm vụ | 100 | Một lần/nhân vật |
| `core:0` tại Thầy đồ | Đã mở phần học và trả lời đúng câu hỏi phân số, phiên hội thoại còn hợp lệ | 40 | Một lần/nhân vật |

Mở hội thoại, nhận nhiệm vụ, chỉ đạt mục tiêu chưa trả, trả lời sai, bấm lặp hoặc mở lại không tạo thêm EXP. Nhiệm vụ cũ đã hoàn thành được đối chiếu và nhận thưởng một lần khi mở lại hội thoại NPC liên quan. Bài học cũ chưa lưu kết quả hoàn thành lâu dài nên phải làm lại bài học để nhận lần đầu. Tổng nội dung hiện có thưởng **200 EXP**, đủ LV2 với 100/300 EXP; chưa có nội dung thưởng để chơi tự nhiên tới LV20.

`MAP/regions/lang-viet/quests.json` đánh dấu thưởng đang bật cho `local-character-exp`; vật phẩm/tiền vẫn tắt. Năm mức kiến thức **Yếu–kém, Trung bình, Trung bình khá, Khá, Giỏi** là hệ đánh giá độc lập. Chưa có dữ liệu đánh giá thì hồ sơ ghi “Chưa đánh giá”; không suy ra từ LV/EXP.

## Lưu local và bảo toàn dữ liệu

Key: `viet-village:experience:v1:<UID đã encode>:primary`. Dự án hiện có một nhân vật mỗi tài khoản, nên dùng mã slot ổn định `primary`; không dùng tên, giới tính hay modelId làm khóa. Bản ghi chứa UID, characterId, schemaVersion, tableVersion, level, exp và receipts. Receipt khóa theo `quests:<questId>` hoặc `lessons:<lessonId>`, không tự cắt/xóa để tránh thưởng lại.

Web Locks khóa theo key trên cùng origin, đọc lại bản ghi trong khóa, ghi EXP và toàn bộ receipt bằng một lần `localStorage.setItem`, rồi đọc xác nhận. Hàng đợi trong tab chống thao tác chồng; khóa chung chống mất cập nhật giữa tab. Nếu trình duyệt không có Web Locks thì từ chối ghi và hướng dẫn dùng localhost/HTTPS trên Chrome/Edge. Lỗi đọc khác với chưa có dữ liệu; lỗi lưu giữ tiến độ cũ và nút **Thử nhận lại EXP**. Lỗi đọc có **Thử đọc lại EXP** ở HUD.

Migration đọc `progression`/`character.progression`, hoặc trường top-level `level`/`exp` của hồ sơ ngoại hình đúng UID. Không sửa bản ghi nguồn, không lấy điểm học tập hoặc chỉ số bài toán làm EXP. Không ghi đè LV/EXP cũ, túi đồ, trang bị, nhiệm vụ, tên hoặc mẫu Nam/Nữ. Cờ hướng dẫn vẫn nằm ở key journey cũ.

Nhật ký nhiệm vụ đọc nguyên dictionary cũ, bổ sung marker bất biến `viet-village:quests:lang-viet:v1:<UID>:<questId>:<active|ready|completed>` với giá trị `1`. Trạng thái lấy mức cao nhất giữa legacy và marker. Hai tab ghi xen kẽ không thể làm completed lùi thành active/ready; không ghi đè dictionary cũ hoặc trường phụ. Lưu lỗi không còn báo hoàn thành thành công. Nếu đã lưu hoàn thành nhưng chưa lưu được EXP, mở lại NPC sẽ nhận bù theo receipt, không thưởng trùng.

`VietVillageJourney.getState().level` lấy từ cùng kho EXP; kiểm tra vào Đồng Tre tiếp tục dùng Journey. HP và hướng dẫn không bị sửa bởi nhận EXP. HUD và cửa sổ Nhân vật đọc cùng snapshot, cập nhật cả khi đang mở cửa sổ; không tạo thêm bộ tính cấp. Có thanh chuyển động, thông báo +EXP/lên cấp, định dạng Việt Nam, progressbar và thông báo aria-live. CSS hỗ trợ màn hình nhỏ và reduced motion.

LocalStorage chỉ là tiến độ **Alpha trên trình duyệt/origin hiện tại**, người dùng có thể sửa/xóa qua công cụ trình duyệt. Không coi đây là chống gian lận online hoặc điểm học tập chính thức. Khác cổng, trình duyệt hoặc thiết bị có dữ liệu local riêng. Không tự sao chép tiến độ cục bộ lên Firebase.

## Backend đã chuẩn bị, chưa hoạt động online

Firestore/Firebase thật giữ nguyên. `onlineConfig.enabled` vẫn `false`. Auth entry công bố chính sách local-only; nếu bật online về sau mà chưa nối adapter EXP, local EXP từ chối thưởng thay vì âm thầm dùng dữ liệu trình duyệt làm dữ liệu server.

Cloud Functions Node22, vùng `asia-southeast1`:

- `claimVillageExperience({characterId:'primary', completionId})`: yêu cầu Google UID; chỉ nhận kết quả hoàn thành đã được môi trường Admin tin cậy ghi, kiểm tra UID/nhân vật/activity/version/status. Không nhận amount/LV/UID/completed từ trình duyệt.
- `submitVillageLesson({characterId:'primary', activityId:'core:0', answerIndex})`: kiểm tra đáp án thật của câu hỏi “Thẻ nào có giá trị bằng 1/2?” ở server; đáp án 0 = 2/4. Câu trả lời sai không thưởng. Đây là endpoint bài tập đã xác thực, client game hiện **chưa gọi** endpoint này.
- Nhân vật phải có registry tin cậy `players/{uid}/characters/primary` chứa uid, characterId, schemaVersion1, createdtrue. Không tự tạo registry dựa vào hồ sơ local.
- Tiến độ `.../progression/experience`; kết quả `.../experienceCompletions/{completionId}`; biên nhận riêng `.../experienceReceipts/{sha256(activityId + ':v1')}`.
- Firestore transaction cập nhật tiến độ, biên nhận và đánh dấu đã nhận thưởng cùng nhau. Khóa theo hoạt động chuẩn, không theo một ID client tùy ý để tránh tạo nhiều completionId nhận cùng thưởng.
- Rules chỉ cho đúng Google UID đọc dữ liệu nhân vật/EXP được phép; cấm client viết registry, tiến độ, completion, receipt. Quyền Admin nằm ở backend, không nằm trên client. File Rules đã sửa chỉ để chuẩn bị/kiểm thử, **chưa áp dụng Firebase thật**.

Trước online: cần quy trình tạo/di trú nhân vật do máy chủ xác nhận; backend xác nhận nhiệm vụ/chuyển động/chiêu và sinh completion tin cậy (hiện chưa có cho hai nhiệm vụ); nối client callable + tải tiến độ authoritative và retry, không dùng local fallback; đồng bộ phiên bản câu hỏi máy chủ với ngân hàng câu hỏi; kiểm thử Google thật trên hai tài khoản/hai tab. Sau đó chủ dự án mới phê duyệt backend/Rules và phương án hosting Functions phù hợp gói dịch vụ. Không nâng Spark hoặc triển khai gì trong công việc này.

## Kiểm chứng

Ngày 13/10/2026, Node22.23.3:

- `npm test`: **344/344** bài TAP, cùng các script logic/geometry/auth hiện có, đạt. EXP gồm 47 bài: core15, local16, tích hợp7, backend9. Fixture dùng UID giả lập riêng, không phải bằng chứng đăng nhập Google thật.
- Core: thiếu 1, vừa đủ, dư, nhiều cấp, cap, dữ liệu lỗi, phiên bản không hỗ trợ, giữ cấp cũ, nhận trùng.
- Local/integration: hai store chung khóa, thưởng trùng/khác đồng thời, đổi UID khi chờ khóa, tải lại, legacy, mất quyền đọc/ghi, phản hồi mất sau khi ghi rồi thử lại; marker journal ghi xen kẽ không lùi; NPC mở/nhận/đạt mục tiêu chưa thưởng, turn-in và read+correct hợp lệ mới thưởng; HUD/hồ sơ/Journey thống nhất, giữ HP/hướng dẫn khi chuyển Đồng Tre.
- Firebase Emulator demo thật: **15/15**, gồm 5 EXP + 10 phòng chơi hồi quy. Sáu callable đồng thời nhận đúng một thưởng; sai UID/ghi trái phép/giả EXP/LV bị từ chối; lỗi/mất phản hồi rồi thử lại không thưởng trùng. Emulator đã dừng; không gọi production.
- Kiểm tra lại 2 bài NPC liên quan sau cập nhật cờ thưởng EXP/vật phẩm: 2/2 đạt.
- Bộ kiểm tra danh mục đóng gói: 6 bài đạt. Tìm thấy test cũ còn kỳ vọng 8 GLB dù đã có Nam/Nữ; cập nhật thành 10 GLB/28 ảnh nhúng thực tế. Không dựng lại `public-game`.
- HTTP nguồn `localhost:8002`: 145 tệp, 179.061.583 byte, 10 GLB; tất cả trả thành công và Content-Length khớp file thật. Bộ quét loại LFS pointer, private key, credential, BACKUP và đường dẫn phụ thuộc máy. Báo cáo `.cache/experience/http-check.json`.
- Trình duyệt Codex với tài khoản Google đã đăng nhập thật: nhận Chào làng không tăng EXP; trả ở Lý trưởng nhận 60; mở lại không nhận thêm. Thầy đồ: mở câu hỏi/sai/chỉ đúng nhưng chưa học không thưởng; học + đúng nhận40 và hiện **LV2 · 0/300 EXP**, thông báo lên cấp. HUD/hồ sơ thống nhất; F5 giữ LV2 và mẫu Nam/tên cũ. Làng Việt → Làng Tân Thủ → Làng Việt giữ HP100 và LV/EXP. Console không có JS/WebGL error, còn cảnh báo global Three.js cũ.
- Responsive 390×844: HUD nằm trong viewport, không tràn ngang (document scrollWidth390, HUD trái10 rộng310). Đây là mô phỏng kích thước trong trình duyệt máy tính, không phải thiết bị điện thoại thật.
- Chưa thử đổi Google account/đăng xuất-đăng nhập lại hoặc ngắt mạng vật lý riêng cho bản EXP; các tình huống này đã thử bằng fixture/emulator và F5 phiên thật. Chưa thử mua/bán/đánh quái vì chưa có gameplay đó. Chưa kiểm thử EXP production.

Lỗi gặp khi chạy test đã xử lý: harness đăng nhập giả trước đây không có UID, khiến LV nguồn mới không đọc được; bổ sung UID fixture. Fixture hồi máu LV7 chuyển sang đọc hồ sơ legacy thay vì chỉnh cấp bằng bộ xử lý HP. Không thay giảm bảo vệ auth hoặc bypass auth ở game.

Logs local (bị Git bỏ qua): `.cache/exp-full-regression-audit.log`, `.cache/exp-firebase-emulator.log`, `.cache/exp-package-tests.log`, `.cache/experience/http-check.json`.

## Tệp thuộc lần triển khai này

Runtime mới: `firebase/functions/shared/experience-config.js`, `experience-core.js`; `SOURCE-CODE/js/player-experience.js`, `experience-view.js`; `SOURCE-CODE/css/experience.css`.

Runtime sửa: `SOURCE-CODE/index.html`, `load-order.json`; `SOURCE-CODE/js/app.js`, `auth-entry.js`, `player-journey.js`, `village-quests.js`, `village-npcs.js`; `MAP/regions/lang-viet/quests.json`.

Backend: thêm `firebase/functions/experience-service.cjs`; sửa `firebase/functions/index.cjs`, `firebase/firestore.rules`.

Công cụ/tài liệu: sửa `scripts/build-public-game.mjs`, `scripts/firebase-local.mjs`, `package.json`, `README.md`; thêm tài liệu này.

Tests mới: `SOURCE-CODE/tests/experience-core.test.cjs`, `player-experience.test.cjs`, `experience-integration.test.cjs`, `experience-backend.test.cjs`, `experience-emulator.test.mjs`.

Tests cập nhật: `harness.cjs`, `region-access.test.cjs`, `thay-thuoc-gltf.test.cjs`, `hosting-package.test.mjs`, `village-npcs.test.cjs`, `nong-dan-gltf.test.cjs` trong cùng thư mục tests. Những tệp Nam/Nữ/tài nguyên khác hiện trong git status là công việc có trước, không phải EXP sửa.

## Mở bản thử và chạy kiểm tra

Từ CAP-NHAT:

```powershell
.\START-SERVER.bat --port 8002 --no-browser
```

Đã chạy launcher và nhận `Reusing verified server`, nhánh cap-nhat @ 4f13dce, đủ 8 NPC; thay đổi EXP vẫn chưa commit. Server đang phục vụ mã nguồn tại **http://localhost:8002/SOURCE-CODE/index.html** (không phải public-game hoặc Alpha). Dùng cùng URL/origin và tải lại để đọc mã mới. Launcher dùng lại server đúng checkout; không tắt tiến trình cổng khác. Mở Công cụ → Nhân vật để xem LV/EXP, Dân làng để nhận/trả nhiệm vụ và học bài.

```powershell
$env:Path=(Join-Path $PWD '.local-tools\node-22\node-v22.23.3-win-x64')+';'+$env:Path
npm.cmd run test:experience
npm.cmd test
npm.cmd run test:firebase
node --test SOURCE-CODE/tests/hosting-package.test.mjs
```

Firebase test launcher chỉ dùng `demo-viet-village-3d` và emulator loopback, Java21 đã có. Chưa commit/push các thay đổi. Để tiếp tục cân bằng nội dung, sửa bảng/thưởng công khai và cập nhật `tableVersion` khi có quy trình migration tương ứng; không đổi version tùy tiện làm hồ sơ cũ bị khóa.
