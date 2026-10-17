# Liên Tiễn — Cung

Mã chiêu `bow.lien-tien`, ô kỹ năng 2. Tích hợp trên nhánh `cap-nhat`, nền `844f75bd4ee86c75e44b61c2dfd6d9892aea3b16` (đã có sửa vật cản đình/cây đa của Claude).

## Căn cứ

- Đã xem ảnh người dùng, lưu tại `SOURCE-CODE/docs/lien-tien-reference.png`: cung thủ bên trái, tên vàng tỏa quạt, khí xanh uốn quanh các đường bay, chớp sao tại mục tiêu, dải khí vàng quanh người. Bốn khung minh họa: tụ lực, liên tiễn, tỏa tiễn, trúng đích.
- Ảnh tĩnh không cho biết thời gian, chuyển động khớp hay tốc độ. Ba nhịp kéo–nhả dây, hướng quạt và hồi thế là động tác được tác giả mã nội suy từ ảnh; cần đối chiếu bằng WebGL thật.
- Số mũi tên, thời gian nhả, thời gian chiêu, cooldown, tầm và bán kính lấy từ runtime Cung đang có. Không tăng số mũi tên chỉ để giống số nét sáng trong ảnh.
- Hai GLB nhân vật nam/nữ thật đã được nạp qua GLTFLoader để đo tư thế. Liên Tiễn dùng IK bổ sung lên tư thế idle, không giả nhận một clip GLB có tên “Liên Tiễn”.

## Timeline

| Khoảng/mốc (giây) | Hành động | Nguồn |
|---|---|---|
| 0–0,25 | Giương cung, tay giữ ổn định, kéo dây, khí xoắn quanh thân và đầu tên | Mốc 0,25 có sẵn; nội suy chuyển động mới |
| 0,25 / 0,37 / 0,49 | Nhả 3 mũi tên, đổi hướng nhẹ từ phải qua giữa sang trái | 3 nhịp cách 0,12 giây của runtime cũ |
| Sau mỗi nhả 0,035 giây | Dây bật về rồi tay kéo mũi kế tiếp | Thiết kế động tác |
| 0,62–0,90 | Hạ lực, hồi tay về idle; trả điều khiển di chuyển ở 0,90 | Thiết kế động tác |
| 1,21 / 1,33 / 1,45 | Mốc bay hết tầm tối đa của từng tên nếu không chạm | Runtime cũ |
| 1,80 | Kết thúc chiêu và dọn effect | Cấu hình hiện hành |
| 3,00 | Hết cooldown, tính từ cast thành công | Cấu hình hiện hành |

Tầm 11 m, bán kính quét 0,28 m. Góc từng mũi `+atan2(0.99,11), 0, -atan2(0.99,11)` radian; giữ bề rộng quạt xấp xỉ runtime cũ. Vị trí phát được tính theo pose đã đo, đầu tên cách gốc nhân vật 1,117 m theo hướng bắn; độ cao 1,7645 m với mẫu nhân vật cao 2,35 m. Tay phải giữ cung, tay trái kéo dây theo socket của hai GLB hiện hành. Không dịch root để tạo cảm giác bắn.

## Lớp hình ảnh

