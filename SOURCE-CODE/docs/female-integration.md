# Kết nối FEMALE với khởi tạo và game — 12/10/2026

**Cập nhật tiếp theo:** [MALE và bộ điều khiển dùng chung](male-integration.md) đã mở cả Nam/Nữ. Báo cáo này giữ kết quả của lượt FEMALE trước đó.

## Phạm vi và mở bản thử

Đã xác minh Git root đúng `VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.
Giữ toàn bộ thay đổi chưa commit, GLB và các phần ZIP người dùng đã thêm.
Không tìm thấy AGENTS.md trong các thư mục nguồn hoặc các thư mục cha đã kiểm tra.

Mở http://localhost:8002/SOURCE-CODE/index.html và tải lại trang.
Server nhận diện `viet-village-local-v1` phục vụ đúng bản nguồn CAP-NHAT;
9 tệp kiểm tra qua HTTP khớp byte với đĩa, gồm entry, các module và GLB.
Không khởi động/dừng server khác, không thay đổi public-game hoặc Alpha.

Chưa có hồ sơ: Google Login → chọn Nữ → nhập tên → Tạo nhân vật & vào làng.
Đã có hồ sơ: tự tải mẫu đã lưu; Công cụ → Nhân vật để xem lại.
Space hoặc nút Nhảy phát động tác nhảy tại chỗ. Shift + WASD chạy theo điều khiển cũ.
Vũ khí → chọn trang bị → nút chiêu 1/2/3 dùng hệ thống VFX cũ.
Đến NPC, bấm Nói chuyện để xem phản ứng của cả NPC và người chơi.

Để xem toàn bộ 33 clip, mở URL có `?characterTest=1`, rồi
Công cụ → Nhân vật → Kiểm tra hoạt ảnh. Xem hết defeat_02 và defeat_03
trước khi chọn một động tác hết HP cho phiên; không có tên clip `defeat`.

## Tệp thực và cấu trúc

- `CHARACTERS/PLAYER/FEMALE/PLAYER_BASE_FEMALE_GLB.glb`: 13.627.448 byte.
- SHA-256: `39a05b59c38260e4c7bde2f2bb6816bad10faedb40baebd405059a79feef4b72`.
- 65 khớp gốc; xác minh `mixamorig:RightHand` và `mixamorig:LeftHand`.
- 1 skinned mesh, 1 vật liệu, 3 texture nhúng; không có morph hoặc bộ phận ngoại hình tách riêng.
- Giữ modelId `female-base`, cao 2,35 m, trang phục mặc định; không sửa GLB/bộ xương.
- Chưa có PLAYER_BASE_MALE_GLB.glb. Nút Nam bị khóa; không thay bằng nhân vật giả.

33 tên clip đọc trực tiếp từ GLB:

`run, climb, look_around, angry_01, front_kick_01, dig, defeat_03,
run_upstairs, greet_01, slash, shovel, jump_rope_01, cry, box_01,
defeat_02, agree, laugh_01, sit, jump, swim, afraid, cheer, jump_down,
cast_a_spell, bow, hit_to_body_01, idle, clap, walk, fall, chop,
lift_heavy, jump_rope_02`.

## Thay đổi lần này

1. Tái sử dụng màn hình, loader, store theo UID, preview và avatar đã có.
   Lỗi đọc/lưu không được coi là chưa có hồ sơ. Chỉ vào game sau khi lưu
   và tải đúng mẫu thành công. Không sửa LV/EXP/túi đồ/trang bị/nhiệm vụ.
2. Sửa bước vào game: lần vào đầu của phiên hoặc đổi UID dùng điểm
   `lang-viet / village-entry`. Cùng UID được xác thực lại giữ MAP/vị trí
   đang có qua cơ chế startRoaming. Không tự tạo kho lưu vị trí mới.
3. Bố cục desktop cuộn cột tùy chọn độc lập: nhập tên/bấm Chính diện
   không cuộn mất đầu mô hình. Mobile vẫn dùng một vùng cuộn theo chiều dọc.
4. Space/nút Nhảy phát `jump` một lần, chặn lặp khi bận/chết/mở bảng.
   Giữ chuyển động Y tác giả, không cộng thêm Y vào player root.
   Va chạm vẫn trên nền; cổng nhà/cổng vùng tạm không kích hoạt khi đang nhảy.
5. NPC: `bow` với Lý trưởng, Võ sư, Thầy đồ, Thầy thuốc; `greet_01` với NPC khác.
   `agree` chỉ từ thao tác đồng ý/nhận nhiệm vụ/trả lời đúng/hồi HP thành công.
   `clap` sau hoàn thành bài học; `cheer` sau trả nhiệm vụ hợp lệ.
   Không phát thành công cho dịch vụ chưa có, trả lời sai, HP đầy hoặc nhận thưởng lặp.
6. Hàng chờ tối đa hai phản ứng: đồng ý rồi chúc mừng. Đóng hội thoại hủy
   phản ứng xã hội. Nhận đòn ưu tiên riêng; chỉ phát khi HP thực sự giảm.
   `slash` chỉ từ kỹ năng cận chiến thành công, không từ nút hội thoại hay cung.
7. Sửa điểm cầm vũ khí theo tâm cán thực tế từng loại. Trước đây offset của
   kiếm áp dụng cho mọi vũ khí, khiến thương/rìu/cung lệch tay.
   Căn lại khi đổi mẫu/đổi trang bị; giữ transform nhân vật khối và cooldown/VFX.
8. Bỏ một lần dispose GLB thừa trong nhánh lỗi. Preview và nhân vật đang
   chơi có instance riêng; đóng preview không giải phóng tài nguyên của game.

## Kiểm thử thực tế

| Phần | Kết quả và phạm vi |
|---|---|
| Google Login | Người dùng tự đăng nhập trong tab Codex 8002; kiểm tra tiếp bằng phiên thật, không giả lập Firebase |
| Tạo Nữ | Tab này chưa có hồ sơ; tạo hồ sơ cục bộ “Nữ thử nghiệm”, xem model/texture thật và lưu vào làng thành công |
| Xem trước | Toàn thân, idle, nút chính diện; desktop sau sửa không bị cắt đầu khi cuộn cột tùy chọn |
| Di chuyển | Đi bộ thật bằng điều hướng tới Thầy đồ; đến đúng nơi và hiện nút Nói chuyện |
| Nhảy | Bấm Nhảy trong làng, thấy động tác rời nền; chỉ là chuyển động hình thể, không thay collider bằng vật lý nhảy |
| NPC/bài học | Đủ 8 mục dân làng. Mở Thầy đồ, học bài Chìa khóa phân số, chọn 2/4, nhận phản hồi hoàn thành; đóng được hội thoại |
| Chiêu thức | Trang bị kiếm, bấm Nhất Kiếm, thấy động tác/hiệu ứng; tutorial kỹ năng được đánh dấu theo gameplay thật |
| MAP | Bản đồ tổng → Làng Tân Thủ; mẫu Nữ và kiếm giữ nguyên. Đi tới cổng, tự quay về Làng Việt thành công |
| Tải lại | Firebase xác minh lại phiên; tự vào làng với mẫu Nữ, mở hồ sơ vẫn có “Nữ thử nghiệm”, không tạo lại |
| Mobile viewport | Hồ sơ ở 390×844 hiển thị model, vùng cuộn và Trở lại làng; đã trả viewport về bình thường |
| Console/WebGL | Không có lỗi trong các thao tác trên; vẫn có cảnh báo global build Three.js cũ |

Hồ sơ thử chỉ thuộc dữ liệu cục bộ của trình duyệt Codex đang đăng nhập,
không xóa/đổi hồ sơ trong Chrome/Edge, không ghi Firebase.

## Kiểm thử tự động

`npm test`: **284/284 Node test đạt**, cùng 5 script logic/geometry/auth,
exit 0. Log cục bộ: `.cache/female-integration-regression.log`.
Trong đó nhóm nhân vật 49 test, nhóm NPC 69 test.

Bao gồm: mô hình thật/65 khớp/33 clip, feet/root motion, idle/walk/run,
social một lần và trở về locomotion, socket của 5 loại vũ khí ở idle/run/slash,
preview tải đảo thứ tự/chỉ một model/dispose trễ độc lập với game,
storage lỗi/UID cũ/missing/legacy/tạo lặp, thiếu mẫu, HP giảm,
không tự slash, cổng không bật lúc nhảy, giữ pose cùng UID và đổi UID về spawn an toàn.
Node chạy renderer mô phỏng; không coi đó là bằng chứng hiệu năng GPU.
`git diff --check` đạt sau chuẩn hóa xuống dòng của các dòng sửa.

## Phần chưa có hoặc chưa kiểm chứng trực tiếp

- Chưa có vật lý nhảy vượt vật cản, rơi hoặc nhảy lên bậc; collider giữ nền hiện có.
- Chưa có lưu MAP/vị trí qua F5. F5 dùng điểm vào an toàn; chỉ giữ pose cùng phiên
  khi xác thực lại. Trang bị/HP có cơ chế phiên cũ; không bổ sung kho lưu mới.
- Hồ sơ ngoại hình theo UID trong localStorage cùng trình duyệt/origin, chưa đồng bộ cloud.
- Chưa trực tiếp kiểm tra logout rồi Google Login lại lần nữa; đã kiểm tra tải lại với phiên thật và các trường hợp đổi UID bằng test.
- Chạy giữ Shift/WASD, nhận đòn, các clip tương tác riêng lẻ và defeat được kiểm tra tự động/GLB;
  chưa xác nhận toàn bộ từng clip bằng thao tác tay trong browser. Không có hệ thống địch gây sát thương trong làng để thử nhận đòn thật.
- Chưa thử pinch trên điện thoại thật hoặc đo FPS dài hạn. Chưa có tư thế ngón tay theo từng vũ khí hay giương cung hai tay.
- Mẫu Nam và tài nguyên thay tóc/mặt/mắt/mũi/miệng/tai/tuổi/trang phục còn thiếu;
  các lựa chọn giữ trạng thái Chưa có dữ liệu tùy chỉnh.

## Tệp sửa/tạo trong lần tiếp tục này

Sửa runtime/giao diện:

- `SOURCE-CODE/js/app.js`
- `SOURCE-CODE/js/player-avatar.js`
- `SOURCE-CODE/js/village-npcs.js`
- `SOURCE-CODE/js/weapons-village.js`
- `SOURCE-CODE/js/weapons-village-models.js`
- `SOURCE-CODE/js/region-travel.js`
- `SOURCE-CODE/js/house-travel.js`
- `SOURCE-CODE/index.html`
- `SOURCE-CODE/css/player-avatar.css`
- `SOURCE-CODE/css/character-creation.css`

Sửa test:

- `SOURCE-CODE/tests/player-avatar.test.cjs`
- `SOURCE-CODE/tests/player-gltf.test.cjs`
- `SOURCE-CODE/tests/village-npcs.test.cjs`

Sửa README.md, cập nhật liên kết trong `SOURCE-CODE/docs/character-creation.md`,
tạo báo cáo `SOURCE-CODE/docs/female-integration.md` này.
Giữ mã đã làm ở lượt trước; không tạo lại store/preview hoặc sửa file GLB.
Chưa commit, push, merge, deploy; main, Firebase config/Rules và Alpha giữ nguyên.
