import {tunnelFilmingPlan,tunnelRanges,filmingTracks} from './railfan-tunnel.js?v=81';
import * as T from './assets/vendor/three.module.js';
import {crossingCenter} from './crossings.js?v=79';
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
  const length=this.world.playerTrain?.count*20||40,plan=tunnelFilmingPlan(this.world,s,length,this.tunnelPlan);
  if(plan){const changed=this.tunnelPlan?.tunnelKey!==plan.tunnelKey||this.tunnelPlan?.s!==plan.s||this.tunnelPlan?.double!==plan.double;this.tunnelPlan=plan;this.spot=plan;this.pendingOutdoor=false;if(changed){this.rotation=null;this.passAt=null;this.elapsed=0;}this.position=this.world.frame(plan.s,plan.offset).p.clone();this.position.y+=(this.world.deckHeight?.(plan.s)??0)+plan.eye;this.sideDistance=Math.abs(plan.offset-(this.world.driveOffset?.(plan.s)??0));this.setNear(plan.double?.1:.04);return plan.s;}
  if(this.tunnelPlan){this.reset();}
  const seek=this.lastS!=null&&(s<this.lastS-10||Math.abs(s-this.lastS)>200);if(!this.spot||seek||trainHasCleared(s,this.spot.s,length)){this.spot=this.nextSpot(s);this.pendingOutdoor=true;}
  this.setNear(this.normalNear);return this.spot.s;
 }
 choose(s,length){this.spot=this.nextSpot(s);this.passAt=null;this.position=null;this.rotation=null;this.elapsed=0;this.pendingOutdoor=false;
  const {world,spot}=this,f=this.frame(spot.s),drive=world.driveOffset?.(spot.s)??0;let offsets=[drive-10,drive+10,drive-14,drive+14];let platform=false;
  const layout=spot.station&&world.route?.stationLayouts?.[spot.station.name];if(layout?.platforms?.length){const edge=layout.platforms[0].edges?.[0];if(edge){offsets=[(edge[1]+edge[2])/2,...offsets];platform=true;}}
  const rails=filmingTracks(world,spot.s);
  offsets=[...(platform?[offsets[0]]:[]),Math.min(...rails)-5.5,Math.max(...rails)+5.5,...offsets];
  const target=this.frame(spot.s-10).p.clone();target.y+=2;
  world.scene.updateMatrixWorld(true);const obstacles=world.scene.children.filter(x=>x!==this.train&&x!==world.camera&&x.visible),grounds=[];world.scene.traverse(o=>{if(o.isMesh&&['textured-grass','textured-forest'].includes(o.material?.name))grounds.push(o);});
  for(let i=0;i<offsets.length;i++){
   const x=offsets[i];if(rails.some(r=>Math.abs(r-x)<3.3))continue;const p=world.frame(spot.s,x).p.clone();let floor=p.y+(platform&&i===0?1+(world.deckHeight?.(spot.s)??0):0);this.ray.set(new T.Vector3(p.x,p.y+30,p.z),new T.Vector3(0,-1,0));this.ray.near=0;this.ray.far=100;const ground=this.ray.intersectObjects(grounds,false)[0];if(ground)floor=Math.max(floor,ground.point.y);p.y=floor+RAILFAN_EYE_HEIGHT;
   const delta=target.clone().sub(p);this.ray.set(p,delta.clone().normalize());this.ray.near=.2;this.ray.far=Math.max(.3,delta.length()-.5);const blocked=this.ray.intersectObjects(obstacles,true).filter(h=>!grounds.includes(h.object));if(!blocked.length||i===offsets.length-1){this.position=p;this.sideDistance=Math.abs(x-drive);break;}
  }
  if(!this.position){this.position=world.frame(spot.s,Math.min(...rails)-8).p.clone();this.position.y+=RAILFAN_EYE_HEIGHT;this.sideDistance=8;}
 }
 update(s,speed,dt,time=0){const length=this.world.playerTrain?.count*20||40;this.prepare(s);if(this.pendingOutdoor||!this.position)this.choose(s,length);this.elapsed+=dt;

  if(this.lastS!=null&&this.lastS<this.spot.s&&s>=this.spot.s){this.passAt=this.elapsed;this.passSpeed=speed;}
  if(dt===0&&this.lastS!=null&&Math.abs(s-this.lastS)>1)this.rotation=null;
  const camera=this.world.camera,target=this.frame(s-10-Math.min(length*.35,Math.max(0,s-this.spot.s)*.28)).p.clone();target.y+=this.tunnelPlan&&!this.tunnelPlan.double?1.2:2;camera.clearViewOffset();camera.position.copy(this.position);camera.lookAt(target);const desired=camera.quaternion.clone();if(this.rotation){this.rotation.slerp(desired,1-Math.exp(-Math.max(0,dt)/.14));camera.quaternion.copy(this.rotation);}else this.rotation=desired;
  const shake=this.passAt==null?0:passbyShake(this.passSpeed??speed,this.elapsed-this.passAt,this.sideDistance);camera.rotateX(Math.sin(time*61)*shake*.4);camera.rotateY(Math.sin(time*47+.7)*shake*.6);camera.rotateZ(Math.sin(time*73)*shake);this.lastS=s;
 }
}
