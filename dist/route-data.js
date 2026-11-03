// Station chainage read from the user's RailLab route page, km from Kuroiso.
export const STATIONS=[['黒磯',0],['高久',4],['黒田原',8.2],['豊原',13.4],['白坂',18.7],['新白河',22.1],['白河',24.9],['久田野',29.6],['泉崎',34.1],['矢吹',40.1],['鏡石',45.5],['須賀川',51.8],['安積永盛',58.5],['郡山',63.4],['日和田',69.1],['五百川',73.6],['本宮',77.4],['杉田',83.3],['二本松',87],['安達',91.2],['松川',96.2],['金谷川',100.7],['南福島',106.1],['福島',109.5]].map(([name,km])=>({name,s:Math.round(km*1000)}));
export const ROUTE_LENGTH=STATIONS.at(-1).s;
export const LAST_STATION_INDEX=STATIONS.length-1;
export const BVE_END=22100;
export function settlementAt(s){let amount=.1;for(const [center,width,strength] of [[24900,2200,.6],[40100,1700,.55],[45500,1500,.55],[51800,2400,.7],[63400,6000,1],[77400,1900,.6],[87000,2300,.6],[109500,6500,1]])amount=Math.max(amount,strength*Math.max(0,1-Math.abs(s-center)/width));return amount;}
