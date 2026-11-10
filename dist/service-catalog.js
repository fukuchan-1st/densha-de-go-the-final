import {joinRoutes,sliceRoute,reverseRoute} from './service-routes.js?v=traffic64';
const item=(route,vehicle,service,from,to,extra={})=>[route,vehicle,service,{from,to,...extra}];
const special=['東京','神田','御茶ノ水','四ツ谷','新宿','中野','三鷹','国分寺','立川'];
export const STOP_PATTERNS={
 '中央特快':special,
 '通勤特快':['東京','神田','御茶ノ水','四ツ谷','新宿','国分寺','立川','八王子','高尾'],
 '通勤快速':[...special,'荻窪','吉祥寺'],
 'ホリデー快速':['新宿','中野','三鷹','国分寺','立川','西立川','拝島','福生','青梅'],
 'おうめ':['東京','新宿','立川','拝島','河辺','青梅'],
 '大糸特急':['新宿','立川','八王子','大月','塩山','山梨市','石和温泉','甲府','韮崎','小淵沢','富士見','茅野','上諏訪','下諏訪','岡谷','塩尻','松本','豊科','穂高','信濃松川','信濃大町','白馬','南小谷'],
 '大糸快速':['南小谷','信濃森上','白馬','神城','簗場','信濃木崎','信濃大町'],
 'しなの':['京都','新大阪','大阪','塩尻','松本','穂高','信濃大町','白馬'],
 'みすず':['松本','南松本','平田','村井','広丘','塩尻','みどり湖','岡谷'],
 '長野快速':['上諏訪','下諏訪','岡谷','みどり湖','塩尻','広丘','村井','平田','南松本','松本','田沢','明科','西条','坂北','聖高原','冠着','姨捨','稲荷山','篠ノ井','今井','川中島','安茂里','長野']
};
const base={
 yamanote:[item('yamanote','e235','普通')],
 chuo:[
 item('chuo-extended','e353','特急','東京','松本'),item('chuo-extended','211','普通','高尾','松本'),item('shinonoi-extended','383','特急','長野','塩尻'),item('shinonoi-extended','211','普通','長野','塩尻'),
 item('chuo','e233','快速','東京','高尾'),item('chuo','e233','通勤特快','東京','高尾',{pattern:'通勤特快'}),item('chuo','e233','中央特快','東京','高尾',{pattern:'中央特快',beyond:'立川'}),item('chuo','e233','快速（土休日）','東京','高尾',{pattern:'holiday'}),
 item('chuo-ome','e233','青梅特快','東京','青梅',{pattern:'中央特快',beyond:'立川'}),item('chuo','e233','通勤快速','東京','高尾',{pattern:'通勤快速',beyond:'立川'}),item('chuo-ome','e233','ホリデー快速','新宿','青梅',{pattern:'ホリデー快速'}),item('chuo-extended','e233','快速','東京','大月',{pattern:'all'}),
 item('chuo','e353','特急','東京','八王子'),item('chuo-ome','e353','特急おうめ','東京','青梅',{pattern:'おうめ'}),item('itsukaichi','e233','各駅停車','拝島','武蔵五日市',{pattern:'all',carCount:6}),item('chuo-itsukaichi','e233','各駅停車','立川','武蔵五日市',{pattern:'all',carCount:6}),item('ome-okutama','e233','各駅停車','青梅','奥多摩',{pattern:'all'}),
 item('chuo-kofu','e353','特急'),item('chuo-kofu','211','普通'),item('chuo-shinshu','e353','特急'),item('chuo-shinshu','211','普通'),item('shinonoi','383','特急'),
 item('suwa-nagano','211','快速','上諏訪','長野',{pattern:'長野快速'}),item('chuo-extended','211','快速みすず','松本','岡谷',{pattern:'みすず'}),
 item('oito','e127','普通','南小谷','信濃大町'),item('oito','211','普通','信濃大町','松本'),item('oito','e127','快速','南小谷','信濃大町',{pattern:'大糸快速',night:true,startTime:'21:23:30'}),
 item('chuo-oito','e353','特急あずさ','新宿','南小谷',{pattern:'大糸特急'}),item('chuo-oito','e353','特急あずさ','松本','白馬',{pattern:'大糸特急'}),item('chuo-oito','383','特急しなの','塩尻','白馬',{pattern:'しなの'})],
 osaka:[item('osaka','323','普通'),item('osaka','223','関空・紀州路快速'),item('osaka','221','大和路快速')],
 tokaido:[item('tokaido','207','普通'),item('tokaido','223-1000','新快速'),item('tokaido','681','特急'),item('tokaido','221','快速'),item('tokaido','221','普通'),item('tokaido','383','特急しなの','京都','大阪',{pattern:'しなの',night:true,startTime:'20:00:00'})],
 tohoku:[item('tohoku','701','普通')],yagan:[item('yagan','6050','普通')]
};
export const serviceChoices=Object.fromEntries(Object.entries(base).map(([line,entries])=>[line,entries.flatMap(entry=>[entry,[...entry.slice(0,3),{...entry[3],reverse:true,...(line==='tokaido'&&entry[1]==='383'?{night:false,startTime:'08:00:00'}:{})}]])]));
export function buildConnectingRoutes(routes){
 const chuo=routes.get('chuo-extended'),oito=routes.get('oito'),shinonoi=routes.get('shinonoi-extended'),ome=routes.get('ome');
 return new Map([
 ['chuo-itsukaichi',joinRoutes([sliceRoute(ome,'立川','拝島'),routes.get('itsukaichi')],'chuo-itsukaichi','青梅線・五日市線')],
 ['chuo-ome',joinRoutes([sliceRoute(chuo,'東京','立川'),ome],'chuo-ome','中央線・青梅線')],
 ['chuo-oito',joinRoutes([chuo,reverseRoute(oito,{switchTrack:false})],'chuo-oito','中央線・大糸線')],
 ['suwa-nagano',joinRoutes([sliceRoute(chuo,'上諏訪','松本'),reverseRoute(sliceRoute(shinonoi,'長野','松本'),{switchTrack:false})],'suwa-nagano','中央線・篠ノ井線・信越本線')]
 ]);
}
