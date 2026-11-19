import {interpolateKnots} from './track-layout.js?v=79';
export const tokyoWeight=d=>{const t=Math.max(0,Math.min(1,(Math.abs(d)-300)/1100));return 1-t*t*(3-2*t);};
// Canonical cross-section looks north: Marunouchi/Chuo west, Yaesu east.
export function prepareTokyoStation(route){

 const stations=route.sceneryStations??route.stations??[],st=stations.find(s=>s.name==='東京'),chuo=route.id?.startsWith('chuo'),yamanote=route.id==='yamanote';if(!st||(!chuo&&!yamanote))return route;const stationKey=[route.id,!!route.reverseDirection,st.s,stations[0]?.name,stations.at(-1)?.name].join(':');if(route.tokyoStationKey===stationKey)return route;
 const north=chuo?!route.reverseDirection:!!route.reverseDirection,sign=north?1:-1,own=chuo?(north?12:0):(north?34:38.2),drive=s=>route.drivingTrack?.length?interpolateKnots(route.drivingTrack,s):0,x=(v,s=st.s)=>drive(s)+(v-own)*sign;
 const lo=st.s-1500,hi=st.s+1500,clip=t=>{const k=t.knots,a=k[0][0],b=k.at(-1)[0],out=[];for(const [l,r]of[[a,Math.min(b,lo)],[Math.max(a,hi),b]])if(r>l)out.push({...t,knots:[[l,interpolateKnots(k,l)],...k.filter(p=>p[0]>l&&p[0]<r),[r,interpolateKnots(k,r)]]});return out;};
 const rails=(route.neighborTracks??[]).flatMap(clip),centres=[0,12,22,34,38.2,50.2,54.4,66.4,70.6,82.6];
 const localLevel=(v,s)=>(v<=12?(chuo?0:6):(chuo?-6:0))*tokyoWeight(s-st.s);
 for(let i=0;i<centres.length;i++){const v=centres[i];if(v===own)continue;const terminal=v<=12,a=terminal?(north?st.s-245:st.s-1400):lo,b=terminal?(north?st.s+1400:st.s+35):hi,knots=[],heightKnots=[];for(let s=a;s<=b;s=Math.min(b,s+20)){knots.push([s,x(v,s)]);heightKnots.push([s,localLevel(v,s)]);if(s===b)break;}rails.push({tokyoTrack:true,diagramTrack:true,platformNumber:i+1,lineName:i<2?'中央線':i<6?'山手線・京浜東北線':'東海道線・上野東京ライン',sceneryParallel:true,direction:'scenery',height:localLevel(v,st.s),heightKnots,knots});}
 // The crossover is north of the terminal, never behind the buffer stops.
 if(chuo){const start=st.s+sign*160,end=st.s+sign*390,rows=[];for(let i=0;i<=24;i++){const t=i/24,s=start+(end-start)*t,u=t*t*(3-2*t);rows.push([s,x(12*(1-u),s)]);}rows.sort((a,b)=>a[0]-b[0]);rails.push({tokyoTrack:true,diagramTrack:true,sceneryParallel:true,direction:'scenery',height:0,knots:rows});}
 const platforms=[];for(let i=0;i<centres.length;i+=2){const a=centres[i]+1.55,b=centres[i+1]-1.55,l=Math.min(x(a),x(b)),r=Math.max(x(a),x(b)),boarding=own===centres[i]||own===centres[i+1];platforms.push({ref:`${i+1};${i+2}`,boarding,height:localLevel(centres[i],st.s),edges:[[-225,l,r],[15,l,r]],roof:[-215,5],tokyoPlatform:true});}
 const boarding=platforms.find(p=>p.boarding),side=(boarding.edges[0][1]+boarding.edges[0][2])/2>drive(st.s)?'right':'left',update=s=>s.name==='東京'?{...s,doorSide:side}:s;
 return {...route,tokyoStationVersion:93,tokyoStationKey:stationKey,neighborTracks:rails,stations:route.stations.map(update),sceneryStations:stations.map(update),stationLayouts:{...route.stationLayouts,'東京':{platforms,diagramTopology:true,tokyoStation:true}},tokyoLayout:{north,own,westToEast:centres}};
}
