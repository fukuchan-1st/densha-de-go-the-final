import {sharedEffects} from './buffered-effects.js?v=111';
export class ScoreAudio {
 constructor({volume=()=>.65,createAudio,bus}={}){this.volume=volume;this.bus=bus??(createAudio?null:sharedEffects());this.createAudio=createAudio??(url=>new Audio(url));this.active=new Set();this.generation=0;}
 play(url){if(!url)return;const audio=this.createAudio(url);audio.volume=this.volume();this.active.add(audio);const done=()=>this.active.delete(audio);audio.onended=done;audio.onerror=done;audio.play().catch(done);return audio;}
 preload(urls){return this.bus?.preload(urls)??Promise.resolve();}
 playSequence(urls){if(this.bus){const group=this.bus.playSequence(urls,this.volume());this.active.add(group);group.done.finally(()=>this.active.delete(group));return group;}const generation=this.generation,pending=urls.filter(Boolean);const next=()=>{if(generation!==this.generation||!pending.length)return;const audio=this.play(pending.shift());const done=audio.onended;audio.onended=()=>{done();next();};audio.onerror=()=>{done();next();};};next();}
 stop(){this.generation++;for(const audio of this.active){if(audio.stop)audio.stop();else audio.pause();}this.active.clear();}
}
