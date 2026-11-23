export const CHUO_LOCAL_PASSES=[["水道橋","御茶ノ水","四ツ谷",0.267621,2558121946],["飯田橋","御茶ノ水","四ツ谷",0.470634,2559434114],["市ケ谷","御茶ノ水","四ツ谷",0.79078,2558121912],["信濃町","四ツ谷","新宿",0.33142,7865838639],["千駄ケ谷","四ツ谷","新宿",0.554404,2558121938],["代々木","四ツ谷","新宿",0.841521,2558121954],["大久保","新宿","中野",0.306099,7865838640],["東中野","新宿","中野",0.596186,7808533560]];
export function withChuoLocalPasses(route){
 if(!/^chuo/.test(route.id??''))return route;const all=route.sceneryStations??route.stations,extra=[];
 for(const [name,from,to,fraction,node]of CHUO_LOCAL_PASSES){if(all.some(st=>st.name===name))continue;const a=all.find(st=>st.name===from),b=all.find(st=>st.name===to);if(!a||!b)continue;extra.push({name,s:a.s+(b.s-a.s)*fraction,passOnly:true,displayOnly:true,parallelLine:'中央・総武線各駅停車',osmStationNodeId:node});}
 return extra.length?{...route,sceneryStations:[...all,...extra].sort((a,b)=>a.s-b.s)}:route;
}
