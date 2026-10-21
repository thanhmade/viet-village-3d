# Đưa bộ ba chiêu Thương / Giáo vào Claude và dự án game

Mục tiêu là cập nhật đúng bản làm việc đang có, kiểm tra nhân vật và hiệu ứng thực tế, sau đó mới thực hiện các bước triển khai đã được người dùng cho phép.

| Mục | Giá trị |
| --- | --- |
| Kho mã game | `thanhmade/viet-village-3d` |
| Nhánh làm việc | `cap-nhat` |
| Commit nền dùng để chuẩn bị bản cập nhật | `bac0872d7eef72fe5de6aaa1ef676109bf7a2f96` |
| Thư mục đích trên máy người dùng | `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT` |
| Trang thử ba chiêu | `SOURCE-CODE/thuong-giao-preview.html` |
| Alpha cần đối chiếu | <https://viet-village-3d--alpha-g1lx8owy.web.app/> |

Commit nền là thông tin để đối chiếu thay đổi, không phải lệnh đưa nhánh lùi về bản cũ. Không dùng `reset --hard`, không ghi đè thay đổi ngoài phạm vi ba chiêu và không tự đổi nhánh `main`. Không tự tạo bản sao lưu, tag hoặc release.

## Cách 1 — Mã đã có trên GitHub

Mở terminal của Claude tại thư mục đích. Kiểm tra nhánh và trạng thái làm việc trước khi đồng bộ:

```powershell
Set-Location -LiteralPath 'H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT'
git status --short
if ($LASTEXITCODE -ne 0) { throw 'Không đọc được repository tại thư mục đích.' }

$worktreeChanges = @(git status --porcelain)
if ($worktreeChanges.Count -gt 0) {
    throw 'Có thay đổi cục bộ. Đối chiếu và giữ lại các thay đổi này trước khi đồng bộ.'
}

$currentBranch = git branch --show-current
if ($currentBranch.Trim() -ne 'cap-nhat') {
    throw 'Chưa ở nhánh cap-nhat. Kiểm tra nhánh dự án trước khi tiếp tục.'
}

$originAddress = git remote get-url origin
if ($LASTEXITCODE -ne 0 -or $originAddress -notmatch 'github\.com[:/]thanhmade/viet-village-3d(?:\.git)?$') {
    throw 'Origin chưa trỏ đến đúng kho mã game. Kiểm tra cấu hình repository.'
}

git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'Fetch chưa thành công.' }
git pull --ff-only origin cap-nhat
if ($LASTEXITCODE -ne 0) { throw 'Không thể fast-forward. Cần đối chiếu hai nhánh, không ép ghi đè.' }
git log -1 --oneline
git status --short
```

Nếu có thay đổi cục bộ hoặc nhánh đã phân kỳ, xem diff và tích hợp từng phần liên quan. Không tự xóa thay đổi, tự stash hoặc chọn toàn bộ một phía khi có xung đột. Sau đồng bộ, đối chiếu commit hiện tại với commit bàn giao thực tế trong báo cáo; nhánh có thể đã nhận cập nhật mới hơn commit nền.

## Cách 2 — Nhận ZIP cập nhật

ZIP bàn giao là lớp cập nhật chứa các tệp thay đổi, không phải bản game đầy đủ. Nó cần mã game, thư viện Three.js, mô hình nam/nữ và dữ liệu hiện có trong repository để chạy. Không dùng ZIP này thay toàn bộ thư mục dự án.

Giải nén vào một thư mục riêng, đọc danh sách tệp và so sánh với bản đang làm. Thêm các tệp mới vào đúng đường dẫn tương đối. Với tệp đã có như `player-gltf.js`, `player-avatar.js`, `weapons-village.js`, `app.js`, `index.html`, `load-order.json` và `package.json`, áp dụng phần diff liên quan sau khi đọc nội dung hiện tại. Không chép đè nguyên tệp lên phiên bản có thay đổi mới của người dùng. Nếu đã kéo đúng bản cập nhật từ GitHub, không áp dụng ZIP lần nữa.

