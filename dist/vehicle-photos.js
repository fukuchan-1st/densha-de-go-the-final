const supplied=new Set(["e353", "211", "383", "e127", "223", "223-1000", "221", "681", "e131"]);
export function vehiclePhoto(vehicle,line){return supplied.has(vehicle)?'./assets/vehicle-photos/'+vehicle+'.webp':'./assets/menu-photos/'+(line==='toho'?'yagan':line)+'.webp';}
