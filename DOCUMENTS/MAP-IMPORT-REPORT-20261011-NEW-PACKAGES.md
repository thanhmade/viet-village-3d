# Nhập các gói MAP mới và chuyển ZIP vào lưu trữ

Thời điểm: 2026-10-11T20:44:06.686004+07:00.

- Thư mục: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`.
- Git root đúng thư mục trên; nhánh `cap-nhat`.
- Kết quả: **3/3 gói nhập thành công; 35 tệp, 49.773.878 byte (~47,47 MiB)**.
- **3 ZIP đã chuyển sang `MAP/_ARCHIVE_ZIP/`; 0 ZIP còn chờ tại `MAP/_IMPORT_ZIP/`.**
- Xung đột tên/nội dung: 0. Không ghi đè hoặc xóa tài nguyên cũ.
- Cả ba gói là tài nguyên chuẩn bị dựng MAP, chưa đăng ký thành MAP 3D chơi được.

## Các gói đã nhập

| ZIP | Mã MAP | Vị trí tài nguyên | Số tệp | Trạng thái |
| --- | --- | --- | ---: | --- |
| `BACH_DANG_4_GOC_THAM_CHIEU.zip` | `bach-dang` | `MAP/regions/bach-dang/references/` | 4 PNG | Đã nhập, giải mã ảnh đạt, ZIP đã lưu trữ |
| `NGOAI_LANG_DONG_TRE_4_GOC_THAM_CHIEU.zip` | `ngoai-lang-dong-tre` | `MAP/regions/ngoai-lang-dong-tre/references/` và `docs/` | 4 PNG + 1 MD | Đã nhập, ảnh/tài liệu đọc được, ZIP đã lưu trữ |
| `VIET_NAM_MAP_TOAN_QUOC_NGUON_2025.zip` | `viet-nam-map-toan-quoc-nguon-2025` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/` | 26 | Đã nhập nguyên bộ, kiểm tra cấu trúc/cú pháp đạt, ZIP đã lưu trữ |

Mã MAP giữ quy tắc theo tên ZIP: bỏ phần mở rộng, hậu tố tải xuống `(n)` và `_4_GOC_THAM_CHIEU`, chuyển chữ thường, thay `_` bằng `-`. Không đổi hoặc hợp nhất các mã đã có; Làng Việt và Làng Tân Thủ vẫn riêng biệt.

## Cách sắp xếp

### Bạch Đằng

Bỏ thư mục bao ngoài `BACH_DANG_4_GOC`, giữ nguyên tên bốn ảnh trước/trái/phải/sau trong `references/`. Mỗi ảnh 1536×1024.

### Ngoại Làng Đồng Tre

Bỏ thư mục bao ngoài `NGOAI_LANG_DONG_TRE`. Bốn ảnh 1536×1024 nằm trong `references/`; tài liệu nguyên bản tại `docs/HUONG_DAN_MAP.md`. Tài liệu nhắc tên ảnh nhưng không có liên kết tương đối cần sửa.

### Bản đồ toàn quốc

Bỏ thư mục bao ngoài `VIET_NAM_MAP_TOAN_QUOC`, giữ nguyên toàn bộ cây nội bộ tại `source-package/`, gồm `data/`, `sources/`, `docs/` và các tệp ở gốc.

Thành phần: **3 PNG, 4 SVG, 1 HTML, 8 JSON, 4 Python, 2 CJS, 3 Markdown và 1 PDF**. Ba PNG có kích thước 4971×6000. PDF nguồn có 1 trang.

Giữ các ảnh cùng bộ nguồn thay vì tách chúng khỏi các script dùng đường dẫn tương đối. HTML chứa sẵn hình/dữ liệu; không phát hiện yêu cầu tải tài nguyên hoặc API mạng ngoài trong phần kiểm tra tĩnh. Các đường dẫn ZIP địa danh trong dữ liệu là metadata đối chiếu, không phải tệp phụ thuộc bị thiếu trong gói này.

