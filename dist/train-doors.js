import {semiDoorAmount} from './door-policy.js?v=89';
import * as T from './assets/vendor/three.module.js';
import {interpolateKnots} from './track-layout.js?v=79';
// Local car coordinates, measured from the centre of the body. Passenger doors
// only: cab access doors and gangways remain fixed.
export const DOOR_LAYOUTS={
 '719-5000':{centres:[-6.71,-.19,6.34],width:1.3,bottom:1.10,top:3.08,variants:{tail:{centres:[-6.44,.09,6.61]}}},
 '207':{centres:[-7.1,-2.4,2.4,7.1]},'223-1000':{centres:[-6.8,0,6.8]},e233:{centres:[-5.9,-2.3,2.55,7.4],width:1.23,bottom:1.23,top:3.04,variants:{tail:{centres:[-7.1,-2.25,2.6,6.25]},middle:{centres:[-7.2,-2.4,2.4,7.2]}}},e235:{centres:[-7.52,-2.49,2.45,6.12],width:1.23,bottom:1.06,top:3.12,variants:{tail:{centres:[-6.14,-2.51,2.47,7.47]},middle:{centres:[-7.5,-2.5,2.5,7.5]}}},
 '323':{centres:[-7.2,-.13,6.9],width:1.24,bottom:1.10,top:2.98,variants:{tail:{centres:[-6.93,.13,7.18],top:2.94},middle:{centres:[-7.05,0,7.05]}}},'211':{centres:[-6.75,-.15,6.45],width:1.3,bottom:1.14,top:3.12,variants:{tail:{centres:[-6.45,.12,6.75]},middle:{centres:[-6.65,0,6.65]}}},
 '221':{centres:[-6.9,.1,7.1],width:1.24,bottom:1.03,top:2.94,variants:{middle:{centres:[-7,0,7]}}},'223':{centres:[-6.8,.1,7.1],width:1.25,bottom:1.08,top:3.0,variants:{tail:{centres:[-7.15,-.05,6.95],bottom:1.01,top:2.93}}},'223-0':{centres:[-6.8,0,6.8]},
 '313':{centres:[-7.2,-.2,6.66],width:1.25,bottom:1.04,top:3.04,variants:{tail:{centres:[-6.77,.09,7.12],bottom:1.06,top:3.05},middle:{centres:[-6.77,.09,7.12],bottom:1.06,top:3.05}}},'701':{centres:[-7,.1,7.2],width:1.25,bottom:1.04,top:3.16},e127:{centres:[-7.14,-.09,7.03],width:1.26,bottom:1.04,top:3.04,variants:{tail:{centres:[-7.08,.04,7.12],bottom:1.06,top:3.10},middle:{centres:[-7.08,.04,7.12],bottom:1.06,top:3.10}}},
 e131:{centres:[-7.025,-.35,6.275],width:1.22,bottom:1.10,top:2.87,variants:{tail:{centres:[-6.35,0,6.35],bottom:.94,top:2.78},middle:{centres:[-6.917,0,6.917],bottom:1.10,top:2.87}}},'6050':{centres:[-7.58,6.23],width:1.22,bottom:1.18,top:2.98},
 '383':{centres:[-7.4,9.87],width:.70,bottom:1.10,top:3.06,single:true,variants:{panorama:{centres:[6.55],width:.90,bottom:1.10,top:3.18},tail:{centres:[{z:-7.79,width:.76,top:3.21},{z:7.46,width:.70,top:3.05}]},middle:{centres:[{z:-7.65,width:.74,top:3.18},{z:9.68,width:.74,top:3.09}],bottom:1.10}}},e353:{centres:[-8,6.75],width:.86,bottom:1.04,top:3.04,single:true,variants:{tail:{centres:[-6.72],width:.76,bottom:1.08,top:3.0},middle:{centres:[-9.37],width:.88,bottom:1.03,top:3.04}}},'681':{centres:[8.43],width:.68,bottom:1.15,top:3.08,single:true,variants:{tail:{centres:[-9.7],width:.80,bottom:1.06,top:3.20},middle:{centres:[-9.61,9.59],width:.72,bottom:1.12,top:3.16},trailer:{centres:[-9.61,9.59],width:.72,bottom:1.12,top:3.16},trailer200:{centres:[-9.61,9.59],width:.72,bottom:1.12,top:3.16},motor200:{centres:[-9.61,9.59],width:.72,bottom:1.12,top:3.16},trailer300:{centres:[-9.61,9.59],width:.72,bottom:1.12,top:3.16}}}
};
const clamp=x=>Math.max(0,Math.min(1,x));
export function updateDoorVisual(state,dt,random=Math.random){
 const open=!!state.doors&&!['closing','close-audio-error'].includes(state.doorPhase);
 if(!Number.isFinite(state.doorVisual))state.doorVisual=open?1:0;
 if(open&&(!state.doorVisualActive||Math.abs((state.doorVisualStation??state.s)-state.s)>25)){state.doorVisualTime=0;state.doorVisualSeed=(Math.floor(random()*4294967296)^Math.round(state.s??0))>>>0;state.doorVisualStation=state.s;}state.doorVisualActive=open;if(open)state.doorVisualTime=(state.doorVisualTime??0)+Math.max(0,dt);
 const target=open?1:0,step=Math.max(0,dt)/(open?2.6:2.8);
 state.doorVisual+=Math.max(-step,Math.min(step,target-state.doorVisual));
 if(state.doorPhase==='terminal-open')state.doorVisual=1;
 if(Math.abs(state.v??0)>.1&&!state.doors)state.doorVisual=0;
 return state.doorVisual;
}
export function platformDoorSide(world,s){
 const stations=world.sceneryStations??world.trackLayout?.stations??world.route?.sceneryStations??world.route?.stations??[];
 const st=stations.reduce((best,x)=>!best||Math.abs(x.s-s)<Math.abs(best.s-s)?x:best,null);if(!st||Math.abs(st.s-s)>25)return 0;
 const drive=world.driveOffset?.(st.s)??0,platforms=world.route?.stationLayouts?.[st.name]?.platforms??st.platforms??[];
 const candidates=[];
 for(const p of platforms){let left,right;
  if(world.trackLayout&&p.start!=null){({left,right}=world.trackLayout.bounds(p,st.s-8));}
  else if(p.edges?.length){left=interpolateKnots(p.edges,-8,1);right=interpolateKnots(p.edges,-8,2);}
  else continue;
  const distance=Math.min(Math.abs(left-drive),Math.abs(right-drive));
  if(distance<4.2&&right>left)candidates.push({side:(left+right)/2>drive?1:-1,distance,boarding:p.boarding});
 }
 candidates.sort((a,b)=>Number(!!b.boarding)-Number(!!a.boarding)||a.distance-b.distance);
 return candidates[0]?.side??(platforms.length?0:-1);
}
// Split a polygon at an axis plane, interpolating the original normals and UVs.
// The union of both results is identical to the source surface at closed doors.
export function splitDoorPolygon(poly,axis,value){const low=[],high=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a[axis]-value,db=b[axis]-value;if(da<=1e-9)low.push(a);if(da>=-1e-9)high.push(a);if(da*db<0){const f=da/(da-db),v=a.map((x,k)=>x+(b[k]-x)*f);low.push(v);high.push(v);}}return [low,high];}
function partition(poly,box){let inside=poly,outside=[];for(const [axis,value,keepHigh]of [[0,box[0],true],[0,box[1],false],[1,box[2],true],[1,box[3],false],[2,box[4],true],[2,box[5],false]]){if(inside.length<3)break;if(inside.every(v=>Math.abs(v[axis]-value)<1e-9))continue;const [low,high]=splitDoorPolygon(inside,axis,value);outside.push(keepHigh?low:high);inside=keepHigh?high:low;}return {inside,outside};}
function append(out,polygon){for(let i=1;i<polygon.length-1;i++)out.push(...polygon[0],...polygon[i],...polygon[i+1]);}
function geometry(values,owner){const a=new T.InterleavedBuffer(new Float32Array(values),8),g=new T.BufferGeometry();g.setAttribute('position',new T.InterleavedBufferAttribute(a,3,0));g.setAttribute('normal',new T.InterleavedBufferAttribute(a,3,3));g.setAttribute('uv',new T.InterleavedBufferAttribute(a,2,6));g.computeBoundingSphere();owner.geometries.add(g);return g;}
export function prepareCarDoors(body,id,owner,role='head'){
 const base=DOOR_LAYOUTS[id],layout=base?{...base,...base.variants?.[role]}:null;if(!layout||body.userData.slidingDoors)return;body.userData.slidingDoors=true;
 const meshes=body.children.filter(o=>o.isMesh&&!o.userData.frontRepair),boxes=[];
 for(const side of [-1,1])for(const value of layout.centres){const entry=typeof value==='number'?{z:value}:value,z=entry.z,width=entry.width??layout.width??1.3,bottom=entry.bottom??layout.bottom??1.12,top=entry.top??layout.top??3.16;boxes.push({side,z,width,bottom,top,direction:entry.direction,box:side<0?[-2,-1.20,bottom,top,z-width/2,z+width/2]:[1.20,2,bottom,top,z-width/2,z+width/2]});}
 const used=new Set();
 for(const mesh of meshes){const g=mesh.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv'),start=g.drawRange.start,end=Math.min(g.index?.count??p.count,start+g.drawRange.count),fixed=[],leaves=new Map();
  for(let i=start;i<end;i+=3){const triangle=[];for(let j=0;j<3;j++){const k=g.index?g.index.getX(i+j):i+j;triangle.push([p.getX(k),p.getY(k),p.getZ(k),n?.getX(k)??0,n?.getY(k)??0,n?.getZ(k)??0,uv?.getX(k)??0,uv?.getY(k)??0]);}
   let remaining=[triangle];
   for(let b=0;b<boxes.length;b++){const door=boxes[b],box=door.box;const next=[];
    for(const poly of remaining){if(poly.every(v=>v[0]<box[0])||poly.every(v=>v[0]>box[1])||poly.every(v=>v[1]<box[2])||poly.every(v=>v[1]>box[3])||poly.every(v=>v[2]<box[4])||poly.every(v=>v[2]>box[5])){next.push(poly);continue;}
     const cut=partition(poly,box);next.push(...cut.outside.filter(p=>p.length>=3));if(cut.inside.length>=3){const halves=layout.single?[[],cut.inside]:splitDoorPolygon(cut.inside,2,door.z);for(let h=0;h<2;h++)if(halves[h].length>=3){const key=b*2+h;if(!leaves.has(key))leaves.set(key,[]);append(leaves.get(key),halves[h]);used.add(b);}}
    }remaining=next;
   }for(const poly of remaining)append(fixed,poly);
  }
  if(!leaves.size)continue;mesh.geometry=geometry(fixed,owner);
  for(const [key,vertices]of leaves){const door=boxes[Math.floor(key/2)],leaf=new T.Mesh(geometry(vertices,owner),mesh.material);leaf.userData.doorLeaf={center:door.z,side:door.side,direction:layout.single?(door.direction??-Math.sign(door.z||1)):(key%2?1:-1),travel:layout.single?door.width:door.width/2};leaf.userData.shadowCaster=true;body.add(leaf);}
 }
 const darkKey='sliding-door-interior';if(!owner.materials.has(darkKey))owner.materials.set(darkKey,new T.MeshStandardMaterial({color:'#10191b',roughness:1,side:T.DoubleSide}));
 for(const i of used){const d=boxes[i],g=new T.PlaneGeometry(d.width,d.top-d.bottom);owner.geometries.add(g);const recess=new T.Mesh(g,owner.materials.get(darkKey));recess.rotation.y=Math.PI/2;recess.position.set(d.side*1.19,(d.top+d.bottom)/2,d.z);recess.userData.doorRecess=true;body.add(recess);}
}
export function applyCarDoors(car,side,fraction,policy={}){
 const body=car.children[0],flip=Math.cos(body?.rotation.y??0)<0?-1:1;
 const centres=[];car.traverse(m=>{const leaf=m.userData.doorLeaf;if(leaf&&!centres.includes(leaf.center))centres.push(leaf.center);});centres.sort((a,b)=>a-b);const leading=centres.reduce((a,b)=>b*flip>a*flip?b:a,centres[0]);
 car.traverse(mesh=>{const leaf=mesh.userData.doorLeaf;if(!leaf)return;let amount=-leaf.side*flip===side?clamp(fraction):0;if(policy.mode==='front-only'&&((policy.carIndex??0)!==0||leaf.center!==leading))amount=0;else if(policy.mode==='semi')amount*=semiDoorAmount((policy.seed??0)+(policy.carIndex??0)*131,centres.indexOf(leaf.center),centres.length,policy.time??0);mesh.position.z=leaf.direction*leaf.travel*amount;mesh.position.x=-leaf.side*.035*amount;});
}
