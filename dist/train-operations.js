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
  if(state.dwell+1e-9>=BOARDING_WAIT_SECONDS){state.doorPhase='announcement';return 'announcement';}
 }
 if(state.doorPhase==='announcement'&&state.announcementDone){state.doorPhase='closing';return 'close';}
 return null;
}
