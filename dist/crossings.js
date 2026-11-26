import {RailJointAudio} from './rail-joints.js?v=118';
import * as T from './assets/vendor/three.module.js?v=118';
export function crossingCenter(c){return c.sOrigin??((c.sStart+c.sEnd)/2);}
export function crossingActive(c,s,speed,length=40){const x=crossingCenter(c);return s>=x-Math.max(320,speed*20)&&s-length<=x+25;}
export function crossingDoppler(s,speed,crossing,lateral=6){const delta=crossing-s,radial=speed*delta/Math.hypot(delta,lateral);return Math.max(.7,Math.min(1.3,(343+radial)/343));}
export class LevelCrossings{
 constructor(world){this.world=world;this.items=[];this.materials=new Map();this.box=new T.BoxGeometry(1,1,1);this.pole=new T.CylinderGeometry(.075,.075,1,8);this.lamp=new T.SphereGeometry(.14,8,6);}
 mat(color){if(!this.materials.has(color))this.materials.set(color,new T.MeshStandardMaterial({color,roughness:.8}));return this.materials.get(color);}
 add(parent,c){const s=crossingCenter(c),world=this.world;
  // Near 姨捨 the track follows the mapped OSM layout; wait for it, then sit on that main line.
  if(world.obasute?.info&&!world.obasute.loaded&&Math.abs(s-world.obasute.info.s)<1040){world.obasute.ready.then(()=>{if(parent.parent&&!this.disposed)this.add(parent,c);});return null;}
  const special=world.obasute?.mainFrame?.(s),frame=special??world.frame(s),group=new T.Group();group.position.copy(frame.p);if(!special&&!world.frameIncludesDeck)group.position.y+=world.deckHeight?.(s)??0;group.rotation.y=frame.angle;group.userData.crossing=true;const drive=special?0:world.driveOffset?.(s)??0;
  const offsets=special?[0]:[drive,...(world.railTracks?.filter(t=>s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]).map(t=>{const knots=t.knots;let i=1;while(i<knots.length-1&&knots[i][0]<s)i++;const a=knots[i-1],b=knots[i];return a[1]+(b[1]-a[1])*(s-a[0])/Math.max(.001,b[0]-a[0]);})??world.trackLayout?.activeAt(s).map(t=>t.x)??[drive+4.2])].filter(x=>Math.abs(x-drive)<28),left=Math.min(...offsets)-3.2,right=Math.max(...offsets)+3.2;
  const mesh=(w,h,d,x,y,z,color)=>{const m=new T.Mesh(this.box,this.mat(color));m.scale.set(w,h,d);m.position.set(x,y,z);m.userData.shadowCaster=h>.3;group.add(m);return m;};
  // Asphalt panels remain below the rail head, and the approaches extend away from the track.
  mesh(right-left+18,.12,5.5,(left+right)/2,.055,0,'#4a4d4a');for(const edge of [-2.6,2.6])mesh(right-left+17,.018,.1,(left+right)/2,.125,edge,'#e7dfb0');
  const lamps=[],arms=[];
  for(const [side,x]of[[-1,left],[1,right]]){
   const z=side*3.3;mesh(.32,.3,.32,x,.15,z,'#77756b');
   for(let i=0;i<11;i++)mesh(.15,.26,.15,x,.43+i*.26,z,i%2?'#e5bc24':'#292a24');
   for(const angle of[-.65,.65]){const cross=mesh(.17,1.05,.09,x,3.25,z,'#eac32d');cross.rotation.z=angle;}
   for(const sign of[-1,1]){mesh(.38,.4,.15,x+sign*.25,2.62,z,'#222322');const material=new T.MeshStandardMaterial({color:'#8b0806',emissive:'#ff1608',emissiveIntensity:0});const light=new T.Mesh(this.lamp,material);light.position.set(x+sign*.25,2.62,z-.11);group.add(light);lamps.push({light,phase:sign>0?1:0});}
   const hinge=new T.Group();hinge.position.set(x,1.05,-z);group.add(hinge);const length=Math.min(6,(right-left)/2+1);
   for(let i=0;i<16;i++){const bar=new T.Mesh(this.box,this.mat(i%2?'#d8af22':'#272821'));bar.scale.set(.09,.08,length/16);bar.position.z=side*(i+.5)*length/16;hinge.add(bar);}arms.push({hinge,side});
   mesh(.5,.9,.5,x,.45,-z,'#555b56');
  }
  parent.add(group);world.atmosphere?.prepare(group);const item={group,c,lamps,arms,angle:null};this.items.push(item);return item;
 }
 update(s,v,dt,length){this.items=this.items.filter(x=>x.group.parent===this.world.scene||x.group.parent?.parent===this.world.scene);for(const item of this.items){const active=crossingActive(item.c,s,v,length),target=active?0:1;if(item.angle===null)item.angle=target;else item.angle+=Math.max(-dt*.45,Math.min(dt*.45,target-item.angle));for(const arm of item.arms)arm.hinge.rotation.x=-arm.side*item.angle*Math.PI/2;for(const {light,phase}of item.lamps)light.material.emissiveIntensity=active&&Math.floor(performance.now()/430)%2===phase?3:0;}}
 release(parent){for(const item of this.items.filter(x=>x.group.parent===parent)){parent.remove(item.group);for(const {light}of item.lamps)light.material.dispose();}this.items=this.items.filter(x=>x.group.parent!==null);}
 dispose(){this.disposed=true;for(const item of this.items){item.group.parent?.remove(item.group);for(const {light}of item.lamps)light.material.dispose();}for(const m of this.materials.values())m.dispose();this.box.dispose();this.pole.dispose();this.lamp.dispose();this.items=[];}
}
export class CrossingAudio{
 constructor(sound){this.sound=sound;this.context=sound.context??sound.ctx;this.nodes=new Map();this.joints=new RailJointAudio(sound);this.ready=fetch(new URL('./assets/audio/crossing.mp3',import.meta.url)).then(r=>{if(!r.ok)throw Error('crossing audio unavailable');return r.arrayBuffer();}).then(b=>this.context.decodeAudioData(b)).then(b=>{this.buffer=b;}).catch(e=>{this.error=e;});this.ready=Promise.all([this.ready,this.joints.ready]);}
 update(world,s,v,viewMode,paused=false,length=40){this.joints.update(world,s,v,paused,length);if(!this.buffer||this.disposed)return;const now=this.context.currentTime,active=new Set(),rows=world.route?.structures??world.routeStructures?.structures??[];
  for(const c of rows){if(c.kind!=='crossing'||!crossingActive(c,s,v,length))continue;const cs=crossingCenter(c),point=world.frame(cs,world.driveOffset?.(cs)??0).p.clone();point.y+=2;const distance=point.distanceTo(world.camera.position);if(distance>250)continue;const key=cs;active.add(key);let node=this.nodes.get(key);
   if(!node){const source=this.context.createBufferSource(),gain=this.context.createGain(),pan=this.context.createStereoPanner();source.buffer=this.buffer;source.loop=true;source.connect(gain).connect(pan).connect(this.sound.mix?.gains.se??this.sound.master);gain.gain.value=0;source.start();node={source,gain,pan};this.nodes.set(key,node);}
   const pitch=viewMode<2?crossingDoppler(s,v,cs):1;node.source.playbackRate.setTargetAtTime(pitch,now,.045);node.gain.gain.setTargetAtTime(paused?0:.65/(1+(distance/27)**2),now,.065);const right=new T.Vector3(1,0,0).applyQuaternion(world.camera.quaternion),delta=point.sub(world.camera.position);node.pan.pan.setTargetAtTime(T.MathUtils.clamp(delta.dot(right)/Math.max(8,distance),-1,1),now,.065);
  }
  for(const [key,node]of this.nodes)if(!active.has(key)){node.source.stop();node.source.disconnect();node.gain.disconnect();node.pan.disconnect();this.nodes.delete(key);}
 }
 dispose(){this.joints.dispose();this.disposed=true;for(const node of this.nodes.values()){try{node.source.stop();}catch{}node.source.disconnect();node.gain.disconnect();node.pan.disconnect();}this.nodes.clear();}
}
