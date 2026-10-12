# Điều kiện vào Đồng Tre

Thực hiện trong `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`. Không sửa bản chính, không commit/push/deploy hoặc thay đổi Firebase thật.

## Quy tắc hiện tại

Cấu hình duy nhất nằm ở `MAP/region-access.js`:

- `mode: 'gameplay'` **đang được bật** trong bản CAP-NHAT. Yêu cầu cả `tutorials.movement` và `tutorials.skills` hoàn tất. Không dùng biến `mode` của ngân hàng Toán (`core`/`advanced`).
- `mode: 'testing'` vẫn được hỗ trợ để kiểm thử riêng, nhưng không phải cấu hình chạy hiện tại. Chế độ này bỏ qua yêu cầu nhiệm vụ; vẫn phải có đăng nhập hợp lệ, nhân vật sống/cấp phù hợp, đích tải được và không chuyển cảnh đồng thời.
- MAP: `ngoai-lang-dong-tre`; cấp nhân vật tối thiểu **1**; phí **0**. Không đọc/trừ điểm học tập hoặc túi tiền.
- MAP và spawn phải có trong registry; factory phải có, dựng được cảnh, đúng ID, sàn/va chạm và spawn an toàn.
- Nhân vật phải còn sống; không có chuyển vùng, dựng vùng hoặc chuyển nội thất đang chờ.
- Giữ kiểm tra đăng nhập, đã vào game và đã ra khỏi nội thất như trước.

Atlas dùng spawn `village-entry`; cổng E từ Làng Việt dùng `from-lang-viet`. Hai điểm cùng áp dụng chính sách Đồng Tre. Quay về Làng Việt không yêu cầu lại hai nhiệm vụ Đồng Tre.

## Một hàm kiểm tra chung

`VietVillageRegions.checkTravelAccess(mapId, spawnId, {loadDestination})` trả `{ok, code, message}` khi từ chối và thêm `ready/mapId/spawnId/requirements` khi đạt.

- Atlas gọi với `loadDestination: true` để chuẩn bị cảnh thật trước khi hiện Sẵn sàng, hiển thị nguyên lý do từ hàm chung, rồi kiểm lại lúc bấm Đến khu vực.
- Cổng E/nút chạm xem điều kiện gần cổng; khi nhấn, dùng `travelTo()` gọi cùng hàm với `loadDestination: true` trước khi chuyển.
- API `canTravelTo` cũ là wrapper boolean; lời gọi xem trước không tự dựng scene, vì vậy `ok` không đồng nghĩa đã tải khi `loadDestination: false`. Thuộc tính `ready` biểu thị scene đã có.
- Điều kiện được đọc lại sau khi dựng đích và ngay trước commit. Cờ `preparing/transitioning` chặn việc gọi chuyển lồng nhau và được giải phóng bằng `finally`, kể cả khi lỗi.
- Điều khiển tự vào cổng Tân Thủ cũng tuân theo trạng thái sống/chuyển cảnh nhưng giữ cách đứng 0,8 giây. Không sửa cấu trúc scene hoặc các spawn.

Nếu tải/kiểm tra đích thất bại, không đổi MAP/vị trí/camera nguồn. Nếu lỗi trong commit, cơ chế rollback cũ phục hồi nguồn. Không tự lặp việc tải mỗi frame. Atlas có thể chọn lại điểm để thử lại; cổng E cần rời vùng rồi tiến lại.

## Trạng thái nhân vật và hai nhiệm vụ hướng dẫn

Nguồn game cũ chưa có HP/chết/hồi sinh, cấp nhân vật RPG hoặc hệ thống nhiệm vụ hướng dẫn. `level` hiện có là chỉ số câu Toán, không được dùng để suy ra cấp nhân vật.

`SOURCE-CODE/js/player-journey.js` tạo trạng thái riêng `VietVillageJourney`:

- Nhân vật đã xác thực bắt đầu `alive: true`, `level: 1`.
- Không xác thực/không đọc được trạng thái thì đóng quyền chuyển.
- Hệ thống chiến đấu/cấp độ sau này có thể gọi `setCharacterState({alive, level})`; dữ liệu sai bị từ chối. Chưa thêm chiến đấu, sát thương hoặc nút hồi sinh trong thay đổi này.
- Nhiệm vụ `movement`: tự đi ít nhất **3 m** bằng WASD, phím mũi tên hoặc joystick. Chỉ cộng quãng đường đã đi sau va chạm; không tính giữ phím vào tường, dịch chuyển hoặc tự dẫn đến cổng.
- Nhiệm vụ `skills`: trang bị vũ khí, dùng phím 1/2/3 hoặc nút chiêu để thực hiện ít nhất một chiêu thành công. Chọn vũ khí, chiêu không hợp lệ, bị khóa hoặc cooldown không tính.
- Có thông báo khi hoàn thành. Cờ hoàn thành được giữ theo UID Google trong localStorage `viet-village:journey:v1:<UID>`; chỉ lưu hai boolean, không lưu email/token/mật khẩu. UID đổi hoặc đăng xuất thì xóa trạng thái đang chạy và quãng đường dở dang; chỉ phục hồi cờ hoàn tất của đúng UID.
- Hai nhiệm vụ vẫn ghi nhận thao tác thật khi thử nghiệm, nhưng chưa dùng để chặn Đồng Tre trong chế độ đó.

