// Game timetable: 70 km/h, the supplied 6050 traction curve and route grades.
// Ordinary dwell: 3 s before opening + 15 s boarding + 1.486 s whistle +
// 3.488 s door-close sample. Shin-Fujiwara also plays its 15.136 s departure clip.
export function yaganPlanningSpec(route,spec={}){
 return route.id==='yagan'?{...spec,maxSpeedKmh:Math.min(70,spec.maxSpeedKmh??70),powerNotches:spec.powerNotches??3,stationDwellSeconds:23,gradeProfile:route.grades??[]}:spec;
}
export function rebuildYaganTimetable(stations,route,spec,planSection){
 for(let i=1;i<stations.length;i++){
  const a=stations[i-1],b=stations[i],first=i===1;
  const dwell=first?(route.stations[0]?.departureSound?35.2:20):23;
  const plan=planSection(a,{...b,time:null},route.limits??[],{...spec,stationDwellSeconds:dwell,cruiseSpeedKmh:70},0);
  b.sourceTime??=b.time;b.time=Math.ceil(plan.departure+plan.duration+3);b.estimated=true;b.adjusted=true;
 }
 return stations;
}
export function yaganBoardingReady(state,route){
 return yaganBoardingDelay(state,route)<=0;
}
export function yaganBoardingDelay(state,route){
 if(route.id!=='yagan'||state.startingDeparture||state.cheatUsed)return 0;
 const s=route.stations[state.next]?.s,station=state.scoreTimetable?.find(st=>Math.abs(st.s-s)<.5);
 return Number.isFinite(station?.time)?Math.max(0,station.time+18-((state.clockStart??0)+state.elapsed)):0;
}
export function planningGrade(spec,s){
 const rows=spec.gradeProfile;if(!rows?.length)return 0;
 let lo=0,hi=rows.length-1;if(s<=rows[0][0])return rows[0][1];
 while(hi-lo>1){const mid=(lo+hi)>>1;if(rows[mid][0]<=s)lo=mid;else hi=mid;}
 const a=rows[lo],b=rows[hi],f=Math.max(0,Math.min(1,(s-a[0])/Math.max(.001,b[0]-a[0])));return Math.max(-40,Math.min(40,a[1]+(b[1]-a[1])*f));
}
