import {YAMAGATA_MOUNTAIN} from './yamagata-mountain-data.js?v=117';
const cache=new WeakMap();
// Source chainage survives reversing and slicing, including the Akaiwa shuttle.
export function yamagataSourcePosition(route,s){
 if(route.id!=='yamagata')return null;
 let anchors=cache.get(route);
 if(!anchors){anchors=(route.sceneryStations??route.stations??[]).filter(st=>Number.isFinite(st.sourceS)).sort((a,b)=>a.s-b.s);cache.set(route,anchors);}
 if(anchors.length<2)return null;
 let i=1;while(i<anchors.length-1&&anchors[i].s<s)i++;
 const a=anchors[i-1],b=anchors[i];return a.sourceS+(b.sourceS-a.sourceS)*(s-a.s)/Math.max(.001,b.s-a.s);
}
export function residentialAllowed(route,s,depth=0){
 const a=yamagataSourcePosition(route,s-depth/2),b=yamagataSourcePosition(route,s+depth/2);
 return a==null||Math.max(a,b)<YAMAGATA_MOUNTAIN.start||Math.min(a,b)>YAMAGATA_MOUNTAIN.end;
}
export function yamagataMountainDensity(route,s){
 const source=yamagataSourcePosition(route,s),{start,end,rows}=YAMAGATA_MOUNTAIN;
 if(source==null||source<start||source>end)return null;
 let i=1;while(i<rows.length-1&&rows[i].sourceS<source)i++;
 const a=rows[i-1],b=rows[i],t=Math.max(0,Math.min(1,(source-a.sourceS)/(b.sourceS-a.sourceS)));
 return {building:0,urban:0,...Object.fromEntries(['green','forest','farmland','orchard','coverage'].map(k=>[k,a[k]+(b[k]-a[k])*t])),source:'osm-corridor-600m',residentialExcluded:true};
}
