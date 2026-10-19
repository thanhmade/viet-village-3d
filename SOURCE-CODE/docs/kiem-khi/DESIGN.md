# Kiếm Khí — hệ Kiếm, ô 3

## Nguồn và phạm vi

- Ảnh người dùng `image(20261019-145754).png`, bản gốc giữ tại `SOURCE-CODE/docs/kiem-khi-reference.png`.
- Mã nền: `thanhmade/viet-village-3d`, nhánh `cap-nhat`, commit `bb6921e9c3725da6ace9f1bf1ed11f570bd4f5f8` (đã có Kiếm Hoa).
- Đã quan sát: nhân vật hạ thế và duỗi tay theo trục phát; vòng khí xanh trắng trước tay; một mũi kiếm khí lớn nhọn, lõi trắng, đường vàng, luồng khí dọc; điểm chạm tỏa mảnh sáng. Dải dưới ảnh thể hiện tụ vòng → phóng → bay → va chạm.
- Ảnh tĩnh không chứng minh số giây, chuyển động chân, sát thương hoặc khả năng phá công trình. Timeline và kỹ thuật chuyển động dưới đây là thiết kế triển khai. Không suy chữ “xuyên phá mọi chướng ngại” thành quyền phá MAP hoặc xuyên collider.
- Dùng engine Three.js r160, hai GLB nam/nữ và mô hình kiếm thật của game. Không thay rig, renderer hoặc cảnh game.

## Timeline đã triển khai

| Mốc | Động tác | Kỹ xảo và sự kiện |
|---|---|---|
| 0–0,42 s | Hai chân lần lượt vào tấn, hạ hông, thu kiếm về sườn | Khí bắt đầu hội tụ sát mũi kiếm |
| 0,42–0,89 s | Giữ chân trụ, xoay nhẹ hông/ngực để tích lực | Ba vòng nén ngược chiều, sợi khí và mảnh nhỏ hút vào tâm |
| 0,89–1,04 s | Chuyển lực qua hông, đâm thẳng kiếm; tay trái giữ thế | Vòng co lại, tâm sáng tăng; phát đúng 1,04 s |
| 1,04–1,56 s | Giữ thế đâm rồi hấp thụ phản lực | Một kiếm khí có lớp mặt cong, lõi trắng, đường vàng và đuôi kéo dài; va chạm quét liên tục |
| 1,56–1,80 s | Giữ dư lực | Điểm chạm tỏa chớp ngắn và mảnh; hụt thì chỉ tan khí |
| 1,80–2,55 s | Thu kiếm, hai chân trở về; trả điều khiển | Dư khí giảm dần |
| 2,55–3,20 s | Điều khiển bình thường | Vòng dư khí mỏng tan hết |

Tổng **3,2 giây**, pose **2,55 giây**, release **1,04 giây**, bay tối đa **0,52 giây**. Đây là thời gian tác giả chọn để người chơi nhìn đủ các pha. Không kéo chiêu theo thời lượng video bàn giao.

Giữ `sword.kiem-khi`, slot/phím **3**, cooldown **2,2 s**, range **11 m**, radius **0,35 m**, forwardOffset cấu hình **1 m**. Anchor runtime dùng mũi kiếm đã gắn vào tay, thay vị trí giả chung. Hồi chiêu bắt đầu tại cast; pose bận vẫn chặn chiêu khác đến 2,55 s. Không thêm cost, tăng damage, đổi rank, reset tiến trình hay thay các chiêu khác.

## Chuyển động, va chạm và tích hợp

`SOURCE-CODE/js/vfx/sword-qi.js` xuất `SwordQi.sample`, `rotation`, `authoredBlade` và đăng ký effect trên `WeaponVFXCore`. `startSwordStrike('sword.kiem-khi')` dùng cùng bộ giải tay/chân trên xương gốc như Nhất Kiếm và Kiếm Hoa; default của API vẫn là Nhất Kiếm. `player-avatar.js` chọn pose này khi dùng ô 3. Bản nhân vật thủ tục cũng được nối vào dispatcher có sẵn.

