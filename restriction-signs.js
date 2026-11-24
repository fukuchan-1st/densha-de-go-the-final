import {changesFromSections} from './lookahead.js?v=113';
const cache=new WeakMap();
export function restrictionSigns(route){
 const limits=route.limits??[];let track=cache.get(limits);
 if(!track){
  // Returning to an underlying maximum at a curve's end is a release, not
  // another sign to score. Only a new, binding numeric sign is an event.
  track=changesFromSections(limits).filter(x=>Number.isFinite(x.kmh)&&limits.some(row=>row.sStart===x.s&&row.kmh===x.kmh)).map(x=>({s:x.s,kmh:x.kmh,id:'track:'+x.s+':'+x.kmh}));cache.set(limits,track);
 }
 const signals=(route.signals??[]).filter(x=>!['green','proceed','G',0].includes(x.aspect)).map((x,i)=>({s:x.s,kmh:x.speedLimitKmh??x.speedLimit??x.limitKmh,id:'signal:'+i+':'+x.s})).filter(x=>Number.isFinite(x.kmh));
 return [...track,...signals].sort((a,b)=>a.s-b.s);
}
