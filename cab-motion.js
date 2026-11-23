const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Visual approximation of a sprung train body, independent of train physics.
export function runningMotion({s=0,speed=0,time=0,curvature=0,acceleration=0}={}){
 const moving=clamp((speed-.12)/16,0,1),curve=clamp(curvature*speed*speed*.004,-.025,.025);
 return {
  lateral:moving*(.023*Math.sin(s*.17+time*.65)+.009*Math.sin(s*.041-time*1.8)),
  vertical:moving*(.012*Math.sin(s*.77)+.006*Math.sin(s*.24+time*.8)),
  yaw:moving*(.00065*Math.sin(s*.083)+.0003*Math.sin(time*2.3+s*.027)),
  pitchTarget:clamp(acceleration,-1.5,1.5)*.0032,
  pitchRipple:moving*.0011*Math.sin(s*.31+time*.6),
  rollTarget:-curve,
  rollRipple:moving*(.0018*Math.sin(s*.11-time*.8)+.0006*Math.sin(s*.47))
 };
}
export class CabSuspension {
 constructor(){this.clock=0;this.pitch=0;this.pitchVelocity=0;this.roll=0;this.rollVelocity=0;}
 update(input,dt=1/60,amount=1){
  const elapsed=clamp(dt,0,.1);this.clock+=elapsed;const m=runningMotion({...input,time:this.clock});let remaining=elapsed;
  while(remaining>0){const step=Math.min(1/120,remaining);this.pitchVelocity+=((m.pitchTarget-this.pitch)*36-this.pitchVelocity*8.4)*step;this.pitch+=this.pitchVelocity*step;this.rollVelocity+=((m.rollTarget-this.roll)*25-this.rollVelocity*8)*step;this.roll+=this.rollVelocity*step;remaining-=step;}
  const scale=clamp(amount,0,1.5);
  return {lateral:m.lateral*scale,vertical:m.vertical*scale,yaw:m.yaw*scale,pitch:clamp(this.pitch+m.pitchRipple,-.012,.012)*scale,roll:clamp(this.roll+m.rollRipple,-.03,.03)*scale};
 }
}
