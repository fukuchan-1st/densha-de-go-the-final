import {interpolateKnots} from './track-layout.js?v=113';
const outerStops=new Set(['京都','高槻','新大阪','大阪','尼崎','芦屋','三ノ宮','神戸']);
const major=new Set(['京都','新大阪','大阪','神戸']);
const tracks=[-8,0,8,16];
// One shared topology owns both the driving rail and platform edges. The route
// centerline stays mapped; cross-sections are a consistent prototype layout.
export function selectTokaidoServiceTrack(source,service){
 if(source.id!=='tokaido')return source;
 const outer=(['新快速','特急'].includes(service)||service.includes('しなの')),player=outer?-8:0;
 if(source.tokaidoTopologyVersion===2&&source.serviceTrack===(outer?'outer':'inner'))return source;
 const stations=source.sceneryStations??source.stations,end=stations.at(-1).s;
 const full=x=>[[-300,x],[end+300,x]],layouts={},neighbors=tracks.filter(x=>x!==player).map(x=>({knots:full(x),basis:'Continuous four-track main line',mainCorridor:true}));
 const platform=(left,right,boarding)=>({edges:[[-260,left,right],[20,left,right]],roof:[-210,5],boarding,height:0,basis:'Consistent platform clearance from main-line rails'});
 for(const st of stations){
  const platforms=outerStops.has(st.name)?[platform(-6.45,-1.55,true),platform(9.55,14.45,false)]:[platform(1.55,6.45,!outer)];
  if(major.has(st.name)){
   const oldCount=source.stationLayouts?.[st.name]?.platforms?.length??2;
   for(let i=0;i<Math.max(1,oldCount-2);i++){
    const x=-20-i*12;
    const raw=[[st.s-650,-8],[st.s-500,x],[st.s-330,x],[st.s+100,x],[st.s+430,-8]],from=Math.max(-300,raw[0][0]),to=Math.min(end+300,raw.at(-1)[0]);
    const knots=[[from,interpolateKnots(raw,from)],...raw.filter(([s])=>s>from&&s<to),[to,interpolateKnots(raw,to)]];
    neighbors.push({knots,basis:'Station siding',station:st.name});
    platforms.push(platform(x+1.55,x+6.5,false));
   }
  }
  layouts[st.name]={platforms,opposite:[[-600,8],[600,8]],basis:'Prototype four-track station layout; mapped centerline retained'};
 }
 return {...source,drivingTrack:full(player),neighborTracks:neighbors,stationLayouts:layouts,defaultOppositeOffset:outer?0:8,serviceTrack:outer?'outer':'inner',corridorSceneryPrepared:true,tokaidoTopologyVersion:2,serviceTrackBasis:'Shared four-track and platform topology; approximate station cross-sections'};
}