Ba icon nằm tại:

```text
ASSETS/ui/skills/spear/xuyen-kich-gold.png
ASSETS/ui/skills/spear/thuong-phong-jade.png
ASSETS/ui/skills/spear/pha-tran-gold.png
```

Nạp `spear-techniques.js` sau `spear-skill-config.js`, trước `spear-skill-vfx.js`. Giữ `bow-piercing.js` trong thứ tự nạp của dự án vì mô-đun này cung cấp các phép kiểm tra va chạm dùng chung. Không thêm một bản Three.js thứ hai hoặc vòng lặp VFX riêng vào trang game.

## Kiểm tra tại máy đích

Chạy trong thư mục gốc của dự án, với Node.js/npm phù hợp dự án. Nếu máy chưa cài dependencies của bản mã vừa đồng bộ, dùng `npm ci` theo lockfile trước. Dùng launcher hiện có để mở mã nguồn; launcher kiểm tra môi trường và lọc các đường dẫn đáp án, dữ liệu thử theo tài khoản.

```powershell
npm run test:spear
if ($LASTEXITCODE -ne 0) { throw 'Kiểm thử Thương / Giáo chưa đạt.' }

node --test SOURCE-CODE/tests/kiem-khi-pose.test.cjs SOURCE-CODE/tests/kiem-hoa-pose.test.cjs SOURCE-CODE/tests/nhat-kiem-pose.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/weapons-village.test.cjs
if ($LASTEXITCODE -ne 0) { throw 'Kiểm thử hồi quy nhân vật hoặc vũ khí chưa đạt.' }

.\START-GAME.bat --port 8002
```

Mở <http://localhost:8002/SOURCE-CODE/thuong-giao-preview.html> trên URL cục bộ mà launcher cung cấp và kiểm tra cả nam/nữ. Không thay launcher bằng máy chủ tĩnh thông thường phục vụ toàn bộ gốc repository. Preview này dành cho môi trường phát triển; bản Hosting mặc định không đóng gói các ảnh tham chiếu trong thư mục tài liệu.

Các điểm cần đối chiếu:

- Xuyên Kích đủ 2,6 giây, luồng khí đi theo hướng đâm; hụt không sinh va chạm giả, vật cản gần người chặn đòn.
- Thương Phong đủ 3,2 giây, một lượt quét ngang, thân và hông theo thương; vệt gió không che mất hai tay.
- Phá Trận đủ 4,2 giây, hai vòng xoay có chuyển chân, thương theo thân; dư chấn cuối chỉ là hình ảnh.
- Hai tay giữ hai điểm riêng trên cán; không chạm lưỡi, không chồng tay; chân không xuyên nền và gốc nhân vật không bị kéo đi bởi VFX.
- Trúng, hụt, tường, nhiều mục tiêu, hủy giữa chiêu và đổi vũ khí đều đúng; đổi trang bị không làm mất hồi chiêu.
- Mức Nhẹ/Vừa/Cao không thay đổi số lần trúng hoặc khả năng bị tường chặn. Kiểm tra thêm trong trang game và thanh ba nút kỹ năng thực tế.

Đối chiếu [README thiết kế](README.md) và [QA.md](QA.md). Ghi rõ phần đã chạy, phần chưa chạy và ảnh/video lấy từ lần chạy thật; không dùng việc có tệp MP4 làm bằng chứng rằng game trên Alpha đã cập nhật.

## Chuẩn bị Hosting và Alpha

Tài liệu này không xác nhận đã triển khai Alpha. Sau khi bản mã thực tế và các kiểm tra đạt, kiểm tra `firebase.json`, `.firebaserc`, script build và cấu hình site/channel của phiên làm việc trước khi quyết định lệnh triển khai.

Từ một checkout đầy đủ, có thể chạy các script đã tồn tại trong dự án:

```powershell
npm run build:hosting
if ($LASTEXITCODE -ne 0) { throw 'Build Hosting chưa đạt.' }
npm run test:hosting
if ($LASTEXITCODE -ne 0) { throw 'Kiểm tra gói Hosting chưa đạt.' }
```