Đây là **bộ bản đồ 2D, trang xem và dữ liệu**, không phải mô hình/cảnh 3D. Không chạy trang HTML, script tạo dữ liệu hoặc các bài test do gói cung cấp; chỉ kiểm tra cú pháp và cấu trúc. Các tệp `*-validation.json` trong ZIP là hồ sơ đi kèm từ tác giả gói, không được coi là kết quả chạy mới của lần nhập này.

## Xác minh đã thực hiện

1. Đọc danh sách cả ba ZIP trước khi giải nén, kiểm tra đường dẫn không vượt ra ngoài thư mục đích, không nhận symlink hoặc thành viên trùng đường dẫn.
2. Mỗi gói được giải nén vào một thư mục tạm riêng trong `.cache/map-import-20261011-204359/`.
3. Đọc hết **35/35 thành viên ZIP** để xác minh CRC và kích thước.
4. **11/11 PNG** đạt kiểm tra cấu trúc và giải mã đầy đủ sau giải nén và sau sao chép.
5. **4 SVG** phân tích XML; **8 JSON** phân tích cấu trúc; **1 PDF** đọc được bằng pypdf; **4 tài liệu Markdown** đọc được bằng UTF-8.
6. **4 Python** đạt `ast.parse`; **2 CJS** đạt `node --check`; HTML được phân tích bằng HTMLParser. Không thực thi logic gói và không khẳng định các công cụ đó đã chạy thành công.
7. Kiểm tra độc lập **35/35 tệp đích khớp từng byte với thành viên ZIP**. Manifest gói toàn quốc liệt kê 25 tệp còn lại ngoài chính manifest: đủ 25/25, khớp kích thước và SHA-256.
8. **47/47 tệp cũ trong `MAP/regions`** giữ nguyên SHA-256, gồm 45 ảnh và hai module cảnh Làng Việt/Làng Tân Thủ.
9. Chỉ di chuyển ZIP sau khi kiểm tra thành công mọi tệp đích; dùng `Move-Item -LiteralPath`, không ghi đè. **3/3 ZIP sau di chuyển giữ nguyên SHA-256**.
10. Kiểm tra cuối: `_IMPORT_ZIP` rỗng; `_ARCHIVE_ZIP` chứa đúng ba ZIP của đợt này. Không có ZIP lỗi/chờ xử lý.

## Những thành phần còn thiếu để chơi 3D

| Gói | Cần hoàn thành trước khi đăng ký MAP chơi được |
| --- | --- |
| Bạch Đằng | Dựng địa hình, mặt nước/bờ và công trình/đạo cụ 3D theo bốn ảnh; cấu hình sàn, va chạm, vùng không đi được, spawn và cổng; tích hợp nhân vật, camera, môi trường; kiểm tra đi lại và hiệu năng. |
| Ngoại Làng Đồng Tre | Dựng cảnh 3D theo ảnh và hướng dẫn, bố trí đường đi/đồ vật, sàn/va chạm, spawn/cổng kết nối; ánh sáng/thời tiết; kiểm thử điều khiển, mobile và chuyển MAP. |
| Bản đồ toàn quốc | Quyết định dùng bộ 2D làm giao diện chọn vùng hay dựng thế giới 3D; ánh xạ địa danh sang các scene thực tế, trạng thái sẵn sàng/tải cảnh và cổng. Nếu dựng MAP 3D, còn thiếu địa hình, mô hình, va chạm, camera và logic chơi. Chưa kiểm thử hoạt động của trình xem/generator đi kèm hoặc độ chính xác địa lý. |

Chỉ hai MAP 3D đã có là Làng Việt và Làng Tân Thủ tiếp tục được game đăng ký. Không thêm ba gói mới vào game loader, không sửa điều khiển, nhân vật, nhà, nội thất, thời tiết hoặc ánh sáng.

## Bảo toàn phiên bản

