import * as T from './assets/vendor/three.module.js';
import {interpolateKnots} from './track-layout.js';

export function addTurnouts(world,group,turnouts,tracks,start=-Infinity,end=Infinity){
 const byId=new Map(tracks.map(t=>[t.id,t]));
 const steel=[],indices=[];
 const strip=(from,to,x,y,width)=>{
  let previous=false;
  for(let s=from;s<=to+.001;s=Math.min(to,s+1)){
   const f=world.frame(s,x(s)),w=width(s),n=steel.length/3,h=y(s)+(world.deckHeight?.(s)??0)+.205;
   for(const side of [-1,1])steel.push(f.p.x+f.right.x*w*side/2,f.p.y+h,f.p.z+f.right.z*w*side/2);
   if(previous)indices.push(n-2,n-1,n,n-1,n+1,n);previous=true;if(s===to)break;
  }
 };
 for(const point of turnouts){
  const branch=byId.get(point.trackId),main=byId.get(point.otherId);if(!branch||!main)continue;
  const a=point.s,b=a+point.direction*point.length,lo=Math.max(start,Math.min(a,b)),hi=Math.min(end,Math.max(a,b));if(hi<=lo)continue;
  const x=(t,s)=>interpolateKnots(t.knots,s),y=s=>interpolateKnots(main.knots,s,2),side=point.side;
  // Tapered switch blades sit beside the stock rail at the toe, then follow the branch.
  strip(lo,hi,s=>x(branch,s)-side*.5335,y,s=>Math.min(.065,.008+Math.abs(s-a)/9*.057));
  strip(lo,Math.min(hi,lo+9),s=>x(main,s)+side*(.5335-.12),y,()=>.055);
  // Locate the crossing where the inside branch rail crosses the stock rail.
  let frog=null,best=Infinity;
  for(let s=Math.min(a,b);s<=Math.max(a,b);s+=.5){const error=Math.abs(Math.abs(x(branch,s)-x(main,s))-1.067);if(error<best){best=error;frog=s;}}
  if(frog!==null&&best<.35){
   const f0=Math.max(lo,frog-3.3),f1=Math.min(hi,frog+3.3);
   if(f1>f0){
    strip(f0,f1,s=>x(main,s)-side*.39,y,()=>.075);
    strip(f0,f1,s=>x(branch,s)+side*.39,y,()=>.075);
    strip(Math.max(lo,frog-1.6),Math.min(hi,frog+1.6),s=>(x(main,s)+x(branch,s))/2,y,()=>.09);
   }
  }
  if(a>=start&&a<end){
   const f=world.frame(a+point.direction*3,point.x-side*1.35),mesh=new T.Mesh(world.box,new T.MeshStandardMaterial({color:'#606c69',roughness:.8}));
   mesh.userData.disposeWithChunk=true;mesh.position.copy(f.p);mesh.position.y+=point.y+(world.deckHeight?.(a)??0)+.18;mesh.scale.set(.55,.3,1);mesh.rotation.y=f.angle;group.add(mesh);
  }
 }
 if(!steel.length)return;
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(steel,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#d2d8d7',metalness:.65,roughness:.35,side:T.DoubleSide}));mesh.userData.disposeWithChunk=true;group.add(mesh);
}
