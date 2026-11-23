// Operational distance remains tied to the timetable. During shunting, u is
// the physical nose position measured northward from the platform stop.
const stops=route=>route.sceneryStations??route.stations??[];
export const OBASUTE_DOWN_BUFFER=128;
export function obasuteInfo(route){
 const all=stops(route),station=all.find(s=>s.name==='姨捨');if(!station)return null;
 const north=all.find(s=>s.name==='稲荷山')??all.find(s=>s.name==='篠ノ井'),south=all.find(s=>s.name==='冠着');
 const sign=north?Math.sign(north.s-station.s):south?-Math.sign(south.s-station.s):route.reverseDirection?1:-1;
 return {s:station.s,sign,down:sign>0,station};
}
export function restoreObasuteLocalStop(route,service=''){
 if(!/普通|各駅停車/.test(service)||!obasuteInfo(route))return route;
 const mark=s=>s.name==='姨捨'?{...s,passOnly:false,sourcePass:false,arrival:null,departure:null,switchback:true}:s;
 return {...route,stations:route.stations.map(mark),sceneryStations:stops(route).map(mark)};
}
export function obasuteServing(route){return !!obasuteInfo(route)&&route.stations.some(s=>s.name==='姨捨');}
export function obasuteActive(state){return !!state.obasute&&!state.obasute.done;}
export function updateObasuteOperation(state,route){
 const info=obasuteInfo(route);if(!info||!obasuteServing(route)||state.obasute?.done)return;
 const index=route.stations.findIndex(s=>s.name==='姨捨');
 if(index<state.startIndex||index>state.endIndex)return;
 if(!state.obasute){
  if(info.down){if(state.next!==index&&!(state.startIndex===index&&state.startingDeparture))return;
   if(Math.abs(state.s-info.s)>520)return;
   state.obasute={phase:'platform',u:state.s-info.s,direction:1,down:true,index};
  }else{
   if(state.startIndex===index){state.obasute={phase:'platform',u:-220,direction:1,down:false,index};}
   else if(state.next===index&&state.s>=info.s-350){state.s=info.s-350;state.obasute={phase:'head-in',u:350,direction:1,down:false,index};}
   else return;
  }
 }
 const op=state.obasute;
 if(op.phase==='platform'){
  if(info.down)op.u=state.s-info.s;
  // The down platform road is a stub (OSM ways end 130 m beyond the stop
  // mark). Overrunning it hits the buffer instead of running off the map.
  if(info.down&&op.bufferStop){op.bufferStop=false;state.s=info.s;op.u=0;state.stopWait=0;reply(state,'車止めで停止 · オーバーランのため停止位置に戻しました');}
  else if(info.down&&op.u>OBASUTE_DOWN_BUFFER){state.s=info.s+OBASUTE_DOWN_BUFFER;op.u=OBASUTE_DOWN_BUFFER;Object.assign(state,{v:0,wheelSpeed:0,acceleration:0,notch:Math.min(0,state.notch),cheatSpeedOverride:false,assistBraking:false});op.bufferStop=true;reply(state,'車止めに当たって停止しました');}
  if(!state.doors&&!state.startingDeparture&&state.next>index&&!state.finished){op.phase=info.down?'wait-back':'wait-forward';op.direction=info.down?1:-1;state.notch=0;}
 }
}
const reply=(state,text)=>{state.obasuteMessage=text;state.obasuteMessageUntil=state.elapsed+4;return text;};
export function obasuteDirection(state,code){
 const op=state.obasute;if(!op||op.done||!['KeyB','KeyF'].includes(code))return null;
 if(state.v>.01)return reply(state,'停止してから B / F で方向を切り替えてください。');
 if(code==='KeyB'&&(op.phase==='wait-back'||op.phase==='head-wait'||op.phase==='head-in'&&op.u<=-465-(state.obasuteCarLength??120))){op.direction=-1;op.phase=op.down?'back-out':'back-in';state.notch=0;return reply(state,'後進 B · 窓から確認しながら15 km/h以下で移動');}
 if(code==='KeyF'&&(op.phase==='forward-wait'||op.phase==='back-out'&&op.u<=-470||op.phase==='wait-forward'||(!op.down&&op.phase==='platform'))){op.direction=1;if(op.phase!=='platform')op.phase=op.down?'main-out':'platform-out';state.notch=0;return reply(state,'前進 F · 進路を確認して出発');}
 return reply(state,op.phase==='head-in'?'列車全体が分岐器を抜けるまで前進してください。':'次の折返し位置まで移動し、停止してから切り替えてください。');
}
export function obasuteTarget(state){
 const op=state.obasute;if(!op||op.done)return null;
 if(op.phase==='head-in')return -700;
 if(op.phase==='back-out')return -560;
 if(op.phase==='back-in')return -220;
 if(op.phase==='main-out')return 160;
 if(op.phase==='platform-out')return -820;
 return null;
}
// Before the throat turnout an arriving up train is still on the main line,
// so it may run at up to 45 km/h; beyond it the 15 km/h shunting limit applies.
export function obasuteSpeedLimit(state){const op=state.obasute;if(!op||op.done)return null;return op.phase==='head-in'&&op.u>-450?45:15;}
export function obasuteShunting(state){const op=state.obasute;return !!op&&!op.done&&op.phase!=='platform';}
export function obasuteDoorReady(state){return !obasuteActive(state)||state.obasute.phase==='platform';}
export function advanceObasute(state,route,recipe,dt,step,grade=0){
 if(!obasuteShunting(state))return false;
 const op=state.obasute,info=obasuteInfo(route),target=obasuteTarget(state),s=state.s;
 if(target===null){state.v=0;state.acceleration=0;state.elapsed+=dt;return true;}
 // v is an unsigned speed throughout the simulator; reverse travel is applied
 // here, without inventing traction or rotating the formation through 180°.
 const direction=op.down?op.direction:-op.direction,remaining=(target-op.u)*direction;
 state.s=0;step(state,recipe,dt,grade*op.direction);const movement=state.s;state.s=s;
 op.u+=direction*movement;
 // Leaving toward the main line: once the whole formation has cleared the
 // throat turnout (u = -450), hand over to normal running without stopping.
 const clear=(state.obasuteCarLength??120)+10;
 if(op.phase==='main-out'&&op.u>=-450+clear||op.phase==='platform-out'&&op.u<=-450-clear){op.done=true;op.direction=1;state.s=info.s+info.sign*op.u;state.assistBraking=false;return true;}
 // A waypoint does not magically stop a moving train. The driver brakes; a
 // final protective stop is only used beyond the marked shunting endpoint.
 if(Math.abs(target-op.u)<=3&&state.v<=.01||remaining-movement< -12){
  op.u=target;state.v=0;state.wheelSpeed=0;state.acceleration=0;state.notch=0;
  if(op.phase==='head-in')op.phase='head-wait';
  else if(op.phase==='back-out')op.phase='forward-wait';
  else if(op.phase==='back-in'){op.phase='platform';state.s=info.s;state.stopWait=0;state.assistBraking=false;}
  else{op.done=true;op.direction=1;state.s=info.s+info.sign*target;state.assistBraking=false;}
 }
 return true;
}
export function obasuteCaption(state){
 const op=state.obasute;if(!op||op.done)return '';
 if(state.obasuteMessageUntil>state.elapsed)return state.obasuteMessage;
 const label={platform:op.direction<0?'姨捨ホーム · 停車後 F で前進':'姨捨ホーム', 'head-in':'引上線へ前進','head-wait':'引上線停止 · B で後進','wait-back':'姨捨発車 · B で後進','back-out':'引上線へ後進','forward-wait':'引上線停止 · F で前進','main-out':'本線へ前進','back-in':'姨捨ホームへ後進','wait-forward':'姨捨発車 · F で前進','platform-out':'本線へ前進'}[op.phase];
 const target=obasuteTarget(state);return label+(target===null?'':` · あと ${Math.max(0,Math.round(Math.abs(target-op.u)))} m · ${obasuteSpeedLimit(state)} km/h以下`);
}
