# Võ sư: mô hình và động tác tương tác

Kiểm tra ngày 12/10/2026 trong `VIET-VILLAGE-3D-CAP-NHAT`, nhánh `cap-nhat`.

## Tích hợp

- Model gốc: `CHARACTERS/NPC/LANG_VIET/VO_SU/NPC_LANG_VIET_VO_SU.glb`, 10.846.796 byte. Giữ nguyên tệp.
- SHA-256: `b48184d7bc9e0fc8b60561fa822dd7a2c1d7cc817391a48390f73e065eb489bb`.
- Giữ ID `NPC_LANG_VIET_VO_SU`, MAP `lang-viet`, liên kết nhiệm vụ và bia tập.
- Tái sử dụng bộ nạp GLTF r160, hệ thống hiển thị tên, tiếp cận, va chạm, hội thoại và lưu nhiệm vụ của Lý trưởng.
- GLB có 65 xương, 19.826 đỉnh, 17.849 tam giác, một chất liệu. Ba ảnh nhúng phục vụ màu, normal và metallic/roughness; không phụ thuộc texture bên ngoài.

## Vị trí và kích thước

Đình trong `BUILDINGS/temple.js` có gốc `(0, 0.24, -19)`, rộng 12,5 đơn vị. Sân tập đang có ở bên phải đình, với bia tại `(10.7, 0.3, -16.4)`.

Giữ điểm neo NPC `(8.1, 0.3, -16.6)` và điểm tiếp cận `(8.1, -14.6)`. Raycast vào mesh mặt sân thực tế cho `y=0.25`, trong khi sàn điều hướng chung trả `0.3`. Vì vậy mô hình có `groundOffset=-0.05`; không đổi mặt sân hay thuật toán điều hướng chung. Chân mô hình nằm ở `y=0.25`. Chiều cao tư thế idle là `2.4`, tương xứng người chơi.

Kiểm tra vòng trống bán kính 1,45 quanh NPC không vướng vật cản trong cấu hình đi lại. Điểm này nằm ngoài nền đình, cách bia hơn 2,5 đơn vị; không lấy tọa độ từ bản schematic.

## Động tác và hội thoại

| Tình huống / lựa chọn | Clip chính xác | Thời lượng gốc |
| --- | --- | --- |
| Đứng chờ | `idle` | 15,333 giây, lặp vô hạn |
| Bắt đầu hội thoại | `bow` | 6 giây, một lần |
| Khởi động | `warm_up` | 18,292 giây, một lần |
| Xem đòn tay | `box_02` | 2,792 giây, một lần |
| Xem đòn chân | `front_kick_01` | 2,5 giây, một lần |
| Nghe hướng dẫn | `fold_arms` | 17,083 giây, một lần |

Lời chào: **“Muốn vững tay, trước hết phải vững thế. Con đã sẵn sàng luyện tập chưa?”**

- Đến gần hiện tên Võ sư và nút **Nói chuyện**; F cũng mở hội thoại.
- Chuyển giữa idle và động tác bằng crossfade 250 ms. Động tác chạy `LoopOnce`, kết thúc rồi về idle.
- Nút động tác bị khóa trong lúc diễn và chuyển tư thế. API cũng từ chối yêu cầu lặp; không có hàng đợi nhiều động tác.
- Đóng bằng **Kết thúc**, nút ✕ hoặc Esc sẽ trả điều khiển và chuyển về idle. Mở lại trong lúc chuyển tư thế chỉ chờ một lời chào mới, không chồng clip.
- Bảng Võ sư nằm bên phải trên desktop để nhìn thấy nhân vật; màn hình hẹp dùng bảng dưới có cuộn. Hội thoại Lý trưởng giữ bố cục cũ.
- **Nghe hướng dẫn** hiện nội dung điều khiển và luyện bia đã có. Các lựa chọn nhiệm vụ, chọn vũ khí và đi tới bia vẫn được giữ.
- Bù chuyển động ngang của xương Hips trong nhóm hiển thị để NPC không trôi khỏi điểm neo. Kiểm tra chân trên cả hai bàn chân để động tác đá không kéo chân trụ chìm xuống đất.
- Gom điểm kiểm tra chân theo ô nhỏ: mô hình này dùng 112 điểm mỗi khung hình thay vì duyệt gần 2.000 đỉnh giày. Lý trưởng vẫn dùng 64 điểm như trước.
- Khi tải GLB/texture/clip lỗi, giữ nhân vật dự phòng và báo tên NPC bị lỗi trong **Dân làng → Thử lại**; không bật các nút biểu diễn khi chưa sẵn sàng.

