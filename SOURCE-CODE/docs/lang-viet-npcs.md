# Làng Việt: nhập hồ sơ thiết kế và triển khai ba NPC

Ngày 11/10/2026. Chỉ làm việc tại `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, Git root cùng đường dẫn, nhánh `cap-nhat`. Không tìm thấy AGENTS.md trong các thư mục áp dụng. Giữ các thay đổi chưa commit có từ trước; không sửa bản chính, commit, push hay deploy.

## Hồ sơ nguồn

Đường dẫn người dùng nêu có tên `LANG_VIET_NPC_PORTAL_DE_XUAT(2).zip` không tồn tại lúc kiểm tra. Trong đúng thư mục nguồn có `LANG_VIET_NPC_PORTAL_DE_XUAT.zip`; đã kiểm tra danh sách ZIP rồi nhập gói này.

Nguồn thực tế: `H:\CHAT GPT\3D-GAME\MAP\MAP Phân tích có nhân vật, quái và vai trò\LANG_VIET_NPC_PORTAL_DE_XUAT.zip`.

Đích: `MAP/regions/lang-viet/LANG_VIET_NPC_PORTAL_DE_XUAT/`. Không thêm lớp thư mục lồng trùng tên. Có 8 tệp: JSON trong DESIGN, PDF 6 trang trong DOCUMENTS, 5 JPG trong REFERENCES và hướng dẫn TXT. Giải nén qua `.cache/lang-viet-npc-import/`, kiểm tra đường dẫn an toàn, CRC và SHA-256; ZIP gốc và 8 tệp nhập được giữ nguyên byte. Cả 5 ảnh đọc được, đã đọc JSON/PDF và xem các góc ảnh. Không dùng sơ đồ schematic làm tọa độ 3D; hồ sơ gốc vẫn giữ `runtime_ready: false` vì đó là tài liệu đề xuất.

## Phần chạy được

- Tạo ba NPC Three.js theo phong cách nhân vật khối hiện có, tên nổi, quay về phía người chơi khi trò chuyện. Các NPC nằm trong root của `lang-viet`, chỉ tạo một lần và dùng lại khi quay về.
- Có va chạm NPC/bia tập. Dùng cùng cơ chế đường đi của game, giữ trục chính, cửa nhà và cổng vùng thông thoáng.
- Nút **Công cụ → Dân làng** mở danh sách/nhật ký. Chọn **Đi tới…** để tự đi đến vị trí tiếp cận; nhấn **F** hoặc nút **Trò chuyện** khi đến gần. Phím E của cổng được giữ nguyên.
- Hội thoại khóa di chuyển, thao tác cảnh và kỹ năng; có nút đóng, Escape, giữ focus bàn phím và bố cục cuộn trên màn hình nhỏ.
- Tuần đinh chỉ đường tới Lý trưởng, mở bản đồ tổng, kiểm tra tuyến Đồng Tre bằng chính `checkTravelAccess` có sẵn. Không tạo cổng mới hoặc bỏ chính sách gameplay đang bật.
- Lý trưởng nhận báo hoàn thành và chỉ đường tới Võ sư. Võ sư hướng dẫn chọn vũ khí, dùng chiêu và đi tới bia.
- Dữ liệu tải bằng HTTP từ ba JSON. Khi tải lỗi, không tạo NPC dở dang, báo rõ và có Thử lại; game vẫn dùng được.

## Tọa độ đã đối chiếu với cảnh thật

Quy ước từ cổng nhìn vào đình: phải là +X, hướng tới đình là -Z. Đơn vị cùng hệ tọa độ hiện tại của game.

| ID | Vị trí (X, Y, Z) | Điểm tiếp cận (X, Z) | Cơ sở |
|---|---|---|---|
| `NPC_LANG_VIET_LY_TRUONG` | (1.25, 0.915, -16.55) | (1.25, -15.05) | Hiên đình, giữa cột X=0 và X=2.5 |
| `NPC_LANG_VIET_VO_SU` | (8.1, 0.3, -16.6) | (8.1, -14.6) | Sân trống bên phải đình, tránh nhà phía sau |
| `NPC_LANG_VIET_TUAN_DINH` | (6.3, 0.3, 22.25) | (7.6, 21.6) | Mép phải trong cổng, ngoài vòng Đồng Tre và hồ sen |
| `BIA_TAP_LANG_VIET_01` | (10.7, 0.3, -16.4) | (10.7, -14.3) | Cạnh Võ sư, chừa lối đi và hàng rào nhà |

Đình cũ có hình học hiên/bậc nhưng vùng đi lại chặn cả khối và mặt đất chỉ trả 0.3. Bổ sung mặt sàn hiên/bậc trong `MAP/navigation.js` từ các box của `BUILDINGS/temple.js`: 0.395, 0.545, 0.695 và 0.915. Kiểm raycast xuống mesh thật xác nhận các độ cao; giữ tường/thân đình và năm cột là vật cản. Không thay hình học đình hoặc nội thất nhà dân.

Khi mount, kiểm ID không trùng, mặt đất tại NPC, 16 điểm quanh va chạm và điểm tiếp cận. Bán kính cản NPC 0.56; bia 0.7. Bộ tìm đường tìm được lối từ điểm xuất hiện làng tới cả ba NPC và bia.

## Nhiệm vụ và dữ liệu

- `QUEST_LV_01` — **Chào làng**: nhận ở Tuần đinh → nói chuyện với Lý trưởng → bấm Báo hoàn thành.
- `QUEST_LV_02` — **Làm quen chiến đấu**: chỉ nhận tại Võ sư sau Chào làng; đứng trong 3 m, hướng về bia trong góc ±60°, dùng một chiêu thành công từ hệ vũ khí hiện tại → trở về Võ sư báo hoàn thành.
- Bia phản ứng nhẹ khi luyện đúng. Đây là kiểm tra thao tác chiêu theo vị trí/hướng, chưa phải mô phỏng va chạm đòn đánh hoặc hệ sát thương/HP. Chiêu cooldown/thất bại không ghi nhận, ra chiêu xa bia/quay lưng/ở MAP khác không hoàn thành nhiệm vụ.
- Không có quái, NPC đối kháng, điểm thưởng, EXP, tiền hoặc vật phẩm. Không tự cộng điểm học tập.
- Tiến độ nhiệm vụ lưu cục bộ tại `viet-village:quests:lang-viet:v1:<Firebase UID>`. Nhận và trả một lần; đăng xuất khóa trạng thái phiên, tài khoản khác dùng dữ liệu riêng. Giữ nguyên khóa lưu hướng dẫn `viet-village:journey:v1:` và tiến độ Toán.
- Hai nhiệm vụ NPC không thay yêu cầu vào Đồng Tre: vẫn còn sống, cấp ≥1, phí 0, tự đi ≥3 m và dùng một kỹ năng thành công, MAP/spawn sẵn sàng. Người đã làm hướng dẫn trước không bị bắt xóa hoặc làm lại.
- Đây là tiến độ kể chuyện cục bộ, chưa là dữ liệu được backend xác thực. Không thay Firebase rules hoặc ghi database.

## Kiểm thử

### Tự động

- `npm test`: **167/167 tests đạt**, cộng **4 kiểm tra logic/hình học/môi trường đạt**. Sau chỉnh nhỏ về focus hội thoại và hiển thị NPC trong góc xem cổng, chạy lại **8/8 NPC tests đạt**.
- 8 kiểm tra NPC bao gồm: ID/ảnh thiết kế; độ cao mặt hiên bằng raycast mesh; va chạm/đường tiếp cận; nhận/trả nhiệm vụ; dùng chiêu thật qua adapter vũ khí; 5 vòng Đồng Tre–Làng Việt (10 chuyển cảnh) giữ đúng 3 NPC + 1 bia, không thêm root/va chạm; cô lập UID/lưu lại/dữ liệu hỏng; tải lỗi rồi thử lại không sinh trùng.
- Các kiểm hiện có cho nhà, nội thất, thời tiết, VFX, toolbar, atlas và điều kiện Đồng Tre vẫn đạt. Three.js classic còn cảnh báo deprecated có từ trước.
- Kiểm cú pháp JS và `git diff --check` trên sáu tệp có sẵn được sửa trong đợt này đạt.
- ZIP và 8 tệp nhập nguyên vẹn; 30/30 tài nguyên atlas/Đồng Tre trong manifest cũ giữ SHA-256.

### Trình duyệt localhost

Dùng phiên Google thật, không bypass đăng nhập hoặc giả đồng bộ backend:

1. Vào game, mở Dân làng, thấy ba lựa chọn và trạng thái nhiệm vụ.
2. Tự đi tới Tuần đinh; nhấn F; nhận Chào làng và kiểm tuyến Đồng Tre hiển thị Sẵn sàng theo hồ sơ đang có.
3. Tự đi tới hiên đình; nói chuyện Lý trưởng và báo hoàn thành; quan sát nhân vật đứng trên bậc, Lý trưởng đứng trên hiên.
4. Đi tới Võ sư; nhận nhiệm vụ, chọn Kiếm; đi tới bia, nhấn W hướng về bia rồi dùng Nhất Kiếm; game báo đã luyện chiêu.
5. Trở lại Võ sư; bấm nút trò chuyện và báo hoàn thành. Hai nhiệm vụ hiển thị Đã hoàn thành.
6. Qua atlas tới Đồng Tre, giữ Kiếm; Dân làng thông báo phải về Làng Việt, không mở hội thoại sai MAP. Trở lại bằng cổng E; nhật ký vẫn hoàn thành, ba lựa chọn còn đủ.
7. Reload trang, Firebase xác thực lại; hai nhiệm vụ vẫn hoàn thành. Chưa xóa hay đặt lại tiến độ cũ.
8. Kiểm bố cục 390×844: danh sách, hội thoại Tuần đinh và nút chạm dùng được, nội dung không tràn ngang; Escape đóng được. Khôi phục viewport desktop sau kiểm tra.
9. Log lỗi trình duyệt sau kiểm tra rỗng, không ghi nhận lỗi JavaScript/WebGL trong lượt chạy.

Ảnh và log tại `.cache/lang-viet-npc-implementation/`, không đưa vào dữ liệu game. Chưa kiểm trên điện thoại vật lý hoặc hai tài khoản multiplayer. Không chạy lại toàn bộ sáu căn nhà bằng thao tác tay trong đợt này; phần nhà/nội thất có kiểm tự động.

## Tệp

Tạo mới ngoài hồ sơ gốc:

- `MAP/regions/lang-viet/gameplay.json`
- `MAP/regions/lang-viet/dialogues.json`
- `MAP/regions/lang-viet/quests.json`
- `CHARACTERS/village-npcs.js`
- `SOURCE-CODE/js/village-npcs.js`
- `SOURCE-CODE/js/village-quests.js`
- `SOURCE-CODE/css/village-npcs.css`
- `SOURCE-CODE/tests/village-npcs.test.cjs`
- `SOURCE-CODE/docs/lang-viet-npcs.md`

Chỉnh sáu tệp có sẵn: `MAP/navigation.js`, `SOURCE-CODE/index.html`, `SOURCE-CODE/js/app.js`, `SOURCE-CODE/js/legacy-game-controls.js`, `SOURCE-CODE/load-order.json`, `package.json`.

## Phần còn thiếu

Năm NPC còn lại (Thầy đồ, Thầy thuốc, Thợ rèn, Người bán hàng, Nông dân); nhiệm vụ vườn/câu hỏi/chuyến đi đầu tiên; cửa hàng, túi đồ, hồi phục, phần thưởng và đồng bộ nhiệm vụ phía máy chủ. Các mục này chỉ được ghi nhận trong thiết kế/danh sách Chưa mở, chưa tạo chức năng giả. NPC hiện dùng mô hình thủ tục, chưa có rig/animation hoặc tuần tra riêng.

Chạy game: từ thư mục CAP-NHAT, `python -B -m http.server 8001 --bind 127.0.0.1`, hoặc dùng máy chủ cổng 8001 đang chạy. Mở <http://localhost:8001/SOURCE-CODE/index.html> và nhấn Ctrl+F5 nếu đang giữ phiên bản cũ.
