DỰ ÁN: VIET VILLAGE 3D
MỤC TIÊU: Đồng bộ Nhất Kiếm V2 cho Kiếm từ GitHub, kiểm tra hình ảnh/GPU thật và cập nhật Alpha.
REPO: thanhmade/viet-village-3d
NHÁNH: cap-nhat
NỀN ĐÃ ĐỐI CHIẾU: b78881f8d5ecef5cfeaefd754597d0d045e39a3d
GÓI: Nhat-Kiem-Kiem-V2.zip (delta có manifest/hash; không phải toàn bộ game)
NGUỒN GÓI: H:\CHAT GPT\3D-GAME\SKILL-THAM-CHIEU
ĐÍCH CODE: H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT
ALPHA: https://viet-village-3d--alpha-g1lx8owy.web.app/

1. Kiểm tra Git root/remote/nhánh/status và đọc chỉ dẫn dự án. Dùng phiên đăng nhập hiện có, fetch origin/cap-nhat và đồng bộ, giữ thay đổi cục bộ. Nếu cùng tệp có sửa mới, hợp nhất theo nội dung; không reset --hard hoặc chép ZIP đè mù. Không hỏi đăng nhập lại khi phiên hiện có vẫn dùng được. Không tự tạo backup/tag/release hoặc chuyển main.
2. Đọc SOURCE-CODE/docs/nhat-kiem/RESEARCH-V2.md, DESIGN.md, skill-spec.json và VALIDATION.md. Chiêu sword.nhat-kiem ở ô 1, tổng 1,8 s: tụ lực đến .25; chém .25–.47 / .56–.78 / .88–1.12; phóng kiếm khí 1.01; bay đến 1.29; pose hết 1.50; dư quang hết 1.80. Giữ hồi 1.5 s, tầm 3.6 m và gameplay một hit/mục tiêu/cast. Ba vệt không phải ba lần damage.
3. Icon đã gắn: ASSETS/ui/skills/sword/nhat-kiem-ice-white.png; CSS SOURCE-CODE/css/sword-skill-icons.css. Nạp sword-strike.js trước sword-skill-vfx.js; giữ bow-piercing.js vì SwordStrike dùng helper collision nạp trễ. Pose nối vào player-gltf.js và controller đang có. Không thêm renderer/loop phụ trong game; không thay các chiêu Côn/Cung hoặc collider map ngoài sửa cần thiết.
4. Chạy npm run test:vfx; node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs; npm run build:hosting; npm run test:hosting theo checkout đầy đủ. Codex đã đạt 216 test logic/rig và dựng WebGL2 qua SwiftShader; chưa đo GPU vật lý.
5. Chạy HTTP local từ gốc repo và mở SOURCE-CODE/nhat-kiem-preview.html?test. Thử nam/nữ, Low/Medium/High, toàn cảnh/bên hông; bia gần, bia cuối tầm, sân trống, vách chắn, vách sát người, hai bia nối tiếp. Dùng +0.05 s hoặc window.nhatKiemPreview.step(dt) chụp mốc .15/.35/.65/.95/1.01/1.15/1.35/1.50/1.80. Ảnh tham chiếu ở SOURCE-CODE/docs/nhat-kiem-reference.png. Đối soát thêm nhát xuống, hất lên, nhát cuối; không đánh giá chỉ bằng một khung hình. Các script thay đổi dùng cache key nhat-kiem-2.
6. Xem thật: tay bám cán, chân không trượt/xuyên đất, ba nhịp thân–kiếm ăn nhau, vệt không tách lưỡi, khí ra từ đầu kiếm và dừng ở contact. Xanh–trắng chủ đạo, lõi trắng không cháy bệt; bụi/mảnh vụn chỉ ở vách, chém hụt chỉ tan khí. Kiểm tra shader console/Network. Preview là local; thư mục docs không nằm trong gói Hosting.
7. Vào game thật, cầm Kiếm dùng ô 1 desktop/mobile; kiểm tra icon 48 px, cooldown, spam, khóa di chuyển 1.5 s, đổi map/vũ khí/avatar, hủy/chết. Chỉ tiếp xúc bia mới cấp nhiệm vụ; không cấp ngay khi bấm nút. Kiểm tra đình/cây đa và hồi quy Côn/Xuyên Tiễn/Liên Tiễn/Mưa Tên. Đo FPS/draw calls/GPU memory trên thiết bị thực; sửa hình ảnh hoặc hiệu năng nếu cần và chạy lại kiểm tra liên quan.
8. Khi local đạt, build public-game rồi deploy đúng kênh Alpha bằng phiên Firebase hiện có: firebase hosting:channel:deploy alpha --project viet-village-3d. Không deploy production/rules/functions cho việc này. So URL CLI trả về với Alpha yêu cầu; hard reload, kiểm tra module/icon/Nhất Kiếm và các chiêu trước.
9. Commit/push các sửa bổ sung liên quan lên cap-nhat. Báo commit, lệnh và kết quả, ảnh/clip WebGL thật, số đo hiệu năng và URL Alpha. Không báo GPU/deploy thành công khi chưa chạy.

ĐÃ LÀM: nghiên cứu/đối soát, ba mặt phẳng chém khác nhau, tăng tốc từng nhát, chân/hông/thân phối hợp, sửa lún chân khi blend, vệt 0,16 s, kiếm khí mảnh, test logic/rig, WebGL phần mềm và build Hosting. Icon và cân bằng giữ nguyên. Clip trước/sau ở REVIEW/Nhat-Kiem-V2-So-Sanh.mp4 trong ZIP.
CLAUDE CẦN HOÀN TẤT TRÊN MÁY: hình ảnh trong game thật, hiệu năng GPU vật lý/mobile, triển khai và kiểm tra Alpha. Codex không truy cập ổ H: hoặc phiên Claude Desktop.
