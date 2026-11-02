import {interpolateColumn} from './final-vehicle.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class LocalTrainAudio {
 constructor(recipe,pack,{context,volume=.65}={}){const AC=globalThis.AudioContext??globalThis.webkitAudioContext;this.context=context??new AC();this.ownsContext=!context;this.recipe=recipe;this.pack=pack;this.buffers=new Map();this.loops=new Map();this.sources=new Set();this.master=this.context.createGain();this.master.gain.value=volume;this.master.connect(this.context.destination);this.volume=volume;this.paused=false;this.stopped=false;this.generation=0;}
 static async create(recipe,pack,options){const audio=new LocalTrainAudio(recipe,pack,options);await audio.context.resume();return audio;}
 async buffer(ref){if(!ref)return null;const key=ref.entryIndex;if(!this.buffers.has(key))this.buffers.set(key,this.pack.bytes(ref).then(bytes=>this.context.decodeAudioData(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))));return this.buffers.get(key);}
 effectRef(name){const s=this.recipe.sounds;return ({open:s.door?.openright??s.door?.['open right']??s.door?.openleft??s.door?.['open left'],close:s.door?.closeright??s.door?.['close right']??s.door?.closeleft??s.door?.['close left'],hornPrimary:s.horn?.primary,hornSecondary:s.horn?.secondary,notch:s.mastercontroller?.up??s.brakehandle?.apply,relayOn:s.pilotlamp?.on,relayOff:s.pilotlamp?.off,air:s.brake?.bcrelease??s.brake?.['bc release']})[name];}
 async playEffect(name){const ref=this.effectRef(name);if(!ref)return false;this.stopped=false;const generation=this.generation,buffer=await this.buffer(ref);if(this.stopped||generation!==this.generation)return false;const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.master);this.sources.add(source);return new Promise(resolve=>{source.onended=()=>{this.sources.delete(source);resolve(generation===this.generation);};source.start();});}
 async loop(key,ref){if(!ref||this.loops.has(key))return;const generation=this.generation;this.loops.set(key,{loading:true});try{const buffer=await this.buffer(ref);if(this.stopped||generation!==this.generation)return;const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.master);source.start();this.sources.add(source);this.loops.set(key,{source,gain});}catch(e){if(generation===this.generation)this.loops.delete(key);this.error=e.message;}}
 update(speed,notch,dt=1/60,{surface='long',doors=false}={}){if(this.paused)return;this.stopped=false;const s=this.recipe.sounds,runIndex=surface==='tunnel'?'4':surface==='bridge'?'3':'0';this.loop('run'+runIndex,s.run?.[runIndex]??s.run?.['0']);this.loop('noise',s.others?.noise);for(const [index,ref] of Object.entries(s.motor??{}))this.loop('motor'+index,ref);const time=this.context.currentTime;
  for(const [key,l] of this.loops){if(l.loading)continue;let volume=0,pitch=1;if(key.startsWith('run')){volume=key==='run'+runIndex?clamp(speed/65,0,.65):0;pitch=clamp(speed/45,.35,2.5);}else if(key==='noise')volume=.15;else if(key.startsWith('motor')){const index=Number(key.slice(5)),phase=notch>0&&!doors?'power':notch<0?'brake':null,tables=phase&&this.recipe.motorNoise[phase];if(tables){volume=clamp(interpolateColumn(tables.volume,index,speed),0,1)*.55;pitch=clamp(interpolateColumn(tables.frequency,index,speed,1),.05,4);}}
   l.gain.gain.setTargetAtTime(volume,time,.08);l.source.playbackRate.setTargetAtTime(pitch,time,.06);
  }
 }
 setVolume(n){this.volume=clamp(n,0,1);this.master.gain.value=this.volume;}
 async setPaused(paused){this.paused=paused;if(paused)await this.context.suspend();else await this.context.resume();}
 pause(){return this.setPaused(true);}
 resume(){return this.setPaused(false);}
 stop(){this.stopped=true;this.generation++;for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();this.loops.clear();}
 async dispose(){this.stop();this.buffers.clear();this.master.disconnect();if(this.ownsContext)await this.context.close();}
}
