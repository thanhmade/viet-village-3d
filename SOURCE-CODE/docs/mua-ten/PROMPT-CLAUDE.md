DỰ ÁN: VIET VILLAGE 3D
MỤC TIÊU: Đồng bộ Mưa Tên cho Cung từ GitHub, kiểm tra hình ảnh/GPU thật và cập nhật Alpha.
REPO: thanhmade/viet-village-3d
NHÁNH: cap-nhat
NỀN ĐÃ ĐỐI CHIẾU: 271ecfe560f7be2f5d60d4c598fbff9b489c6e30
GÓI: Mua-Ten-Cung.zip (delta có manifest/hash; không phải toàn bộ game)
NGUỒN GÓI: H:\CHAT GPT\3D-GAME\SKILL-THAM-CHIEU
ĐÍCH CODE: H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT
ALPHA: https://viet-village-3d--alpha-g1lx8owy.web.app/

1. Xác minh Git root/remote/nhánh/status, đọc chỉ dẫn dự án và dùng phiên đăng nhập hiện có. Fetch origin/cap-nhat rồi đồng bộ, giữ các thay đổi cục bộ. Nếu có sửa mới cùng tệp, hợp nhất theo nội dung; không reset --hard hoặc chép ZIP đè mù. Không hỏi đăng nhập lại khi phiên hiện có vẫn dùng được. Không tự tạo backup/tag/release hoặc chuyển sang main.
2. Đọc SOURCE-CODE/docs/mua-ten/DESIGN.md, skill-spec.json và VALIDATION.md. Chiêu bow.mua-ten, ô 3 khi cầm Cung, dài 4.8 s; pose 1.8 s, nhả tên gọi phép .85 s, mở vòng 1.45 s, thả 12 tên từ 1.60 đến 3.14 s, chạm đất phẳng từ 2.46 đến 4.00 s, tan hết ở 4.80 s. Giữ hồi 5 s, tầm tâm 10 m, bán kính 3.8 m. Không sửa các chiêu Côn/Xuyên Tiễn/Liên Tiễn hoặc collider đình/cây đa ngoài thay đổi cần thiết.
3. Icon đã nối trực tiếp vào ô 3: ASSETS/ui/skills/bow/mua-ten-gold-blue.png; CSS SOURCE-CODE/css/bow-skill-icons.css. Module mới SOURCE-CODE/js/vfx/bow-rain.js phải nạp trước bow-skill-vfx.js. Pose dùng CHARACTERS/player-gltf.js và controller đang có, không renderer/loop phụ trong game.
4. Chạy npm run test:vfx; node --test SOURCE-CODE/tests/player-gltf.test.cjs SOURCE-CODE/tests/player-avatar.test.cjs SOURCE-CODE/tests/village-npcs.test.cjs; npm run build:hosting; npm run test:hosting theo cấu hình đầy đủ trên máy. Bộ kiểm tra đã chạy ở Codex đạt 199 ca; đó là logic/rig, chưa phải GPU.
5. Mở HTTP local từ gốc repo, vào SOURCE-CODE/mua-ten-cung-preview.html. Thử nam/nữ, Low/Medium/High, camera toàn cảnh/bên hông; sân trống, bia trong trận, mái che, trần thấp và bia ngoài trận. Dùng ?test và nút +0.05 s để chụp các mốc .48/.85/1.45/1.8/2.6/3.4/4.0/4.8. So ảnh SOURCE-CODE/docs/mua-ten-reference.png; cung phải giương lên, tay kéo khớp nock, tên gọi phép ra từ đầu cung, tên rơi hướng xuống, vàng chủ đạo và khí xanh; đủ tụ lực, gọi trận, mưa tên, sao/bụi/vòng xung và tan hết.
6. Vào game thật, trang bị Cung và dùng ô 3 cả desktop/mobile. Kiểm tra icon/cooldown, chọn vùng, spam chiêu, di chuyển sau 1.8 s, đổi vũ khí/map, hủy/chết, mái nhà/đình/cây đa, nhiệm vụ bia Võ sư. Vòng báo và tên gọi phép không cấp tiến trình; hit-window từ tên chạm mới xác nhận. Không thêm damage lên NPC hòa bình. Kiểm tra console shader và Network, đánh giá FPS/draw calls trên thiết bị thực tế. Sửa vấn đề hiển thị nếu có; chạy lại kiểm tra liên quan.
7. Sau khi local đạt, build public-game và deploy đúng kênh Alpha bằng phiên Firebase hiện có: firebase hosting:channel:deploy alpha --project viet-village-3d. Không deploy production/rules/functions cho công việc này. So URL CLI trả về với Alpha yêu cầu. Mở Alpha, hard reload và xác minh module/icon/Mưa Tên hoạt động, các chiêu cũ vẫn đúng.
8. Nếu có sửa bổ sung liên quan, commit/push cap-nhat. Báo commit, lệnh kiểm tra, ảnh/clip runtime thật, số đo hiệu năng và URL Alpha; không báo GPU/deploy thành công khi chưa chạy.

ĐÃ LÀM: code, icon, IK cho hai GLB, preview, collision, luồng nhiệm vụ tại tiếp xúc, kiểm tra logic/rig và build Hosting.
CLAUDE CẦN HOÀN TẤT TRÊN MÁY: xác minh WebGL/hình ảnh, hiệu năng, triển khai và kiểm tra Alpha. Codex không truy cập ổ H: hoặc phiên Claude Desktop.
