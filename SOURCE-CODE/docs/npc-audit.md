# Rà soát 8 NPC Làng Việt — 12/10/2026

Đã làm việc tại `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`, Git root đúng thư mục này, nhánh `cap-nhat`. Giữ các thay đổi có sẵn; không commit, push, sửa bản chính hoặc Firebase. Không thay thế GLB, bản đồ hay dữ liệu tiến độ của người chơi.

## Lỗi đã sửa

1. Hội thoại không tự đóng khi nhân vật ra ngoài bán kính tương tác. Nay kiểm tra khoảng cách, MAP, chuyển cảnh, trạng thái sống và UID; đóng thì xóa chuyển động đang giữ và trả điều khiển.
2. Mở danh sách Dân làng có thể giữ hội thoại cũ bên dưới. Nay đóng và hủy phiên hội thoại cũ trước khi mở danh sách; chỉ còn một cửa sổ NPC.
3. Callback bài học, kết thúc và chỉ đường của phiên cũ có thể tác động lên phiên mới. Nay gắn mã phiên và kiểm tra phạm vi/quyền tương tác trước khi xử lý. Đóng hội thoại hủy các động tác chờ.
4. Nút Nói chuyện dùng NPC gần nhất từ lần cập nhật trước, cách nhau 0,1 giây. Nay tính lại NPC gần nhất ngay lúc tương tác; từ chối mở hội thoại thứ hai.
5. `START-GAME.bat` dùng `file://`; `START-SERVER.bat` mặc định cổng 8000. Nay cả hai chạy HTTP tại thư mục CAP-NHAT, mặc định 8001, cho đổi cổng. Python khóa độc quyền cổng trên Windows, báo lỗi khi cổng bận và không thay thế tiến trình cũ; chỉ mở trình duyệt sau khi bind thành công.

Bốn bài hồi quy NPC mới đều thất bại trên mã trước sửa và đạt sau sửa. Giữ cơ chế animation hiện có: one-shot, chặn khi bận, fade 0,25 giây về idle; không cần sửa mô hình hoặc tọa độ.

## Vị trí đối chiếu thiết kế với cảnh

Đọc `LANG_VIET_NPC_PORTAL_DESIGN.json`, gameplay/dialogues/quests, các bộ dựng nhà, đình, cổng, vườn và cấu hình NPC. Tọa độ sau là tọa độ cảnh đang dùng, không phải tọa độ schematic. Raycast nền, đường tiếp cận, va chạm NPC, cửa và vòng dịch chuyển có bài kiểm tra trên hình học Three.js thực.

| NPC | Vị trí gốc (x, y, z) | Mốc cảnh thực |
|---|---|---|
| Lý trưởng | 2, 0.31, -12.8 | Sân trước đình, ngoài bậc cuối |
| Võ sư | 8.1, 0.3, -16.6 | Sân bên phải đình, cạnh bia tập |
| Tuần đinh | 6.3, 0.3, 22.25 | Mép phải phía trong cổng, ngoài vùng dịch chuyển |
| Thầy đồ | -8.95, 0.3, 3.83 | Nhà giữa dãy trái, tránh cửa nha-02 |
| Thầy thuốc | 13.05, 0.3, 3.83 | Nhà giữa dãy phải, tránh cửa nha-05 |
| Thợ rèn | -8.95, 0.56, 14.15 | Nhà gần cổng bên trái, cạnh hiên nha-03 |
| Người bán hàng | 13.05, 0.36, 14.25 | Nhà gần cổng bên phải, cạnh hiên nha-06 |
| Nông dân | -8.35, 0.3, 18.6 | Lối đất ngoài hàng rào vườn rau, tránh luống |

Chiều cao mô hình: Lý trưởng 2,35; bảy NPC còn lại 2,4 đơn vị. Giữ groundOffset riêng theo bề mặt và cách đo bàn chân. Các khu học, thuốc, rèn, tạp hóa hiện tái sử dụng nhà dân theo vai trò thiết kế; chưa có đầy đủ đạo cụ nghề riêng như lò/đe và quầy bán hàng.

## Bảng kết quả

