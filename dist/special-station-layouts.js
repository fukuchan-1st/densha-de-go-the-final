import {interpolateKnots} from './track-layout.js?v=105';
export function prepareSpecialStations(route){
 if(route.id==='yagan'){
  const layout=route.stationLayouts?.['男鹿高原'];if(!layout?.platforms?.length)return route;
  const shortest=[...layout.platforms].sort((a,b)=>(a.edges.at(-1)[0]-a.edges[0][0])-(b.edges.at(-1)[0]-b.edges[0][0]))[0];
  return {...route,stationLayouts:{...route.stationLayouts,'男鹿高原':{...layout,platforms:[{...shortest,boarding:true,edges:shortest.edges.map(([s,l,r])=>r-l>=3.6?[s,l,r]:r<=0?[s,r-3.6,r]:[s,l,l+3.6])}]}}};
 }
 if(!['toho','toho-village','toho-center'].includes(route.id))return route;
 const station=(route.sceneryStations??route.stations).find(s=>s.name==='人里');if(!station)return route;
 const main=route.id==='toho',reverse=!!route.reverseDirection,travel=(main?1:-1)*(reverse?-1:1),base=main?0:route.id==='toho-center'?-10:18;
 const local=x=>(x-base)*travel,h=station.s,own=main?(reverse?8:0):base;
 const platform=(a,b,line)=>({boarding:line===(main?'main':route.id==='toho-center'?'center':'village'),line,edges:[[-130,Math.min(local(a),local(b)),Math.max(local(a),local(b))],[130,Math.min(local(a),local(b)),Math.max(local(a),local(b))]],roof:[-110,110]});
 const platforms=[platform(-16,-11.55,'center'),platform(1.55,6.45,'main'),platform(19.55,24.5,'village')];
 const specs=[['center',-10,[[-480,0],[-250,-10],[150,-10]]],['main',0,[[-650,0],[650,0]]],['main',8,[[-850,0],[-550,8],[300,8],[650,0]]],['village',18,[[-480,8],[-250,18],[150,18]]]];
 const smooth=rows=>{const out=[];for(let i=1;i<rows.length;i++){const [a,x]=rows[i-1],[b,y]=rows[i];for(let s=a;s<b;s+=10){const t=(s-a)/(b-a),u=t*t*(3-2*t);out.push([s,x+(y-x)*u]);}}out.push(rows.at(-1));return out;};
 const neighbors=(route.neighborTracks??[]).filter(t=>!t.humanHub);
 for(const [line,x,knots]of specs){if(x===own)continue;neighbors.push({humanHub:true,sceneryParallel:true,direction:'scenery',line,knots:smooth(knots.map(([d,v])=>[h+d*travel,local(v)]).sort((a,b)=>a[0]-b[0]))});}
 let driving=(route.drivingTrack??[[-300,0],[route.length+300,0]]).map(row=>[...row]);
 if(main&&reverse){const cuts=[h-850,h-550,h+300,h+650];driving=driving.filter(([s])=>s<cuts[0]||s>cuts[3]);driving.push(...smooth([[cuts[0],0],[cuts[1],-8],[cuts[2],-8],[cuts[3],0]]));}
 if(!main){const along=reverse?-1:1,target=local(route.id==='toho-center'?0:8),knots=[[0,0],[250,0],[480,target],[650,target],[850,0]].map(([d,x])=>[h+d*along,x]).sort((a,b)=>a[0]-b[0]);const lo=knots[0][0],hi=knots.at(-1)[0];driving=driving.filter(([s])=>s<lo||s>hi);driving.push(...smooth(knots));}
 driving.sort((a,b)=>a[0]-b[0]);driving=driving.filter((row,i)=>!i||row[0]!==driving[i-1][0]);
 return {...route,drivingTrack:driving,neighborTracks:neighbors,stationLayouts:{...route.stationLayouts,'人里':{platforms,layoutSource:'User: three platforms, four tracks; both branches connect on Meikai side',meikaiSide:main?(reverse?'increasing':'decreasing'):(reverse?'decreasing':'increasing')}}};
}
