import {motorVolumeReference,SlipPitchController,fixedCurveValue} from './motor-pitch.js?v=107';
import {AmbientAudio} from './ambient-audio.js?v=107';
import {stationDepartureCue} from './station-broadcast.js?v=107';
import {TrainPassbyAudio} from './train-passby-audio.js?v=107';
import {timingVoiceRefs,timingPreloadRefs,restrictionVoiceRefs} from './station-timing.js?v=107';
import {stationCueRefs,stationVoiceBank} from './station-voice.js?v=107';
import {createMixGains,voiceCategory} from './audio-mix.js?v=107';
import {interpolateColumn} from './final-vehicle.js?v=107';
import {runPitch} from './assets/audio/run-pitch.js?v=107';
import {HeldHorn} from './assets/audio/held-horn.js?v=107';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const whistle={entryIndex:'departure-whistle'};
const voiceBanks={e235:['kanko0','uta'],e233:['kanko1','utb'],323:['kanko2','utd'],207:['kanko3','ute']};
const driverCallNumbers={doorsClosed:'001',departure:'003',stationStop:'065'};
const surfaces=['long','bridge','tunnel'];
const frequencyEndpoints=new WeakMap();

export function motorPitch(table,column,speed,slipping=false,actualSpeed=speed){
 const pitch=interpolateColumn(table,column,speed,1);
 if(!table?.rows)return pitch;
 if(!frequencyEndpoints.has(table))frequencyEndpoints.set(table,new Map());
 const channels=frequencyEndpoints.get(table),channel=String(column);
 if(!channels.has(channel)){
  const labels=table.labels??[];
  const hasChannelIds=labels.some(label=>/^\d+$/.test(String(label).trim()));
  const index=hasChannelIds?labels.findIndex(label=>String(label).trim()===channel):Number(column);
  const points=new Map();
  if(index>=0){
   for(const row of table.rows){
    const value=row[index+1];
    if(Number.isFinite(row[0])&&Number.isFinite(value))points.set(row[0],value);
   }
  }
  channels.set(channel,[...points].sort(([a],[b])=>a-b));
 }
 const curve=channels.get(channel),fixed=fixedCurveValue(curve,actualSpeed);if(fixed!==null)return fixed;
 const endpoints=curve.slice(-2);
 if(endpoints.length<2||speed<=endpoints[1][0])return pitch;
 const [[a,x],[b,y]]=endpoints;
 // Frequency tables often end at the sample's 1x reference speed. Continue
 // that slope above the reference, while volume keeps its endpoint behavior.
 return y+(speed-b)*Math.max(0,(y-x)/(b-a));
}

