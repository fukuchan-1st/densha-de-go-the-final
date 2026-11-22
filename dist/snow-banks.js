import * as T from './assets/vendor/three.module.js?v=107';
import {snowCover} from './weather-operations.js?v=107';
import {stationBuildingClear} from './station-space.js?v=107';
import {interpolateKnots} from './track-layout.js?v=107';
const random=(i,k)=>{const n=Math.sin(i*127.1+k*311.7)*43758.5453;return n-Math.floor(n);};
export function snowBankShape(cover,seed=0){const scale=Math.max(0,(cover-.12)/.84);return {height:.22+scale*(3.2+seed*3.1),width:1.6+scale*(4+seed*3),depth:1.8+scale*(3+seed*3)};}
export class SnowBanks{
 constructor(world){this.world=world;this.geometry=new T.SphereGeometry(1,12,7,0,Math.PI*2,0,Math.PI/2);this.material=new T.MeshStandardMaterial({color:'#eef4fa',roughness:.98});this.mesh=new T.InstancedMesh(this.geometry,this.material,100);this.mesh.count=0;this.mesh.name='ploughed-snow-banks';this.mesh.receiveShadow=true;this.mesh.castShadow=true;world.scene.add(this.mesh);}
 update(s,type){
  const enabled=['settledSnow','heavySnow'].includes(type);this.mesh.visible=enabled;if(!enabled){this.key=null;return;}
  const key=type+':'+Math.floor(s/100)+':'+this.world.quality;if(key===this.key)return;this.key=key;
  const world=this.world,route=world.route??world.sceneryRoute??{},range=Math.min(world.drawDistance??900,1100),start=Math.floor((s-range)/55),end=Math.ceil((s+range)/55),object=new T.Object3D(),rows=route.mappedBuildings??[],structures=route.structures??world.structuresData?.structures??[];let count=0;
  for(let index=start;index<=end&&count<100;index++)for(const side of [-1,1]){
   const chain=index*55+random(index,1)*20;if(chain<20||chain>world.length-20)continue;
   if(structures.some(x=>['tunnel','bridge'].includes(x.kind)&&chain>x.sStart-15&&chain<x.sEnd+15))continue;
   const cover=snowCover(route,chain,type);if(cover<.22||random(index,side+4)>cover+.1)continue;
   const shape=snowBankShape(cover,random(index,side+8)),offset=side*(22+random(index,side+12)*36),frame=world.frame(chain,offset),w=shape.width*2,d=shape.depth*2;
   if(!stationBuildingClear(world,chain,offset,w,d)||world.roadScenery?.buildingClear(chain,offset,w,d)===false)continue;
   // Keep mounds clear of mapped buildings and any parallel railway, too.
   let lo=0,hi=rows.length;while(lo<hi){const m=(lo+hi)>>1;if(rows[m][0]<chain-100)lo=m+1;else hi=m;}
   let occupied=false;for(let i=lo;i<rows.length&&rows[i][0]<chain+100;i++){const row=rows[i];if(Math.hypot(row[1]-frame.p.x,row[2]+frame.p.z)<Math.hypot(row[3],row[4])/2+Math.max(shape.width,shape.depth)+2){occupied=true;break;}}if(occupied)continue;
   const rails=world.railTracks??world.trackLayout?.tracks??[];let clear=true;
   for(const rail of rails){const knots=rail.knots??[];if(!knots.length||chain<knots[0][0]||chain>knots.at(-1)[0])continue;if(Math.abs(offset-interpolateKnots(knots,chain))<Math.max(shape.width,shape.depth)+4){clear=false;break;}}
   if(!clear)continue;
   object.position.copy(frame.p);object.position.y-=.08;object.rotation.set(0,random(index,side+20)*Math.PI,0);object.scale.set(shape.width,shape.height,shape.depth);object.updateMatrix();this.mesh.setMatrixAt(count++,object.matrix);
  }
  this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;this.mesh.computeBoundingSphere();
 }
 dispose(){this.world.scene.remove(this.mesh);this.geometry.dispose();this.material.dispose();}
}
