import {interpolateKnots} from './track-layout.js?v=107';
export const TUNNEL_FLOOR_EYE=.28;
export function tunnelRanges(world){
 const rows=world.route?.structures??world.ranges?.tunnels??world.routeStructures?.structures??[],out=[];
 for(const row of rows.filter(x=>!x.kind||x.kind==='tunnel').map(x=>({sStart:x.sStart??x.start,sEnd:x.sEnd??x.end})).filter(x=>Number.isFinite(x.sStart)&&Number.isFinite(x.sEnd)).sort((a,b)=>a.sStart-b.sStart)){
  const last=out.at(-1);if(last&&row.sStart<=last.sEnd+.5)last.sEnd=Math.max(last.sEnd,row.sEnd);else out.push({...row});
 }return out;
}
export function filmingTracks(world,s){
 const own=world.driveOffset?.(s)??0;
 if(world.trackLayout){const active=world.trackLayout.activeAt(s),height=active.find(t=>Math.abs(t.x-own)<.5)?.y??0;return [own,...active.filter(t=>Math.abs(t.y-height)<.6).map(t=>t.x)].filter((x,i,a)=>a.findIndex(y=>Math.abs(x-y)<.3)===i);}
 return [own,...(world.route?.neighborTracks??world.railTracks??[]).filter(t=>s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]&&Math.abs(t.heightKnots?.length?interpolateKnots(t.heightKnots,s):t.height??0)<.6).map(t=>interpolateKnots(t.knots,s))].filter((x,i,a)=>a.findIndex(y=>Math.abs(x-y)<.3)===i);
}
export function tunnelFilmingPlan(world,s,length,previous=null){
 const tunnel=tunnelRanges(world).find(t=>s>=t.sStart&&s-length<=t.sEnd);if(!tunnel)return null;
 const key=tunnel.sStart+':'+tunnel.sEnd,margin=Math.min(2,(tunnel.sEnd-tunnel.sStart)/4),inside=x=>Math.max(tunnel.sStart+margin,Math.min(tunnel.sEnd-margin,x));
 const keep=previous?.tunnelKey===key&&s-length<=previous.s+30&&Math.abs(s-previous.s)<Math.max(400,length+100);
 let anchor=keep?previous.s:inside(s+55),own=world.driveOffset?.(anchor)??0;
 const other=filmingTracks(world,anchor).filter(x=>Math.abs(x-own)>2.8&&Math.abs(x-own)<8).sort((a,b)=>Math.abs(a-own)-Math.abs(b-own))[0];
 const double=Number.isFinite(other);let side=-1;
 if(!double){if(!keep)anchor=inside(s+18);own=world.driveOffset?.(anchor)??0;const f=world.frame(anchor,own),target=world.frame(s-10,world.driveOffset?.(s-10)??0).p,lateral=(target.x-f.p.x)*f.right.x+(target.z-f.p.z)*f.right.z;if(Math.abs(lateral)>.002)side=-Math.sign(lateral);if(keep&&!previous.double)side=Math.sign(previous.offset-own)||side;}
 // The walkway outside the other running line is clear of both train bodies.
 // A single bore uses a low camera between the train envelope and the wall.
 return {s:anchor,kind:'tunnel',name:double?'複線トンネル・反対側':'単線トンネル・床置き',tunnelKey:key,tunnel,offset:double?other+Math.sign(other-own)*1.8:own+side*1.85,eye:double?1.68:TUNNEL_FLOOR_EYE,double};
}
export function filmingChunkIndices(s,focus,drawDistance=1500){
 const out=new Set(),chunk=Math.floor(s/500);for(let i=chunk-1;i<=chunk+Math.ceil(drawDistance/500);i++)out.add(i);
 if(Number.isFinite(focus)){const at=Math.floor(focus/500);for(let i=at-1;i<=at+1;i++)out.add(i);}
 return out;
}