- Tụ khí: 1–2 dải xoắn vàng/xanh quanh thân; quầng sáng bám `weaponTip` thật.
- Phát: chớp ngắn tại đầu tên đúng từng nhịp.
- Bay: đầu tên vàng có lõi sáng ấm, hai mặt vệt kéo dài, 1–2 dải khí xanh xoắn theo; tên tỏa ba hướng trong mặt phẳng ngang.
- Trúng: sao sáng tám tia, hạt vàng/xanh tản ngắn và rung camera nhỏ theo tùy chọn camera game. Chỉ hiện sau tiếp xúc mục tiêu đã được host xác nhận hoặc vật cản đã đăng ký.
- Bắn hụt: tên tắt khi hết tầm, không tạo nổ ở điểm đến.
- Icon: ba mũi tên vàng tỏa quạt, cung vàng, nền xanh đậm và khí xanh. PNG ở `ASSETS/ui/skills/bow/lien-tien-gold-blue.png`. CSS dùng 85% trong ô tròn, giữ tên chiêu/phím và lớp cooldown là DOM.
- Low: 24 đoạn/dải, một dải khí thân/mỗi tên, 6 hạt chạm. Medium/High: 48 đoạn, hai dải, 10 hạt. Gameplay giống nhau.
- Âm thanh: chỉ có tiếng thử tùy chọn ở preview độc lập. Không thêm nhạc, tự phát tiếng hay một audio engine mới vào game.

## Va chạm và tích hợp

`target-query` chỉ thu thập ứng viên, luôn trả false cho host và không cấp tiến trình. `hit-window` xác nhận duy nhất mục tiêu gần nhất theo phần quãng đường đã quét. Mỗi tên dừng ở mục tiêu hoặc vách đầu tiên; một mục tiêu có thể nhận cả ba mũi nếu thật sự nằm trong cả ba đường quét. Không xuyên như Xuyên Tiễn. Bắt đầu quét từ thân đến đầu tên để chặn lỗi vượt vách sát mặt. Tường thắng mục tiêu cùng điểm tiếp xúc; thứ tự đăng ký mục tiêu/vật cản không quyết định kết quả.

Game hiện có bia luyện công và tiến trình nhiệm vụ. Adapter gọi `VietVillageNPCs.onSkillUsed(event)` tại tiếp xúc thật; không tự thêm damage, mana, EXP, quái mới hoặc luật thưởng. Các NPC hòa bình vẫn theo cấu hình đang có. Vật cản lấy từ `projectileBounds()` và ground sampler hiện hành, bao gồm đình/cây đa của bản Claude mới nhất; không tuyên bố mọi mesh trang trí đã có collider.

Đổi vũ khí, khóa/ẩn game, đổi map, chết và hủy dùng vòng đời hiện có. Hủy trước nhả không phát tên; hủy giữa chiêu không phát thêm tên, không hoàn cooldown. Callback quét giữ lại sau frame/hủy trả false. Geometry, material và hạt thuộc Core được dọn theo chủ sở hữu. Giữ duy nhất update loop và renderer hiện tại.

## Kiểm tra hình ảnh trên Claude

Mở HTTP từ gốc repo: `python -m http.server 8000`, rồi mở `http://localhost:8000/SOURCE-CODE/lien-tien-cung-preview.html`.

Chọn nam/nữ, Low/Medium/High, góc bên hông; dừng và bước 0,05 giây. Kiểm tra ba lần nhả, tay trái bám nock, tên tách tại đầu cung, vệt khí không quay ngược. Thử ba bia, bắn hụt, vách chắn, hai bia nối tiếp. Bia chỉ chuyển màu khi trúng; bia sau vách và bia thứ hai trên cùng đường không bị xuyên. `?test` mở ở trạng thái tạm dừng; `window.lienTienPreview` có cast/step/reset và nhật ký event để tự động hóa trong trình duyệt.

Sau đó vào game thật, trang bị Cung, bấm ô 2; thử hồi chiêu, đổi vũ khí/map, chết/hủy, nhiệm vụ Võ sư và các chiêu cũ. Chụp/quay tại 0,20; 0,25; 0,37; 0,49; 0,75; 1,25 giây. Đo FPS/draw calls bằng trình duyệt thật. Kiểm tra shader console và Network (icon/module không 404).

Logic Node và số đo rig không thay cho kiểm tra hình ảnh/GPU. Môi trường Codex này chưa cài được Chromium vì CDN trả trang Site Unavailable; chưa có video/screenshot WebGL của Liên Tiễn và chưa triển khai Alpha trong lần bàn giao này.