export class LocalTrainAudio {
 constructor(recipe,pack,{context,volume=.65,mix={}}={}){const AC=globalThis.AudioContext??globalThis.webkitAudioContext;this.context=context??new AC();this.ownsContext=!context;this.recipe=recipe;this.pack=pack;this.buffers=new Map();this.loops=new Map();this.sources=new Set();this.master=this.context.createGain();this.master.gain.value=volume;this.master.connect(this.context.destination);this.mix=createMixGains(this.context,this.master,mix);this.passby=new TrainPassbyAudio(this.context,this.mix.gains.running,this.mix.gains.se);this.volume=volume;this.paused=false;this.stopped=false;this.generation=0;}
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
 runRef(surface,rollingIndex){
  const run=this.recipe.sounds.run;
  if(rollingIndex!=null&&run?.[rollingIndex])return run[rollingIndex];
  // E235's slot 4 is a 15-minute recording. Slot 5 is its supplied short tunnel loop.
  const index=surface==='tunnel'?(this.recipe.id==='e235'?'5':'4'):surface==='bridge'?'3':'0';
  return run?.[index]??run?.['0'];
 }
 assetRefs(){
  const sounds=this.recipe.sounds;
  const effects=['open','close','hornPrimary','hornSecondary','hornPrimaryRelease','hornSecondaryRelease','powerUp','powerDown','brakeApply','brakeRelease','relayOn','relayOff'];
  if(this.recipe.id==='6050')effects.push('brakeMin','brakeMax');
  const rolling=this.recipe.id==='6050'?Object.values(sounds.run??{}):surfaces.map(surface=>this.runRef(surface));
  return [...effects.map(name=>this.effectRef(name)),sounds.others?.noise,
   ...rolling,...Object.values(sounds.motor??{})].filter(Boolean);
 }
 configureDriverRoute(route,line){this.driverRoute=route;this.driverRouteLine=stationVoiceBank(line)?line:null;}
 stationRefs(kind,station){return stationCueRefs(this.driverRouteLine,station,kind,this.recipe.playableSpecs?.carCount);}
 callStation(kind,station){return this.queueDriverCalls(this.stationRefs(kind,station));}
 callSlowRestriction(kmh){const bank=stationVoiceBank(this.driverRouteLine)?.[0]??'kanko1',ref={entryIndex:'weather-slow:'+bank,driverVoiceFile:`./assets/audio/ambient/${bank}-slow40.ogg`},call=this.queueDriverCalls([ref]);if(!this.weatherWarningPlayed){this.weatherWarningPlayed=true;const generation=this.generation;call.then(()=>{if(!this.stopped&&this.generation===generation)this.playRef({entryIndex:'weather-warning',driverVoiceFile:'./assets/audio/ambient/slow-warning.ogg',mixCategory:'se'}).catch(()=>false);});}return call;}
 callRestriction(kmh){return this.queueDriverCalls(restrictionVoiceRefs(this.driverRouteLine,kmh));}
 callStationTiming(kind,station,error){return this.queueDriverCalls(timingVoiceRefs(this.driverRouteLine,station,kind,error));}
 async prepare(){
  await Promise.all([...this.assetRefs(),whistle].map(ref=>this.buffer(ref)));
  const stationRefs=[...timingPreloadRefs(this.driverRouteLine,this.driverRoute?.stations),...(this.driverRoute?.stations??[]).flatMap(st=>['approach','departure'].flatMap(kind=>this.stationRefs(kind,st))),...Object.keys(driverCallNumbers).map(name=>this.driverCallRef(name)).filter(Boolean)];
  await Promise.all([...new Map(stationRefs.map(ref=>[ref.entryIndex,ref])).values()].map(ref=>this.buffer(ref)));
 }
 driverCallRef(name){
  const bank=stationVoiceBank(this.driverRouteLine)??voiceBanks[this.recipe.id],number=driverCallNumbers[name];
  if(!bank||!number)return null;
  const [directory,prefix]=bank;
  const entryIndex=prefix+number;
  return {entryIndex,driverVoiceFile:`./assets/final/driver-voice/${directory}/${entryIndex}.wav`};
 }
 callDriver(...names){
  return this.queueDriverCalls(names.map(name=>this.driverCallRef(name)));
 }
 async playStationDeparture(station,isCurrent=()=>true){
  const cue=stationDepartureCue(this.driverRoute,station);if(!cue)return false;
  for(const ref of cue.refs){if(!isCurrent())return false;if(!await this.playRef(ref))return false;}
  return true;
 }
 callDepartureFrom(stationIndex){
  return this.callRouteCue('departure',stationIndex);
 }
 callRouteCue(kind,index){
  const bank=(stationVoiceBank(this.driverRouteLine)??voiceBanks[this.recipe.id])?.[0];
  if(!bank)return Promise.resolve();
  if(kind==='signal'&&(bank!=='kanko2'||index<1||index>4))return Promise.resolve();
  const entryIndex=kind+'-'+index;
  const driverVoiceFile=`./assets/final/driver-voice/${bank}/${kind}/${index}.wav`;
  return this.queueDriverCalls([{entryIndex,driverVoiceFile}]);
 }
 routeAnnouncementRef(routeId,key){
  return {entryIndex:`${routeId}-announcement-${key}`,driverVoiceFile:`./assets/final/${routeId}-announcements/${key}.mp3`};
 }
 callRouteAnnouncement(routeId,key){return this.queueDriverCalls([this.routeAnnouncementRef(routeId,key)],'announcementQueue');}
 playRouteAnnouncement(routeId,key){return this.playRef(this.routeAnnouncementRef(routeId,key));}
 queueDriverCalls(refs,queue='driverQueue'){
  const generation=this.generation;
  const previous=this[queue]??Promise.resolve();
  this[queue]=previous.then(async()=>{
   for(const ref of refs){
    if(this.stopped||generation!==this.generation)return;
    await this.playRef(ref).catch(()=>false);
   }
  });
  return this[queue];
 }
 effectRef(name){
  const {door,horn,mastercontroller,brakehandle,pilotlamp,brake}=this.recipe.sounds;
  return {
   whistle,
   open:door?.openright??door?.['open right']??door?.openleft??door?.['open left'],
   close:door?.closeright??door?.['close right']??door?.closeleft??door?.['close left'],
   hornPrimary:horn?.primary??horn?.secondary,hornSecondary:horn?.secondary,
   hornPrimaryRelease:['323','207'].includes(this.recipe.id)?null:horn?.primaryrelease??horn?.secondaryrelease,
   hornSecondaryRelease:horn?.secondaryrelease,
   powerUp:mastercontroller?.up,powerDown:mastercontroller?.down,
   brakeApply:brakehandle?.apply,brakeRelease:brakehandle?.release,
   brakeMin:brakehandle?.min,brakeMax:brakehandle?.max,
   relayOn:pilotlamp?.on,relayOff:pilotlamp?.off,air:brake?.bcrelease??brake?.['bc release']
  }[name];
 }
 setHorn(pressed){
  this.horn??=new HeldHorn(this.context,this.passby.horn.output);
  if(!pressed){this.horn.release();return;}
  if(this.paused||this.stopped||this.horn.active)return;
  const name=['323','207'].includes(this.recipe.id)?'hornSecondary':'hornPrimary';
  this.horn.setPlaybackRate(this.passby.horn.pitch);
  this.horn.press(this.buffer(this.effectRef(name)),this.buffer(this.effectRef(name+'Release')));
 }
 playNotch(previous,next){
  if(previous===next)return Promise.resolve(false);
  if(this.recipe.id==='6050'){
   if(next===-(this.recipe.playableSpecs.brakeNotches+1))return this.playEffect('brakeMax');
   if(previous<0&&next===0)return this.playEffect('brakeMin');
  }
  if(next<0||previous<0&&next===0)return this.playEffect(next<previous?'brakeApply':'brakeRelease');
  return this.playEffect(next>previous?'powerUp':'powerDown');
 }
 playEffect(name){this.stopped=false;return this.playRef(this.effectRef(name),name.startsWith('horn')?'horn':null);}
 async playRef(ref,spatialKind=null){if(!ref)return false;const generation=this.generation,buffer=await this.buffer(ref);if(this.stopped||generation!==this.generation)return false;const source=this.context.createBufferSource();source.buffer=buffer;source.connect(spatialKind?this.passby[spatialKind].output:this.mix.gains[voiceCategory(ref)]);if(spatialKind)this.passby.track(source,1,spatialKind);this.sources.add(source);return new Promise(resolve=>{source.onended=()=>{this.sources.delete(source);this.passby.forget(source);source.disconnect();resolve(generation===this.generation);};source.start();});}
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
   gain.connect(this.passby.running.output);
   source.onended=()=>{
    this.sources.delete(source);this.passby.forget(source);
    if(this.loops.get(key)===loop)this.loops.delete(key);
    source.disconnect();
    gain.disconnect();
   };
   this.passby.track(source,loop.pitch);source.start();
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
  if(loop.source)this.passby.track(loop.source,pitch);
 }
 releaseLoop(key){
  const loop=this.loops.get(key);
  if(!loop)return;
  this.loops.delete(key);
  const time=this.context.currentTime;
  loop.gain?.gain.setTargetAtTime(0,time,.008);
  loop.source?.stop(time+.035);
 }
 update(speed,notch,dt=1/60,{surface='long',doors=false,rollingIndex,motorSpeed=speed,inTunnel=false}={}){if(this.paused)return;this.stopped=false;
  if(this.lastNotch!==undefined&&this.lastNotch!==notch)this.playNotch(this.lastNotch,notch).catch(()=>{});
  this.lastNotch=notch;this.slipPitch??=new SlipPitchController();if(inTunnel)this.slipPitch.reset();motorSpeed=this.slipPitch.update(speed,motorSpeed,notch,dt);
  const s=this.recipe.sounds,run=this.runRef(surface,rollingIndex),runKey='run'+run?.entryIndex;
  const runIndex=Object.keys(s.run??{}).find(index=>s.run[index]===run);
  const rollingBase=this.recipe.rollingBaseSpeedKmh;
  const rollingRate=runPitch(speed,typeof rollingBase==='number'?rollingBase:rollingBase?.[runIndex]);
  this.tuneLoop(runKey,run,clamp(speed/65,0,.65),rollingRate);
  this.tuneLoop('noise',s.others?.noise,.15,1);
  for(const key of this.loops.keys()){
   if(key.startsWith('run')&&key!==runKey)this.tuneLoop(key,null,0,rollingRate);
  }
  const phase=doors?null:notch>0?'power':notch<0&&speed>.1?'brake':null;
  const tables=phase&&this.recipe.motorNoise?.[phase];
  for(const [index,ref] of Object.entries(s.motor??{})){
   const key='motor'+index;
   const volume=interpolateColumn(tables?.volume,index,motorVolumeReference(tables?.volume,speed,motorSpeed));
   const pitch=motorPitch(tables?.frequency,index,motorSpeed,motorSpeed>speed+.01,speed);
   if(volume>0&&pitch>0)this.tuneLoop(key,ref,volume*.55,pitch);
   else this.releaseLoop(key);
  }
 }
 updatePassby(world,s,speed,viewMode,paused){if(this.context??this.ctx){this.ambient??=new AmbientAudio(this);this.ambient.update(world,s,speed,viewMode,paused);}this.passby.update(world,s,speed,viewMode,paused);this.horn?.setPlaybackRate(this.passby.horn.pitch);}
 setMix(values){this.mix.update(values);}
 setVolume(n){this.volume=clamp(n,0,1);this.master.gain.value=this.volume;}
 async setPaused(paused){this.paused=paused;this.master.gain.value=paused?0:this.volume;if(paused){this.horn?.end(true);await this.context.suspend();}else await this.context.resume();}
 pause(){return this.setPaused(true);}
 resume(){return this.setPaused(false);}
 stop(){this.slipPitch?.reset();this.ambient?.stop();this.horn?.end(true);this.passby.reset();this.stopped=true;this.lastNotch=undefined;this.generation++;this.driverQueue=null;this.announcementQueue=null;for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();this.loops.clear();}
 async dispose(){this.stop();this.passby.dispose();this.buffers.clear();this.master.disconnect();for(const node of Object.values(this.mix.gains))node.disconnect();if(this.ownsContext)await this.context.close();}
}
