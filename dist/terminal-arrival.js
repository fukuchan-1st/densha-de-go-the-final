export function beginTerminalOpening(state,opening){
 state.doorPhase='opening-terminal';state.terminalOpenElapsed=0;state.terminalOpenDone=false;state.terminalOpenHasSound=false;
 Promise.resolve(opening).then(played=>{state.terminalOpenHasSound=played===true;state.terminalOpenDone=true;},()=>{state.terminalOpenDone=true;});
}
export function advanceTerminalOpening(state,target,dt){
 if(state.doorPhase!=='opening-terminal'||state.finished)return false;
 state.terminalOpenElapsed+=dt;
 if(!state.terminalOpenDone||(!state.terminalOpenHasSound&&state.terminalOpenElapsed<3))return false;
 state.errors.push(state.correctedStopError??state.s-target);state.correctedStopError=null;state.served++;state.next++;
 state.finished=true;state.doors=true;state.doorPhase='terminal-open';state.departureCall=null;state.v=0;return true;
}
