// Scenario facts and published minute anchors. Missing clocks are deliberately
// absent: the simulator plans these legs and must label them as estimates.
export const TOBU_SOURCES={
 current:{date:'2026-03-14',url:'https://www.tobu.co.jp/pdf/railway/timetable_nikko_down.pdf',title:'東武鉄道 日光線特急接続時刻表・下り'},
 liberty156:{date:'2022-03-12',url:'https://www.tobu.co.jp/cms-pdf/releases/20211210120436z2ZpUL2macF_-vcgP5S43w.pdf',title:'東武鉄道 2022年3月ダイヤ改正・特急運転時刻'},
 historic2021:{date:'2021-03-13',url:'https://web.archive.org/web/20210921021924/http://www.aizutetsudo.jp/wp/wp-content/uploads/2021/03/timetable_20210313_asakusa.pdf',title:'会津鉄道 2021年3月13日改正時刻表',note:'150号（1150列車）の掲載時刻を採用。野岩・東武鬼怒川線は主要駅のみ掲載。'},
 rapid2016:{date:'2016-03-22',url:'https://web.archive.org/web/20160322142758/http://www.aizutetsudo.jp/ekilist/tt_all.pdf',title:'会津鉄道 2016年時刻表・上り156列車'},
 semi2006:{date:'2006-03-18',url:'https://web.archive.org/web/20070821104704/http://www.tobu.co.jp/yagan/time-n4.htm',title:'東武鉄道 ほっとスパ・ライン 上り4ページ',note:'ユーザー提供の保存HTML。会津鬼怒川線以外は主要駅のみ掲載。'},
 express:{date:'2026-11-18',url:'https://transfer.navitime.biz/tokyu/pc/diagram/TrainRouteTimetable?day=18&hour=07&kind=%E6%9D%B1%E6%AD%A6%E6%97%A5%E5%85%89%E7%B7%9A%E6%80%A5%E8%A1%8C&minutes=03&month=11&posType=1&rrCd=00000809&stCd=00007072&trCd=81bd00e1&updown=1&year=2026',title:'東急電鉄 07:03南栗橋発 東武日光行 急行停車駅'},
 ekitanSectionExpress:{date:'2026-11-26',url:'https://ekitan.com/timetable/railway/train?sf=1491&tx=1390100-1873-2501&dw=&dt=20261126&departure=0511&SFF=212-0&d=1',title:'駅探 浅草05:11発 区間急行 館林行'},
 ekitanLocalAsakusa:{date:'2026-11-26',url:'https://ekitan.com/timetable/railway/train?sf=1491&tx=1390100-1549-809&dw=&dt=20261126&departure=0801&SFF=212-0&d=1',title:'駅探 浅草08:01発 普通 北千住行'},
 ekitanLocalKitasenju:{date:'2026-11-26',url:'https://ekitan.com/timetable/railway/train?sf=1958&tx=1390100-1508-601&dw=&dt=20261126&departure=0524&SFF=212-7&d=2',title:'駅探 北千住05:24発 普通 南栗橋行'}
};
const row=(name,arrival=null,departure=null)=>({name,arrival,departure});
const schedule=(trainNumber,source,rows)=>({trainNumber,source,rows});
export const TOBU_TIMETABLES={
 liberty150Historic:schedule('リバティ会津150号（1150列車）',TOBU_SOURCES.historic2021,[row('会津田島',null,'17:49'),row('中荒井',null,'17:53'),row('会津荒海',null,'17:57'),row('会津山村道場',null,'17:59'),row('七ヶ岳登山口',null,'18:03'),row('会津高原尾瀬口','18:09','18:09'),row('上三依塩原温泉口','18:19'),row('湯西川温泉','18:31'),row('川治湯元','18:35'),row('新藤原','18:44','18:46'),row('鬼怒川温泉','18:54','18:55'),row('下今市','19:18')]),
 liberty101:schedule('リバティ会津101号',TOBU_SOURCES.current,[row('浅草',null,'06:30'),row('とうきょうスカイツリー',null,'06:33'),row('北千住','06:42','06:43'),row('春日部',null,'07:04'),row('板倉東洋大前',null,'07:26'),row('栃木','07:39','07:42'),row('新鹿沼','07:56'),row('下今市','08:13','08:17'),row('新高徳','08:29'),row('東武ワールドスクウェア','08:34'),row('鬼怒川温泉','08:37','08:38'),row('鬼怒川公園','08:42'),row('新藤原','08:46','08:48'),row('龍王峡','08:50'),row('川治湯元','08:56'),row('湯西川温泉','09:01'),row('中三依温泉','09:08'),row('上三依塩原温泉口','09:13'),row('会津高原尾瀬口','09:23'),row('会津田島','09:42')]),
 // The official 2022 release verifies the endpoints, not every intermediate clock.
 liberty156:schedule('リバティ会津156号',TOBU_SOURCES.liberty156,[row('会津田島',null,'17:48'),row('浅草','21:05')]),
 sectionRapid156:schedule('区間快速156列車',TOBU_SOURCES.rapid2016,[row('会津田島',null,'16:00'),row('中荒井',null,'16:04'),row('会津荒海',null,'16:11'),row('会津山村道場',null,'16:13'),row('七ヶ岳登山口',null,'16:17'),row('会津高原尾瀬口','16:22','16:23'),row('上三依塩原温泉口','16:33'),row('湯西川温泉','16:48'),row('川治湯元','16:52'),row('新藤原','17:02','17:05'),row('鬼怒川温泉','17:13','17:27'),row('下今市','17:56','17:59'),row('新鹿沼','18:22'),row('新栃木','18:43'),row('栃木','18:47'),row('東武動物公園','19:24'),row('春日部','19:30'),row('北千住','19:53'),row('とうきょうスカイツリー','20:01'),row('浅草','20:05')]),
 sectionExpress350:schedule('区間急行350列車',TOBU_SOURCES.semi2006,[row('会津田島',null,'18:08'),row('会津高原尾瀬口','18:29','18:31'),row('男鹿高原',null,'18:37'),row('上三依塩原温泉口',null,'18:42'),row('中三依温泉',null,'18:47'),row('湯西川温泉',null,'18:54'),row('川治湯元',null,'18:59'),row('川治温泉',null,'19:01'),row('龍王峡',null,'19:05'),row('新藤原','19:07','19:08'),row('鬼怒川公園',null,'19:13'),row('鬼怒川温泉','19:17','19:25'),row('新高徳',null,'19:44'),row('下今市','19:59','20:05'),row('新鹿沼',null,'20:28'),row('新栃木',null,'20:49'),row('栃木',null,'20:53'),row('新大平下',null,'20:57'),row('板倉東洋大前',null,'21:11'),row('東武動物公園','21:49'),row('春日部','21:54'),row('北千住','22:24'),row('浅草','22:40')]),
 // 駅探(2026-11-26)。始発時刻と停車時分の参考にする。区間急行は館林行のため東武動物公園まで。
 ekitanSectionExpress:schedule('浅草05:11発 区間急行',TOBU_SOURCES.ekitanSectionExpress,[row('浅草',null,'05:11'),row('とうきょうスカイツリー','05:14','05:15'),row('曳舟','05:17','05:20'),row('東向島','05:22','05:22'),row('鐘ケ淵','05:24','05:24'),row('堀切','05:26','05:26'),row('牛田','05:27','05:28'),row('北千住','05:29','05:30'),row('西新井','05:35','05:35'),row('草加','05:41','05:41'),row('新越谷','05:46','05:47'),row('越谷','05:48','05:49'),row('せんげん台','05:54','05:54'),row('春日部','05:59','06:00'),row('東武動物公園','06:05','06:05')]),
 ekitanLocalAsakusa:schedule('浅草08:01発 普通',TOBU_SOURCES.ekitanLocalAsakusa,[row('浅草',null,'08:01'),row('とうきょうスカイツリー','08:04','08:05'),row('曳舟','08:07','08:09'),row('東向島','08:11','08:11'),row('鐘ケ淵','08:13','08:13'),row('堀切','08:15','08:15'),row('牛田','08:16','08:17'),row('北千住','08:19',null)]),
 ekitanLocalKitasenju:schedule('北千住05:24発 普通',TOBU_SOURCES.ekitanLocalKitasenju,[row('北千住',null,'05:24'),row('小菅','05:26','05:26'),row('五反野','05:28','05:28'),row('梅島','05:30','05:30'),row('西新井','05:31','05:32'),row('竹ノ塚','05:34','05:35'),row('谷塚','05:38','05:38'),row('草加','05:40','05:41'),row('獨協大学前','05:43','05:44'),row('新田','05:45','05:46'),row('蒲生','05:47','05:48'),row('新越谷','05:49','05:50'),row('越谷','05:51','05:52'),row('北越谷','05:54','05:58'),row('大袋','06:01','06:01'),row('せんげん台','06:03','06:03'),row('武里','06:05','06:05'),row('一ノ割','06:07','06:07'),row('春日部','06:10','06:10'),row('北春日部','06:12','06:13'),row('姫宮','06:14','06:15'),row('東武動物公園','06:18','06:21'),row('杉戸高野台','06:24','06:24'),row('幸手','06:27','06:27'),row('南栗橋','06:31',null)]),
 nikkoExpress:schedule('南栗橋07:03発 急行',TOBU_SOURCES.express,[row('南栗橋',null,'07:03'),row('栗橋','07:06'),row('板倉東洋大前','07:17'),row('新大平下','07:28'),row('栃木','07:32'),row('新栃木','07:36'),row('新鹿沼','07:52'),row('下今市','08:10'),row('東武日光','08:18')])
};
const limitedSouth=['浅草','とうきょうスカイツリー','北千住','春日部','板倉東洋大前','栃木','新鹿沼','下今市'];
const limitedNorth=['新高徳','東武ワールドスクウェア','鬼怒川温泉','鬼怒川公園','新藤原','龍王峡','川治湯元','湯西川温泉','中三依温泉','上三依塩原温泉口','会津高原尾瀬口','会津田島'];
const expressSouth=['浅草','とうきょうスカイツリー','曳舟','北千住','西新井','草加','新越谷','越谷','せんげん台','春日部','東武動物公園'];
// 現行の区間急行は浅草〜北千住を各駅に停車(駅探 2026-11-26 浅草05:11発)
const expressSouthCurrent=[...expressSouth,'東向島','鐘ケ淵','鐘ヶ淵','堀切','牛田'];
const rapidSouth=['浅草','とうきょうスカイツリー','北千住','春日部','東武動物公園','栃木','新栃木','新鹿沼','下今市'];
const make=(number,id,start,end,vehicle,service,extra={})=>({number,id,routeId:'tobu-aizu',start,end,vehicle,service,carCount:vehicle==='500'?3:vehicle==='10030'?6:vehicle==='70000'?7:vehicle==='20400'?4:2,timetableStatus:'estimated',...extra});
export const TOBU_SCENARIOS=[
 make(1,'tobu-liberty101','浅草','会津田島','500','特急リバティ会津101号',{schedule:'liberty101',stopRule:'liberty',timetableStatus:'published-anchors'}),
 make(2,'tobu-liberty156','会津田島','浅草','500','特急リバティ会津156号',{schedule:'liberty156',stopRule:'liberty',timetableStatus:'published-endpoints'}),
 make(3,'tobu-liberty150-historic','会津田島','下今市','500','特急リバティ会津150号',{stopRule:'all',schedule:'liberty150Historic',timetableStatus:'published-anchors',source:TOBU_SOURCES.historic2021,era:'2021年3月13日改正',note:'2022年3月改正前の150号。指定に従い全駅停車。資料に時刻がない中間駅は推定。'}),
 make(4,'tobu-local-asakusa','浅草','北千住','10030','普通',{stopRule:'all',schedule:'ekitanLocalAsakusa'}),
 make(5,'tobu-local-hibiya','北千住','南栗橋','70000','普通',{stopRule:'all',schedule:'ekitanLocalKitasenju',platform:'3階・日比谷線6番線',originPlatform:{level:3,number:6,line:'日比谷線'}}),
 make(6,'tobu-section-express-down','浅草','南栗橋','10030','区間急行',{stopRule:'section-express',schedule:'ekitanSectionExpress'}),
 make(7,'tobu-section-express-up','南栗橋','浅草','10030','区間急行',{stopRule:'section-express'}),
 make(8,'tobu-rapid-down','浅草','会津田島','6050','快速',{stopRule:'rapid',carCount:6,era:'快速運転当時',formationChanges:[{station:'下今市',carCount:4},{station:'新藤原',carCount:2}]}),
 make(9,'tobu-section-rapid-up','会津田島','浅草','6050','区間快速',{stopRule:'section-rapid-2016',schedule:'sectionRapid156',timetableStatus:'published-anchors',era:'2016年',formationChanges:[{station:'新藤原',carCount:4},{station:'下今市',carCount:6}]}),
 make(10,'tobu-nikko-local-down','南栗橋','東武日光','20400','普通',{routeId:'tobu-nikko',stopRule:'all'}),
 make(11,'tobu-nikko-local-up','東武日光','南栗橋','20400','普通',{routeId:'tobu-nikko',stopRule:'all'}),
 make(12,'tobu-nikko-express','南栗橋','東武日光','20400','急行',{routeId:'tobu-nikko',stopRule:'nikko-express',schedule:'nikkoExpress',timetableStatus:'published-anchors'}),
 make(13,'tobu-kinugawa-local-down','下今市','新藤原','20400','普通',{stopRule:'all'}),
 make(14,'tobu-kinugawa-local-up','新藤原','下今市','20400','普通',{stopRule:'all'}),
 make(15,'tobu-yagan-local-down','新藤原','会津高原尾瀬口','6050','普通',{routeId:'yagan',stopRule:'all',preserveExistingSchedule:true}),
 make(16,'tobu-yagan-local-up','会津高原尾瀬口','新藤原','6050','普通',{routeId:'yagan',stopRule:'all',preserveExistingSchedule:true}),
 make(17,'tobu-aizu-local-down','下今市','会津田島','6050','普通',{stopRule:'all'}),
 make(18,'tobu-aizu-local-up','会津田島','下今市','6050','普通',{stopRule:'all'}),
 make(19,'tobu-section-express-aizu','会津田島','浅草','6050','区間急行',{stopRule:'section-express-2006',schedule:'sectionExpress350',timetableStatus:'published-anchors',era:'2006年3月18日改正'}),
 make(20,'tobu-section-rapid-aizu-down','鬼怒川温泉','会津田島','6050','区間快速',{stopRule:'all',era:'2021年3月13日改正',note:'北部区間の区間快速は各駅停車。時刻は推定。'}),
 make(21,'tobu-section-rapid-aizu-up','会津田島','鬼怒川温泉','6050','区間快速',{stopRule:'all',era:'2021年3月13日改正',note:'北部区間の区間快速は各駅停車。時刻は推定。'})
];
const seconds=t=>t==null?null:t.split(':').reduce((n,v)=>n*60+Number(v),0)*60;
export function tobuScenarioById(id){return TOBU_SCENARIOS.find(x=>x.id===id||x.number===id);}
export function tobuStopNames(scenario,all){
 const names=all.map(s=>typeof s==='string'?s:s.name),rule=scenario.stopRule;
 if(rule==='all')return names;
 const index=name=>names.indexOf(name),between=(name,a,b)=>{const n=index(name),x=index(a),y=index(b);return n>=0&&x>=0&&y>=0&&n>=Math.min(x,y)&&n<=Math.max(x,y);};
 return names.filter(name=>{
  if(name===scenario.start||name===scenario.end)return true;
  if(rule==='liberty')return [...limitedSouth,...limitedNorth].includes(name);
  if(rule==='nikko-express')return TOBU_TIMETABLES.nikkoExpress.rows.some(r=>r.name===name);
  if(rule==='section-express'||rule==='section-express-2006')return (rule==='section-express'?expressSouthCurrent:expressSouth).includes(name)||between(name,'東武動物公園',scenario.end==='浅草'?scenario.start:scenario.end);
  if(rule==='rapid')return rapidSouth.includes(name)||between(name,'下今市','会津田島');
  if(rule==='section-rapid-2016')return rapidSouth.includes(name)||between(name,'新大平下','会津田島');
  return false;
 });
}
// Apply after slicing/reversing the corridor, before the existing timetable
// resolver. This function never invents an intermediate published clock.
export function applyTobuScenario(route,id){
 const scenario=typeof id==='object'?id:tobuScenarioById(id);if(!scenario)return route;
 const all=route.sceneryStations??route.stations;
 if(!all?.length)return route;
 if(all[0].name!==scenario.start||all.at(-1).name!==scenario.end)throw new Error('Tobu scenario endpoints must match the sliced route');
 const book=TOBU_TIMETABLES[scenario.schedule],byName=new Map(book?.rows.map(r=>[r.name,r])??[]),names=new Set(tobuStopNames(scenario,all));
 // 参考時刻表(公開時刻・駅探)からは始発駅の発車時刻と、1分以上の停車時分だけを使う。
 // 駅間の時間は planning-profile.js の区間別運転速度(tobuCruiseKmh)で計画し、余裕のあるダイヤにする。
 const tobuDwells={};
 const scenery=all.map(st=>{
  const next={...st};if(!scenario.preserveExistingSchedule)for(const k of ['time','arrival','departure','startTime','passTime'])delete next[k];
  const r=byName.get(st.name);
  if(r&&!scenario.preserveExistingSchedule){
   if(st.name===scenario.start&&r.departure!=null){next.departure=seconds(r.departure);next.startTime=next.departure-30;}
   else if(r.arrival!=null&&r.departure!=null){const d=seconds(r.departure)-seconds(r.arrival);if(d>=60)tobuDwells[st.s]=d>=120?d:40;}
  }
  return next;
 });
 const stations=scenery.filter(s=>names.has(s.name));
 return {...route,stations,sceneryStations:scenery,tobuDwells,service:scenario.service,scenarioId:scenario.id,tobuScenario:scenario,originPlatform:scenario.originPlatform??null,publishedSchedule:book?{id:scenario.schedule,title:book.trainNumber,url:book.source.url,date:book.source.date,estimated:true,coverage:scenario.timetableStatus,note:'始発時刻と停車時分は掲載時刻を参考にし、駅間は区間別の運転速度で計画した推定ダイヤ。'}:scenario.preserveExistingSchedule?route.publishedSchedule:{id:scenario.id,title:scenario.service,url:null,estimated:true,coverage:'estimated',note:scenario.note??'実在列車の運転時刻は未確認。運転時刻はシミュレーター推定。'}};
}
