import * as T from './assets/vendor/three.module.js';
import {sampleRouteCurve} from './route-curve.js?v=39';
import {interpolateKnots} from './track-layout.js?v=79';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function segmentIntersection(a,b,c,d){
 const ux=b[0]-a[0],uz=b[1]-a[1],vx=d[0]-c[0],vz=d[1]-c[1],cross=ux*vz-uz*vx;
 if(Math.abs(cross)<1e-7)return null;const dx=c[0]-a[0],dz=c[1]-a[1],t=(dx*vz-dz*vx)/cross,u=(dx*uz-dz*ux)/cross;
 return t>=0&&t<=1&&u>=0&&u<=1?{t,u,sine:Math.abs(cross)/Math.max(.001,Math.hypot(ux,uz)*Math.hypot(vx,vz))}:null;
}
export function embankmentHeight(route,s){let y=0;for(const span of route.roadUnderpasses??[]){const weight=Math.min(smooth((s-span.start+220)/220),smooth((span.end+220-s)/220));y=Math.max(y,span.height*weight);}return y;}
export function prepareRailUnderpasses(route){
 if(route.roadUnderpassVersion===1)return route;
 const roads=route.roads??[],length=route.length??route.stations?.at(-1)?.s??0,grid=new Map(),segments=[];
 const railsAt=s=>[route.drivingTrack?interpolateKnots(route.drivingTrack,s):0,...(route.neighborTracks??[]).filter(t=>s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]).map(t=>interpolateKnots(t.knots,s))];
 const point=(s,x)=>{const p=sampleRouteCurve(route.points,s),a=sampleRouteCurve(route.points,s-2),b=sampleRouteCurve(route.points,s+2),dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz)||1;return [p[0]+dz/n*x,p[1]-dx/n*x];};
 for(let s=0;s<length;s+=20){if(route.structures?.some(t=>t.kind==='tunnel'&&s>=t.sStart&&s<=t.sEnd))continue;for(const x of railsAt(s)){const a=point(s,x),b=point(Math.min(length,s+20),x),index=segments.push({a,b,s})-1;for(let gx=Math.floor(Math.min(a[0],b[0])/100);gx<=Math.floor(Math.max(a[0],b[0])/100);gx++)for(let gz=Math.floor(Math.min(a[1],b[1])/100);gz<=Math.floor(Math.max(a[1],b[1])/100);gz++){const key=gx+':'+gz;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(index);}}}
 const spans=[];
 for(const road of roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],candidates=new Set();
  // Query only cells traversed by the road, rather than its entire bounding box.
  const steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/50);for(let j=0;j<=steps;j++){const f=j/Math.max(1,steps),gx=Math.floor((a[0]+(b[0]-a[0])*f)/100),gz=Math.floor((a[1]+(b[1]-a[1])*f)/100);for(let x=gx-1;x<=gx+1;x++)for(let z=gz-1;z<=gz+1;z++)for(const n of grid.get(x+':'+z)??[])candidates.add(n);}
  for(const n of candidates){const segment=segments[n],hit=segmentIntersection(segment.a,segment.b,a,b);if(!hit||hit.sine<.2)continue;const s=segment.s+hit.t*20;
   if(route.structures?.some(c=>c.kind==='crossing'&&Math.abs((c.sOrigin??(c.sStart+c.sEnd)/2)-s)<30))continue;
   if(route.elevatedTrack&&interpolateKnots(route.elevatedTrack,s)>=4.7)continue;
   const half=(road.width??6)/2/hit.sine+5;spans.push({start:s-half,end:s+half,height:6,roadWidth:road.width??6,s});
  }
 }
 const merged=[];for(const span of spans.sort((a,b)=>a.start-b.start)){const last=merged.at(-1);if(last&&span.start-last.end<100){last.end=Math.max(last.end,span.end);const opening=last.passages.at(-1);if(span.start<=opening.end)opening.end=Math.max(opening.end,span.end);else last.passages.push({...span});}else merged.push({...span,passages:[{...span}]});}
 const result={...route,roadUnderpasses:merged,roadUnderpassVersion:1};
 if(merged.length){const knots=[];for(let s=-300;s<=length+320;s+=10)knots.push([s,Math.max(route.elevatedTrack?interpolateKnots(route.elevatedTrack,s):0,embankmentHeight(result,s))]);result.elevatedTrack=knots;}
 return result;
}
export function addRailEmbankment(world,group,start,end,envelope){
 const route=world.route??world.roadRailRoute;if(!route?.roadUnderpasses?.length)return;
 const position=[],indices=[],basePoint=s=>world.point(s),offsetPoint=(s,x,y)=>{const f=world.frame(s,x),base=basePoint(s);return [f.p.x,base.y+y,f.p.z];};
 for(let a=start;a<end;a+=5){const b=Math.min(end,a+5),mid=(a+b)/2,h=embankmentHeight(route,mid);if(h<.08)continue;
  const under=route.roadUnderpasses.some(span=>span.passages.some(p=>mid>=p.start&&mid<=p.end));
  const quad=(points)=>{const k=position.length/3;for(const p of points)position.push(...p);indices.push(k,k+1,k+2,k,k+2,k+3);};
  const [left,right]=envelope(mid),topLeft=left-3.6,topRight=right+3.6,ha=world.deckHeight?.(a)??embankmentHeight(route,a),hb=world.deckHeight?.(b)??embankmentHeight(route,b);
  if(!under){for(const [x,sign]of [[topLeft,-1],[topRight,1]])quad([offsetPoint(a,x,ha-.1),offsetPoint(b,x,hb-.1),offsetPoint(b,x+sign*hb*1.6,-.15),offsetPoint(a,x+sign*ha*1.6,-.15)]);}
  else{
   if(world.frameIncludesDeck)world.cube(group,mid,(topLeft+topRight)/2,h-.85,topRight-topLeft,.65,b-a+.05,'#92948b');
   // An open concrete box under the railway leaves the road and both car lanes
   // clear. Earth slopes stop at each portal; they never fill the road opening.
   for(const side of [-1,1]){const s=side<0?a:b;if(route.roadUnderpasses.some(span=>span.passages.some(p=>Math.abs(s-(side<0?p.start:p.end))<2.6))){const y=side<0?ha:hb;world.cube?.(group,s,(topLeft+topRight)/2,0,topRight-topLeft+y*3.2,y-.85,.35,'#92948b');}}
  }
 }
 if(position.length){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#807957',roughness:1,side:T.DoubleSide}));mesh.userData.shadowCaster=true;mesh.userData.disposeWithChunk=true;group.add(mesh);}
}
