// Distances: RailLab transport/39. Performance: user supplied 701-series article.
import {STATIONS} from './route-data.js?v=9';
export {STATIONS};
export const SPECS = {startAcceleration:2.1,serviceBrake:3.6,emergencyBrake:3.6,maxSpeed:110,gauge:1.067};
export function acceleration(v,notch,doors=false,gradePerMille=0) {
  // v in m/s. Published starting acceleration is preserved at P5 / v=0.
  // High speed constant-power falloff, resistance and lag are prototype assumptions.
  if(doors) return v>0 ? -1:0;
  const slope=-9.80665*gradePerMille/Math.sqrt(1000000+gradePerMille*gradePerMille);
  if(notch<0) return -(3.6/3.6)*Math.min(7,-notch)/7+slope;
  const drag=v>0? .006*v+.00012*v*v:0;
  return (notch>0?(2.1/3.6)*(notch/5)*Math.min(1,45/Math.max(v*3.6,1)):0)-drag/3.6+slope;
}
export function step(state,dt,gradePerMille=0) {
  const old=state.v, a=acceleration(old,state.notch,state.doors,gradePerMille);
  state.v=Math.max(0,Math.min(110/3.6,old+a*dt));
  state.s+=(old+state.v)*.5*dt; state.elapsed+=dt;
  return a;
}
export function stoppingDistance(kmh,brake=4,gradePerMille=0){return (kmh/3.6)**2/(2*Math.max(.05,Math.min(7,brake)/7+9.80665*gradePerMille/1000));}
export function assistBrake(state,distance,gradePerMille=0){
  // Use a fixed conservative envelope: local grade changes must not suddenly
  // raise the target speed near a station. B4 still has >0.47 m/s² on -10‰.
  const envelopeDecel=.35;
  if(distance<state.v*state.v/(2*envelopeDecel)+30)state.assistBraking=true;
  if(!state.assistBraking)return;
  if(Math.abs(distance)<=10&&state.v<.7){state.s+=distance;state.v=0;state.notch=-4;return;}
  // Follow a braking envelope. Release between applications instead of holding
  // a fixed brake to zero too far from the platform.
  const target=Math.sqrt(Math.max(0,distance-2)*2*envelopeDecel);
  state.notch=distance<0?-7:state.v>target?-4:0;
}
export function notchDeltaForKey(code){if(code==='KeyS'||code==='ArrowDown')return 1;if(code==='KeyW'||code==='ArrowUp')return -1;return 0;}
export function newRun(){return {s:0,v:0,notch:0,doors:false,elapsed:0,next:1,served:0,missed:0,stopReady:false,dwell:0,errors:[],finished:false};}