- Tệp cùng đường dẫn và cùng SHA-256 được dùng lại; khác nội dung sẽ có bản riêng trong `_versions/`, giữ tên gốc.
- Với gói mã nguồn/dữ liệu có phụ thuộc tương đối, nếu có xung đột thì giữ nguyên cả bộ trong `source-package/_versions/<sha-zip>/` để các đường dẫn nội bộ nhất quán.
- Nếu tên ZIP ở archive đã tồn tại, không ghi đè; so sánh SHA-256 và dùng tên có hậu tố phân biệt bản sao/phiên bản. Đợt này không gặp trùng tên.
- Không sửa bản chính, không cài phần mềm/thư viện, không commit/push/deploy hoặc thay đổi Firebase.
- Không chạy lại game/build vì mã nguồn game và các tài nguyên đang được game sử dụng không đổi; kiểm tra của nhiệm vụ này tập trung vào tài nguyên nhập và tính toàn vẹn dữ liệu.

## Hồ sơ kiểm tra

- `.cache/map-import-20261011-204359/zip-inventory.json`: danh sách trước giải nén.
- `.cache/map-import-20261011-204359/regions-before.json`: checksum tài nguyên cũ.
- `.cache/map-import-20261011-204359/import-results.json`: đường dẫn, checksum, phân loại, kết quả trước/sau sao chép.
- `.cache/map-import-20261011-204359/archive-plan.json` và `archive-results.json`: kế hoạch và kết quả di chuyển ZIP.
- Ba thư mục `01-bach-dang/extracted`, `02-ngoai-lang-dong-tre/extracted`, `03-viet-nam-map-toan-quoc-nguon-2025/extracted`: bản giải nén tạm riêng, giữ lại để đối chiếu; game không tải từ các thư mục này.

## Danh sách tệp và ZIP sau nhập

### bach-dang

- ZIP lưu trữ: `MAP/_ARCHIVE_ZIP/BACH_DANG_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `74a0b01802d21502507e25cbfaa70be15535171067b5c8f6f2b6953756703c83`.

| Tệp trong ZIP sau bỏ thư mục bao ngoài | Vị trí đã nhập | Byte | SHA-256 |
| --- | --- | ---: | --- |
| `01_Bach_Dang_Truoc.png` | `MAP/regions/bach-dang/references/01_Bach_Dang_Truoc.png` | 3291511 | `7932098ea30638857d64229c376fb39d21f2a2f88839fa379a12e14c54b70ff1` |
| `02_Bach_Dang_Trai.png` | `MAP/regions/bach-dang/references/02_Bach_Dang_Trai.png` | 3881154 | `e5232c944079b1cd39ce246b8ba8dfbc465c564c9434040fbfd8616ba86e5f11` |
| `03_Bach_Dang_Phai.png` | `MAP/regions/bach-dang/references/03_Bach_Dang_Phai.png` | 3656315 | `cb1a1280f077bceca965dd363b411383fc1a8556cda7e2fff998ae280cb8b319` |
| `04_Bach_Dang_Sau.png` | `MAP/regions/bach-dang/references/04_Bach_Dang_Sau.png` | 4039375 | `075168b88602cf3e374f28c131439779216345beff2fae451dfb4435863751d4` |

### ngoai-lang-dong-tre

- ZIP lưu trữ: `MAP/_ARCHIVE_ZIP/NGOAI_LANG_DONG_TRE_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `b6cc3958847dcdc3ff0b113b1a6bbd0248acecca80c7635eedb6ff6bdc31690b`.

