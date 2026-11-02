import * as T from './assets/vendor/three.module.js?v=22';
import {createSurfaceMaterial} from './vegetation.js?v=22';

// Procedural visual interpretations of the supplied BVE numerical placements.
// Original .x geometry and textures are deliberately not redistributed.
export function addStructures(world,data){
 const structures=data.structures??[],materials=new Map(),box=new T.BoxGeometry(1,1,1);
 function material(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.9,side:T.DoubleSide}));return materials.get(color);}
 const stone=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#777b76';g.fillRect(0,0,256,256);let seed=1701;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<12000;i++){const n=95+Math.floor(rnd()*65);g.fillStyle=`rgba(${n},${n+3},${n},.2)`;g.fillRect(rnd()*256,rnd()*256,1+rnd()*4,1+rnd()*3);}g.strokeStyle='#424943';g.lineWidth=2;for(let y=0;y<=256;y+=64){g.beginPath();g.moveTo(0,y);g.lineTo(256,y);g.stroke();for(let x=(y/64%2)*64;x<256;x+=128){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+64);g.stroke();}}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);return new T.MeshStandardMaterial({map:t,color:'#9c9e95',roughness:1,side:T.DoubleSide});})();
 function position(s,offset,y){const p=world.frame(s,offset).p.clone();p.y+=y;return p;}
 function cube(w,h,d,color,s,offset=0,y=0,yaw=0){const m=world.mesh(w,h,d,color,s,offset,y);m.rotation.y+=yaw;return m;}
 function beam(a,b,r,color){const v=b.clone().sub(a),m=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),5),material(color));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());world.scene.add(m);return m;}
 function archLining(a,b){
  const r=2.42,cy=2.7,steps=18,cross=[[-r,-.3]];
  for(let k=0;k<=steps;k++){const t=Math.PI-k*Math.PI/steps;cross.push([r*Math.cos(t),cy+r*Math.sin(t)]);}cross.push([r,-.3]);
  const positions=[],uv=[],indices=[],slices=Math.max(1,Math.ceil((b-a)/4));
  for(let i=0;i<=slices;i++){const s=T.MathUtils.lerp(a,b,i/slices),f=world.frame(s);for(let k=0;k<cross.length;k++){const[x,y]=cross[k];positions.push(f.p.x+f.right.x*x,f.p.y+y,f.p.z+f.right.z*x);uv.push(k/(cross.length-1)*3,(s-a)/5);if(i&&k){const j=i*cross.length+k;indices.push(j-cross.length-1,j-1,j-cross.length,j-cross.length,j-1,j);}}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const lining=new T.Mesh(geo,stone);world.scene.add(lining);
  // Narrow construction joints follow the same open arch; no slab covers rails.
  for(let s=a+5;s<b;s+=10){const f=world.frame(s);for(let k=1;k<cross.length-1;k++){const p0=position(s,0,0),p1=p0.clone();p0.addScaledVector(f.right,cross[k][0]);p0.y+=cross[k][1];p1.addScaledVector(f.right,cross[k+1][0]);p1.y+=cross[k+1][1];beam(p0,p1,.025,'#444943');}}
 }
 function portal(s,reverse=false){
  const r=2.42,cy=2.7,shape=new T.Shape();shape.moveTo(-5,-.3);shape.lineTo(5,-.3);shape.lineTo(5,7.4);shape.lineTo(-5,7.4);shape.closePath();
  // Keep hole strictly within facade outline for robust Earcut triangulation;
  // the thin sill remains below the rail/ballast surface.
  const hole=new T.Path();hole.moveTo(-r,-.25);hole.lineTo(-r,cy);hole.absarc(0,cy,r,Math.PI,0,true);hole.lineTo(r,-.25);hole.closePath();shape.holes.push(hole);
  const geo=new T.ExtrudeGeometry(shape,{depth:.5,bevelEnabled:false,curveSegments:24}),m=new T.Mesh(geo,stone),f=world.frame(s);m.position.copy(f.p);m.rotation.y=f.angle+(reverse?Math.PI:0);m.rotation.x=Math.asin(f.dir.y);world.scene.add(m);
  // Wing walls end at the portal sides, leaving the entire bore opening clear.
  for(const side of[-1,1])cube(.6,5,8,'#777d71',s+(reverse?4:-4),side*5.2,-.2);
 }
 function tunnelCover(x){
  // Approximate grassy cover sits above the clear bore, never across its portal.
  const cross=[[-35,-.15],[-8,6],[-3,8.2],[3,8.2],[8,6],[35,-.15]],pos=[],uv=[],idx=[],steps=Math.ceil((x.sEnd-x.sStart)/5);
  for(let i=0;i<=steps;i++){const s=T.MathUtils.lerp(x.sStart+.7,x.sEnd-.7,i/steps),f=world.frame(s);for(let k=0;k<cross.length;k++){const [off,y]=cross[k];pos.push(f.p.x+f.right.x*off,f.p.y+y,f.p.z+f.right.z*off);uv.push(off/6,(s-x.sStart)/6);if(i&&k){const n=i*cross.length+k;idx.push(n-cross.length-1,n-1,n-cross.length,n-cross.length,n-1,n);}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();world.scene.add(new T.Mesh(g,createSurfaceMaterial('ground')));
 }
 function bridge(x){const a=x.sStart,b=x.sEnd,steel=x.sourceType==='osm'?'#626b67':'#8c3b32';for(let s=a;s<b;s+=5){const len=Math.min(5,b-s),mid=s+len/2;const rails=world.trackLayout?.activeAt(mid).filter(t=>Math.abs(t.x)<20).map(t=>t.x)??[0,4],left=Math.min(...rails)-2.35,right=Math.max(...rails)+2.35;cube(right-left,.55,len,'#4b4c46',mid,(left+right)/2,-.7);for(const off of[left,right]){cube(.25,1.05,len,steel,mid,off,-.1);beam(position(s,off,.1),position(s+len,off,1.1),.07,steel);beam(position(s,off,1.1),position(s+len,off,.1),.07,steel);cube(.12,.12,len,'#9f5442',mid,off,1.05);}}
  const depth=x.sourceType==='osm'?2.5:7;for(const s of[a,b]){cube(10,depth,2,'#7c7e71',s,2,-depth-.2);cube(10,.5,3,'#999b8c',s,2,-.85);}
 }
 function roadBridge(x){const s=(x.sStart+x.sEnd)/2,yaw=(x.yawDeg??0)*Math.PI/180;cube(34,.8,8.8,'#a3a599',s,2,6.8,yaw);cube(34,.12,8.2,'#525a56',s,2,7.6,yaw);for(const off of[-9,12])cube(1.1,6.8,1.2,'#989c91',s,off,0,yaw);for(const d of[-4.25,4.25]){const f=world.frame(s+d,2),m=new T.Mesh(box,material('#c6c9bc'));m.scale.set(34,1.1,.16);m.position.copy(f.p);m.position.y+=8.1;m.rotation.y=f.angle+yaw;world.scene.add(m);}}
 function footBridge(x){const s=x.sOrigin??(x.sStart+x.sEnd)/2;cube(15,.4,3.2,'#888e88',s,2,6.2);cube(15,.2,3.6,'#adb8b1',s,2,8.4);for(const off of[-5.5,9.5]){cube(.3,7.2,.3,'#8f9993',s,off,1.1);for(let i=0;i<20;i++)cube(2,.22,.55,'#969d94',s-9+i*.52,off,1.1+i*.25);cube(.15,2.1,3,'#8b9991',s,off,6.4);}for(const d of[-1.5,1.5])cube(15,1.1,.12,'#b8c1b7',s+d,2,6.6);}
 function cutting(x){
  for(const side of[-1,1]){const pos=[],uv=[],idx=[];let i=0;for(let s=x.sStart;s<=x.sEnd+3;s+=4,i++){const at=Math.min(s,x.sEnd),f=world.frame(at);for(const[off,y]of[[side*2.9,-.5],[side*10.5,6]]){pos.push(f.p.x+f.right.x*off,f.p.y+y,f.p.z+f.right.z*off);uv.push((Math.abs(off)-2.9)/4,(at-x.sStart)/6);}if(i){const k=i*2;idx.push(k-2,k-1,k,k-1,k+1,k);}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();world.scene.add(new T.Mesh(geo,stone));}
 }
 for(const x of structures){if(x.kind==='tunnel'){archLining(x.sStart,x.sEnd);portal(x.sStart);portal(x.sEnd,true);tunnelCover(x);}else if(x.kind==='bridge')bridge(x);else if(x.kind==='overbridge')roadBridge(x);else if(x.kind==='footbridge'&&!world.trackLayout)footBridge(x);else if(x.kind==='retaining-wall')cutting(x);else if(x.kind==='river'){const mid=(x.sStart+x.sEnd)/2,f=world.frame(mid,2),water=new T.Mesh(new T.PlaneGeometry(150,x.sEnd-x.sStart),new T.MeshStandardMaterial({color:'#547d78',roughness:.3,metalness:.2,side:T.DoubleSide}));water.position.copy(f.p);water.position.y+=x.yOffsetM??-20;water.rotation.x=-Math.PI/2;water.rotation.z=f.angle;world.scene.add(water);}}
 const tunnels=structures.filter(x=>x.kind==='tunnel');
 return {structures,tunnelAt:s=>tunnels.find(x=>s>=x.sStart&&s<=x.sEnd)??null};
}
