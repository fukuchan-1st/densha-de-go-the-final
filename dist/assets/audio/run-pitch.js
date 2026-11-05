// BVE rolling sounds default to the recording's original pitch at 90 km/h.
export function runPitch(speedKmh,baseSpeedKmh=90){
 const speed=Number.isFinite(speedKmh)?Math.abs(speedKmh):0;
 const base=Number.isFinite(baseSpeedKmh)&&baseSpeedKmh>0?baseSpeedKmh:90;
 return Math.max(.35,speed/base);
}
