import {ScoreEngine,timeSeconds} from './score-engine.js?v=score9';
export function mountScoring(parent,{badge,volume=()=>.65,blueTolerance=3}={}){
 const hud=document.createElement('div');hud.className='score-hud';hud.innerHTML='<small><b class="chain-number">0</b> chain</small><strong><b class="points-number">0</b> points</strong>';
 if(badge){[...badge.children].forEach(c=>c.hidden=true);badge.append(hud);badge.classList.add('scoring-badge');}else parent.append(hud);
 const clockPanel=document.createElement('section');clockPanel.className='score-clock';clockPanel.setAttribute('aria-label','現在時刻と通過・停車予定');clockPanel.innerHTML='<div class="score-clock-now"><small>現在時刻</small><b>00:00:00</b></div><div class="score-clock-next"><small>予定時刻</small><span></span><b>—</b></div>';parent.append(clockPanel);
 const objectives=document.createElement('div');objectives.className='score-objectives';objectives.setAttribute('aria-label','定速・定通ポイントの目標');parent.append(objectives);
 const feedback=document.createElement('div');feedback.className='score-feedback';feedback.setAttribute('role','status');parent.append(feedback);
 let manifest={},queue=[],playing=null,run=null,lastEventAt=0;
 fetch(new URL('./score-sounds.json',import.meta.url)).then(r=>r.json()).then(x=>manifest=x.sounds).catch(()=>{});
 function playNext(){if(playing||!queue.length)return;const path=manifest[queue.shift()]?.file;if(!path){playNext();return;}const audio=new Audio(new URL(path,import.meta.url));playing=audio;audio.volume=volume();const done=()=>{playing=null;playNext();};audio.onended=done;audio.onerror=done;audio.play().catch(done);}
 const engine=new ScoreEngine(event=>{hud.querySelector('.chain-number').textContent=event.chain;hud.querySelector('.points-number').textContent=event.points;feedback.textContent=event.grade+' '+(event.delta>=0?'+':'')+event.delta+'　'+event.reason;feedback.dataset.grade=event.grade;lastEventAt=run?.elapsed??0;const clip=event.grade==='×'?(event.delta<=-100?'D20':'D19'):({'△':'combo1','〇':'combo2','◎':'combo3'}[event.grade]);queue.push(clip);if(event.grade!=='×')queue.push(event.chain<=5?'dobblescore':event.chain<=10?'speed_just':'repair');if(queue.length>8)queue=queue.slice(-8);playNext();},{blueTolerance});
 function reset(state){run=state;engine.reset(state.s);queue=[];if(playing){playing.pause();playing=null;}hud.querySelector('.chain-number').textContent='0';hud.querySelector('.points-number').textContent='0';feedback.textContent='';}
 return {engine,reset,bindHorn(sound,getState,getHazards){const original=sound.setHorn.bind(sound);sound.setHorn=(on,...args)=>{const state=getState();if(state)engine.hornChange(Boolean(on),state.elapsed,state.s,getHazards?.()??[]);return original(on,...args);};},update(state,context,dt){if(run!==state)reset(state);context={...context,checkpoints:state.scoreCheckpoints??=makeCheckpoints(context.stations??[],context.routeLimits??[],engine.start,state.clockStart??28800,context.vehicleSpec??{})};engine.tick(state,context,dt);clockPanel.querySelector('.score-clock-now b').textContent=formatScoreTime((state.clockStart??28800)+state.elapsed,true);const pending=(context.stations??[]).filter(st=>st.s>engine.start+1&&st.s>=state.s-(st.stop?engine.cfg.blueTolerance:0)&&!engine.done.has('position:'+st.id));const station=pending[0],row=clockPanel.querySelector('.score-clock-next');row.querySelector('small').textContent=station?(station.stop?'停車予定':'通過予定'):'予定時刻';row.querySelector('span').textContent=station?station.name+(station.estimated?'（推定）':''):'';row.querySelector('b').textContent=station?formatScoreTime(station.time):'—';const now=(state.clockStart??28800)+state.elapsed,target=timeSeconds(station?.time);clockPanel.querySelector('.score-clock-now b').classList.toggle('in-score-window',target!==null&&Math.abs(now-target)<=(station.stop?10:5));const upcoming=context.checkpoints.filter(p=>p.s>state.s);objectives.replaceChildren(...['speed','time'].map(kind=>{const recent=engine.lastCheckpoint,line=document.createElement('div');if(recent?.kind===kind&&state.elapsed-recent.time<=5){line.textContent=`${kind==='speed'?'定速':'定通'} 通過　${kind==='speed'?'現在 '+Math.round(recent.actual)+' / 指定 '+recent.target+' km/h':'予定 '+formatScoreTime(recent.target)}　誤差 ${signedError(recent.error,kind)}`;}else{const point=upcoming.find(p=>p.kind===kind);line.textContent=point?checkpointCaption(point,state)+`　あと ${Math.round(point.s-state.s).toLocaleString()} m`:`${kind==='speed'?'定速':'定通'}　この先の目標なし`;}return line;}));if(state.elapsed-lastEventAt>5)feedback.textContent='';},pause(paused){if(paused){queue=[];playing?.pause();playing=null;}},dispose(){queue=[];playing?.pause();}};
}
export function scoringStations(route){const end=route.stations?.at(-1)?.s??Infinity,stops=route.stations??[];return (route.sceneryStations??stops).filter(s=>s.s<=end+.5).map((st,index)=>({id:st.name+':'+st.s,name:st.name,s:st.s,stop:stops.some(x=>Math.abs(x.s-st.s)<.5),time:st.arrival??st.passTime??st.time??null}));}
export function scoreHazards(route){return [...(route.structures??[]).filter(x=>x.kind==='tunnel'||x.kind==='workers'||x.kind==='maintenance').map(x=>({id:'tunnel:'+x.sStart,s:x.sStart??x.s})),...(route.workers??route.maintenanceWorkers??[]).map((x,i)=>({id:'worker:'+i,s:x.s??x.position}))].filter(x=>Number.isFinite(x.s));}
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
 const raw=scoringStations(route).map(st=>({...st}));let elapsed=0,carry=0;for(let i=0;i<raw.length;i++){if(i===0){raw[i].time=0;continue;}const plan=sectionSpeedPlan({...raw[i-1],time:elapsed},{...raw[i],time:null},route.limits??[],spec,carry);elapsed=plan.departure+plan.duration;carry=plan.speeds.at(-1);raw[i].time=elapsed;}const sources=[...(route.sceneryStations??[]),...route.stations];
 const sourceAt=s=>sources.filter(st=>Math.abs(st.s-s)<.5).reduce((a,b)=>({...a,...b}),{});
 const anchors=[];let last=-Infinity;
 for(let i=0;i<raw.length;i++){const st=raw[i],source=sourceAt(st.s),value=timeSeconds(source.arrival??source.passTime??source.time);let known=value;if(i===0&&known===null)known=timeSeconds(source.startTime)??((timeSeconds(source.departure)??NaN)-30);if(!Number.isFinite(known))continue;while(known<last-43200)known+=86400;last=known;anchors.push({raw:i===0?0:st.time,time:known});}
 const map=t=>{if(!anchors.length)return 28800+t;if(t<=anchors[0].raw)return anchors[0].time+t-anchors[0].raw;for(let i=1;i<anchors.length;i++)if(t<=anchors[i].raw){const a=anchors[i-1],b=anchors[i],f=(t-a.raw)/Math.max(.001,b.raw-a.raw);return a.time+(b.time-a.time)*f;}const a=anchors.at(-1);return a.time+t-a.raw;};
 const timetable=raw.map((st,i)=>{const source=sourceAt(st.s),known=timeSeconds(source.arrival??source.passTime??source.time);return {...st,time:map(i===0?0:st.time),estimated:known===null};});
 let runningSpeed=0;
 for(let i=1;i<timetable.length;i++){const previous=timetable[i-1],station=timetable[i],plan=sectionSpeedPlan(previous,station,route.limits??[],spec,runningSpeed);if(!plan.feasible){station.sourceTime=station.time;station.time=plan.departure+plan.fastest+2;station.estimated=true;station.adjusted=true;}runningSpeed=plan.speeds.at(-1);}
 const source=sourceAt(startS),selected=timetable.find(st=>Math.abs(st.s-startS)<.5),explicit=timeSeconds(source.startTime)??((timeSeconds(source.departure)??NaN)-30);
 const clockStart=selected?.adjusted?selected.time:Number.isFinite(explicit)?explicit:selected?.time??map(0);
 return {clockStart,timetable,anchored:anchors.length>0};
}