**B**: đã thao tác/quan sát trong game bằng trình duyệt tại localhost. **T**: kiểm thử tự động với mã game, dữ liệu và GLB thực; renderer trong harness được mô phỏng, không thay thế kiểm thử GPU. Các trạng thái thử như HP thấp và nhiệm vụ mới nằm trong fixture riêng, không sửa hồ sơ đang chơi.

| NPC | Model | Idle | Hội thoại | Chức năng | Lỗi còn lại / thiếu |
|---|---|---|---|---|---|
| Lý trưởng | GLB, texture hiển thị B; nền/va chạm T | `idle.001`, đúng GLB; lặp/không trôi T | B: đúng tên, lời chào, đóng, chỉ đường Võ sư | B: hiển thị nhiệm vụ đã hoàn thành; T: nhận/trả Chào làng một lần, lưu theo UID | Phần thưởng nhiệm vụ chưa bật |
| Võ sư | GLB, texture hiển thị B; sân tập/bia T | `idle`, lặp T | B: bow, đóng bằng Esc trong động tác | B: warm_up, box_02, front_kick_01, fold_arms; T: luyện kỹ năng đúng hướng/phạm vi, chặn bấm lặp | Phần thưởng nhiệm vụ chưa bật |
| Tuần đinh | GLB, texture hiển thị B; tránh cổng T | `idle`, ambient look_around T | B: greet_01, agree, đóng ngay | B: chỉ đúng sân đình và nút đi tới Lý trưởng; T: đường tới vị trí hiện có | Chưa tuần tra; giữ clip walk chưa bật |
| Thầy đồ | GLB, texture hiển thị B; nền/tay áo T | `idle`, lặp T | B: bow, Học bài, Trả lời câu hỏi, Đóng | B: câu phân số 1/2 = 2/4, sai được thử lại, đúng khóa đáp án; T: agree → clap tuần tự, không lặp | Bài học hoạt động; chuỗi nhiệm vụ/phần thưởng chưa bật |
| Thầy thuốc | GLB, texture hiển thị B; nền T | `idle`, lặp T | B: bow, hỏi thảo dược, Đóng | B: bấm lặp khi HP đầy báo đúng; T: HP 37 → 100, không vượt trần, không hồi sinh hoặc hồi từ xa | Nhánh HP thấp chưa thao tác trực tiếp trong trình duyệt; dược liệu chưa có nhiệm vụ |
| Thợ rèn | GLB, texture hiển thị B; nền T | `idle`, lặp T | B: greet_01, fold_arms, đóng ngay | B: Xem trang bị/Sửa chữa báo chưa sẵn sàng; T: không đổi tiền/vật phẩm/điểm | Thiếu shop, giá, ví/túi đồ giao dịch, độ bền và phí sửa |
| Người bán hàng | GLB, texture hiển thị B; nền/tay áo T | `idle`, lặp T | B: greet_01, Đóng | B: mua/bán bấm lặp đều báo chưa sẵn sàng; T: không cấp/trừ dữ liệu | Thiếu danh mục, giá, ví, túi đồ và quy tắc bán vật phẩm |
| Nông dân | GLB, texture hiển thị B; lối đất/nền T | `idle`, lặp T | B: greet_01, hai mục hướng dẫn, mở/đóng liên tiếp 5 lần | B: QUEST_LV_03 ghi rõ Chưa mở; T: không tự nhận/thưởng, chặn callback cũ | Thiếu mã vật phẩm, số lượng, điểm thu thập, túi đồ, phần thưởng; dig chưa bật vì thiếu công cụ |

## Kiểm tra đã chạy

