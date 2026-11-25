import {joinRoutes,sliceRoute,reverseRoute} from './service-routes.js?v=117';
const item=(route,vehicle,service,from,to,extra={})=>[route,vehicle,service,{from,to,...extra}];
const special=['東京','神田','御茶ノ水','四ツ谷','新宿','中野','三鷹','国分寺','立川'];
export const STOP_PATTERNS={
 '中央特快':special,
 '通勤特快':['東京','神田','御茶ノ水','四ツ谷','新宿','国分寺','立川','八王子','高尾'],
 '通勤快速':[...special,'荻窪','吉祥寺'],
 'ホリデー快速':['新宿','中野','三鷹','国分寺','立川','西立川','拝島','福生','青梅'],
 'おうめ':['東京','新宿','立川','拝島','河辺','青梅'],
 'はちおうじ':['東京','新宿','立川','八王子'],
 'はくば':['松本','豊科','穂高','信濃大町','白馬'],
 '信州':['塩尻','松本','田沢','明科','長野'],
 '大糸特急':['新宿','立川','八王子','大月','塩山','山梨市','石和温泉','甲府','韮崎','小淵沢','富士見','茅野','上諏訪','下諏訪','岡谷','塩尻','松本','豊科','穂高','信濃松川','信濃大町','白馬','南小谷'],
 '大糸快速':['南小谷','信濃森上','白馬','神城','簗場','信濃木崎','信濃大町'],
 'しなの':['京都','新大阪','大阪','塩尻','松本','穂高','信濃大町','神城','白馬'],
 '長野松本快速':['長野','川中島','篠ノ井','稲荷山','聖高原','坂北','西条','明科','田沢','松本'],
 'みすず':['松本','南松本','平田','村井','広丘','塩尻','みどり湖','岡谷'],
 'ナイトエクスプレス信州':['新宿','立川','八王子','松本','長野'],
 '長野快速':['上諏訪','下諏訪','岡谷','みどり湖','塩尻','広丘','村井','平田','南松本','松本','田沢','明科','西条','坂北','聖高原','冠着','姨捨','稲荷山','篠ノ井','今井','川中島','安茂里','長野']
};
import {TOBU_SCENARIOS} from './tobu-services.js?v=117';
const base={
 yamanote:[item('yamanote','e235','普通')],
 chuo:[
 item('chuo-extended','e353','特急','東京','松本'),item('chuo-extended','211','普通','高尾','松本'),item('shinonoi-extended','383','特急','長野','塩尻'),item('shinonoi-extended','211','普通','長野','塩尻'),
 item('chuo','e233','快速','東京','高尾'),item('chuo','e233','通勤特快','東京','高尾',{pattern:'通勤特快'}),item('chuo','e233','中央特快','東京','高尾',{pattern:'中央特快',beyond:'立川'}),item('chuo','e233','快速（土休日）','東京','高尾',{pattern:'holiday'}),
 item('chuo-ome','e233','青梅特快','東京','青梅',{pattern:'中央特快',beyond:'立川'}),item('chuo','e233','通勤快速','東京','高尾',{pattern:'通勤快速',beyond:'立川'}),item('chuo-ome','e233','ホリデー快速','新宿','青梅',{pattern:'ホリデー快速'}),item('chuo-extended','e233','快速','東京','大月',{pattern:'all'}),
 item('chuo','e353','特急','東京','八王子'),item('chuo-ome','e353','特急おうめ','東京','青梅',{pattern:'おうめ'}),item('itsukaichi','e233','各駅停車','拝島','武蔵五日市',{pattern:'all',carCount:6}),item('chuo-itsukaichi','e233','各駅停車','立川','武蔵五日市',{pattern:'all',carCount:6}),item('ome-okutama','e233','各駅停車','青梅','奥多摩',{pattern:'all',carCount:4}),
 item('chuo-kofu','e353','特急'),item('chuo-kofu','211','普通'),item('chuo-shinshu','e353','特急'),item('chuo-shinshu','211','普通'),item('shinonoi','383','特急'),
 item('tatsuno','211','普通','岡谷','塩尻',{pattern:'all',startTime:'10:00:00'}),item('tatsuno-nagano','211','普通みすず','辰野','長野',{pattern:'all'}),item('shinonoi-extended','211','快速','長野','松本',{pattern:'長野松本快速'}),
 item('suwa-nagano','211','快速','上諏訪','長野',{pattern:'長野快速'}),item('chuo-extended','211','快速みすず','松本','岡谷',{pattern:'みすず'}),
 item('oito','e127','普通','南小谷','信濃大町'),item('oito','211','普通','信濃大町','松本'),item('oito','e127','快速','南小谷','信濃大町',{pattern:'大糸快速',night:true,startTime:'21:23:30'}),
 item('chuo-oito','e353','特急あずさ','新宿','南小谷',{pattern:'大糸特急'}),item('chuo-oito','e353','特急あずさ','松本','白馬',{pattern:'大糸特急'}),item('chuo-oito','383','特急しなの','塩尻','白馬',{pattern:'しなの',carCount:4})],
 osaka:[item('osaka','323','普通'),item('osaka','223','関空・紀州路快速'),item('osaka','221','大和路快速')],
 tokaido:[item('tokaido','207','普通'),item('tokaido','223-1000','新快速'),item('tokaido','681','特急'),item('tokaido','221','快速'),item('tokaido','221','普通'),item('tokaido','383','特急しなの','京都','大阪',{pattern:'しなの',night:true,startTime:'18:49:30'})],
 yamagata:[item('yamagata','719-5000','普通（赤岩廃止後）','福島','米沢',{era:'closed',startTime:'08:07:30'}),...([['米沢','新庄'],['米沢','山形'],['山形','新庄']].map(([from,to])=>item('yamagata','719-5000','普通（赤岩廃止後）',from,to,{era:'closed',startTime:'10:00:00'}))),item('yamagata','719-5000','普通（赤岩停車・休止前）','福島','米沢',{era:'active',startTime:'08:07:30'}),item('yamagata','719-5000','普通（赤岩通過・休止中）','庭坂','板谷',{era:'suspended',startTime:'08:16:30'})],
 tohoku:[item('tohoku','701','普通')],yagan:[item('yagan','6050','普通')],toho:['toho','toho-village','toho-center'].flatMap(id=>['6050','211'].map(v=>item(id,v,'普通',undefined,undefined,{pattern:'all',startTime:'09:00:00'})))
};
// These numbers refer to the original catalog, before removal or display sorting.
const removedChuo=new Set([43,44,45,46,48,52,53,60]);
function reviseChuo(entries){
 const revised=entries.flatMap((entry,i)=>{
  const number=i+1,reverse=!!entry[3].reverse;
  if(removedChuo.has(number))return [];
  if(number===25||number===26)return [item('chuo','e353','特急はちおうじ','東京','八王子',{pattern:'はちおうじ',reverse})];
  if(number===39||number===40)return [item('shinonoi-extended','e353','特急信州','塩尻','長野',{pattern:'信州',reverse})];
  if(number===54)return [item('tatsuno-nagano','211','快速みすず','松本','辰野',{pattern:'all'})];
  if(number===63||number===64)return [item('chuo-oito','e353','特急はくば','松本','白馬',{pattern:'はくば',reverse})];
  return [entry];
 });
 // Stable order retains the identities/progress of every unchanged service.
 return [...revised.filter(x=>x[1]==='e233'),...revised.filter(x=>x[1]!=='e233'),...([3,6].flatMap(carCount=>[false,true].map(reverse=>item('chuo-extended','e131','普通','高尾','松本',{pattern:'all',reverse,carCount})))),
  // Added after the existing entries so earlier service numbers and progress keep their identity.
  ...[3,6].flatMap(carCount=>[false,true].map(reverse=>item('shinonoi-extended','e131','普通','長野','松本',{pattern:'all',reverse,carCount}))),
  item('chuo-nagano','e257-5000','ナイトエクスプレス信州','新宿','長野',{pattern:'ナイトエクスプレス信州',night:true,carCount:9})];
}
export const serviceChoices=Object.fromEntries(Object.entries(base).map(([line,entries])=>{
 if(line==='yagan')return [line,TOBU_SCENARIOS.map(s=>s.preserveExistingSchedule?[s.routeId,s.vehicle,s.service,s.number===16?{reverse:true}:{}]:[s.routeId,s.vehicle,s.service,{from:s.start,to:s.end,pattern:'all',carCount:s.carCount,tobuScenario:s.id}])];
 const paired=entries.flatMap(entry=>[entry,[...entry.slice(0,3),{...entry[3],reverse:true,...(line==='tokaido'&&entry[1]==='383'?{night:false,startTime:'08:57:30'}:{})}]]);
 return [line,line==='chuo'?reviseChuo(paired):paired];
}));
export function buildConnectingRoutes(routes){
 const chuo=routes.get('chuo-extended'),oito=routes.get('oito'),shinonoi=routes.get('shinonoi-extended'),ome=routes.get('ome');
 const result=new Map([
 ...(routes.has('tatsuno')?[['tatsuno-nagano',joinRoutes([reverseRoute(sliceRoute(routes.get('tatsuno'),'岡谷','辰野'),{switchTrack:false}),sliceRoute(chuo,'岡谷','松本'),reverseRoute(sliceRoute(shinonoi,'長野','松本'),{switchTrack:false})],'tatsuno-nagano','辰野支線・中央線・篠ノ井線')]]:[]),
 ['chuo-itsukaichi',joinRoutes([sliceRoute(ome,'立川','拝島'),routes.get('itsukaichi')],'chuo-itsukaichi','青梅線・五日市線')],
 ['chuo-ome',joinRoutes([sliceRoute(chuo,'東京','立川'),ome],'chuo-ome','中央線・青梅線')],
 ['chuo-oito',joinRoutes([chuo,reverseRoute(oito,{switchTrack:false})],'chuo-oito','中央線・大糸線')],
 ['chuo-nagano',joinRoutes([sliceRoute(chuo,'新宿','松本'),reverseRoute(sliceRoute(shinonoi,'長野','松本'),{switchTrack:false})],'chuo-nagano','中央線・篠ノ井線')],
 ['suwa-nagano',joinRoutes([sliceRoute(chuo,'上諏訪','松本'),reverseRoute(sliceRoute(shinonoi,'長野','松本'),{switchTrack:false})],'suwa-nagano','中央線・篠ノ井線・信越本線')]
 ]);return result;
}
