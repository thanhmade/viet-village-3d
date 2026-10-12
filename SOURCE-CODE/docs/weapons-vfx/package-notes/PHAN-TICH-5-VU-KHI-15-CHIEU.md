# Phân tích 5 vũ khí và 15 chiêu thức từ 10 ảnh tham chiếu

## Phạm vi đã đối chiếu

Đã mở và xem trực tiếp 5 ảnh vũ khí cùng 5 ảnh chiêu được gửi trong lượt này. Nguồn được liệt kê chính xác trong `MANIFEST-ANH-THAM-CHIEU.json`. Phân tích dưới đây tách rõ nội dung nhìn thấy trong ảnh và các lựa chọn kỹ thuật để dựng một bản thử 3D.

Mỗi vũ khí có **3 chiêu riêng**, tổng cộng **15 chiêu**. Không dùng ba nhãn “tấn công / phòng thủ / diện rộng” cho tất cả vũ khí: ảnh côn có chiêu phòng thủ Hộ Thân, còn những bộ khác thể hiện những kiểu đánh riêng. Số thứ tự 1, 2, 3 là ô kỹ năng của từng vũ khí, không phải ba nhóm dùng chung.

Ảnh `Skill-Thuong(2).png` ghi tiêu đề **Giáo**; tên hiển thị của bản này là **Thương / Giáo**, mã ổn định vẫn là `spear`. Tên chiêu **Xuyên Kích / Thương Phong / Phá Trận** được giữ đúng như ảnh.

## Hình thái vũ khí nhìn thấy trong ảnh

| Mã | Tên | Cấu trúc quan sát được | Màu và chất liệu | Điều cần giữ khi dựng model |
|---|---|---|---|---|
| `staff` | Côn / Gậy | Thân tròn dài, hai đầu bọc kim loại; tay nắm quấn dây ở giữa; họa tiết nổi chạy dọc thân | Gỗ nâu sẫm, kim loại vàng đồng cũ, dây đen | Không thêm lưỡi nhọn; đầu và cuối cân đối; vẫn nhìn rõ tay nắm khi phát chiêu |
| `sword` | Kiếm | Lưỡi thẳng dài, nhọn, hai cạnh; chắn tay ngang có đường cong; đầu chuôi tròn trang trí; chuôi quấn dây | Thép bạc, chắn tay/đầu chuôi vàng đồng, dây đen | Hiệu ứng bám cạnh và mũi kiếm; giữ đường bao của chắn tay; không biến thành đại đao |
| `spear` | Thương / Giáo | Cán dài mảnh; mũi thép dạng lá nhọn; khâu nối và vòng cán bằng kim loại; tua đỏ dưới đầu thương | Gỗ nâu sẫm, thép bạc, vàng đồng, tua đỏ | Hướng đầu thương quyết định hướng đâm; tua đỏ là chi tiết nhận diện vật thể, không phải màu chủ đạo của VFX |
| `bow` | Cung | Thân gỗ cong đối xứng có độ uốn ngược ở đầu; dây cung; vùng cầm giữa quấn dây; nhiều ốp kim loại trang trí | Gỗ nâu ấm, vàng đồng, dây nâu đen | Tên được phóng từ vùng dây/nock; giữ thân cung và dây tách biệt; ảnh vũ khí chưa có model mũi tên |
| `axe` | Rìu | Một lưỡi lớn dạng cong, phía sau đầu rìu có phần nhô ngắn; cán gỗ; tay nắm quấn; khâu kim loại; vòng ở đuôi | Thép bạc xước, gỗ nâu, vàng đồng, da/dây sẫm | Giữ mặt lưỡi rộng và cạnh cong; trọng tâm đầu rìu; không mặc định biến thành rìu hai lưỡi |

Những ảnh nhiều góc là bản tham chiếu hình dáng. Chúng không có số đo, lưới polygon, UV, texture PBR đã tách hoặc skeleton. Kích thước thực, khắc nổi, hoa văn, số vòng dây và bố trí UV cần được dựng thêm. Model procedural trong demo là mẫu thử hình khối, không phải bản 3D đã phục dựng đầy đủ toàn bộ chi tiết từ PNG.

