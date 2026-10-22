# Cập nhật hệ Rìu trong Claude

| Mục | Giá trị |
| --- | --- |
| Nguồn ZIP và MP4 trên máy người dùng | `H:\CHAT GPT\3D-GAME\SKILL-THAM-CHIEU` |
| Tệp | `Riu-3-Chieu.zip`, `Riu-3-Chieu.mp4` |
| Dự án cần sửa | `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT` |
| Kho mã game | `thanhmade/viet-village-3d` |
| Nhánh | `cap-nhat` |
| Commit nền | `912ac79cdb31461ef443fd6e1825d75e4433b272` |

Commit nền là căn cứ so sánh, không phải lệnh đưa nhánh về phiên bản cũ. Commit cập nhật thực tế nếu đã đẩy được ghi trong `MANIFEST.json` của ZIP và báo cáo bàn giao. Việc có đường dẫn ổ H không đồng nghĩa phiên AI đã truy cập được máy đó.

## Đồng bộ mã

Đọc chỉ dẫn dự án, kiểm tra đúng thư mục Git, origin, nhánh và thay đổi cục bộ trước khi sửa. Khi cây làm việc sạch và nhánh đúng, `git fetch origin` rồi `git pull --ff-only origin cap-nhat`. Nếu có thay đổi cục bộ hoặc phân kỳ, xem diff và ghép phần liên quan; không dùng `reset --hard`, không xóa hay chép đè thay đổi của người dùng.

Nếu mã Rìu đã có trong commit đồng bộ, chỉ dùng ZIP/video làm tham chiếu. Nếu cần dùng ZIP, giải nén vào thư mục riêng; `UPDATE/` giữ đường dẫn tương đối từ gốc game. Đối chiếu `changes.patch` và `MANIFEST.json` rồi ghép tệp; ZIP không chứa đầy đủ vendor, nhân vật hoặc dữ liệu MAP. Không thay toàn bộ game bằng gói này.

## Kiểm tra sau nhập

```powershell
Set-Location -LiteralPath 'H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT'
git status --short
git branch --show-current
git remote get-url origin
npm run test:axe
if ($LASTEXITCODE -ne 0) { throw 'Kiểm thử Rìu chưa đạt.' }
npm run test:spear
if ($LASTEXITCODE -ne 0) { throw 'Hồi quy Thương/Giáo chưa đạt.' }
node --test SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/weapons-village.test.cjs SOURCE-CODE/tests/weapons-vfx.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Hồi quy điều khiển chưa đạt.' }
.\START-GAME.bat --port 8002
```

Nếu thiếu dependencies, dùng `npm ci` theo lockfile trong checkout đầy đủ. Mở `/SOURCE-CODE/riu-preview.html` trên URL localhost launcher trả về. Thử cả hai nhân vật, ba chiêu, chất lượng thấp/cao, bia phía trước/sau lưng, nhiều bia, tường trước/sau bia, hụt, spam, hủy, cất và đổi vũ khí. Đối chiếu video với tay bám cán, mặt lưỡi, chân, hướng chém và thời điểm hiệu ứng. Sau đó kiểm tra thanh kỹ năng và động tác trong trang game thực tế.

## Alpha khi nằm trong yêu cầu triển khai

Đọc `SOURCE-CODE/docs/firebase-hosting-alpha.md`, `.firebaserc`, `firebase.json` và cấu hình site/channel thực tế. Dùng phiên Firebase đã đăng nhập nếu có. Từ checkout đầy đủ, chạy `npm run build:hosting`, `npm run test:hosting` và các gate dự án; sửa lỗi thuộc phạm vi trước khi triển khai. Chỉ triển khai preview channel đã được xác minh và được người dùng giao. Không coi việc push GitHub là deploy Alpha; repo hiện không có workflow tự động triển khai.

Sau deploy, lấy URL/expiry từ kết quả CLI, chạy `scripts/check-hosting-http.mjs --alpha-url <URL thực tế>`, kiểm tra game, asset, console và ba nút Rìu. Báo riêng trạng thái GitHub, máy Claude và Alpha. Không báo hoàn thành khi mới có ZIP, MP4 hoặc tài liệu.

## Khối giao việc

```text
Đọc Riu-3-Chieu.zip và Riu-3-Chieu.mp4 tại:
H:\CHAT GPT\3D-GAME\SKILL-THAM-CHIEU

Cập nhật dự án:
H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT
Repo thanhmade/viet-village-3d, nhánh cap-nhat.

Đọc MANIFEST.json, hướng dẫn và QA trong ZIP. Kiểm tra origin/nhánh/status,
đồng bộ commit trên GitHub khi phù hợp; giữ các thay đổi cục bộ.
Nếu mã đã có thì không áp dụng ZIP lần nữa.

Hoàn thiện ba chiêu Khai Sơn 3,4s; Phá Giáp 2,8s; Cuồng Phong 4,8s.
Giữ ID, tầm, bán kính, hồi chiêu và tiến trình. Hai tay nắm cán rìu,
mép lưỡi đúng hướng đánh, thân cùng xoay khi Cuồng Phong; đủ ba icon.
Phá Giáp hiện là hiệu ứng xác nhận va chạm, không tự thêm giảm giáp.

Chạy test:axe, hồi quy liên quan; dùng START-GAME.bat --port 8002
để xem riu-preview.html rồi kiểm tra game thật, cả nam và nữ.
Nếu Alpha được giao trong phiên này, build/test checkout đầy đủ,
xác minh Firebase project/site/channel và triển khai đúng Alpha.
Tận dụng phiên đăng nhập sẵn có. Báo commit, kiểm thử, URL thực tế,
thời hạn Alpha và phần còn bị chặn; không suy thành công từ video.
```
