import {fitStationMainRails} from './station-main-continuity.js?v=112c';
import {fitYamagataOpposing} from './yamagata-wiring.js?v=112c';
import {prepareTokyoStation} from './tokyo-station.js?v=112c';
import {interpolateKnots} from './track-layout.js?v=112c';
const keyName=s=>s?.replaceAll('ヶ','ケ').replaceAll('ノ','ノ').replace('ヤナバ前','ヤナバスキー場前');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let pending;
export async function loadStationWiring(route){
 if(!route.id||route.id==='toho'||route.id.startsWith('toho-'))return route;
 pending??=fetch('./assets/station-wiring92.json.gz?v=98').then(async r=>{if(!r.ok)throw Error('配線略図データを読み込めません');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes[0]!==31||bytes[1]!==139)return JSON.parse(new TextDecoder().decode(bytes));return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();}).catch(e=>{pending=null;throw e;});
 return {...route,diagramWiring:(await pending).families};
}
export function wiringFamily(route,station){
 const data=route.diagramWiring;if(!data)return null;
 const exact=['yamanote','osaka','tokaido','tohoku','yagan','yamagata'].find(id=>route.id===id);if(exact)return exact;
 if(!/^(chuo|shinonoi|oito|suwa|tatsuno)/.test(route.id))return null;
 const name=keyName(station.name),has=id=>data[id]?.some(s=>keyName(s.name)===name);
 if(route.id.includes('oito')&&has('oito'))return 'oito';
 if(has('shinetsu')&&['篠ノ井','今井','川中島','安茂里','長野'].includes(station.name))return 'shinetsu';
 if(has('shinonoi'))return 'shinonoi';if(has('chuo'))return 'chuo';if(has('oito'))return 'oito';return null;
}
function cutRail(track,lo,hi){
 const k=track.knots,first=k[0][0],last=k.at(-1)[0];if(last<=lo||first>=hi)return [track];const out=[];
 for(const [a,b]of[[first,lo],[hi,last]])if(b-a>.1){const rows=[[a,...k[0].slice(1).map((_,i)=>interpolateKnots(k,a,i+1))],...k.filter(p=>p[0]>a&&p[0]<b),[b,...k[0].slice(1).map((_,i)=>interpolateKnots(k,b,i+1))]];out.push({...track,knots:rows});}return out;
}
function directionInDocument(route,st,records){
 const all=route.sceneryStations??route.stations,index=all.findIndex(s=>s.name===st.name),rank=name=>records.findIndex(r=>keyName(r.name)===keyName(name)),at=rank(st.name),later=all.slice(index+1).find(s=>rank(s.name)>=0),earlier=all.slice(0,index).findLast(s=>rank(s.name)>=0);let delta=later?rank(later.name)-at:earlier?at-rank(earlier.name):route.reverseDirection?-1:1;
 if(['yamanote','osaka'].includes(route.id)&&Math.abs(delta)>records.length/2)delta=-delta;return delta>=0?1:-1;
}
function drawingRails(record){
 // Platforms are bounded by running rails 1.55 m clear of the edge. PDF
 // segments supply the throats/yard topology; their crossings stay separate.
 const scale=4.2/(record.pitch||9.12),ys=record.rails.filter(y=>record.platforms.some(p=>Math.abs(y-p[1])*scale<3.4||Math.abs(y-p[3])*scale<3.4));
 const candidates=[...ys];
 if(!candidates.length)candidates.push(...record.rails);
 if(!candidates.length){for(const [a,y,b,z]of record.segments){const t=clamp(-a/Math.max(.001,b-a),0,1),x=a+(b-a)*t,v=y+(z-y)*t;if(Math.abs(x)<30&&!record.platforms.some(p=>v>p[1]&&v<p[3]))candidates.push(v);}}

 return candidates.sort((a,b)=>a-b);
}
export function applyStationWiring(route,source=route){
 if(!route.diagramWiring)return route;
 const stations=(route.sceneryStations??route.stations).filter(st=>!st.displayOnly),key=[route.id,route.length,!!route.reverseDirection,route.serviceTrack,stations[0]?.name,stations.at(-1)?.name,route.era??'',110].join(':');if(route.diagramLayoutKey===key)return route;
 let rails=(route.neighborTracks??[]).filter(t=>!t.diagramTrack),layouts={...route.stationLayouts},audit=[],doors=new Map();const drive=s=>route.drivingTrack?.length?interpolateKnots(route.drivingTrack,s):0;
 for(let si=0;si<stations.length;si++){
  const st=stations[si],family=wiringFamily(route,st),records=route.diagramWiring[family]??[],rec=records.find(r=>keyName(r.name)===keyName(st.name));if(!rec||!rec.platforms.length)continue;
  const sign=directionInDocument(route,st,records),lat=4.2/(rec.pitch||9.12),candidates=drawingRails(rec);if(!candidates.length)continue;
  const sorted=[...rec.platforms].sort((a,b)=>a[1]-b[1]);
  // Preserve the playable railway at large shared stations; other platforms
  // remain scenery. The full station is retained instead of flattened to 2/4 tracks.
  const select={yamagata:{福島:2,山形:sign>0?1:2,北山形:sign>0?3:4},chuo:{新宿:3,中野:1,立川:1,八王子:1},yamanote:{品川:0,大崎:2,新宿:1,池袋:0},osaka:{天王寺:2,大阪:0},tokaido:{京都:1,新大阪:2,大阪:2}}[family]?.[st.name];
  const selected=sorted[clamp(select??(sign>0?0:sorted.length-1),0,sorted.length-1)];
  const boardingCandidates=family==='yamagata'&&rec.standardRails?.length?rec.standardRails:candidates;
  const sideRail=sign>0?boardingCandidates.filter(y=>y<selected[1]).at(-1):boardingCandidates.find(y=>y>selected[3]);const nearest=[...boardingCandidates].sort((a,b)=>Math.min(Math.abs(a-selected[1]),Math.abs(a-selected[3]))-Math.min(Math.abs(b-selected[1]),Math.abs(b-selected[3])))[0];const ownY=sideRail!=null&&Math.min(Math.abs(sideRail-selected[1]),Math.abs(sideRail-selected[3]))*lat<3.5?sideRail:nearest;doors.set(st.name,((selected[1]+selected[3])/2-ownY)*sign>0?'right':'left');
  const old=source.stationLayouts?.[st.name]?.platforms??[],oldBoard=old.find(p=>p.boarding)??old.find(p=>(p.height??0)===0)??old[0];let length=oldBoard?.edges?.length?oldBoard.edges.at(-1)[0]-oldBoard.edges[0][0]:220;
  length=st.name==='神城'?80:clamp(length,40,360);const sx=length/Math.max(12,selected[2]-selected[0]),mid=(selected[0]+selected[2])/2,ends=[Math.min(...rec.platforms.map(p=>p[0])),Math.max(...rec.platforms.map(p=>p[2]))];
  const map=x=>{const at=clamp(x,...ends);return (at-mid)*sx+(x-at)*Math.max(sx,10);},origin=map(sign>0?selected[2]:selected[0]),at=x=>st.s+(map(x)-origin)*sign+18;
  const rawLo=Math.min(at(rec.column[0]),at(rec.column[1])),rawHi=Math.max(at(rec.column[0]),at(rec.column[1]));
  const lo=Math.max(rawLo,si?(stations[si-1].s+st.s)/2:-300),hi=Math.min(rawHi,si<stations.length-1?(st.s+stations[si+1].s)/2:(route.length??st.s)+300);if(hi-lo<20)continue;
  // Keep separate-level lines (Tokyo's lower platforms, for example).
  rails=rails.flatMap(t=>t.trafficMain||Math.abs(t.height??0)>.4?t:cutRail(t,lo,hi));
  const local=rec.segments.map(([a,y,b,z])=>({a:at(a),b:at(b),y:(y-ownY)*lat*sign,z:(z-ownY)*lat*sign}));
  const generated=[];
  for(const seg of local){let {a,b,y,z}=seg;if(a>b)[a,b,y,z]=[b,a,z,y];const start=Math.max(a,lo),end=Math.min(b,hi);if(end-start<1)continue;const offset=s=>drive(s)+y+(z-y)*(s-a)/(b-a);const x0=offset(start),x1=offset(end);
   if(Math.abs(x0-drive(start))<.5&&Math.abs(x1-drive(end))<.5)continue;
   if(Math.abs(x1-x0)/(end-start)>.2)continue; // schematic vertical jumps are not rail curves
   generated.push({diagramTrack:true,diagramStation:st.name,sceneryParallel:true,direction:'scenery',height:0,knots:[[start,x0],[end,x1]]});
  }
  // At the platform itself, enforce every explicit face even when the source
  // drawing splits a long running line around a station label/overbridge.
  for(const y of candidates){const x=(y-ownY)*lat*sign;if(Math.abs(x)<.7)continue;const a=Math.max(lo,Math.min(at(selected[0]),at(selected[2]))-80),b=Math.min(hi,Math.max(at(selected[0]),at(selected[2]))+80);if(b<=a)continue;
   if(!generated.some(t=>t.knots[0][0]<=st.s&&t.knots.at(-1)[0]>=st.s&&Math.abs(interpolateKnots(t.knots,st.s)-drive(st.s)-x)<.5))generated.push({diagramTrack:true,diagramStation:st.name,sceneryParallel:true,direction:x>2.8?'opposing':'scenery',height:0,knots:[[a,drive(a)+x],[b,drive(b)+x]]});
  }
  const opposite=(sign>0?candidates.find(y=>y>selected[3]):[...candidates].reverse().find(y=>y<selected[1]));
  const oppositeX=opposite==null?null:(opposite-ownY)*lat*sign;
  for(const rail of generated){const k=rail.knots,mid=(k[0][0]+k.at(-1)[0])/2,x=interpolateKnots(k,mid)-drive(mid);rail.direction=family==='yamagata'?'scenery':oppositeX>2.8&&Math.abs(x-oppositeX)<.8?'opposing':'scenery';if(family==='yamagata'&&st.name==='福島'&&ownY+x/lat/sign<310)rail.height=6.8;}
  rails.push(...generated);
  const platforms=rec.platforms.map((p,i)=>{const a=clamp(at(p[0]),lo,hi)-st.s,b=clamp(at(p[2]),lo,hi)-st.s,l=drive(st.s)+(p[1]-ownY)*lat*sign,r=drive(st.s)+(p[3]-ownY)*lat*sign;return {boarding:p===selected,diagramPlatform:true,sourceDocument:rec.document,sourcePage:rec.page,height:family==='yamagata'&&st.name==='福島'&&p[1]<310?6.8:0,edges:[[Math.min(a,b),Math.min(l,r),Math.max(l,r)],[Math.max(a,b),Math.min(l,r),Math.max(l,r)]],roof:[Math.min(a,b)+8,Math.max(a,b)-8]};}).filter(p=>p.edges[1][0]-p.edges[0][0]>4);
  if(family!=='yamagata')rails=fitStationMainRails(rails,drive,st.s,lo,hi,platforms.filter(p=>!p.height),candidates.map(y=>(y-ownY)*lat*sign));
  if(family==='yamagata'){const primaryCandidates=boardingCandidates.map(y=>(y-ownY)*lat*sign).filter(x=>x>2.8).sort((a,b)=>a-b);rails=fitYamagataOpposing(rails,drive,st.s,lo,hi,platforms.filter(p=>!p.height),primaryCandidates[0]??4.2);}
  if(st.name==='東京'&&route.id.startsWith('chuo'))platforms.push(...old.filter(p=>(p.height??0)<-.3));
  layouts[st.name]={...layouts[st.name],platforms,diagramSource:{document:rec.document,page:rec.page,family},diagramTopology:true};
  audit.push({name:st.name,sourceDocument:rec.document,sourcePage:rec.page,platforms:platforms.length,segments:generated.length,lo,hi});
 }
 return prepareTokyoStation({...route,stations:route.stations.map(st=>doors.has(st.name)?{...st,doorSide:doors.get(st.name)}:st),sceneryStations:stations.map(st=>doors.has(st.name)?{...st,doorSide:doors.get(st.name)}:st),neighborTracks:rails,stationLayouts:layouts,diagramLayoutKey:key,stationWiringAudit:audit});
}
