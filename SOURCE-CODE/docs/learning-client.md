# Bộ chuyển đổi nhiệm vụ Tiếng Việt 1

## Phạm vi

- `js/learning-quests.js`: đọc catalog và câu hỏi học sinh; gọi dịch vụ nhiệm vụ qua `invoke(method, payload)` do bước đăng nhập cung cấp. Không chấm đáp án, tự xác nhận giáo viên hoặc cộng EXP trong trình duyệt.
- `js/learning-collectibles.js`: thẻ chữ có khối 3D, hai mặt chữ đọc đúng chiều dùng chung CanvasTexture; chỉ tạo thẻ cho nhiệm vụ đang nhận, tại vị trí máy chủ đã chọn. Nhặt bằng nút chạm hoặc phím G trong phạm vi 1,6 m. Đọc danh sách nhiệm vụ tối đa khoảng 10 lần/giây, vẫn chuyển động thẻ mỗi khung hình; tài nguyên dùng chung được giải phóng đúng một lần.
- `js/village-npcs.js`: giữ nhật ký và hội thoại cũ, thêm callback `onLearningOpen(npcId)` và kiểm tra `isNear(npcId)` để tái sử dụng vị trí thật của NPC.
- Năm mức Khởi đầu – Cơ bản – Tiến bộ – Thử thách – Chinh phục không liên quan LV nhân vật.

## Dữ liệu và tài khoản

ID khung nhiệm vụ giữ nguyên, ví dụ `QUEST_TV1_B033`; câu hỏi chọn một trong `Q_TV1_B033_M1` đến `M5`. Thẻ `ITEM_TV1_B033` tại slot `SP_TV1_B033`. Người giao Tuần đinh, người nhận Thầy đồ, đều dùng ID NPC thực tế của game.

LocalStorage chỉ giữ lựa chọn giao diện dưới `viet-village:learning-selection:v1:<UID>:primary`; không ghi đè hồ sơ nhân vật, EXP, túi đồ hoặc nhiệm vụ cũ. Hồ sơ nhiệm vụ, seed, điểm đặt đã chọn và kết quả phải lấy lại từ dịch vụ sau khi tải trang. Dữ liệu lựa chọn hỏng được giữ nguyên và báo lỗi. Đáp ứng cũ bị loại khi UID/phiên đã đổi. Yêu cầu giống nhau đang xử lý được gộp; backend vẫn phải kiểm tra đồng thời và thưởng nguyên tử.

Ôn lại bài đã hoàn thành yêu cầu rõ `begin(questId, difficulty, mode, npcId, true)`; lần nhận bình thường không gửi cờ `repeat`. Lỗi điều kiện từ máy chủ vẫn giữ kết nối để người chơi đổi chế độ/thử lại; lỗi mạng và phiên xác thực đánh dấu mất kết nối.

Kết quả giáo viên xem/xác nhận học sinh khác không được đưa vào trạng thái nhiệm vụ hoặc EXP của tài khoản giáo viên.

## Điểm đặt thẻ

`LEARNING/TV1-HK1/spawn-placements.json` chứa 20 điểm trong 7 khu vực; 87 khung nhiệm vụ tái sử dụng các nhóm điểm theo khu vực. Điểm Bài 33 ở lối bờ nam ao: `(15, 0.3, 23)`, `(20, 0.3, 23)`, `(10, 0.3, 22.5)`.

Đã kiểm tra tự động từng điểm bằng cảnh GLB thực tế và Three.js r160: raycast mặt đất, chênh cao dưới 0,07 m, `canWalk`, đường đi từ `(0,16.5)`, khoảng cách NPC, vòng vào nhà và vòng chuyển MAP. Điểm chưa đạt đã bị loại; không đổi `null` thành tọa độ mặc định. Các kiểm tra này là kiểm tra cảnh/mã, không thay cho thao tác trình duyệt được ghi riêng trong báo cáo triển khai.

Thẻ không có collider cản đường, chỉ một thẻ của bài đang chọn hiện cùng lúc. Khi chuyển MAP, root Làng Việt giữ lại nhưng ẩn; không tính đường tới điểm Làng Việt trên MAP khác. Lỗi điểm đặt được báo và thử kiểm tra lại có giới hạn tần suất.

## Kiểm tra

Chạy từ gốc CAP-NHAT với Node hiện có:

```powershell
& '.\.local-tools\node-22\node-v22.23.3-win-x64\node.exe' --test SOURCE-CODE/tests/learning-client.test.cjs SOURCE-CODE/tests/learning-collectibles.test.cjs
```

Các test dùng tài khoản giả lập cô lập trong bộ kiểm thử, không đưa dữ liệu đó vào hồ sơ Google thật và không báo chúng là lần đăng nhập thành công. Kiểm thử bao gồm tải đúng catalog, giữ lựa chọn sau tải lại, đổi UID, dữ liệu hỏng, mất backend, kết quả đến muộn, gần NPC, nhặt thẻ, nhấn lặp, chuyển MAP và kiểm tra 20 điểm bằng mô hình thật.

Quyền giáo viên, đáp án và thưởng nằm ở dịch vụ máy chủ. Nếu bản localhost chỉ cho phép xem thử, phần thực hành/EXP vẫn bị chặn rõ ràng; không biến lựa chọn giao diện thành quyền hoặc thành tích.
