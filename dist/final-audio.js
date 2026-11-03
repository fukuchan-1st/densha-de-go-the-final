import {interpolateColumn} from './final-vehicle.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const whistle={entryIndex:'departure-whistle'};
const surfaces=['long','bridge','tunnel'];
export class LocalTrainAudio {
 constructor(recipe,pack,{context,volume=.65}={}){const AC=globalThis.AudioContext??globalThis.webkitAudioContext;this.context=context??new AC();this.ownsContext=!context;this.recipe=recipe;this.pack=pack;this.buffers=new Map();this.loops=new Map();this.sources=new Set();this.master=this.context.createGain();this.master.gain.value=volume;this.master.connect(this.context.destination);this.volume=volume;this.paused=false;this.stopped=false;this.generation=0;}
 static async create(recipe,pack,options){const audio=new LocalTrainAudio(recipe,pack,options);await audio.context.resume();return audio;}
 async buffer(ref){
  if(!ref)return null;
  const key=ref.entryIndex;
  if(!this.buffers.has(key)){
   const bytes=ref===whistle
    ?fetch(new URL('./assets/audio/departure-chime.wav',import.meta.url)).then(async response=>{
      if(!response.ok)throw Error('発車合図音を読み込めません');
      return new Uint8Array(await response.arrayBuffer());
     })
    :this.pack.bytes(ref);
   this.buffers.set(key,bytes.then(data=>this.context.decodeAudioData(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength))));
  }
  return this.buffers.get(key);
 }
 runRef(surface){
  const run=this.recipe.sounds.run;
  // E235's slot 4 is a 15-minute recording. Slot 5 is its supplied short tunnel loop.
  const index=surface==='tunnel'?(this.recipe.id==='e235'?'5':'4'):surface==='bridge'?'3':'0';
  return run?.[index]??run?.['0'];
 }
 assetRefs(){
  const sounds=this.recipe.sounds;
  const effects=['open','close','hornPrimary','hornSecondary','powerUp','powerDown','brakeApply','brakeRelease','relayOn','relayOff'];
  return [...effects.map(name=>this.effectRef(name)),sounds.others?.noise,
   ...surfaces.map(surface=>this.runRef(surface)),...Object.values(sounds.motor??{})].filter(Boolean);
 }
 async prepare(){
  await Promise.all([...this.assetRefs(),whistle].map(ref=>this.buffer(ref)));
 }
 effectRef(name){
  const {door,horn,mastercontroller,brakehandle,pilotlamp,brake}=this.recipe.sounds;
  return {
   whistle,
   open:door?.openright??door?.['open right']??door?.openleft??door?.['open left'],
   close:door?.closeright??door?.['close right']??door?.closeleft??door?.['close left'],
   hornPrimary:horn?.primary,hornSecondary:horn?.secondary,
   powerUp:mastercontroller?.up,powerDown:mastercontroller?.down,
   brakeApply:brakehandle?.apply,brakeRelease:brakehandle?.release,
   relayOn:pilotlamp?.on,relayOff:pilotlamp?.off,air:brake?.bcrelease??brake?.['bc release']
  }[name];
 }
 playNotch(previous,next){
  if(previous===next)return Promise.resolve(false);
  if(next<0||previous<0&&next===0)return this.playEffect(next<previous?'brakeApply':'brakeRelease');
  return this.playEffect(next>previous?'powerUp':'powerDown');
 }
 async playEffect(name){const ref=this.effectRef(name);if(!ref)return false;this.stopped=false;const generation=this.generation,buffer=await this.buffer(ref);if(this.stopped||generation!==this.generation)return false;const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.master);this.sources.add(source);return new Promise(resolve=>{source.onended=()=>{this.sources.delete(source);resolve(generation===this.generation);};source.start();});}
 async loop(key,ref){if(!ref||this.loops.has(key))return;const generation=this.generation;this.loops.set(key,{loading:true});try{const buffer=await this.buffer(ref);if(this.stopped||generation!==this.generation)return;const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.master);source.start();this.sources.add(source);this.loops.set(key,{source,gain});}catch(e){if(generation===this.generation)this.loops.delete(key);this.error=e.message;}}
 update(speed,notch,dt=1/60,{surface='long',doors=false}={}){if(this.paused)return;this.stopped=false;
  if(this.lastNotch!==undefined&&this.lastNotch!==notch)this.playNotch(this.lastNotch,notch).catch(()=>{});
  this.lastNotch=notch;
  const s=this.recipe.sounds,run=this.runRef(surface),runKey='run'+run?.entryIndex;this.loop(runKey,run);this.loop('noise',s.others?.noise);for(const [index,ref] of Object.entries(s.motor??{}))this.loop('motor'+index,ref);const time=this.context.currentTime;
  for(const [key,l] of this.loops){if(l.loading)continue;let volume=0,pitch=1;if(key.startsWith('run')){volume=key===runKey?clamp(speed/65,0,.65):0;pitch=clamp(speed/45,.35,2.5);}else if(key==='noise')volume=.15;else if(key.startsWith('motor')){const index=Number(key.slice(5)),phase=notch>0&&!doors?'power':notch<0?'brake':null,tables=phase&&this.recipe.motorNoise[phase];if(tables){volume=clamp(interpolateColumn(tables.volume,index,speed),0,1)*.55;pitch=clamp(interpolateColumn(tables.frequency,index,speed,1),.05,4);}}
   l.gain.gain.setTargetAtTime(volume,time,.08);l.source.playbackRate.setTargetAtTime(pitch,time,.06);
  }
 }
 setVolume(n){this.volume=clamp(n,0,1);this.master.gain.value=this.volume;}
 async setPaused(paused){this.paused=paused;if(paused)await this.context.suspend();else await this.context.resume();}
 pause(){return this.setPaused(true);}
 resume(){return this.setPaused(false);}
 stop(){this.stopped=true;this.lastNotch=undefined;this.generation++;for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();this.loops.clear();}
 async dispose(){this.stop();this.buffers.clear();this.master.disconnect();if(this.ownsContext)await this.context.close();}
}
