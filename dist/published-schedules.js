// Published minute anchors; seconds and intermediate passing times are simulated.
const book=(id,rows,url)=>({id,rows:rows.map(([name,arrival,departure])=>({name,arrival,departure})),url});
export const SCHEDULES={
 oumeDown:book('おうめ1号（5301M）',[
 ['東京',null,'18:30'],['新宿',null,'18:45'],['立川','19:17'],['拝島','19:30'],['河辺','19:45'],['青梅','19:52']],null),
 oumeUp:book('おうめ2号（5302M）',[
 ['青梅',null,'06:18'],['河辺',null,'06:22'],['拝島',null,'06:33'],['立川',null,'06:45'],['新宿','07:17'],['東京','07:32']],null),
 hachiojiDown:book('はちおうじ1号（5201M）',[
 ['東京',null,'18:00'],['新宿',null,'18:15'],['立川','18:45'],['八王子','18:54']],null),
 hachiojiUp:book('はちおうじ2号（5202M）',[
 ['八王子',null,'06:28'],['立川',null,'06:38'],['新宿','07:05'],['東京','07:19']],null),
 hakubaDown:book('はくば1号（8041M）',[
 ['松本',null,'13:41'],['豊科','13:55','13:55'],['穂高','14:00','14:00'],['信濃大町','14:20','14:20'],['白馬','14:46']], 'https://timetables.jreast.co.jp/2611/train/110/112901.html'),
 hakubaUp:book('はくば2号（8042M）',[
 ['白馬',null,'15:21'],['信濃大町','15:47','15:48'],['穂高','16:03','16:04'],['豊科','16:08','16:09'],['松本','16:21']], 'https://timetables.jreast.co.jp/2611/train/110/112911.html'),
 shinshuDown:book('信州1号（8091M）',[
 ['塩尻',null,'06:58'],['松本',null,'07:10'],['田沢',null,'07:18'],['明科',null,'07:24'],['長野','08:09']], 'https://timetables.jreast.co.jp/2611/train/090/094611.html'),
 shinshuUp:book('信州2号（8092M）',[
 ['長野',null,'20:47'],['明科','21:35','21:36'],['田沢','21:41','21:42'],['松本','21:50','21:52'],['塩尻','22:02']], 'https://timetables.jreast.co.jp/2611/train/095/099331.html'),
 rapidMisuzu:book('快速みすず（松本→辰野）',[
 ['松本',null,'16:36'],['南松本','16:39','16:39'],['平田','16:41','16:42'],['村井','16:44','16:45'],['広丘','16:48','16:48'],['塩尻','16:52','16:53'],['みどり湖','16:57','16:57'],['岡谷','17:04','17:09'],['川岸','17:13','17:14'],['辰野','17:20']],null),
 azusa41:book('あずさ41号',[
 ['東京',null,'16:45'],['新宿','16:58','17:00'],['立川','17:23','17:24'],['八王子','17:32','17:33'],['甲府','18:28','18:29'],['韮崎','18:37','18:38'],['小淵沢','18:54','18:55'],['富士見','19:01','19:01'],['茅野','19:10','19:10'],['上諏訪','19:15','19:16'],['下諏訪','19:19','19:20'],['岡谷','19:23','19:24'],['塩尻','19:31','19:32'],['松本','19:41']], 'https://timetables.jreast.co.jp/2611/train/060/063971.html'),
 azusa4:book('あずさ4号',[
 ['松本',null,'06:30'],['塩尻','06:38','06:38'],['岡谷','06:45','06:46'],['下諏訪','06:49','06:50'],['上諏訪','06:53','06:54'],['茅野','06:59','07:00'],['富士見','07:08','07:08'],['小淵沢','07:14','07:15'],['韮崎','07:31','07:31'],['甲府','07:39','07:40'],['八王子','08:34','08:35'],['立川','08:43','08:44'],['新宿','09:14','09:15'],['東京','09:29']], 'https://timetables.jreast.co.jp/2611/train/060/063831.html'),
 shinano5:book('しなの5号',[
 ['塩尻',null,'10:55'],['松本','11:05','11:06'],['篠ノ井','11:51','11:51'],['長野','11:59']], 'https://timetables.jreast.co.jp/2611/train/015/019971.html'),
 shinanoMorning:book('しなの・京都方面',[
 ['大阪',null,'08:58'],['新大阪','09:01','09:02'],['京都','09:24']],null),
 shinanoEvening:book('しなの・大阪方面',[
 ['京都',null,'18:50'],['新大阪','19:13','19:14'],['大阪','19:18']],null),
 misuzu:book('みすず',[
 ['辰野',null,'07:47'],['川岸','07:54','07:54'],['岡谷','07:59','08:08'],['みどり湖','08:15','08:15'],['塩尻','08:19','08:21'],['広丘','08:25','08:25'],['村井','08:28','08:28'],['平田','08:31','08:31'],['南松本','08:34','08:34'],['松本','08:38','08:40'],['田沢','08:48','08:48'],['明科','08:54','08:54'],['西条','09:02','09:02'],['坂北','09:06','09:07'],['聖高原','09:11','09:12'],['冠着','09:16','09:23'],['姨捨','09:29','09:30'],['稲荷山','09:39','09:40'],['篠ノ井','09:44','09:45'],['今井','09:47','09:48'],['川中島','09:50','09:51'],['安茂里','09:53','09:53'],['長野','09:58']], 'https://timetables.jreast.co.jp/2611/train/130/131531.html'),
 // 0時以降は24時台として続け、時刻が逆戻りしないようにする
 nightShinshu:book('ナイトエクスプレス信州',[
 ['新宿',null,'23:58'],['立川','24:34','24:35'],['八王子','24:45','24:46'],['松本','28:46','28:48'],['長野','29:40']],null),
 rapid2530:book('快速2530M',[
 ['長野',null,'06:54'],['川中島','06:59','07:00'],['篠ノ井','07:05','07:05'],['稲荷山','07:09','07:10'],['聖高原','07:25','07:26'],['坂北','07:30','07:33'],['西条','07:37','07:37'],['明科','07:44','07:45'],['田沢','07:51','07:52'],['松本','08:01']], 'https://timetables.jreast.co.jp/2611/train/025/027811.html')
};
const seconds=value=>value==null?null:Number.isFinite(value)?value:value.split(':').reduce((n,x)=>n*60+Number(x),0)*(value.split(':').length===2?60:1);
// Preserve the supplied minute while allowing the actual model to accelerate,
// brake and open its doors between these short station intervals.
const arrivalSeconds={misuzu:{'今井':10,'川中島':15,'安茂里':15},rapidMisuzu:{'平田':40,'村井':15}};
function reverseBook(source,departure){
 const start=seconds(departure),origin=seconds(source.rows.at(-1).arrival),rows=source.rows.toReversed().map((row,i,all)=>({name:row.name,arrival:i===0?null:start+origin-seconds(row.departure??row.arrival),departure:i===all.length-1?null:start+origin-seconds(row.arrival??row.departure)}));
 return {id:source.id+'・逆方向（推定）',rows,url:null,estimated:true};
}
SCHEDULES.shinanoReverse=reverseBook(SCHEDULES.shinano5,'12:10');
SCHEDULES.rapidReverse=reverseBook(SCHEDULES.rapid2530,'08:15');
SCHEDULES.misuzuReverse=reverseBook(SCHEDULES.misuzu,'14:00');
const chuoOrder=['東京','神田','御茶ノ水','四ツ谷','新宿','中野','三鷹','立川','八王子','高尾','大月','甲府','韮崎','小淵沢','富士見','茅野','上諏訪','下諏訪','岡谷','みどり湖','塩尻','松本'];
export function applyPublishedSchedule(route,vehicle,service){
 const all=route.sceneryStations??route.stations,first=all[0]?.name,last=all.at(-1)?.name;
 let key=null;
 if(route.id==='tokaido'&&vehicle==='383')key=first==='大阪'?'shinanoMorning':'shinanoEvening';
 else if(service==='特急おうめ')key=first==='東京'?'oumeDown':'oumeUp';
 else if(service==='特急はちおうじ')key=first==='東京'?'hachiojiDown':'hachiojiUp';
 else if(service==='特急はくば')key=first==='松本'?'hakubaDown':'hakubaUp';
 else if(service==='ナイトエクスプレス信州')key='nightShinshu';
 else if(service==='特急信州')key=first==='塩尻'?'shinshuDown':'shinshuUp';
 else if(route.id==='tatsuno-nagano')key=service==='快速みすず'?'rapidMisuzu':first==='辰野'?'misuzu':'misuzuReverse';
 else if(route.id==='chuo-extended'&&vehicle==='211'&&service==='快速みすず')key=first==='岡谷'?'misuzu':'misuzuReverse';
 else if(route.id==='shinonoi-extended'&&vehicle==='211'&&service==='快速'&&[first,last].includes('松本'))key=first==='長野'?'rapid2530':'rapidReverse';
 else if(route.id.startsWith('shinonoi')&&vehicle==='383')key=first==='塩尻'?'shinano5':'shinanoReverse';
 else if(['chuo','chuo-extended','chuo-kofu','chuo-shinshu'].includes(route.id)&&vehicle==='e353'&&service==='特急'){
  const a=SCHEDULES.azusa41.rows.findIndex(x=>x.name===first),b=SCHEDULES.azusa41.rows.findIndex(x=>x.name===last);
  // Also infer direction for BVE partial sections whose boundary is a passing station.
  const ranked=all.map(x=>chuoOrder.indexOf(x.name)).filter(x=>x>=0);
  key=(a>=0&&b>=0)?(a<b?'azusa41':'azusa4'):ranked[0]<ranked.at(-1)?'azusa41':'azusa4';
 }
 if(!key)return route;
 const source=SCHEDULES[key],byName=new Map(source.rows.map(x=>[x.name,x])),names=new Set(byName.keys());
 const clean=st=>{
  const result={...st};for(const k of ['time','arrival','departure','startTime','passTime'])delete result[k];
  const row=byName.get(st.name);
  if(row){
   const offset=arrivalSeconds[key]?.[st.name]??0;
   if(row.arrival!=null)result.arrival=seconds(row.arrival)+offset;
   if(row.departure!=null)result.departure=seconds(row.departure)+(row.arrival===row.departure?25+offset:0);
   // A departure-only intermediate stop still anchors the incoming run, and
   // an arrival-only stop needs enough time for doors before its outgoing run.
   if(st.name!==first&&result.arrival==null&&result.departure!=null)result.arrival=result.departure-25;
   if(st.name!==last&&result.departure==null&&result.arrival!=null)result.departure=result.arrival+25;
  }
  return result;
 };
 const scenery=all.map(clean),stops=scenery.filter((st,i)=>i===0||i===scenery.length-1||names.has(st.name));
 if(stops[0].departure!=null)stops[0].startTime=stops[0].departure-30;
 const night=key==='shinanoEvening'||['oumeDown','hachiojiDown','shinshuUp','nightShinshu'].includes(key);
 return {...route,stations:stops,sceneryStations:scenery,publishedSchedule:{id:key,title:source.id,url:source.url,estimated:!!source.estimated},night};
}
// Use published stops as anchors. Solve each complete leg, including all passing
// stations, so an intermediate checkpoint cannot force a catch-up acceleration.
export function resolvePublishedSchedule(route,startS,spec,planSection){
 const stops=route.stations,all=(route.sceneryStations??stops).filter(st=>!st.displayOnly).map(st=>({...st,id:st.name+':'+st.s,stop:stops.some(x=>Math.abs(x.s-st.s)<.5),time:null,estimated:st.arrival==null}));
 const departureTimes={},adjustments=[];spec={...spec,departureTimes};
 const first=all[0];first.time=first.startTime??(first.departure!=null?first.departure-30:first.arrival??null);
 if(first.time==null){
  const next=all.findIndex(x=>x.arrival!=null);let duration=0,v=0;
  for(let i=1;i<=next;i++){const plan=planSection({...all[i-1],time:0}, {...all[i],time:null},route.limits??[],{...spec,maxSpeedKmh:(spec.maxSpeedKmh??110)*.9,departureTimes:{[all[i-1].s]:0}},v);duration+=plan.duration;v=plan.speeds.at(-1);}
  first.time=next>0?all[next].arrival-duration-30:9*3600;first.departure=first.time+30;
 }
 let at=0,carry=0;
 for(let end=1;end<all.length;end++){
  const anchor=all[end];if(anchor.arrival==null&&end!==all.length-1)continue;
  const a=all[at],desiredDeparture=a.departure??a.time+(a.stop?25:0),departure=Math.max(desiredDeparture,a.time+(a.stop?23:0));departureTimes[a.s]=departure;
  const target=anchor.arrival;
  const calculate=factor=>{let t=departure,v=carry;const times=[],speeds=[],departures={};for(let i=at+1;i<=end;i++){
   if(route.tobuScenario&&i-1>at&&all[i-1].stop){t=Math.max(t+25,all[i-1].departure??-Infinity);departures[all[i-1].s]=t;}
   const prior={...all[i-1],time:t,stop:i-1===at?all[i-1].stop:false},next={...all[i],time:null},plan=planSection(prior,next,route.limits??[],{...spec,departureTimes:{[prior.s]:t},maxSpeedKmh:(spec.maxSpeedKmh??110)*factor},v);
   t+=plan.duration;v=plan.speeds.at(-1);times.push(t);speeds.push(v);
  }return {time:t,times,speeds,departures};};
  const fastest=calculate(1);let result=fastest;
  if(target!=null&&target>fastest.time){let lo=.1,hi=1;for(let j=0;j<25;j++){const mid=(lo+hi)/2;if(calculate(mid).time>target)lo=mid;else hi=mid;}result=calculate(hi);}
  else if(target!=null&&fastest.time>target+1)adjustments.push({station:anchor.name,published:target,adjusted:Math.ceil(fastest.time),seconds:Math.ceil(fastest.time-target)});
  for(let i=at+1;i<=end;i++){all[i].time=result.times[i-at-1];if(all[i].arrival!=null&&Math.abs(all[i].time-all[i].arrival)>1)all[i].adjusted=true;}
  Object.assign(departureTimes,result.departures);carry=result.speeds.at(-1);at=end;
 }
 // Starting at an intermediate station uses that station's own departure window.
 const selected=all.find(x=>Math.abs(x.s-startS)<.5);const clockStart=selected?.departure!=null?Math.max(selected.time,selected.departure-30):selected?.time??first.time;
 all.planningSpec=spec;return {clockStart,timetable:all,planningSpec:spec,anchored:true,adjustments};
}
export function scheduledBoardingDelay(state,route){
 if(!route.publishedSchedule||state.cheatUsed)return 0;
 const st=route.stations[state.startingDeparture?state.startIndex:state.next],departure=state.scoreVehicleSpec?.departureTimes?.[st?.s];
 return Number.isFinite(departure)?Math.max(0,departure-5-((state.clockStart??0)+state.elapsed)):0;
}
