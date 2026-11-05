// 前方300mインジケーター: 300m以内に近づいた速度制限と信号を縦の目盛りに表示する。
export const LOOKAHEAD_M=300;
const cache=new WeakMap();
const memo=(list,build)=>{if(!cache.has(list))cache.set(list,build(list));return cache.get(list);};

// final 系の路線: [{sStart,sEnd,kmh}] の区間 → 制限が変わる地点 [{s,kmh|null}]
export function changesFromSections(sections=[]){
 return memo(sections,list=>{
  const at=s=>list.reduce((v,x)=>s>=x.sStart&&s<x.sEnd?(v===null?x.kmh:Math.min(v,x.kmh)):v,null);
  const points=[...new Set(list.flatMap(x=>[x.sStart,x.sEnd]))].sort((a,b)=>a-b);
  const out=[];for(const s of points){const before=at(s-.01),after=at(s);if(before!==after)out.push({s,kmh:after,down:after!==null&&(before===null||after<before)});}
  return out;
 });
}
// 東北本線 (BVE): [{s,kmh}] の地点列 → 制限が変わる地点
export function changesFromSteps(steps=[]){
 return memo(steps,list=>{
  const out=[];let prev=null;
  for(const x of [...list].sort((a,b)=>a.s-b.s)){if(prev!==null&&x.kmh!==prev)out.push({s:x.s,kmh:x.kmh,down:x.kmh<prev});prev=x.kmh;}
  return out;
 });
}

export function mountLookahead(parent){
 const root=document.createElement('aside');root.className='lookahead';root.setAttribute('aria-label','前方300m 速度制限・信号・停止位置・通過位置');
 root.innerHTML='<div class="la-track"><i class="la-rail"></i><span class="la-num" style="top:0">300</span><span class="la-num" style="top:50%">150</span><span class="la-num" style="top:100%">0</span><i class="la-grid" style="top:33.333%"></i><i class="la-grid" style="top:66.667%"></i><i class="la-zero"></i><div class="la-items"></div></div><small class="la-dir">▲ 前方 m</small>';
 parent.append(root);
 const items=root.querySelector('.la-items'),els=new Map();
 function element(key,make){let el=els.get(key);if(!el){el=make();items.append(el);els.set(key,el);}return el;}
 return {root,update(position,limits=[],signals=[],stations=[]){
  const seen=new Set();
  const place=(el,d)=>{el.style.top=(1-d/LOOKAHEAD_M)*100+'%';};
  const h=items.clientHeight||284,ahead=list=>list.map(x=>({x,d:x.s-position})).filter(o=>o.d>0&&o.d<=LOOKAHEAD_M).sort((a,b)=>a.d-b.d);
  // 近いものから順に配置する: 最も近い札が1列目・最前面。置き場所がない遠い札は隠す。
  const lastY=[-1e9,-1e9];let rank=0;
  for(const {x,d} of ahead(limits)){const key='l'+x.s;seen.add(key);
   const el=element(key,()=>{const e=document.createElement('div');e.className='la-limit '+(x.kmh===null?'release':x.down?'down':'up');e.innerHTML=`<b>${x.kmh===null?'解除':Math.round(x.kmh)}</b>`;e.title=x.kmh===null?'制限解除':`制限 ${Math.round(x.kmh)} km/h`;return e;});place(el,d);
   const y=(1-d/LOOKAHEAD_M)*h,lane=[0,1].find(i=>Math.abs(y-lastY[i])>=30);
   el.classList.toggle('nearest',rank===0);el.style.zIndex=String(100-rank++);
   el.hidden=lane===undefined;if(lane!==undefined){lastY[lane]=y;el.style.setProperty('--lane',lane);}}
  let lastSignalY=-1e9;
  for(const {x,d} of ahead(signals)){const key='s'+x.s;seen.add(key);
   const el=element(key,()=>{const e=document.createElement('div');e.className='la-signal'+(x.kind==='relay'?' relay':'');e.innerHTML=`<span>${x.kind==='relay'?'中継':'信号'}</span>`;return e;});place(el,d);
   const y=(1-d/LOOKAHEAD_M)*h;el.querySelector('span').hidden=Math.abs(y-lastSignalY)<16;if(!el.querySelector('span').hidden)lastSignalY=y;}
  // 停止位置・通過位置: 停止位置は停車して0の線に重なるまで残す
  let lastStationY=-1e9;
  const nearStations=stations.map(x=>({x,d:x.s-position})).filter(o=>o.d>=(o.x.stop?-2:0.01)&&o.d<=LOOKAHEAD_M).sort((a,b)=>a.d-b.d);
  for(const {x,d} of nearStations){const key='t'+x.s;seen.add(key);
   const el=element(key,()=>{const e=document.createElement('div');e.className='la-station '+(x.stop?'stop':'pass');e.innerHTML=`<span><b>${x.stop?'停止':'通過'}</b>${x.name??''}</span>`;e.title=`${x.stop?'停止位置':'通過位置'} ${x.name??''}`;return e;});
   el.style.top=Math.min(100,(1-d/LOOKAHEAD_M)*100)+'%';
   const y=(1-d/LOOKAHEAD_M)*h,label=el.querySelector('span');label.hidden=Math.abs(y-lastStationY)<20;if(!label.hidden)lastStationY=y;}
  for(const [key,el] of els)if(!seen.has(key)){el.remove();els.delete(key);}
 }};
}
// 停車駅 [{s,name}] と全駅 [{s,name}] → [{s,name,stop}]。全駅のうち停車駅にないものが通過駅。
export function stationMarks(stops=[],all=[]){
 return memo(stops,list=>[...list.map(x=>({s:x.s,name:x.name,stop:true})),...(all??[]).filter(a=>!list.some(x=>Math.abs(x.s-a.s)<.5)).map(a=>({s:a.s,name:a.name,stop:false}))]);
}
