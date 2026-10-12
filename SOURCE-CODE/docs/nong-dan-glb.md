# Nông dân — tích hợp trong CAP-NHAT

Ngày kiểm tra: 12/10/2026. Thư mục chạy lệnh và Git root:
`H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.
Không có AGENTS.md áp dụng. Giữ các thay đổi chưa commit từ trước; không sửa bản chính, commit, push hoặc triển khai.

## Vị trí và model

- ID `NPC_LANG_VIET_NONG_DAN`, MAP `lang-viet`, role `farmer`.
- Đọc hồ sơ `LANG_VIET_NPC_PORTAL_DE_XUAT/DESIGN/LANG_VIET_NPC_PORTAL_DESIGN.json`, xem ảnh `REF_03_BEN_VUON_TRE.jpg`, đối chiếu `MAP/landscape.js`, hệ va chạm, lối vào nhà và cảnh thực tế. Hồ sơ chỉ định lối vào vườn rau bên trái cổng, cạnh hàng rào; không lấy tọa độ schematic làm tọa độ 3D.
- Vườn thực tế tâm `(-15,17)`, hàng rào phía đông X = `-9.5`, cửa vườn Z = `15.55..17.25`. NPC đứng ngoài hàng rào tại `(-8.35,0.3,18.6)`, hướng ban đầu `π/2`, tiếp cận `(-7,18.6)`. Bán kính cản `0.56 m`, tương tác `2.2 m`.
- Bổ sung đoạn lối đất rộng `1.8 m`, dài `4.2 m` cạnh hàng rào bằng vật liệu đất sẵn có. Mặt lối Y = `0.26`, model dùng `groundOffset = -0.04` để chân tiếp đất; giữ hệ độ cao điều khiển hiện có. Đoạn đất được gộp cùng cảnh tĩnh, không thêm texture hay thư viện.
- Vòng va chạm nằm ngoài luống rau, không bít lối vườn, lối đi chính hoặc cửa `nha-03`. Đường tự đi từ vị trí xuất hiện tới NPC đã chạy trên localhost.
- Model giữ nguyên ở `CHARACTERS/NPC/LANG_VIET/NONG_DAN/NPC_LANG_VIET_NONG_DAN.glb`: 10.372.428 byte, 21.004 đỉnh, 18.993 tam giác, 3 texture nhúng (base color, normal, roughness/metallic). Cao `2.4 m`, khóa trôi Hips.
- SHA-256: `b181b9b892d0374271333bd2bf889bab586f13b1d67516efd2b4ee20f29569d8`.
- Riêng model này dùng `footProbeRatio = 0.0075` (349 điểm dò), tránh sai lệch mũi chân khi chào; dùng tùy chọn đã có của bộ nạp chung. Không thay bộ nạp hay cấu hình bàn chân các NPC khác.

## Animation và hội thoại

- Mặc định lặp `idle` (15,33 giây).
- Mở hội thoại phát `greet_01` một lần (3,5 giây), chuyển mượt 250 ms về idle. Đến gần hiện **Nói chuyện · Nông dân (F)**.
- Lời chào: “Chào cháu! Vườn hôm nay có nhiều việc. Cháu có muốn giúp ta một tay không?”
- Có **Có việc gì cần giúp?**, **Hỏi cách thu thập**, **Kết thúc**; đóng được ngay bằng nút đóng hoặc Esc, kể cả khi đang chào.
- Hỏi việc đọc trực tiếp trạng thái/cấu hình `QUEST_LV_03`. Hỏi thu thập nhắc tránh giẫm luống rau và nói rõ tính năng chưa mở.
- `agree` (4 giây) nối với kết quả `accept`/`turnIn` thành công của nhật ký nhiệm vụ chung. Chờ động tác đang chạy kết thúc; đóng hội thoại hủy phản hồi đang chờ. Bấm lặp không thể nhận/trả lại cùng nhiệm vụ.
- **Trả nhiệm vụ** chỉ hiện khi một nhiệm vụ đang bật, thuộc NPC này và có trạng thái `ready`. Kiểm tra phiên hội thoại, đúng NPC, UID, trạng thái sống, MAP, khoảng cách và chuyển cảnh trước khi nhận/trả.
- Giữ `dig` (16,375 giây) trong GLB, đánh dấu chưa bật trong cấu hình; không đăng ký làm one-shot, không chạy nền, không có nút đào. Chưa có cuốc phù hợp và chưa xem thử hoạt cảnh cùng công cụ nên chưa bật. Khi bổ sung sau này phải gắn/cất cuốc và nhường ưu tiên cho hội thoại.

## Nhiệm vụ còn thiếu

`QUEST_LV_03` — **Giúp việc vườn** hiện là đề xuất trong hồ sơ. Đã gắn đúng NPC giao/trả, mục tiêu và phụ thuộc `QUEST_LV_01`; giữ `enabled: false`, `repeatReward: false`, `rewardsEnabled: false`.

Chưa có **mã vật phẩm, số lượng, điểm thu thập, túi đồ hoặc phần thưởng** được cấu hình. Nhật ký hiện chỉ lưu tiến độ hội thoại/luyện tập theo Firebase UID trong localStorage; không có cơ chế cấp đồ/thưởng. Vì vậy bản game chỉ giới thiệu nhiệm vụ, chưa cho nhận/trả nhiệm vụ thu thập và không phát `agree` khi chỉ hỏi thông tin. Không dùng tinh thể của chế độ toán cũ làm vật phẩm làm vườn, không tự đặt phần thưởng.

Muốn mở nhiệm vụ này cần dữ liệu vật phẩm/số lượng/phần thưởng được duyệt, điểm thu thập thực tế, túi đồ và cơ chế kiểm tra tiêu hao/cấp thưởng một lần. Không thay khóa lưu trữ hoặc chuyển đổi tiến độ các hồ sơ đang có.

## Kiểm tra

- `npm.cmd test` sau thay đổi cuối: **224/224 bài đạt**, cộng **4 script kiểm tra logic/hình học đạt**. Nhóm NPC **61/61**, gồm **9 bài mới** của Nông dân.
- GLTFLoader, geometry, skin và AnimationMixer thật: texture nhúng, clip chính xác, chiều cao, chân trên nền trong chào/đồng ý, không trôi, không chồng động tác, trở về idle. Xác nhận API từ chối phát `dig` và đứng chờ lâu không tự đào.
- Va chạm, điểm tiếp cận, cổng vùng, cửa vườn/cửa nhà vẫn thông; rời MAP rồi quay về không sinh trùng. Tổng **8 NPC + 1 bia tập**. Các bài kiểm tra của 7 NPC trước, bài học, hồi HP, nhà, thời tiết, vũ khí và chuyển MAP đều đạt.
- Bấm mỗi nút hỏi 20 lần không thay điểm, HP, trang bị, tiến độ hoặc ghi localStorage. Callback cũ, đứng xa, đổi UID và chết bị chặn. Trường hợp lỗi tải model giữ nhân vật dự phòng và thông báo lỗi; dữ liệu lưu giả trạng thái ready của nhiệm vụ đang khóa không làm xuất hiện nút trả.
- Kiểm tra nối phản hồi nhiệm vụ dùng **fixture hội thoại riêng trong bộ test**, không ghi vào cấu hình game hoặc hồ sơ người dùng: nhận một lần, chỉ trả khi ready, mỗi chuyển trạng thái chỉ lưu một lần dù bấm 20 lần; `agree` không chồng lời chào và đóng bảng hủy động tác chờ. Đây không phải kiểm thử thu thập/cấp thưởng thật.
- Trên localhost với phiên Google hiện có: mở game, danh sách 8 NPC, đi tới Nông dân, kiểm tra vị trí/lối đất/texture, lời chào, cả hai lựa chọn, Kết thúc và Esc trong lúc chào. Đã đi tiếp sang Thợ rèn và mở hội thoại cũ thành công, rồi quay lại Nông dân. Console không có lỗi JavaScript/WebGL mới; còn cảnh báo cũ của Three.js classic.
- Chưa kiểm thử thu thập/trả thưởng thật, hoạt cảnh đào kèm cuốc hoặc điện thoại thật. Renderer trong harness được mock; phần hình ảnh được kiểm tra riêng trong trình duyệt.

Kết quả cuối lưu ở `.cache/nong-dan-glb/full-tests.log`, metadata/hash ở `model-audit.json`, snapshot trước sửa ở `before/`, ảnh ở `farmer-in-village.png`. Các tệp này nằm trong CAP-NHAT và được Git bỏ qua.

## Tệp tạo/sửa

| Tệp | Nội dung |
| --- | --- |
| `MAP/regions/lang-viet/gameplay.json` | Thêm Nông dân và cấu hình model/clip/vị trí |
| `MAP/regions/lang-viet/dialogues.json` | Lời chào, giới thiệu nhiệm vụ và hướng dẫn |
| `MAP/regions/lang-viet/quests.json` | Liên kết đúng NPC với QUEST_LV_03, cập nhật lý do chưa mở |
| `MAP/landscape.js` | Đoạn lối đất bên hàng rào |
| `SOURCE-CODE/js/village-npcs.js` | Hỏi trạng thái nhiệm vụ, nhận/trả có kiểm tra, phản hồi agree |
| `SOURCE-CODE/js/app.js` | Dấu cache dữ liệu NPC |
| `SOURCE-CODE/index.html` | Dấu cache cho script |
| `SOURCE-CODE/tests/nong-dan-gltf.test.cjs` | Mới: 9 bài kiểm tra |
| `SOURCE-CODE/tests/village-npcs.test.cjs` | Cập nhật tổng số NPC/đạo cụ |
| `SOURCE-CODE/tests/npc-gltf.test.cjs` | Cập nhật tổng số NPC/đạo cụ |
| `SOURCE-CODE/tests/vo-su-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/tuan-dinh-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/thay-do-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/thay-thuoc-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/tho-ren-gltf.test.cjs` | Cập nhật tổng số NPC |
| `SOURCE-CODE/tests/tap-hoa-gltf.test.cjs` | Cập nhật tổng số NPC |
| `package.json` | Thêm test Nông dân |
| `SOURCE-CODE/docs/nong-dan-glb.md` | Báo cáo này |

Chơi thử tại `http://localhost:8001/SOURCE-CODE/index.html`: **Ctrl+F5 → vào game → Công cụ → Dân làng → Đi tới Nông dân → Nói chuyện (F)**.
