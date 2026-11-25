import * as T from './assets/vendor/three.module.js?v=117';
export const JOINT_SPACING=25;
export function crossedJoints(previous,current,spacing=JOINT_SPACING){if(current<=previous||current-previous>100)return [];const rows=[];for(let n=Math.floor(previous/spacing)+1;n<=Math.floor(current/spacing);n++)rows.push(n*spacing);return rows;}
export function randomJointIndex(previous=-1,random=Math.random){const choices=Array.from({length:7},(_,i)=>i).filter(i=>i!==previous);return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];}
export class RailJointAudio{
 constructor(sound){this.sound=sound;this.context=sound.context??sound.ctx;this.sources=new Set();this.ready=Promise.all(Array.from({length:7},(_,i)=>fetch(new URL('./assets/audio/joints/rail_soft'+(i+1)+'.wav',import.meta.url)).then(r=>{if(!r.ok)throw Error('joint sound unavailable');return r.arrayBuffer();}).then(b=>this.context.decodeAudioData(b)))).then(buffers=>{this.buffers=buffers;}).catch(error=>{this.error=error;});}
 update(world,s,speed,paused,length=40){const previous=this.lastS;this.lastS=s;if(paused||previous==null||speed<.5||!this.buffers?.length)return;const camera=world.camera,count=Math.max(1,Math.round(length/20)),right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion);let emitted=0;
  for(let car=0;car<count;car++)for(const wheel of[2.4,4.2,15.8,17.6])for(const joint of crossedJoints(previous-car*20-wheel,s-car*20-wheel)){
   const point=(world.drivePoint?.(joint)??world.frame(joint,world.driveOffset?.(joint)??0).p).clone();point.y+=.2;const distance=point.distanceTo(camera.position);if(distance>65||emitted>=12)continue;emitted++;const source=this.context.createBufferSource(),gain=this.context.createGain(),pan=this.context.createStereoPanner();this.lastClip=randomJointIndex(this.lastClip);source.buffer=this.buffers[this.lastClip];source.playbackRate.value=this.sound.passby?.running.pitch??1;gain.gain.value=.35/(1+(distance/13)**2);pan.pan.value=T.MathUtils.clamp(point.sub(camera.position).dot(right)/Math.max(8,distance),-1,1);source.connect(gain).connect(pan).connect(this.sound.mix?.gains.running??this.sound.master);this.sources.add(source);source.onended=()=>{source.disconnect();gain.disconnect();pan.disconnect();this.sources.delete(source);};source.start();
  }
 }
 dispose(){for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}this.sources.clear();}
}
