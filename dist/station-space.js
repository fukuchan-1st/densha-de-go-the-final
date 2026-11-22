import {interpolateKnots} from './track-layout.js?v=107';
import {platformExtent} from './station-platform-length.js?v=107';
export function stationPlatforms(world,station){
 const legacy=world.trackLayout?.stations?.find(st=>Math.abs(st.s-station.s)<1);
 if(legacy)return (legacy.platforms??[]).map(p=>({station:legacy,platform:p,start:p.start,end:p.end,legacy:true}));
 const route=world.route??{},drive=world.driveOffset?.(station.s)??0,opposite=world.oppositeOffset?.(station.s)??drive+4.2,side=opposite>=drive?-1:1,edge=drive+side*1.55,outer=edge+side*4.8,length=world.platformLength?.()??220;
 const platforms=route.stationLayouts?.[station.name]?.platforms??[{boarding:true,edges:[[18-length,Math.min(edge,outer),Math.max(edge,outer)],[18,Math.min(edge,outer),Math.max(edge,outer)]]}];
 return platforms.map(p=>{const [a,b]=platformExtent(route,station,p,length);return {station,platform:p,start:station.s+a,end:station.s+b,legacy:false};});
}
export function platformBoundsAt(world,item,s){
 if(item.legacy){const b=world.trackLayout.bounds(item.platform,s);return [b.left,b.right];}
 if(world.platformBounds)return world.platformBounds(item.station,item.platform,s,(world.railTracks??[]).map(t=>t.offset?t:{...t,start:t.knots[0][0],end:t.knots.at(-1)[0],height:t.heightKnots?.length?interpolateKnots(t.heightKnots,s):t.knots[0][2]??t.height??0,offset:at=>interpolateKnots(t.knots,at)}));
 return [1,2].map(c=>interpolateKnots(item.platform.edges,s-item.station.s,c));
}
export function stationBuildingClear(world,s,x,width,depth){
 const stations=world.route?.sceneryStations??world.route?.stations??world.stations??[];
 for(const station of stations){if(Math.abs(station.s-s)>600+depth/2)continue;
  for(const item of stationPlatforms(world,station)){
   const from=Math.max(item.start-4,s-depth/2-4),to=Math.min(item.end+4,s+depth/2+4);if(to<from)continue;
   // Sample the complete footprint, including curved/tapered platform edges.
   for(let at=from;;at=Math.min(to,at+5)){
    const [left,right]=platformBoundsAt(world,item,at);
    if(x+width/2+3>left&&x-width/2-3<right)return false;
    if(at===to)break;
   }
  }
 }return true;
}
export function stoppingStationSpot(world,s,length){
 const stops=world.route?.stations??world.stations??[];
 const station=stops.find(st=>!st.passOnly&&s>=st.s-450&&s-length<=st.s+30);if(!station)return null;
 const options=stationPlatforms(world,station).filter(p=>p.end-p.start>3).sort((a,b)=>Number(b.platform.boarding??false)-Number(a.platform.boarding??false));
 if(!options.length)return null;
 const item=options[0],anchor=Math.max(item.start+1.5,Math.min(item.end-1.5,station.s-Math.min(80,Math.max(18,length*.45))));
 return {s:anchor,kind:'station',name:station.name,station,stopping:true};
}