| Tệp trong ZIP sau bỏ thư mục bao ngoài | Vị trí đã nhập | Byte | SHA-256 |
| --- | --- | ---: | --- |
| `01_Ngoai_Lang_Dong_Tre_Truoc.png` | `MAP/regions/ngoai-lang-dong-tre/references/01_Ngoai_Lang_Dong_Tre_Truoc.png` | 3589770 | `474b06d476a0d28adb0aa9438cef5c8f5b0e8ac8e91319b8c3ec96332f32954e` |
| `02_Ngoai_Lang_Dong_Tre_Trai.png` | `MAP/regions/ngoai-lang-dong-tre/references/02_Ngoai_Lang_Dong_Tre_Trai.png` | 3297396 | `9faa06172bc945df736033f3d4ee1a345fe8f67b7a8b826de9de51729a8200c7` |
| `03_Ngoai_Lang_Dong_Tre_Phai.png` | `MAP/regions/ngoai-lang-dong-tre/references/03_Ngoai_Lang_Dong_Tre_Phai.png` | 3374140 | `ee894cffe8c612518cac40b9a0e30db767c72acce9a692ee784114a2f9ee027d` |
| `04_Ngoai_Lang_Dong_Tre_Sau.png` | `MAP/regions/ngoai-lang-dong-tre/references/04_Ngoai_Lang_Dong_Tre_Sau.png` | 3623967 | `ad5d86264486099f3ea5760b1301c2d6d2d13e3532ed01af251c8ea09227675f` |
| `HUONG_DAN_MAP.md` | `MAP/regions/ngoai-lang-dong-tre/docs/HUONG_DAN_MAP.md` | 4326 | `9cba85ab1b6a58414fa794b89b1e119d082a192a5bb0311dc9624efe463a6c31` |

### viet-nam-map-toan-quoc-nguon-2025

- ZIP lưu trữ: `MAP/_ARCHIVE_ZIP/VIET_NAM_MAP_TOAN_QUOC_NGUON_2025.zip`.
- SHA-256 ZIP: `e404e5916815fa6f597fa210e14c393f947e1aa3155969a60ecdacad317b5b56`.

