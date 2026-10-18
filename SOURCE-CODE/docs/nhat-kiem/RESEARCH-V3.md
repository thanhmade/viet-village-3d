# Nhất Kiếm V3 — đối soát võ hiệp / tiên hiệp 3D

Ngày xem: 18/10/2026. Người dùng chưa chấp nhận hình ảnh V2; việc V2 đạt test logic không phải nghiệm thu mỹ thuật. V3 nghiên cứu thêm đúng nhóm game người dùng yêu cầu, rồi sửa runtime và dựng lại canvas thật.

## Nguồn thực sự đã xem

| Nguồn chính thức | Phần hình ảnh đã xem | Quan sát và cách áp dụng |
|---|---|---|
| [Kiếm Võng 3 / JX3 — trang môn phái](https://jx3.xoyo.com/zt/2019/08/28/landpage-fly/index.html), [Tàng Kiếm](https://static.jx3.xoyo.com/HD_cangjian.mp4) | Clip 34,9 s; phần chiến đấu khoảng 20,5–31,5 s | Chuyển trọng tâm, xoay thân, tay đối trọng, nhát kiếm lớn và vòng vệt tách lớp. Áp dụng vào tấn trước–sau, ba mặt phẳng chém, vệt theo lưỡi và các luồng khí ngắt đoạn. Không sao chép màu vàng hoặc chiêu nguyên bản. |
| Cùng trang JX3, [Thuần Dương](https://static.jx3.xoyo.com/HD_chunyang.mp4) | Clip 31,97 s; khoảng 18–29 s có chiến đấu và kỹ năng | Khí xanh–trắng ở nhiều độ cao, có nhịp tụ/bùng/tan; động tác người vẫn nhìn thấy. Áp dụng khí tụ quanh thân và kiếm khí bay; không đưa trận pháp/vạn kiếm không thuộc Nhất Kiếm vào game. |
| [Võ Lâm Truyền Kỳ MAX](https://vltkmax.vnggames.com/), [Tàng Kiếm](https://img.zing.vn/upload/vltkmax/source/News/2022/t10/vidtk.mp4) | Clip trình diễn môn phái khoảng 10 s; 2,5–7,5 s rõ chuyển thế/chém | Chân–hông–vai cùng tham gia, có lấy thế và giữ dáng sau nhát. Đây là clip trình diễn, không phải số liệu điều khiển hoặc hitbox gameplay. |
| Cùng trang VLTK MAX, [Võ Đang](https://img.zing.vn/upload/vltkmax/source/News/2022/t8/vidvd.mp4) | Clip trình diễn khoảng 10 s; khí quanh người rõ ở 6,5–9 s | Các nét khí xanh phân lớp và điểm tụ sáng. Chỉ tham khảo hình khối/nhịp sáng, không sao chép vòng trận/pháp kiếm. |
| [Tru Tiên — môn phái](https://zhuxian.wanmei.com/net/260512profession/index.html?page0role4), [Thanh Vân / Qingyun](https://video.games.wanmei.com/wanmei/zhuxian/20210129/qingyun_0.mp4) | Montage kỹ năng 10,93 s; đã xem toàn clip qua bảng khung | Nhiều cao độ ánh sáng, khí tụ rồi bùng và dư quang. Montage cắt giữa nhiều kỹ năng; không coi toàn clip là một chiêu hay suy ra cooldown từ độ dài clip. |

Đã xem thêm năm clip môn phái ở [Tân Tiếu Ngạo](https://ttn.vnggames.com/). Các clip này chủ yếu giới thiệu nhân vật/phong cảnh, không đủ động tác đánh kiếm để làm bằng chứng chuyển động. Không dùng chúng làm cơ sở cho ba nhịp chém.

Các mốc giây là vị trí xem trong clip giới thiệu, xấp xỉ theo bảng khung; không phải tài liệu thiết kế nội bộ của nhà phát hành. Chỉ liên kết nguồn; không đóng gói video, model, texture hay âm thanh của các game đó.

## Đối chiếu với ảnh của người dùng và V2

Ảnh `SOURCE-CODE/docs/nhat-kiem-reference.png` có người hạ thấp trong thế lao tới, nhiều vệt xanh–trắng, kiếm khí hướng vào điểm chạm sáng và bụi/mảnh vụn ở vách. Dòng mô tả nêu “vạch kiếm đa lớp, liên hoàn chém, kiếm khí bay”. Giữ ba nhịp liên hoàn thay vì tự đổi thành một nhát đơn.

| Vấn đề ở V2 | Sửa trong V3 |
|---|---|
| Dáng còn đứng cao, góc hông nhỏ, tay trái gần như giữ một chỗ | Hạ hông 22–31 cm trong pha đánh, chân trước +46 cm/chân sau -30 cm, mở ngang thêm 19 cm mỗi bên; hông tới khoảng ±42°, tay trái đối trọng |
| Cảm giác lực chỉ ở tay | Dồn hông về trước 10–18 cm trong visual, nghiêng thân theo hệ trục hướng đánh, chân vẫn trụ; collider không bị kéo đi |
| Vệt mảnh và đều, ít chiều sâu | Tăng khẩu độ chém; thân vệt xanh có nhiễu mềm, mép trắng và hai sợi phụ ở Medium/High; dư vệt khoảng 0,20 s |
| Tụ lực chỉ là một điểm sáng đầu kiếm | Thêm luồng khí từng đoạn, khác độ cao, chuyển động quanh thân; nhịp tụ lần nữa trước nhát cuối |
| Kiếm khí/chạm đích nhẹ | Một lưỡi liềm bay với bốn lớp quang học lệch chiều sâu/cao độ; chớp xanh–trắng/vàng, tia kéo dài, bụi và mảnh vụn tại va chạm thật |

## Các vòng tự kiểm tra hình ảnh

1. Render thử cho thấy shader nhiều vạch ngang gây cảm giác răng cưa, các cung khí chồng quá đều thành vòng bao người. Đã bỏ vạch tần số cao, rút cung thành đoạn, giảm số luồng và thêm nhiễu mềm ở thân vệt.
2. Xem ngang để kiểm tra tấn/chân và hướng thân. Sửa nghiêng spine theo hệ trục của actor thay vì giả định trục X cục bộ của xương GLB. Có test riêng cho hông hạ/tiến và thân nghiêng về hướng đánh trên cả nam/nữ.
3. Dựng chuỗi V2/V3 cùng camera, GLB, ánh sáng; dựng thêm cảnh vách và bia cuối tầm từ renderer thực. Không thay canvas bằng ảnh/video AI, không thêm hiệu ứng hậu kỳ vào kiếm để làm clip đẹp hơn runtime.

## Phân biệt dữ kiện và đề xuất

- **Đã quan sát:** động tác và lớp ánh sáng trên các clip trên; hình ảnh gốc; các khung render local của game.
- **Lựa chọn thiết kế của V3:** ba nhát, hướng pose, shader, màu, thông số hình học. Không gọi chúng là thông số chính thức của JX3/VLTK MAX/Tru Tiên.
- **Giữ gameplay hiện tại:** tổng 1,8 s, pose 1,5 s, cooldown 1,5 s, range 3,6 m, một hit/mục tiêu/cast. Vệt/khí quanh người là lớp thị giác; collider vẫn kiểm tra lưỡi kiếm và một kiếm khí, không thêm AoE theo vòng sáng.
- **Cần nghiệm thu tiếp:** mức độ đẹp theo mong muốn người dùng, góc máy/ánh sáng trong game thật, GPU thiết bị/mobile và Alpha. Báo cáo kiểm tra kỹ thuật không thay cho các bước này.
