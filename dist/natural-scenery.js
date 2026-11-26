import * as T from './assets/vendor/three.module.js?v=118';
import {naturalHeight,pointInArea,segmentDistance,terrainRowAt} from './natural-data.js?v=118';
import {interpolateKnots} from './track-layout.js?v=118';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const rings=f=>Array.isArray(f.points?.[0]?.[0])?f.points:[f.points??[]];
const covers=(f,x,z)=>{const r=rings(f);return r[0].length>=3&&pointInArea(x,z,r[0])&&!r.slice(1).some(h=>pointInArea(x,z,h));};
const near=(f,a,b)=>f.sStart<=b+200&&f.sEnd>=a-200;
export function groundAt(world,s,x,z){
 const frame=world.frame(s),offset=(x-frame.p.x)*frame.right.x+(-z-frame.p.z)*frame.right.z;
 const raw=naturalHeight(world.route,s,offset)??frame.p.y,h=world.route.bveGroundClearance?.length?interpolateKnots(world.route.bveGroundClearance,s):0;return h>1?Math.min(raw,raw+(frame.p.y-h-raw)*(1-smooth((Math.abs(offset)-35)/85))):raw;
}
export class NaturalScenery{
 constructor(world){this.world=world;this.data=world.route.naturalFeatures;this.enabled=!!this.data?.terrain?.rows?.length;this.waters=new Map();this.waterMaterial=new T.MeshStandardMaterial({color:'#3c8c9a',metalness:.35,roughness:.22,transparent:true,opacity:.94,side:T.DoubleSide});this.waterMaterial.userData.naturalWater=true;}
 waterAt(x,z,lines,areas){for(const f of areas)if(covers(f,x,z)){const p=rings(f)[0];return p.reduce((n,v)=>n+v[2],0)/p.length;}
  let height=null;for(const f of lines)for(let i=1;i<f.points.length;i++){const d=segmentDistance(x,z,f.points[i-1],f.points[i]);if(d.distance<(f.renderWidth??f.width??8)/2+2)height=height==null?d.height:Math.min(height,d.height);}return height;
 }
 clearHeight(x,z,y,s){const world=this.world,rail=world.roadScenery.separation.nearest(x,-z),h=world.route.bveGroundClearance?.length?interpolateKnots(world.route.bveGroundClearance,rail.s??s):0;if(rail.distance<120&&!world.structureAt(rail.s,'bridge')){const weight=smooth((rail.distance-40)/80);y=(rail.y-Math.max(.23,h))*(1-weight)+y*weight;}if(rail.distance<8)y=Math.min(y,rail.y-Math.max(.23,h));return y;}
 add(group,start,end){
  if(!this.enabled)return;const world=this.world,data=this.data,lines=data.waterLines.filter(f=>near(f,start,end)),areas=data.waterAreas.filter(f=>near(f,start,end)),land=data.landAreas.filter(f=>near(f,start,end));
  const rows=[terrainRowAt(data,start),...data.terrain.rows.filter(r=>r[0]>start&&r[0]<end),terrainRowAt(data,end)],positions=[],colors=[],uv=[],indices=[],width=data.terrain.offsets.length;
  for(let j=0;j<rows.length;j++)for(let i=0;i<width;i++){
   const row=rows[j],[x,z,raw,valid]=row[3][i];let y=valid&&Number.isFinite(raw)?raw:row[1]-.23;y=this.clearHeight(x,z,y,row[0]);const water=this.waterAt(x,z,lines,areas);if(water!=null)y=Math.min(y,water-.4);
   positions.push(x,y,-z);uv.push(x/12,z/12);const area=land.find(f=>covers(f,x,z)),kind=area?.kind??'',color=new T.Color(/wood|forest|scrub/.test(kind)?'#496b46':/farm|meadow|grass|orchard/.test(kind)?'#83965b':'#7a8b65');const shade=.9+.1*Math.sin(x*.017+z*.011);color.multiplyScalar(shade);colors.push(color.r,color.g,color.b);
   if(j&&i){const b=j*width+i,a=b-width-1;indices.push(a,a+1,b-1,a+1,b,b-1);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,world.mat('#869177'));mesh.name='GSI cross-corridor terrain';group.add(mesh);
  for(const f of lines)this.retainWater(group,f,false);
  for(const f of areas)this.retainWater(group,f,true);
  this.addTrees(group,start,end,land);
  this.addDecks(group,start,end);
 }
 addDecks(group,start,end){const world=this.world,knots=world.route.bveGroundClearance;if(!knots?.length)return;for(let a=start;a<end;a+=12){const d=Math.min(12,end-a),s=a+d/2,h=interpolateKnots(knots,s);if(h<1.3||world.structureAt(s,'tunnel'))continue;const railOffsets=[world.driveOffset(s),...(world.route.neighborTracks??[]).filter(t=>s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]).map(t=>interpolateKnots(t.knots,s))],left=Math.min(...railOffsets)-2,right=Math.max(...railOffsets)+2;world.cube(group,s,(left+right)/2,-.8,right-left,.55,d+.08,'#92948b');if(Math.floor(a/12)%3===0)for(const x of [left+.7,right-.7])world.cube(group,s,x,-h,.85,h-.8,1,'#a5a69b');}}
 surface(p,s){const rail=this.world.roadScenery.separation.nearest(p[0],-p[1]);return Math.min(p[2]+.12,rail.distance<120?rail.y-1.5:Infinity);}
 addLine(group,f){const positions=[],uv=[],indices=[],w=(f.renderWidth??f.width??8)/2;
  for(let i=0;i<f.points.length;i++){const p=f.points[i],a=f.points[Math.max(0,i-1)],b=f.points[Math.min(f.points.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.hypot(dx,dz)||1,y=this.surface(p,f.sStart);for(const side of [-1,1]){positions.push(p[0]-dz/n*w*side,y,-(p[1]+dx/n*w*side));uv.push(side,i);}if(i){const j=i*2;indices.push(j-2,j-1,j,j-1,j+1,j);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new T.Mesh(g,this.waterMaterial);mesh.name=f.name||'Mapped waterway';group.add(mesh);
 }
 addArea(group,f){const contours=rings(f).map(r=>r.length>1&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1]?r.slice(0,-1):r),shape=contours[0].map(p=>new T.Vector2(p[0],p[1])),holes=contours.slice(1).map(r=>r.map(p=>new T.Vector2(p[0],p[1]))),triangles=T.ShapeUtils.triangulateShape(shape,holes),all=contours.flat();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(all.flatMap(p=>[p[0],this.surface(p,f.sStart),-p[1]]),3));g.setIndex(triangles.flat());g.computeVertexNormals();const mesh=new T.Mesh(g,this.waterMaterial);mesh.name=f.name||'Mapped lake or river area';group.add(mesh);}
 retainWater(group,feature,area){let entry=this.waters.get(feature);if(!entry){const object=new T.Group();if(area)this.addArea(object,feature);else this.addLine(object,feature);this.world.scene.add(object);entry={object,refs:0};this.waters.set(feature,entry);}entry.refs++;(group.userData.naturalWater??=[]).push(feature);}
 release(group){for(const f of group.userData.naturalWater??[]){const entry=this.waters.get(f);if(entry&&--entry.refs===0){this.world.scene.remove(entry.object);entry.object.traverse(o=>o.geometry?.dispose());this.waters.delete(f);}}delete group.userData.naturalWater;}
 addTrees(group,start,end,land){const world=this.world,trees=[];for(let s=Math.ceil(start/42)*42;s<end;s+=42)for(const side of [-1,1])for(const offset of(world.quality==='light'?[200,500]:[160,280,450,700])){const f=world.frame(s,offset*side),x=f.p.x,z=-f.p.z;if(!land.some(a=>/forest|wood|scrub/.test(a.kind??'')&&covers(a,x,z)))continue;trees.push({s,x:offset*side,y:(naturalHeight(world.route,s,offset*side)??f.p.y)-world.point(s).y,h:7+3*Math.abs(Math.sin(s)),variant:2,rotation:s%6});}world.trees.add(group,trees);}
 dispose(){for(const {object}of this.waters.values()){this.world.scene.remove(object);object.traverse(o=>o.geometry?.dispose());}this.waters.clear();this.waterMaterial.dispose();}
}
