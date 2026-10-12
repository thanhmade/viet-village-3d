# Đưa bản CAP-NHAT đã duyệt vào main — 12/10/2026

## Phiên bản và phạm vi

- Bản được người dùng kiểm tra và duyệt: `4fb93880dff7c96abd4c4548d7cae6e731710993` trên `cap-nhat`.
- Main trước cập nhật: `fb2733745356921f840d2d1c08fa3ed8bedeed0d`.
- Tag khôi phục: `restore/main-before-cap-nhat-20261012`, đã đưa lên origin.
- Hai worktree sạch và khớp origin khi bắt đầu; không có thay đổi mới sau bản được duyệt.

Hai nhánh có lịch sử phát triển riêng, gây 18 xung đột khi ghép tự động. Xử lý trong checkout riêng, giữ nguyên mọi tệp chạy game và tài nguyên đã có tại commit CAP-NHAT được duyệt. Giữ thêm ZIP nguồn `VIET-VILLAGE-3D-WEAPONS-VFX-v2.zip` của main và quy tắc `/VIET-VILLAGE-3D-CAP-NHAT/` trong `.gitignore`. Không đưa worktree con hoặc gitlink vào main.

`SOURCE-CODE/js/portals.js` cũ được giữ như tệp lịch sử; entry mới không tải nó. Hệ thống cổng đang chạy theo `load-order.json` của CAP-NHAT. Không nạp đồng thời hai bộ điều khiển.

Phần kiểm thử Google Login từ main được giữ lại: harness ghi nhận sự kiện bàn phím, test dùng hai trạng thái `localWalking`/`multiplayerWalking` hiện hành thay cho `roaming` cũ. Lệnh `run-checks.cjs` chạy thêm kiểm tra này. `check-portals.cjs` cũ chuyển tiếp sang ba tệp kiểm tra cổng nhà hiện hành; bản cũ còn nguyên trong tag khôi phục. Đây là điều chỉnh kiểm thử, không thay đổi gameplay hoặc Firebase thật.

## Chạy bản chính sau khi merge

Tại thư mục gốc main, chạy `START-GAME.bat` hoặc `START-SERVER.bat --port 8000`. Launcher lấy root từ vị trí script, kiểm tra root server và chọn cổng khác khi cổng ưu tiên bị chiếm. Dùng đúng URL dòng `Game:` và kiểm tra dòng `Project:`/`Version:`. Không mặc định cổng cũ luôn trỏ tới bản mong muốn.

Nhãn “CAP-NHAT” trong giao diện thuộc phiên bản đã duyệt và được giữ nguyên khi đưa sang main; xác định checkout bằng launcher và Git. Phiên đăng nhập/tiến độ lưu theo origin: đổi cổng có thể cần đăng nhập lại, dữ liệu tại cổng cũ không bị xóa hay chuyển đi.

Không cần npm/build để chơi. `npm test` kiểm tra logic/hình học, asset, 8 NPC, atlas, điều kiện/cổng chuyển MAP, VFX và toolbar. `py -3 -B -m unittest discover -s scripts/tests -v` kiểm tra launcher Windows. Bộ Firebase emulator chạy tại CAP-NHAT bằng công cụ sẵn có, project `demo-viet-village-3d`; script này chủ ý giới hạn nhánh `cap-nhat`. `onlineConfig.enabled` vẫn là `false`.

Không triển khai online. Giữ `vercel.json` với `git.deploymentEnabled: false`; không đổi Firebase Rules, dịch vụ, quyền riêng tư repository hoặc website ChatGPT Sites.

## Khôi phục mà không xóa lịch sử

Tag khôi phục chỉ tới main trước cập nhật. Có thể mở lại bản cũ ở một thư mục mới còn trống:

```powershell
git worktree add --detach '<thu-muc-khoi-phuc-moi>' restore/main-before-cap-nhat-20261012
```

Để hoàn tác bản cập nhật trên main, tạo nhánh sửa từ main hiện tại rồi `git revert -m 1 <merge-commit-cua-PR>`, kiểm tra và đưa lên bằng PR mới. Không reset --hard hoặc force push. Nếu main có công việc phát sinh sau merge, phải rà soát diff trước khi revert.

Bundle lịch sử được kiểm tra tại `BACKUP/merge-cap-nhat-20261012/before-merge.bundle`; không đưa BACKUP lên GitHub. Báo cáo kết quả merge và thao tác localhost cuối cùng được lưu cạnh bundle vì mã merge PR chỉ có sau khi GitHub hoàn tất.
