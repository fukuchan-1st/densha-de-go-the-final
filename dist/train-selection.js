export const serviceChoices={
 yamanote:[['yamanote','e235','普通']],
 chuo:[['chuo-extended','e353','特急'],['chuo-extended','211','普通'],['shinonoi-extended','383','特急'],['shinonoi-extended','e353','特急'],['shinonoi-extended','211','普通'],['chuo','e233','快速'],['chuo','e353','特急'],['chuo-kofu','e353','特急'],['chuo-kofu','211','普通'],['chuo-shinshu','e353','特急'],['chuo-shinshu','211','普通'],['shinonoi','383','特急'],['shinonoi','e353','特急'],['shinonoi','211','普通'],['oito','e353','特急'],['oito','211','普通']],
 osaka:[['osaka','323','普通'],['osaka','223','関空・紀州路快速']],
 tokaido:[['tokaido','207','普通'],['tokaido','223-1000','新快速'],['tokaido','681','特急']],
 tohoku:[['tohoku','701','普通']],yagan:[['yagan','6050','普通']]
};
export function makeServiceRoute(route,vehicle,service){
 route={...route,sceneryStations:route.sceneryStations??route.stations,limits:route.limitsByVehicle?.[vehicle]??route.limits};
 if(!['新快速','関空・紀州路快速','特急'].includes(service))return {...route,stations:route.stations.filter(s=>!s.passOnly)};
 const stops=service==='新快速'?['京都','高槻','新大阪','大阪','尼崎','芦屋','三ノ宮','神戸']:service==='関空・紀州路快速'?['大阪','福島','西九条','弁天町','大正','新今宮','天王寺','鶴橋','京橋']:route.id==='tokaido'?['京都','新大阪','大阪','神戸']:route.id.startsWith('shinonoi')?['長野','篠ノ井','聖高原','明科','松本','塩尻']:route.id==='oito'?['南小谷','白馬','信濃大町','穂高','豊科','松本']:['東京','新宿','立川','八王子','大月','塩山','山梨市','石和温泉','甲府','韮崎','小淵沢','富士見','茅野','上諏訪','下諏訪','岡谷','塩尻','松本'];
 const stations=route.stations.map((station,index)=>({...station,layoutIndex:station.layoutIndex??index})).filter((station,index)=>index===0||index===route.stations.length-1||(!station.passOnly&&(stops?stops.includes(station.name):!station.sourcePass)));
 return {...route,stations,service,vehicle};
}
