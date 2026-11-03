import {interpolateColumn} from './final-vehicle.js?v=27';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const whistle={entryIndex:'departure-whistle'};
const voiceBanks={e235:['kanko0','uta'],e233:['kanko1','utb'],323:['kanko2','utd'],207:['kanko3','ute']};
const driverCallNumbers={doorsClosed:'001',departure:'003',stationStop:'065'};
const surfaces=['long','bridge','tunnel'];
export class LocalTrainAudio {
 constructor(recipe,pack,{context,volume=.65}={}){const AC=globalThis.AudioContext??globalThis.webkitAudioContext;this.context=context??new AC();this.ownsContext=!context;this.recipe=recipe;this.pack=pack;this.buffers=new Map();this.loops=new Map();this.sources=new Set();this.master=this.context.createGain();this.master.gain.value=volume;this.master.connect(this.context.destination);this.volume=volume;this.paused=false;this.stopped=false;this.generation=0;}
 static async create(recipe,pack,options){const audio=new LocalTrainAudio(recipe,pack,options);await audio.context.resume();return audio;}
 async buffer(ref){
  if(!ref)return null;
  const key=ref.entryIndex;
  if(!this.buffers.has(key)){
   const file=ref===whistle?'./assets/audio/departure-chime.wav':ref.driverVoiceFile;
   const bytes=file
    ?fetch(new URL(file,import.meta.url)).then(async response=>{
      if(!response.ok)throw Error('音声を読み込めません');
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
  for(const name of Object.keys(driverCallNumbers)){
   const ref=this.driverCallRef(name);
   if(ref)this.buffer(ref).catch(()=>{});
  }
 }
 driverCallRef(name){
  const bank=voiceBanks[this.recipe.id],number=driverCallNumbers[name];
  if(!bank||!number)return null;
  const [directory,prefix]=bank;
  const entryIndex=prefix+number;
  return {entryIndex,driverVoiceFile:`./assets/final/driver-voice/${directory}/${entryIndex}.wav`};
 }
 callDriver(...names){
  const generation=this.generation;
  const previous=this.driverQueue??Promise.resolve();
  this.driverQueue=previous.then(async()=>{
   for(const name of names){
    if(this.stopped||generation!==this.generation)return;
    await this.playRef(this.driverCallRef(name)).catch(()=>false);
   }
  });
  return this.driverQueue;
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
 playEffect(name){this.stopped=false;return this.playRef(this.effectRef(name));}
 async playRef(ref){if(!ref)return false;const generation=this.generation,buffer=await this.buffer(ref);if(this.stopped||generation!==this.generation)return false;const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.master);this.sources.add(source);return new Promise(resolve=>{source.onended=()=>{this.sources.delete(source);source.disconnect();resolve(generation===this.generation);};source.start();});}
 async loop(key,ref){
  if(!ref||this.loops.has(key))return;
  const loop={volume:0,pitch:1};
  this.loops.set(key,loop);
  try{
   const buffer=await this.buffer(ref);
   if(this.loops.get(key)!==loop)return;
   const source=this.context.createBufferSource(),gain=this.context.createGain();
   loop.source=source;
   loop.gain=gain;
   source.buffer=buffer;
   source.loop=true;
   source.playbackRate.value=loop.pitch;
   gain.gain.value=loop.volume;
   source.connect(gain);
   gain.connect(this.master);
   source.onended=()=>{
    this.sources.delete(source);
    if(this.loops.get(key)===loop)this.loops.delete(key);
    source.disconnect();
    gain.disconnect();
   };
   source.start();
   this.sources.add(source);
  }catch(e){
   if(this.loops.get(key)===loop)this.loops.delete(key);
   this.error=e.message;
  }
 }
 tuneLoop(key,ref,volume,pitch){
  this.loop(key,ref);
  const loop=this.loops.get(key);
  if(!loop)return;
  loop.volume=volume;
  loop.pitch=pitch;
  const time=this.context.currentTime;
  loop.gain?.gain.setTargetAtTime(volume,time,.08);
  loop.source?.playbackRate.setTargetAtTime(pitch,time,.06);
 }
 releaseLoop(key){
  const loop=this.loops.get(key);
  if(!loop)return;
  this.loops.delete(key);
  const time=this.context.currentTime;
  loop.gain?.gain.setTargetAtTime(0,time,.008);
  loop.source?.stop(time+.035);
 }
 update(speed,notch,dt=1/60,{surface='long',doors=false}={}){if(this.paused)return;this.stopped=false;
  if(this.lastNotch!==undefined&&this.lastNotch!==notch)this.playNotch(this.lastNotch,notch).catch(()=>{});
  this.lastNotch=notch;
  const s=this.recipe.sounds,run=this.runRef(surface),runKey='run'+run?.entryIndex;
  this.tuneLoop(runKey,run,clamp(speed/65,0,.65),clamp(speed/45,.35,2.5));
  this.tuneLoop('noise',s.others?.noise,.15,1);
  for(const key of this.loops.keys()){
   if(key.startsWith('run')&&key!==runKey)this.tuneLoop(key,null,0,1);
  }
  const phase=doors?null:notch>0?'power':notch<0&&speed>.1?'brake':null;
  const tables=phase&&this.recipe.motorNoise?.[phase];
  for(const [index,ref] of Object.entries(s.motor??{})){
   const key='motor'+index;
   const volume=interpolateColumn(tables?.volume,index,speed);
   const pitch=interpolateColumn(tables?.frequency,index,speed,1);
   if(volume>0&&pitch>0)this.tuneLoop(key,ref,volume*.55,pitch);
   else this.releaseLoop(key);
  }
 }
 setVolume(n){this.volume=clamp(n,0,1);this.master.gain.value=this.volume;}
 async setPaused(paused){this.paused=paused;if(paused)await this.context.suspend();else await this.context.resume();}
 pause(){return this.setPaused(true);}
 resume(){return this.setPaused(false);}
 stop(){this.stopped=true;this.lastNotch=undefined;this.generation++;this.driverQueue=null;for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();this.loops.clear();}
 async dispose(){this.stop();this.buffers.clear();this.master.disconnect();if(this.ownsContext)await this.context.close();}
}
