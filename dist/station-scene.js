import * as T from './assets/vendor/three.module.js?v=22';
import {interpolateKnots} from './track-layout.js?v=22';
import {createSurfaceMaterial} from './vegetation.js?v=22';
import {segmentIntersects} from './structure-ranges.js?v=22';
export function buildRailways(world){
 const rails=[],railIndices=[],bed=[],bedIndices=[],sleepers=[],supports=[];const layout=world.trackLayout;
 function vertex(target,s,x,y){const f=world.frame(s,x);target.push(f.p.x,f.p.y+y,f.p.z);}
 function strip(target,index,s0,s1,xa,xb,width,y0,y1){const n=target.length/3;vertex(target,s0,xa-width/2,y0);vertex(target,s0,xa+width/2,y0);vertex(target,s1,xb-width/2,y1);vertex(target,s1,xb+width/2,y1);index.push(n,n+1,n+2,n+1,n+3,n+2);}
 for(const track of layout.tracks){const start=Math.max(-200,track.knots[0][0]),end=Math.min(world.length+350,track.knots.at(-1)[0]);
  for(let s=start;s<end;s+=5){const e=Math.min(end,s+5),x=interpolateKnots(track.knots,s),xx=interpolateKnots(track.knots,e),y=interpolateKnots(track.knots,s,2),yy=interpolateKnots(track.knots,e,2);if(track.id!=='player'&&Math.abs(x)<.15&&Math.abs(xx)<.15&&Math.abs(y)<.1)continue;
   for(const rail of[-.5335,.5335])strip(rails,railIndices,s,e,x+rail,xx+rail,.075,y+.19,yy+.19);
   if(!world.ranges.groundGaps.some(g=>segmentIntersects(s,e,g)))strip(bed,bedIndices,s,e,x,xx,3.3,y+.025,yy+.025);
   if(y>.3&&s%20<5){const f=world.frame(s,x);supports.push({x:f.p.x,y:f.p.y+y/2,z:f.p.z,w:4,h:y,d:20,r:f.angle});}
  }
  for(let s=start;s<end;s+=.85){const x=interpolateKnots(track.knots,s),y=interpolateKnots(track.knots,s,2);if(track.id!=='player'&&Math.abs(x)<.2&&Math.abs(y)<.1)continue;const f=world.frame(s,x),a=world.frame(s-1,interpolateKnots(track.knots,s-1)).p,b=world.frame(s+1,interpolateKnots(track.knots,s+1)).p,dir=b.sub(a);sleepers.push({x:f.p.x,y:f.p.y+y+.1,z:f.p.z,w:2.05,h:.12,d:.18,r:Math.atan2(-dir.x,-dir.z),pitch:Math.asin(f.dir.y)});}
 }
 function merge(pos,idx,material,texture=false){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);if(texture){const uv=[];for(let i=0;i<pos.length;i+=3)uv.push(pos[i]/3,pos[i+2]/3);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));}g.computeVertexNormals();world.scene.add(new T.Mesh(g,material));}
 merge(rails,railIndices,new T.MeshStandardMaterial({color:'#b9c0bd',metalness:.45,roughness:.5,side:T.DoubleSide}));const ballast=createSurfaceMaterial('ballast');ballast.side=T.DoubleSide;merge(bed,bedIndices,ballast,true);world.instances(world.box,'#77786c',sleepers);world.instances(world.box,'#77795d',supports);
 return {trackCount:layout.tracks.length,sleeperCount:sleepers.length};
}
export function addStations(world){
 const layout=world.trackLayout,stationRecords=[];
 function surface(p,topY,side=null,color='#b4b5a6'){
  const pos=[],idx=[];let previous=false;
  for(let s=p.start;s<=p.end+.001;s=Math.min(p.end,s+4)){
   const b=layout.bounds(p,s);let l=b.left,r=b.right;if(side==='left'){r=l+.22;l+=.08;}else if(side==='right'){l=r-.22;r-=.08;}
   const f=world.frame(s),n=pos.length/3;for(const x of[l,r])pos.push(f.p.x+f.right.x*x,f.p.y+topY,f.p.z+f.right.z*x);
   if(previous&&b.width>.3)idx.push(n-2,n-1,n,n-1,n+1,n);previous=b.width>.3;if(s===p.end)break;
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();world.scene.add(new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.96,side:T.DoubleSide})));
 }
 for(const st of layout.stations){
  const totalBounds=[];
  st.platforms.forEach(p=>{
   surface(p,.98);surface(p,1.002,'left','#d4c46f');surface(p,1.002,'right','#d4c46f');
   for(let s=p.start+2;s<p.end;s+=8){const b=layout.bounds(p,s),len=Math.min(8,p.end-s);if(b.width<.8)continue;world.mesh(.12,.92,len,'#7d827a',s+len/2,b.left+.02,.02);world.mesh(.12,.92,len,'#7d827a',s+len/2,b.right-.02,.02);}
   const roofStart=Math.max(p.start+8,Math.min(st.s-50,p.end-20)-p.roofLength/2),roofEnd=Math.min(p.end-8,roofStart+p.roofLength);
   for(let s=roofStart;s<roofEnd;s+=10){const b=layout.bounds(p,s),len=Math.min(10,roofEnd-s);if(b.width<1)continue;const width=Math.min(b.width-.35,11);world.mesh(width,.19,len,st.roofColor,s+len/2,b.center,4.1);world.mesh(width,.08,len,'#ced2c9',s+len/2,b.center,4.29);}
   for(let s=roofStart+5;s<roofEnd;s+=18){const b=layout.bounds(p,s);if(b.width<1.3)continue;world.mesh(.15,3.12,.15,'#c6cac0',s,b.center,.98);world.mesh(Math.min(b.width-.5,10),.12,.14,'#78847c',s,b.center,3.92);}
   for(let s=p.start+22;s<p.end-8;s+=45){const b=layout.bounds(p,s);if(b.width<1.4)continue;world.mesh(1.3,.11,.45,'#728f80',s,b.center,1.42);for(const dx of[-.45,.45])world.mesh(.08,.45,.1,'#78837b',s,b.center+dx,1.0);}
   for(const s of [Math.max(p.start+14,st.s-120),Math.min(p.end-8,st.s+8)]){const b=layout.bounds(p,s);if(b.width<1.2)continue;world.mesh(.08,1.95,.08,'#8d9890',s,b.center,.98);world.sign(st.name,s,b.center,2.65,Math.min(2.8,b.width-.3),.58);}
   totalBounds.push(layout.bounds(p,st.s));
   for(let s=p.start+5;s<p.end;s+=6){const b=layout.bounds(p,s);if(b.width<1)continue;const rails=layout.activeAt(s);for(const [x,direction] of [[b.left,-1],[b.right,1]]){if(rails.some(t=>Math.abs(t.x-(x+direction*1.5))<.6))continue;world.mesh(.06,1.1,.06,'#d0d4ca',s,x-direction*.15,.98);world.mesh(.06,.06,5.8,'#c9d1c7',s,x-direction*.15,1.9);}}
  });
  const served=st.platforms.find(p=>p.start<=st.s&&p.end>=st.s),bounds=served?layout.bounds(served,st.s):{left:-3,right:-1.5},marker=bounds.right<0?-1.65:1.65;world.mesh(.06,1.7,.06,'#e3e6dc',st.s,marker);world.sign('停車位置',st.s,marker,1.7,1.05,.32);
  if(st.footbridge!==null){const s=st.footbridge,at=st.platforms.filter(p=>p.start<s&&p.end>s).map(p=>layout.bounds(p,s)).filter(b=>b.width>1.4);if(at.length){const left=Math.min(...at.map(b=>b.left)),right=Math.max(...at.map(b=>b.right)),center=(left+right)/2,width=right-left+.6;world.mesh(width,.34,3,'#8b9e8d',s,center,6.4);world.mesh(width,.18,3.4,st.roofColor,s,center,8.6);for(const dz of[-1.45,1.45])world.mesh(width,1.9,.12,'#a9beb0',s+dz,center,6.74);for(const b of at){const x=b.center;world.mesh(.25,5.5,.25,'#9ba99c',s,x,.98);for(let n=0;n<22;n++)world.mesh(Math.min(1.9,b.width-.3),.24,.5,'#b2b9ac',s-11+n*.5,x,.98+n*.245);}}}
  const rails=layout.activeAt(st.s),xs=[...rails.map(t=>t.x),...totalBounds.flatMap(b=>[b.left,b.right])],side=st.buildingSide==='right'?1:-1,x=side>0?Math.max(...xs)+7:Math.min(...xs)-7,large=['郡山','福島'].includes(st.name);world.mesh(large?15:7,large?9:4,large?55:16,'#d2ccbb',st.s-65,x,.4);world.mesh(large?16:8,.35,large?57:18,'#637b72',st.s-65,x,(large?9:4)+.4);
  stationRecords.push({name:st.name,platforms:st.platforms.length});
 }
 return stationRecords;
}
