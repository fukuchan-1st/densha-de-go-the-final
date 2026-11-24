import {interpolateKnots} from './track-layout.js?v=113';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Keep both running rails continuous while the schematic adds station sidings.
export function fitYamagataOpposing(rails,drive,station,lo,hi,platforms,preferred){
 let x=Math.max(4.2,preferred??4.2);
 for(let i=0;i<platforms.length+1;i++){const hit=platforms.find(p=>x>p.edges[0][1]-drive(station)-1.55&&x<p.edges[0][2]-drive(station)+1.55);if(!hit)break;x=hit.edges[0][2]-drive(station)+1.55;}
 const board=platforms.find(p=>p.boarding),length=board?board.edges.at(-1)[0]-board.edges[0][0]:120;
 const a=Math.max(lo,station-length-160),b=Math.min(hi,station+180),left=Math.min(station-30,a+140),right=Math.max(station+30,b-140);
 return rails.map(rail=>{if(!rail.trafficMain||rail.direction!=='opposing'||b<=a)return rail;const old=rail.knots,at=s=>interpolateKnots(old,s),xs=new Set([a,b,left,right,station,...old.filter(k=>k[0]<a||k[0]>b).map(k=>k[0])]);for(let s=a;s<b;s+=20)xs.add(s);const knots=[...xs].sort((u,v)=>u-v).map(s=>{let value=at(s);if(s>=a&&s<=b){const target=drive(s)+x,t=s<left?smooth((s-a)/Math.max(1,left-a)):s>right?smooth((b-s)/Math.max(1,b-right)):1;value+=t*(target-value);}return [s,value];});return {...rail,knots};});
}
