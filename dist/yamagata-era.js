// The same BVE alignment supports three states of Akaiwa without sharing stops.
export function withYamagataEra(route,era='closed'){
 if(route.id!=='yamagata')return route;
 const historical=route.historicalStations?.find(s=>s.key==='sta04'||s.name.startsWith('赤岩'));
 const all=(route.sceneryStations??route.stations).filter(s=>!s.name.startsWith('赤岩'));
 if(era==='closed'||!historical)return {...route,era,stations:route.stations.filter(s=>!s.name.startsWith('赤岩')),sceneryStations:all};
 const akaiwa={...historical,name:'赤岩',closed:false,passOnly:era==='suspended',sourcePass:era==='suspended'};
 const sceneryStations=[...all,akaiwa].sort((a,b)=>a.s-b.s);
 return {...route,era,sceneryStations,stations:[...route.stations.filter(s=>!s.name.startsWith('赤岩')),akaiwa].sort((a,b)=>a.s-b.s)};
}
