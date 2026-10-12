'use strict';
// Đồng hồ Việt Nam; thời tiết là mô phỏng theo mùa, không phải dữ liệu dự báo trực tiếp.
const climate={clock:'live',hour:12,season:'auto',weather:'auto',rain:0,cloud:0,wet:0,displayHour:12};
let starAmbient,nightVisibility=1,hemi,moonLight,skyDome,sunDisc,moonDisc,starField,rainLines,cloudGroup,climateReady=false;
const weatherKinds={clear:{cloud:.08,rain:0,label:'Trời quang'},cloudy:{cloud:.65,rain:0,label:'Nhiều mây'},rain:{cloud:.93,rain:1,label:'Mưa rào'},mist:{cloud:.42,rain:0,label:'Sương sớm'}};
function vnTime(now=new Date()){const d=new Date(now.getTime()+7*3600000);return {hour:d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600,month:d.getUTCMonth()+1,day:d.getUTCDate(),year:d.getUTCFullYear()};}
function seasonAt(month){return month>=5&&month<=11?'rainy':'dry';}
function autoWeather(season,h,day){if(season==='rainy')return h>=14&&h<18&&day%3!==0?'rain':'cloudy';return h>=4&&h<7?'mist':day%5===0?'cloudy':'clear';}
function phaseLabel(h){return h<5?'Khuya':h<11?'Ban ngày':h<14?'Trưa':h<17?'Chiều':h<18.5?'Hoàng hôn':h<22?'Tối':'Khuya';}
const climateLightKeys=[
[0,0x050d22,0x111b33,0xa6c2eb,.055],[5,0x12203d,0x76535c,0xf0a468,.12],[6,0x618ba9,0xf9c38c,0xffc18a,.45],[8,0x71b8dc,0xcde6e5,0xffe1bb,1.15],[12,0x499bd4,0xc4e2ee,0xfff2dc,1.4],[15.5,0x6caacb,0xe9d4ad,0xffd29a,1.1],[17.6,0x68677d,0xf1a375,0xffa15d,.55],[18.5,0x202d50,0x855c70,0xc2cbee,.18],[20,0x091630,0x1e2944,0xa6c2eb,.075],[24,0x050d22,0x111b33,0xa6c2eb,.055]];
const climateLightColors=climateLightKeys.map(key=>[new THREE.Color(key[1]),new THREE.Color(key[2]),new THREE.Color(key[3])]);
function lightState(h,out={top:new THREE.Color(),horizon:new THREE.Color(),sun:new THREE.Color()}){
let k=0;while(k<climateLightKeys.length-2&&h>climateLightKeys[k+1][0])k++;
const a=climateLightKeys[k],b=climateLightKeys[k+1],t=THREE.MathUtils.smoothstep((h-a[0])/(b[0]-a[0]),0,1);
out.top.copy(climateLightColors[k][0]).lerp(climateLightColors[k+1][0],t);
out.horizon.copy(climateLightColors[k][1]).lerp(climateLightColors[k+1][1],t);
out.sun.copy(climateLightColors[k][2]).lerp(climateLightColors[k+1][2],t);
out.ambient=a[4]+(b[4]-a[4])*t;return out;
}
