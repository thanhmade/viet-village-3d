# Firebase Hosting Alpha

Ngày chuẩn bị: 12/10/2026. Phạm vi được chủ dự án cho phép: push nhánh `cap-nhat`, sau đó xuất preview channel **alpha** trong **7 ngày**. Không deploy live, không merge main, không deploy Rules/Functions hoặc đổi gói Spark. `onlineConfig.enabled` giữ nguyên `false`.

## Đồng bộ và khôi phục thay đổi local

- Local trước đồng bộ: `4fb93880dff7c96abd4c4548d7cae6e731710993`; origin/cap-nhat sau fetch: `536bf57a6807c17df75abe14ffe6d19c5b89d5a8`.
- Đọc ba commit `3fcaa05` (Google Login/cổng/toolbar cũ), `fb27337` (giữ nguồn main và tắt auto deploy), `536bf57` (ghép lịch sử và giữ bản CAP-NHAT đã duyệt). Diff tổng có 9 tệp: ignore/tài liệu/test, portal cũ không thuộc load-order và ZIP gốc. Các scene/entrypoint/NPC đang chạy không đổi.
- Sao chép 10 tệp Hosting chưa commit kèm SHA-256 vào `.cache/hosting/sync-before-alpha-2026-10-12T10-43-44-467Z`.
- Tạo stash có untracked files rồi `git merge --ff-only origin/cap-nhat`, sau đó áp lại stash; không có xung đột. Stash vẫn được giữ, SHA ghi tại `.cache/hosting/pre-alpha-stash.txt`.
- Không reset, force push hoặc sửa main. Các ZIP gốc được giữ trên máy/Git theo lịch sử hiện có, không nằm trong `public-game`.

## Đích triển khai đã xác minh

Firebase CLI 15.33.0, Node 22.23.3 LTS. `hosting:sites:list` trả về một site duy nhất:

- Project: `viet-village-3d`.
- Site: `projects/viet-village-3d/sites/viet-village-3d`.
- Web App: `1:119717688548:web:8e5f272e8cdbddc08be8f1`, khớp cấu hình game.
- `firebase.json` ghi trực tiếp `hosting.site: viet-village-3d`; không có target phụ.
- Public: `public-game`. Không có rewrite tới backend hoặc SPA fallback.
- Trước Alpha chỉ có channel `live`; `updateTime` là `2026-10-10T16:06:43.233975827Z`, chưa có release trong kết quả CLI. Dùng mốc này để đối chiếu sau khi xuất Alpha.

## Lệnh và kiểm tra

Từ gốc CAP-NHAT, đưa thư mục Node 22 vào PATH của phiên terminal theo README:

```powershell
npm.cmd run build:hosting
npm.cmd run test:hosting
npm.cmd test
```

Kết quả trước commit: đóng gói lại 130 tệp / 152.183.091 byte; 12 test Hosting đạt; `npm test` đạt 231 test và 5 nhóm kiểm tra logic (có thêm nhóm Auth từ remote). HTTP localhost kiểm tra đủ 130 tệp khớp SHA-256 và 11 URL không xuất bản trả về 404. Không có LFS pointer, BACKUP hoặc dấu hiệu bí mật trong bản xuất. Giữ nguyên trạng thái `onlineConfig.enabled=false` và nội dung Rules.

Sau khi kiểm tra đạt, stage riêng các tệp Hosting đã rà soát, commit và push `cap-nhat`. Không stage `public-game` hoặc `.cache`; chúng bị Git bỏ qua. Cấu hình `vercel.json` tiếp tục giữ `git.deploymentEnabled=false`.

Chỉ sau khi push thành công mới chạy:

```powershell
node node_modules/firebase-tools/lib/bin/firebase.js hosting:channel:deploy alpha --expires 7d --project viet-village-3d
```

Lệnh này chỉ xuất Hosting preview. Hosting predeploy hook đóng gói lại từ nguồn hiện tại, không gọi Rules/Functions. CLI mặc định đồng bộ hostname preview vào Firebase Auth Authorized Domains; nếu bước đó thất bại, cần thêm đúng hostname của URL CLI trả về trong Firebase Console → Authentication → Settings → Authorized domains. Không thêm wildcard hoặc đổi cấu hình database.

Lấy **URL và expireTime thực tế** từ kết quả deploy/channel list; không đoán URL. Dùng giờ Việt Nam (Asia/Saigon, UTC+7) khi báo thời hạn. Kiểm tra tài nguyên qua:

```powershell
node scripts/check-hosting-http.mjs --alpha-url '<URL thực tế Firebase trả về>'
```

Script chỉ nhận URL HTTPS của preview `viet-village-3d--alpha-…web.app`, kiểm tra 130 tệp bằng SHA-256 và 11 đường dẫn không xuất bản. Báo cáo ở `.cache/hosting/alpha-http-check.json`. Ngoài HTTP, cần thử trình duyệt: entrypoint, Google Login, đủ 8 NPC, atlas, chuyển MAP. Phân biệt kết quả người dùng thử với kiểm tra tự động; không mô phỏng đăng nhập thành công.

Nguồn tham khảo: [Firebase — Test, preview, then deploy live](https://firebase.google.com/docs/hosting/test-preview-deploy). Tài liệu chuẩn bị và kiểm kê tài nguyên: [firebase-hosting.md](firebase-hosting.md).
