// Distances: RailLab transport/39. Performance: user supplied 701-series article.
export const STATIONS = [{name:'黒磯',s:0},{name:'高久',s:4000},{name:'黒田原',s:8200},{name:'豊原',s:13400},{name:'白坂',s:18700},{name:'新白河',s:22100}];
export const SPECS = {startAcceleration:2.1,serviceBrake:3.6,emergencyBrake:3.6,maxSpeed:110,gauge:1.067};
export function acceleration(v,notch,doors=false) {
  // v in m/s. Published starting acceleration is preserved at P5 / v=0.
  // High speed constant-power falloff, resistance and lag are prototype assumptions.
  if(doors) return v>0 ? -1:0;
  if(notch<0) return -(3.6/3.6)*Math.min(7,-notch)/7;
  const drag=v>0? .006*v+.00012*v*v:0;
  return (notch>0?(2.1/3.6)*(notch/5)*Math.min(1,45/Math.max(v*3.6,1)):0)-drag/3.6;
}
export function step(state,dt) {
  const old=state.v, a=acceleration(old,state.notch,state.doors);
  state.v=Math.max(0,Math.min(110/3.6,old+a*dt));
  state.s+=(old+state.v)*.5*dt; state.elapsed+=dt;
  return a;
}
export function stoppingDistance(kmh,brake=4){return (kmh/3.6)**2/(2*Math.max(.01,Math.min(7,brake)/7));}
export function assistBrake(state,distance){
  if(distance<stoppingDistance(state.v*3.6,4)+140)state.assistBraking=true;
  if(!state.assistBraking)return;
  if(distance<12&&state.v<.7){state.s+=distance;state.v=0;state.notch=-4;return;}
  // Follow a braking envelope. Release between applications instead of holding
  // a fixed brake to zero too far from the platform.
  const target=Math.sqrt(Math.max(0,distance-2)*2*.5);
  state.notch=state.v>target?-4:0;
}
export function newRun(){return {s:0,v:0,notch:0,doors:false,elapsed:0,next:1,served:0,missed:0,stopReady:false,dwell:0,errors:[],finished:false};}
