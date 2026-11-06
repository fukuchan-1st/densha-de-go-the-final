export const SCORE_CONFIG={overspeedPenalty:100,blueTolerance:3,hornNear:150,hornFar:300,hornBurstSeconds:5};
export function timeSeconds(value){if(Number.isFinite(value))return value;if(typeof value!=='string'||!/^\d+:\d+:\d+(?:\.\d+)?$/.test(value))return null;return value.split(':').reduce((s,n)=>s*60+Number(n),0);}
export function timingGrade(error,stop){const d=Math.abs(error);return stop?(d<=3?'◎':d<=7?'〇':d<=10?'△':error>=15?'×':null):(d<.5?'◎':d<=2?'〇':d<=5?'△':error>=10?'×':null);}
export function checkpointGrade(kind,actual,target){const error=Math.abs(kind==='speed'?Math.round(actual)-target:Math.round(actual-target));return error===0?'◎':error<=1?'〇':error<=3?'△':null;}
export class ScoreEngine{
 constructor(onEvent=()=>{},config={}){this.emit=onEvent;this.cfg={...SCORE_CONFIG,...config};this.reset();}
 reset(s=0){this.points=0;this.chain=0;this.events=[];this.done=new Set();this.start=s;this.previous=null;this.zone=null;this.horn=false;this.presses=[];this.hornStart=0;this.hornBad=false;this.eb=false;this.last=null;this.lastCheckpoint=null;this.burstBad=false;}
 award(grade,reason,penalty=100){let delta;if(grade==='×'){this.chain=0;delta=-penalty;}else{this.chain++;delta=({'△':10,'〇':50,'◎':100}[grade]??0)*this.chain;}this.points+=delta;const event={grade,reason,delta,points:this.points,chain:this.chain};this.events.push(event);if(this.events.length>200)this.events.shift();this.last=event;this.emit(event);return event;}
 once(key,grade,reason,penalty){if(this.done.has(key))return;this.done.add(key);return this.award(grade,reason,penalty);}
 hornChange(on,t,s,hazards=[]){if(on===this.horn)return;this.horn=on;if(!on){this.hornBad=false;return;}this.hornStart=t;this.presses=this.presses.filter(x=>t-x<=this.cfg.hornBurstSeconds);this.presses.push(t);if(this.presses.length>=10&&!this.burstBad){this.award('×','警笛の連打',50);this.burstBad=true;}for(const h of hazards){const d=h.s-s;if(d>=this.cfg.hornNear&&d<=this.cfg.hornFar)this.once('horn:'+h.id,'〇','警笛合図');}}
 tick(state,context,dt){
  const {s,v,elapsed:t,notch}=state,prev=this.previous;
  if(this.horn&&t-this.hornStart>=10&&!this.hornBad){this.hornBad=true;this.award('×','警笛が10秒以上',50);}
  this.presses=this.presses.filter(x=>t-x<=this.cfg.hornBurstSeconds);if(this.presses.length===0)this.burstBad=false;
  const eb=context.eb===notch;if(eb&&!this.eb&&(v>.01||(prev?.v??0)>.01))this.award('×','走行中の非常ブレーキ',50);this.eb=eb;
  const limit=Number.isFinite(context.limit)?context.limit:null;
  if(!this.zone||!Object.is(this.zone.limit,limit))this.zone={limit,bad:false};
  if(Number.isFinite(limit)&&v*3.6>=limit+3&&!this.zone.bad){this.zone.bad=true;this.award('×','速度超過',this.cfg.overspeedPenalty);}
  const clock=(state.clockStart??28800)+t;
  for(const st of context.stations??[]){if(st.s<=this.start+1)continue;const key='time:'+st.id,target=timeSeconds(st.time);let actual=null;
   if(!st.stop&&prev&&prev.s<st.s&&s>=st.s){const f=(st.s-prev.s)/Math.max(.00001,s-prev.s);actual=(state.clockStart??28800)+prev.t+(t-prev.t)*f;}
   if(st.stop&&prev&&prev.v>.01&&v<=.01&&Math.abs(s-st.s)<=150){const error=state.correctedStopError??s-st.s;this.once('position:'+st.id,Math.abs(error)<=this.cfg.blueTolerance?'〇':'×',Math.abs(error)<=this.cfg.blueTolerance?'停止位置よし':'停止位置が青い範囲外',100);actual=clock;}
   if(target!==null&&!this.done.has(key)){
    if(actual!==null){const grade=timingGrade(actual-target,st.stop);this.done.add(key);if(grade)this.award(grade,st.name+(st.stop?' 停車時刻':' 通過時刻'),100);}
    else if(clock-target>=(st.stop?15:10)&&s<st.s+200){this.once(key,'×',st.name+' 到着・通過遅延',100);}
   }
  }
  if(prev)for(const point of context.checkpoints??[]){if(prev.s<point.s&&s>=point.s&&!this.done.has('point:'+point.id)){this.done.add('point:'+point.id);const f=(point.s-prev.s)/Math.max(.00001,s-prev.s),actual=point.kind==='speed'?(prev.v+(v-prev.v)*f)*3.6:(state.clockStart??28800)+prev.t+(t-prev.t)*f,grade=checkpointGrade(point.kind,actual,point.target);this.lastCheckpoint={...point,actual,error:actual-point.target,grade,time:t};if(grade)this.award(grade,point.kind==='speed'?'定速ポイント':'定通ポイント');}}
  this.previous={s,v,t};
 }
}
