export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function interpolateTable(rows,speed,column=1){
 const points=rows.filter(r=>Number.isFinite(r[0])&&Number.isFinite(r[column]));
 if(!points.length)return null;if(speed<=points[0][0])return points[0][column];
 for(let i=1;i<points.length;i++)if(speed<=points[i][0]){const a=points[i-1],b=points[i];return a[column]+(b[column]-a[column])*(speed-a[0])/(b[0]-a[0]);}
 return points.at(-1)[column];
}
export function controlsFor(recipe){const labels=recipe.notchLabels,neutral=labels.indexOf('N');return {labels,neutral,min:-neutral,max:labels.length-neutral-1,brakeMax:Math.max(...labels.map(l=>Number(l.match(/^B(\d+)$/)?.[1]??0)))};}
export function notchLabel(recipe,n){const c=controlsFor(recipe);return c.labels[clamp(n+c.neutral,0,c.labels.length-1)];}
export function createJourney(route,recipe,startIndex=0){return {s:route.stations[startIndex].s,v:0,notch:0,elapsed:0,next:startIndex+1,startIndex,served:0,missed:0,errors:[],doors:true,doorPhase:'boarding',startingDeparture:true,dwell:0,stopWait:0,finished:false,acceleration:0};}
export function driveStep(state,recipe,dt,grade=0){
 const c=controlsFor(recipe),label=notchLabel(recipe,state.notch),spec=recipe.playableSpecs,old=state.v,kmh=old*3.6;
 let a=-9.80665*grade/1000;
 if(state.doors)a=old>0?-1:0;
 else if(label==='EB')a-=1.15;
 else if(/^B/.test(label))a-=(Number(label.slice(1))/c.brakeMax)*(recipe.serviceBrakeKmhPerSecond??3.6)/3.6;
 else {
  if(state.notch>0){const rows=recipe.performance?.power?.force?.rows??[],reference=interpolateTable(rows,3,c.max),force=interpolateTable(rows,kmh,state.notch),base=(spec.startingAccelerationKmhPerSecondApprox??2.8)/3.6;
   a+=reference>0&&force!==null?base*force/reference:base*(state.notch/c.max)*Math.min(1,45/Math.max(1,kmh));}
  if(old>0)a-=.004+.0018*old+.000018*old*old;
  if(label==='抑速'){if(state.previousNotch!==state.notch)state.holdSpeed=old;a=Math.min(a,Math.max(-1,(state.holdSpeed-old)/Math.max(dt,.001)));}
 }
 state.previousNotch=state.notch;state.v=clamp(old+a*dt,0,spec.maxSpeedKmh/3.6);state.s+=(old+state.v)*dt/2;state.elapsed+=dt;state.acceleration=dt?(state.v-old)/dt:0;return state.acceleration;
}
export function brakeAssist(state,route,recipe){
 const distance=route.stations[state.next].s-state.s,c=controlsFor(recipe);
 if(distance<state.v*state.v/.55+24)state.assistBraking=true;
 if(!state.assistBraking)return;
 if(Math.abs(distance)<2&&state.v<.8){state.s+=distance;state.v=0;state.notch=-Math.min(4,c.brakeMax);return;}
 const target=Math.sqrt(Math.max(0,distance-1.5)*.55);
 state.notch=state.v>target?-Math.min(4,c.brakeMax):0;
}
export function distanceLabel(d){const v=Math.abs(d);return v<=5?`${Math.round(v*100)} cm`:`${Math.round(v).toLocaleString('ja-JP')} m`;}
export function stopPosition(d){return {visible:Math.abs(d)<=10,percent:clamp((10-d)/20*100,0,100),text:Math.abs(d)<.005?'停止位置':`${d>=0?'手前':'超過'} ${distanceLabel(d)}`};}
export function finishStop(state,route){state.doors=false;state.doorPhase=null;state.assistBraking=false;state.stopWait=0;state.dwell=0;if(state.startingDeparture)state.startingDeparture=false;else{state.errors.push(state.s-route.stations[state.next].s);state.served++;state.next++;}state.finished=state.next>=route.stations.length;}
