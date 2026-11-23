const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function smoothTrafficStep(s,speed,targetSpeed,dt,stopAt=null){
 const step=Math.max(0,Math.min(.1,dt)),distance=stopAt===null?Infinity:Math.max(0,s-stopAt),brake=distance<12?.32:.65;
 const desired=Math.min(targetSpeed,Math.sqrt(2*.28*Math.max(0,distance-speed*step*2)));
 let next=Math.max(0,speed+clamp(desired-speed,-brake*step,.45*step));
 let position=s-(speed+next)*.5*step;
 if(stopAt!==null&&position<=stopAt){position=stopAt;next=0;}
 return {s:position,speed:next};
}
export function crossoverHold(world,player){
 const zone=world.route?.tokyoLayout?.crossover;if(!zone?.active)return null;
 const length=(world.playerTrain?.count??world.route.carCount??12)*20;
 return player>=zone.sStart-1200&&player-length<=zone.sEnd+30?zone.sEnd+85:null;
}


