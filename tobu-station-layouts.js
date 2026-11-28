import {interpolateKnots} from './track-layout.js?v=118';
// Tobu / Aizu station cross-sections traced from the user-supplied 配線略図.net
// diagrams (きたまと, 2023年6月現在):
//  (10) 東武伊勢崎線 Ver.3.2, (11) 東武日光線 Ver.2.0, (12) 東武鬼怒川線 Ver.2.0, (13) 会津鉄道線 Ver.1.0.
// Each section lists tracks and platforms from the LEFT to the RIGHT of a train
// running in the corridor's forward direction (浅草→会津田島 / 南栗橋→東武日光).
// For the Aizu diagram, which is drawn 西若松(left)→会津高原(right), that is page bottom→top.
//  D/U  down/up main (local tracks in the 北千住〜北越谷 four-track section)
//  E/F  express down/up tracks (four-track section)
//  M    single-track main
//  d/u  extra track for down/up trains (on single lines: the down/up passing track)
//  e/f  express-side stop tracks, s  other track (branch, siding, terminating track)
//  P    platform; '>' forward stop track, '<' reverse stop track (when the train stops)
// Lateral spacing and platform lengths are schematic, not survey values.
const LINES={
 isesaki:{island:8,side:5,length:210,roof:.75,source:'配線略図.net 東武鉄道伊勢崎線 Ver.3.2(きたまと)'},
 nikkoSouth:{island:8,side:5,length:210,roof:.6,source:'配線略図.net 東武鉄道日光線 Ver.2.0(きたまと, 2023年6月現在)'},
 nikko:{island:6.5,side:4.5,length:140,roof:.45,source:'配線略図.net 東武鉄道日光線 Ver.2.0(きたまと, 2023年6月現在)'},
 kinugawa:{island:5.5,side:4,length:90,roof:.4,source:'配線略図.net 東武鉄道鬼怒川線 Ver.2.0(きたまと, 2023年6月現在)'},
 aizu:{island:5,side:3.6,length:80,roof:.35,source:'配線略図.net 会津鉄道線 Ver.1.0(きたまと, 2023年6月現在)'}
};
export const TOBU_STATION_SECTIONS={
 // 東武伊勢崎線 浅草〜東武動物公園
 '浅草':['isesaki','P s P D U P s'],
 'とうきょうスカイツリー':['isesaki','P D U P'],
 '曳舟':['isesaki','D P s s P U s P'],
 '東向島':['isesaki','P D U P'],
 '鐘ヶ淵':['isesaki','P D U P'],
 '堀切':['isesaki','P D U P'],
 '牛田':['isesaki','P D U P'],
 '北千住':['isesaki','s P s P s E P D s U P F'],
 '小菅':['isesaki','E D P U F'],
 '五反野':['isesaki','E D P U F'],
 '梅島':['isesaki','E D P U F'],
 '西新井':['isesaki','s P s E P D U P F'],
 '竹ノ塚':['isesaki','E D P U F'],
 '谷塚':['isesaki','E D P U F'],
 '草加':['isesaki','E e> P D U P f< F'],
 '獨協大学前〈草加松原〉':['isesaki','E D P U F'],
 '新田':['isesaki','E D P U F'],
 '蒲生':['isesaki','E D P U F'],
 '新越谷':['isesaki','E P D U P F'],
 '越谷':['isesaki','E e> P D U P f< F'],
 '北越谷':['isesaki','E P D U P F'],
 '大袋':['isesaki','P D U P'],
 'せんげん台':['isesaki','d P D U P u'],
 '武里':['isesaki','P D U P'],
 '一ノ割':['isesaki','P D U P'],
 '春日部':['isesaki','s P s d P D U P u'],
 '北春日部':['isesaki','D d> P u< U s'],
 '姫宮':['isesaki','P D U P'],
 '東武動物公園':['isesaki','s s d P D U P u'],
 // 東武日光線
 '杉戸高野台':['nikkoSouth','d P D U P u'],
 '幸手':['nikkoSouth','P D U P'],
 '南栗橋':['nikkoSouth','s P s D P U s'],
 '栗橋':['nikko','D P U s'],
 '新古河':['nikko','P D U P'],
 '柳生':['nikko','P D U P'],
 '板倉東洋大前':['nikko','d P D U P u'],
 '藤岡':['nikko','D P U'],
 '静和':['nikko','D P U'],
 '新大平下':['nikko','d P D U P u'],
 '栃木':['nikko','d P D U P'],
 '新栃木':['nikko','P D U P s s'],
 '合戦場':['nikko','P D U P'],
 '家中':['nikko','D P U'],
 '東武金崎':['nikko','D P u< U'],
 '楡木':['nikko','D P U'],
 '樅山':['nikko','P D U P'],
 '新鹿沼':['nikko','D P u U P'],
 '北鹿沼':['nikko','P D U P'],
 '板荷':['nikko','D P U'],
 '下小代':['nikko','D P U'],
 '明神':['nikko','P D U P'],
 '下今市':['nikko','s d P D U P u s'],
 '上今市':['nikko','P D U P'],
 '東武日光':['nikko','P s P D U P'],
 // 東武鬼怒川線(全線単線)
 '大谷向':['kinugawa','P d u P'],
 '大桑':['kinugawa','d P u'],
 '新高徳':['kinugawa','d P u'],
 '小佐越':['kinugawa','d P u'],
 '東武ワールドスクウェア':['kinugawa','M P'],
 '鬼怒川温泉':['kinugawa','s P s u P M'],
 '鬼怒川公園':['kinugawa','s P d M P'],
 '新藤原':['kinugawa','s P s P M'],
 // 会津鉄道線(会津高原尾瀬口〜会津田島。図の下側が会津田島方面行きの左)
 '会津高原尾瀬口':['aizu','u P M s'],
 '七ヶ岳登山口':['aizu','P M'],
 '会津山村道場':['aizu','P M'],
 '会津荒海':['aizu','P d u P'],
 '中荒井':['aizu','M P'],
 '会津田島':['aizu','s P s M P s']
};
const LENGTH={'下今市':150,'栃木':150,'新栃木':150,'新鹿沼':150,'東武日光':150,'鬼怒川温泉':130,'新藤原':130,'会津田島':130};
const MAINS=new Set(['D','U','E','F','M']);
const PARENT={d:'D',u:'U',e:'E',f:'F'};
// Lateral position of each track in the forward frame, measured to the right.
export function parseSection(text,line){
 const spec=LINES[line],tracks=[],platforms=[];let y=null,prev=null,pending=false,leading=false;
 for(const token of text.trim().split(/\s+/)){
  if(token==='P'){if(y===null)leading=true;else pending=true;continue;}
  const role=token[0],fwd=token.includes('>'),rev=token.includes('<');
  y=y===null?0:y+(pending?3.1+spec.island:4.2);
  if(pending)platforms.push([prev+1.55,y-1.55]);
  if(leading)platforms.push([y-1.55-spec.side,y-1.55]);
  pending=leading=false;tracks.push({role,y,fwd,rev});prev=y;
 }
 if(pending)platforms.push([prev+1.55,prev+1.55+spec.side]);
 const single=!tracks.some(t=>t.role==='D'||t.role==='U'),anchor=tracks.find(t=>t.role===(single?'M':'D'))??tracks.find(t=>t.role==='d')??tracks[0],shift=anchor.y;
 for(const t of tracks)t.y-=shift;
 return {tracks,platforms:platforms.map(([l,r])=>[l-shift,r-shift]),single,spec};
}
const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function resample(knots,a,b,fn){const lo=Math.max(a,knots[0][0]),hi=Math.min(b,knots.at(-1)[0]);if(hi<=lo)return knots;const rows=knots.filter(k=>k[0]<lo||k[0]>hi).map(k=>[...k]);for(let s=lo;s<hi;s+=10)rows.push([s,fn(s)]);rows.push([hi,fn(hi)]);rows.sort((p,q)=>p[0]-q[0]);return rows.filter((row,i)=>!i||row[0]-rows[i-1][0]>.01);}
// Nominal forward-frame positions of the mains that prepareLeftTraffic lays out.
const NOMINAL=[['E',-8],['D',0],['U',4.2],['U',8],['F',16]];
export function prepareTobuStations(route){
 if(!route.id?.startsWith('tobu')||!route.drivingTrack?.length)return route;
 const reverse=!!route.reverseDirection,sign=reverse?-1:1,X=y=>sign*y,outer=route.serviceTrack==='outer';
 const stops=route.tobuStops?new Set(route.tobuStops):null,L=route.length??route.stations.at(-1).s;
 const all=(route.sceneryStations??route.stations).filter(st=>!st.displayOnly&&TOBU_STATION_SECTIONS[st.name]&&!(st.name==='北千住'&&route.hibiyaPlatform6));
 if(!all.length)return route;
 const names=new Set(all.map(st=>st.name));
 let driving=route.drivingTrack.map(r=>[...r]);
 let neighbors=(route.neighborTracks??[]).filter(t=>!t.tobuStation&&!(t.passingLoop&&names.has(t.station))).map(t=>({...t,knots:t.knots.map(k=>[...k])}));
 const layouts={...route.stationLayouts},doors=new Map(),audit=[];
 for(const st of all){
  const [line,text]=TOBU_STATION_SECTIONS[st.name],{tracks,platforms,single,spec}=parseSection(text,line),has=r=>tracks.some(t=>t.role===r);
  const stopsHere=!stops||stops.has(st.name),mark=reverse?'rev':'fwd';
  const mainRole=single?(reverse?(has('u')?'u':'M'):(has('d')?'d':'M')):(reverse?(outer&&has('F')?'F':'U'):(outer&&has('E')?'E':'D'));
  const length=LENGTH[st.name]??spec.length,p0=-length+18,p1=18;
  // Map the existing running rails at the station to diagram roles.
  const baseDrive=driving.map(r=>[...r]),driveAt=s=>interpolateKnots(baseDrive,s);
  const mapped=[];
  if(!single)for(const rail of neighbors){if(!rail.trafficMain||rail.knots[0][0]>st.s||rail.knots.at(-1)[0]<st.s)continue;const y=sign*interpolateKnots(rail.knots,st.s),role=NOMINAL.reduce((b,n)=>Math.abs(n[1]-y)<Math.abs(b[1]-y)?n:b)[0];if(role===mainRole||!has(role))continue;mapped.push({rail,role,base:rail.knots.map(r=>[...r])});}
  const byRole=new Map(mapped.map(m=>[m.role,m]));
  const baseOf=role=>{const m=byRole.get(role);return m?s=>interpolateKnots(m.base,s):driveAt;};
  const parentOf=t=>{if(MAINS.has(t.role))return t.role;if(PARENT[t.role]&&has(PARENT[t.role]))return PARENT[t.role];if(single)return mainRole;const mains=tracks.filter(m=>MAINS.has(m.role));return mains.length?mains.reduce((b,m)=>Math.abs(m.y-t.y)<Math.abs(b.y-t.y)?m:b).role:mainRole;};
  // A marked stop track belongs to one main: 草加's express loop is not used by locals.
  const own=(stopsHere&&tracks.find(t=>t[mark]&&parentOf(t)===mainRole))||tracks.find(t=>t.role===mainRole)||tracks[0];
  const displacement=Math.max(...tracks.map(t=>Math.abs(X(t.y)-baseOf(parentOf(t))(st.s))));
  const T=Math.max(60,Math.min(220,displacement*14)),c0=st.s+p0-30,c1=st.s+p1+30,a=Math.max(-300,c0-T),b=Math.min(L+300,c1+T);
  const w=s=>s<c0?smooth((s-(c0-T))/T):s>c1?smooth(1-(s-c1)/T):1;
  const blend=(base,y)=>s=>base(s)+(X(y)-base(s))*w(s);
  driving=resample(driving,a,b,blend(driveAt,own.y));
  for(const m of mapped){const y=tracks.find(t=>t.role===m.role).y;m.rail.knots=resample(m.rail.knots,a,b,blend(s=>interpolateKnots(m.base,s),y));}
  const opposingStop=single?tracks.find(t=>t.role===(reverse?(has('d')?'d':'M'):(has('u')?'u':'M'))):null;
  for(const t of tracks){
   if(t===own||byRole.has(t.role)&&MAINS.has(t.role))continue;
   const f=blend(baseOf(parentOf(t)),t.y),knots=[];for(let s=a;s<b;s+=10)knots.push([s,f(s)]);knots.push([b,f(b)]);
   const passing=t===opposingStop;
   neighbors.push({knots,direction:passing?'opposing':'scenery',height:0,tobuStation:true,station:st.name,role:t.role,...(passing?{passingLoop:true,trafficMain:true,mainCorridor:true}:{})});
  }
  const ownX=X(own.y),plats=platforms.map(([l,r])=>{const lo=Math.min(X(l),X(r)),hi=Math.max(X(l),X(r));return {edges:[[p0,lo,hi],[p1,lo,hi]],roof:[p1-length*spec.roof-4,p1-6],boarding:false,tobuDiagram:true};});
  const board=plats.map(p=>({p,d:Math.min(Math.abs(p.edges[0][1]-ownX),Math.abs(p.edges[0][2]-ownX))})).sort((x,y)=>x.d-y.d)[0];
  if(board&&board.d<2.2){board.p.boarding=true;doors.set(st.name,(board.p.edges[0][1]+board.p.edges[0][2])/2>ownX?'right':'left');}
  layouts[st.name]={platforms:plats,layoutSource:spec.source,diagramSection:text,stopTrack:own.role,tobuDiagram:true};
  audit.push({name:st.name,section:text,stopTrack:own.role,tracks:tracks.length,platforms:plats.length,door:doors.get(st.name)??null});
 }
 driving.sort((p,q)=>p[0]-q[0]);
 const door=st=>doors.has(st.name)?{...st,doorSide:doors.get(st.name)}:st;
 return {...route,drivingTrack:driving,neighborTracks:neighbors,stationLayouts:layouts,stations:route.stations.map(door),sceneryStations:(route.sceneryStations??route.stations).map(door),tobuStationAudit:audit};
}
