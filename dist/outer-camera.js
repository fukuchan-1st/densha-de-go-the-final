import * as T from './assets/vendor/three.module.js';
export const OUTER_CAMERA_OFFSETS=[[-30,27,12],[30,27,12],[-24,20,20],[24,20,20],[-45,30,28],[45,30,28],[-14,12,7],[14,12,7],[-6,7,5],[6,7,5],[0,7,3.5],[0,4,3]];
export function chooseOuterCamera(candidates,isClear,preferred=0){const order=[preferred,...candidates.map((_,i)=>i).filter(i=>i!==preferred)];for(const i of order)if(isClear(candidates[i]))return i;return candidates.length-1;}
export class OuterCamera{
 constructor(world,train,frame){this.world=world;this.train=train;this.frame=frame;this.ray=new T.Raycaster();this.preferred=0;this.nextProbe=0;this.defaultClearSince=0;}
 reset(){this.position=null;this.nextProbe=0;this.defaultClearSince=0;this.preferred=0;}
 clear(from,to){const direction=to.clone().sub(from),distance=direction.length();if(distance<.6)return true;this.ray.set(from,direction.normalize());this.ray.near=.12;this.ray.far=Math.max(.13,distance-.35);const obstacles=this.world.scene.children.filter(object=>object!==this.train&&object!==this.world.camera&&object.visible);return this.ray.intersectObjects(obstacles,true).length===0;}
 update(s){
  const now=performance.now(),target=this.frame(s-10).p.clone(),nose=this.frame(s-1).p.clone();target.y+=2.2;nose.y+=2;
  const candidates=OUTER_CAMERA_OFFSETS.map(([side,ahead,height])=>{const f=this.frame(s+ahead),p=f.p.clone().addScaledVector(f.right,side);p.y+=height;return p;});
  const safe=position=>this.clear(target,position)&&this.clear(nose,position);
  const teleported=this.lastS!=null&&Math.abs(s-this.lastS)>60;
  const probe=now>=this.nextProbe||teleported||!this.position;
  if(probe){
   this.world.scene.updateMatrixWorld(true);
   this.nextProbe=now+130;
   if(this.preferred!==0&&safe(candidates[0])){this.defaultClearSince||=now;if(now-this.defaultClearSince>1200)this.preferred=0;}else this.defaultClearSince=0;
   this.preferred=chooseOuterCamera(candidates,safe,this.preferred);
  }
  const desired=candidates[this.preferred];
  if(!this.position||teleported)this.position=desired.clone();
  else{const next=this.position.clone().lerp(desired,.22);if(this.clear(this.position,next)&&safe(next))this.position.copy(next);else{this.preferred=chooseOuterCamera(candidates,safe,this.preferred);this.position.copy(candidates[this.preferred]);}}
  this.lastS=s;this.world.camera.clearViewOffset();this.world.camera.position.copy(this.position);this.world.camera.lookAt(target);
 }
}
