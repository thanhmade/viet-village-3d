'use strict';

'use strict';
// Ngân hàng câu hỏi có đáp án và giải thích, tách khỏi vòng lặp đồ họa.
const core=[
['Chìa khóa phân số','Tìm thẻ số có cùng giá trị để mở chiếc hộp đầu tiên.','Thẻ nào có giá trị bằng 1/2?',['2/4','1/3','3/4','2/3'],0,'Nhân cả tử và mẫu của 1/2 với cùng một số.','1/2 = (1 × 2)/(2 × 2) = 2/4.'],
['Những tấm ván bí mật','Xếp các tấm ván số theo thứ tự để sửa cây cầu.','Thứ tự từ nhỏ đến lớn là:',['0,75; 0,5; 0,25','0,25; 0,5; 0,75','0,5; 0,25; 0,75','0,25; 0,75; 0,5'],1,'Viết 0,5 thành 0,50 rồi so sánh phần thập phân.','0,25 < 0,50 < 0,75. Vì vậy xếp 0,25; 0,5; 0,75.'],
['Cột mốc bên hồ','Đoạn từ 0 đến 1 được chia thành 4 phần bằng nhau.','3/4 nằm ở vạch thứ mấy tính từ 0?',['Vạch 1','Vạch 2','Vạch 4','Vạch 3'],3,'Mỗi bước từ vạch này sang vạch kế tiếp là 1/4.','Sau 3 bước: 1/4 + 1/4 + 1/4 = 3/4. Em nhận mảnh bản đồ đầu tiên!'],
['Kho nguyên liệu','Giúp người dân gom gạo cho chuyến đi.','0,5 + 0,25 = ?',['0,30','0,75','0,55','0,025'],1,'Đặt các chữ số cùng hàng thẳng cột: 0,50 + 0,25.','0,50 + 0,25 = 0,75 kg gạo.'],
['Bình nước còn thiếu','Bình cần 2 lít nước, hiện có 1,25 lít.','Cần thêm bao nhiêu lít?',['0,75 lít','1,25 lít','3,25 lít','0,25 lít'],0,'Lấy lượng cần có trừ lượng đang có.','2 − 1,25 = 0,75 lít.'],
['Cuộn dây của làng','Chia đều cuộn dây dài 3/4 m cho 3 người.','Mỗi người nhận bao nhiêu mét?',['3/4 m','1/3 m','1/4 m','9/4 m'],2,'Chia cho 3 là nhân với 1/3.','3/4 : 3 = 3/4 × 1/3 = 1/4 m. Em nhận mảnh bản đồ thứ hai!'],
['Bí mật cây đa','Chiếc hộp dưới cây đa mở bằng một phép nhân lặp lại.','2 × 2 × 2 bằng:',['2² = 4','3² = 9','2³ = 6','2³ = 8'],3,'Có 3 thừa số 2. Số mũ là số lần xuất hiện của thừa số.','2 × 2 × 2 = 2³ = 8.'],
['Ghép pin năng lượng','Ghép hai nguồn năng lượng cùng cơ số.','3² × 3³ = 3^?',['6','5','1','9'],1,'Nhân hai lũy thừa cùng cơ số: giữ cơ số và cộng số mũ.','3² × 3³ = 3⁽²⁺³⁾ = 3⁵.'],
['Mật mã dưới cây đa','Mã khóa gồm tổng của hai lũy thừa.','2³ + 3² = ?',['17','25','12','13'],0,'Tính từng lũy thừa rồi mới cộng.','2³ = 8 và 3² = 9. Tổng là 17. Em nhận mảnh bản đồ thứ ba!'],
['Công tắc đúng thứ tự','Một công tắc mở đường, những công tắc khác cần sửa lại.','6 + 3 × 4 = ?',['36','24','18','15'],2,'Thực hiện phép nhân trước phép cộng.','3 × 4 = 12, sau đó 6 + 12 = 18.'],
['Cánh cổng dấu ngoặc','Dấu ngoặc cho biết bước cần làm đầu tiên.','(8 + 4) : 3 = ?',['4','12','8','9'],0,'Tính tổng trong ngoặc trước khi chia.','(8 + 4) : 3 = 12 : 3 = 4.'],
['Chiếc cân kho báu','Chiếc rương và quả cân 0,5 kg cân bằng với 1,25 kg.','x + 0,5 = 1,25. Tìm x.',['1,75','0,25','1,25','0,75'],3,'Bớt 0,5 kg ở cả hai bên cân.','x = 1,25 − 0,5 = 0,75 kg. Bốn mảnh bản đồ đã đủ!']
];
const advanced=[
['Thẻ số hữu tỉ','Chọn phân số bằng số thập phân đã cho.','−0,75 bằng:',['−3/4','3/4','−4/3','−1/4'],0,'0,75 = 75/100. Rút gọn và giữ dấu âm.','−0,75 = −75/100 = −3/4.'],
['Cầu số âm','Xếp ba số hữu tỉ theo thứ tự tăng dần.','Thứ tự đúng là:',['−1/2; −3/4; 1/4','−3/4; −1/2; 1/4','1/4; −1/2; −3/4','−1/2; 1/4; −3/4'],1,'Trên trục số, −0,75 nằm bên trái −0,5.','−3/4 = −0,75 < −1/2 = −0,5 < 1/4.'],
['Số đối bí mật','Hai số đối nhau có tổng bằng 0.','Số đối của −5/4 là:',['−4/5','4/5','−5/4','5/4'],3,'Đổi dấu của số đã cho.','−5/4 + 5/4 = 0.'],
['Cộng hữu tỉ','Gom hai lượng có dấu khác nhau.','−1/2 + 3/4 = ?',['−1/4','1/4','−5/4','5/4'],1,'Quy đồng −1/2 thành −2/4.','−2/4 + 3/4 = 1/4.'],
['Trừ hữu tỉ','Một phép trừ số âm đang khóa bình nước.','1/3 − (−2/3) = ?',['1','−1/3','−1','1/3'],0,'Trừ một số là cộng với số đối của số đó.','1/3 + 2/3 = 1.'],
['Chia hữu tỉ','Tìm thương để mở kho vật phẩm.','(−3/4) : (1/2) = ?',['−3/8','3/2','−3/2','−2/3'],2,'Nhân với nghịch đảo của số chia.','−3/4 × 2 = −3/2.'],
['Lũy thừa hữu tỉ','Chú ý dấu của cơ số và số mũ.','(−1/2)³ = ?',['1/8','−3/2','−1/6','−1/8'],3,'Nhân ba thừa số −1/2. Số mũ lẻ giữ kết quả âm.','(−1/2)³ = (−1/2) × (−1/2) × (−1/2) = −1/8.'],
['Hai pin cùng cơ số','Ghép hai lũy thừa của cùng số hữu tỉ.','(1/2)² × (1/2)³ = ?',['(1/2)⁶','(1/2)⁵','(1/2)¹','1/4'],1,'Giữ cơ số, cộng hai số mũ.','(1/2)⁽²⁺³⁾ = (1/2)⁵.'],
['Lũy thừa của lũy thừa','Tìm số mũ cho bộ máy trong tháp.','[(1/3)²]³ = (1/3)^?',['6','5','8','1'],0,'Lũy thừa của lũy thừa: nhân hai số mũ.','2 × 3 = 6.'],
['Thứ tự với số âm','Làm phép nhân trước rồi cộng.','−1 + 1/2 × 4 = ?',['−2','2','1','−1'],2,'1/2 × 4 = 2.','−1 + 2 = 1.'],
['Cổng dấu ngoặc','Tính phần trong ngoặc trước.','(3/4 − 1/4) : (1/2) = ?',['1','1/4','1/2','2'],0,'Hiệu trong ngoặc bằng 1/2.','(1/2) : (1/2) = 1.'],
['Chuyển vế mở rương','Tìm x để cân bằng hai vế.','x + 1/2 = −3/4. Tìm x.',['−1/4','1/4','5/4','−5/4'],3,'Bớt 1/2 ở cả hai vế.','x = −3/4 − 1/2 = −3/4 − 2/4 = −5/4.']
];
const chapterNames=['I · Cổng làng & Hồ sen','II · Xóm nhà & Phép tính','III · Sân cây đa & Lũy thừa','IV · Đình làng & Kho báu'];
const chapterColors=[0x42a995,0x80af60,0x8276bf,0xd4a65b];
// Mỗi chương đưa người chơi đến một khu vực khác nhau của đảo.
const routes=[
 {spawn:[0,22],gate:[0,17],gems:[[-6,20],[8,23],[21,18]]},
 {spawn:[0,15],gate:[0,8],gems:[[-5,10],[5,10],[0,6]]},
 {spawn:[-5,6],gate:[-5,-5],gems:[[-6,2],[-5,-8],[5,-5]]},
 {spawn:[0,-8],gate:[0,-12],gems:[[-6,-12],[6,-12],[0,-14]]}
];
const obstacles=[
 ...[-11,11].flatMap(x=>[-10,0,10].map(z=>({x,z,w:3.05,d:2.72}))),
 {x:0,z:0,r:4.3},{x:0,z:-19,w:6.45,d:3.8},
 {x:-15,z:17,w:5.8,d:4.45},{x:-2.83,z:24,w:1.04,d:1.15},{x:2.83,z:24,w:1.04,d:1.15},
 {x:-5.25,z:24.85,r:.80},{x:-15,z:24,w:10.7,d:.24},{x:15,z:24,w:10.7,d:.24}
];
const $=id=>document.getElementById(id);
let renderer,scene,camera,player,body,leftLeg,rightLeg,leftArm,rightArm,water,portal,portalRing,altar,treasure,sun;
let world=new THREE.Group(), gems=[], floating=[], clouds=[], sparkles, target=null;
let active=false,level=0,mode='core',collected=0,answered=false,attempts=0,hintUsed=false,sound=false,audioCtx;
let yaw=0,pitch=.50,zoom=11,drag=null,joystick={x:0,y:0},keys={},toastTimer,last=0;
const saveKey=()=> 'math-island-3d-v1-'+mode;
const fresh=()=>({unlocked:1,score:0,results:{}});
let progress=fresh();
function load(){try{let p=JSON.parse(localStorage.getItem(saveKey()));progress=p&&Number.isInteger(p.unlocked)&&p.unlocked>=1&&p.unlocked<=12&&p.results&&typeof p.results==='object'?p:fresh();}catch{progress=fresh();}}
function save(){try{localStorage.setItem(saveKey(),JSON.stringify(progress));}catch{toast('Tiến độ chưa lưu được trên trình duyệt này.');}}
function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,2800);}
function beep(freq=600){if(!sound)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.4,audioCtx.currentTime+.15);g.gain.setValueAtTime(.07,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.3);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.3);}catch{}}