## Bóc tách từng chiêu và các lớp hình ảnh

### Côn / Gậy — xanh ngọc, trắng nhạt và vàng

| Ô | Chiêu / mã | Hình và chuyển động nhìn thấy | Các lớp để tái dựng trong 3D |
|---|---|---|---|
| 1 | Côn Quét — `staff.con-quet` | Vệt quét cong lớn nằm gần ngang, nhiều sợi khí theo quỹ đạo quanh thân; mép sáng vàng; đất bụi và đá bật lên | Dải quét cong có độ dày, đường lõi sáng, nhiều đường khí phụ, vòng bụi thấp, mảnh đá nhỏ |
| 2 | Hộ Thân — `staff.ho-than` | Cầu khí trong suốt bao quanh người; các vòng nằm ngang; hoa văn/phù hiệu vàng dựng đứng trên mặt cầu; vòng ở nền | Mặt cầu hai mặt có độ trong, vành sáng xoay, biểu tượng mô phỏng không có văn tự tùy tiện, vòng chân, hạt sáng |
| 3 | Chấn Địa — `staff.chan-dia` | Côn chạm đất; cột sáng đứng; đường nứt tỏa ra tâm; đá văng; sóng tròn thấp và bụi lan | Luồng sáng đứng, flash tại tâm, vòng lan trên mặt đất, nét nứt ánh sáng, mảnh đá bay theo cung trọng lực |

### Kiếm — xanh băng, trắng và nét vàng mảnh

| Ô | Chiêu / mã | Hình và chuyển động nhìn thấy | Các lớp để tái dựng trong 3D |
|---|---|---|---|
| 1 | Nhất Kiếm — `sword.nhat-kiem` | Nhiều vệt chém cong xếp lớp, đường bay xanh trắng; tư thế thể hiện chuỗi chém; lóe sáng ở phía trước | Nhiều dải chém phát lệch thời điểm, lõi trắng, đường khí mảnh, chớp tại vùng cuối |
| 2 | Kiếm Hoa — `sword.kiem-hoa` | Cánh trong suốt nhọn dạng hoa nhiều cánh nở quanh người; vòng xoay và cánh nhỏ lơ lửng | Các cánh 3D bố trí xuyên tâm, tăng kích thước khi nở, vòng quét thấp, hạt/cánh nhỏ |
| 3 | Kiếm Khí — `sword.kiem-khi` | Vòng tụ lực trước tay; mũi kiếm năng lượng dài tiến thẳng; đuôi nhiều sợi khí; flash cuối đường | Vòng tụ lực đứng theo hướng bắn, mũi năng lượng 3D, vệt kéo sau, chớp va chạm |

Nhất Kiếm có nhiều vệt chém trong ảnh, dù tên ghi “Nhất”. Giữ hình ảnh nhiều lớp; không suy diễn thành một hit duy nhất từ tên. Kiếm Hoa là chiêu đánh dạng hoa năng lượng, không tự gán tác dụng phòng thủ.

### Thương / Giáo — vàng trắng; Thương Phong có xanh ngọc

| Ô | Chiêu / mã | Hình và chuyển động nhìn thấy | Các lớp để tái dựng trong 3D |
|---|---|---|---|
| 1 | Xuyên Kích — `spear.xuyen-kich` | Cú đâm dọc một trục; luồng sáng vàng trắng hẹp từ mũi; vòng lóe tại điểm cuối | Mũi sáng gắn hướng trước, luồng thuôn dài, tia phụ, vòng va chạm đứng |
| 2 | Thương Phong — `spear.thuong-phong` | Quét ngang rộng, vòng khí dày xanh ngọc trắng, cạnh vàng nhạt | Dải vòng quét nằm ngang, luồng phong phụ, hạt khí và bụi thấp |
| 3 | Phá Trận — `spear.pha-tran` | Vòng xoắn vàng trắng theo nhiều độ cao quanh người; tư thế xoay thương; mặt đất và đá bật | Các dải helix đứng, vòng chân, tia vàng, bụi và mảnh đá |

