import {interpolateKnots} from './track-layout.js';
import {reverseSteps} from './service-routes.js?v=services63';
export function reverseLegacyProfile(base,length){
 const steps=(rows,key,sign=1)=>{const full=[...rows.map(x=>[x.s,x[key]]),[base.data.lengthM+.001,key==='kmh'?110:0]];return reverseSteps(full,length,sign).map(([s,value])=>({s,[key]:value}));};
 const limits=steps(base.limits,'kmh'),grades=steps(base.grades,'perMille',-1);
 return {...base,limits,grades,gradeAt:s=>-base.gradeAt(Math.max(0,length-s)),limitAt:s=>base.limitAt(Math.max(0,length-s-.00001)),elevationAt:s=>base.elevationAt(Math.max(0,length-s)),coverageAt:s=>base.coverageAt(Math.max(0,length-s)),nextLimit:s=>{const current=base.limitAt(Math.max(0,length-s-.00001));return limits.find(x=>x.s>s+.5&&x.kmh!==current)??null;}};
}
export function reverseLegacyLayout(data,length){const reversed={...data,tracks:data.tracks.map(t=>({...t,knots:t.knots.map(([s,x,...rest])=>[length-s,-x,...rest]).reverse()})),stations:data.stations.map(st=>({...st,s:length-st.s,buildingSide:st.buildingSide==='left'?'right':'left',footbridge:st.footbridge==null?undefined:length-st.footbridge,platforms:st.platforms.map(pl=>{const shift=pl.start+pl.end-2*st.s;return {...pl,start:length-pl.end+shift,end:length-pl.start+shift,edges:pl.edges.map(([s,l,r])=>[length-s+shift,-r,-l]).reverse()};})})).reverse()};
 const opposite=data.tracks.find(t=>t.id==='bve-opposite'),knots=[];
 for(let s=-300;s<=length+300;s+=20){const original=length-s;knots.push([s,-(opposite&&original>=opposite.knots[0][0]&&original<=opposite.knots.at(-1)[0]?interpolateKnots(opposite.knots,original):4.2),0]);}
 for(let i=1;i<knots.length;i++)knots[i][1]=knots[i-1][1]+Math.max(-.8,Math.min(.8,knots[i][1]-knots[i-1][1]));
 reversed.tracks=reversed.tracks.filter(t=>!['player','bve-opposite'].includes(t.id));reversed.tracks.push({id:'player',knots},{id:'reverse-opposite',knots:[[-300,0,0],[length+300,0,0]]});
 for(const st of reversed.stations){const x=interpolateKnots(knots,st.s);if(!st.platforms.some(p=>{const l=interpolateKnots(p.edges,st.s,1),r=interpolateKnots(p.edges,st.s,2);return !(x>l&&x<r)&&Math.min(Math.abs(x-l),Math.abs(x-r))<2;}))st.platforms.push({start:st.s-200,end:st.s+20,edges:[[st.s-200,x-5,x-1.5],[st.s+20,x-5,x-1.5]],roofLength:150,source:'reverse-inferred'});}
 return reversed;
}
