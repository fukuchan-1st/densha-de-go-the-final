import {sampleRouteCurve} from './route-curve.js?v=117';
// Operating targets shape timetables; route speed-limit signs remain unchanged.
const tokyo=new Set('東京 神田 御茶ノ水 四ツ谷 新宿 中野 高円寺 阿佐ケ谷 荻窪 西荻窪 吉祥寺 三鷹 武蔵境 東小金井 武蔵小金井 国分寺 西国分寺 国立 立川 日野 豊田 八王子 西八王子 高尾'.split(' '));
const north=new Set('長野 安茂里 川中島 今井 篠ノ井'.split(' '));
const mountain=new Set('篠ノ井 稲荷山 姨捨 冠着 聖高原 坂北 西条 明科 田沢 松本'.split(' '));
const plain=new Set('松本 南松本 平田 村井 広丘 塩尻'.split(' '));
const oito=new Set('南小谷 千国 白馬大池 信濃森上 白馬 飯森 神城 南神城 ヤナバ前 簗場 海ノ口 稲尾 信濃木崎 北大町 信濃大町 南大町 信濃常盤 安曇沓掛 信濃松川 北細野 細野 安曇追分 有明 穂高 柏矢町 豊科 南豊科 中萱 一日市場 梓橋 島高松 島内 北松本 松本'.split(' '));
const hakuba=new Set('南小谷 千国 白馬大池 信濃森上 白馬'.split(' '));
// 東武・野岩・会津: 駅間で出す速度(ユーザー指定)。普通=各駅停車。
const tobuAsakusa=new Set(['浅草','とうきょうスカイツリー']);
const tobuSkytree=new Set('とうきょうスカイツリー 曳舟 東向島 鐘ケ淵 鐘ヶ淵 堀切 牛田 北千住'.split(' '));
const tobuKinugawa=new Set('下今市 大谷向 大桑 新高徳 小佐越 東武ワールドスクウェア 鬼怒川温泉 鬼怒川公園 新藤原'.split(' '));
const tobuAizu=new Set('新藤原 龍王峡 川治温泉 川治湯元 湯西川温泉 中三依温泉 上三依塩原温泉口 男鹿高原 会津高原尾瀬口 七ヶ岳登山口 会津山村道場 会津荒海 中荒井 会津田島'.split(' '));
export function tobuCruiseKmh(a,b,service=''){
 const both=set=>set.has(a)&&set.has(b);
 if(both(tobuAsakusa))return 40;
 if(both(tobuSkytree))return 70;
 if(both(tobuKinugawa))return (a==='大谷向'&&b==='大桑')||(a==='大桑'&&b==='大谷向')?80:50;
 if(both(tobuAizu))return 80;
 return service.includes('特急')?120:service==='普通'?90:110;
}
export function routePlanningSpec(route,spec={}){
 if(spec.operatingBands)return spec;
 if(!route.id)return spec;
 const express=(route.service??'').includes('特急')||['e353','383','681'].includes(route.vehicle),stations=[...(route.sceneryStations??route.stations??[])].filter(st=>!st.displayOnly).sort((a,b)=>a.s-b.s);
 const bands=[];
 let gradeProfile=route.grades??spec.gradeProfile;
 if(route.points?.length>1){const end=stations.at(-1)?.s??route.length??0;gradeProfile=[];for(let s=0;s<=end+20;s+=20){const grade=Math.max(-40,Math.min(40,(sampleRouteCurve(route.points,s+10)[2]-sampleRouteCurve(route.points,s-10)[2])*50));gradeProfile.push([s,grade]);}}

 for(let i=1;i<stations.length;i++){
  const a=stations[i-1],b=stations[i],both=set=>set.has(a.name)&&set.has(b.name);let min=60,max=100;
  if(route.id?.startsWith('tobu-')){min=max=Math.min(tobuCruiseKmh(a.name,b.name,route.service??''),route.vehicle==='6050'?100:Infinity);} // 6050系は加速が穏やかなため計画速度は100km/hまで
  else if(route.id?.startsWith('toho')){min=40;max=route.id==='toho'?75:55;}
  else if(route.id==='tatsuno'){min=55;max=85;}
  else if(route.id==='yamanote'){min=60;max=90;}
  else if(route.id==='osaka'){min=60;max=80;}
  else if(route.id==='tokaido'){min=max=express?130:route.service==='新快速'?130:90;}
  else if(route.id==='tohoku'){min=max=105;}
  else if(route.id==='yagan'){min=60;max=75;}
  else if(both(oito)){min=both(hakuba)?40:55;max=both(hakuba)?80:90;}
  else if(both(north)){min=max=express?120:100;}
  else if(both(mountain)){min=60;max=90;}
  else if(both(plain)){min=max=express?130:100;}
  else if(both(tokyo)){min=max=95;}
  else if(route.id?.includes('ome')||route.id?.includes('itsukaichi')){min=55;max=85;}
  else {min=max=express?120:100;}
  bands.push({sStart:a.s,sEnd:b.s,min,max,preferred:min===max?max:Math.round((min+max)/2)});
 }
 return {...spec,recoverySeconds:route.id==='osaka'?7:route.id==='yagan'?3:0,operatingBands:bands,departureDwells:route.id==='yagan'?{[stations[0]?.s]:route.stations[0]?.departureSound?35.2:20}:route.tobuDwells?{...spec.departureDwells,...route.tobuDwells}:spec.departureDwells,gradeProfile,stationDwellSeconds:spec.stationDwellSeconds??25};
}
export function operatingBand(spec,s){return spec.operatingBands?.find(x=>s>=x.sStart-.001&&s<x.sEnd-.001)??spec.operatingBands?.at(-1);}
export function operatingCap(spec,s){return Math.min(spec.maxSpeedKmh??110,operatingBand(spec,s)?.max??Infinity);}
