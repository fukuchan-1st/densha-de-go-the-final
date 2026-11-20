import {withYamagataEra} from './yamagata-era.js?v=97final';
import {applyPublishedSchedule} from './published-schedules.js?v=86';
import {releaseMatsumotoExpressLimit} from './geographic-sections.js?v=97final';
import {prepareLeftTraffic} from './route-traffic.js?v=96';
import {selectTokaidoServiceTrack} from './tokaido-service-track.js?v=services63';
import {serviceChoices,STOP_PATTERNS} from './service-catalog.js?v=97final';
import {sliceRoute,reverseRoute} from './service-routes.js?v=96';
export {serviceChoices};
function makeDefaultServiceRoute(route,vehicle,service){
 route={...selectTokaidoServiceTrack(route,service),vehicle,service};
 route={...route,sceneryStations:route.sceneryStations??route.stations,limits:route.limitsByVehicle?.[vehicle]??route.limits};
 route=releaseMatsumotoExpressLimit(route,vehicle,service);
 // Yagan service: 70 km/h across ordinary sections; keep lower station/point limits.
 if(route.id==='yagan'){const end=route.length??route.stations.at(-1)?.s??0;route={...route,serviceSpeedKmh:70,limits:[{sStart:0,sEnd:end+1,kmh:70},...(route.limits??[]).filter(x=>x.kmh<70).map(x=>({...x}))]};}
 if(route.id==='oito'){
  const boundary=route.stations.find(st=>st.name==='信濃大町')?.s;
  if(Number.isFinite(boundary))route.stations=route.stations.map((st,index)=>({...st,layoutIndex:st.layoutIndex??index})).filter(st=>vehicle==='e127'?st.s<=boundary:st.s>=boundary);
 }
 if(!['新快速','関空・紀州路快速','大和路快速','快速','特急'].includes(service))return {...route,stations:route.stations.filter(s=>!s.passOnly)};
 if(service==='快速'&&route.id!=='tokaido')return {...route,stations:route.stations.filter(s=>!s.passOnly)};
 const stops=service==='快速'?['京都','長岡京','高槻','茨木','新大阪','大阪','尼崎','西宮','芦屋','住吉','六甲道','三ノ宮','元町','神戸']:service==='新快速'?['京都','高槻','新大阪','大阪','尼崎','芦屋','三ノ宮','神戸']:['関空・紀州路快速','大和路快速'].includes(service)?['大阪','福島','西九条','弁天町','大正','新今宮','天王寺','鶴橋','京橋']:route.id==='tokaido'?['京都','新大阪','大阪','神戸']:route.id.startsWith('shinonoi')?['長野','篠ノ井','聖高原','明科','松本','塩尻']:route.id==='oito'?['南小谷','白馬','信濃大町','穂高','豊科','松本']:['東京','新宿','立川','八王子','大月','塩山','山梨市','石和温泉','甲府','韮崎','小淵沢','富士見','茅野','上諏訪','下諏訪','岡谷','塩尻','松本'];
 const stations=route.stations.map((station,index)=>({...station,layoutIndex:station.layoutIndex??index})).filter((station,index)=>index===0||index===route.stations.length-1||(!station.passOnly&&(stops?stops.includes(station.name):!station.sourcePass)));
 return {...route,stations,service,vehicle};
}

export function makeServiceRoute(route,vehicle,service,option){
 if(!option)return applyPublishedSchedule(makeDefaultServiceRoute(route,vehicle,service),vehicle,service);
 route=withYamagataEra(route,option.era);
 let r=selectTokaidoServiceTrack(route,service.includes('しなの')?'特急':service);r={...r,sceneryStations:r.sceneryStations??r.stations,limits:r.limitsByVehicle?.[vehicle]??r.limits};
 r=releaseMatsumotoExpressLimit(r,vehicle,service);
 if(r.id==='yagan')r=makeDefaultServiceRoute(r,vehicle,'普通');
 r=prepareLeftTraffic(r);
 if(option.from||option.to)r=sliceRoute(r,option.from,option.to);
 const all=r.sceneryStations??r.stations,pattern=option.pattern,boundary=option.beyond?r.stations.find(x=>x.name===option.beyond)?.s:null;
 let stops;
 if(pattern==='all')stops=r.stations.filter(x=>!x.passOnly);
 else if(pattern==='holiday')stops=r.stations.filter(x=>!x.passOnly&&!['高円寺','阿佐ケ谷','西荻窪'].includes(x.name));
 else if(STOP_PATTERNS[pattern])stops=r.stations.filter((x,i)=>i===0||i===r.stations.length-1||(!x.passOnly&&(STOP_PATTERNS[pattern].includes(x.name)||(boundary!=null&&x.s>=boundary))));
 else stops=makeDefaultServiceRoute(r,vehicle,service).stations;
 r={...r,sceneryStations:all,stations:stops,service,vehicle,serviceOption:option};if(option.reverse)r=reverseRoute(r);
 if(option.startTime){r={...r,night:!!option.night,stations:r.stations.map(x=>{const st={...x};for(const k of ['arrival','departure','time','passTime','startTime'])delete st[k];return st;}),sceneryStations:r.sceneryStations.map(x=>{const st={...x};for(const k of ['arrival','departure','time','passTime','startTime'])delete st[k];return st;})};r.stations[0].startTime=option.startTime??'20:00:00';}
 return applyPublishedSchedule(r,vehicle,service);
}
