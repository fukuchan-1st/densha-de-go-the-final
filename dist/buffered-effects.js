let shared;
export function sharedEffects(){const AC=globalThis.AudioContext??globalThis.webkitAudioContext;if(!AC)return null;return shared??=new BufferedEffects(new AC());}
export class BufferedEffects{
 constructor(context,{fetchAudio=fetch}={}){this.context=context;this.fetchAudio=fetchAudio;this.buffers=new Map();if(typeof document!=='undefined'){const unlock=()=>context.resume().catch(()=>{});document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});}}
 buffer(url){const key=String(url);if(!this.buffers.has(key)){const pending=this.fetchAudio(key).then(async response=>{if(!response.ok)throw Error('効果音を取得できません');return this.context.decodeAudioData(await response.arrayBuffer());}).catch(error=>{this.buffers.delete(key);throw error;});this.buffers.set(key,pending);}return this.buffers.get(key);}
 preload(urls){return Promise.all(urls.map(url=>this.buffer(url)));}
 playSequence(urls,volume=.65){const sources=new Set();let stopped=false,resolveDone;const done=new Promise(resolve=>resolveDone=resolve);const stop=()=>{stopped=true;for(const source of sources){try{source.stop();}catch{}}sources.clear();resolveDone(false);};
  const schedule=buffers=>{if(stopped)return;const gain=this.context.createGain();gain.gain.value=volume;gain.connect(this.context.destination);let at=this.context.currentTime+.005,remaining=buffers.length;if(!remaining){gain.disconnect();resolveDone(true);return;}
   for(const buffer of buffers){const source=this.context.createBufferSource();source.buffer=buffer;source.connect(gain);sources.add(source);source.onended=()=>{source.disconnect();sources.delete(source);if(!--remaining){gain.disconnect();resolveDone(!stopped);}};source.start(at);at+=buffer.duration;}
  };
  const pending=urls.map(url=>this.buffer(url));this.context.resume().catch(()=>{});Promise.all(pending).then(schedule).catch(()=>resolveDone(false));return {done,stop};
 }
}
