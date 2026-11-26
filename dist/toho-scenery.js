import {sceneryDensity} from './scenery-profile.js?v=118';
import {districtAt} from './toho-biomes.js?v=118';
import * as T from './assets/vendor/three.module.js?v=118';
export const isToho=route=>route.id?.startsWith('toho');
const terrainIndexes=new WeakMap();
// A hillside belonging to a nearby bend must not cover another piece of track.
export function tohoTerrainHeight(route,p,height){
 if(!isToho(route)||height<=-.25)return height;
 let grid=terrainIndexes.get(route);
 if(!grid){grid=new Map();const points=route.points??[];for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],segment=[a[1],-a[2],b[1],-b[2]];
  for(let x=Math.floor((Math.min(a[1],b[1])-110)/128);x<=Math.floor((Math.max(a[1],b[1])+110)/128);x++)for(let z=Math.floor((Math.min(-a[2],-b[2])-110)/128);z<=Math.floor((Math.max(-a[2],-b[2])+110)/128);z++){const key=x+':'+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(segment);}
 }terrainIndexes.set(route,grid);}
 let distance=Infinity;for(const [ax,az,bx,bz]of grid.get(Math.floor(p.x/128)+':'+Math.floor(p.z/128))??[]){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.z-az)*dz)/(dx*dx+dz*dz||1)));distance=Math.min(distance,Math.hypot(p.x-ax-t*dx,p.z-az-t*dz));}
 const t=Math.max(0,Math.min(1,(distance-45)/55)),blend=t*t*(3-2*t);return -.25+(height+.25)*blend;
}
export function villageAt(route,s){
 if(route.id==='toho-village')return true;
 if(route.id==='toho-center')return (route.sceneryStations??route.stations).some(st=>st.name==='人里'&&Math.abs(s-st.s)<200);
 if(route.id!=='toho')return false;
 const stations=route.sceneryStations??route.stations,a=stations.find(x=>x.name==='霧雨'),b=stations.find(x=>x.name==='命蓮寺');
 return !!a&&!!b&&s>=Math.min(a.s,b.s)-150&&s<=Math.max(a.s,b.s)+150;
}
export function woodMaterial(variant=0){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
 c.fillStyle=['#947052','#b49a75','#a1825e','#d1bd94','#79654f'][variant%5];c.fillRect(0,0,128,128);
 for(let y=0;y<128;y+=8){c.fillStyle=y%16?'#4c382950':'#e3c39530';c.fillRect(0,y,128,1);}
 c.fillStyle='#3b2b20';for(const x of [0,42,84,124])c.fillRect(x,0,4,128);for(const y of [0,63,124])c.fillRect(0,y,128,4);
 c.fillStyle='#b7af89';c.fillRect(10,28,25,30);c.fillRect(92,28,25,30);
 c.fillStyle='#392b23';for(let x=10;x<36;x+=5)c.fillRect(x,28,2,30);for(let x=92;x<118;x+=5)c.fillRect(x,28,2,30);
 c.fillRect(49,76,29,52);c.fillStyle='#b3a781';c.fillRect(53,80,21,42);c.fillStyle='#392b23';for(let x=54;x<75;x+=5)c.fillRect(x,80,2,42);
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map,roughness:1});
}
export function addTohoHouses(world,group,start,end,envelope,random){
 const houses=[],roofs=[],posts=[],beams=[];
 for(let s=Math.ceil(start/17)*17;s<end;s+=17){
  if(world.structureAt(s,'tunnel'))continue;
  const dense=villageAt(world.route,s);if(!dense)continue;
  const edges=envelope(s);
  for(const side of [-1,1])for(let row=0;row<(dense?(world.quality==='light'?2:3):1);row++){
   const district=districtAt(world.route,s);if(side===(world.route.reverseDirection?-1:1)&&district?.landmark&&district.distance<160)continue;
   if(random()>sceneryDensity(world.route,s).building/100)continue;
   const w=7+random()*4,d=8+random()*3,h=3.8+random()*2,x=edges[side<0?0:1]+side*(14+row*17+random()*3),ss=s+(random()-.5)*4;
   if(world.roadScenery&&!world.roadScenery.buildingClear(ss,x,w+2,d+2))continue;
   houses.push({s:ss,x,y:0,w,h,d});roofs.push({s:ss,x,y:h,w:w+2,h:2,d:d+2});
   for(const dx of [-w/2,w/2])posts.push({s:ss-d/2-.35,x:x+dx,y:0,w:.22,h:h+.25,d:.25});
   beams.push({s:ss-d/2-.35,x,y:h-.2,w:w+1,h:.3,d:.3});
  }
 }
 for(let i=0;i<5;i++)world.instances(group,houses.filter((_,n)=>n%5===i),'toho-wood:'+i);
 world.instances(group,roofs,'#4c4c47',world.houseRoof);world.instances(group,posts,'#403329');world.instances(group,beams,'#403329');
}
