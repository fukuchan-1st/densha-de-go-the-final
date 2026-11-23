import * as T from './assets/vendor/three.module.js?v=112c';
export const OUTER_CAMERA_OFFSETS=[[-30,27,12],[30,27,12],[-24,20,20],[24,20,20],[-45,30,28],[45,30,28],[-14,12,7],[14,12,7],[-6,7,5],[6,7,5],[0,7,3.5],[0,4,3]];
export function chooseOuterCamera(candidates,isClear,preferred=0){const order=[preferred,...candidates.map((_,i)=>i).filter(i=>i!==preferred)];for(const i of order)if(isClear(candidates[i]))return i;return candidates.length-1;}
export function tunnelCameraWeight(s,tunnels){
 const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
 return Math.max(0,...tunnels.map(t=>{const a=t.sStart??t.start,b=t.sEnd??t.end;return smooth((s-(a-170))/120)*(1-smooth((s-(b+30))/140));}));
}
export class OuterCamera{
 constructor(world,train,frame){this.world=world;this.train=train;this.frame=frame;this.ray=new T.Raycaster();this.preferred=0;this.nextProbe=0;this.defaultClearSince=0;}
 reset(){this.position=null;this.nextProbe=0;this.defaultClearSince=0;this.preferred=0;this.lastTime=null;this.lastTarget=null;this.waypoint=null;}
 clear(from,to){const direction=to.clone().sub(from),distance=direction.length();if(distance<.6)return true;this.ray.set(from,direction.normalize());this.ray.near=.12;this.ray.far=Math.max(.13,distance-.35);const obstacles=this.world.scene.children.filter(object=>object!==this.train&&object!==this.world.camera&&object.visible);return this.ray.intersectObjects(obstacles,true).length===0;}
 update(s){
  const now=performance.now(),dt=Math.min(.1,Math.max(.001,(now-(this.lastTime??now-16.67))/1000));this.lastTime=now;
  const target=this.frame(s-10).p.clone(),nose=this.frame(s-1).p.clone();target.y+=2.2;nose.y+=2;
  const candidates=OUTER_CAMERA_OFFSETS.map(([side,ahead,height])=>{const f=this.frame(s+ahead),p=f.p.clone().addScaledVector(f.right,side);p.y+=height;return p;});
  const safe=position=>this.clear(target,position)&&this.clear(nose,position);
  const teleported=this.lastS!=null&&Math.abs(s-this.lastS)>60;
  const tunnels=this.world.route?.structures?.filter(t=>t.kind==='tunnel')??this.world.ranges?.tunnels??[];
  const tunnelWeight=tunnelCameraWeight(s,tunnels);
  const probe=now>=this.nextProbe||teleported||!this.position;
  if(probe){
   this.world.scene.updateMatrixWorld(true);
   this.nextProbe=now+400;
   if(!tunnelWeight){
    if(this.preferred!==0&&safe(candidates[0])){this.defaultClearSince||=now;if(now-this.defaultClearSince>3000)this.preferred=0;}else this.defaultClearSince=0;
    if(!safe(candidates[this.preferred])){this.blockedSince??=now;if(now-this.blockedSince>450||!this.position){this.preferred=chooseOuterCamera(candidates,safe,this.preferred);this.blockedSince=null;}}else this.blockedSince=null;
   }
  }
  // The normal viewpoint stays independent of the tunnel viewpoint, so it cannot
  // get stuck on a close fallback after an exit. Approach/exit ramps are spatial.
  const close=candidates.at(-1),desired=candidates[this.preferred].clone().lerp(close,tunnelWeight);
  if(!this.position||teleported){this.position=(safe(desired)?desired:candidates[chooseOuterCamera(candidates,safe,this.preferred)]).clone();this.waypoint=null;}
  else{
   const movement=target.clone().sub(this.lastTarget??target);this.position.add(movement);this.waypoint?.add(movement);
   const alpha=1-Math.exp(-dt/1.05);
   if(probe){
    this.waypoint=null;
    if(!this.clear(this.position,desired)){
     // Travel around an obstruction via a visible near/raised position instead
     // of instantly cutting to the other side of the train.
     const raised=this.position.clone();raised.y+=18;
     const options=[close,...candidates,raised];
     const via=options.filter(p=>safe(p)&&this.clear(this.position,p)&&this.clear(p,desired)).sort((a,b)=>a.distanceTo(this.position)+a.distanceTo(desired)-b.distanceTo(this.position)-b.distanceTo(desired))[0];
     if(via)this.waypoint=via.clone();
    }
   }
   const destination=this.waypoint??desired;this.position.lerp(destination,alpha);
   if(this.waypoint&&this.position.distanceTo(this.waypoint)<.8)this.waypoint=null;
  }
  this.lastTarget=target.clone();
  this.lastS=s;this.world.camera.clearViewOffset();this.world.camera.position.copy(this.position);this.world.camera.lookAt(target);
 }
}
