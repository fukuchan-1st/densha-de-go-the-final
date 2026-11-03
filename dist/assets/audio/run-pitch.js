// BVE-style rolling sounds use the recording's original pitch at 90 km/h.
export function runPitch(speedKmh){
 return Math.max(.35,speedKmh/90);
}
