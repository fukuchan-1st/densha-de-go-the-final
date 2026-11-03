import * as T from './assets/vendor/three.module.js';
import {CabSuspension} from './cab-motion.js?v=24';
import {addTrackSignal} from './track-signal.js';
import {interpolateKnots} from './track-layout.js?v=23';
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
 driveOffset(s){return this.route.drivingTrack?interpolateKnots(this.route.drivingTrack,s):0;}
 drivePoint(s){return this.route.drivingTrack?this.frame(s,this.driveOffset(s)).p:this.point(s);}
 driveFrame(s){
  if(!this.route.drivingTrack)return this.frame(s);
  const p=this.drivePoint(s),dir=this.drivePoint(s+3).sub(this.drivePoint(s-3)).normalize();
  return {p,dir,right:new T.Vector3(-dir.z,0,dir.x).normalize()};
 }
 curvature(s){const a=this.driveFrame(s-20).dir.setY(0).normalize(),b=this.driveFrame(s+20).dir.setY(0).normalize();return Math.atan2(a.x*b.z-a.z*b.x,a.dot(b))/40;}
 grade(s){return clamp((this.point(s+10).y-this.point(s-10).y)/20*1000,-40,40);}
 stationNear(s){let nearest=null,d=Infinity;for(const st of this.route.stations){const dd=Math.abs(st.s-s);if(dd<d){nearest=st;d=dd;}}return {st:nearest,d};}
 platformLength(){return clamp((this.route.carCount??10)*20+20,180,280);}
 oppositeOffset(s){
  const {st}=this.stationNear(s);
  const measured=this.route.stationLayouts?.[st.name]?.opposite;
  if(measured?.length){
   const relative=s-st.s;
   const outside=Math.max(measured[0][0]-relative,relative-measured.at(-1)[0],0);
   const x=interpolateKnots(measured,relative);
   return T.MathUtils.lerp(x,this.route.defaultOppositeOffset??4,clamp(outside/100,0,1));
  }
  const reference=this.route.parallelTrackReference?.find(row=>row.s===st.s);
  const spacing=reference?.oppositeTrackSpacingM;
  if(!Number.isFinite(spacing))return this.route.defaultOppositeOffset??4;
  // Keep the measured gap throughout the platform and blend into the adjacent scene.
  const platformStart=st.s-this.platformLength()+18;
  const platformEnd=st.s+18;
  const outside=Math.max(platformStart-s,s-platformEnd,0);
  return T.MathUtils.lerp(spacing,4,clamp(outside/100,0,1));
 }
 cube(group,s,x,y,w,h,d,color){const f=this.frame(s,x),m=new T.Mesh(this.box,this.mat(color));m.position.copy(f.p);m.position.y+=y+h/2;m.rotation.order='YXZ';m.rotation.set(Math.asin(clamp(f.dir.y,-1,1)),f.angle,0);m.scale.set(w,h,d);group.add(m);return m;}
 ribbon(group,start,end,offset,width,height,color,step=7){const pos=[],idx=[];for(let s=start,i=0;s<=end+.01;s=Math.min(end,s+step),i++){const x=typeof offset==='function'?offset(s):offset,w=typeof width==='function'?width(s):width,f=this.frame(s,x);for(const dx of[-w/2,w/2])pos.push(f.p.x+f.right.x*dx,f.p.y+height,f.p.z+f.right.z*dx);if(i){const k=i*2;idx.push(k-2,k-1,k,k-1,k+1,k);}if(s===end)break;}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const m=new T.Mesh(g,this.mat(color));m.material.side=T.DoubleSide;group.add(m);}
 instances(group,items,color){if(!items.length)return;const m=new T.InstancedMesh(this.box,this.mat(color),items.length),o=new T.Object3D();items.forEach((a,i)=>{const f=this.frame(a.s,a.x);o.position.copy(f.p);o.position.y+=a.y+a.h/2;o.rotation.order='YXZ';o.rotation.set(Math.asin(clamp(f.dir.y,-1,1)),f.angle,0);o.scale.set(a.w,a.h,a.d);o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.computeBoundingSphere();group.add(m);}
 sign(group,name,s,x,level=0){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#f0f0df';c.fillRect(0,0,512,128);c.fillStyle=this.route.color??'#5aa642';c.fillRect(0,96,512,16);c.fillStyle='#16282a';c.font='bold 55px sans-serif';c.textAlign='center';c.fillText(name,256,74);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(2.7,.675),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide})),f=this.frame(s,x);m.position.copy(f.p);m.position.y+=level+2.4;m.rotation.y=f.angle;group.add(m);}
 platformBounds(st,platform,s,tracks){
  const relative=s-st.s;
  let left=interpolateKnots(platform.edges,relative,1);
  let right=interpolateKnots(platform.edges,relative,2);
  const middle=(left+right)/2;
  for(const rail of tracks){
   if(s<rail.start||s>rail.end||Math.abs((rail.height??0)-(platform.height??0))>.3)continue;
   const x=rail.offset(s);
   if(x<middle)left=Math.max(left,x+1.45);
   else right=Math.min(right,x-1.45);
  }
  if(left>right){
   const edge=middle>=0?left:right;
   return [edge,edge];
  }
  return [left,right];
 }
 addPlatform(group,st,platform,tracks,start,end){
  const from=Math.max(start,st.s+platform.edges[0][0]);
  const to=Math.min(end,st.s+platform.edges.at(-1)[0]);
  if(to<=from)return;
  const bounds=s=>this.platformBounds(st,platform,s,tracks);
  const level=platform.height??0;
  const center=s=>{const [l,r]=bounds(s);return (l+r)/2;};
  const width=s=>{const [l,r]=bounds(s);return r-l;};
  this.ribbon(group,from,to,center,width,level+1,'#a8aaa1',4);
  for(const edge of [0,1]){
   const inset=edge===0?.15:-.15;
   this.ribbon(group,from,to,s=>bounds(s)[edge]+inset,s=>Math.min(.18,width(s)),level+1.015,'#e3ce67',4);
   for(let a=from;a<to;a+=5){
    const d=Math.min(5,to-a),s=a+d/2;
    if(width(s)>.65)this.cube(group,s,bounds(s)[edge]+inset/3,level,.1,1,d,'#7d837c');
   }
  }
  const roofFrom=Math.max(from,st.s+(platform.roof?.[0]??-123));
  const roofTo=Math.min(to,st.s+(platform.roof?.[1]??8));
  if(roofTo>roofFrom){
   this.ribbon(group,roofFrom,roofTo,center,s=>Math.max(0,Math.min(width(s)-.35,10)),level+4.4,'#677778',4);
   for(let s=st.s-107;s<roofTo;s+=16){
    if(s>=roofFrom&&width(s)>1.2)this.cube(group,s,center(s),level+1,.14,3.35,.14,'#c2c9c3');
   }
  }
  for(const s of [st.s-105,st.s-22]){
   if(s>=from&&s<to&&width(s)>1.2)this.sign(group,st.name,s,center(s),level);
  }
 }
 buildChunk(index){const group=new T.Group(),start=Math.max(-300,index*500),end=Math.min(this.length+300,(index+1)*500);if(end<=start)return group;
  this.ribbon(group,start,end,0,260,-.2,'#869177',20);
  const tracks=[{start,end,offset:s=>this.driveOffset(s)}];
  const nearby=this.route.stations.filter(st=>st.s+360>=start&&st.s-420<=end);
  if(this.route.neighborTracks){
   for(const {knots,height} of this.route.neighborTracks){
    const a=Math.max(start,knots[0][0]),b=Math.min(end,knots.at(-1)[0]);
    if(b>a)tracks.push({start:a,end:b,offset:s=>interpolateKnots(knots,s),height});
   }
  }else{
   tracks.push({start,end,offset:s=>this.oppositeOffset(s)});
  }
  const trackEnvelope=s=>{
   const offsets=tracks.filter(rail=>s>=rail.start&&s<=rail.end).map(rail=>rail.offset(s));
   return [Math.min(...offsets),Math.max(...offsets)];
  };
  const ties=[],poles=[],arms=[],buildings=[],windows=[],trees=[];
  for(const rail of tracks){
   const {start:a,end:b,offset,height=0}=rail;
   this.ribbon(group,a,b,offset,3.15,height+.02,'#74746b');
   for(const dx of[-.5335,.5335])this.ribbon(group,a,b,s=>offset(s)+dx,.07,height+.19,'#b7c3c3');
   for(let s=Math.ceil(a/1.1)*1.1;s<b;s+=1.1)ties.push({s,x:offset(s),y:height+.06,w:2.05,h:.1,d:.18});
   if(height>0){
    for(let s=a;s<b;s+=10){
     const d=Math.min(10,b-s),mid=s+d/2;
     this.cube(group,mid,offset(mid),height-.6,3.4,.55,d,'#9c9e94');
    }
    for(let s=Math.ceil(a/20)*20;s<b;s+=20)this.cube(group,s,offset(s),0,.65,height-.55,.8,'#9c9e94');
   }
  }
  this.instances(group,ties,'#625f56');
  const wires=[];
  for(let s=Math.ceil(start/40)*40;s<end;s+=40){
   const [min,max]=trackEnvelope(s);
   const left=min-2.5,right=max+2.5;
   for(const x of [left,right])poles.push({s,x,y:0,w:.16,h:7.1,d:.16});
   arms.push({s,x:(left+right)/2,y:6.9,w:right-left,h:.12,d:.14});
  }
  for(const rail of tracks){
   for(let s=rail.start;s<rail.end;s+=24){
    const next=Math.min(rail.end,s+24),a=this.frame(s,rail.offset(s)).p,b=this.frame(next,rail.offset(next)).p;
    const level=rail.height??0;
    wires.push(a.x,a.y+level+5.7,a.z,b.x,b.y+level+5.7,b.z);
   }
  }
  this.instances(group,poles,'#9da5a2');this.instances(group,arms,'#737c7a');const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wires,3));group.add(new T.LineSegments(wg,new T.LineBasicMaterial({color:'#3d4d53'})));
  let seed=(index*1297+this.route.id.length*701)>>>0;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let s=Math.ceil(start/26)*26;s<end;s+=26)for(const side of[-1,1]){const near=this.stationNear(s),urban=this.route.id==='yamanote'||this.route.id==='osaka'||near.d<900,[min,max]=trackEnvelope(s),edge=side<0?min:max,x=edge+side*(22+random()*50),h=urban?8+random()*30:4+random()*8;
   const w=8+random()*12,d=10+random()*12;buildings.push({s,x,y:0,w,h,d});if(this.quality!=='light')for(let y=3;y<h-1;y+=3)windows.push({s:s-d/2-.03,x,y,w:w*.65,h:1.1,d:.05});
   if(!urban||random()>.7)trees.push({s:s+12,x:edge+side*(12+random()*7),y:2,w:2+random()*2,h:3+random()*3,d:3});}
  this.instances(group,buildings,index%2?'#b7b5aa':'#b1b7b5');this.instances(group,windows,'#405d68');this.instances(group,trees,'#4d7150');
  for(const st of nearby){
   const drive=this.driveOffset(st.s),opposite=this.oppositeOffset(st.s);
   const edge=drive+(opposite>=drive?-1.55:1.55);
   const outer=edge+Math.sign(edge-drive)*4.8;
   const fallback=[{edges:[[-this.platformLength()+18,Math.min(edge,outer),Math.max(edge,outer)],[18,Math.min(edge,outer),Math.max(edge,outer)]]}];
   const platforms=this.route.stationLayouts?.[st.name]?.platforms??fallback;
   for(const platform of platforms)this.addPlatform(group,st,platform,tracks,start,end);
   if(st.s>=start&&st.s<end){
    const boarding=platforms.find(p=>p.boarding)??platforms[0];
    const side=boarding&&interpolateKnots(boarding.edges,0,1)>drive?1:-1;
    this.cube(group,st.s,drive+side*1.65,0,.08,1.2,.08,'#eeeecc');
   }
  }
  for(const structure of this.route.structures??[]){
   if(structure.sEnd<start||structure.sStart>end)continue;
   const a=Math.max(start,structure.sStart),b=Math.min(end,structure.sEnd);
   const tunnel=structure.kind==='tunnel',step=tunnel?10:12;
   for(let s=a;s<b;s+=step){
    const [min,max]=trackEnvelope(s);
    this.cube(group,s,min-2.2,0,tunnel?.4:.13,tunnel?5.2:1.1,step,tunnel?'#686d6e':'#879797');
    this.cube(group,s,max+2.2,0,tunnel?.4:.13,tunnel?5.2:1.1,step,tunnel?'#686d6e':'#879797');
    if(tunnel)this.cube(group,s,(min+max)/2,5.2,max-min+4.8,.5,step,'#5d6265');
   }
  }
  for(const signal of this.route.signals??[]){
   if(signal.s>=start&&signal.s<end)addTrackSignal(T,this,group,signal);
  }
  this.scene.add(group);return group;
 }
 disposeChunk(group){this.scene.remove(group);group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&o.geometry!==this.box)o.geometry.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}});}
 setCabView(origin){this.viewOrigin=origin;this.currentView=undefined;}
 render(s,v,dt,{acceleration=0,shake=1,panorama=false}={}){const chunk=Math.floor(s/500);for(let i=chunk-2;i<=chunk+3;i++)if(!this.chunks.has(i))this.chunks.set(i,this.buildChunk(i));for(const [i,g]of this.chunks)if(i<chunk-2||i>chunk+3){this.disposeChunk(g);this.chunks.delete(i);}
  if(this.currentView!==panorama){if(!panorama&&this.viewOrigin)this.camera.setViewOffset(1600,900,800-this.viewOrigin.x,450-this.viewOrigin.y,1600,900);else this.camera.clearViewOffset();this.currentView=panorama;}
  const f=this.driveFrame(s),head=this.drivePoint(s+45),motion=this.suspension.update({s,speed:v,curvature:this.curvature(s),acceleration},dt,shake),eye=Number(this.route.eyeHeight??2.7);this.camera.position.copy(f.p).addScaledVector(f.right,motion.lateral);this.camera.position.y+=eye+motion.vertical;head.addScaledVector(f.right,motion.lateral);head.y+=eye+motion.vertical;this.camera.lookAt(head);this.camera.rotateX(motion.pitch);this.camera.rotateY(motion.yaw);this.camera.rotateZ(motion.roll);const tunnel=(this.route.structures??[]).some(t=>t.kind==='tunnel'&&s>=t.sStart&&s<=t.sEnd);this.sky.intensity=tunnel?.6:2.1;this.sun.intensity=tunnel?.3:2.1;this.renderer.render(this.scene,this.camera);
 }
 dispose(){for(const g of this.chunks.values())this.disposeChunk(g);this.chunks.clear();for(const m of this.materials.values()){m.map?.dispose();m.dispose();}this.box.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
