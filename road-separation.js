import {interpolateKnots} from './track-layout.js?v=113';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function mergeRoadSpans(spans,gap=100){const out=[];for(const x of [...spans].sort((a,b)=>a.start-b.start)){const last=out.at(-1);if(last&&x.start-last.end<gap){last.end=Math.max(last.end,x.end);last.height=Math.max(last.height,x.height);}else out.push({...x});}return out;}
export function roadElevation(profile,distance){let y=profile.base;for(const span of profile.spans){const weight=Math.min(smooth((distance-span.start+100)/100),smooth((span.end+100-distance)/100));y=Math.max(y,profile.base+(span.height-profile.base)*weight);}if(profile.junctions){for(const [key,d]of[[profile.startNode,distance],[profile.endNode,profile.length-distance]]){const target=profile.junctions.get(key);if(Number.isFinite(target))y=Math.max(y,profile.base+(target-profile.base)*smooth(1-d/100));}}for(const span of profile.underpasses??[]){const weight=Math.min(smooth((distance-span.start+100)/100),smooth((span.end+100-distance)/100));y=Math.min(y,profile.base+(span.height-profile.base)*weight);}return y;}
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
   for(let step=0;step<8;step++){const rail=this.nearest(p[0],-p[1]);if(!Number.isFinite(rail.x))break;const parallel=Math.abs(dx*rail.dx+dz*rail.dz)/Math.max(.001,Math.hypot(dx,dz)*Math.hypot(rail.dx,rail.dz)),clearance=width/2+2.8;if(parallel<.85||rail.distance>=clearance-.001)break;
    const n=Math.hypot(rail.dx,rail.dz)||1,nx=-rail.dz/n,nz=rail.dx/n,side=Math.sign((p[0]-rail.x)*nx+(-p[1]-rail.z)*nz)||1;p=[p[0]+nx*side*(clearance-rail.distance),p[1]-nz*side*(clearance-rail.distance)];
   }return p;
  });
 }
 profile(row,path,crossings){const world=this.world,terrain=(world.point?.(row.s)??world.frame(row.s).p).y,base=terrain-.1,spans=[],underpasses=[],raised=row.bridge||Number(row.osmLayer)>0,underground=row.osmTunnel&&!['no','false','0'].includes(row.osmTunnel);if(raised)spans.push({start:0,end:path.length,height:terrain+6});if(underground)underpasses.push({start:0,end:path.length,height:terrain-5});
  if(!path.points?.length)return {base,terrain,spans,length:path.length};
  let i=1;for(let d=0;d<=path.length;d+=5){while(i<path.distances.length-1&&path.distances[i]<d)i++;const a=path.points[i-1],b=path.points[i],f=clamp((d-path.distances[i-1])/Math.max(.001,path.distances[i]-path.distances[i-1])),x=a[0]+(b[0]-a[0])*f,z=-(a[1]+(b[1]-a[1])*f),rail=this.nearest(x,z);
   if(rail.distance>(row.width??6)/2+2.1||rail.y-base>=3.8)continue;
   if(crossings.some(c=>Math.abs((c.sOrigin??(c.sStart+c.sEnd)/2)-rail.s)<22))continue;
   // Carry the road above the train and overhead contact wire. Short gaps stay
   // on one continuous deck; the approaches ease into the ground smoothly.
   if(raised)spans.push({start:d-10,end:d+10,height:Math.max(base,rail.y+8)});else underpasses.push({start:d-10,end:d+10,height:Math.min(base,rail.y-5)});
  }
  return {base,terrain,spans:mergeRoadSpans(spans),underpasses,length:path.length};
 }
}
