export const STATION_DEPARTURE_AUDIO={'黒磯':'kuroiso.mp3','白河':'shirakawa.mp3'};
export function departureFilesFor(stationName){return [STATION_DEPARTURE_AUDIO[stationName],'departure-chime.wav'].filter(Boolean);}
export function beginStartingBoarding(state,index,stations){
 if(!stations[index]||index>=stations.length-1)return false;
 Object.assign(state,{doors:true,notch:-4,dwell:0,stopWait:0,doorPhase:'boarding',announcementDone:false,departureStationIndex:index,startingDeparture:true});return true;
}
export function completeDoorSequence(state,stations){
 if(!state.doors||state.doorPhase!=='closing')return false;
 state.doors=false;
 if(!state.startingDeparture){state.served++;state.errors.push(state.s-stations[state.next].s);state.next++;}
 Object.assign(state,{startingDeparture:false,departureStationIndex:null,departureStage:null,assistBraking:false,stopReady:false,dwell:0,stopWait:0,doorPhase:null,notch:0});
 state.finished=state.next===stations.length;return true;
}
export const AUTO_DOOR_TOLERANCE=3;
export const STOPPED_SPEED=.01; // m/s: numerical standstill, not a moving approach.
export const OPEN_DELAY_SECONDS=3;
export const BOARDING_WAIT_SECONDS=15;
// dt is active real time, independent of the driving time multiplier.
export function advanceDoorSequence(state,target,dt){
 if(state.finished)return null;
 if(!state.doors){
  if(state.v>STOPPED_SPEED||Math.abs(state.s-target)>AUTO_DOOR_TOLERANCE){state.stopWait=0;state.doorPhase=null;state.stopReady=false;return null;}
  state.doorPhase='waiting-open';state.stopReady=true;state.stopWait=(state.stopWait??0)+dt;
  if(state.stopWait+1e-9<OPEN_DELAY_SECONDS)return null;
  state.v=0;state.doors=true;state.notch=-4;state.dwell=0;state.doorPhase='boarding';state.announcementDone=false;
  return 'open';
 }
 if(state.doorPhase==='boarding'){
  state.dwell+=dt;
  if(state.startingDeparture||state.dwell+1e-9>=BOARDING_WAIT_SECONDS){state.doorPhase='announcement';return 'announcement';}
 }
 if(state.doorPhase==='announcement'&&state.announcementDone){state.doorPhase='closing';return 'close';}
 return null;
}