Chỉ triển khai khi phạm vi đó đã được người dùng cho phép và đã xác định đúng Firebase project, Hosting site và preview channel tương ứng Alpha. Dùng lệnh phù hợp với cấu hình thực tế; không đoán tên channel chỉ từ URL. Không triển khai production, `main`, rules, Functions hoặc dữ liệu tài khoản ngoài phạm vi đã được giao.

Sau triển khai, mở đúng URL được công cụ trả về, đối chiếu với Alpha cần cập nhật, tải lại để tránh dùng bundle cũ, kiểm tra lỗi console và đường dẫn tài sản, trang bị Thương / Giáo rồi thử cả ba chiêu. Báo rõ commit và URL đã kiểm tra. Nếu không triển khai được, giữ nguyên mã đã hoàn thành và nêu đúng bước còn bị chặn.

## Lời giao việc có thể dán vào Claude

```text
Hãy cập nhật ba chiêu Thương / Giáo trong dự án:
H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT
Repository: thanhmade/viet-village-3d, nhánh cap-nhat.

Đọc SOURCE-CODE/docs/thuong-giao/README.md, CLAUDE-INTEGRATION.md và QA.md.
Kiểm tra repository, nhánh, trạng thái cục bộ; đồng bộ GitHub bằng fast-forward khi cây làm việc sạch. Giữ mọi thay đổi khác. Nếu dùng ZIP, đối chiếu và áp dụng diff, không chép đè các tệp hiện có đã được sửa và không áp dụng lại khi mã đã có trên GitHub.

Giữ ID spear.xuyen-kich, spear.thuong-phong, spear.pha-tran, tầm và hồi chiêu hiện có. Dùng đúng thời lượng 2,6 / 3,2 / 4,2 giây, động tác hai tay giữ cán, thân theo thương và ba icon đã bàn giao. Phá Trận có hai vòng xoay; dư chấn cuối chỉ là VFX. Không thêm damage tick từ dải khí.

Chạy npm run test:spear và kiểm thử hồi quy nêu trong hướng dẫn. Chạy .\START-GAME.bat --port 8002, mở /SOURCE-CODE/thuong-giao-preview.html trên URL mà launcher cung cấp; không phục vụ toàn bộ gốc dự án bằng máy chủ tĩnh thông thường. Kiểm tra nhân vật nam/nữ, đủ các pha động tác, trúng/hụt/tường/nhiều mục tiêu, hủy và đổi vũ khí, các mức chất lượng. Sau đó kiểm tra trong trang game thật, gồm icon, khóa động tác và hồi chiêu. Sửa lỗi trong phạm vi ba chiêu nếu phát hiện và chạy lại kiểm tra bị ảnh hưởng.

Khi checkout có đủ dữ liệu, chạy build:hosting và test:hosting. Nếu triển khai Alpha đã nằm trong phạm vi được người dùng cho phép, đọc cấu hình Firebase project/site/channel hiện tại rồi triển khai đúng Alpha và smoke test URL thực tế. Không tự đoán cấu hình, không triển khai production hoặc các thành phần ngoài phạm vi. Không tự tạo backup, tag, release hay đổi main.

Tận dụng phiên Claude/GitHub/Firebase đã đăng nhập nếu đang có; không yêu cầu đăng nhập lại khi chưa gặp bước xác thực bị chặn. Báo cuối cùng: commit được dùng, tệp đã cập nhật, kiểm tra thực tế, URL Alpha nếu đã triển khai, và phần còn thiếu nếu có. Không nói đã cập nhật máy/Claude/Alpha nếu chưa thao tác được môi trường đó.
```

Trong phiên chuẩn bị gói này, trình duyệt Claude khả dụng đang dừng ở trang đăng nhập. Điều đó không cho biết trạng thái phiên Claude trên máy Windows của người dùng. Mã và hướng dẫn vẫn có thể đồng bộ qua GitHub vào phiên Claude người dùng đang sử dụng; không coi tệp hướng dẫn này là bằng chứng đã thực hiện đồng bộ trên máy đích.
