import {sceneryDensity} from './scenery-profile.js?v=116';
const clamp=x=>Math.max(0,Math.min(1,x));
export function ambientLevels(route,s,v,type,viewMode,tunnel=false){
 const d=sceneryDensity(route,s),city=clamp(Math.max(d.building/90,d.urban??0)),hill=clamp((d.forest??d.green/100)*1.4),stations=route.sceneryStations??route.stations??[];
 let nearest=null,distance=Infinity;for(const st of stations){const delta=Math.abs(s-st.s);if(delta<distance){nearest=st;distance=delta;}}
 const station=clamp(1-distance/140)*clamp(1-v/14),outside=viewMode>=2?1:.38,attenuation=tunnel?0:outside;
 const index=nearest?Math.abs(Array.from(nearest.name??'').reduce((a,c)=>a+c.codePointAt(0),0))%4+1:1;
 return {[`B0${index}STNNO`]:station*.36*attenuation,city_se:city*.20*(1-station*.6)*attenuation,hill_se:hill*(1-city)*.28*attenuation,rain_se:['rain','thunderstorm','typhoon'].includes(type)?(type==='rain'?.38:.65)*attenuation:0,snow_se:['snow','heavySnow'].includes(type)?(type==='heavySnow'?.50:.26)*attenuation:0};
}
export class AmbientAudio{
 constructor(sound){this.sound=sound;this.context=sound.context??sound.ctx;this.nodes=new Map();this.buffers=new Map();this.generation=0;}
 update(world,s,v,viewMode,paused){
  if(!this.context||this.disposed)return;
  const route=world.route??world.sceneryRoute??{},tunnel=Boolean(world.routeStructures?.tunnelAt?.(s)??route.structures?.some(x=>x.kind==='tunnel'&&s>=x.sStart&&s<=x.sEnd)),levels=paused?{}:ambientLevels(route,s,v,world.weather,viewMode,tunnel),now=this.context.currentTime;
  const stormClock=world.atmosphere?.weatherScene?.clock??0,cycle=Math.floor(stormClock/13);
  if(world.weather==='thunderstorm'&&!paused&&!tunnel&&stormClock%13>1.2&&this.lastThunder!==cycle){this.lastThunder=cycle;this.thunder(viewMode>=2?1:.4);}
  if(paused)this.thunderGain?.gain.setTargetAtTime(0,now,.025);
  for(const [key,volume] of Object.entries(levels))if(volume>.001&&!this.nodes.has(key))this.start(key);
  for(const [key,node]of this.nodes){if(!node.gain)continue;const target=levels[key]??0;node.gain.gain.setTargetAtTime(target,now,paused?.025:.8);if(target>0)node.last=now;else if(now-node.last>4){node.source.stop();node.source.disconnect();node.gain.disconnect();this.nodes.delete(key);}}
 }
 thunder(level){
  const ctx=this.context,buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let low=0;
  for(let i=0;i<data.length;i++){low=.97*low+.03*(Math.random()*2-1);data[i]=low*Math.exp(-i/(ctx.sampleRate*.8));}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=220;gain.gain.value=level*2;source.connect(filter).connect(gain).connect(this.sound.mix?.gains.se??this.sound.master);this.thunderGain=gain;this.thunderSource?.stop();this.thunderSource=source;source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();
 }
 start(key){
  const generation=this.generation;this.nodes.set(key,{});
  if(!this.buffers.has(key))this.buffers.set(key,fetch(new URL(`./assets/audio/ambient/${key}.ogg`,import.meta.url)).then(r=>{if(!r.ok)throw Error(key);return r.arrayBuffer();}).then(b=>this.context.decodeAudioData(b)));
  this.buffers.get(key).then(buffer=>{if(generation!==this.generation||this.disposed)return;const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.loop=true;gain.gain.value=0;source.connect(gain).connect(this.sound.mix?.gains.se??this.sound.master);source.start();this.nodes.set(key,{source,gain,last:this.context.currentTime});}).catch(()=>{this.nodes.delete(key);});
 }
 stop(){this.generation++;this.thunderSource?.stop();this.thunderSource=null;for(const node of this.nodes.values()){node.source?.stop();node.source?.disconnect();node.gain?.disconnect();}this.nodes.clear();}
 dispose(){this.stop();this.disposed=true;this.buffers.clear();}
}
