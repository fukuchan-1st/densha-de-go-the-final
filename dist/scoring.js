import {retimeMatsumotoLocals} from './matsumoto-timetable.js?v=118';
import {resolvePublishedSchedule} from './published-schedules.js?v=118';
import {routePlanningSpec,operatingBand,operatingCap} from './planning-profile.js?v=118';
export {routePlanningSpec};
import {yaganPlanningSpec,rebuildYaganTimetable,planningGrade} from './yagan-timetable.js?v=118';
import {osakaPlanningSpec,rebuildOsakaTimetable} from './osaka-timetable.js?v=118';
import {ScoreAudio} from './score-audio.js?v=118';
import {ScoreEngine,timeSeconds} from './score-engine.js?v=118';
import {restrictionSigns} from './restriction-signs.js?v=118';
export function mountScoring(parent,{badge,volume=()=>.65,blueTolerance=3}={}){
 const hud=document.createElement('div');hud.className='score-hud';hud.innerHTML='<small><b class="chain-number">0</b> chain</small><strong><b class="points-number">0</b> points</strong>';
 if(badge){[...badge.children].forEach(c=>c.hidden=true);badge.append(hud);badge.classList.add('scoring-badge');}else parent.append(hud);
 const clockPanel=document.createElement('section');clockPanel.className='score-clock';clockPanel.setAttribute('aria-label','現在時刻と通過・停車予定');clockPanel.innerHTML='<div class="score-clock-now"><small>現在時刻</small><b>00:00:00</b></div><div class="score-clock-next"><small>予定時刻</small><span></span><b>—</b></div>';parent.append(clockPanel);
 const objectives=document.createElement('div');objectives.className='score-objectives';objectives.setAttribute('aria-label','定速・定通ポイントの目標');parent.append(objectives);
 const feedback=document.createElement('div');feedback.className='score-feedback';feedback.setAttribute('role','status');parent.append(feedback);
 let manifest={},run=null,lastEventAt=0;const scoreAudio=new ScoreAudio({volume});
 // Score sounds (about 2.6 MB) are fetched when driving starts, not while the menu opens.
 let soundsRequested=false;const requestSounds=()=>{if(soundsRequested)return;soundsRequested=true;fetch(new URL('./score-sounds.json?v=phone58fix',import.meta.url)).then(r=>r.json()).then(x=>{manifest=x.sounds;return scoreAudio.preload(Object.values(manifest).map(sound=>new URL(sound.file,import.meta.url)));}).catch(()=>{soundsRequested=false;});};
 function playSounds(...names){scoreAudio.playSequence(names.map(name=>manifest[name]?.file).filter(Boolean).map(path=>new URL(path,import.meta.url)));}
 const engine=new ScoreEngine(event=>{hud.querySelector('.chain-number').textContent=event.chain;hud.querySelector('.points-number').textContent=event.points;feedback.textContent=event.grade+' '+(event.delta>=0?'+':'')+event.delta+'　'+event.reason;feedback.dataset.grade=event.grade;lastEventAt=run?.elapsed??0;const clip=event.grade==='×'?(event.delta<=-100?'D20':'D19'):({'△':'combo1','〇':'combo2','◎':'combo3'}[event.grade]);playSounds(clip,...(event.grade==='×'?[]:[event.chain<=5?'dobblescore':event.chain<=10?'speed_just':'repair']));},{blueTolerance});
 function reset(state){run=state;engine.reset(state.s);scoreAudio.stop();hud.querySelector('.chain-number').textContent='0';hud.querySelector('.points-number').textContent='0';feedback.textContent='';}
 return {engine,reset,bindHorn(sound,getState,getHazards){const original=sound.setHorn.bind(sound);sound.setHorn=(on,...args)=>{const state=getState();if(state)engine.hornChange(Boolean(on),state.elapsed,state.s,getHazards?.()??[]);return original(on,...args);};},update(state,context,dt){requestSounds();if(run!==state)reset(state);if(observeScoreDeparture(state,context.stations??[]))state.scoreCheckpoints=null;context={...context,checkpoints:state.scoreCheckpoints??=makeCheckpoints(context.stations??[],context.routeLimits??[],engine.start,state.clockStart??28800,{...(context.vehicleSpec??{}),departureTimes:state.scoreDepartureTimes??{}})};engine.tick(state,context,dt);clockPanel.querySelector('.score-clock-now b').textContent=formatScoreTime((state.clockStart??28800)+state.elapsed,true);const pending=(context.stations??[]).filter(st=>st.s>engine.start+1&&st.s>=state.s-(st.stop?engine.cfg.blueTolerance:0)&&!engine.done.has('position:'+st.id));const station=pending[0],row=clockPanel.querySelector('.score-clock-next');row.querySelector('small').textContent=station?(station.stop?'停車予定':'通過予定'):'予定時刻';row.querySelector('span').textContent=station?station.name+(station.estimated?'（推定）':''):'';row.querySelector('b').textContent=station?formatScoreTime(station.time):'—';const now=(state.clockStart??28800)+state.elapsed,target=timeSeconds(station?.time);clockPanel.querySelector('.score-clock-now b').classList.toggle('in-score-window',target!==null&&Math.abs(now-target)<=(station.stop?10:5));const upcoming=context.checkpoints.filter(p=>p.s>state.s);objectives.replaceChildren(...['speed','time'].map(kind=>{const recent=engine.lastCheckpoint,line=document.createElement('div');if(recent?.kind===kind&&state.elapsed-recent.time<=5){line.textContent=`${kind==='speed'?'定速':'定通'} 通過　${kind==='speed'?'現在 '+Math.round(recent.actual)+' / 指定 '+recent.target+' km/h':'予定 '+formatScoreTime(recent.target)}　誤差 ${signedError(recent.error,kind)}`;}else{const point=upcoming.find(p=>p.kind===kind);line.textContent=point?checkpointCaption(point,state)+`　あと ${Math.round(point.s-state.s).toLocaleString()} m`:`${kind==='speed'?'定速':'定通'}　この先の目標なし`;line.hidden=!point||point.s-state.s>600;}return line;}));if(state.elapsed-lastEventAt>5)feedback.textContent='';},pause(paused){if(paused)scoreAudio.stop();},dispose(){scoreAudio.stop();}};
}
export function scoringStations(route){const end=route.stations?.at(-1)?.s??Infinity,stops=route.stations??[];return (route.sceneryStations??stops).filter(s=>!s.displayOnly&&s.s<=end+.5).map((st,index)=>({id:st.name+':'+st.s,name:st.name,s:st.s,stop:stops.some(x=>Math.abs(x.s-st.s)<.5),time:st.arrival??st.passTime??st.time??null}));}
export function scoreHazards(route){
 const hazards=[],tunnels=(route.structures??[]).filter(x=>x.kind==='tunnel').map(x=>({s:x.sStart??x.s,end:x.sEnd??x.sStart??x.s})).filter(x=>Number.isFinite(x.s)).sort((a,b)=>a.s-b.s);
 for(const t of tunnels){const previous=hazards.at(-1);if(previous&&t.s<=previous.end+1)previous.end=Math.max(previous.end,t.end);else hazards.push({id:'tunnel:'+t.s,s:t.s,end:t.end,name:'トンネル'});}
 for(const x of [...(route.structures??[]).filter(x=>['workers','maintenance'].includes(x.kind)),...(route.workers??[]),...(route.maintenanceWorkers??[])]){
  const s=x.sStart??x.s??x.position;if(Number.isFinite(s)&&!hazards.some(h=>h.id==='worker:'+s))hazards.push({id:'worker:'+s,s,name:'保線作業員'});
 }
 return hazards.sort((a,b)=>a.s-b.s);
}
export function hornMarks(hazards=[],done=new Set()){return hazards.filter(h=>!done.has('horn:'+h.id)).map(h=>({s:h.s-150,name:h.name+'・150m手前',checkpoint:'horn',stop:false}));}
// Only the currently binding track/signal restriction identifies an interval.
export function currentScoreRestriction(route,s){
 const active=(route.limits??[]).map((x,i)=>({...x,index:i})).filter(x=>s>=x.sStart&&s<x.sEnd&&Number.isFinite(x.kmh));
 const signal=signalRestriction(route.signals,s),limit=Math.min(...active.map(x=>x.kmh),signal?.limit??Infinity);
 const signs=restrictionSigns(route);return Number.isFinite(limit)?{restrictionSigns:signs,limit,limitKey:[...active.filter(x=>x.kmh===limit).map(x=>'track:'+x.index),...(signal?.limit===limit?[signal.key]:[])].join('|')}:{restrictionSigns:signs,limit:null,limitKey:null};
}
export function signalRestriction(signals,s){const index=(signals??[]).findLastIndex(x=>x.s<=s);const signal=signals?.[index];if(!signal||['green','proceed','G',0].includes(signal.aspect))return null;const limit=signal.speedLimitKmh??signal.speedLimit??signal.limitKmh;return Number.isFinite(limit)?{limit,key:'signal:'+index}:null;}

