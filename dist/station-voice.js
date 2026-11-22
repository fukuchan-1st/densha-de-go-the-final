import {stationVoiceData} from './station-voice-data.js?v=107';
export function stationCueRefs(line,station,kind,carCount){
 const data=stationVoiceData[line],name=typeof station==='string'?station:station?.name;
 if(!data||!name||!['approach','departure'].includes(kind))return [];
 const ref=file=>({entryIndex:'station-voice:'+file,driverVoiceFile:'./assets/final/driver-voice/'+file});
 const file=data.stations[name];
 if(!file){const old=data.fallbacks[name]?.[kind];if(old)return [ref(old)];if(data.genericFallback)return (kind==='departure'?[data.ontime]:[data.stop,data.position[carCount]]).filter(Boolean).map(ref);return [];}
 if(kind==='departure')return [file,data.ontime].map(ref);
 const position=data.position[carCount];
 // Do not substitute a different car count when that formation is unrecorded.
 return [file,data.stop,position].filter(Boolean).map(ref);
}
export function stationVoiceBank(line){const data=stationVoiceData[line];return data?[data.bank,data.prefix]:null;}

export function driverWordRefs(line,names){
 const bank=stationVoiceBank(line),numbers={doorsClosed:'001',departure:'003',checkOkay:'124'};if(!bank)return [];
 return names.filter(n=>numbers[n]).map(n=>{const file=`${bank[0]}/${bank[1]}${numbers[n]}.wav`;return {entryIndex:'station-voice:'+file,driverVoiceFile:'./assets/final/driver-voice/'+file};});
}
