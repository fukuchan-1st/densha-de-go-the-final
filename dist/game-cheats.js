import {progress} from './scenario-progress.js?v=117';
export function cheatClockStep(state,dt,{enabled=false,frozen=false,slow=false}={}){if(!enabled||(!frozen&&!slow)){delete state.cheatFrozenClock;return;}if(frozen){state.cheatFrozenClock??=state.clockStart+state.elapsed-dt;state.clockStart=state.cheatFrozenClock-state.elapsed;}else{delete state.cheatFrozenClock;state.clockStart-=.75*dt;}state.cheatUsed=true;}
export function jumpToStation(state,target,stops,limit,maxSpeed){
 const stop=stops.findIndex(st=>Math.abs(st.s-target.s)<.5),next=stop>=0?stop:stops.findIndex(st=>st.s>target.s);
 if(next<0)throw Error('この駅より先の停車駅がありません');
 Object.assign(state,{s:target.s,v:stop>=0?0:Math.max(0,(Number.isFinite(limit)?limit:maxSpeed)-5)/3.6,next,notch:0,previousNotch:0,doors:false,doorPhase:null,finished:false,startingDeparture:false,closeAttempt:null,stopWait:0,dwell:0,assistBraking:false,correctedStopError:null,cheatUsed:true,departureCall:null,holdBraking:false});
 if(Number.isFinite(target.time))state.clockStart=target.time-state.elapsed;
 state.voiceTimingDone=new Set();state.voiceRestrictionDone=new Set();state.driverApproachCalled=new Set();state.calledSignals=new Set();state.lastCalledStop=null;state.scoreDepartureTimes={};state.scoreBoardingStation=null;delete state.cheatFrozenClock;state.scoreCheckpoints=null;return {stop:stop>=0,next};
}
export function installCheats({getState,active,paused,onChange=()=>{},onMessage=()=>{}}){
 let admin=false,enabled=false,frozen=false,slow=false,presses=[],held=new Set();try{admin=sessionStorage.getItem('trackfinity-admin')==='1';enabled=admin;}catch{}
 const badge=document.createElement('div');badge.id='adminModeBadge';document.body.append(badge);
 const update=()=>{badge.hidden=!admin&&!enabled;badge.textContent=admin?'管理者モード':'チートモード';if(enabled&&(frozen||slow))badge.textContent+=frozen?' · 時刻停止':' · 時刻 ×0.25';onChange();};
 const controller={get admin(){return admin;},get available(){return admin||progress.allClear;},get enabled(){return enabled;},get frozen(){return frozen;},get slow(){return slow;},toggle(){if(!this.available)return;enabled=!enabled;if(!enabled){frozen=false;slow=false;held.clear();const state=getState();if(state)state.cheatSpeedOverride=false;}update();},clockStep(state,dt){cheatClockStep(state,dt,{enabled,frozen,slow});},speedStep(state,dt){if(!enabled||paused()||!active())return;const direction=Number(held.has('KeyW'))-Number(held.has('KeyS'));if(direction){state.cheatSpeedOverride=true;state.v=Math.max(0,Math.min(160/3.6,state.v+direction*10/3.6*dt));state.cheatUsed=true;}},reset(){frozen=false;slow=false;held.clear();update();}};
 document.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||event.target.matches?.('input[type=text],textarea'))return;
  if(event.code==='KeyF'&&active()&&getState()?.obasute&&!getState().obasute.done)return;
  if(event.code==='KeyF'&&!event.repeat){const now=performance.now();presses=presses.filter(t=>now-t<=6000);presses.push(now);if(presses.length===5){admin=true;enabled=true;presses=[];try{sessionStorage.setItem('trackfinity-admin','1');}catch{}update();onMessage('管理者モード：W/S 速度、T 時刻停止、R 時刻を遅くする');}return;}
  if(!enabled||!active()||paused())return;
  if(['KeyW','KeyS','KeyT','KeyR'].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();const state=getState();if(!state)return;if(['KeyW','KeyS'].includes(event.code)){held.add(event.code);if(!event.repeat){state.v=Math.max(0,Math.min(160/3.6,state.v+(event.code==='KeyW'?1:-1)/3.6));state.cheatSpeedOverride=true;state.cheatUsed=true;}}else if(!event.repeat){if(event.code==='KeyT')frozen=!frozen;else slow=!slow;state.cheatUsed=true;update();}}
 },true);
 document.addEventListener('keyup',event=>held.delete(event.code),true);addEventListener('blur',()=>held.clear());update();return controller;
}
