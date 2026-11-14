// A car is a rigid body resting on its two bogies, including on viaduct ramps.
export function setRailPose(car,front,rear){
 const dx=front.x-rear.x,dy=front.y-rear.y,dz=front.z-rear.z;
 car.position.copy(front).add(rear).multiplyScalar(.5);
 car.rotation.order='YXZ';car.rotation.set(-Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(dx,dz),0);
}
