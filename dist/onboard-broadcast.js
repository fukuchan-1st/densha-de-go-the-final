// 車内放送: 提供動画から切り出した「次は」「まもなく」を走行位置で流す。
// 発車後放送は前の停車駅を200m過ぎたら、到着放送は停車駅の500m手前で流す。
// 駅間が短く「次は…お降りの際は」が一続きの駅は、発車後放送だけを持つ。
export const DEPARTURE_AFTER_M=200,ARRIVAL_BEFORE_M=500;
const line=s=>s.split(' ');
const ITSUKAICHI=line('立川 西立川 東中神 中神 昭島 拝島 熊川 東秋留 秋川 武蔵引田 武蔵増戸 武蔵五日市');
// order は録音の進行方向。停車駅がこの順に並ぶ列車だけに使う。
export const ONBOARD_SETS={
 'e131-down':{vehicles:['e131'],order:line('高尾 相模湖 藤野 上野原 四方津 梁川 鳥沢 猿橋 大月 初狩 笹子 甲斐大和 勝沼ぶどう郷 塩山 東山梨 山梨市 春日居町 石和温泉 酒折 甲府 竜王 塩崎 韮崎 新府 穴山 日野春 長坂 小淵沢 信濃境 富士見 すずらんの里 青柳 茅野 上諏訪 下諏訪 岡谷 みどり湖 塩尻 広丘 村井 平田 南松本 松本 田沢 明科 西条 坂北 聖高原 冠着 姨捨 稲荷山 篠ノ井 今井 川中島 安茂里 長野')},
 'azusa-up':{vehicles:['e353'],service:/あずさ|特急/,order:line('南小谷 白馬 信濃大町 穂高 豊科 松本 塩尻 岡谷 上諏訪 茅野 小淵沢 甲府 八王子 立川 新宿')},
 'itsukaichi-down':{vehicles:['e233'],route:/itsukaichi/,order:ITSUKAICHI},
 'itsukaichi-up':{vehicles:['e233'],route:/itsukaichi/,order:ITSUKAICHI.slice(5).toReversed()}
};
let manifestPending;
function loadManifest(){manifestPending??=fetch(new URL('./assets/onboard/manifest.json?v=115',import.meta.url)).then(r=>r.ok?r.json():null).catch(()=>{manifestPending=null;return null;});return manifestPending;}
// 停車駅がその組の順序どおりに並んでいるか(逆方向の列車には流さない)
export function chooseOnboardSet(sets,vehicle,service,routeId,stopNames){
 for(const [id,set] of Object.entries(ONBOARD_SETS)){
  if(!sets?.[id]||!set.vehicles.includes(vehicle))continue;
  if(set.service&&!set.service.test(service??''))continue;
  if(set.route&&!set.route.test(routeId??''))continue;
  const positions=stopNames.map(n=>set.order.indexOf(n)).filter(i=>i>=0);
  if(positions.length>=2&&positions.every((p,i)=>!i||p>positions[i-1]))return id;
 }
 return null;
}
// 次に流すべき放送(なければ null)。state.onboardPlayed に流した駅を記録する。
export function onboardCue(state,route,stations){
 if(!stations||state.finished)return null;
 const next=route.stations[state.next],prev=route.stations[state.next-1];
 if(!next||state.next<=state.startIndex)return null;
 const played=state.onboardPlayed??={},clips=stations[next.name]??{},remaining=next.s-state.s;
 if(remaining<=0)return null;
 if(!played['n'+state.next]&&prev&&!state.doors&&state.s-prev.s>=DEPARTURE_AFTER_M){played['n'+state.next]=true;if(clips.next&&!(clips.soon&&remaining<=ARRIVAL_BEFORE_M))return {kind:'next',...clips.next};}
 if(!played['m'+state.next]&&remaining<=ARRIVAL_BEFORE_M){played['m'+state.next]=true;if(clips.soon)return {kind:'soon',...clips.soon};}
 return null;
}
export class OnboardBroadcast{
 static async create(sound,route,vehicle,service){
  if(!sound?.playOnboard)return null;
  const manifest=await loadManifest();if(!manifest)return null;
  const id=chooseOnboardSet(manifest.sets,vehicle,service,route.id,route.stations.map(s=>s.name));
  return id?new OnboardBroadcast(sound,manifest.sets[id].stations,id):null;
 }
 constructor(sound,stations,id){this.sound=sound;this.stations=stations;this.id=id;}
 // 走行区間の放送だけ先に読み込んでおく
 preload(route,startIndex,endIndex){const files=route.stations.slice(startIndex+1,endIndex+1).flatMap(st=>Object.values(this.stations[st.name]??{}).map(c=>c.file));return Promise.all(files.map(f=>this.sound.preloadOnboard('./assets/onboard/'+f).catch(()=>null)));}
 update(state,route){const cue=onboardCue(state,route,this.stations);if(cue)this.sound.playOnboard('./assets/onboard/'+cue.file);}
 stop(){this.sound?.stopOnboard?.();}
}
