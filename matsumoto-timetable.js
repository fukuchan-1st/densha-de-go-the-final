// The user's operating pattern overrides the old all-stations slack here only.
export function retimeMatsumotoLocals(schedule,route,startS,planSection){
 if((route.service??'').includes('特急')||['e353','383','681'].includes(route.vehicle))return schedule;
 const stations=route.sceneryStations??route.stations??[],a=stations.find(st=>st.name==='塩尻'),b=stations.find(st=>st.name==='松本');if(!a||!b)return schedule;
 const lo=Math.min(a.s,b.s),hi=Math.max(a.s,b.s),rows=schedule.timetable,first=rows.findIndex(st=>Math.abs(st.s-lo)<1),last=rows.findIndex(st=>Math.abs(st.s-hi)<1);if(first<0||last<=first)return schedule;
 const spec=schedule.planningSpec,departures=spec.departureTimes??(spec.departureTimes={}),oldEnd=rows[last].time;let speed=0;
 for(let i=first+1;i<=last;i++){
  const prev=rows[i-1],next=rows[i];
  if(i>first+1&&prev.stop)departures[prev.s]=prev.time+25;
  const plan=planSection(prev,{...next,time:null},route.limits??[],{...spec,cruiseSpeedKmh:100},speed);speed=plan.speeds.at(-1);
  next.sourceTime??=next.time;next.time=plan.departure+plan.duration;next.adjusted=true;next.estimated=true;
 }
 const shift=rows[last].time-oldEnd;
 for(let i=last;i<rows.length;i++){
  if(i>last){rows[i].time+=shift;rows[i].adjusted=true;}
  if(Number.isFinite(departures[rows[i].s]))departures[rows[i].s]+=shift;
 }
 const selected=rows.find(st=>Math.abs(st.s-startS)<1);if(selected&&selected.s>lo)schedule.clockStart=Number.isFinite(departures[selected.s])?Math.max(selected.time,departures[selected.s]-30):selected.time;
 schedule.matsumotoLocalRetimed=true;return schedule;
}