| Tệp trong ZIP sau bỏ thư mục bao ngoài | Vị trí đã nhập | Byte | SHA-256 |
| --- | --- | ---: | --- |
| `01_Viet_Nam_Nen_Khong_Chu.png` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/01_Viet_Nam_Nen_Khong_Chu.png` | 2053452 | `02ef5ba546d38f16246d06d78f9d7a7eb96350dacc227326c0a10a7e4d822456` |
| `01_Viet_Nam_Nen_Khong_Chu.svg` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/01_Viet_Nam_Nen_Khong_Chu.svg` | 1978953 | `ada40eb4ad1bf35ae0dcbf5dbd2c735a69b4235c77387faffbee98ba827bdbd7` |
| `02_Viet_Nam_Dia_Gioi_Khong_Chu.png` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/02_Viet_Nam_Dia_Gioi_Khong_Chu.png` | 2085349 | `1aa76bc05773b3afb2fffe8615dbd1e0b4df7c00ed991dbb4a94f29725f08f9d` |
| `02_Viet_Nam_Dia_Gioi_Khong_Chu.svg` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/02_Viet_Nam_Dia_Gioi_Khong_Chu.svg` | 1977565 | `f8880bc589dd2264f54acdd9782dbb7993100038b5ee1e6c7c6420b35751c4c9` |
| `03_Viet_Nam_Diem_Vao_Map_Khong_Chu.png` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/03_Viet_Nam_Diem_Vao_Map_Khong_Chu.png` | 2094455 | `e0990de0a8346a52c7118ac38cc6f6283c361c5e27abd138490eaeaab48e3cb4` |
| `03_Viet_Nam_Diem_Vao_Map_Khong_Chu.svg` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/03_Viet_Nam_Diem_Vao_Map_Khong_Chu.svg` | 1980461 | `54b0a7fdff91873ac0bc19d10f84dd7166a4066f0a377c8139d9e5bfe62ff4f4` |
| `04_Xem_Ban_Do.html` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/04_Xem_Ban_Do.html` | 4390901 | `cc3f24d9dce610780def5a024d6e5bc3ffec68080dd72a55957a27ad51ad6d77` |
| `README.md` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/README.md` | 4256 | `af542c6690638cda6326daa91ae1a435dd22470fc494cccc02dffe6ee0381614` |
| `art-validation.json` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/art-validation.json` | 1536 | `962d9843b7cc1805794f99b4267205978d3f2ba8a8301ee6284e3c8855c6a380` |
| `build_art.py` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/build_art.py` | 8780 | `77a821ef14ec361345ea53ef16323d85870fc6b9c1a13d924147c81ec55d06a1` |
| `build_data.py` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/build_data.py` | 7311 | `40d275f1ef15cc8a981c1d5a6bf6367ce4e32d66f96b3a04183338e706da1df7` |
| `build_markers.py` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/build_markers.py` | 2148 | `04ec7add52096c730918ce0c341d3ca5dfa565e36e4a32fab4693cc4d5f48497` |
| `build_viewer.py` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/build_viewer.py` | 26285 | `c2aec0adefbf42725a8f8a35b461094a8680a9cb971e6e8a02b0f46736aacf57` |
| `data/kiem-tra-phep-chieu.json` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/data/kiem-tra-phep-chieu.json` | 6976 | `f8f2dcf1c6f8377cf2d20b6a37ac735ced63f1aa53978680a75de140498a5012` |
| `data/map-data.json` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/data/map-data.json` | 397328 | `9f1caffc510140f19c71b4a589cb07086cc475c8398b0808fd8b67d390c3c521` |
| `data/ranh-gioi-34-vung-nguon.json` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/data/ranh-gioi-34-vung-nguon.json` | 508658 | `ac94d032a22cf13f5202971a1898d9b4583f57d216820adfea367990fca6b698` |
| `docs/NGUON_VA_DO_CHINH_XAC.md` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/docs/NGUON_VA_DO_CHINH_XAC.md` | 6460 | `3b3f1391277b4500a73982d52ec84afdd74b4668aea34c52f928f8e679d933d0` |
| `docs/THIET_KE_MAP_TOAN_QUOC.md` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/docs/THIET_KE_MAP_TOAN_QUOC.md` | 7110 | `fd024f4bcdaa9237942a71f723fabdbc44a5d67e5101b264efa21824f061595d` |
| `marker-validation.json` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/marker-validation.json` | 367 | `ca11eeb5b28d58f8f5462751786d0ace4dadda3861f73c48fc4d25a0fb5ad6ea` |
| `sources/Ban_do_hanh_chinh_Viet_Nam_2025_nguon.pdf` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/sources/Ban_do_hanh_chinh_Viet_Nam_2025_nguon.pdf` | 1737279 | `8caa80f799a05960f6343f1e93a77e55997d0e3933bbf2e2f66f5a51289d2cf9` |
| `sources/diem-vao-map-ban-dau.json` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/sources/diem-vao-map-ban-dau.json` | 4312 | `9fb84f21a3db3700a485009960b14af85691b61fda072f244ad8715e9af08106` |
| `sources/official-base.svg` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/sources/official-base.svg` | 1721476 | `650b86c4bf41fe10dc5c2cce4718ddacf219a15d3904c9124f7e67b991fc967f` |
| `test_viewer.cjs` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/test_viewer.cjs` | 4074 | `8552cba8672dea1c522537d0fa7e72f061f116a597199a488437188e5f6dd803` |
| `test_viewer_static.cjs` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/test_viewer_static.cjs` | 5414 | `34782517b8c34b368f792bb4756cd6f25f28b2ff3cde2f66def8c42ce3e1f76f` |
| `viewer-validation.json` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/viewer-validation.json` | 1529 | `8d65b720a62968b4b9e8fdea0059063752ec59b6331d8a5b262702db13405a3c` |
| `MANIFEST.json` | `MAP/regions/viet-nam-map-toan-quoc-nguon-2025/source-package/MANIFEST.json` | 3489 | `0c2ed48dcc79c6acb1797a1b50c3708019c4ea46d0738da706911c165c8c1fc4` |