- `npm.cmd test`: **228/228 bài đạt**, gồm **65 bài NPC**, cùng **4 nhóm kiểm tra hình học/logic**. Bao gồm tên clip GLB, looping, các one-shot trở về idle, không trôi gốc/chìm chân, va chạm, tiếp cận cửa/cổng, giữ một bộ NPC sau 5 lượt rời/quay về, tiến độ theo UID, HP, thao tác lặp và nhánh tải lỗi.
- Đọc trực tiếp cả 8 GLB: idle chính xác; 22 ảnh nhúng được giải mã bằng System.Drawing thành công (1024–4096 px). Bảy model có 3 texture, Lý trưởng có 1; không có ảnh ngoài bị bỏ sót.
- Kiểm tra 78 đường dẫn cục bộ `src`/`href` trong index: không thiếu tệp.
- HTTP 8001 và 8002: index, mã điều khiển NPC, gameplay.json và 8 GLB đều trả **200**, nội dung SHA-256 khớp tệp CAP-NHAT.
- Đã chạy `START-SERVER.bat --port 8002 --no-browser`; log xác nhận root CAP-NHAT. Đã thử START-GAME trên cổng bận: trả lỗi rõ, không mở trình duyệt nhầm hoặc thay server. Server kiểm thử 8002 đã được dừng sau kiểm tra; server chơi thử 8001 vẫn trả 200. Cổng 8000 của bản chính giữ nguyên.
- Trình duyệt 8001: tải lại trang, Firebase xác minh phiên Google thật còn hiệu lực, vào game; tới và trò chuyện đủ 8 NPC, xem model/chất liệu; đóng bằng nút và Esc; bấm câu trả lời sai/đúng, mua/bán lặp, đóng trong animation, mở/đóng Nông dân 5 lần.
- Một lượt **Làng Việt → Đồng Tre → Làng Việt** bằng bản đồ tổng trong trình duyệt: Dân làng bị chặn ở Đồng Tre; trở về danh sách vẫn đúng 8 người, HP 100/100 và trạng thái hai nhiệm vụ hoàn thành được giữ. Kiểm tra chính xác số root/visual/collision không nhân đôi nằm trong bài T.
- Console sau lượt thử: không có lỗi JavaScript/WebGL hoặc tải GLB được ghi nhận; có cảnh báo cũ về Three.js classic build deprecated. Bấm giao diện không thấy phát chiêu ngoài ý muốn; mã input chặn lan truyền sự kiện và bộ kỹ năng từ chối khi có overlay.

Chưa thử lại đăng xuất/đăng nhập Google mới trong lượt này; đã thử khôi phục phiên thật sau reload. Chưa thử điện thoại vật lý, mất mạng thực hoặc giao dịch mua bán hoàn chỉnh (hệ thống đó chưa có). Nhánh đi xa khi hội thoại đang khóa chuyển động được kiểm tra bằng thay đổi vị trí trong fixture, không giả lập thành thao tác đi bộ thành công trong trình duyệt.

## Tệp sửa/tạo trong lượt này

- `SOURCE-CODE/js/village-npcs.js`: phạm vi tương tác, phiên hội thoại, cửa sổ đơn và chọn gần nhất.
- `SOURCE-CODE/index.html`: đổi query version của riêng script điều khiển NPC để tải bản sửa.
- `SOURCE-CODE/tests/village-npcs.test.cjs`: thêm 4 bài hồi quy.
- `START-GAME.bat`, `START-SERVER.bat`: chạy HTTP đúng checkout.
- `scripts/serve-game.py`: server loopback, cổng tùy chọn, khóa cổng Windows.
- `SOURCE-CODE/docs/npc-audit.md`: báo cáo này.

Tệp bằng chứng, log và bản chụp trước sửa ở `.cache/npc-audit/` (đã bị Git bỏ qua); giữ nguyên mọi thay đổi có sẵn. Không sửa gameplay.json, dialogues.json, quests.json hay GLB trong lượt rà soát này.

## Chạy thử

Server hiện có đã được kiểm chứng: **http://localhost:8001/SOURCE-CODE/index.html**.

Khi chưa chạy server, mở `START-GAME.bat` trong CAP-NHAT. Hoặc PowerShell tại CAP-NHAT:

```powershell
.\START-SERVER.bat
# Nếu cần cổng khác:
.\START-SERVER.bat --port 8002
```

Nếu cổng đang bận, dùng server đã xác minh hoặc chọn cổng trống; launcher không dừng tiến trình cũ. Không mở bằng file://. Thay đổi chưa được commit hoặc đẩy GitHub.
