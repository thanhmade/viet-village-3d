# Nhiệm vụ học tập: gói nội dung, vòng nhiệm vụ và dấu NPC

Cập nhật 15/10/2026. Game không cố định cho một môn: nội dung là các **gói** đăng ký bằng dữ liệu; cơ chế nhiệm vụ, giao diện và tiến trình người chơi tách riêng.

## Bốn lớp tách biệt

| Lớp | Nằm ở đâu | Ghi chú |
|---|---|---|
| Nội dung kiến thức | `LEARNING/packs.json` → `LEARNING/<gói>/catalog.json`, `questions.public.json` | Môn, lớp, học kì, tuần, bài giữ trong dữ liệu để phân loại và giao bài; không hiện thành bảng chọn khi chơi |
| Đáp án nội bộ | `firebase/functions/private/<gói>.questions.teacher.json` | Chỉ máy chủ đọc; launcher và Hosting trả 404 |
| Cơ chế nhiệm vụ | `js/learning-quests.js` (chọn bài, mức, chế độ, dấu NPC), `js/learning-collectibles.js` (thẻ chữ 3D), `js/learning-view.js` (giao diện), `js/learning-practice.js` (luyện tập web) | Không tạo hệ thống nhiệm vụ hoặc EXP song song |
| Tiến trình người chơi | Máy chủ (Functions/Firestore) hoặc worker localhost; luyện tập web ở `viet-village:learning-practice:v1:<UID>:primary` | Luyện tập không ghi EXP, nhật ký làng hay hồ sơ nhân vật |

## Chọn bài, mức và chế độ (không còn ô chọn)

Danh sách nhiệm vụ của người chơi gồm, theo thứ tự ưu tiên:

1. Lượt đang có (giữ đúng câu, mức, seed, điểm thẻ đã chọn).
2. **Máy chủ:** bài giáo viên giao (`assignments`). **Localhost / luyện tập web:** lựa chọn đã lưu trước đây (`viet-village:learning-selection:v1:<UID>:primary`, không bị xóa khi bỏ ô chọn) và `LEARNING/default-assignments.json`.

Mức học tập: câu của lượt đang chạy → mức trong bài được giao → mức đã lưu → `Khởi đầu`. Mức không suy ra từ LV hoặc thời gian chơi. Năm mức nội bộ 1–5 (Yếu–kém … Giỏi) hiển thị là Khởi đầu, Cơ bản, Tiến bộ, Thử thách, Chinh phục.

Chế độ do môi trường quyết định, người chơi không tự chọn:

| `transport.mode()` | Khi nào | Chấm bài | EXP |
|---|---|---|---|
| `online` | `onlineConfig.enabled = true` (chưa bật) | Functions | Có, giao dịch một lần theo `canonical_quest_id` |
| `localhost` | Mở qua `START-GAME.bat` (có `/__viet_village_launcher__/health`) | Worker cục bộ, xác minh token Google | Không (xem thử) |
| `practice` | Firebase Hosting, Hosting emulator, máy chủ tĩnh khác | Trình duyệt, bằng khóa băm | Không |

Lớp học (`classroom`) cho phép bài được giao dù LV thấp; phiêu lưu (`adventure`) cần LV tối thiểu và nhiệm vụ trước. Máy chủ kiểm tra lại cả hai.

## Vòng nhiệm vụ

Nhận từ NPC giao → tìm và nhặt thẻ chữ (G hoặc nút chạm, trong 1,6 m) → làm bài → giáo viên quan sát phần đọc/viết/nói và xác nhận → trả cho NPC nhận → máy chủ cộng EXP một lần. Khi chờ giáo viên, nhiệm vụ **chưa** được tính là có thể trả. Một lần thưởng cho mỗi khung nhiệm vụ, dùng chung mọi mức và phiên bản; ôn lại 0 EXP. Mỗi lúc chỉ một thẻ hiện trong làng: thẻ của bài người chơi chọn "Tiếp tục · Đi tìm thẻ học" hoặc bài vừa nhận.

## Dấu trên đầu NPC

`!` vàng: có nhiệm vụ đủ điều kiện nhận (tại NPC giao). `?` vàng: đủ điều kiện trả (tại đúng NPC nhận trả). `?` xám: đang làm hoặc chờ giáo viên (tại NPC nhận trả và NPC của bước đang làm). Khóa nhỏ màu dịu: nhiệm vụ được phép biết (`lockedVisibility: "listed"`) nhưng chưa đủ điều kiện. Không dấu: nhiệm vụ tương lai chưa khám phá, đã xong, hoặc chưa mở trong bản thử nghiệm (`enabled: false`).

