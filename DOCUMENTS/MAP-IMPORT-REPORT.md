# Báo cáo nhập tài nguyên MAP

Thời điểm: 2026-10-11T19:44:25+07:00.

- Dự án: `H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT`.
- Nhánh đã xác nhận: `cap-nhat`.
- Nguồn: `MAP/_IMPORT_ZIP/`; đích: `MAP/regions/<ma-map>/references/`.
- Đã đọc danh sách toàn bộ 11 ZIP trước khi giải nén; mỗi ZIP có thư mục tạm riêng.
- Kết quả: **11 gói / 45 ảnh**, 165,258,962 byte (157.60 MiB).
- Phân loại: **ảnh tham chiếu**, không phải MAP chơi được. Không phát hiện mô hình 3D, mã nguồn hoặc tài nguyên khác trong các ZIP.
- Giải mã ảnh: **45/45 đạt**; kiểm tra cấu trúc bằng Pillow verify, giải mã đầy đủ bằng load, đối chiếu SHA-256 sau sao chép; CRC ZIP được xác minh khi đọc hết từng thành viên.
- Trùng nội dung dùng lại: 0; trùng tên khác nội dung lưu phiên bản riêng: 0.
- Bảo toàn 202 tệp có sẵn trong danh sách Git và tệp chưa theo dõi: hash không đổi, gồm toàn bộ ZIP gốc. Không thay đổi các mục Git có sẵn.
- Không sửa mã nguồn game, đăng ký MAP chơi được, commit, push, deploy hoặc thay đổi bản chính.

## Danh sách gói

