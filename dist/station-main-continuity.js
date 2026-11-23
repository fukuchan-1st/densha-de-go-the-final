import {interpolateKnots as at} from './track-layout.js?v=111';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Retain the continuous running lines when a diagram replaces station sidings.
export function fitStationMainRails(rails,drive,station,lo,hi,platforms,candidates=[]){
 const mains=rails.filter(r=>r.trafficMain&&r.knots[0][0]<hi&&r.knots.at(-1)[0]>lo).sort((a,b)=>at(a.knots,station)-at(b.knots,station)),used=[];
 return rails.map(rail=>{
  if(!mains.includes(rail))return rail;
  const old=rail.knots,base=at(old,station)-drive(station),side=Math.sign(base)||1;
  const safe=x=>Math.abs(x)>2.8&&Math.sign(x)===side&&!used.some(v=>Math.abs(v-x)<3.1)&&!platforms.some(p=>x>at(p.edges,0,1)-drive(station)-1.55&&x<at(p.edges,0,2)-drive(station)+1.55);
  let x=[...candidates,base].filter(safe).sort((a,b)=>Math.abs(a-base)-Math.abs(b-base))[0];
  if(x===undefined){x=side*Math.max(4.2,Math.abs(base));for(let i=0;i<100&&!safe(x);i++)x+=side*.5;}used.push(x);
  const from=Math.max(old[0][0],lo),to=Math.min(old.at(-1)[0],hi),edgeRows=platforms.flatMap(p=>[station+p.edges[0][0],station+p.edges.at(-1)[0]]),p0=Math.max(from,Math.min(...edgeRows,station-100)),p1=Math.min(to,Math.max(...edgeRows,station+20)),a=Math.max(old[0][0],Math.min(from,p0-180)),b=Math.min(old.at(-1)[0],Math.max(to,p1+180));
  const xs=new Set([...old.map(r=>r[0]),a,b,p0,p1]);for(let s=a;s<b;s+=10)xs.add(s);
  const knots=[...xs].sort((a,b)=>a-b).map(s=>{const t=s<a||s>b?0:s<p0?smooth((s-a)/Math.max(1,p0-a)):s>p1?smooth((b-s)/Math.max(1,b-p1)):1;return [s,at(old,s)+(drive(s)+x-at(old,s))*t,...(old[0].length>2?[at(old,s,2)]:[])];});
  return {...rail,knots,continuousMain:true};
 });
}
