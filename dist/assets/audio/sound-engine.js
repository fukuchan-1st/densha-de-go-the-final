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
      this.nodes=await Promise.all(this.config.tracks.map(async track=>({track,buffer:await load(track.url),gain:null,source:null})));
      this.effects={};
      await Promise.all(Object.entries(this.config.effects).map(async([key,effect])=>{this.effects[key]=await load(effect.url);}));
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
  }
  async resume() { if (this.ctx) await this.ctx.resume(); this.setPaused(false); }
  update(speed,notch,dt) {
    if (!this.ready || this.paused) return;
    speed=Math.max(0,speed);
    this.tickAccumulator+=Math.max(0,Math.min(dt,.25));
    while (this.tickAccumulator>=.05) {
      this.tickAccumulator-=.05;
      if (notch>0) this.fade=Math.min(5,this.fade+1);
      else if (notch<0) this.fade=Math.max(-5,this.fade-1);
      else this.fade+=this.fade<0?1:this.fade>0?-1:0;
    }
    const t=this.ctx.currentTime;
    this.activeTracks=[];
    for (const node of this.nodes) {
      const {pitch,volume}=trackValues(node.track,speed,notch,this.fade/5);
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
  }
  playEffect(name) {
    if (!this.ready || this.paused) return;
    const key=({open:'701dooropn.ogg',close:'701doorcls.ogg'})[name]||name;
    const buffer=this.effects[key]; if (!buffer) return;
    const source=this.ctx.createBufferSource(); source.buffer=buffer;
    source.connect(this.master); source.start();
    source.onended=()=>source.disconnect();
  }
  stop() {
    for (const node of this.nodes) if (node.source) {node.source.stop();node.source.disconnect();node.gain.disconnect();node.source=null;node.gain=null;}
    this.fade=0; this.tickAccumulator=0;
  }
}
