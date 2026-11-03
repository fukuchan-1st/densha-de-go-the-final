import {departureFilesFor,STATION_DEPARTURE_AUDIO} from '../../train-operations.js?v=23';
import {runPitch} from './run-pitch.js';
// Browser port of the supplied RTM RSM2 sound_701.js. Speed input is km/h.
export function interpolate(points, speed) {
  if (points.length === 1) return 0;
  if (speed < points[0][0]) return points[0][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1];
    if (speed >= x0 && speed <= x1) return y0 + (y1-y0)*(speed-x0)/(x1-x0);
  }
  return points[points.length-1][1];
}
export function trackValues(track, speed, notch, fade) {
  const pitch = Math.min(2, Math.max(.5, interpolate(track.pitch, speed)));
  let volume = speed > track.volume.at(-1)[0] ? 0 : Math.min(1, Math.max(0, interpolate(track.volume, speed)));
  let mix;
  const p=track.isNotchPower, o=track.isNotchOff, b=track.isNotchBrake;
  if (track.isFadeMixer && (o !== p || o !== b)) {
    const off=1-Math.abs(fade);
    mix = Math.max(Number(p && fade>0), Number(o && off>0), Number(b && fade<0)) * (o ? off : Math.abs(fade));
  } else {
    mix = Math.max(Number(p && notch>0), Number(o && notch===0), Number(b && notch<0));
  }
  // All source tunnel flags are null; no unverified tunnel coloration added.
  return {pitch, volume: volume * mix * Number(!track.isMute)};
}
export class SoundEngine {
  constructor() { this.ready=false; this.paused=false; this.level=.65; this.fade=0; this.tickAccumulator=0; this.nodes=[]; this.error=null; }
  async init() {
    if (this.ready) { await this.ctx.resume(); return; }
    if (this.loading) return this.loading;
    // Call directly from a user gesture to satisfy browser sound permissions.
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value=this.level;
    this.compressor=this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value=-6;
    this.compressor.ratio.value=8;
    this.master.connect(this.compressor).connect(this.ctx.destination);
    this.loading=(async()=>{
      const response=await fetch(new URL('./sound-config.json',import.meta.url));
      if (!response.ok) throw Error('音源設定を読み込めません');
      this.config=await response.json();
      const cache=new Map();
      const load=async file=>{
        if (!cache.has(file)) cache.set(file,(async()=>{
          const r=await fetch(new URL(file,import.meta.url));
          if (!r.ok) throw Error(`音源を読み込めません: ${file}`);
          return this.ctx.decodeAudioData(await r.arrayBuffer());
        })());
        return cache.get(file);
      };
      this.nodes=await Promise.all(this.config.tracks.filter(track=>/motor/i.test(track.fileName)).map(async track=>({track,buffer:await load(track.url),gain:null,source:null})));
      this.effects={};
      const bveResponse=await fetch(new URL('./bve/config.json',import.meta.url));if(!bveResponse.ok)throw Error('BVE音源設定を読み込めません');
      this.bveConfig=await bveResponse.json();
      await Promise.all(Object.entries(this.bveConfig.files).map(async([key,path])=>{this.effects[key]=await load('bve/'+path);}));
      this.departureBuffers=new Map();
      await Promise.all([...new Set([...Object.values(STATION_DEPARTURE_AUDIO),'departure-chime.wav'])].map(async file=>this.departureBuffers.set(file,await load(file))));
      this.ready=true;
    })().catch(e=>{this.error=e.message; this.loading=null; throw e;});
    return this.loading;
  }
  setVolume(value) {
    this.level=Math.max(0,Math.min(1,Number(value)));
    if (this.master) this.master.gain.setTargetAtTime(this.paused?0:this.level,this.ctx.currentTime,.02);
  }
  setPaused(value) {
    this.paused=Boolean(value);
    if (this.master) this.master.gain.setTargetAtTime(this.paused?0:this.level,this.ctx.currentTime,.02);
    if(this.ctx)(this.paused?this.ctx.suspend():this.ctx.resume()).catch(()=>{});
  }
  async resume() { if (this.ctx) await this.ctx.resume(); this.setPaused(false); }
  update(speed,notch,dt,environment={}) {
    if (!this.ready || this.paused) return;
    speed=Math.max(0,speed);
    if(this.lastNotch!==undefined&&this.lastNotch!==notch)this.notchSound(this.lastNotch,notch);
    this.lastNotch=notch;
    const motorNotch=environment.doors||(notch===-1&&!environment.holdBraking)?0:notch;
    this.tickAccumulator+=Math.max(0,Math.min(dt,.25));
    while (this.tickAccumulator>=.05) {
      this.tickAccumulator-=.05;
      if (motorNotch>0) this.fade=Math.min(5,this.fade+1);
      else if (motorNotch<0) this.fade=Math.max(-5,this.fade-1);
      else this.fade+=this.fade<0?1:this.fade>0?-1:0;
    }
    const t=this.ctx.currentTime;
    this.activeTracks=[];
    for (const node of this.nodes) {
      const {pitch,volume}=trackValues(node.track,speed,motorNotch,this.fade/5);
      if (volume>0) {
        if (!node.source) {
          node.source=this.ctx.createBufferSource();
          node.source.buffer=node.buffer; node.source.loop=true;
          node.gain=this.ctx.createGain(); node.gain.gain.value=0;
          node.source.connect(node.gain).connect(this.master);
          node.source.playbackRate.value=pitch; node.source.start();
        }
        node.source.playbackRate.setTargetAtTime(pitch,t,.01);
        node.gain.gain.setTargetAtTime(volume,t,.01);
        this.activeTracks.push({name:node.track.fileName,pitch,volume});
      } else if (node.source) {
        node.source.stop(); node.source.disconnect(); node.gain.disconnect(); node.source=null; node.gain=null;
      }
    }
    this.updateBve(speed,notch,environment);
  }
  notchSound(previous,next){
    if(next===-9){this.playEffect('brakeEB');this.playEffect('emergencyAir');return;}
    if(next<0||previous<0){this.playEffect(next===0?'brakeMin':'brakeStep');if(next>previous&&previous<-1)this.playEffect(previous<=-4?'airHigh':'airRelease');}
    else this.playEffect(next===5?'powerMax':next===0?'powerMin':'powerStep');
  }
  loopEffect(key,volume,pitch=1){
    this.bveNodes??=new Map();let node=this.bveNodes.get(key);
    if(volume<=.001){if(node){node.source.stop();node.source.disconnect();node.gain.disconnect();this.bveNodes.delete(key);}return;}
    if(!node){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.effects[key];if(!source.buffer)return;source.loop=true;gain.gain.value=0;source.connect(gain).connect(this.master);source.start();node={source,gain};this.bveNodes.set(key,node);}
    node.source.playbackRate.setTargetAtTime(pitch,this.ctx.currentTime,.05);node.gain.gain.setTargetAtTime(volume,this.ctx.currentTime,.08);
  }
  updateBve(speed,notch,environment){
    const surface=environment.surface??'long',level=Math.min(1,speed/45)*.38,pitch=Math.max(.35,Math.min(2,speed/50));
    for(const [kind,key] of [['long','runLong'],['bridge','runBridge'],['tunnel','runTunnel']])this.loopEffect(key,surface===kind?level:0,runPitch(speed));
    this.loopEffect('noise',.12);
    this.loopEffect('shoe',notch<-1&&speed>1&&speed<30?Math.min(speed/10,1)*(1-speed/35)*.18:0,pitch);
    this.loopEffect('flange',speed>10?Math.max(0,Math.min(1,(Math.abs(environment.curvature??0)-.001)*600))*.16:0,Math.max(.6,pitch));
  }
  playEffect(name) {
    if (!this.ready || this.paused || !this.effects[name]) return Promise.resolve(false);
    const source=this.ctx.createBufferSource();source.buffer=this.effects[name];source.connect(this.master);
    this.effectSources??=new Map();let finish;const promise=new Promise(resolve=>finish=resolve);this.effectSources.set(source,finish);
    source.onended=()=>{source.disconnect();this.effectSources.delete(source);finish(true);};
    try{source.start();}catch{source.disconnect();this.effectSources.delete(source);finish(false);}return promise;
  }
  async playDoorClose(){
    const generation=this.departureGeneration??0;if(!this.ready)await this.init();
    if(generation!==(this.departureGeneration??0))return false;
    if(!this.effects.close)throw Error('戸閉音を読み込めません');
    const completed=await this.playDepartureBuffer(this.effects.close);
    return completed&&generation===(this.departureGeneration??0);
  }
  async playDeparture(stationName,onStage=()=>{}) {
    const generation=this.departureGeneration??0;
    if(!this.ready)await this.init();
    if(generation!==(this.departureGeneration??0))return false;
    if(this.paused)throw Error('運転が一時停止されています');
    for(const file of departureFilesFor(stationName)){
      if(generation!==(this.departureGeneration??0))return false;
      onStage(file==='departure-chime.wav'?'whistle':'station');
      const buffer=this.departureBuffers.get(file);if(!buffer)throw Error('発車音声を読み込めません');
      if(!await this.playDepartureBuffer(buffer))return false;
    }
    return generation===(this.departureGeneration??0);
  }
  playDepartureBuffer(buffer) {
    if(this.departure)return this.departure.promise;
    const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.master);
    let finish;const promise=new Promise(resolve=>{finish=resolve;});
    const active={source,promise,finish};this.departure=active;
    source.onended=()=>{source.disconnect();if(this.departure===active)this.departure=null;finish(true);};
    try{source.start();}catch(error){this.departure=null;source.disconnect();throw error;}return promise;
  }
  cancelDeparture(){
    this.departureGeneration=(this.departureGeneration??0)+1;
    const active=this.departure;if(!active)return;
    this.departure=null;active.source.onended=null;active.source.stop();active.source.disconnect();active.finish(false);
  }
  stop() {
    this.cancelDeparture();
    for (const node of this.nodes) if (node.source) {node.source.stop();node.source.disconnect();node.gain.disconnect();node.source=null;node.gain=null;}
    for(const node of this.bveNodes?.values()??[]){node.source.stop();node.source.disconnect();node.gain.disconnect();}this.bveNodes?.clear();
    for(const [source,finish] of this.effectSources??[]){source.onended=null;source.stop();source.disconnect();finish(false);}this.effectSources?.clear();
    this.lastNotch=undefined;this.fade=0; this.tickAccumulator=0;
  }
}
