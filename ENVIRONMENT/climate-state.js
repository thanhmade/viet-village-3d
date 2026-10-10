'use strict';
// Đồng hồ Việt Nam; thời tiết là mô phỏng theo mùa, không phải dữ liệu dự báo trực tiếp.
const climate={clock:'live',hour:12,season:'auto',weather:'auto',rain:0,cloud:0,wet:0,displayHour:12};
let starAmbient,nightVisibility=1,hemi,moonLight,skyDome,sunDisc,moonDisc,starField,rainLines,cloudGroup,climateReady=false;
const weatherKinds={clear:{cloud:.08,rain:0,label:'Trời quang'},cloudy:{cloud:.65,rain:0,label:'Nhiều mây'},rain:{cloud:.93,rain:1,label:'Mưa rào'},mist:{cloud:.42,rain:0,label:'Sương sớm'}};
function vnTime(now=new Date()){const d=new Date(now.getTime()+7*3600000);return {hour:d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600,month:d.getUTCMonth()+1,day:d.getUTCDate(),year:d.getUTCFullYear()};}
function seasonAt(month){return month>=5&&month<=11?'rainy':'dry';}
function autoWeather(season,h,day){if(season==='rainy')return h>=14&&h<18&&day%3!==0?'rain':'cloudy';return h>=4&&h<7?'mist':day%5===0?'cloudy':'clear';}
function phaseLabel(h){return h<5?'Khuya':h<11?'Ban ngày':h<14?'Trưa':h<17?'Chiều':h<18.5?'Hoàng hôn':h<22?'Tối':'Khuya';}
function lightState(h){const keys=[
[0,0x050d22,0x111b33,0xa6c2eb,.055],[5,0x12203d,0x76535c,0xf0a468,.12],[6,0x618ba9,0xf9c38c,0xffc18a,.45],[8,0x71b8dc,0xcde6e5,0xffe1bb,1.15],[12,0x499bd4,0xc4e2ee,0xfff2dc,1.4],[15.5,0x6caacb,0xe9d4ad,0xffd29a,1.1],[17.6,0x68677d,0xf1a375,0xffa15d,.55],[18.5,0x202d50,0x855c70,0xc2cbee,.18],[20,0x091630,0x1e2944,0xa6c2eb,.075],[24,0x050d22,0x111b33,0xa6c2eb,.055]];
let k=0;while(k<keys.length-2&&h>keys[k+1][0])k++;let a=keys[k],b=keys[k+1],t=(h-a[0])/(b[0]-a[0]);t=THREE.MathUtils.smoothstep(t,0,1);return {top:new THREE.Color(a[1]).lerp(new THREE.Color(b[1]),t),horizon:new THREE.Color(a[2]).lerp(new THREE.Color(b[2]),t),sun:new THREE.Color(a[3]).lerp(new THREE.Color(b[3]),t),ambient:a[4]+(b[4]-a[4])*t};}
