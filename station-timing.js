import {timeSeconds} from './score-engine.js?v=115';
import {stationVoiceData} from './station-voice-data.js?v=115';
import {timingVoiceData} from './timing-voice-data.js?v=115';
export const TIMING_VOICE_WINDOW=5;
export function timingReport(kind,error){
 if(!['pass','arrival'].includes(kind)||!Number.isFinite(error))return null;
 const onTime=Math.abs(error)<=TIMING_VOICE_WINDOW+1e-7;
 const total=onTime?0:Math.max(6,Math.round(Math.abs(error)));
 return {kind,error,onTime,totalSeconds:total,minutes:Math.floor(total/60),seconds:total%60,
  status:onTime?(kind==='pass'?'定通':'定着'):error>0?(kind==='pass'?'延通':'延着'):(kind==='pass'?'早通':'早着'),
  action:kind==='pass'?'通過':'停車'};
}
export function collectStationReports(state,timetable,previous,arrivalTargetS){
 if(state.doors||state.finished||!previous)return [];
 const done=state.voiceTimingDone??=new Set(),reports=[];
 for(const station of timetable??[]){
  const target=timeSeconds(station.time);if(target===null)continue;
  const kind=station.stop?'arrival':'pass',key=kind+':'+(station.id??station.name+':'+station.s);
  if(done.has(key))continue;
  let actual;
  if(kind==='pass'&&previous.s<station.s&&state.s>=station.s){
   const fraction=(station.s-previous.s)/Math.max(.000001,state.s-previous.s);
   actual=(state.clockStart??28800)+previous.elapsed+(state.elapsed-previous.elapsed)*fraction;
  }else if(kind==='arrival'&&Math.abs(station.s-arrivalTargetS)<.01&&state.v<=.01&&Math.abs(state.s-station.s)<=3){
   actual=(state.clockStart??28800)+state.elapsed;
  }
  if(actual===undefined)continue;
  done.add(key);reports.push({...timingReport(kind,actual-target),station,actual,target});
 }
 return reports;
}
const ref=file=>({entryIndex:'station-voice:'+file,driverVoiceFile:'./assets/final/driver-voice/'+file});
export function timingVoiceRefs(line,station,kind,error){
 const report=timingReport(kind,error),names=stationVoiceData[line],clips=timingVoiceData[names?.bank];
 const name=typeof station==='string'?station:station?.name,file=names?.stations[name];
 if(!report||!file||!clips)return [];
 const result=[file,kind==='pass'?clips.pass:names.stop];
 if(report.onTime)result.push(kind==='pass'?clips.onTimePass:clips.onTimeArrival);
 else{
  // Never announce an incorrect capped delay when the recording range ends.
  if(report.minutes<=5){if(report.minutes)result.push(clips.minutes[report.minutes]);if(report.seconds)result.push(clips.seconds[report.seconds]);}
  result.push(error>0?(kind==='pass'?clips.latePass:clips.lateArrival):(kind==='pass'?clips.earlyPass:clips.earlyArrival));
 }
 return result.filter(Boolean).map(ref);
}
export function timingPreloadRefs(line,stations=[]){
 const names=stationVoiceData[line],clips=timingVoiceData[names?.bank];if(!clips)return [];
 return [...Object.values(clips).flatMap(x=>typeof x==='string'?[x]:Object.values(x)),names.stop,...stations.map(s=>names.stations[s.name]).filter(Boolean)].map(ref);
}
export function collectRestrictionReports(state,changes,previous){
 if(state.doors||state.finished||!previous||state.s<=previous.s)return [];
 const done=state.voiceRestrictionDone??=new Set(),reports=[];
 for(const change of changes){
  const key=change.s+':'+change.kmh;
  if(previous.s<change.s&&state.s>=change.s&&!done.has(key)){
   done.add(key);reports.push(change);
  }
 }
 return reports.sort((a,b)=>a.s-b.s);
}
export function restrictionVoiceRefs(line,kmh){
 const clips=timingVoiceData[stationVoiceData[line]?.bank];
 const file=kmh===null?clips?.release:clips?.limits?.[kmh];
 return file?[ref(file)]:[];
}
// The result screen may open as soon as the doors finish opening. Keep the
// last arrival sentence audible, but never pause a newly started journey.
export function pauseWhenSpeechEnds(audio,isCurrent,pause){
 return Promise.resolve(audio?.driverQueue??audio?.routeCueQueue).catch(()=>{}).then(()=>{if(isCurrent())return pause();});
}
