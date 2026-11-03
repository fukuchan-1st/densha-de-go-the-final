import * as T from './assets/vendor/three.module.js';
import {CabSuspension} from './cab-motion.js?v=24';
const clamp=T.MathUtils.clamp;
// Original streamed scenery. Track coordinates come from the route JSON; buildings and platforms are approximate.
export class FinalWorld {
 constructor(container,route,{quality='standard'}={}){
  this.route=route;this.points=route.points;this.length=route.stations.at(-1).s;this.chunks=new Map();this.suspension=new CabSuspension();this.materials=new Map();
  this.scene=new T.Scene();this.scene.background=new T.Color('#a4c5db');this.scene.fog=new T.Fog('#b3c9d3',350,1600);
  this.renderer=new T.WebGLRenderer({antialias:quality!=='light',powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='light'?1:1.5));this.renderer.setSize(1600,900);this.renderer.outputColorSpace=T.SRGBColorSpace;container.replaceChildren(this.renderer.domElement);
  this.camera=new T.PerspectiveCamera(58,16/9,.15,1900);this.sky=new T.HemisphereLight('#e3f4ff','#79766b',2.1);this.scene.add(this.sky);this.sun=new T.DirectionalLight('#fff1d8',2.1);this.sun.position.set(-150,300,90);this.scene.add(this.sun);this.box=new T.BoxGeometry(1,1,1);this.quality=quality;this.panorama=false;this.viewOrigin=null;
 }
 mat(color){if(!this.materials.has(color)){const material=new T.MeshStandardMaterial({color,roughness:.85});if(['#b7b5aa','#b1b7b5'].includes(color)){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#c4c6c1';c.fillRect(0,0,128,256);for(let y=12;y<250;y+=29)for(let x=9;x<125;x+=24){c.fillStyle=(x+y)%3?'#496570':'#6b7f83';c.fillRect(x,y,13,15);c.fillStyle='#dce1d8';c.fillRect(x+6,y,1,15);c.fillRect(x,y+7,13,1);}material.map=new T.CanvasTexture(canvas);material.map.colorSpace=T.SRGBColorSpace;}this.materials.set(color,material);}return this.materials.get(color);}
 point(s){const p=this.points;let lo=0,hi=p.length-1;if(s<=p[0][0])hi=1;else if(s>=p[hi][0])lo=hi-1;else while(hi-lo>1){const m=(lo+hi)>>1;if(p[m][0]<=s)lo=m;else hi=m;}const a=p[lo],b=p[hi],t=(s-a[0])/Math.max(.001,b[0]-a[0]);return new T.Vector3(a[1]+(b[1]-a[1])*t,(a[3]??0)+((b[3]??0)-(a[3]??0))*t,-a[2]-(b[2]-a[2])*t);}
 frame(s,offset=0){const p=this.point(s),dir=this.point(s+3).sub(this.point(s-3)).normalize(),right=new T.Vector3(-dir.z,0,dir.x).normalize();p.addScaledVector(right,offset);return {p,dir,right,angle:Math.atan2(-dir.x,-dir.z)};}
 curvature(s){const a=this.frame(s-20).dir.setY(0).normalize(),b=this.frame(s+20).dir.setY(0).normalize();return Math.atan2(a.x*b.z-a.z*b.x,a.dot(b))/40;}
 grade(s){return clamp((this.point(s+10).y-this.point(s-10).y)/20*1000,-40,40);}
 stationNear(s){let nearest=null,d=Infinity;for(const st of this.route.stations){const dd=Math.abs(st.s-s);if(dd<d){nearest=st;d=dd;}}return {st:nearest,d};}
 platformLength(){return clamp((this.route.carCount??10)*20+20,180,280);}
 oppositeOffset(s){
  const {st,d}=this.stationNear(s);
  const island=this.route.stations.indexOf(st)%3===1;
  if(island)return 4+4*clamp((350-d)/180,0,1);
  const reference=this.route.parallelTrackReference?.find(row=>row.s===st.s);
  const spacing=reference?.oppositeTrackSpacingM;
  if(!Number.isFinite(spacing))return 4;
  // Keep the measured gap throughout the platform and blend into the adjacent scene.
  const platformStart=st.s-this.platformLength()+18;
  const platformEnd=st.s+18;
  const outside=Math.max(platformStart-s,s-platformEnd,0);
  return T.MathUtils.lerp(spacing,4,clamp(outside/100,0,1));
 }
 cube(group,s,x,y,w,h,d,color){const f=this.frame(s,x),m=new T.Mesh(this.box,this.mat(color));m.position.copy(f.p);m.position.y+=y+h/2;m.rotation.order='YXZ';m.rotation.set(Math.asin(clamp(f.dir.y,-1,1)),f.angle,0);m.scale.set(w,h,d);group.add(m);return m;}
 ribbon(group,start,end,offset,width,height,color,step=7){const pos=[],idx=[];for(let s=start,i=0;s<=end+.01;s=Math.min(end,s+step),i++){const x=typeof offset==='function'?offset(s):offset,f=this.frame(s,x);for(const dx of[-width/2,width/2])pos.push(f.p.x+f.right.x*dx,f.p.y+height,f.p.z+f.right.z*dx);if(i){const k=i*2;idx.push(k-2,k-1,k,k-1,k+1,k);}if(s===end)break;}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,this.mat(color));m.material.side=T.DoubleSide;group.add(m);}
 instances(group,items,color){if(!items.length)return;const m=new T.InstancedMesh(this.box,this.mat(color),items.length),o=new T.Object3D();items.forEach((a,i)=>{const f=this.frame(a.s,a.x);o.position.copy(f.p);o.position.y+=a.y+a.h/2;o.rotation.order='YXZ';o.rotation.set(Math.asin(clamp(f.dir.y,-1,1)),f.angle,0);o.scale.set(a.w,a.h,a.d);o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.computeBoundingSphere();group.add(m);}
 sign(group,name,s,x){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#f0f0df';c.fillRect(0,0,512,128);c.fillStyle=this.route.color??'#5aa642';c.fillRect(0,96,512,16);c.fillStyle='#16282a';c.font='bold 55px sans-serif';c.textAlign='center';c.fillText(name,256,74);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(2.7,.675),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide})),f=this.frame(s,x);m.position.copy(f.p);m.position.y+=2.4;m.rotation.y=f.angle;group.add(m);}
 buildChunk(index){const group=new T.Group(),start=Math.max(-300,index*500),end=Math.min(this.length+300,(index+1)*500);if(end<=start)return group;
  this.ribbon(group,start,end,0,260,-.2,'#869177',20);const tracks=[0,s=>this.oppositeOffset(s)];if(this.route.id==='tokaido'||this.route.id==='chuo')tracks.push(-4,-8);
  const ties=[],poles=[],arms=[],buildings=[],windows=[],trees=[];
  for(const off of tracks){this.ribbon(group,start,end,off,3.15,.02,'#74746b');for(const dx of[-.5335,.5335])this.ribbon(group,start,end,s=>(typeof off==='function'?off(s):off)+dx,.07,.19,'#b7c3c3');for(let s=Math.ceil(start/1.1)*1.1;s<end;s+=1.1)ties.push({s,x:typeof off==='function'?off(s):off,y:.06,w:2.05,h:.1,d:.18});}
  this.instances(group,ties,'#625f56');
  const wires=[];for(let s=Math.ceil(start/40)*40;s<end;s+=40){const left=tracks.length>2?-11:-2.5,right=this.oppositeOffset(s)+2.5;for(const x of[left,right])poles.push({s,x,y:0,w:.16,h:7.1,d:.16});arms.push({s,x:(left+right)/2,y:6.9,w:right-left,h:.12,d:.14});for(const off of tracks){const x=typeof off==='function'?off(s):off,a=this.frame(s,x).p,b=this.frame(Math.min(end,s+40),typeof off==='function'?off(Math.min(end,s+40)):off).p;wires.push(a.x,a.y+5.7,a.z,b.x,b.y+5.7,b.z);}}
  this.instances(group,poles,'#9da5a2');this.instances(group,arms,'#737c7a');const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wires,3));group.add(new T.LineSegments(wg,new T.LineBasicMaterial({color:'#3d4d53'})));
  let seed=(index*1297+this.route.id.length*701)>>>0;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let s=Math.ceil(start/26)*26;s<end;s+=26)for(const side of[-1,1]){const near=this.stationNear(s),urban=this.route.id==='yamanote'||this.route.id==='osaka'||near.d<900,x=side*(22+random()*50)+(side<0&&tracks.length>2?-9:0),h=urban?8+random()*30:4+random()*8;
   const w=8+random()*12,d=10+random()*12;buildings.push({s,x,y:0,w,h,d});if(this.quality!=='light')for(let y=3;y<h-1;y+=3)windows.push({s:s-d/2-.03,x,y,w:w*.65,h:1.1,d:.05});
   if(!urban||random()>.7)trees.push({s:s+12,x:side*(12+random()*7),y:2,w:2+random()*2,h:3+random()*3,d:3});}
  this.instances(group,buildings,index%2?'#b7b5aa':'#b1b7b5');this.instances(group,windows,'#405d68');this.instances(group,trees,'#4d7150');
  this.route.stations.forEach((st,i)=>{if(Math.floor(st.s/500)!==index)return;const length=this.platformLength(),a=st.s-length+18,b=st.s+18,island=i%3===1;
   const platforms=island?[{x:4,w:4.8}]:[{x:-4,w:4.8},{x:this.oppositeOffset(st.s)+4,w:4.8}];for(const p of platforms){this.cube(group,(a+b)/2,p.x,0,p.w,1,b-a,'#a8aaa1');for(const side of[-1,1])this.cube(group,(a+b)/2,p.x+side*(p.w/2-.18),1.01,.2,.025,b-a,'#e3ce67');this.cube(group,st.s-65,p.x,4.2,p.w+.25,.18,105,'#677778');for(let s=st.s-110;s<st.s-12;s+=16)this.cube(group,s,p.x,1,.13,3.2,.13,'#c2c9c3');this.sign(group,st.name,st.s-18,p.x);this.sign(group,st.name,st.s-100,p.x);}
   this.cube(group,st.s,1.65,0,.08,1.2,.08,'#eeeecc');
  });
  for(const structure of this.route.structures??[]){if(structure.sEnd<start||structure.sStart>end)continue;const a=Math.max(start,structure.sStart),b=Math.min(end,structure.sEnd);if(structure.kind==='tunnel'){for(let s=a;s<b;s+=10){this.cube(group,s,-2.2,0,.4,5.2,10,'#686d6e');this.cube(group,s,this.oppositeOffset(s)+2.2,0,.4,5.2,10,'#686d6e');this.cube(group,s,this.oppositeOffset(s)/2,5.2,this.oppositeOffset(s)+4.8,.5,10,'#5d6265');}}else if(structure.kind==='bridge'){for(let s=a;s<b;s+=12){this.cube(group,s,-2,0,.13,1.1,12,'#879797');this.cube(group,s,this.oppositeOffset(s)+2,0,.13,1.1,12,'#879797');}}}
  this.scene.add(group);return group;
 }
 disposeChunk(group){this.scene.remove(group);group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&o.geometry!==this.box)o.geometry.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}});}
 setCabView(origin){this.viewOrigin=origin;this.currentView=undefined;}
 render(s,v,dt,{acceleration=0,shake=1,panorama=false}={}){const chunk=Math.floor(s/500);for(let i=chunk-2;i<=chunk+3;i++)if(!this.chunks.has(i))this.chunks.set(i,this.buildChunk(i));for(const [i,g]of this.chunks)if(i<chunk-2||i>chunk+3){this.disposeChunk(g);this.chunks.delete(i);}
  if(this.currentView!==panorama){if(!panorama&&this.viewOrigin)this.camera.setViewOffset(1600,900,800-this.viewOrigin.x,450-this.viewOrigin.y,1600,900);else this.camera.clearViewOffset();this.currentView=panorama;}
  const f=this.frame(s),head=this.point(s+45),motion=this.suspension.update({s,speed:v,curvature:this.curvature(s),acceleration},dt,shake),eye=Number(this.route.eyeHeight??2.7);this.camera.position.copy(f.p).addScaledVector(f.right,motion.lateral);this.camera.position.y+=eye+motion.vertical;head.addScaledVector(f.right,motion.lateral);head.y+=eye+motion.vertical;this.camera.lookAt(head);this.camera.rotateX(motion.pitch);this.camera.rotateY(motion.yaw);this.camera.rotateZ(motion.roll);const tunnel=(this.route.structures??[]).some(t=>t.kind==='tunnel'&&s>=t.sStart&&s<=t.sEnd);this.sky.intensity=tunnel?.6:2.1;this.sun.intensity=tunnel?.3:2.1;this.renderer.render(this.scene,this.camera);
 }
 dispose(){for(const g of this.chunks.values())this.disposeChunk(g);this.chunks.clear();for(const m of this.materials.values()){m.map?.dispose();m.dispose();}this.box.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
