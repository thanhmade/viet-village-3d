DỰ ÁN: VIET VILLAGE 3D
MỤC TIÊU: Đồng bộ Liên Tiễn cho Cung đã được tích hợp trên GitHub, kiểm tra hình ảnh/GPU thật và cập nhật kênh Alpha.
REPO: thanhmade/viet-village-3d
NHÁNH: cap-nhat
NỀN ĐÃ ĐỐI CHIẾU: 844f75bd4ee86c75e44b61c2dfd6d9892aea3b16
GÓI: Lien-Tien-Cung.zip (bản delta có manifest/hash, không phải toàn bộ game)
NGUỒN DỰ KIẾN: H:\CHAT GPT\3D-GAME\SKILL-THAM-CHIEU
ĐÍCH: H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT
ALPHA: https://viet-village-3d--alpha-g1lx8owy.web.app/

1. Xác minh thư mục, Git root/remote/nhánh/status và đọc chỉ dẫn dự án. Dùng phiên đăng nhập hiện có; không yêu cầu đăng nhập lại nếu vẫn sử dụng được. Mã đã có trên origin/cap-nhat: fetch rồi đồng bộ nhánh cap-nhat, giữ thay đổi cục bộ. Nếu có thay đổi mới cùng tệp, đối chiếu và hợp nhất; không chép đè hoặc reset --hard. Không tự tạo backup/tag/release và không chuyển sang main.
2. Đọc SOURCE-CODE/docs/lien-tien/DESIGN.md, skill-spec.json và VALIDATION.md. Giữ bow.lien-tien, slot 2, 3 tên ở 0.25/0.37/0.49 s, thời lượng 1.8 s, hồi 3 s, tầm 11 m và bán kính 0.28 m. Bộ số lấy từ config cũ; pose kéo–nhả 0.9 s là thiết kế mới từ ảnh tĩnh. Giữ nguyên bản sửa collider đình/cây đa và Xuyên Tiễn trước đó.
3. Kiểm tra các tệp chính: js/vfx/bow-volley.js; bow-skill-vfx.js/config.js; js/weapons-village.js; js/player-avatar.js; CHARACTERS/player-gltf.js; css/bow-skill-icons.css; index/load-order. Icon phải ở ASSETS/ui/skills/bow/lien-tien-gold-blue.png. CSS đã nối ô kỹ năng trong game; không cần nhập bằng menu thủ công.
4. Từ gốc repo chạy npm run test:vfx và các test player-gltf/player-avatar/village-npcs, rồi npm run build:hosting. Chạy npm run test:hosting theo cấu hình dự án. Không coi Node/rig test là bằng chứng ảnh GPU.
5. Chạy HTTP local tại gốc repo, mở SOURCE-CODE/lien-tien-cung-preview.html. Thử nhân vật nam/nữ, Low/Medium/High, camera bên hông, ba bia/bắn hụt/vách/hai bia nối tiếp. Chụp/quay ba nhịp kéo–nhả, đầu tên khớp đầu cung, nock khớp tay trái; so với ảnh SOURCE-CODE/docs/lien-tien-reference.png. Không thêm video phát sẵn thay VFX thật. Không để mũi tên lóe ở cuối tầm khi bắn hụt.
6. Vào game thật: trang bị Cung, bấm ô 2. Kiểm tra icon ở desktop/mobile, spam nút và cooldown, di chuyển sau hồi thế, đổi vũ khí/MAP, hủy/chết và nhiệm vụ bia Võ sư. Mỗi tên chạm mục tiêu/vách đầu tiên; target-query không cấp tiến trình, hit-window mới xác nhận; không gây damage lên NPC hòa bình. Giữ combat/renderer/update loop hiện hành. Kiểm tra console shader và Network không thiếu icon/module. Sửa vấn đề ảnh nếu có và chạy lại kiểm tra liên quan.
7. Sau khi đạt kiểm tra local, build gói public-game và triển khai đúng kênh Alpha của project viet-village-3d bằng phiên Firebase hiện có (hosting:channel:deploy alpha --project viet-village-3d). Không triển khai production, rules hoặc functions trong công việc này. Đối chiếu URL thật được CLI trả về với Alpha yêu cầu. Mở Alpha, hard reload, xác minh module/icon/3 nhịp tên hoạt động và các chiêu Côn/Xuyên Tiễn vẫn đúng.
8. Commit/push phần sửa bổ sung có liên quan lên cap-nhat nếu có; báo commit, lệnh kiểm tra, ảnh/clip thật và URL Alpha. Không tuyên bố đã kiểm tra GPU hoặc đã deploy khi chưa thực hiện.

PHẦN ĐÃ LÀM: code, icon, pose IK cho hai GLB, trang preview, quét va chạm từng tên, nhiệm vụ tại tiếp xúc, kiểm tra logic/rig.
PHẦN CẦN CLAUDE HOÀN TẤT TRÊN MÁY: đối chiếu hình ảnh WebGL, đo hiệu năng, triển khai/kiểm tra Alpha. Codex không truy cập ổ H: và Chromium của môi trường Codex tải không thành công.
