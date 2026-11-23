let shared;
export function sharedEffects(){const AC=globalThis.AudioContext??globalThis.webkitAudioContext;if(!AC)return null;return shared??=new BufferedEffects(new AC());}
export class BufferedEffects{
 constructor(context,{fetchAudio=(...args)=>globalThis.fetch(...args),createAudio=typeof Audio==='undefined'?null:url=>new Audio(url)}={}){
  this.context=context;this.fetchAudio=fetchAudio;this.createAudio=createAudio;this.buffers=new Map();this.clips=new Map();
  if(typeof document!=='undefined'){
   const unlock=()=>{this.resume().catch(()=>{});};
   // iOS may require the completed touch gesture, and can interrupt audio on app switches.
   for(const name of ['pointerdown','touchend','click','keydown'])document.addEventListener(name,unlock,{capture:true,passive:true});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)unlock();});
  }
 }
 resume(){
  try{return Promise.resolve(this.context.resume()).then(()=>{if(this.context.state&&this.context.state!=='running')throw Error('音声の再開待ち');});}catch(error){return Promise.reject(error);}
 }
 buffer(url){const key=String(url);if(!this.buffers.has(key)){const pending=this.fetchAudio(key).then(async response=>{if(!response.ok)throw Error('効果音を取得できません');return this.context.decodeAudioData(await response.arrayBuffer());}).catch(error=>{this.buffers.delete(key);throw error;});this.buffers.set(key,pending);}return this.buffers.get(key);}
 preload(urls){for(const url of urls){if(this.createAudio&&!this.clips.has(String(url))){const clip=this.createAudio(String(url));clip.preload='auto';clip.load?.();this.clips.set(String(url),clip);}}return Promise.all(urls.map(url=>this.buffer(url)));}
 playSequence(urls,volume=.65){
  const sources=new Set();let stopped=false,resolveDone;const done=new Promise(resolve=>resolveDone=resolve);
  const stop=()=>{stopped=true;for(const source of sources){try{if(source.stop)source.stop();else source.pause();}catch{}}sources.clear();resolveDone(false);};
  const fallback=()=>{if(stopped)return;if(!this.createAudio){resolveDone(false);return;}const pending=[...urls];
   const next=()=>{if(stopped)return;const url=pending.shift();if(!url){resolveDone(true);return;}const cached=this.clips.get(String(url)),clip=cached?.cloneNode?cached.cloneNode(true):this.createAudio(String(url));clip.volume=volume;sources.add(clip);const ended=()=>{sources.delete(clip);next();};clip.onended=ended;clip.onerror=ended;clip.play().catch(()=>{sources.delete(clip);resolveDone(false);});};next();};
  const schedule=buffers=>{if(stopped)return;const gain=this.context.createGain();gain.gain.value=volume;gain.connect(this.context.destination);let at=this.context.currentTime+.005,remaining=buffers.length;if(!remaining){gain.disconnect();resolveDone(true);return;}
   for(const buffer of buffers){const source=this.context.createBufferSource();source.buffer=buffer;source.connect(gain);sources.add(source);source.onended=()=>{source.disconnect();sources.delete(source);if(!--remaining){gain.disconnect();resolveDone(!stopped);}};source.start(at);at+=buffer.duration;}
  };
  // Start each new pair immediately, independent of any previous pair.
  Promise.all([Promise.all(urls.map(url=>this.buffer(url))),this.resume()]).then(([buffers])=>schedule(buffers)).catch(fallback);return {done,stop};
 }
}
