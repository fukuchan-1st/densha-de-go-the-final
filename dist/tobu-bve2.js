// Use supplied historical BVE controls, retaining mapped horizontal geometry and
// GSI relief: the source intentionally omits most of the real mountain ascent.
export function applyTobuBve2(route,profile){
 if(route.bve2Reference)return route;
 const anchors=profile?.anchorsByRoute?.[route.id];if(!anchors?.length)return route;
 const map=s=>{let i=0;while(i<anchors.length-2&&anchors[i+1].bveS<s)i++;const a=anchors[i],b=anchors[i+1];return a.routeS+(s-a.bveS)*(b.routeS-a.routeS)/(b.bveS-a.bveS||1);};
 const first=anchors[0].bveS,last=anchors.at(-1).bveS,end=Math.min(route.length,map(last));
 const limits=profile.limits.filter(x=>x.sEnd>first&&x.sStart<last&&x.kmh>0).map(x=>({...x,sStart:Math.max(0,map(x.sStart)),sEnd:Math.min(end,map(x.sEnd)),source:'提供isesaki BVE2・35快速（旧時代の制限を参考）'})).filter(x=>x.sEnd>x.sStart);
 const rows=profile.heightGround;const before=rows.findLast(x=>x.s<=first);const ground=[[0,before?.railAboveGroundM??0],...rows.filter(x=>x.s>first&&x.s<last).map(x=>[map(x.s),x.railAboveGroundM]),[end,(rows.findLast(x=>x.s<=last)?.railAboveGroundM??0)]];
 if(end<route.length-.1)ground.push([end+.1,0],[route.length+300,0]);
 return {...route,limits:[...(route.limits??[]),...limits].sort((a,b)=>a.sStart-b.sStart),bveGroundClearance:ground,bve2Reference:{source:profile.source,stationAnchors:anchors,curveCount:profile.curves.filter(x=>x.s>=first&&x.s<=last).length,gradeCount:profile.grades.filter(x=>x.s>=first&&x.s<=last).length,verticalPolicy:'Keep GSI rail elevations: source total rise170.1m is deliberately simplified.',timetablePolicy:'Existing scenario clocks and dwell settings preserved'}};
}
