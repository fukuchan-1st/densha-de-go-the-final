// FINAL's published diagram endpoints and split sections, in the playable direction.
// References and differences from the original are listed in scenario-notes.md.
export const FINAL_SCENARIOS={
 yamanote:[
  ['06','大崎','池袋'],['06-1','大崎','新宿'],['06-2','新宿','池袋'],
  ['07・08','池袋','大崎'],['08-1','池袋','上野'],['08-2','上野','大崎'],
  ['09','大崎','大崎'],['09-2','新宿','上野'],['10','大崎','品川'],['10-3','上野','品川']
 ],
 chuo:[
  ['01・02','東京','高尾'],['01-1','東京','新宿'],['01-2','新宿','三鷹'],['01-3','三鷹','高尾'],
  ['05・07','新宿','八王子'],['06','新宿','高尾'],['08','東京','八王子'],['09','立川','高尾']
 ],
 osaka:[
  ['05','大阪','京橋'],['06','大阪','天王寺'],['06-2','京橋','天王寺'],
  ['07','天王寺','天王寺'],['08・12','天王寺','京橋'],['11','天王寺','大阪']
 ],
 tokaido:[
  ['01・02・04','京都','神戸'],['01-1','京都','高槻'],['01-2','高槻','大阪'],
  ['01-3','大阪','芦屋'],['01-4','芦屋','神戸'],['03','高槻','尼崎'],
  ['03-2','大阪','尼崎'],['09・11・12','京都','大阪'],['10','大阪','神戸'],
  ['13','京都','三ノ宮'],['13-2','大阪','三ノ宮']
 ]
};

export function scenarioJourney(route,scenario){
 if(!scenario)return {route,startIndex:0,endIndex:route.stations.length-1};
 const [,from,to]=scenario;
 const startIndex=route.stations.findIndex(station=>station.name===from);
 const endIndex=route.stations.findIndex(station=>station.name===to);
 if(startIndex<0||endIndex<0||(!route.loop&&endIndex<=startIndex))return null;
 if(endIndex>startIndex)return {route,startIndex,endIndex};
 const period=route.stations.length-1;
 const length=route.stations[period].s;
 const stations=route.stations.map((station,index)=>({...station,layoutIndex:index%period}));
 const repeated=stations.slice(1).map(station=>({...station,s:station.s+length}));
 const repeatPositions=items=>[
  ...(items??[]),
  ...(items??[]).map(item=>({...item,s:item.s+length}))
 ];
 const extended={
  ...route,
  length:length*2,
  stations:[...stations,...repeated],
  points:[...route.points,...route.points.slice(1).map(([s,...point])=>[s+length,...point])],
  structures:[...route.structures,...route.structures.map(item=>({...item,sStart:item.sStart+length,sEnd:item.sEnd+length}))],
  parallelTrackReference:repeatPositions(route.parallelTrackReference),
  signals:repeatPositions(route.signals)
 };
 return {route:extended,startIndex,endIndex:endIndex+period};
}
