export function fixedCurveValue(rows,speed){
 if(!rows.length)return null;if(rows.length===1)return rows[0][1];let index=1;while(index<rows.length-1&&speed>rows[index][0])index++;
 const a=rows[index-1],b=rows[index];return Math.abs(a[1]-b[1])<1e-8?a[1]:null;
}
export function extrapolatedPitch(points,speed,fallback=1,actualSpeed=speed){
 const rows=points.filter(([s,v])=>Number.isFinite(s)&&Number.isFinite(v)).sort((a,b)=>a[0]-b[0]);if(!rows.length)return fallback;
 const fixed=fixedCurveValue(rows,actualSpeed);if(fixed!==null)return fixed;
 if(speed<=rows[0][0])return rows[0][1];for(let i=1;i<rows.length;i++)if(speed<=rows[i][0]){const a=rows[i-1],b=rows[i];return a[1]+(b[1]-a[1])*(speed-a[0])/Math.max(.000001,b[0]-a[0]);}
 const b=rows.at(-1),a=rows.at(-2),slope=a?(b[1]-a[1])/Math.max(.000001,b[0]-a[0]):0;
 return b[1]+(speed-b[0])*Math.max(0,slope);
}
export function motorVolumeReference(table,actualSpeed,motorSpeed){
 if(motorSpeed<=actualSpeed+.01)return motorSpeed;
 const positive=table?.rows?.filter(r=>r.slice(1).some(v=>v>0))??[];return positive.length?Math.min(actualSpeed,positive.at(-1)[0]):actualSpeed;
}
// Limit the rate of audible RPM change, not its maximum pitch or train speed.
export class SlipPitchController{
 constructor(){this.excess=0;this.time=0;}
 update(actual,target,notch,dt){
  const step=Math.max(0,Math.min(.1,dt)),requested=Math.max(0,target-actual);this.time+=step;
  if(notch<=0||requested<.02){this.excess=Math.max(0,this.excess-18*step);return Math.min(actual,target)+this.excess;}
  const rise=notch<=2?2.2+notch*.6:4+notch*.6;
  this.excess+=Math.max(-14*step,Math.min(rise*step,requested-this.excess));
  const wave=notch<=2?1+.17*Math.sin(this.time*Math.PI*2/2.4):1;
  return actual+Math.max(0,this.excess*wave);
 }
 reset(){this.excess=0;this.time=0;}
}
