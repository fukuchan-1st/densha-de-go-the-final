import {prepareCorridorScenery} from './corridor-scenery.js?v=controls55';
import {interpolateKnots} from './track-layout.js';
export function selectTokaidoServiceTrack(source,service){
 if(source.id!=='tokaido'||!['新快速','特急'].includes(service))return source;
 if(source.serviceTrack==='outer')return source;
 const route=prepareCorridorScenery(source),end=(route.sceneryStations??route.stations).at(-1).s;
 const original=source.drivingTrack??[[-300,0],[end+300,0]],points=[];
 const clearPlatform=(s,x)=>{for(let pass=0;pass<4;pass++)for(const st of route.sceneryStations??route.stations){if(Math.abs(st.s-s)>450)continue;for(const p of route.stationLayouts?.[st.name]?.platforms??[]){const relative=s-st.s;if(relative<p.edges[0][0]||relative>p.edges.at(-1)[0]||Math.abs(p.height??0)>.3)continue;const left=interpolateKnots(p.edges,relative,1),right=interpolateKnots(p.edges,relative,2);if(x>left-1.5&&x<right+1.5)x=left-1.55;}}return x;};
 for(let s=-300;s<=end+300;s+=20){
  const inner=interpolateKnots(original,s),ideal=clearPlatform(s,inner-9);
  const candidates=route.neighborTracks.filter(t=>t.knots[0][0]<=s&&t.knots.at(-1)[0]>=s&&Math.abs(t.height??0)<.3).map(t=>interpolateKnots(t.knots,s)).filter(x=>x<inner-3&&Math.abs(x-ideal)<3);
  const x=candidates.sort((a,b)=>Math.abs(a-ideal)-Math.abs(b-ideal))[0]??ideal;points.push([s,clearPlatform(s,x)]);
 }
 if(points.at(-1)[0]<end+300)points.push([end+300,points.at(-1)[1]]);
 // Blend short map fragments to avoid sudden lateral jumps between outer rails.
 let drivingTrack=points;for(let pass=0;pass<3;pass++)drivingTrack=drivingTrack.map(([s,x],i,a)=>[s,i===0||i===a.length-1?x:(a[i-1][1]+2*x+a[i+1][1])/4]);
 drivingTrack=drivingTrack.map(([s,x])=>[s,clearPlatform(s,x)]);
 return {...route,drivingTrack,neighborTracks:[...route.neighborTracks,{knots:original,basis:'Inner track retained for local and rapid services'}],serviceTrack:'outer',serviceTrackBasis:'Mapped outer rail fragments with approximate continuations'};
}
