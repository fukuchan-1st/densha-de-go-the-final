export function centralStationPlatforms(route){return /chuo|shinonoi|oito|ome|itsukaichi|tatsuno|suwa-nagano/.test(route.id??'');}
export function platformExtent(route,station,platform,fallbackLength=220){
 const first=platform.edges[0][0],last=platform.edges.at(-1)[0];
 // Keep each imported platform's own chainage. Extending every platform to the
 // selected train's length made small Oito stations look like 12-car stations.
 if(centralStationPlatforms(route)){
  if(station.name==='神城')return [last-80,last];
  return [first,last];
 }
 return [platform.boarding===false?first:Math.min(first,18-fallbackLength),platform.boarding===false?last:Math.max(last,18)];
}
