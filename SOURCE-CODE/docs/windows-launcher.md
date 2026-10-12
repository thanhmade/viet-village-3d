# Khởi chạy CAP-NHAT trên Windows

Kiểm tra ngày 12/10/2026, nhánh `cap-nhat`. Entry chạy game là `SOURCE-CODE/index.html`; `index.html` ở gốc chỉ chuyển đến entry này khi được mở qua HTTP/HTTPS.

## Kết quả đối chiếu

- `localhost:8000`: nội dung entry và module đăng nhập trùng bản `main`; tệp NPC và cấu hình Làng Việt mới trả 404. Đây là bản chính cũ, không phải bản thử nghiệm bị mất NPC.
- `localhost:8001`: nội dung trùng CAP-NHAT, nhưng máy chủ cũ chạy bằng `python -m http.server`, chưa có nhận diện checkout hoặc chính sách bỏ cache mới.
- Mở HTML trực tiếp bằng `file://` có thể khiến trình duyệt chặn module Firebase và fetch tài nguyên trước khi mã báo lỗi đăng nhập chạy. Màn hình nay hướng dẫn chạy BAT bằng script thường; không bỏ qua xác thực.
- Không tìm thấy sai đường dẫn 8 GLB trong cấu hình Làng Việt. NPC được khởi tạo sau đăng nhập hợp lệ và thuộc MAP `lang-viet`.

## Cách chạy

Nhấp đúp `START-GAME.bat` tại gốc bản thử nghiệm, giữ cửa sổ server mở và dùng URL dòng `Game:`. `START-SERVER.bat` dùng cùng launcher. Python 3.10+ là điều kiện chạy; nếu thiếu, BAT hiện địa chỉ cài Python và hướng dẫn PATH. Launcher không cài phần mềm.

Launcher lấy root từ vị trí `scripts/serve-game.py`, kiểm tra các script, CSS, cấu hình MAP/NPC và header GLB trước khi mở trình duyệt. Không phụ thuộc ổ H hoặc thư mục hiện tại của terminal. Không đổi thứ tự các script toàn cục trong `SOURCE-CODE/load-order.json`.

Cổng ưu tiên 8001. Chỉ dùng lại server có endpoint nhận diện xác nhận đúng root và đúng phiên bản launcher. Khi cổng bận hoặc server cũ không có nhận diện, giữ nguyên tiến trình và chọn cổng khác. Không tự kết thúc ứng dụng đang giữ cổng. Server mới chỉ lắng nghe loopback và gửi `Cache-Control: no-store`; sau khi sửa code hãy tải lại trang để chạy mã mới.

Lần kiểm tra này BAT chọn **http://localhost:8002/SOURCE-CODE/index.html**. Gọi lại BAT đã dùng lại đúng server 8002. Đây là kết quả tại thời điểm kiểm tra, không phải cổng cố định cho mọi máy/lần chạy.

Mỗi cổng là một origin trình duyệt riêng. Đăng nhập và tiến độ cục bộ có thể khác giữa các cổng; dữ liệu tại origin cũ vẫn giữ nguyên. Launcher không di chuyển token hay hồ sơ. Firebase Authorized Domains cần có `localhost`; cấu hình và Security Rules không bị thay đổi trong đợt sửa này.

## Kiểm thử

| Kiểm tra | Kết quả / phạm vi |
|---|---|
| `py -3 -B -m unittest discover -s scripts/tests -v` | 11/11 đạt trên Windows. Có HTTP loopback thật, cổng bận, dùng lại, bản sao root khác, dịch vụ không phải HTTP, gọi BAT từ cwd khác, fallback Python và thiếu runtime. Xung đột IPv6 được mô phỏng. |
| `npm test` | 231/231 bài Node đạt, cùng các kiểm tra logic/hình học hiện có. Bao gồm 3 bài mới về entry/file guard và thứ tự script. Renderer được mô phỏng, không dùng kết quả này để khẳng định GPU/FPS. |
| Chạy `START-GAME.bat` thật | Mở trình duyệt mặc định với HTTP 8002; giữ nguyên server 8000/8001. Mở BAT lần nữa dùng lại 8002. |
| Đối chiếu nội dung HTTP | 13 tệp gồm entry, module đăng nhập, file guard, cấu hình NPC và đủ 8 GLB đều HTTP 200, `no-store`, SHA-256 khớp tệp trong CAP-NHAT. |
| Nút Google Login trong trình duyệt kiểm thử | Gọi Firebase và chuyển sang chờ cửa sổ chọn tài khoản. Không giả lập đăng nhập thành công. |
| Đăng nhập và 8 NPC trong game | Người dùng đăng nhập Google thật tại URL 8002 và xác nhận “Đăng nhập được, thấy đủ 8 NPC”. |
| Nhánh và phạm vi sửa | Chỉ CAP-NHAT; không chỉnh bản chính, MAP, model, animation, nhiệm vụ hoặc backend Firebase. |

Không kiểm thử lại toàn bộ hội thoại, animation và giao dịch của 8 NPC trong đợt sửa launcher này; không đo FPS trên máy học sinh. Cần Internet cho Firebase SDK và Google Login. Lỗi favicon 404 có thể xuất hiện do chưa có biểu tượng trang; không ngăn đăng nhập/tải NPC. Không có lỗi khởi chạy còn tái hiện trong các tình huống đã thử.

## Tệp liên quan

- `START-GAME.bat`, `START-SERVER.bat`, `scripts/serve-game.py`: chọn runtime, kiểm tra checkout, nhận diện/dùng lại server, chọn cổng và mở URL.
- `index.html`, `SOURCE-CODE/index.html`, `SOURCE-CODE/js/launch-check.js`: hướng dẫn khi mở file và ghi rõ bản thử nghiệm/cổng ở màn hình đăng nhập.
- `scripts/tests/test_launcher.py`, `SOURCE-CODE/tests/launch-entry.test.cjs`, `package.json`: bài kiểm tra hồi quy và nối vào lệnh kiểm tra hiện có.
- `README.md`, tài liệu này: hành vi chạy thực tế và giới hạn kiểm thử.

Chỉ đồng bộ mã lên nhánh `cap-nhat`; giữ `vercel.json` với `git.deploymentEnabled: false`, không thực hiện lệnh triển khai hoặc thay đổi Firebase.
