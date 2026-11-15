const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const set=(param,value,time,tau=.08)=>{if(!param)return;if(param.setTargetAtTime)param.setTargetAtTime(value,time,tau);else param.value=value;};
export function movingSourcePitch(source,listener,velocity){
 const dx=listener.x-source.x,dy=listener.y-source.y,dz=listener.z-source.z,d=Math.hypot(dx,dy,dz);
 if(d<.01)return 1;
 const radial=(velocity.x*dx+velocity.y*dy+velocity.z*dz)/d;
 return clamp(343/(343-clamp(radial,-100,100)),.75,1.35);
}
export class TrainPassbyAudio{
 constructor(context,runningOutput,hornOutput){
  this.context=context;this.sources=new Map();
  for(const [kind,output]of [['running',runningOutput],['horn',hornOutput]]){
   const gain=context.createGain(),pan=context.createStereoPanner?.();gain.gain.value=1;
   if(pan)gain.connect(pan).connect(output);else gain.connect(output);
   this[kind]={output:gain,gain,pan,pitch:1};
  }
 }
 track(source,basePitch=1,kind='running'){this.sources.set(source,{basePitch,kind});this.apply(source,{basePitch,kind});}
 forget(source){this.sources.delete(source);}
 apply(source,{basePitch,kind}){set(source.playbackRate,basePitch*this[kind].pitch,this.context.currentTime??0,.065);}
 update(world,s,speed,viewMode,paused=false){
  const now=this.context.currentTime??0,active=viewMode===3&&!paused,point=ss=>world.drivePoint?.(ss)??world.frame(ss,world.driveOffset?.(ss)??0).p;
  const q=world.camera.quaternion,right={x:1-2*(q.y*q.y+q.z*q.z),y:2*(q.x*q.y+q.w*q.z),z:2*(q.x*q.z-q.w*q.y)};
  const front=point(s+1),back=point(s-1),length=Math.hypot(front.x-back.x,front.y-back.y,front.z-back.z)||1,velocity={x:(front.x-back.x)/length*speed,y:(front.y-back.y)/length*speed,z:(front.z-back.z)/length*speed};
  for(const kind of ['running','horn']){
   const bus=this[kind],p=point(s-(kind==='running'?(world.playerTrain?.count??2)*10:2)),source={x:p.x,y:p.y+(kind==='horn'?3.2:.8),z:p.z},listener=world.camera.position;
   const dx=source.x-listener.x,dy=source.y-listener.y,dz=source.z-listener.z,distance=Math.hypot(dx,dy,dz),reference=kind==='horn'?180:70;
   bus.pitch=active?movingSourcePitch(source,listener,velocity):1;
   set(bus.gain.gain,active?1/(1+(distance/reference)**2):1,now,.1);
   set(bus.pan?.pan,active?clamp((dx*right.x+dy*right.y+dz*right.z)/Math.max(8,distance),-1,1):0,now,.1);
  }
  for(const [source,entry]of this.sources)this.apply(source,entry);
 }
 reset(){this.sources.clear();for(const kind of ['running','horn']){this[kind].pitch=1;set(this[kind].gain.gain,1,this.context.currentTime??0);set(this[kind].pan?.pan,0,this.context.currentTime??0);}}
 dispose(){this.reset();for(const kind of ['running','horn']){this[kind].gain.disconnect();this[kind].pan?.disconnect();}}
}
