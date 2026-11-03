export class HeldHorn {
 constructor(context,output){this.context=context;this.output=output;}
 async press(buffer,tail){
  if(this.active)return;
  this.end();
  const hold={tail};
  this.active=hold;
  try{
   const audio=await buffer;
   if(this.active!==hold)return;
   if(!audio){this.active=null;return;}
   const source=this.context.createBufferSource(),gain=this.context.createGain();
   hold.source=source;
   hold.gain=gain;
   source.buffer=audio;
   source.loop=true;
   source.loopStart=audio.duration*.25;
   source.loopEnd=audio.duration*.62;
   source.connect(gain).connect(this.output);
   source.onended=()=>{source.disconnect();gain.disconnect();};
   source.start();
  }catch{if(this.active===hold)this.active=null;}
 }
 release(){
  const hold=this.active;
  this.end();
  if(!hold?.source||!hold.tail)return;
  const generation=this.generation;
  Promise.resolve(hold.tail).then(buffer=>{
   if(!buffer||this.active||this.generation!==generation)return;
   const source=this.context.createBufferSource();
   this.tail=source;
   source.buffer=buffer;
   source.connect(this.output);
   source.onended=()=>{source.disconnect();if(this.tail===source)this.tail=null;};
   source.start();
  }).catch(()=>{});
 }
 end(immediate=false){
  this.generation=(this.generation??0)+1;
  if(this.tail){this.tail.stop();this.tail=null;}
  const hold=this.active;
  this.active=null;
  if(!hold?.source)return;
  const time=this.context.currentTime;
  hold.gain.gain.setTargetAtTime(0,time,.005);
  hold.source.stop(immediate?time:time+.025);
 }
}

export function bindHornButton(button,setPressed){
 let pointer=null;
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0||pointer!==null)return;
  event.preventDefault();
  pointer=event.pointerId;
  button.setPointerCapture(pointer);
  setPressed(true);
 });
 function release(event){
  if(event.pointerId!==pointer)return;
  pointer=null;
  setPressed(false);
 }
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
}
