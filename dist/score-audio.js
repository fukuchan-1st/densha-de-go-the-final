export class ScoreAudio {
 constructor({volume=()=>.65,createAudio=url=>new Audio(url)}={}){this.volume=volume;this.createAudio=createAudio;this.active=new Set();}
 play(url){if(!url)return;const audio=this.createAudio(url);audio.volume=this.volume();this.active.add(audio);const done=()=>this.active.delete(audio);audio.onended=done;audio.onerror=done;audio.play().catch(done);return audio;}
 stop(){for(const audio of this.active)audio.pause();this.active.clear();}
}
