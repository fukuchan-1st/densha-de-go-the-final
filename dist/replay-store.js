const KEY='latest-duty';
export function openReplayDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('railway-replay',1);req.onupgradeneeded=()=>req.result.createObjectStore('duties');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function saveReplay(replay){const db=await openReplayDB();try{await new Promise((resolve,reject)=>{const tx=db.transaction('duties','readwrite');tx.objectStore('duties').put(replay,KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
export async function loadReplay(){const db=await openReplayDB();try{return await new Promise((resolve,reject)=>{const req=db.transaction('duties').objectStore('duties').get(KEY);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);});}finally{db.close();}}
export const replayFields=['s','v','notch','elapsed','next','startIndex','endIndex','served','missed','doors','doorVisual','doorVisualTime','doorVisualSeed','doorVisualActive','doorVisualStation','doorPhase','finished','acceleration','clockStart','holdBraking','viewMode','weather','wheelSlip','wheelSpeed','wheelExcess','wheelSlide','wheelDeficit','typhoonSection','typhoonAnnounced'];
export function sampleState(state,points=0,chain=0){return {...Object.fromEntries(replayFields.map(k=>[k,state[k]])),points,chain};}
export class DutyRecorder{
 constructor(meta){this.data={schema:1,created:Date.now(),...meta,samples:[],events:[]};this.lastSave=-Infinity;this.pending=null;this.dirty=false;}
 event(method,args,time){this.data.events.push({method,args:structuredClone(args),time});this.dirty=true;}
 capture(state,points=0,chain=0){const last=this.data.samples.at(-1);if(last&&state.elapsed-last.elapsed<.099&&!state.finished)return;this.data.samples.push(sampleState(state,points,chain));this.dirty=true;if(state.elapsed-this.lastSave>=5||state.finished){this.lastSave=state.elapsed;this.flush();}}
 async flush(){if(this.pending){await this.pending;if(this.dirty)return this.flush();return;}if(!this.dirty)return;this.dirty=false;const copy=structuredClone(this.data);this.pending=saveReplay(copy).catch(error=>{this.error=error;}).finally(()=>{this.pending=null;});await this.pending;}
}
export function replayStateAt(samples,time){
 if(!samples.length)return null;let lo=0,hi=samples.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(samples[mid].elapsed<=time)lo=mid;else hi=mid-1;}
 const a=samples[lo],b=samples[Math.min(lo+1,samples.length-1)],f=Math.max(0,Math.min(1,(time-a.elapsed)/Math.max(.001,b.elapsed-a.elapsed)));
 return {...a,doorVisualTime:Number.isFinite(a.doorVisualTime)?a.doorVisualTime+((b.doorVisualSeed===a.doorVisualSeed?b.doorVisualTime:a.doorVisualTime)-a.doorVisualTime)*f:undefined,doorVisual:Number.isFinite(a.doorVisual)?a.doorVisual+((b.doorVisual??a.doorVisual)-a.doorVisual)*f:undefined,s:a.s+(b.s-a.s)*f,v:a.v+(b.v-a.v)*f,elapsed:Math.min(time,samples.at(-1).elapsed),errors:[]};
}

export function recordReplayAudio(sound,getRecorder,getState){
 let depth=0;
 for(const method of ['playEffect','playRouteAnnouncement','callDriver','callStation','callStationTiming','callRestriction','callSlowRestriction','callRouteCue','setHorn']){
  if(typeof sound[method]!=='function')continue;const original=sound[method].bind(sound);
  sound[method]=(...args)=>{const recorder=getRecorder(),state=getState();if(recorder&&state&&depth===0)recorder.event(method,args,state.elapsed);depth++;try{return original(...args);}finally{depth--;}};
 }
}
