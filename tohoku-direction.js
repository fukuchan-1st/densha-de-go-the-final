import {prepareLeftTraffic} from './route-traffic.js?v=117';
import {interpolateKnots} from './track-layout.js?v=117';
import {reverseSteps} from './service-routes.js?v=117';
export function reverseLegacyProfile(base,length){
 const steps=(rows,key,sign=1)=>{const full=[...rows.map(x=>[x.s,x[key]]),[base.data.lengthM+.001,key==='kmh'?110:0]];return reverseSteps(full,length,sign).map(([s,value])=>({s,[key]:value}));};
 const limits=steps(base.limits,'kmh'),grades=steps(base.grades,'perMille',-1);
 return {...base,limits,grades,gradeAt:s=>-base.gradeAt(Math.max(0,length-s)),limitAt:s=>base.limitAt(Math.max(0,length-s-.00001)),elevationAt:s=>base.elevationAt(Math.max(0,length-s)),coverageAt:s=>base.coverageAt(Math.max(0,length-s)),nextLimit:s=>{const current=base.limitAt(Math.max(0,length-s-.00001));return limits.find(x=>x.s>s+.5&&x.kmh!==current)??null;}};
}
export function reverseLegacyLayout(data,length){const reversed={...data,tracks:data.tracks.map(t=>({...t,knots:t.knots.map(([s,x,...rest])=>[length-s,-x,...rest]).reverse()})),stations:data.stations.map(st=>({...st,s:length-st.s,buildingSide:st.buildingSide==='left'?'right':'left',footbridge:st.footbridge==null?undefined:length-st.footbridge,platforms:st.platforms.map(pl=>{const shift=pl.start+pl.end-2*st.s;return {...pl,start:length-pl.end+shift,end:length-pl.start+shift,edges:pl.edges.map(([s,l,r])=>[length-s+shift,-r,-l]).reverse()};})})).reverse()};
 return normalizeLegacyLayout(reversed,length,true);
}
export function normalizeLegacyLayout(data,length,reverse=false){
 const stations=data.stations.map(st=>({...st,platforms:st.platforms}));
 const stationLayouts=Object.fromEntries(stations.map(st=>[st.name,{platforms:st.platforms.map(p=>({...p,edges:p.edges.map(([s,l,r])=>[s-st.s,l,r])}))}]));
 const r=prepareLeftTraffic({id:'tohoku',diagramWiring:data.diagramWiring,length,reverseDirection:reverse,stations,stationLayouts,neighborTracks:data.tracks.filter(t=>t.id!=='player').map(t=>({...t,height:t.knots[0][2]??0})),trafficSections:[{sStart:-300,sEnd:length+300,tracks:2}]});
 return {...data,tracks:[{id:'player',direction:'same',knots:r.drivingTrack.map(([s,x])=>[s,x,0])},...r.neighborTracks.map((t,i)=>({...t,id:'traffic-'+i,knots:t.knots.map(([s,x])=>[s,x,t.height??0])}))],stations:stations.map(st=>({...st,platforms:r.stationLayouts[st.name].platforms.map(p=>({...p,start:st.s+p.edges[0][0],end:st.s+p.edges.at(-1)[0],edges:p.edges.map(([s,l,r])=>[s+st.s,l,r])}))}))};
}
