import {interpolateKnots} from './track-layout.js?v=80';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function mergeRoadSpans(spans,gap=100){const out=[];for(const x of [...spans].sort((a,b)=>a.start-b.start)){const last=out.at(-1);if(last&&x.start-last.end<gap){last.end=Math.max(last.end,x.end);last.height=Math.max(last.height,x.height);}else out.push({...x});}return out;}
export function roadElevation(profile,distance){let y=profile.base;for(const span of profile.spans){const weight=Math.min(smooth((distance-span.start+100)/100),smooth((span.end+100-distance)/100));y=Math.max(y,profile.base+(span.height-profile.base)*weight);}if(profile.junctions){for(const [key,d]of[[profile.startNode,distance],[profile.endNode,profile.length-distance]]){const target=profile.junctions.get(key);if(Number.isFinite(target))y=Math.max(y,profile.base+(target-profile.base)*smooth(1-d/100));}}return y;}
export class RoadSeparation{
 constructor(world){this.world=world;this.grid=new Map();this.segments=[];const end=world.length;
  const lanes=s=>world.trackLayout?world.trackLayout.activeAt(s).map(t=>({x:t.x,y:t.y})):[{x:world.driveOffset?.(s)??0,y:0},...(world.route?.neighborTracks??[]).filter(t=>s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]).map(t=>({x:interpolateKnots(t.knots,s),y:t.heightKnots?interpolateKnots(t.heightKnots,s):t.height??0}))];
  for(let s=0;s<end;s+=20){if(world.structureAt?.(s,'tunnel')||world.routeStructures?.tunnelAt?.(s))continue;const next=Math.min(end,s+20),after=lanes(next);
   for(const lane of lanes(s)){const target=after.reduce((best,x)=>!best||Math.abs(x.x-lane.x)<Math.abs(best.x-lane.x)?x:best,null);if(!target||Math.abs(target.x-lane.x)>8)continue;
    const a=world.frame(s,lane.x).p.clone(),b=world.frame(next,target.x).p.clone();a.y+=lane.y+(world.frameIncludesDeck?0:world.deckHeight?.(s)??0);b.y+=target.y+(world.frameIncludesDeck?0:world.deckHeight?.(next)??0);const segment={a,b,s},index=this.segments.length;this.segments.push(segment);
    for(let x=Math.floor(Math.min(a.x,b.x)/100);x<=Math.floor(Math.max(a.x,b.x)/100);x++)for(let z=Math.floor(Math.min(a.z,b.z)/100);z<=Math.floor(Math.max(a.z,b.z)/100);z++){const key=x+':'+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(index);}
   }
  }
 }
 nearest(x,z){let best={distance:Infinity};const gx=Math.floor(x/100),gz=Math.floor(z/100);for(let a=gx-1;a<=gx+1;a++)for(let b=gz-1;b<=gz+1;b++)for(const i of this.grid.get(a+':'+b)??[]){const rail=this.segments[i],dx=rail.b.x-rail.a.x,dz=rail.b.z-rail.a.z,f=clamp(((x-rail.a.x)*dx+(z-rail.a.z)*dz)/Math.max(.001,dx*dx+dz*dz)),distance=Math.hypot(x-rail.a.x-f*dx,z-rail.a.z-f*dz);if(distance<best.distance)best={distance,s:rail.s+f*20,y:rail.a.y+(rail.b.y-rail.a.y)*f,x:rail.a.x+f*dx,z:rail.a.z+f*dz,dx,dz};}return best;}
 separateParallel(points,width=6){
  return points.map((original,i)=>{let p=[...original];const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dz=-(b[1]-a[1]);
   for(let step=0;step<8;step++){const rail=this.nearest(p[0],-p[1]);if(!Number.isFinite(rail.x))break;const parallel=Math.abs(dx*rail.dx+dz*rail.dz)/Math.max(.001,Math.hypot(dx,dz)*Math.hypot(rail.dx,rail.dz)),earth=(this.world.route??this.world.roadRailRoute)?.roadUnderpasses?.length?(this.world.deckHeight?.(rail.s)??0)*1.6:0,clearance=width/2+(earth?3.6:2.8)+earth;if(parallel<.85||rail.distance>=clearance-.001)break;
    const n=Math.hypot(rail.dx,rail.dz)||1,nx=-rail.dz/n,nz=rail.dx/n,side=Math.sign((p[0]-rail.x)*nx+(-p[1]-rail.z)*nz)||1;p=[p[0]+nx*side*(clearance-rail.distance),p[1]-nz*side*(clearance-rail.distance)];
   }return p;
  });
 }
 profile(row,path,crossings){
  const world=this.world,terrain=world.terrainHeightAt?.(row.s)??(world.point?.(row.s)??world.frame(row.s).p).y;
  // Mapped roads stay on the ground. Rail/road intersections are handled by
  // the rail embankment, rather than lifting long stretches of parallel road.
  const bridge=!!row.bridge&&!!row.explicitRoadBridge;
  const base=terrain+(bridge?6:-.1),spans=[];
  // Preserve working level crossings when a nearby underpass raises the railway.
  // Only the short crossing approach climbs; parallel roads remain at ground level.
  for(const c of crossings??[]){const cs=c.sOrigin??(c.sStart+c.sEnd)/2,height=world.deckHeight?.(cs)??0;if(height<.1||!path.points)continue;
   const f=world.frame(cs,world.driveOffset?.(cs)??0).p;let best={distance:Infinity};
   for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((f.x-a[0])*dx+(-f.z-a[1])*dz)/Math.max(.001,dx*dx+dz*dz)),distance=Math.hypot(f.x-a[0]-t*dx,-f.z-a[1]-t*dz);if(distance<best.distance)best={distance,along:path.distances[i-1]+t*(path.distances[i]-path.distances[i-1]),sine:Math.abs(dx)/Math.max(.001,Math.hypot(dx,dz))};}
   if(best.distance<(row.width??6)/2+1)spans.push({start:best.along-14,end:best.along+14,height:f.y+(world.frameIncludesDeck?0:height)+.06});
  }
  return {base,terrain,spans,length:path.length};
 }
}
