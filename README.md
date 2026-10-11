# VIET-VILLAGE-3D — Game 3D Ngôi Làng

Bối cảnh làng quê Việt Nam dựng bằng HTML, CSS, JavaScript và Three.js: bản đồ làng, cổng, nhà dân, nội thất, chu kỳ ngày đêm và thời tiết. Dự án hướng tới trò chơi Toán cho học sinh; phiên bản hiện tại chủ yếu phục vụ khám phá bối cảnh 3D. Nhân vật hoàn chỉnh và phần chơi câu hỏi/cấp độ còn cần phát triển.

Nguồn xuất từ ChatGPT Sites ngày 10/10/2026, bản v8 tại commit `d36f5be347d606e23e4f06a42630707fd14435d3`. Thư mục phát triển trên máy: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D`. Repository: [thanhmade/viet-village-3d](https://github.com/thanhmade/viet-village-3d), đã xác minh **Private** trong giai đoạn kết nối ngày 10/10/2026. Dự án bắt đầu lịch sử Git mới trên nhánh `main`; bundle cũ giữ riêng trên máy. Commit đầu tiên `130c5c1` đã đồng bộ lên GitHub. Nhánh `main` chứa bản chính với vòng dịch chuyển, thanh công cụ thu gọn và Google Login. Nhánh `cap-nhat` lưu bản thử nghiệm độc lập; các thay đổi thử nghiệm không được tự động nhập vào `main`. Giai đoạn 7.1 trước đây được phát triển trên nhánh `feature/google-login`.

## Chạy bằng localhost

Máy đã có Python 3, Node.js và Git. Three.js r160 được lưu trong dự án. Nhánh đăng nhập dùng Firebase JavaScript SDK 13.0.0 qua CDN chính thức; cần Internet để xác thực Google, không cần npm hoặc cài thêm thư viện. Trình duyệt cần hỗ trợ WebGL và JavaScript modules.

1. Chạy `START-SERVER.bat` tại thư mục gốc. Giữ cửa sổ máy chủ mở.
2. Mở [game tại localhost](http://localhost:8000/SOURCE-CODE/index.html).
3. Bấm **Đăng nhập bằng Google**, hoàn tất đăng nhập bằng tài khoản thử nghiệm, rồi bấm **Khám phá làng 3D** để bắt đầu đi bộ.

Hoặc chạy trong PowerShell:

```powershell
Set-Location -LiteralPath 'H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D'
python -B -m http.server 8000 --bind 127.0.0.1
```

Nếu dùng bản clone ở nơi khác, chạy lệnh máy chủ từ thư mục gốc của bản clone. Có thể thay `python` bằng `py` khi máy có Python Launcher. Dừng bằng Ctrl+C. Nếu cổng 8000 đang được một máy chủ phục vụ đúng dự án sử dụng, mở địa chỉ hiện có; nếu bị chương trình khác chiếm, đổi cổng và URL sang 8001.

Điểm vào gốc `index.html` chuyển tới `SOURCE-CODE/index.html`. Giữ toàn bộ cấu trúc thư mục khi giải nén hoặc clone. `START-GAME.bat` là cách mở HTML trực tiếp có sẵn từ gói xuất; ưu tiên HTTP localhost để kiểm tra và phát triển.

## Điều khiển và chức năng

- Ngoài làng: WASD/phím mũi tên hoặc cần điều khiển để đi, chạm mặt đất để chọn đường. Kéo để xoay camera, cuộn để zoom. **Toàn cảnh**, **Nhà dân 3D**, **Cổng 3D** giữ các góc xem kiến trúc; **Đi bộ/Camera** quay về nhân vật.
- Đứng trong vòng 3D **VÀO NHÀ** liên tục 0,8 giây để vào nội thất. Rời vòng thì hủy tiến trình. Nút **Vào nhà** hướng dẫn nhân vật đi tới vòng nhà 5; ở toàn cảnh có thể chọn điểm đi tới từng nhà.
- Trong nhà, dùng WASD/mũi tên/cần điều khiển/nút để đi; đứng trong vòng **RA SÂN** 0,8 giây để trở lại đúng sân nhà đã vào. Nút **Ra sân** tìm đường tới vòng; Esc là lối thoát dự phòng. Điểm xuất hiện nằm ngoài vùng kích hoạt.
- Trong **Thời gian & thời tiết**, chọn giờ thực UTC+7, giờ thủ công hoặc tua 24 giờ. Có ban ngày, trưa, chiều, hoàng hôn, tối và khuya.
- Có mùa khô/mưa, trời quang, nhiều mây, mưa rào, sương; chất lượng hiển thị và độ sáng ban đêm có thể điều chỉnh.
- Nắng, trăng, sao, cửa sổ sáng, đèn hiên và đèn trong nhà thay đổi theo thời gian. Thời tiết là mô phỏng cục bộ, không dùng API dự báo.

## Cấu trúc mã nguồn

| Đường dẫn | Vai trò |
|---|---|
| `index.html` | Chuyển tới trang chạy |
| `SOURCE-CODE/index.html`, `css/`, `js/` | Giao diện, câu hỏi lưu trong mã, điều khiển và vòng lặp |
| `SOURCE-CODE/load-order.json`, `tests/` | Thứ tự tải script và bộ kiểm tra logic |
| `ASSETS/` | Three.js r160, giấy phép, hình học cơ bản, 17 ảnh giao diện |
| `MAP/` | Nền làng, cảnh quan, bản đồ, điều hướng, mô hình JSON và ảnh tham chiếu |
| `BUILDINGS/` | Nhà dân, đình, cổng, mô hình JSON và ảnh công trình |
| `CHARACTERS/` | Mã nhân vật khối, mô hình JSON và ảnh tham chiếu |
| `INTERIORS/` | Nội thất, di chuyển trong nhà, mô hình JSON và ảnh tham chiếu |
| `ENVIRONMENT/` | Đồng hồ, mùa, thời tiết, ánh sáng mặt trời/trăng và đèn nhà |
| `DOCUMENTS/` | Git giữ báo cáo giới hạn nguồn và phạm vi kiểm tra; bài giảng, kiểm kê, ngữ cảnh và báo cáo kết nối chỉ lưu trên máy |
| `BACKUP/` | Chỉ lưu trên máy: bundle lịch sử Git, bản v8, HTML cũ, upload và helper phát triển; không có trong bản clone GitHub |

Trang chạy tải **Three.js, 20 script thông thường và một entry module đăng nhập** theo `SOURCE-CODE/load-order.json`. Các script thông thường dùng chung trạng thái; không đổi thứ tự hoặc tự thêm `async`. `auth-entry.js` dùng `type="module"`, nhập `auth-session.js`, `firebase-config.js` và Firebase App/Auth từ CDN. Máy chủ phải trả các tệp module `.js` với MIME JavaScript. Các đường dẫn `../ASSETS`, `../MAP`, `../BUILDINGS` và các thư mục tương ứng phải còn hợp lệ. Không lấy riêng `SOURCE-CODE` làm toàn bộ thư mục website.

Thanh công cụ có nút **Thu gọn / ☰ Công cụ**. Desktop hiển thị ngang; điện thoại mặc định thu gọn, mở thành danh sách dọc có thể cuộn và tự thu gọn sau khi chọn chức năng. Trạng thái của desktop và điện thoại được lưu riêng bằng localStorage. Dùng Tab, Enter/Space; mũi tên xuống từ nút Công cụ để mở và chuyển tiêu điểm vào danh sách, Escape để thu gọn.

## Tài nguyên 3D và giới hạn hiện tại

Cảnh được dựng từ hình học Three.js, vật liệu màu và instancing. Năm tệp `*.three.json` xuất từ `Object3D.toJSON()` giữ dữ liệu mô hình; có thể đọc bằng `THREE.ObjectLoader`. Trang hiện tại dựng cảnh bằng JavaScript, chưa tải trực tiếp các JSON này.

Chưa có GLB/GLTF/FBX/OBJ/Blender, rig hoặc animation nhân vật hoàn chỉnh, âm thanh và bộ texture PBR. Ảnh tham chiếu/bộ sưu tập ảnh không tự trở thành texture hoặc mô hình 3D. Nhân vật khối hiện có đã hoạt động trong chế độ đi bộ. Nội thất dùng góc nhìn thứ nhất và vẫn giữ cùng đối tượng/trạng thái nhân vật. Bộ câu hỏi Toán còn trong mã nhưng luồng khởi động đang vào bối cảnh, chưa chạy thành trò chơi câu hỏi/cấp độ hoàn chỉnh.

Đã thêm ánh sáng nền nội thất để quan sát đường đi ban ngày; ánh đèn/bóng đổ ban đêm cần tinh chỉnh. Đã thử bối cảnh, vào/ra sáu nhà và các chế độ thời gian/thời tiết trên trình duyệt trong Codex ở giai đoạn 2; chưa đo FPS hay kiểm tra đầy đủ Chrome/Edge, điện thoại và máy học sinh. Quỹ đạo mặt trời/trăng và thời tiết là mô phỏng phục vụ hình ảnh.

Gói xuất gốc có 96 tệp đuôi `.png` giải mã được; 68 tệp thực tế chứa JPEG. Khi đối chiếu cuối giai đoạn 3 có thêm hai PNG trong `ASSETS/PORTALS`: `vao-nha.png` và `ra-san.png`, tổng cộng 98 ảnh. Hai PNG này được dùng làm tham chiếu thiết kế. Vòng runtime được dựng bằng hình học Three.js, icon extrude và nhãn canvas; không dùng nguyên ảnh làm map/vòng phẳng. Chưa đổi tên hoặc chuyển đổi ảnh trong giai đoạn chuẩn bị. Xem [trạng thái xuất](DOCUMENTS/EXPORT-STATUS.md) và [phạm vi kiểm tra gói xuất](DOCUMENTS/VALIDATION.md); các tài liệu xuất phản ánh thời điểm đóng gói trước khi kiểm tra localhost.

## Kiểm tra sau khi phát triển

Không cần Node.js để chơi. Máy đã có Node.js để chạy bộ kiểm tra logic từ thư mục gốc:

```powershell
node SOURCE-CODE/tests/run-checks.cjs
```

Bộ kiểm tra gồm hành trình vào/ra sáu nhà, giữ trạng thái, vòng 0,8 giây, hủy/đi ngang/vào lại, lỗi tải, điểm xuất hiện và điều khiển. Dùng Three.js thật với renderer/DOM mô phỏng; cần thử thêm trình duyệt để xác nhận WebGL, shader, bóng, thao tác và tốc độ trên thiết bị thật. Sau mỗi thay đổi tài nguyên, kiểm tra Network/Console và đường dẫn phân biệt chữ hoa/thường của máy chủ online.

`check-auth.mjs` kiểm tra logic phiên bằng SDK giả lập trong unit test: từ chối phiên sai, khóa trước khi đăng xuất hoàn tất, hết hạn, mất mạng, phản hồi đến muộn và không khởi tạo game trước xác thực. Unit test này **không chứng minh đăng nhập Google thật thành công**. Cần kiểm thử riêng trên localhost bằng tài khoản Google và xem lỗi Console sau khi thực sự mở cảnh WebGL.

## Git, bản sao lưu và lịch sử

`.gitignore` giữ mã nguồn, ảnh, mô hình, hai tài liệu phát triển cần thiết và giấy phép; loại trừ tệp tạm, cache, môi trường cục bộ, thông tin xác thực và **toàn bộ `BACKUP`**, bao gồm bundle. PowerPoint gốc, ngữ cảnh cuộc trò chuyện, danh mục/checksum, provenance và báo cáo kiểm toán/kết nối không đưa lên GitHub. Các tệp bị bỏ qua vẫn nằm nguyên trên máy và không xuất hiện trong bản clone mới.

Bundle đã được kiểm tra: **9 commit**, nhánh `main` và `HEAD` cùng trỏ tới commit v8, checksum pack hợp lệ, không có prerequisite còn thiếu. Theo lựa chọn giai đoạn 4, dùng lịch sử Git mới; chưa clone, unbundle, checkout hoặc nhập 9 commit vào repository mới. `BACKUP/source-history.bundle` giữ nguyên trên ổ H để phục hồi khi cần. Cần sao lưu bundle và toàn bộ dữ liệu bị bỏ qua ở nơi riêng, vì GitHub không lưu các tệp đó.

`DOCUMENTS/FILE-INVENTORY.json`, `FILE-INVENTORY.csv` và `SHA256SUMS.txt` là danh mục của **gói xuất ban đầu**, không phải danh mục repository sau này. README được cập nhật ở giai đoạn 3 và có tệp chuẩn bị mới nên kiểm tra toàn bộ cây hiện tại bằng checksum gốc sẽ có khác biệt đã biết. Không ghi đè các danh mục gốc hoặc BACKUP.

## Website tự cập nhật

Phương án đề xuất: phát triển trên máy → GitHub Private → kiểm tra bản preview → triển khai nhánh `main` trên Vercel. Vercel hỗ trợ tự triển khai khi GitHub có push; quyền tài khoản và điều kiện gói phải phù hợp với chủ repository. [Tài liệu Vercel cho GitHub](https://vercel.com/docs/git/vercel-for-github).

Gói web công khai chỉ nên chứa các tệp thực sự dùng để chạy game, giữ nguyên đường dẫn. Không phục vụ toàn bộ thư mục dự án: BACKUP, bundle lịch sử, PowerPoint, tài liệu kiểm kê và tài nguyên không được game dùng cần nằm ngoài thư mục xuất bản. Báo cáo chuẩn bị/kết nối trong `DOCUMENTS` chỉ lưu trên máy; chưa tạo pipeline hoặc triển khai.

Repository Private hạn chế người xem kho mã; HTML/JavaScript và tài nguyên đã phục vụ cho trình duyệt trên website công khai vẫn tải được. `firebase-config.js` chỉ chứa cấu hình Web công khai do chủ dự án cung cấp, bao gồm Firebase API key nhận diện dự án; không chứa service-account private key, mật khẩu hoặc token phiên. Theo [tài liệu Firebase](https://firebase.google.com/docs/projects/api-keys), cấu hình này không thay thế Security Rules hoặc xác thực phía máy chủ.

## Giấy phép

Three.js giữ giấy phép MIT tại `ASSETS/vendor/LICENSE-THREE.txt`. Chưa đặt giấy phép chung cho mã game, ảnh và tài liệu người dùng. Cần xác nhận quyền sử dụng các nội dung trước khi xuất bản website cho học sinh.

## Kế hoạch multiplayer

Giai đoạn 6 đã thiết kế Firebase Google Auth, RTDB presence, Firestore kết quả và API chấm điểm phía máy chủ. Giai đoạn 7.1 tích hợp Google Login vào bản chơi một người; chưa có đồng bộ multiplayer. Firebase Project `viet-village-3d` do chủ dự án thiết lập. Chưa kết nối hoặc triển khai Vercel. Các báo cáo triển khai trong `DOCUMENTS` chỉ lưu trên máy và được gitignore loại trừ.

## Đăng nhập Google — giai đoạn 7.1

Chỉ khởi tạo cảnh 3D sau khi Firebase xác nhận tài khoản và token của dự án với nhà cung cấp `google.com`. Mỗi lần mở trang hoặc bấm vào game đều kiểm tra phiên; đang chơi thì kiểm tra lại định kỳ và khi quay lại tab. Hết hạn hoặc xác minh thất bại sẽ khóa game. Mất Internet cũng khóa game; kết nối lại cần xác minh thành công.

Phiên dùng `browserSessionPersistence` của Firebase SDK; ứng dụng không tự ghi token vào localStorage. Hãy bấm **Đăng xuất** trên trang chào hoặc thanh Công cụ khi rời máy dùng chung. Đăng xuất xóa hồ sơ tạm và dừng điều khiển ngay; chỉ đăng nhập lại hợp lệ mới mở game.

Hồ sơ tạm được chuẩn bị trong bộ nhớ theo Firebase UID, với biệt danh mặc định `Người chơi` và avatar `villager-default`; không đưa email Google vào giao diện hoặc hồ sơ game. Chưa lưu hồ sơ, điểm hay tiến độ lên Firebase. Mã câu hỏi/lưu điểm cục bộ cũ vẫn là phần chưa hoàn thiện, chưa trở thành hệ thống kết quả theo UID hoặc chấm điểm có xác thực phía máy chủ.

Ở giai đoạn này chỉ dùng Firebase App và Authentication. **Không đọc/ghi Firestore hoặc Realtime Database; giữ nguyên Rules khóa toàn bộ.** Màn hình đăng nhập bảo vệ luồng vào game; quyền truy cập dữ liệu phải được kiểm tra bằng backend/Rules khi triển khai multiplayer sau này. JavaScript và tài nguyên tĩnh vẫn có thể tải từ website.

Để thử: trong Firebase Console bật Google provider, thêm `localhost` vào Authorized Domains và dùng đúng cấu hình Web App trong `SOURCE-CODE/js/firebase-config.js`. Mở URL có hostname `localhost` bằng Chrome/Edge và cho phép popup Google. Không tự đổi sang `127.0.0.1` nếu hostname đó chưa được phép. Không dùng `file://`. Nếu gặp `auth/unauthorized-domain`, `auth/operation-not-allowed` hoặc lỗi API key, kiểm tra cấu hình ở Firebase Console; không mở Rules để xử lý lỗi đăng nhập.

Ngày 11/10/2026, chủ dự án xác nhận đã đăng nhập Google thật thành công trên localhost, mở được cảnh làng 3D, tải lại bằng F5/vào lại game, đăng xuất từ Công cụ về Google Login và đăng nhập lại/mở game. Luồng đăng nhập chính giai đoạn 7.1 đã đạt thử nghiệm người dùng. Kết quả này do người dùng xác nhận; Codex chưa trực tiếp quan sát phiên Google và unit test không thay thế kiểm thử tài khoản thật. Trước production cần bổ sung thử mất/kết nối lại, hết hạn/thu hồi phiên thực tế, Console/WebGL/FPS và thiết bị vật lý. [Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin), [phiên đăng nhập](https://firebase.google.com/docs/auth/web/auth-state-persistence), [SDK qua CDN](https://firebase.google.com/docs/web/alt-setup).