export function buildScoreTimetable(route,startS,clockStart,spec={},ignoreKnown=false){
 const stations=scoringStations(route).map(st=>({...st}));let s=startS,clock=clockStart+30,v=0;
 const accel=Math.max(.2,(spec.startingAccelerationKmhPerSecondApprox??2.8)/3.6),brake=.8;
 for(const st of stations){if(st.s<=startS+1)continue;
  while(s<st.s-.001){const dx=Math.min(20,st.s-s),limit=(route.limits??[]).filter(x=>s>=x.sStart&&s<x.sEnd).reduce((n,x)=>Math.min(n,x.kmh),spec.maxSpeedKmh??100),remaining=st.s-s;
   const stopSpeed=st.stop?Math.sqrt(2*brake*remaining):Infinity,target=Math.min(limit/3.6,stopSpeed),next=Math.min(target,Math.sqrt(v*v+2*accel*dx));clock+=2*dx/Math.max(.5,v+next);s+=dx;v=next;
  }
  const known=ignoreKnown?null:timeSeconds(st.time);if(known===null){st.time=clock;st.estimated=true;}else clock=known;
  if(st.stop){v=0;clock+=25;}
 }
 return stations;
}

export function formatScoreTime(value,current=false){const seconds=timeSeconds(value);if(seconds===null)return '—';const n=((current?Math.floor(seconds):Math.round(seconds))%86400+86400)%86400;return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(x=>String(x).padStart(2,'0')).join(':');}

