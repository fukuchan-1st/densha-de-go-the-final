import {stationVoiceData} from './station-voice-data.js?v=118';
export function stationCueRefs(line,station,kind,carCount){
 const data=stationVoiceData[line],name=typeof station==='string'?station:station?.name;
 if(!data||!name||!['approach','departure'].includes(kind))return [];
 const ref=file=>({entryIndex:'station-voice:'+file,driverVoiceFile:'./assets/final/driver-voice/'+file});
 const file=data.stations[name];
 if(!file){const old=data.fallbacks[name]?.[kind];if(old)return [ref(old)];if(data.genericFallback)return (kind==='departure'?[data.ontime]:[data.stop,data.position[carCount]]).filter(Boolean).map(ref);return [];}
 // 東武方式: 停車駅の手前で「駅名、停車、〇両、ブザーよし」。発車時は tobuDepartureRefs が戸閉め後にまとめて鳴らす。
 if(data.style==='tobu')return kind==='departure'?[]:[file,data.stop,data.tobu.cars[carCount],data.tobu.buzzer].filter(Boolean).map(ref);
 if(kind==='departure')return [file,data.ontime].map(ref);
 const position=data.position[carCount];
 // Do not substitute a different car count when that formation is unrecorded.
 return [file,data.stop,position].filter(Boolean).map(ref);
}
// 東武方式の発車喚呼「時刻よし(タイムよし)。知らせ灯、点。ブザーよし。出発進行」。
export function tobuDepartureRefs(line,random=Math.random,stationName=null){
 const data=stationVoiceData[line];if(data?.style!=='tobu')return null;
 const ref=file=>({entryIndex:'station-voice:'+file,driverVoiceFile:'./assets/final/driver-voice/'+file}),t=data.tobu,name=stationName&&data.stations[stationName];
 return [t.timeOk[Math.floor(random()*t.timeOk.length)%t.timeOk.length],t.lamp,t.buzzer,t.go,...(name?[name,t.depart]:[])].map(ref);
}
export function stationVoiceBank(line){const data=stationVoiceData[line];return data?[data.bank,data.prefix]:null;}

export function driverWordRefs(line,names){
 const bank=stationVoiceBank(line),numbers={doorsClosed:'001',departure:'003',checkOkay:'124'};if(!bank)return [];
 return names.filter(n=>numbers[n]).map(n=>{const file=`${bank[0]}/${bank[1]}${numbers[n]}.wav`;return {entryIndex:'station-voice:'+file,driverVoiceFile:'./assets/final/driver-voice/'+file};});
}
