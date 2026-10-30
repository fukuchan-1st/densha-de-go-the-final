import * as T from './assets/vendor/three.module.js';
import {addVegetation,createSurfaceMaterial} from './vegetation.js';
export class RailWorld {
 constructor(container,geometry,stations,profile){
  this.profile=profile;
  this.points=geometry.points; this.stations=stations; this.container=container;
  this.scene=new T.Scene();this.scene.background=new T.Color('#a9cadd');this.scene.fog=new T.Fog('#b8ccd0',250,1500);
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;container.append(this.renderer.domElement);
  this.camera=new T.PerspectiveCamera(60,innerWidth/innerHeight,.15,2200);
  this.scene.add(new T.HemisphereLight('#e6f0ff','#57583b',1.4));const sun=new T.DirectionalLight('#fff0d7',2.2);sun.position.set(-400,600,200);this.scene.add(sun);
  this.materials={}; this.box=new T.BoxGeometry(1,1,1); this.build();
  addEventListener('resize',()=>{this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();});
 }
 raw(s){const p=this.points;if(s<=0){const a=p[0],b=p[1],t=s/(b[0]-a[0]);return new T.Vector3(a[1]+(b[1]-a[1])*t,0,-a[2]-(b[2]-a[2])*t);}if(s>=22100){const a=p.at(-2),b=p.at(-1),t=(s-a[0])/(b[0]-a[0]);return new T.Vector3(a[1]+(b[1]-a[1])*t,0,-a[2]-(b[2]-a[2])*t);}let lo=0,hi=p.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(p[m][0]<=s)lo=m;else hi=m;}const a=p[lo],b=p[hi],t=(s-a[0])/(b[0]-a[0]);return new T.Vector3(T.MathUtils.lerp(a[1],b[1],t),0,-T.MathUtils.lerp(a[2],b[2],t));}
 horizontalPoint(s){
  const p=this.points;if(s<=0||s>=22100)return this.raw(s);
  let lo=0,hi=p.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(p[m][0]<=s)lo=m;else hi=m;}
  const a=p[lo],b=p[hi],before=p[Math.max(0,lo-1)],after=p[Math.min(p.length-1,hi+1)],len=b[0]-a[0],t=(s-a[0])/len,t2=t*t,t3=t2*t;
  // Non-uniform cubic Hermite: continuous tangent through mapped rail vertices.
  const h0=2*t3-3*t2+1,h1=t3-2*t2+t,h2=-2*t3+3*t2,h3=t3-t2;
  const axis=k=>h0*a[k]+h1*len*(b[k]-before[k])/(b[0]-before[0])+h2*b[k]+h3*len*(after[k]-a[k])/(after[0]-a[0]);
  return new T.Vector3(axis(1),0,-axis(2));
 }
 point(s){const p=this.horizontalPoint(s);p.y=this.profile.elevationAt(s);return p;}
 frame(s,offset=0){const p=this.point(s),dir=this.point(s+5).sub(this.point(s-5)).normalize(),right=new T.Vector3(-dir.z,0,dir.x).normalize();p.addScaledVector(right,offset);return {p,dir,right,angle:Math.atan2(-dir.x,-dir.z)};}
 curvature(s){const a=this.frame(s-20).dir.setY(0).normalize(),b=this.frame(s+20).dir.setY(0).normalize();return Math.atan2(a.x*b.z-a.z*b.x,a.dot(b))/40;}
 mat(color){return this.materials[color]??=new T.MeshStandardMaterial({color,roughness:.9});}
 mesh(w,h,d,color,s,offset=0,y=0){const f=this.frame(s,offset),m=new T.Mesh(this.box,this.mat(color));m.scale.set(w,h,d);m.position.copy(f.p);m.position.y=f.p.y+y+h/2;m.rotation.order='YXZ';m.rotation.y=f.angle;m.rotation.x=Math.asin(f.dir.y);this.scene.add(m);return m;}
 instances(geo,color,items){const m=new T.InstancedMesh(geo,this.mat(color),items.length),o=new T.Object3D();items.forEach((a,i)=>{o.position.set(a.x,a.y,a.z);o.rotation.order='YXZ';o.rotation.set(a.pitch??0,a.r??0,0);o.scale.set(a.w,a.h,a.d);o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.computeBoundingSphere();this.scene.add(m);return m;}
 ribbon(offset,width,y,color,kind=null){const pos=[],uv=[],idx=[],tile=kind==='ballast'?3:kind==='ground'?6:5;for(let s=-200,i=0;s<=22500;s+=5,i++){const f=this.frame(s,offset);for(const a of [-width/2,width/2]){pos.push(f.p.x+f.right.x*a,f.p.y+y,f.p.z+f.right.z*a);uv.push((a+width/2)/tile,s/tile);}if(i>0){const k=i*2;idx.push(k-2,k-1,k,k-1,k+1,k);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const mat=kind?createSurfaceMaterial(kind):new T.MeshStandardMaterial({color,roughness:.95,side:T.DoubleSide});mat.side=T.DoubleSide;this.scene.add(new T.Mesh(g,mat));}
 build(){
  let seed=701;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const middle=this.point(11000),ground=new T.Mesh(new T.PlaneGeometry(80000,80000),this.mat('#7a8b50'));ground.rotation.x=-Math.PI/2;ground.position.set(middle.x,-25,middle.z);this.scene.add(ground);
  this.ribbon(2,450,-.12,'#76844d','ground');
  for(const off of [0,4]){this.ribbon(off,3.3,.02,'#6f736e','ballast');for(const rail of [-.5335,.5335])this.ribbon(off+rail,.075,.19,'#c2c8c7');}
  const sleepers=[],poles=[],arms=[],houses=[],roofs=[],fields=[];
  for(let s=-200;s<22500;s+=.72){for(const off of [0,4]){const f=this.frame(s,off);sleepers.push({x:f.p.x,y:f.p.y+.1,z:f.p.z,w:2.05,h:.12,d:.18,r:f.angle,pitch:Math.asin(f.dir.y)});}}
  this.instances(this.box,'#77786c',sleepers);
  const wire=[];for(let s=-200;s<22500;s+=40){const f=this.frame(s,-3.5);poles.push({x:f.p.x,y:f.p.y+3.8,z:f.p.z,w:.2,h:7.6,d:.2});const c=this.frame(s,2);arms.push({x:c.p.x,y:c.p.y+7.3,z:c.p.z,w:11,h:.12,d:.12,r:c.angle});for(const off of [0,4]){const a=this.frame(s,off).p,b=this.frame(s+40,off).p;wire.push(a.x,a.y+5.7,a.z,b.x,b.y+5.7,b.z,a.x,a.y+6.6,a.z,b.x,b.y+6.6,b.z);}}
  this.instances(this.box,'#8c9290',poles);this.instances(this.box,'#656b6a',arms);const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wire,3));this.scene.add(new T.LineSegments(wg,new T.LineBasicMaterial({color:'#414c51',transparent:true,opacity:.7})));
  for(let s=-150;s<22600;s+=55)for(const side of [-1,1]){if(rand()<.55){const f=this.frame(s,side*(35+rand()*65)),h=3+rand()*3;houses.push({x:f.p.x,y:f.p.y+h/2,z:f.p.z,w:6+rand()*4,h,d:7,r:f.angle});roofs.push({x:f.p.x,y:f.p.y+h+.25,z:f.p.z,w:8,h:.5,d:9,r:f.angle});}}
  this.instances(this.box,'#bfb6a3',houses);this.instances(this.box,'#5c625d',roofs);
  addVegetation(this);
  for(let s=-100;s<22500;s+=120)for(const side of [-1,1]){const f=this.frame(s,side*65);fields.push({x:f.p.x,y:f.p.y-.04,z:f.p.z,w:85,h:.04,d:100,r:f.angle,pitch:Math.asin(f.dir.y)});}const fieldMesh=this.instances(this.box,'#b3b377',fields);fieldMesh.material=createSurfaceMaterial('field');fieldMesh.material.map.repeat.set(16,18);
  for(let s=-300;s<23000;s+=750)for(const side of [-1,1]){const f=this.frame(s,side*(650+rand()*500)),hill=new T.Mesh(new T.SphereGeometry(1,16,8),this.mat('#668375'));hill.position.copy(f.p);hill.position.y=f.p.y-30;hill.scale.set(450,110+rand()*130,500);this.scene.add(hill);}
  this.stations.forEach((st,i)=>{const end=st.s+4;this.mesh(4,1.1,155,'#aaafa5',end-70,-4.5);this.mesh(.18,.02,155,'#d4c465',end-70,-2.6,1.1);this.mesh(4.4,.2,95,'#a9b8b2',end-60,-4.5,4.2);for(let x=-105;x<0;x+=18)this.mesh(.14,3.1,.14,'#a4aead',end+x,-5.5,1.1);this.mesh(5,3.2,12,'#d8d0bc',end-70,-8,1.1);for(const d of [-100,-15]){this.mesh(.08,1.8,.08,'#717e76',end+d,-4.1,1.1);this.sign(st.name,end+d,-4.1,3.05);}
   this.mesh(.06,1.8,.06,'#ebe9de',st.s,-1.8);this.sign('停車位置',st.s,-1.8,1.8,1.2,.36);
  });
  for(const l of this.profile.limits){if(l.s<1)continue;this.mesh(.08,2.3,.08,'#a2aaa4',l.s,-2.5);this.sign(String(l.kmh),l.s,-2.5,2.55,.7,.55);}
  for(let s=300;s<22100;s+=650){this.mesh(.13,4.5,.13,'#777e78',s,-2.7);this.mesh(.42,1.05,.25,'#1a2527',s,-2.7,4.1);const f=this.frame(s,-2.7),lamp=new T.Mesh(new T.SphereGeometry(.12,8,8),new T.MeshBasicMaterial({color:'#7afa83'}));lamp.position.set(f.p.x,f.p.y+4.9,f.p.z);this.scene.add(lamp);}
 }
 sign(text,s,offset,y,w=2.9,h=.65){const c=document.createElement('canvas');c.width=512;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#edf0e7';cx.fillRect(0,0,512,128);cx.fillStyle='#34825e';cx.fillRect(0,104,512,24);cx.fillStyle='#173a32';cx.font='bold 66px sans-serif';cx.textAlign='center';cx.fillText(text,256,80);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide})),f=this.frame(s,offset);m.position.copy(f.p);m.position.y=f.p.y+y;m.rotation.y=f.angle;this.scene.add(m);}
 render(s,v,time,panorama){const f=this.frame(s),head=this.point(s+60),shake=Math.sin(time*17)*Math.min(.009,v*.0003);this.camera.position.copy(f.p);this.camera.position.y=f.p.y+(panorama?3.0:3.1+shake);head.y+=panorama?2.9:-2.8;this.camera.lookAt(head);this.camera.rotateZ(-T.MathUtils.clamp(this.curvature(s)*v*v*.004,-.025,.025));this.renderer.render(this.scene,this.camera);}
}
