import {SoundEngine} from './assets/audio/sound-engine.js?v=115';
import {driverWordRefs} from './station-voice.js?v=115';
import {departureFilesFor} from './train-operations.js?v=115';
const aliases={relayOn:'pilotOn',relayOff:'pilotOff'};
// Keep the supplied 701 motor/BVE recordings while sharing the driving lifecycle.
export class TohokuAudio extends SoundEngine{
 constructor(recipe,pack,{volume=1,mix={}}={}){super();this.recipe=recipe;this.level=volume;this.setMix(mix);}
 get context(){return this.ctx;}
 get driverQueue(){return this.routeCueQueue;}
 configureDriverRoute(route){this.driverRoute=route;this.driverRouteLine='tohoku';}
 ensureInit(){return this.initPromise??=super.init();}
 prepare(){return this.ensureInit();}
 async resume(){await this.ensureInit();await super.resume();}
 async setPaused(paused){super.setPaused(paused);}
 callDriver(...names){return this.callVoiceRefs(driverWordRefs('tohoku',names));}
 effectRef(name){return name==='whistle'?this.departureBuffers?.get('departure-chime.wav'):this.effects?.[aliases[name]??name];}
 callRouteCue(kind,index){return kind==='signal'?this.callVoiceRefs(driverWordRefs('tohoku',['checkOkay'])):super.callRouteCue(kind,index);}
 async playEffect(name){if(name==='whistle'){const buffer=this.departureBuffers?.get('departure-chime.wav');return buffer?this.playDepartureBuffer(buffer):false;}return super.playEffect(aliases[name]??name);}
 async playStationDeparture(station,isCurrent=()=>true){for(const file of departureFilesFor(station.name).filter(x=>x!=='departure-chime.wav')){if(!isCurrent())return false;const buffer=this.departureBuffers.get(file);if(!buffer||!await this.playDepartureBuffer(buffer,'voice'))return false;}return true;}
 async dispose(){this.stop();this.ambient?.dispose();this.passby?.dispose();this.master?.disconnect();this.compressor?.disconnect();for(const node of Object.values(this.mix?.gains??{}))node.disconnect();}
}