export function resolveScoreSchedule(route,startS,spec={}){
 spec=routePlanningSpec(route,yaganPlanningSpec(route,osakaPlanningSpec(route,spec)));
 if(route.publishedSchedule)return retimeMatsumotoLocals(resolvePublishedSchedule(route,startS,spec,sectionSpeedPlan),route,startS,sectionSpeedPlan);
 const raw=scoringStations(route).map(st=>({...st}));let elapsed=0,carry=0;for(let i=0;i<raw.length;i++){if(i===0){raw[i].time=0;continue;}const plan=sectionSpeedPlan({...raw[i-1],time:elapsed},{...raw[i],time:null},route.limits??[],spec,carry);elapsed=plan.departure+plan.duration;carry=plan.speeds.at(-1);raw[i].time=elapsed;}const sources=[...(route.sceneryStations??[]),...route.stations];
 const sourceAt=s=>sources.filter(st=>Math.abs(st.s-s)<.5).reduce((a,b)=>({...a,...b}),{});
 const anchors=[];let last=-Infinity;
 for(let i=0;i<raw.length;i++){const st=raw[i],source=sourceAt(st.s),value=timeSeconds(source.arrival??source.passTime??source.time);let known=value;if(i===0&&known===null)known=timeSeconds(source.startTime)??((timeSeconds(source.departure)??NaN)-30);if(!Number.isFinite(known))continue;while(known<last-43200)known+=86400;last=known;anchors.push({raw:i===0?0:st.time,time:known});}
 const map=t=>{if(!anchors.length)return 28800+t;if(t<=anchors[0].raw)return anchors[0].time+t-anchors[0].raw;for(let i=1;i<anchors.length;i++)if(t<=anchors[i].raw){const a=anchors[i-1],b=anchors[i],f=(t-a.raw)/Math.max(.001,b.raw-a.raw);return a.time+(b.time-a.time)*f;}const a=anchors.at(-1);return a.time+t-a.raw;};
 const timetable=raw.map((st,i)=>{const source=sourceAt(st.s),known=timeSeconds(source.arrival??source.passTime??source.time);return {...st,time:map(i===0?0:st.time),estimated:known===null};});
 let runningSpeed=0;
 for(let i=1;i<timetable.length;i++){const previous=timetable[i-1],station=timetable[i],plan=sectionSpeedPlan(previous,station,route.limits??[],spec,runningSpeed);if(!plan.feasible){station.sourceTime=station.time;station.time=plan.departure+plan.fastest+2;station.estimated=true;station.adjusted=true;}runningSpeed=plan.speeds.at(-1);}
 if(route.id==='yagan')rebuildYaganTimetable(timetable,route,spec,sectionSpeedPlan);
 if(route.id==='osaka')rebuildOsakaTimetable(timetable,route.limits??[],spec,sectionSpeedPlan);
 if(spec.operatingBands?.length)repairOperatingTimetable(timetable,route.limits??[],spec);
 const source=sourceAt(startS),selected=timetable.find(st=>Math.abs(st.s-startS)<.5),explicit=timeSeconds(source.startTime)??((timeSeconds(source.departure)??NaN)-30);
 const clockStart=selected?.time??(Number.isFinite(explicit)?explicit:map(0));
 timetable.planningSpec=spec;return retimeMatsumotoLocals({clockStart,timetable,planningSpec:spec,anchored:anchors.length>0},route,startS,sectionSpeedPlan);
}

