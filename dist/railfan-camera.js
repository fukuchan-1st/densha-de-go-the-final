import {stationPlatforms,platformBoundsAt,stoppingStationSpot} from './station-space.js?v=106';
import {tunnelFilmingPlan,tunnelRanges,filmingTracks} from './railfan-tunnel.js?v=106';
import * as T from './assets/vendor/three.module.js?v=106';
import {crossingCenter} from './crossings.js?v=106';
export const RAILFAN_EYE_HEIGHT=1.68;
export function trainHasCleared(s,spot,length){return s-length>spot+30;}
export function passbyShake(speed,elapsed,distance=8){if(speed<70/3.6||elapsed<0||elapsed>2.4)return 0;return Math.min(.016,(speed*3.6-55)*.00024)*Math.exp(-elapsed*2.6)*Math.min(1,8/Math.max(4,distance));}
export function filmingSpots(route){const rows=route.structures??[],stations=route.sceneryStations??route.stations??[],end=route.length??stations.at(-1)?.s??0,inTunnel=s=>rows.some(t=>t.kind==='tunnel'&&s>t.sStart-30&&s<t.sEnd+30),spots=[];
 for(const c of rows)if(c.kind==='crossing')spots.push({s:crossingCenter(c)-5,kind:'crossing',name:c.name??'踏切'});
 for(const st of stations)if(st.s>60&&st.s<end-40&&!inTunnel(st.s-35))spots.push({s:st.s-35,station:st,kind:'station',name:st.name});
 for(let s=250;s<end;s+=650)if(!inTunnel(s)&&!rows.some(t=>t.kind==='bridge'&&s>=t.sStart&&s<=t.sEnd)&&!spots.some(t=>Math.abs(t.s-s)<180))spots.push({s,kind:'line',name:'沿線'});
 return spots.filter(x=>!inTunnel(x.s)).sort((a,b)=>a.s-b.s);
}
export class RailfanCamera{
 constructor(world,train,frame){this.world=world;this.train=train;this.frame=frame;this.ray=new T.Raycaster();this.normalNear=world.camera.near;this.spots=filmingSpots(world.route??{stations:world.stations,structures:world.routeStructures?.structures,length:world.length});}
 reset(){this.tunnelPlan=null;this.pendingOutdoor=false;this.position=null;this.rotation=null;this.setNear(this.normalNear);this.spot=null;this.lastS=null;this.elapsed=0;this.passAt=null;}
 setNear(near){if(this.world.camera.near!==near){this.world.camera.near=near;this.world.camera.updateProjectionMatrix();}}
 nextSpot(s){const nearby=this.spots.find(x=>x.s>s+65&&x.s<s+800);if(nearby)return nearby;const tunnels=tunnelRanges(this.world);for(const distance of[100,60,160,30,-50,-100]){const at=Math.max(5,Math.min(this.world.length-5,s+distance));if(!tunnels.some(t=>at>t.sStart-20&&at<t.sEnd+20))return {s:at,kind:'line',name:'沿線'};}return {s:Math.max(5,Math.min(this.world.length-5,s)),kind:'line',name:'沿線'};}
 prepare(s){
  const length=this.world.playerTrain?.count*20||40,station=stoppingStationSpot(this.world,s,length);
  if(station){if(!this.spot?.stopping||this.spot.station.s!==station.station.s){this.spot=station;this.pendingOutdoor=true;this.position=null;this.rotation=null;this.passAt=null;}this.tunnelPlan=null;this.setNear(this.normalNear);return this.spot.s;}
  if(this.spot?.stopping){this.spot=null;this.position=null;this.pendingOutdoor=true;}
  const plan=tunnelFilmingPlan(this.world,s,length,this.tunnelPlan);
  if(plan){const changed=this.tunnelPlan?.tunnelKey!==plan.tunnelKey||this.tunnelPlan?.s!==plan.s||this.tunnelPlan?.double!==plan.double;this.tunnelPlan=plan;this.spot=plan;this.pendingOutdoor=false;if(changed){this.rotation=null;this.passAt=null;this.elapsed=0;}this.position=this.world.frame(plan.s,plan.offset).p.clone();this.position.y+=(this.world.deckHeight?.(plan.s)??0)+plan.eye;this.sideDistance=Math.abs(plan.offset-(this.world.driveOffset?.(plan.s)??0));this.setNear(plan.double?.1:.04);return plan.s;}
  if(this.tunnelPlan){this.reset();}
  const seek=this.lastS!=null&&(s<this.lastS-10||Math.abs(s-this.lastS)>200);if(!this.spot||seek||trainHasCleared(s,this.spot.s,length)){this.spot=this.nextSpot(s);this.pendingOutdoor=true;}
  this.setNear(this.normalNear);return this.spot.s;
 }
 choose(s,length){this.spot??=this.nextSpot(s);this.passAt=null;this.position=null;this.rotation=null;this.elapsed=0;this.pendingOutdoor=false;
  const {world,spot}=this,drive=world.driveOffset?.(spot.s)??0,rails=filmingTracks(world,spot.s),candidates=[];
  if(spot.station){
   const platforms=stationPlatforms(world,spot.station).sort((a,b)=>Number(b.platform.boarding??false)-Number(a.platform.boarding??false));
   for(const item of platforms)for(const shift of[0,-12,12,-24,24]){
    const at=Math.max(item.start+1.5,Math.min(item.end-1.5,spot.s+shift)),[left,right]=platformBoundsAt(world,item,at);if(right-left<.8)continue;
    for(const x of[(left+right)/2,left+.5,right-.5])if(x>left+.3&&x<right-.3)candidates.push({s:at,x,height:1+(item.platform.height??0),platform:true});
   }
  }
  if(!spot.stopping||!candidates.length)for(const x of[Math.min(...rails)-5.5,Math.max(...rails)+5.5,drive-10,drive+10,drive-14,drive+14])candidates.push({s:spot.s,x,height:0,platform:false});
  const target=this.frame(spot.s-10).p.clone();target.y+=2;
  world.scene.updateMatrixWorld(true);const obstacles=world.scene.children.filter(x=>x!==this.train&&x!==world.camera&&x.visible),grounds=[];world.scene.traverse(o=>{if(o.isMesh&&['textured-grass','textured-forest'].includes(o.material?.name))grounds.push(o);});
  let safe=null;
  for(const candidate of candidates){const {x,s:at,height,platform}=candidate;if(filmingTracks(world,at).some(r=>Math.abs(r-x)<(platform?1.8:3.3)))continue;
   const p=world.frame(at,x).p.clone();let floor=p.y+(world.frameIncludesDeck?0:world.deckHeight?.(at)??0)+height;
   if(!platform){this.ray.set(new T.Vector3(p.x,floor+30,p.z),new T.Vector3(0,-1,0));this.ray.near=0;this.ray.far=100;const ground=this.ray.intersectObjects(grounds,false)[0];if(ground)floor=Math.max(floor,ground.point.y);}
   p.y=floor+RAILFAN_EYE_HEIGHT;safe??={p,x,at};
   const delta=target.clone().sub(p);this.ray.set(p,delta.clone().normalize());this.ray.near=.2;this.ray.far=Math.max(.3,delta.length()-.5);
   if(!this.ray.intersectObjects(obstacles,true).some(h=>!grounds.includes(h.object))){safe={p,x,at};break;}
  }
  if(safe){this.position=safe.p;this.spot={...spot,s:safe.at};this.sideDistance=Math.abs(safe.x-drive);}
  else{this.position=world.frame(spot.s,Math.min(...rails)-8).p.clone();this.position.y+=(world.deckHeight?.(spot.s)??0)+RAILFAN_EYE_HEIGHT;this.sideDistance=8;}
 }
 update(s,speed,dt,time=0){const length=this.world.playerTrain?.count*20||40;this.prepare(s);if(this.pendingOutdoor||!this.position)this.choose(s,length);this.elapsed+=dt;

  if(this.lastS!=null&&this.lastS<this.spot.s&&s>=this.spot.s){this.passAt=this.elapsed;this.passSpeed=speed;}
  if(dt===0&&this.lastS!=null&&Math.abs(s-this.lastS)>1)this.rotation=null;
  const camera=this.world.camera,target=this.frame(s-10-Math.min(length*.35,Math.max(0,s-this.spot.s)*.28)).p.clone();target.y+=this.tunnelPlan&&!this.tunnelPlan.double?1.2:2;camera.clearViewOffset();camera.position.copy(this.position);camera.lookAt(target);const desired=camera.quaternion.clone();if(this.rotation){this.rotation.slerp(desired,1-Math.exp(-Math.max(0,dt)/.14));camera.quaternion.copy(this.rotation);}else this.rotation=desired;
  const shake=this.passAt==null?0:passbyShake(this.passSpeed??speed,this.elapsed-this.passAt,this.sideDistance);camera.rotateX(Math.sin(time*61)*shake*.4);camera.rotateY(Math.sin(time*47+.7)*shake*.6);camera.rotateZ(Math.sin(time*73)*shake);this.lastS=s;
 }
}