| ZIP | Mã MAP | Vị trí lưu | Số ảnh | Loại tài nguyên | Kết quả | Thành phần còn thiếu |
| --- | --- | --- | ---: | --- | --- | --- |
| `CO_LOA_4_GOC_THAM_CHIEU.zip` | `co-loa` | `MAP/regions/co-loa/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `DAI_NOI_HUE_4_GOC_THAM_CHIEU.zip` | `dai-noi-hue` | `MAP/regions/dai-noi-hue/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `HOA_LU_4_GOC_THAM_CHIEU.zip` | `hoa-lu` | `MAP/regions/hoa-lu/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `HOI_AN_4_GOC_THAM_CHIEU.zip` | `hoi-an` | `MAP/regions/hoi-an/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `LAM_KINH_4_GOC_THAM_CHIEU.zip` | `lam-kinh` | `MAP/regions/lam-kinh/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `Lang-Viet.zip` | `lang-viet` | `MAP/regions/lang-viet/references/` | 5 | Ảnh tham chiếu JPEG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `LANG_TAN_THU_4_GOC_THAM_CHIEU.zip` | `lang-tan-thu` | `MAP/regions/lang-tan-thu/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `MY_SON_4_GOC_THAM_CHIEU.zip` | `my-son` | `MAP/regions/my-son/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `THANG_LONG_4_GOC_THAM_CHIEU.zip` | `thang-long` | `MAP/regions/thang-long/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `THANH_NHA_HO_4_GOC_THAM_CHIEU.zip` | `thanh-nha-ho` | `MAP/regions/thanh-nha-ho/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |
| `VAN_DON_4_GOC_THAM_CHIEU.zip` | `van-don` | `MAP/regions/van-don/references/` | 4 | Ảnh tham chiếu PNG | Đã nhập, đọc được | Cảnh 3D, địa hình/va chạm, điểm xuất hiện/cổng chuyển, ánh sáng, cấu hình và kiểm thử MAP |

## Quy tắc xử lý

- Mã MAP bỏ `.zip`, hậu tố tải xuống `(n)` và `_4_GOC_THAM_CHIEU`, chuyển chữ thường, thay `_` bằng `-`.
- `lang-viet` và `lang-tan-thu` là hai vùng riêng, không hợp nhất.
- Cả 11 gói có một thư mục bao ngoài; bỏ đúng một lớp này. Giữ nguyên tên ảnh và cấu trúc thư mục con còn lại; không đổi kích thước hay nén lại ảnh.
- Khi đích cùng nội dung thì dùng tệp đã có. Nếu khác nội dung, phiên bản mới nằm trong `references/_versions/<hash-zip>-<hash-anh>/`, vẫn giữ nguyên tên ảnh. Lần nhập này không gặp xung đột.
- Nếu gặp mô hình hoặc mã nguồn ở lần nhập sau, phải phân loại riêng và báo cáo trước khi tích hợp game. Không thực thi tệp trong ZIP.
- Mười gói PNG có bốn ảnh mang tên Trước/Trái/Phải/Sau; gói `lang-viet` có năm JPG với tên gốc, chưa gán ý nghĩa góc nhìn chỉ từ tên tệp.
- Chưa có mô hình/scene/material/game logic trong các gói này. Cần dựng và kiểm thử cảnh 3D đi lại được rồi mới đăng ký MAP chơi được. Các ảnh không được dùng thay toàn bộ map 3D.

## Chi tiết giải nén và xác minh

Danh sách trước giải nén, baseline và kết quả máy đọc nằm tại `.cache/map-import-20261011-194237/`. Các thư mục tạm riêng còn được giữ ở đây để đối chiếu; `.cache/` đã được Git bỏ qua. Không có game loader nào được nối vào thư mục tạm.

`DOCUMENTS/MAP-IMPORT-REPORT.md` hiện bị quy tắc `/DOCUMENTS/*` có sẵn loại khỏi Git. Báo cáo vẫn tồn tại trên máy; lần này không thay đổi `.gitignore` hoặc stage tệp.

### co-loa

- ZIP: `CO_LOA_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `2768d10c347b10698d2d4cd4ce7a355712f2fa3bc3d1effa4f6aac361440b6ac`.
- Thư mục bao ngoài đã bỏ: `CO_LOA_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/01-co-loa/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `CO_LOA_4_GOC/01_Co_Loa_Truoc.png` | `MAP/regions/co-loa/references/01_Co_Loa_Truoc.png` | 1536 × 1024, PNG | 4076164 | `8848ccd689b4e323170b41d15a2b493d881a7becfe8ceff178f97ce072df5de4` | Nhập mới; giải mã đạt |
| `CO_LOA_4_GOC/02_Co_Loa_Trai.png` | `MAP/regions/co-loa/references/02_Co_Loa_Trai.png` | 1536 × 1024, PNG | 4180029 | `9986ce1eb16fcf4df7bfccbce56d633b468f80986c58b73395077018355e9b06` | Nhập mới; giải mã đạt |
| `CO_LOA_4_GOC/03_Co_Loa_Phai.png` | `MAP/regions/co-loa/references/03_Co_Loa_Phai.png` | 1536 × 1024, PNG | 4040574 | `0816a41ba299d060e71c25796e52a9066bd1bad6bafcde657fbbcdb924a4a270` | Nhập mới; giải mã đạt |
| `CO_LOA_4_GOC/04_Co_Loa_Sau.png` | `MAP/regions/co-loa/references/04_Co_Loa_Sau.png` | 1536 × 1024, PNG | 3753563 | `2147f55055e8a143d95eb82c70d016ebfe6760f00341292fea5923261afb97e1` | Nhập mới; giải mã đạt |

### dai-noi-hue

- ZIP: `DAI_NOI_HUE_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `6cb6479791375c079b34cab353af9d1e10efd7da7ea6179b467f11e1f3407c3b`.
- Thư mục bao ngoài đã bỏ: `DAI_NOI_HUE_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/02-dai-noi-hue/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `DAI_NOI_HUE_4_GOC/01_Dai_Noi_Hue_Truoc.png` | `MAP/regions/dai-noi-hue/references/01_Dai_Noi_Hue_Truoc.png` | 1536 × 1024, PNG | 3327862 | `44e619f12d969b62b6b27399fafa2618b5b0c632c357e16fbfcf0c0b0fd059f8` | Nhập mới; giải mã đạt |
| `DAI_NOI_HUE_4_GOC/02_Dai_Noi_Hue_Trai.png` | `MAP/regions/dai-noi-hue/references/02_Dai_Noi_Hue_Trai.png` | 1536 × 1024, PNG | 4001974 | `7914a35273bd1eba424d540f79a626b724c2e2858c89bb6b86746c8b5cb5a0e9` | Nhập mới; giải mã đạt |
| `DAI_NOI_HUE_4_GOC/03_Dai_Noi_Hue_Phai.png` | `MAP/regions/dai-noi-hue/references/03_Dai_Noi_Hue_Phai.png` | 1536 × 1024, PNG | 3931616 | `61ff5c99aae6ae653f46a18b549e6ee295e22a565d8aee99ed514cd98ba15449` | Nhập mới; giải mã đạt |
| `DAI_NOI_HUE_4_GOC/04_Dai_Noi_Hue_Sau.png` | `MAP/regions/dai-noi-hue/references/04_Dai_Noi_Hue_Sau.png` | 1536 × 1024, PNG | 3812499 | `2a284ab469a425adc4baf5f61bfb2272a56ed4b81794d75e3d5ef67e2fd29320` | Nhập mới; giải mã đạt |

### hoa-lu

- ZIP: `HOA_LU_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `ba14cc03de0cc05920f84f8c135097bb18553f20cb29fe42df442b1c15a8ad82`.
- Thư mục bao ngoài đã bỏ: `HOA_LU_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/03-hoa-lu/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `HOA_LU_4_GOC/01_Hoa_Lu_Truoc.png` | `MAP/regions/hoa-lu/references/01_Hoa_Lu_Truoc.png` | 1536 × 1024, PNG | 4402378 | `b02874a86d2149c7d20d7c1c3dc7dd268c41e5ddf3f2da4c04f52bce427d76c8` | Nhập mới; giải mã đạt |
| `HOA_LU_4_GOC/02_Hoa_Lu_Trai.png` | `MAP/regions/hoa-lu/references/02_Hoa_Lu_Trai.png` | 1536 × 1024, PNG | 4562364 | `5f871346f15b679073d21a84399964250d54f66deed534830af6ca7f542b89f1` | Nhập mới; giải mã đạt |
| `HOA_LU_4_GOC/03_Hoa_Lu_Phai.png` | `MAP/regions/hoa-lu/references/03_Hoa_Lu_Phai.png` | 1536 × 1024, PNG | 4515376 | `4ee0eb6e3cffc1b13e29d8c486d578bfd293378b0b86f439dff8e49746eea62c` | Nhập mới; giải mã đạt |
| `HOA_LU_4_GOC/04_Hoa_Lu_Sau.png` | `MAP/regions/hoa-lu/references/04_Hoa_Lu_Sau.png` | 1536 × 1024, PNG | 4242638 | `c468d9f2beb905bcfa24ca7cd28eb0c7760598dfd60227233c7e568838d632cd` | Nhập mới; giải mã đạt |

### hoi-an

- ZIP: `HOI_AN_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `6eadb3c4ed3971915fe3b52d3090a1b70cb59dd258f733b5b82b0efcb802665b`.
- Thư mục bao ngoài đã bỏ: `HOI_AN_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/04-hoi-an/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `HOI_AN_4_GOC/01_Hoi_An_Truoc.png` | `MAP/regions/hoi-an/references/01_Hoi_An_Truoc.png` | 1536 × 1024, PNG | 3767236 | `72b68e1cf2d925689267bcd1dd62befae71d052dfde2c5b5951fc1364f8b96f5` | Nhập mới; giải mã đạt |
| `HOI_AN_4_GOC/02_Hoi_An_Trai.png` | `MAP/regions/hoi-an/references/02_Hoi_An_Trai.png` | 1536 × 1024, PNG | 4092687 | `4f7f95cc3732811c0ad4a89e5f91d7af7a3548dbcd5577efcd5d62fa75ea86b0` | Nhập mới; giải mã đạt |
| `HOI_AN_4_GOC/03_Hoi_An_Phai.png` | `MAP/regions/hoi-an/references/03_Hoi_An_Phai.png` | 1536 × 1024, PNG | 4248213 | `1351736a272318887d062b3cf5587394dc026a544b64759feb11d3b6c3bf683c` | Nhập mới; giải mã đạt |
| `HOI_AN_4_GOC/04_Hoi_An_Sau.png` | `MAP/regions/hoi-an/references/04_Hoi_An_Sau.png` | 1536 × 1024, PNG | 4099239 | `0f7e7ddafd5f759483200349dfc1ff843bae4c08e67fc8b877fa41368abbdd35` | Nhập mới; giải mã đạt |

### lam-kinh

- ZIP: `LAM_KINH_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `7450ff806b1bc0fa1193c720471e9d0e1672aad07789492d2f5022b75a369d57`.
- Thư mục bao ngoài đã bỏ: `LAM_KINH_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/05-lam-kinh/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `LAM_KINH_4_GOC/01_Lam_Kinh_Truoc.png` | `MAP/regions/lam-kinh/references/01_Lam_Kinh_Truoc.png` | 1536 × 1024, PNG | 4286917 | `ecaa94d14d31302cf6263c492230ad53ed11f9702f65e9a33467209f14fa117b` | Nhập mới; giải mã đạt |
| `LAM_KINH_4_GOC/02_Lam_Kinh_Trai.png` | `MAP/regions/lam-kinh/references/02_Lam_Kinh_Trai.png` | 1536 × 1024, PNG | 4466021 | `ec3f5a2b4a9605fe09c7ff6e4d8c1c42280d9367c577af69e10a822dd73cd971` | Nhập mới; giải mã đạt |
| `LAM_KINH_4_GOC/03_Lam_Kinh_Phai.png` | `MAP/regions/lam-kinh/references/03_Lam_Kinh_Phai.png` | 1536 × 1024, PNG | 4489688 | `85c843e2a80f9cc2afef3d574f251666dec7bb47dd4312352bc8f5de3e4cd368` | Nhập mới; giải mã đạt |
| `LAM_KINH_4_GOC/04_Lam_Kinh_Sau.png` | `MAP/regions/lam-kinh/references/04_Lam_Kinh_Sau.png` | 1536 × 1024, PNG | 3720205 | `5fdb5214efb744198958366482b9c0a078731e8c40457dac72f57e648d826906` | Nhập mới; giải mã đạt |

### lang-viet

- ZIP: `Lang-Viet.zip`.
- SHA-256 ZIP: `066da1aa3c029c6a91c65934a252a4782f3e070c659e522411991f85b1dbcccf`.
- Thư mục bao ngoài đã bỏ: `Lang-Viet`.
- Giải nén tạm: `.cache/map-import-20261011-194237/06-lang-viet/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `Lang-Viet/1791683938686_358328111282379811_g838016562893130619_efdb7057f693069b579fb0623b2e26ab.jpg` | `MAP/regions/lang-viet/references/1791683938686_358328111282379811_g838016562893130619_efdb7057f693069b579fb0623b2e26ab.jpg` | 1536 × 1024, JPEG | 691909 | `4fa4dd87edb40b47e92e6fea11624e85dc8ce387e3152bf970d6081bc847b361` | Nhập mới; giải mã đạt |
| `Lang-Viet/1791683938746_358328111282379811_g838016562893130619_5be600a3ffb9f2cbdef78441f0298152.jpg` | `MAP/regions/lang-viet/references/1791683938746_358328111282379811_g838016562893130619_5be600a3ffb9f2cbdef78441f0298152.jpg` | 1536 × 1024, JPEG | 811724 | `c98fb05cbb217f497aa9e89c35dc759df84ff66479204166d8ba6e8d711f4a19` | Nhập mới; giải mã đạt |
| `Lang-Viet/1791683938800_358328111282379811_g838016562893130619_21a11f87c8097995d4d08d2678246854.jpg` | `MAP/regions/lang-viet/references/1791683938800_358328111282379811_g838016562893130619_21a11f87c8097995d4d08d2678246854.jpg` | 1536 × 1024, JPEG | 733519 | `a912818bf4230ecc7023ec4373a224cc37029e8a27f81a323212d34a07255b23` | Nhập mới; giải mã đạt |
| `Lang-Viet/1791683938885_358328111282379811_g838016562893130619_df44917d2b4ac61ca9802a56d21a9d84.jpg` | `MAP/regions/lang-viet/references/1791683938885_358328111282379811_g838016562893130619_df44917d2b4ac61ca9802a56d21a9d84.jpg` | 1536 × 1024, JPEG | 789518 | `c7ce152b01a83899285f08c9bb0e9195a1e9a5e90b6217df825df91f94dec69a` | Nhập mới; giải mã đạt |
| `Lang-Viet/1791683938969_358328111282379811_g838016562893130619_60b1f7d3c0bb3522413686cedeac6b11.jpg` | `MAP/regions/lang-viet/references/1791683938969_358328111282379811_g838016562893130619_60b1f7d3c0bb3522413686cedeac6b11.jpg` | 1536 × 1024, JPEG | 761024 | `14dd53782804d1dc68020509cb7f480432bad6f9498d08127ae7673355076c70` | Nhập mới; giải mã đạt |

### lang-tan-thu

- ZIP: `LANG_TAN_THU_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `873fabbbf9c31382ed3c1848de09d0a2b6ce05c2a2c5daa1d8ccdaeaf0ebe8b0`.
- Thư mục bao ngoài đã bỏ: `LANG_TAN_THU_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/07-lang-tan-thu/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `LANG_TAN_THU_4_GOC/01_Lang_Tan_Thu_Truoc.png` | `MAP/regions/lang-tan-thu/references/01_Lang_Tan_Thu_Truoc.png` | 1536 × 1024, PNG | 4224596 | `a09edaeff3cd3bc09d3e0ee89923810c133a2383f1fca9946ea8016b17727fa6` | Nhập mới; giải mã đạt |
| `LANG_TAN_THU_4_GOC/02_Lang_Tan_Thu_Trai.png` | `MAP/regions/lang-tan-thu/references/02_Lang_Tan_Thu_Trai.png` | 1536 × 1024, PNG | 3840843 | `ece05b6a8052b28680f768b8619acc39f38d027aa39cff9f4ed6a969d4e3ce5f` | Nhập mới; giải mã đạt |
| `LANG_TAN_THU_4_GOC/03_Lang_Tan_Thu_Phai.png` | `MAP/regions/lang-tan-thu/references/03_Lang_Tan_Thu_Phai.png` | 1536 × 1024, PNG | 3834307 | `ccd9fc5f41df917dde9dfb53352a07b08bed0897028d89f89b1138721ce4e19e` | Nhập mới; giải mã đạt |
| `LANG_TAN_THU_4_GOC/04_Lang_Tan_Thu_Sau.png` | `MAP/regions/lang-tan-thu/references/04_Lang_Tan_Thu_Sau.png` | 1536 × 1024, PNG | 3831018 | `0135bb23076e9f15acf9dcc852e6a4038152982a220c571798964a143108a8e5` | Nhập mới; giải mã đạt |

### my-son

- ZIP: `MY_SON_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `8df89d6e35d13b929da6d372dd28c22efbdca8d71535c4280a5783a8ada7b744`.
- Thư mục bao ngoài đã bỏ: `MY_SON_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/08-my-son/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `MY_SON_4_GOC/01_My_Son_Truoc.png` | `MAP/regions/my-son/references/01_My_Son_Truoc.png` | 1536 × 1024, PNG | 3724340 | `05bfad1e7ac67bda5eeb3c6e238abd7417a41ca75b5ab9f508dca2b85b227eb1` | Nhập mới; giải mã đạt |
| `MY_SON_4_GOC/02_My_Son_Trai.png` | `MAP/regions/my-son/references/02_My_Son_Trai.png` | 1536 × 1024, PNG | 4098319 | `8e831c9d5d8cc8b069f432f44b55b5b489b3ec5a4ee6b30c0707a6ee4121c207` | Nhập mới; giải mã đạt |
| `MY_SON_4_GOC/03_My_Son_Phai.png` | `MAP/regions/my-son/references/03_My_Son_Phai.png` | 1536 × 1024, PNG | 3792046 | `d17376ea7ecf732b0c402bdca5f799e6dd3585cda1d5ac3fdee0b0574e5280e9` | Nhập mới; giải mã đạt |
| `MY_SON_4_GOC/04_My_Son_Sau.png` | `MAP/regions/my-son/references/04_My_Son_Sau.png` | 1536 × 1024, PNG | 3938998 | `fc213e0a3acbe372f67ecad7133d80b3ce40c9c1be856af0eb643a529a5b895f` | Nhập mới; giải mã đạt |

### thang-long

- ZIP: `THANG_LONG_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `088680ee694980a6df778c16c4818846332efb0165d6852a530a4430a1850363`.
- Thư mục bao ngoài đã bỏ: `THANG_LONG_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/09-thang-long/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `THANG_LONG_4_GOC/01_Thang_Long_Truoc.png` | `MAP/regions/thang-long/references/01_Thang_Long_Truoc.png` | 1536 × 1024, PNG | 4329098 | `64b12ae5aece2e4eb7cb3372b1303a3c74bd01833bf4863e3befea93c4d7990a` | Nhập mới; giải mã đạt |
| `THANG_LONG_4_GOC/02_Thang_Long_Trai.png` | `MAP/regions/thang-long/references/02_Thang_Long_Trai.png` | 1536 × 1024, PNG | 4306931 | `ab0228ba4d31f35819f2c6e53bdbb989b13fd3063e01ed756d046f463cdc7ef8` | Nhập mới; giải mã đạt |
| `THANG_LONG_4_GOC/03_Thang_Long_Phai.png` | `MAP/regions/thang-long/references/03_Thang_Long_Phai.png` | 1536 × 1024, PNG | 4355811 | `89437b405ac3c8382f32035bbcefcdc8a22fbd97ab0df3ba9422708e0863a6d6` | Nhập mới; giải mã đạt |
| `THANG_LONG_4_GOC/04_Thang_Long_Sau.png` | `MAP/regions/thang-long/references/04_Thang_Long_Sau.png` | 1536 × 1024, PNG | 4332703 | `782a2c5a66997505ce88974d333d79a85eff60619d963ba5be46f55511d003d6` | Nhập mới; giải mã đạt |

### thanh-nha-ho

- ZIP: `THANH_NHA_HO_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `0ae0cb7b4c5b2079ccdedecf77009abacb484cd957bab2f912f19f84a467bf9c`.
- Thư mục bao ngoài đã bỏ: `THANH_NHA_HO_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/10-thanh-nha-ho/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `THANH_NHA_HO_4_GOC/01_Thanh_Nha_Ho_Truoc.png` | `MAP/regions/thanh-nha-ho/references/01_Thanh_Nha_Ho_Truoc.png` | 1536 × 1024, PNG | 3717081 | `e5715debebe74f5f4fdee565284fa015d7664ea905f404e354d4b1285559b94c` | Nhập mới; giải mã đạt |
| `THANH_NHA_HO_4_GOC/02_Thanh_Nha_Ho_Trai.png` | `MAP/regions/thanh-nha-ho/references/02_Thanh_Nha_Ho_Trai.png` | 1536 × 1024, PNG | 3976312 | `f6cb526cab53fa33fb83d67be98e1ef83122efe850f7240f3496022593b8bfb5` | Nhập mới; giải mã đạt |
| `THANH_NHA_HO_4_GOC/03_Thanh_Nha_Ho_Phai.png` | `MAP/regions/thanh-nha-ho/references/03_Thanh_Nha_Ho_Phai.png` | 1536 × 1024, PNG | 3428762 | `969d72b3eda9796450f25b5e9676e9537ae63a980f886f749faf40523d700ae6` | Nhập mới; giải mã đạt |
| `THANH_NHA_HO_4_GOC/04_Thanh_Nha_Ho_Sau.png` | `MAP/regions/thanh-nha-ho/references/04_Thanh_Nha_Ho_Sau.png` | 1536 × 1024, PNG | 3966722 | `4a2381715668975405e09249ccb6cf7a98f245d1365f10d6e1ab1eb9820a2d7a` | Nhập mới; giải mã đạt |

### van-don

- ZIP: `VAN_DON_4_GOC_THAM_CHIEU.zip`.
- SHA-256 ZIP: `09518a5ceec421f8b20d409849bb0311b6fb660031ba54b7c4fc2a840b4f2832`.
- Thư mục bao ngoài đã bỏ: `VAN_DON_4_GOC`.
- Giải nén tạm: `.cache/map-import-20261011-194237/11-van-don/extracted`.

| Tệp bên trong ZIP | Tệp đích (tương đối với dự án) | Kích thước ảnh | Byte | SHA-256 | Kết quả |
| --- | --- | --- | ---: | --- | --- |
| `VAN_DON_4_GOC/01_Van_Don_Truoc.png` | `MAP/regions/van-don/references/01_Van_Don_Truoc.png` | 1536 × 1024, PNG | 3784198 | `7435bf279bfd647754a1dfac5166538f31ba23e920edc92a784a705bf963f11c` | Nhập mới; giải mã đạt |
| `VAN_DON_4_GOC/02_Van_Don_Trai.png` | `MAP/regions/van-don/references/02_Van_Don_Trai.png` | 1536 × 1024, PNG | 3916166 | `be75f10d6fa73620ad7d27e6817d1370742da76f8baf0d962693515848142e44` | Nhập mới; giải mã đạt |
| `VAN_DON_4_GOC/03_Van_Don_Phai.png` | `MAP/regions/van-don/references/03_Van_Don_Phai.png` | 1536 × 1024, PNG | 4031978 | `fe8e0953fa5b293dc26229f2e92dcb97facdd7989f375cb29eaee4b4aff90c6c` | Nhập mới; giải mã đạt |
| `VAN_DON_4_GOC/04_Van_Don_Sau.png` | `MAP/regions/van-don/references/04_Van_Don_Sau.png` | 1536 × 1024, PNG | 4023796 | `0127692a9098bec5f3fc8c4b0f1aecbc0ede824a3e5afb75a0400481db9f5d0d` | Nhập mới; giải mã đạt |


## Cập nhật bổ sung lúc 20:44 ngày 11/10/2026

Ba gói mới Bạch Đằng, Ngoại Làng Đồng Tre và bản đồ toàn quốc đã được nhập, kiểm tra và chuyển sang `MAP/_ARCHIVE_ZIP/`. Hiện `_IMPORT_ZIP` không còn ZIP chờ xử lý. Nội dung bên trên là kết quả lịch sử trước đợt bổ sung này. Xem [báo cáo đợt nhập mới](MAP-IMPORT-REPORT-20261011-NEW-PACKAGES.md) để biết đường dẫn và kết quả chi tiết.