export function sectionSpeedPlan(a,b,limits,spec={},initialSpeed=0){
 const length=b.s-a.s,max=spec.maxSpeedKmh??110,accel=Math.max(.2,(spec.startingAccelerationKmhPerSecondApprox??2.8)/3.6),brake=.8;
 const nodes=[a.s,b.s,...(spec.operatingBands??[]).flatMap(x=>[x.sStart,x.sEnd]).filter(s=>s>a.s&&s<b.s),...limits.flatMap(x=>[x.sStart,x.sEnd]).filter(s=>s>a.s&&s<b.s)];for(let s=a.s+20;s<b.s;s+=20)nodes.push(s);nodes.sort((a,b)=>a-b);const positions=[...new Set(nodes)];
 const caps=positions.map((s,i)=>{const at=i===positions.length-1?s-.001:s;return limits.filter(x=>at>=x.sStart&&at<x.sEnd).reduce((n,x)=>Math.min(n,x.kmh),operatingCap(spec,at))/3.6;});
 const departure=spec.departureTimes?.[a.s]??((timeSeconds(a.time)??0)+(a.stop?(spec.departureDwells?.[a.s]??spec.stationDwellSeconds??25):0)),available=(timeSeconds(b.time)??Infinity)-departure;
 const calculate=factor=>{const speeds=caps.map(v=>Math.min(v,(spec.cruiseSpeedKmh??max*factor)/3.6));speeds[0]=a.stop?0:Math.min(speeds[0],initialSpeed);
  for(let i=1;i<speeds.length;i++){const v=speeds[i-1],power=Math.max(-1,plannedAcceleration(spec,v,accel)*(spec.operatingBands?.length?.9:1)-9.80665*planningGrade(spec,(positions[i]+positions[i-1])/2)/1000);speeds[i]=Math.min(speeds[i],Math.sqrt(Math.max(0,v*v+2*power*(positions[i]-positions[i-1]))));}
  if(b.stop)speeds[speeds.length-1]=0;
  for(let i=speeds.length-2;i>=0;i--)speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[i+1]**2+2*Math.max(.2,brake+9.80665*planningGrade(spec,(positions[i+1]+positions[i])/2)/1000)*(positions[i+1]-positions[i])));
  const times=[0];for(let i=1;i<speeds.length;i++)times.push(times[i-1]+2*(positions[i]-positions[i-1])/Math.max(.1,speeds[i]+speeds[i-1]));return {speeds,times,duration:times.at(-1)};
 };
 const fastest=calculate(1);let low=.05,high=1;
 if(spec.cruiseSpeedKmh==null&&available>fastest.duration&&Number.isFinite(available)){for(let i=0;i<26;i++){const mid=(low+high)/2;if(calculate(mid).duration>available)low=mid;else high=mid;}}
 const chosen=calculate(high),at=s=>{let i=1;while(i<positions.length-1&&positions[i]<s)i++;const f=(s-positions[i-1])/(positions[i]-positions[i-1]);return {speed:(chosen.speeds[i-1]+(chosen.speeds[i]-chosen.speeds[i-1])*f)*3.6,time:departure+chosen.times[i-1]+(chosen.times[i]-chosen.times[i-1])*f};};
 return {...chosen,positions,caps,departure,available,feasible:available>=fastest.duration-.5,fastest:fastest.duration,at};
}
export function repairOperatingTimetable(stations,limits,spec){
 let carry=0;
 for(let i=1;i<stations.length;i++){
  const a=stations[i-1],b=stations[i],band=operatingBand(spec,(a.s+b.s)/2);
  const attainable=sectionSpeedPlan(a,{...b,time:null},limits,spec,carry),reachablePeak=Math.max(...attainable.speeds)*3.6;
  let pair=checkpointSectionPlan(a,b,limits,spec,carry);
  const minimum=Math.min(band?.min??0,Math.floor(reachablePeak)-1);
  let plan;
  if(pair&&pair.target>=minimum)plan=pair.plan;
  else{
   const target=Math.max(1,Math.min(Math.floor(reachablePeak+1e-6),band?.preferred??Math.floor(reachablePeak)));
   plan=sectionSpeedPlan(a,{...b,time:null},limits,{...spec,cruiseSpeedKmh:target},carry);
  }
  if(spec.recoverySeconds){let target=Math.floor(Math.max(...plan.speeds)*3.6);while(target>1&&plan.duration<attainable.duration+spec.recoverySeconds){target--;plan=sectionSpeedPlan(a,{...b,time:null},limits,{...spec,cruiseSpeedKmh:target},carry);}}
  const arrival=plan.departure+plan.duration;
  if(Math.abs(arrival-b.time)>.00001){b.sourceTime??=b.time;b.time=arrival;b.adjusted=true;b.estimated=true;}
  carry=plan.speeds.at(-1);
 }
 return stations;
}
export function observeScoreDeparture(state,stations){
 if(state.doors&&state.v<.05){const station=stations.find(st=>st.stop&&Math.abs(st.s-state.s)<=3);if(station)state.scoreBoardingStation=station.s;}
 if(state.scoreBoardingStation!=null&&!state.doors&&state.v>.05){
  (state.scoreDepartureTimes??={})[state.scoreBoardingStation]=(state.clockStart??28800)+state.elapsed;
  state.scoreBoardingStation=null;return true;
 }
 return false;
}
const forceColumns=new WeakMap();
export function plannedAcceleration(spec,v,base){
 const rows=spec.powerForceRows,notch=spec.powerNotches;
 let valid=[];if(rows){if(!forceColumns.has(rows))forceColumns.set(rows,new Map());const columns=forceColumns.get(rows);if(!columns.has(notch))columns.set(notch,rows.filter(r=>Number.isFinite(r[notch])));valid=columns.get(notch);}
 const column=speed=>{if(!valid.length)return null;if(speed<=valid[0][0])return valid[0][notch];for(let i=1;i<valid.length;i++)if(speed<=valid[i][0]){const a=valid[i-1],b=valid[i];return a[notch]+(b[notch]-a[notch])*(speed-a[0])/(b[0]-a[0]);}return valid.at(-1)[notch];};
 const reference=column(3),force=column(v*3.6),ratio=reference>0&&force!==null?force/reference:Math.min(1,45/Math.max(1,v*3.6));
 return base*ratio-.004-.0018*v-.000018*v*v;
}
export function checkpointSectionPlan(a,b,limits,spec={},initialSpeed=0){
 const base=sectionSpeedPlan(a,b,limits,spec,initialSpeed),peak=Math.max(...base.speeds)*3.6;
 let best=null;
 for(const target of [...new Set([Math.ceil(peak-1e-6),...Array.from({length:9},(_,i)=>Math.floor(peak+1e-6)-i)])]){
  if(target<1||target>(spec.maxSpeedKmh??110)||plannedAcceleration(spec,target/3.6,Math.max(.2,(spec.startingAccelerationKmhPerSecondApprox??2.8)/3.6))<0)continue;
  const plan=sectionSpeedPlan(a,b,limits,{...spec,cruiseSpeedKmh:target},initialSpeed);
  const arrivalError=plan.departure+plan.duration-timeSeconds(b.time);
  // A comfortable run must also meet the station deadline; never add a catch-up target.
  if(Math.abs(arrivalError)>2.5)continue;
  let begin=null;
  const accept=end=>{if(begin===null)return;const distance=plan.positions[end]-plan.positions[begin];if(distance>=Math.max(2,target/3.6*.25)&&(!best||Math.abs(arrivalError)<Math.abs(best.arrivalError)-.00001||(Math.abs(arrivalError)<=Math.abs(best.arrivalError)+.00001&&distance>best.distance)))best={plan,target,begin,end,distance,arrivalError};};
  for(let n=0;n<plan.speeds.length;n++){
   const flat=Math.abs(plan.speeds[n]*3.6-target)<.001;
   if(flat&&begin===null)begin=n;
   if(!flat&&begin!==null){accept(n-1);begin=null;}
  }
  accept(plan.speeds.length-1);
 }
 // Published-minute anchors can require a fractional cruising speed. The HUD
 // and scoring both use whole km/h, so retain that attainable steady cruise
 // rather than force a different integer speed and miss the station time.
 if(!best&&base.feasible){
  const target=Math.round(peak);let begin=null;
  for(let n=0;n<base.speeds.length;n++){
   const flat=Math.abs(base.speeds[n]*3.6-peak)<.001;
   if(flat&&begin===null)begin=n;
   if(begin!==null&&(!flat||n===base.speeds.length-1)){
    const end=flat?n:n-1,distance=base.positions[end]-base.positions[begin];
    if(distance>Math.max(2,target/3.6)&&target>0)best={plan:base,target,begin,end,distance,arrivalError:base.departure+base.duration-timeSeconds(b.time),fractionalCruise:true};begin=null;
   }
  }
 }
 return best;
}
export function makeCheckpoints(stations,limits,startS,clock,spec={}){
 spec={...spec,...(stations.planningSpec??{}),departureTimes:{...(stations.planningSpec?.departureTimes??{}),...spec.departureTimes}};
 const rows=stations.filter(s=>s.s>startS+1),all=[{s:startS,time:clock,stop:true},...rows],result=[];let carry=0,carryTime=clock;
 for(let i=1;i<all.length;i++){
  const a=all[i-1],b=all[i],planningSpec=a.stop?spec:{...spec,departureTimes:{...spec.departureTimes,[a.s]:carryTime}},base=sectionSpeedPlan(a,b,limits,planningSpec,carry),pair=checkpointSectionPlan(a,b,limits,planningSpec,carry);
  const chosen=pair?.plan??base;carry=chosen.speeds.at(-1);carryTime=chosen.departure+chosen.duration;if(!pair){const peakIndex=base.speeds.indexOf(Math.max(...base.speeds)),pointS=Math.min(b.s-.01,Math.max(a.s+.01,base.positions[peakIndex]));result.push({id:'speed:'+pointS,s:pointS,kind:'speed',target:Math.round(base.at(pointS).speed),station:b.name,deadlineFeasible:base.feasible,arrivalError:base.departure+base.duration-timeSeconds(b.time)});continue;}
  const {plan,target,begin,end,arrivalError}=pair,left=plan.positions[begin],right=plan.positions[end],s=left+(right-left)*.3,t=s+Math.min((right-left)*.4,target/3.6*15);
  const metadata={station:b.name,stationTime:timeSeconds(b.time),deadlineFeasible:true,arrivalError,cruiseFrom:left,cruiseTo:right,cruiseSpeedKmh:target,speedPointTime:plan.at(s).time};
  result.push({id:'speed:'+s,s,kind:'speed',target,...metadata},{id:'time:'+t,s:t,kind:'time',target:Math.round(plan.at(s).time+(t-s)/(target/3.6)),...metadata});
 }
 return result.sort((a,b)=>a.s-b.s);
}
export function signedError(error,kind){return (error>=0?'+':'')+(kind==='speed'?Math.round(error):error.toFixed(1))+(kind==='speed'?' km/h':' 秒');}
export function checkpointCaption(point,state){const speed=(state?.v??0)*3.6,clock=(state?.clockStart??28800)+(state?.elapsed??0);if(point.kind==='speed')return `定速　現在 ${Math.round(speed)} / 指定 ${point.target} km/h　差 ${signedError(Math.round(speed)-point.target,'speed')}`;const estimate=speed>1?clock+(point.s-state.s)/state.v-point.target:null;return `定通　予定 ${formatScoreTime(point.target)}　予測誤差 ${estimate===null?'—':signedError(estimate,'time')}`;}
export function checkpointMarks(points=[],state){return points.map(p=>({s:p.s,name:state?checkpointCaption(p,state).replace(/^定[速通]　/,''):p.kind==='speed'?p.target+' km/h':formatScoreTime(p.target),checkpoint:p.kind,stop:false}));}
