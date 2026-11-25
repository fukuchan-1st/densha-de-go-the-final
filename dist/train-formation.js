// The panorama green car is confined to the six-car 383 base formation.
export function panoramaAtFront(route={}){
 const stations=route.sceneryStations??route.stations??[];
 for(const name of ['長野','白馬','京都','松本']){const st=stations.find(s=>s.name===name);if(st)return st.s>=(stations[0].s+stations.at(-1).s)/2;}
 return true;
}
export function carVariant(model,id,index,count,{panoramaAtFront:front=true}={}){
 let role=model.formation?.length===count?model.formation[index]:index===0?'head':index===count-1?'tail':'middle';
 let rotation=index===count-1&&count>1?(model.tailRotation??model.frontRotation??(['e233','211','221'].includes(id)?Math.PI:0)):(model.frontRotation??(['e233','211','221'].includes(id)?Math.PI:0));
 if(id==='701'&&index===count-1&&count>1)rotation+=Math.PI;
 if(id==='6050'&&count>2){role=index%2===0?'head':'tail';rotation=index%2===0?(model.frontRotation??0):(model.tailRotation??Math.PI);}
 if(id==='383'&&count===6&&model.variants.panorama&&index===(front?0:count-1)){role='panorama';rotation=(model.panoramaRotation??Math.PI)+(front?0:Math.PI);}
 if(id==='e131'){role=index%3===0?'head':index%3===1?'middle':'tail';rotation=Math.PI;}
 return {role,rotation};
}