Đây là tiến độ hướng dẫn **cục bộ**, không phải kết quả học tập đã xác thực phía máy chủ. Khi bật game multiplayer production, cần bổ sung nguồn trạng thái/nhiệm vụ phía máy chủ và kiểm tra admission trên backend. Bản này không thay đổi Firebase rules, không ghi Firestore/Realtime Database.

## Tệp thay đổi

Tạo mới:

- `MAP/region-access.js`: chế độ, cấu hình cấp/phí/nhiệm vụ và đánh giá trạng thái.
- `SOURCE-CODE/js/player-journey.js`: trạng thái nhân vật và ghi nhận hướng dẫn theo UID.
- `SOURCE-CODE/tests/player-journey.test.cjs`: trạng thái, dữ liệu UID, tích lũy di chuyển, thành công/cooldown của kỹ năng.
- `SOURCE-CODE/tests/region-access.test.cjs`: điều kiện vào, khóa chuyển cảnh, lỗi tải, bảo toàn nguồn.
- `SOURCE-CODE/docs/dong-tre-access.md`: tài liệu này.

Chỉnh sửa:

- `SOURCE-CODE/js/region-travel.js`: hàm kiểm chung, khóa chuyển cảnh, lý do tại cổng và recheck trước commit.
- `SOURCE-CODE/js/world-atlas.js`: trạng thái/cấp/phí/lý do từ hàm chung, recheck lúc bấm.
- `SOURCE-CODE/js/app.js`: khởi tạo journey, ghi nhận đi bộ sau collision, khóa khi đăng xuất.
- `SOURCE-CODE/js/weapons-village.js`: callback sau chiêu thành công; không đổi hình học hoặc hiệu ứng.
- `SOURCE-CODE/index.html`, `SOURCE-CODE/load-order.json`: tải hai script mới và phiên bản cache.
- `SOURCE-CODE/tests/world-atlas.test.cjs`: kiểm lý do từ chối và luồng atlas dùng manager thật.
- `package.json`: thêm `test:access` vào bộ kiểm hiện có.
- `SOURCE-CODE/docs/dong-tre.md`: dẫn tới điều kiện vào mới.

## Kiểm thử khi xây dựng cơ chế admission

Đây là kết quả của đợt trước, khi mặc định còn là testing. Cấu hình hiện tại đã chuyển sang gameplay; xem [báo cáo bật chế độ chơi và kiểm tra hồ sơ riêng](dong-tre-gameplay-check.md).

- `npm test`: **158/158 Node tests đạt**, kèm 4 chương trình kiểm hình học/môi trường cũ. Nhóm admission/journey mới 14/14; atlas 15/15; toàn bộ kiểm thử VFX, nội thất, toolbar và chuyển vùng vẫn đạt.
- Kiểm tự động: UID độc lập, localStorage lỗi, trạng thái nhân vật sai, cấp 0, nhân vật chết, thiếu từng/hai hướng dẫn, mode sai, auth hết hiệu lực, house transition, reentry lúc dựng/commit, cảnh dựng lỗi và spawn lỗi. Từ chối không đổi MAP/vị trí/camera/điểm; khóa luôn giải phóng. Không lặp tải trong vòng frame.
- Browser localhost với phiên Google thật: chế độ thử nghiệm vào được Đồng Tre khi hai hướng dẫn chưa hoàn thành; hiện cấp 1 và phí 0.
- Tạm đổi cấu hình sang gameplay để kiểm: atlas vô hiệu nút và cổng E cùng báo thiếu cả hai hướng dẫn; người chơi vẫn ở Làng Việt. Sau đi bộ thật, chỉ còn lý do thiếu kỹ năng. Sau trang bị Kiếm và dùng chiêu thành công, atlas chuyển sang Sẵn sàng và vào được Đồng Tre. Cổng E hai chiều cũng hoạt động, giữ Kiếm.
- Cuối đợt kiểm thử ban đầu đã trả cấu hình về testing. Kết quả này chỉ mô tả đợt cũ; cấu hình hiện tại là **gameplay** theo yêu cầu tiếp theo của người dùng.
- Không có lỗi JavaScript/WebGL trong lượt kiểm browser. Cảnh báo deprecated của Three.js classic cũ vẫn tồn tại.
- 8 URL mã/config/HTML quan trọng qua localhost trả **HTTP 200**, SHA-256 khớp bản trên ổ đĩa. Atlas test kiểm thứ tự tải và chữ hoa/thường của toàn bộ script/styles/images.
- 30/30 ảnh và tệp gói atlas gốc giữ nguyên SHA-256. Cảnh, mô hình, nội thất, tài nguyên ảnh không sửa trong đợt này.
- Trạng thái chết/cấp 0/lỗi tải được thử có kiểm soát trong harness, không gây hỏng dữ liệu hoặc dựng sự kiện chiến đấu giả trong tab người dùng. Không thử lại điện thoại vật lý hoặc hai tài khoản/phòng multiplayer trong đợt này.

Các log/screenshot lưu tại `.cache/region-access/`, không thuộc dữ liệu game hoặc bản chính.
