const supplied=new Set(["e353", "211", "383", "e127", "223", "223-1000", "221", "681", "e131", "e257-5000"]);
export function vehiclePhoto(vehicle,line){if(vehicle==='719-5000')return './assets/vehicle-photos/719-5000.webp';return supplied.has(vehicle)?'./assets/vehicle-photos/'+vehicle+'.webp':'./assets/menu-photos/'+(line==='toho'?'yagan':line)+'.webp';}
