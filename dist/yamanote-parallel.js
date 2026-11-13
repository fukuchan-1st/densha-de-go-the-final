// Continuous schematic corridors follow the actual adjacent railway families.
// Exact switches/individual parallel-track chainage are not surveyed here.
export function yamanoteParallel(source){
 if(source.id!=='yamanote'||source.parallelRailwayVersion===1)return source;
 const south=new Set('東京 有楽町 新橋 浜松町 田町 高輪ゲートウェイ 品川'.split(' ')),north=new Set('田端 西日暮里 日暮里 鶯谷 上野 御徒町 秋葉原 神田 東京'.split(' ')),ueno=new Set('日暮里 鶯谷 上野 御徒町 秋葉原 神田 東京'.split(' ')),west=new Set('品川 大崎 五反田 目黒 恵比寿 渋谷 原宿 代々木 新宿 新大久保 高田馬場 目白 池袋'.split(' '));
 const stations=source.sceneryStations??source.stations,spans=[];
 const add=(name,x,a,b,height=0)=>{const previous=spans.findLast(t=>t.lineName===name&&t.x===x&&t.height===height&&Math.abs(t.b-a)<.1);if(previous)previous.b=b;else spans.push({lineName:name,x,a,b,height});};
 for(let i=1;i<stations.length;i++){const a=stations[i-1],b=stations[i],both=set=>set.has(a.name)&&set.has(b.name);if(both(south)||both(north)){for(const x of[-4.2,8.4])add('京浜東北線',x,a.s,b.s);for(const x of[12.6,16.8])if(both(south)||both(ueno))add('上野東京ライン・東海道／東北本線',x,a.s,b.s,both(ueno)?3.5:0);}else if(both(west))for(const x of[8.4,12.6])add('埼京線・湘南新宿ライン',x,a.s,b.s);}
 const end=source.length??stations.at(-1).s,rails=spans.map(t=>({lineName:t.lineName,sceneryParallel:true,direction:'scenery',height:t.height,knots:[[Math.max(-300,t.a-140),t.x+Math.sign(t.x)*22],[t.a,t.x],[t.b,t.x],[Math.min(end+300,t.b+140),t.x+Math.sign(t.x)*22]].filter((x,i,a)=>!i||x[0]>a[i-1][0])}));
 return {...source,neighborTracks:[...(source.neighborTracks??[]),...rails],parallelRailwayVersion:1};
}
