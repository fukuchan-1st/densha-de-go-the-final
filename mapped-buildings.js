import {stationBuildingClear} from './station-space.js?v=117';
import * as T from './assets/vendor/three.module.js?v=117';
import {interpolateKnots} from './track-layout.js?v=117';
import {residentialAllowed} from './yamagata-mountain.js?v=117';
import {estimateBuildingHeight} from './building-estimate.js?v=117';
const pending=new Map(),grids=new WeakMap();let districtPending;
const fictional=route=>route.id==='toho'||route.id?.startsWith('toho-');
function point(points,s){let lo=0,hi=points.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(points[m][0]<=s)lo=m;else hi=m;}const a=points[lo],b=points[hi],t=(s-a[0])/(b[0]-a[0]);return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
export function decodeBuildingRows(route,rows){return rows.map(([ss,dx,dz,w,d,a,h,estimated])=>{const s=ss/10,p=point(route.points,s);return [s,p[0]+dx/10,p[1]+dz/10,w/10,d/10,a/1000,estimateBuildingHeight(route,s,w/10,d/10,h/10,Boolean(estimated))];});}
export async function loadMappedBuildings(route){
 if(Array.isArray(route.mappedBuildings)||fictional(route)||!route.id||!route.points?.length)return route;
 const id=route.id;if(!pending.has(id))pending.set(id,(async()=>{const response=await fetch(`./assets/buildings/${id}.json.gz?v=105`);if(!response.ok)throw Error('建物の位置データを読み込めません');const bytes=new Uint8Array(await response.arrayBuffer());return bytes[0]===31&&bytes[1]===139?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));})().catch(error=>{pending.delete(id);throw error;}));
 const data=await pending.get(id);let decoded=decodeBuildingRows(route,data.rows);
 if(['chuo','chuo-extended','yamanote'].includes(id)){districtPending??=fetch('./assets/buildings/shinjuku-district111.json.gz').then(async r=>{if(!r.ok)throw Error('新宿の建物データを読み込めません');const bytes=new Uint8Array(await r.arrayBuffer());return bytes[0]===31?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));});const district=await districtPending,extra=decodeBuildingRows(route,district.routes[id==='yamanote'?'yamanote':'chuo']),buckets=new Map();for(const row of decoded){const k=Math.floor(row[1]/3)+':'+Math.floor(row[2]/3);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(row);}for(const row of extra){let duplicate=false;const x=Math.floor(row[1]/3),z=Math.floor(row[2]/3);for(let a=x-1;a<=x+1;a++)for(let b=z-1;b<=z+1;b++)if((buckets.get(a+':'+b)??[]).some(r=>Math.hypot(r[1]-row[1],r[2]-row[2])<2&&Math.abs(r[3]-row[3])<3&&Math.abs(r[4]-row[4])<3))duplicate=true;if(!duplicate)decoded.push(row);}decoded.sort((a,b)=>a[0]-b[0]);}
 return {...route,mappedBuildings:decoded,mappedBuildingSource:data.source,mappedBuildingBuffer:data.bufferM};
}
function hits(a,b,w,d){let lo=0,hi=1;for(const [k,half] of [[0,w/2],[1,d/2]]){const delta=b[k]-a[k];if(Math.abs(delta)<1e-9){if(Math.abs(a[k])>half)return false;continue;}let x=(-half-a[k])/delta,y=(half-a[k])/delta;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return false;}return true;}
function railGrid(world){
 if(grids.has(world))return grids.get(world);const grid=new Map(),tracks=world.railTracks??world.trackLayout?.tracks??[];
 for(const rail of tracks){const knots=rail.knots;if(!knots?.length)continue;const start=Math.max(-300,knots[0][0]),end=Math.min(world.length+300,knots.at(-1)[0]);let before;
  for(let s=start;;s=Math.min(end,s+10)){const p=world.frame(s,interpolateKnots(knots,s)).p,now=[p.x,-p.z];if(before){for(let x=Math.floor((Math.min(before[0],now[0])-3)/80);x<=Math.floor((Math.max(before[0],now[0])+3)/80);x++)for(let z=Math.floor((Math.min(before[1],now[1])-3)/80);z<=Math.floor((Math.max(before[1],now[1])+3)/80);z++){const key=x+':'+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push([before,now]);}}before=now;if(s===end)break;}
 }grids.set(world,grid);return grid;
}
export function mappedBuildingClear(world,row){
 const [s,x,z,w,d,angle]=row;if(!residentialAllowed(world.route??world.sceneryRoute,s,Math.hypot(w,d)))return false;
 const grid=railGrid(world),radius=Math.hypot(w,d)/2+3,c=Math.cos(angle),sn=Math.sin(angle),local=p=>{const dx=p[0]-x,dz=p[1]-z;return [c*dx+sn*dz,-sn*dx+c*dz];};
 for(let gx=Math.floor((x-radius)/80);gx<=Math.floor((x+radius)/80);gx++)for(let gz=Math.floor((z-radius)/80);gz<=Math.floor((z+radius)/80);gz++)for(const [a,b]of grid.get(gx+':'+gz)??[])if(hits(local(a),local(b),w+5,d+5))return false;
 const f=world.frame(s),offset=(x-f.p.x)*f.right.x+(-z-f.p.z)*f.right.z,relative=angle-f.angle,ww=Math.abs(Math.cos(relative))*w+Math.abs(Math.sin(relative))*d,dd=Math.abs(Math.sin(relative))*w+Math.abs(Math.cos(relative))*d;
 if(!stationBuildingClear(world,s,offset,ww,dd))return false;
 return world.roadScenery?.buildingClear(s,offset,ww,dd)??true;
}
export function addMappedBuildings(world,group,start,end){
 const rows=world.route?.mappedBuildings??world.sceneryRoute?.mappedBuildings;if(!rows)return;
 let lo=0,hi=rows.length;while(lo<hi){const m=(lo+hi)>>1;if(rows[m][0]<start)lo=m+1;else hi=m;}
 const bins=new Map();for(let i=lo;i<rows.length&&rows[i][0]<end;i++){const row=rows[i];if(!mappedBuildingClear(world,row))continue;const key=(row[6]>9?'office:':'house:')+(Math.abs(Math.round(row[1]*7+row[2]*11))%8);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(row);}
 for(const [key,items]of bins){const material=world.mat('facade:'+key),mesh=new T.InstancedMesh(world.box,material,items.length),o=new T.Object3D();for(let i=0;i<items.length;i++){const [s,x,z,w,d,angle,h]=items[i],base=world.point?world.point(s).y:world.frame(s).p.y;o.position.set(x,base+h/2,-z);o.rotation.set(0,angle,0);o.scale.set(w,h,d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);}mesh.computeBoundingSphere();mesh.userData.shadowCaster=true;group.add(mesh);}
}