Phá Trận là lốc xoắn phát từ động tác xoay thương, không giống cột nện thẳng của Chấn Địa. Cả hai có bụi đá nhưng hình chính và nhịp chuyển động cần khác nhau.

### Cung — tên vàng, vệt khí xanh lam

| Ô | Chiêu / mã | Hình và chuyển động nhìn thấy | Các lớp để tái dựng trong 3D |
|---|---|---|---|
| 1 | Xuyên Tiễn — `bow.xuyen-tien` | Một mũi tên sáng đi thẳng; vệt vàng chính được bao bởi các đường khí xanh; lóe mạnh ở mục tiêu | Mũi tên 3D, vệt kéo dài, sợi khí xanh, flash kết thúc |
| 2 | Liên Tiễn — `bow.lien-tien` | Nhiều tên tỏa quạt tới nhiều hướng phía trước; đường bay vàng xanh; điểm trúng xuất hiện riêng | Bộ tên có lịch phát, độ lệch góc mỗi tên, vệt kéo riêng, chớp từng điểm |
| 3 | Mưa Tên — `bow.mua-ten` | Vòng gọi trên cao; nhiều tên rơi xuống vùng tròn; đường sáng và bụi/đá ở nền | Vòng trên cao, mũi tên di chuyển theo trục xuống, vòng vùng đáp, chớp/bụi tại các điểm rơi |

Ảnh minh họa Mưa Tên có vùng bùng lửa. Bản thử có thể mô phỏng màu bùng sáng vàng cam bằng vật liệu phát sáng; chưa suy ra trạng thái đốt, damage theo thời gian hoặc số lượng địch thật.

### Rìu — cam đỏ, vàng và bụi đá tối

| Ô | Chiêu / mã | Hình và chuyển động nhìn thấy | Các lớp để tái dựng trong 3D |
|---|---|---|---|
| 1 | Khai Sơn — `axe.khai-son` | Bổ rìu từ trên xuống, vệt cong đứng; cột bùng sáng cao; khối đá lớn bay lên | Dải chém đứng, lõi bùng sáng, nét nứt, bụi và đá bay |
| 2 | Phá Giáp — `axe.pha-giap` | Đòn đánh tập trung phía trước; vệt lửa ngắn; lõi va chạm thấp và nhiều mảnh vỡ | Vệt ngắn, flash tập trung, mảnh vỡ cạnh sắc mô phỏng, vòng va chạm thấp |
| 3 | Cuồng Phong — `axe.cuong-phong` | Nhiều dải lửa xoắn quanh người từ thấp lên cao; bụi kéo thành lốc; đá theo vòng | Helix lửa cam đỏ, vòng sáng phụ, hạt than sáng, đá xoay và văng |

Tên Phá Giáp không tự tạo cơ chế giảm giáp. Mô-đun hình ảnh phát hiệu ứng; logic giáp, máu, va chạm, phạm vi trúng và tính damage thuộc game chủ.

## Các tham số đã chọn cho bản thử

Đây là trị số **do thiết kế**, không phải số đo hay thông tin xuất hiện trong ảnh. Đơn vị thời gian là giây; kích thước là mét theo quy ước 1 đơn vị Three.js bằng 1 mét. Vòng đời dùng thời gian thực từ delta của vòng lặp, không đếm số khung hình.

