export const DISTRICTS={
 '冥界':{kind:'sakura',label:'冥界',flowers:'sakura',landmark:'gate',mood:{sky:'#25233f',fog:'#66547a',light:'#b2b2e7',sun:'#f3b9ed'}},
 '無名丘':{kind:'lily',label:'無名の丘',flowers:'lily'},
 '永遠':{kind:'bamboo',label:'永遠亭',landmark:'bamboo-house'},
 '幻想風穴':{kind:'cave',label:'幻想風穴',landmark:'cave'},
 '太陽畑':{kind:'sunflower',label:'太陽の畑',flowers:'sunflower'},
 '幻想高原':{kind:'meadow',label:'幻想高原',flowers:'lily'},
 '博麗前':{kind:'shrine',label:'博麗神社',landmark:'shrine'},
 '紅魔':{kind:'mansion',label:'紅魔館',landmark:'mansion'},
 '無縁塚':{kind:'mugen',label:'無縁塚',flowers:'higan',landmark:'graves'},
 '香霖堂':{kind:'antique',label:'香霖堂',landmark:'antique'},
 '魔森':{kind:'forest',label:'魔法の森',flowers:'mushroom',landmark:'forest'},
 '霧雨':{kind:'magic-shop',label:'霧雨魔法店',flowers:'mushroom',landmark:'magic-shop'},
 '人里':{kind:'village',label:'人間の里',landmark:'village'},
 '鈴奈':{kind:'village',label:'鈴奈庵',landmark:'bookshop'},
 '柳運河':{kind:'canal',label:'柳運河',landmark:'canal'},
 '新人里':{kind:'village',label:'新人里',landmark:'village'},
 '命蓮寺':{kind:'temple',label:'命蓮寺',landmark:'temple'},
 '大祀前':{kind:'pagoda',label:'夢殿大祀廟',landmark:'pagoda'},
 '三途':{kind:'sanzu',label:'三途の川',flowers:'higan',landmark:'river',mood:{sky:'#22233b',fog:'#66647f',light:'#a3b8d6',sun:'#c9a2ce'}},
 '平':{kind:'meadow',label:'平',flowers:'lily'},
 '龍王峡':{kind:'waterfall',label:'龍王峡',landmark:'waterfall'},
 '中有':{kind:'market',label:'中有の道',landmark:'market'},
 '賽河原':{kind:'riverbank',label:'賽の河原',landmark:'graves'},
 '虹龍洞':{kind:'cave',label:'虹龍洞',landmark:'rainbow-cave'},
 '妖怪山':{kind:'waterfall',label:'妖怪の山',landmark:'waterfall'}
};
export function districtAt(route,s){
 if(!route.id?.startsWith('toho'))return null;
 const stations=route.sceneryStations??route.stations??[];let station=null,distance=Infinity;
 for(const st of stations){const d=Math.abs(st.s-s);if(d<distance){station=st;distance=d;}}
 const district=route.id==='toho-village'?{kind:'village',label:station?.name,landmark:'village'}:route.id==='toho-center'&&station?.name!=='人里'?{kind:'cave',label:'地下間欠泉センター',landmark:'cave'}:DISTRICTS[station?.name];
 return district?{...district,station,distance}:null;
}
export function fixedMoodAt(route,s){
 const district=districtAt(route,s);if(!district?.mood||district.distance>=1700)return null;
 const t=Math.max(0,Math.min(1,(district.distance-700)/1000)),weight=1-t*t*(3-2*t);
 return {...district.mood,weight,kind:district.kind};
}
export function replacesNativeTrees(route,s){const d=districtAt(route,s);return d?.distance<1100&&['sakura','lily','sunflower','mugen','bamboo','sanzu','cave'].includes(d.kind);}