## Tệp sửa / tạo

Cập nhật:

1. `CHARACTERS/npc-gltf.js`: phát một lần, crossfade, khóa động tác đồng thời, giữ vị trí và chân trụ.
2. `CHARACTERS/village-npcs.js`: truyền cấu hình GLB Võ sư, độ lệch chân và trạng thái animation.
3. `MAP/regions/lang-viet/gameplay.json`: model, idle, danh sách động tác, tỷ lệ và độ lệch mặt đất.
4. `MAP/regions/lang-viet/dialogues.json`: lời chào và bốn lựa chọn biểu diễn, giữ nội dung hướng dẫn cũ.
5. `SOURCE-CODE/js/village-npcs.js`: nối UI vào động tác, cúi chào, kết thúc và thông báo tải theo từng NPC.
6. `SOURCE-CODE/css/village-npcs.css`: bảng biểu diễn, trạng thái nút và bố cục màn hình hẹp.
7. `SOURCE-CODE/index.html`: vùng lựa chọn/trạng thái động tác và phiên bản URL tránh cache cũ.
8. `SOURCE-CODE/js/app.js`: phiên bản URL dữ liệu NPC.
9. `SOURCE-CODE/tests/npc-gltf.test.cjs`: giữ fixture riêng của Lý trưởng khi catalog có thêm model Võ sư.
10. `package.json`: thêm bài kiểm tra Võ sư vào lệnh `test:npcs`.

Tạo mới:

- `SOURCE-CODE/tests/vo-su-gltf.test.cjs`.
- `SOURCE-CODE/docs/vo-su-glb.md`.

## Kiểm tra

- `npm test`: **184/184 bài đạt**, cộng bốn bộ kiểm tra logic/hình học nhà, môi trường và ánh sáng.
- Sau bổ sung xử lý mở lại nhanh: `npm run test:npcs`, **21/21 bài đạt**.
- GLB thật: parse skeleton, ba texture, sáu clip; idle chạy qua hai chu kỳ. Cả năm động tác phát đúng một lần, có pha chuyển về idle, từ chối 20 lần gọi liên tục khi đang bận.
- Lấy mẫu toàn bộ bounds mô hình trong các clip: sai lệch chân dưới 0,002 đơn vị, điểm Hips không trôi ngang; điểm neo và va chạm không đổi. Đã kiểm tra cả kết thúc sớm và mở lại khi đang fade.
- Controller thật: cúi chào, bốn lựa chọn, hướng dẫn, kết thúc; Lý trưởng tiếp tục `idle.001`, nhiệm vụ và số NPC không đổi.
- Node giả lập bước giải mã pixel ảnh; kết quả hiển thị chất liệu được kiểm tra riêng trên trình duyệt.
- Trên `http://localhost:8001/SOURCE-CODE/index.html`: vào game bằng phiên Google có sẵn; tiếp cận Võ sư; thấy tên/nút và lời chào đúng; quan sát cúi chào, Khởi động, đòn tay, đòn chân, Nghe hướng dẫn; mỗi động tác trả nút về trạng thái sẵn sàng. Kết thúc hội thoại, đi bộ và trò chuyện lại với Lý trưởng được.
- Trong phiên kiểm tra không thấy lỗi tải texture, JavaScript hoặc WebGL; còn cảnh báo cũ của Three.js về bản build classic.
- Có lúc chức năng tự đi cũ dừng cạnh chậu cây trước đình; đã đi vòng bằng WASD để kiểm tra tiếp. Thay đổi này không sửa thuật toán tự đi chung.
- Chưa thử trên điện thoại thật hoặc đánh giá hiệu năng nhiều thiết bị. Ảnh/log kiểm tra nằm trong `.cache/vo-su-glb/`, được Git bỏ qua.

Chỉ thay đổi bản CAP-NHAT. Không sửa model gốc hoặc tiến độ người chơi; không cập nhật bản chính, commit, push, triển khai website hay đổi Firebase.