export function sectionSpeedPlan(a,b,limits,spec={},initialSpeed=0){
 const length=b.s-a.s,max=spec.maxSpeedKmh??110,accel=Math.max(.2,(spec.startingAccelerationKmhPerSecondApprox??2.8)/3.6),brake=.8;
 const nodes=[a.s,b.s,...limits.flatMap(x=>[x.sStart,x.sEnd]).filter(s=>s>a.s&&s<b.s)];for(let s=a.s+20;s<b.s;s+=20)nodes.push(s);nodes.sort((a,b)=>a-b);const positions=[...new Set(nodes)];
 const caps=positions.map((s,i)=>{const at=i===positions.length-1?s-.001:s;return limits.filter(x=>at>=x.sStart&&at<x.sEnd).reduce((n,x)=>Math.min(n,x.kmh),max)/3.6;});
 const departure=(timeSeconds(a.time)??0)+(a.stop?25:0),available=(timeSeconds(b.time)??Infinity)-departure;
 const calculate=factor=>{const speeds=caps.map(v=>v*factor);speeds[0]=a.stop?0:Math.min(speeds[0],initialSpeed);
  for(let i=1;i<speeds.length;i++){const v=speeds[i-1],power=Math.max(.05,accel*Math.min(1,45/Math.max(1,v*3.6))-.004-.0018*v-.000018*v*v);speeds[i]=Math.min(speeds[i],Math.sqrt(v*v+2*power*(positions[i]-positions[i-1])));}
  if(b.stop)speeds[speeds.length-1]=0;
  for(let i=speeds.length-2;i>=0;i--)speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[i+1]**2+2*brake*(positions[i+1]-positions[i])));
  const times=[0];for(let i=1;i<speeds.length;i++)times.push(times[i-1]+2*(positions[i]-positions[i-1])/Math.max(.1,speeds[i]+speeds[i-1]));return {speeds,times,duration:times.at(-1)};
 };
 const fastest=calculate(1);let low=.05,high=1;
 if(available>fastest.duration&&Number.isFinite(available)){for(let i=0;i<26;i++){const mid=(low+high)/2;if(calculate(mid).duration>available)low=mid;else high=mid;}}
 const chosen=calculate(high),at=s=>{let i=1;while(i<positions.length-1&&positions[i]<s)i++;const f=(s-positions[i-1])/(positions[i]-positions[i-1]);return {speed:(chosen.speeds[i-1]+(chosen.speeds[i]-chosen.speeds[i-1])*f)*3.6,time:departure+chosen.times[i-1]+(chosen.times[i]-chosen.times[i-1])*f};};
 return {...chosen,positions,caps,departure,available,feasible:available>=fastest.duration-.5,fastest:fastest.duration,at};
}
export function makeCheckpoints(stations,limits,startS,clock,spec={}){
 const rows=stations.filter(s=>s.s>startS+1),all=[{s:startS,time:clock,stop:true},...rows],eligible=all.slice(1).filter((b,i)=>b.s-all[i].s>=800).length,stride=Math.max(1,Math.ceil(eligible/12)),result=[];let index=0,carry=0;
 for(let i=1;i<all.length;i++){const a=all[i-1],b=all[i],plan=sectionSpeedPlan(a,b,limits,spec,carry);carry=plan.speeds.at(-1);if(b.s-a.s<800)continue;if(index++%stride)continue;
  const s=a.s+(b.s-a.s)*.4,t=a.s+(b.s-a.s)*.65,limit=limits.filter(x=>s>=x.sStart&&s<x.sEnd).reduce((n,x)=>Math.min(n,x.kmh),spec.maxSpeedKmh??110),speed=Math.max(1,Math.min(Math.floor(limit),Math.round(plan.at(s).speed))),metadata={station:b.name,stationTime:timeSeconds(b.time),deadlineFeasible:plan.feasible};
  result.push({id:'speed:'+s,s,kind:'speed',target:speed,...metadata},{id:'time:'+t,s:t,kind:'time',target:Math.round(plan.at(t).time),...metadata});
 }
 return result.sort((a,b)=>a.s-b.s);
}
export function signedError(error,kind){return (error>=0?'+':'')+(kind==='speed'?Math.round(error):error.toFixed(1))+(kind==='speed'?' km/h':' 秒');}
export function checkpointCaption(point,state){const speed=(state?.v??0)*3.6,clock=(state?.clockStart??28800)+(state?.elapsed??0);if(point.kind==='speed')return `定速　現在 ${Math.round(speed)} / 指定 ${point.target} km/h　差 ${signedError(Math.round(speed)-point.target,'speed')}`;const estimate=speed>1?clock+(point.s-state.s)/state.v-point.target:null;return `定通　予定 ${formatScoreTime(point.target)}　予測誤差 ${estimate===null?'—':signedError(estimate,'time')}`;}
export function checkpointMarks(points=[],state){return points.map(p=>({s:p.s,name:state?checkpointCaption(p,state).replace(/^定[速通]　/,''):p.kind==='speed'?p.target+' km/h':formatScoreTime(p.target),checkpoint:p.kind,stop:false}));}
