export function osakaPlanningSpec(route,spec={}){
 return route.id==='osaka'?{...spec,maxSpeedKmh:Math.min(80,spec.maxSpeedKmh??80),stationDwellSeconds:35}:spec;
}
export function rebuildOsakaTimetable(stations,limits,spec,planSection){
 
 for(let i=1;i<stations.length;i++){
  const a=stations[i-1],b=stations[i];
  const plan=planSection(a,{...b,time:null},limits,spec,0);
  const comfortable=plan.departure+plan.duration+Math.max(7,plan.duration*.10);
  if(b.time<comfortable){b.sourceTime??=b.time;b.time=Math.ceil(comfortable);b.adjusted=true;b.estimated=true;}

 }
 return stations;
}