Một NPC chỉ hiện một dấu: có thể trả > có thể nhận > đang làm > khóa; cùng mức thì nhiệm vụ đang theo dõi, rồi chính tuyến > phụ tuyến > học tập, rồi thứ tự dữ liệu. Khung khác nhau theo loại (kim cương = chính tuyến, tròn = phụ tuyến, vuông bo = học tập); hội thoại ghi rõ nhãn loại. Hội thoại vẫn liệt kê mọi nhiệm vụ liên quan đã được khám phá, kèm mục tiêu/tiến độ, phần thưởng thật và điều kiện còn thiếu (ví dụ “Hoàn thành và trả “Chào làng” — đã đạt mục tiêu, chưa trả nhiệm vụ”).

Đánh giá dùng chung ở `js/quest-status.js` cho dấu, hội thoại, nhật ký **Dân làng**, bảng theo dõi trên HUD và minimap; tính theo tài khoản đang đăng nhập, gộp nhật ký làng (`QUEST_LV_*`) và nhiệm vụ học tập. Chỉ tính lại khi có sự kiện (nhận, đạt mục tiêu, trả, lên LV, trạng thái học tập, đổi tài khoản/MAP, sự kiện `storage` từ tab khác) và một lần an toàn mỗi 5 giây; không quét mỗi khung hình. Đang tải hoặc lỗi đọc dữ liệu thì không kết luận là đủ điều kiện.

Điều kiện trong `MAP/regions/<map>/quests.json`: `dependsOn` (mọi nhiệm vụ trước phải **đã trả**), `minLevel`, hoặc `requirements` dạng cây `{all:[…]}` / `{any:[…]}` với lá `{level:n}` và `{quest:id,state:"completed"|"ready"|"active"}`. ID trùng, tham chiếu thiếu, vòng lặp hoặc dạng chưa hỗ trợ làm nhiệm vụ đó ở trạng thái lỗi (đóng), không mở hàng loạt. Nhiệm vụ đang theo dõi lưu ở `viet-village:quest-tracking:v1:<UID>` (chỉ là lựa chọn hiển thị).

## Luyện tập trên web tĩnh

Không có máy chủ thì không giấu được đáp án. `LEARNING/<gói>/practice-keys.json` chứa SHA-256 có salt của đáp án câu chọn/ghép/xếp (259 câu của gói TV1), **không** có tiêu chí, gợi ý, giải thích hay câu đọc/viết/nói. Người chơi vẫn có thể dò bằng cách thử các lựa chọn, nên kết quả luyện tập không phải bằng chứng hoàn thành và không cộng EXP. Phần đọc/viết/nói luôn chờ giáo viên. Cần HTTPS hoặc localhost (Web Crypto). "Luyện lại từ đầu" chỉ xóa lượt luyện tập trên web.

## Thêm gói môn học khác

1. Chuẩn bị gói theo cùng lược đồ (`lessons`, `quests`, `questions.teacher/public`, `items`, `spawn-points`), mỗi ID chứa tiền tố riêng của gói (ví dụ `QUEST_T2_...`, `Q_T2_...`).
2. Viết bộ nhập theo mẫu `scripts/import-tv1-quests.py` (đổi `PACK_ID`, `PACK_DIRECTORY`, `PACK_ENTRY`, ánh xạ NPC, đường dẫn đầu ra). Bộ nhập ghi gói vào `LEARNING/packs.json` theo `packId`, giữ các gói khác, từ chối trùng tiền tố; nhập lại cùng gói không đổi byte.
3. Kiểm tra điểm đặt thẻ trên MAP thật (`spawn-placements.json` của gói); điểm chưa kiểm tra giữ `null`, nhiệm vụ đó không bật thu thập.
4. Thêm bài vào `LEARNING/default-assignments.json` (bản thử) hoặc giao qua máy chủ; thêm đường dẫn mới vào `scripts/public-game.config.json` nếu cần Hosting.
5. Chạy `npm run test:learning`, `npm test`, `npm run test:hosting` và `py -3 -B -m unittest discover -s scripts/tests`.

Client từ chối gói trùng `packId`, ID nhiệm vụ/câu trùng giữa các gói, ID không mang tiền tố của gói và đường dẫn có `..`.

Chưa có công cụ phân tích tài liệu thô (PDF/DOCX/PPTX/ảnh) hoặc dịch vụ AI để tạo gói mới; game không có nút phân tích.

## Kiểm tra

```powershell
npm run test:learning
npm test
```

`learning-client.test.cjs` (sổ gói, bài được giao, giữ lựa chọn cũ, dấu NPC, lớp học/phiêu lưu, nhiều gói), `learning-practice.test.cjs` (khớp băm với bộ nhập cho 259 câu, vòng luyện tập, đọc/viết không tự chấm, tải lại, làm lại, thiếu Web Crypto), `learning-transport.test.mjs` (phát hiện chế độ), `village-npcs.test.cjs` (dấu NPC trong game), `quest-backend.test.cjs` và `quest-emulator.test.mjs` (máy chủ: quyền giáo viên, thưởng một lần, đồng thời). Kiểm thử dùng tài khoản giả lập; không thay cho đăng nhập Google thật hoặc thử trên thiết bị học sinh.
