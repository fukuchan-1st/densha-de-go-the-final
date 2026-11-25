// Coupling/uncoupling becomes effective at departure, after boarding finishes.
export function formationCount(route,state,fallback=2){
 let count=route.serviceOption?.carCount??route.tobuScenario?.carCount??fallback;
 for(const change of route.tobuScenario?.formationChanges??[]){
  const index=route.stations.findIndex(st=>st.name===change.station);
  if(index>=0&&(state.startIndex>=index||state.next>index&&state.s>=route.stations[index].s-3))count=change.carCount;
 }
 return count;
}
