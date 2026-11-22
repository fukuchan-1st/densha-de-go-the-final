import {BASIN_ELEVATION} from './basin-elevation-data.js?v=105';
import {sceneryDensity,sceneryProfiles} from './scenery-profile.js?v=105';
import * as T from './assets/vendor/three.module.js?v=105';
import {basinAnchors,basinDensity,basinRelief,basinTerrainAreas,basinTerrainAt} from './basin-profile.js?v=105';
// GSI DEM backdrop, geographically aligned to station anchors. The immediate
// rail corridor is cleared without changing track elevation or train physics.
export class BasinScenery{
 constructor(world){
  this.world=world;this.entries=[];for(const area of basinTerrainAreas(world.route)){const {anchors}=area,dem=BASIN_ELEVATION[area.kind],factor=dem?1:area.factor,geoRows=sceneryProfiles().flatMap(p=>p.rows),geo=st=>geoRows.find(r=>r.name===st.name&&Number.isFinite(r.lat));
  const center=area.center,frame=world.frame(center.s),origin=frame.p.clone();
  let direction=world.point(anchors.at(-1).s).sub(world.point(anchors[0].s)).setY(0).normalize(),side=new T.Vector3(-direction.z,0,direction.x);
  const anchorGeo=geo(center),other=anchors.find(a=>a!==center&&geo(a));if(dem&&anchorGeo&&other){const g=geo(other),delta=world.point(other.s).sub(origin),bearing=Math.atan2((g.lat-anchorGeo.lat)*111320,(g.lon-anchorGeo.lon)*111320*Math.cos(anchorGeo.lat*Math.PI/180)),theta=Math.atan2(delta.z,delta.x)+bearing;direction.set(Math.cos(theta),0,Math.sin(theta));side.set(Math.sin(theta),0,-Math.cos(theta));origin.addScaledVector(direction,(dem.lon-anchorGeo.lon)*111320*Math.cos(dem.lat*Math.PI/180)).addScaledVector(side,(dem.lat-anchorGeo.lat)*111320);}
  const corridor=Array.from({length:Math.ceil((area.end-area.start)/400)+1},(_,i)=>world.point(Math.min(area.end,area.start+i*400)));
  const base=Math.min(...anchors.map(a=>world.point(a.s).y))-12,positions=[],colors=[],indices=[],nx=dem?.nx??96,nz=dem?.nz??72;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const x=(i/nx-.5)*(dem?.width??48000),z=(j/nz-.5)*(dem?.depth??34000),h=dem?Math.max(0,dem.heights[j*(nx+1)+i]-dem.centerElevation):basinRelief(x,z),p=origin.clone().addScaledVector(direction,x*factor).addScaledVector(side,z*factor);
   const distance=Math.sqrt(Math.min(...corridor.map(c=>(p.x-c.x)**2+(p.z-c.z)**2))),blend=T.MathUtils.smoothstep(distance,1200*factor,3600*factor);positions.push(p.x,base+h*factor*blend,p.z);const dx=dem?(dem.heights[j*(nx+1)+Math.min(nx,i+1)]-dem.heights[j*(nx+1)+Math.max(0,i-1)])/(dem.width/nx*2):(basinRelief(x+60,z)-basinRelief(x-60,z))/120,dz=dem?(dem.heights[Math.min(nz,j+1)*(nx+1)+i]-dem.heights[Math.max(0,j-1)*(nx+1)+i])/(dem.depth/nz*2):(basinRelief(x,z+60)-basinRelief(x,z-60))/120,shade=Math.max(.45,Math.min(1.15,.83-dx*.38-dz*.24));const c=new T.Color('#4b6b62').multiplyScalar(shade).lerp(new T.Color('#b3cbd9'),.28+.67*Math.exp(-h/320));colors.push(c.r,c.g,c.b);
   if(i&&j){const b=j*(nx+1)+i,a=b-nx-2;indices.push(a,b-1,a+1,a+1,b-1,b);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  this.material=new T.MeshBasicMaterial({color:'#ffffff',vertexColors:true,fog:false,toneMapped:false,side:T.DoubleSide});this.mesh=new T.Mesh(geometry,this.material);this.mesh.renderOrder=-1;world.scene.add(this.mesh);this.entries.push({mesh:this.mesh,material:this.material,area});}
  this.mesh=this.entries[0]?.mesh;
 }
 update(s){for(const {mesh,material,area}of this.entries){mesh.visible=s>=area.start&&s<=area.end;if(mesh.visible)material.color.setScalar(.035+.965*Math.min(1,this.world.sun.intensity/1.4));}}
 dispose(){for(const {mesh,material}of this.entries){this.world.scene.remove(mesh);mesh.geometry.dispose();material.dispose();}}

}
export function addBasinFields(world,group,start,end,envelope,random){
 const trees=[];
 for(let s=Math.ceil(start/42)*42;s<end;s+=42){const density=basinTerrainAt(world.route,s)?sceneryDensity(world.route,s):null;if(!density||world.structureAt(s,'tunnel')||world.stationNear(s).d<150)continue;
  for(const side of [-1,1])for(const row of [210,280,360,460]){
   if(random()>Math.min(.9,(density.farmland??0)+(density.orchard??0)))continue;
   const limits=envelope(s),x=(side<0?limits[0]:limits[1])+side*row;
   if(!world.roadScenery.buildingClear(s,x,24,30))continue;
   world.ribbon(group,s,s+30,x,24,-.14,row%2?'#869177':'#667d52',3);
   if((density.orchard??0)>.015)for(let k=0;k<3;k++)trees.push({s:s+5+k*9,x:x+side*4,y:-.1,h:2.8+random()*1.2,variant:2,rotation:random()*6,shade:.9});
  }
 }
 world.trees.add(group,trees);
}