| Vũ khí | Chiêu | `type` | `duration` | `activeAt`–`activeEnd` | `cooldown` | `radius` | `range` | `forwardOffset` |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Côn | Côn Quét | `sweep` | 1.20 | 0.12–0.75 | 1.40 | 3.20 | 3.20 | 0.00 |
| Côn | Hộ Thân | `shield` | 3.00 | 0.18–2.65 | 5.00 | 1.55 | 0.00 | 0.00 |
| Côn | Chấn Địa | `slam` | 1.80 | 0.38–1.25 | 3.60 | 4.50 | 4.50 | 0.65 |
| Kiếm | Nhất Kiếm | `combo` | 1.30 | 0.12–0.90 | 1.50 | 3.00 | 3.60 | 0.25 |
| Kiếm | Kiếm Hoa | `lotus` | 1.90 | 0.25–1.50 | 3.00 | 3.80 | 3.80 | 0.00 |
| Kiếm | Kiếm Khí | `projectile` | 1.40 | 0.18–1.00 | 2.20 | 0.35 | 11.00 | 1.00 |
| Thương | Xuyên Kích | `thrust` | 1.05 | 0.14–0.75 | 1.30 | 0.50 | 6.00 | 0.80 |
| Thương | Thương Phong | `sweep` | 1.35 | 0.15–0.95 | 2.00 | 3.80 | 3.80 | 0.00 |
| Thương | Phá Trận | `vortex` | 2.20 | 0.25–1.85 | 4.00 | 4.30 | 4.30 | 0.00 |
| Cung | Xuyên Tiễn | `projectile` | 1.50 | 0.18–1.15 | 1.80 | 0.26 | 12.00 | 1.00 |
| Cung | Liên Tiễn | `volley` | 1.80 | 0.25–1.45 | 3.00 | 0.28 | 11.00 | 1.00 |
| Cung | Mưa Tên | `rain` | 2.70 | 0.65–2.30 | 5.00 | 3.80 | 10.00 | 7.00 |
| Rìu | Khai Sơn | `cleave` | 1.70 | 0.40–1.30 | 2.20 | 2.80 | 3.30 | 1.50 |
| Rìu | Phá Giáp | `armor-break` | 1.55 | 0.32–1.10 | 2.80 | 2.25 | 3.00 | 1.50 |
| Rìu | Cuồng Phong | `cyclone` | 2.50 | 0.20–2.15 | 4.50 | 3.60 | 3.60 | 0.00 |

`duration` là tổng vòng đời VFX. `activeAt` và `activeEnd` xác định pha nổi bật của chiêu và cửa sổ mà bộ xử lý gameplay có thể dùng sau khi nối vào game. `radius` là độ rộng/vùng hình ảnh, không phải collision mesh tự động. `range` là cự ly định hướng cho VFX; Hộ Thân dùng 0 vì bao quanh người thi triển. `forwardOffset` dịch tâm/phần xuất chiêu về trước theo trục local -Z; Mưa Tên đặt tâm vùng rơi mặc định 7 m phía trước. Phạm vi va chạm thật cần được kiểm tra trong game chủ.

## Thư viện JS và giới hạn chuyển từ ảnh sang 3D

Dùng Three.js cùng phiên bản đang có trong game. Các hiệu ứng được tái dựng bằng geometry 3D, vật liệu trong suốt/phát sáng và hạt; PNG giữ vai trò tham chiếu. Một PNG không thể tự thành quả cầu hộ thể, vòng xoắn có chiều sâu hoặc mũi tên bay trong 3D chỉ bằng thao tác đổi tên sang `.js`.

Phần dựng có thể dùng `Mesh`/`BufferGeometry` cho dải khí, `SphereGeometry` cho cầu khí, `Points` cho bụi sáng và các mesh nhỏ cho đá. Vật liệu trong suốt cần `depthWrite: false`, độ sáng và độ dày được kiểm tra từ nhiều góc. Chỉ thêm bloom/postprocessing khi tương thích renderer của game và đã đo hiệu năng; màu cộng sáng vẫn có thể làm bản thử mà không cần thêm pipeline hậu kỳ.

Các ảnh thiết kế không cung cấp âm thanh, clip animation, skeleton, hitbox, chỉ số damage, điều kiện mở khóa hoặc quan hệ với trang bị. Không khai báo những phần đó là đã hoàn thành từ ảnh.