Hướng actor +Z, caster con -Z; effect đặt trong world space. Mũi kiếm phát theo pose giải tích tại release để không phụ thuộc tốc độ khung hình; kiểm tra GLB xác nhận anchor thực khớp trong 5 mm ở các pha chính. Vòng chuẩn bị bám weaponTip thật. Root gameplay và collider không nhảy dịch chuyển theo cú đâm; hông/ngực chỉ là chuyển động hình ảnh.

- Một mũi kiếm khí dừng ở mục tiêu hợp lệ gần nhất hoặc vách rắn. Không nhân hit theo số sợi, mảnh sáng hoặc khung hình.
- Quét đoạn trước→sau với bán kính 0,35 m; thu ứng viên bằng `target-query` rồi sắp theo khoảng cách. `hit-window` chỉ xác nhận một mục tiêu được host chấp nhận. Host có thể loại mục tiêu không hợp lệ và tiếp tục ứng viên sau.
- Vách trước mục tiêu thắng; vách ngang thân→mũi kiếm cũng được kiểm tra để không bắn xuyên khi đứng sát tường. Mục tiêu ngoài tầm, sau lưng, lệch trục và khác tầng không trúng. Mảnh sáng là trang trí, không collider.
- `target-query.testTarget` luôn false nên không cộng luyện bia khi chỉ truy vấn. Quyền áp dụng tác dụng giữ ở host; game hiện ghi nhận luyện bia. Không thêm hệ damage phía client.
- Chỉ contact mới tạo `impact`, rung nhẹ 0,022 và tia vỡ. Khi hụt, đạn tan ở cuối tầm, không tạo giả va chạm. Va chạm không phá mô hình nhà, tường hoặc đá.
- Đổi vũ khí/MAP/avatar, hủy pose, mất focus, khóa game/chết đi qua cleanup hiện có; hủy cả phần chưa/chớm phát, giữ cooldown, không ghost hit. Callback truy vấn hết hiệu lực sau khi trả về.
- Geometry/material/InstancedMesh do core sở hữu và dọn đúng một lần. Không thêm renderer, RAF, timer damage hoặc listener input trong game. Chất lượng thấp giảm hình học và hạt, giữ nguyên logic.

## Phong cách hình ảnh

Vòng nén có độ dày và nhịp quay khác nhau; dòng khí kéo về trước theo động tác, tránh che toàn thân. Kiếm khí được dựng bằng nhiều mặt cong giao nhau, lõi trắng hẹp, đường vàng có độ tương phản riêng và sợi khí kéo phía sau. Chớp va chạm ngắn, mảnh sáng dùng InstancedMesh có hướng tỏa và giảm tốc. Không dùng video/ảnh phẳng thay chiêu thức.

Icon: `ASSETS/ui/skills/sword/kiem-khi-ice-gold.png`, raster tạo riêng bằng imagegen; một mũi kiếm năng lượng xanh trắng/lõi vàng, vòng khí ở gốc, nền tối, không chữ. CSS tại `SOURCE-CODE/css/sword-skill-icons.css`; tên/phím/cooldown vẫn là DOM đọc được. Cache query đã tăng ở các script liên quan.

Giữ camera game; chỉ dùng hook rung contact sẵn có. Trang `SOURCE-CODE/kiem-khi-preview.html` có góc điện ảnh phụ để kiểm tra, không thay camera game. Chưa thêm ngân hàng âm thanh sản xuất; tiếng tổng hợp tùy chọn ở preview chỉ để thử contact. MP4 bàn giao lấy từ canvas WebGL chạy mã thật; không phải video AI và không chứng minh FPS máy học sinh.

Tham chiếu kỹ thuật chính thức: [BufferGeometry](https://archive.threejs.org/docs/api/en/core/BufferGeometry.html), [InstancedMesh](https://archive.threejs.org/docs/api/en/objects/InstancedMesh.html), [dọn tài nguyên](https://threejs.org/manual/pages/how-to-dispose-of-objects.html). Xem `VALIDATION.md` cho bằng chứng và giới hạn kiểm tra.
