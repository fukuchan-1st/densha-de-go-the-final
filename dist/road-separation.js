import {interpolateKnots} from './track-layout.js?v=80';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function mergeRoadSpans(spans,gap=100){const out=[];for(const x of [...spans].sort((a,b)=>a.start-b.start)){const last=out.at(-1);if(last&&x.start-last.end<gap){last.end=Math.max(last.end,x.end);last.height=Math.max(last.height,x.height);}else out.push({...x});}return out;}
export function roadElevation(profile,distance){let y=profile.base;for(const span of profile.spans){const weight=Math.min(smooth((distance-span.start+100)/100),smooth((span.end+100-distance)/100));y=Math.max(y,profile.base+(span.height-profile.base)*weight);}if(profile.junctions){for(const [key,d]of[[profile.startNode,distance],[profile.endNode,profile.length-distance]]){const target=profile.junctions.get(key);if(Number.isFinite(target))y=Math.max(y,profile.base+(target-profile.base)*smooth(1-d/100));}}return y;}
export class RoadSeparation{
 constructor(world){this.world=world;this.grid=new Map();this.segments=[];const end=world.length;
  const lanes=s=>world.trackLayout?world.trackLayout.activeAt(s).map(t=>({x:t.x,y:t.y})):[{x:world.driveOffset?.(s)??0,y:0},...(world.route?.neighborTracks??[]).filter(t=>s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]).map(t=>({x:interpolateKnots(t.knots,s),y:t.heightKnots?interpolateKnots(t.heightKnots,s):t.height??0}))];
  for(let s=0;s<end;s+=20){if(world.structureAt?.(s,'tunnel')||world.routeStructures?.tunnelAt?.(s))continue;const next=Math.min(end,s+20),after=lanes(next);
   for(const lane of lanes(s)){const target=after.reduce((best,x)=>!best||Math.abs(x.x-lane.x)<Math.abs(best.x-lane.x)?x:best,null);if(!target||Math.abs(target.x-lane.x)>8)continue;
    const a=world.frame(s,lane.x).p.clone(),b=world.frame(next,target.x).p.clone();a.y+=lane.y+(world.deckHeight?.(s)??0);b.y+=target.y+(world.deckHeight?.(next)??0);const segment={a,b,s},index=this.segments.length;this.segments.push(segment);
    for(let x=Math.floor(Math.min(a.x,b.x)/100);x<=Math.floor(Math.max(a.x,b.x)/100);x++)for(let z=Math.floor(Math.min(a.z,b.z)/100);z<=Math.floor(Math.max(a.z,b.z)/100);z++){const key=x+':'+z;if(!this.grid.has(key))this.grid.set(key,[]);this.grid.get(key).push(index);}
   }
  }
 }
 nearest(x,z){let best={distance:Infinity};const gx=Math.floor(x/100),gz=Math.floor(z/100);for(let a=gx-1;a<=gx+1;a++)for(let b=gz-1;b<=gz+1;b++)for(const i of this.grid.get(a+':'+b)??[]){const rail=this.segments[i],dx=rail.b.x-rail.a.x,dz=rail.b.z-rail.a.z,f=clamp(((x-rail.a.x)*dx+(z-rail.a.z)*dz)/Math.max(.001,dx*dx+dz*dz)),distance=Math.hypot(x-rail.a.x-f*dx,z-rail.a.z-f*dz);if(distance<best.distance)best={distance,s:rail.s+f*20,y:rail.a.y+(rail.b.y-rail.a.y)*f};}return best;}
 profile(row,path,crossings){const world=this.world,terrain=(world.point?.(row.s)??world.frame(row.s).p).y,base=terrain+(row.bridge&&(world.deckHeight?.(row.s)??0)<1.3?6:-.1),spans=[];
  let i=1;for(let d=0;d<=path.length;d+=5){while(i<path.distances.length-1&&path.distances[i]<d)i++;const a=path.points[i-1],b=path.points[i],f=clamp((d-path.distances[i-1])/Math.max(.001,path.distances[i]-path.distances[i-1])),x=a[0]+(b[0]-a[0])*f,z=-(a[1]+(b[1]-a[1])*f),rail=this.nearest(x,z);
   if(rail.distance>(row.width??6)/2+2.1||rail.y-base>=3.8)continue;
   if(crossings.some(c=>Math.abs((c.sOrigin??(c.sStart+c.sEnd)/2)-rail.s)<22))continue;
   // Carry the road above the train and overhead contact wire. Short gaps stay
   // on one continuous deck; the approaches ease into the ground smoothly.
   spans.push({start:d-10,end:d+10,height:Math.max(base,rail.y+8)});
  }
  return {base,terrain,spans:mergeRoadSpans(spans),length:path.length};
 }
}
