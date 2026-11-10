import {stationVoiceData} from './station-voice-data.js?v=station66';
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
