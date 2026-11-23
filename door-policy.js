const east=new Set('東京 神田 御茶ノ水 四ツ谷 新宿 中野 高円寺 阿佐ケ谷 荻窪 西荻窪 吉祥寺 三鷹 武蔵境 東小金井 武蔵小金井 国分寺 西国分寺 国立 立川 日野 豊田 八王子 西八王子'.split(' '));
const oito=new Set('松本 北松本 島内 島高松 梓橋 一日市場 中萱 南豊科 豊科 柏矢町 穂高 有明 安曇追分 細野 北細野 信濃松川 安曇沓掛 信濃常盤 南大町 信濃大町 北大町 信濃木崎 稲尾 海ノ口 簗場 ヤナバ前 ヤナバスキー場前 南神城 神城 飯森 白馬 信濃森上 白馬大池 千国 南小谷'.split(' '));
export function stationDoorMode(route={},id,s){
 const stations=route.sceneryStations??route.stations??[],st=stations.reduce((a,b)=>!a||Math.abs(b.s-s)<Math.abs(a.s-s)?b:a,null);if(!st||Math.abs(st.s-s)>25)return 'all';
 const onOito=(/oito/.test(route.id??'')&&oito.has(st.name))||route.id==='oito';
 if(id==='e127'&&onOito&&!['白馬','信濃大町','南小谷'].includes(st.name))return 'front-only';
 if(['211','e131','e127'].includes(id)&&/chuo|shinonoi|oito/.test(route.id??'')&&!east.has(st.name))return 'semi';
 return 'all';
}
const hash=x=>{x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return (x^(x>>>16))>>>0;};
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function semiDoorAmount(seed,index,count,time){
 if(count<2)return 1;const h=hash(seed|0),blocked=h%count;if(index===blocked)return 0;
 const delay=.8+(hash(h+index*73)%920)/100,t=Math.max(0,time-delay),period=7+(hash(h+index*151)%90)/10,cycle=Math.floor(t/period),f=smooth((t%period)/1.5);
 const value=n=>n<0?0:Number(hash(h+index*7919+n*104729)%100<68);
 return value(cycle-1)+(value(cycle)-value(cycle-1))*f;
}
