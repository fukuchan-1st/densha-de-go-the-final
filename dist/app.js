import {gradeLabel} from './tunnel-effects.js?v=93';
import {updateDoorVisual} from './train-doors.js?v=93';
import {graphicsComparisonMarkup} from './graphics-previews.js?v=87';
import {confirmHighGraphics} from './graphics-warning.js?v=87';
import {driverWordRefs} from './station-voice.js?v=84';
import {loadRoadAsset} from './road-assets.js?v=93';
import {CrossingAudio} from './crossings.js?v=85';
import {VIEW_LABELS,normalizedView,replayViewMode} from './view-modes.js?v=79';
import {progress,serviceKey} from './scenario-progress.js?v=85';
import {serviceChoices} from './service-catalog.js?v=93';
import {installCheats,jumpToStation} from './game-cheats.js?v=85';
import {DutyRecorder,loadReplay,replayStateAt,recordReplayAudio} from './replay-store.js?v=89';
import {collectStationReports,collectRestrictionReports,pauseWhenSpeechEnds} from './station-timing.js?v=84';
import {reverseLegacyProfile,reverseLegacyLayout,normalizeLegacyLayout} from './tohoku-direction.js?v=92';
import {loadAudioMix,audioMixMarkup,bindAudioMix} from './audio-mix.js?v=91';
import {bindScreenKeys} from './screen-keys.js?v=72';
import {beginTerminalOpening,advanceTerminalOpening} from './terminal-arrival.js?v=score13';
import {mountScoring,checkpointMarks,buildScoreTimetable,resolveScoreSchedule,scoreHazards,hornMarks,currentScoreRestriction,signalRestriction} from './scoring.js?v=90';
import {mountLookahead,changesFromSteps,stationMarks} from './lookahead.js?v=evaluation59';const lookahead=mountLookahead(document.getElementById('drive'));
import {GeneratedCab,generatedCab} from './generated-cab.js?v=95';
import {mountResponsiveUI} from './responsive-ui.js?v=85';
import {CabPanel} from './cab-panel.js?v=95';
import {detectStoppedOverrun,correctStoppedOverrun,nextSignalCall,advanceDoorSequence,beginStartingBoarding,completeDoorSequence,OPEN_DELAY_SECONDS,BOARDING_WAIT_SECONDS} from './train-operations.js?v=91';
import {LAST_STATION_INDEX as FULL_LAST_STATION_INDEX,BVE_END} from './route-data.js?v=23';
import {mountDisplay,stoppingMarker,formatStopDistance} from './display.js?v=41';
import {STATIONS as ALL_STATIONS,SPECS,step,newRun,stoppingDistance,assistBrake,notchDeltaForKey,NOTCH_MIN,NOTCH_LABELS,clampNotch} from './physics.js?v=72';
import {RouteProfile} from './route-profile.js?v=23';
import {RailWorld} from './scene.js?v=90';
import {SoundEngine} from './assets/audio/sound-engine.js?v=85';
const rangeQuery=new URLSearchParams(location.search),requestedEnd=Number(rangeQuery.get('end')),requestedStart=Number(rangeQuery.get('station')??0);
const reverseDirection=rangeQuery.get('direction')==='reverse',fullLength=ALL_STATIONS.at(-1).s,DIRECTION_STATIONS=reverseDirection?ALL_STATIONS.map(x=>({...x,s:fullLength-x.s})).reverse():ALL_STATIONS;
const LAST_STATION_INDEX=rangeQuery.has('end')&&Number.isInteger(requestedEnd)&&requestedEnd>requestedStart?Math.min(FULL_LAST_STATION_INDEX,requestedEnd):FULL_LAST_STATION_INDEX;
const STATIONS=DIRECTION_STATIONS.slice(0,LAST_STATION_INDEX+1),ROUTE_LENGTH=STATIONS.at(-1).s;
const $=id=>document.getElementById(id), sound=new SoundEngine();
const ui=mountResponsiveUI();const refit=mountDisplay($('simulator'),{layout:()=>ui.layout()});ui.setRefit(refit);ui.onNotch=setNotch;ui.onHorn=(pressed,name)=>sound.setHorn(pressed&&!paused&&!run.finished,name);
const score=mountScoring($('drive'),{badge:document.querySelector('.hud-line'),volume:()=>audioMix.se,blueTolerance:10});score.bindHorn(sound,()=>mode==='drive'?run:null,()=>scoreHazards({structures:world?.routeStructures?.structures??[]}));
document.querySelector('.handle-panel').hidden=true;
let lastStatus='';
let panel,profile,world,run=newRun(),mode='menu',paused=false,assist=false,rate=1,panorama=false,viewMode=0,toastUntil=6,wall=0,rendered=false,bootError='';
let recorder=null,legacyReplay=null,crossingAudio=null;
recordReplayAudio(sound,()=>recorder,()=>run);
const settings={volume:.65,shake:1,drawDistance:1500,quality:matchMedia('(pointer:coarse)').matches?'light':'standard'};
try{settings.volume=Number(localStorage.getItem('tohoku-volume')??.65);const savedShake=Number(localStorage.getItem('tohoku-shake')??1);if([0,.6,1].includes(savedShake))settings.shake=savedShake;}catch{}
try{const shared=JSON.parse(localStorage.getItem('railway-drive-settings')??'{}');if(Number.isFinite(shared.shake))settings.shake=shared.shake;if(Number.isFinite(shared.drawDistance))settings.drawDistance=shared.drawDistance;if(['light','standard','high'].includes(shared.quality))settings.quality=shared.quality;}catch{}
const audioMix=loadAudioMix(localStorage,settings.volume);
const cheats=installCheats({getState:()=>run,active:()=>mode==='drive'&&!legacyReplay,paused:()=>paused||run.finished,onMessage:text=>toast(text,8)});
sound.setVolume(1);sound.setMix(audioMix);
function toast(t,seconds=5){lastStatus=t;$('operationStatus').textContent=t;toastUntil=wall+seconds;}
const strip=NOTCH_LABELS;
$('notchStrip').innerHTML=strip.map((n,i)=>`<button type="button" data-notch="${i+NOTCH_MIN}" aria-label="ノッチ ${n}">${n}</button>`).join('');
$('startStation').innerHTML=STATIONS.slice(0,-1).map((s,i)=>`<option value="${i}">${s.name}${s.s>=BVE_END?'（以北は試作）':''}</option>`).join('');
$('startStation').onchange=()=>{$('scenarioRoute').textContent=STATIONS[Number($('startStation').value)].name+' → '+STATIONS.at(-1).name+'　'+((ROUTE_LENGTH-STATIONS[Number($('startStation').value)].s)/1000).toFixed(1)+' km';};
const requestedStation=new URLSearchParams(location.search).get('station');
if(requestedStation!==null&&$('startStation').querySelector(`option[value="${CSS.escape(requestedStation)}"]`)){
 $('startStation').value=requestedStation;
 $('startStation').onchange();
}
const directStart=new URLSearchParams(location.search).get('drive')==='1';
if(directStart){
 document.documentElement.classList.add('direct-drive');
 $('menuButton').textContent='路線選択へ';
 $('pauseMenu').textContent='路線選択へ';
}
function returnToRoutes(){recorder?.flush();location.href='./?v=72&route=tohoku&menu=main'+(generatedCab?'&cab=generated':'');}
$('allRoutes').onclick=returnToRoutes;
$('audioBack').onclick=returnToRoutes;
$('audioUnlock').addEventListener('cancel',event=>event.preventDefault());
$('journeyTrack').innerHTML=STATIONS.map(x=>`<span>${x.name}</span>`).join('');
for(let n=0;n<=120;n+=10){const a=(-130+n/120*260)*Math.PI/180,x=100+Math.sin(a)*72,y=85-Math.cos(a)*72,tx=100+Math.sin(a)*57,ty=85-Math.cos(a)*57;const ns='http://www.w3.org/2000/svg',line=document.createElementNS(ns,'line');line.setAttribute('x1',x);line.setAttribute('y1',y);line.setAttribute('x2',100+Math.sin(a)*65);line.setAttribute('y2',85-Math.cos(a)*65);line.setAttribute('stroke','#424d42');$('ticks').append(line);if(n%20===0){const t=document.createElementNS(ns,'text');t.setAttribute('x',tx);t.setAttribute('y',ty+3);t.setAttribute('fill','#343d31');t.setAttribute('text-anchor','middle');t.setAttribute('font-size','8');t.textContent=n;$('ticks').append(t);}}
const geometryPromise=fetch('./assets/route-geometry.json?v=23').then(r=>{if(!r.ok)throw Error('線路座標を取得できません');return r.json();});
function info(html){$('infoContent').innerHTML=html;$('info').showModal();}
bindScreenKeys(document,{root:()=>$('info'),active:()=>$('info').open,onBack:()=>$('info').close()});
$('closeInfo').onclick=()=>$('info').close();
const help=`<p class="eyebrow">DRIVING GUIDE</p><h2>最初の出発、ここから。</h2><p><kbd>S / ↓</kbd>でP5方向へ、<kbd>W / ↑</kbd>でEB方向へ1段ずつ動かします。<kbd>←</kbd>は惰行、<kbd>Space</kbd>は非常ブレーキです。画面のボタンでも操作できます。iPadは画面下、iPhoneは縦向きで画面下・横向きで左右に操作ボタンを表示します。タップ1回で1段ずつ操作でき、警笛や一時停止もボタンで使えます。「その他」からメニュー・視点・停車アシスト等を開けます。</p><p>開始駅では戸開状態で自動的に発車音声が流れます。黒磯・白河は駅音声→ホイッスル、他の開始駅はホイッスル→自動戸閉を待ち、Sを5回押してP5で出発。駅の手前では←で惰行にしてから、WでB1〜B7に入れます。右側の停止マーカーを見ながら、停止位置の±3m以内に停車すると3秒後にドアが自動で開きます。戸開から15秒待ち、黒磯・白河は駅音声→ホイッスル、その他はホイッスルが最後まで流れた後、自動で閉まります。停止位置まで5m以下になると距離をcmで表示します。</p><p>「停車アシスト」をONにすると、駅の手前で減速と停車を補助します。加速操作は自分で行います。「速度 ×1」は×3・×10に切替可能。まず操作を試すときに使えます。</p><p>抑速は、入れた時の速度を上限として下り坂で加速を抑えます。Enterを押している間は警笛、Jで空気笛。戸閉灯は戸閉音が最後まで鳴ってから点灯します。Escで一時停止。5m以上行き過ぎて停止すると、停止位置の0cmに補正します。</p>`;
$('helpButton').onclick=()=>info(help);
$('routeButton').onclick=()=>info(`<p class="eyebrow">ROUTE & ROLLING STOCK</p><h2>黒磯 → 福島</h2><table>${STATIONS.map((x,i)=>`<tr><td>${x.name}</td><td>${i?((x.s-STATIONS[i-1].s)/1000).toFixed(1)+' km':'出発駅'}</td><td>${(x.s/1000).toFixed(1)} km</td></tr>`).join('')}</table><p>701系1500番台・2両編成。起動加速度2.1 km/h/s、常用・非常減速度3.6 km/h/s、最高速度110 km/h。</p><p>線路の平面形状はOpenStreetMap座標に基づく近似。営業キロに駅間ごと校正。黒磯〜新白河の勾配と常設速度制限は提供BVEデータを参照。新白河以北は動画の沿線傾向と地図の平面線形を参考にした試作で、勾配0‰・上限110km/hの仮設定です。実際の勾配・速度制限を示しません。E531系用の曲線＋10km/hを外し、701系の上限110km/hを適用。駅位置はRailLab距離へ校正。ホームと構内線は駅別に配置し、黒磯〜新白河はBVE、それより北は動画・OSMを参考にしています。上屋・建物・カント・実際の信号は簡略表現です。</p><p>黒磯での701系運転を体験する試作シナリオです。現在の営業運転の再現ではありません。</p><p><a target="_blank" href="https://raillab.jp/transport/39">駅間距離：RailLab</a> · <a target="_blank" href="https://ja.wikipedia.org/wiki/JR東日本701系電車">車両性能：Wikipedia</a> · <a target="_blank" href="https://www.openstreetmap.org/copyright">線路：OSM / ODbL</a></p>`);
$('settingsButton').onclick=()=>{info(`<p class="eyebrow">CAB SETTINGS</p><h2>音と揺れ。</h2><p>Motor音はRTM 701soundpack、走行音・ドア音・操作音は指定のBVE音源を使用。元スクリプトの速度別ピッチ・音量を区分線形補間して再生します。</p>${audioMixMarkup(audioMix)}<div class="quality-buttons"><button id="legacySimple">簡易表示</button><button id="legacyHigh">高画質 · 高性能PC向け</button></div>${graphicsComparisonMarkup()}<label class="shake-setting">走行中の揺れ<select id="shakeStrength"><option value="0">なし</option><option value="0.6">弱め</option><option value="1">標準</option></select></label><p>動画との聴感比較は未実施。Motor音はRTM設定を基準にしています。</p>`);bindAudioMix($('infoContent'),audioMix,()=>sound.setMix(audioMix));const graphics=$('legacySimple');const refreshGraphics=()=>{graphics.textContent='簡易表示：'+(settings.quality==='light'?'ON（影・雲なし）':'OFF（影・雲あり）');graphics.setAttribute('aria-pressed',String(settings.quality==='light'));};refreshGraphics();const high=$('legacyHigh');high.setAttribute('aria-pressed',String(settings.quality==='high'));high.onclick=async()=>{if(settings.quality!=='high'&&!await confirmHighGraphics())return;settings.quality='high';world?.setQuality('high');refreshGraphics();high.setAttribute('aria-pressed','true');try{const shared=JSON.parse(localStorage.getItem('railway-drive-settings')??'{}');localStorage.setItem('railway-drive-settings',JSON.stringify({...shared,quality:'high'}));}catch{}};graphics.onclick=()=>{settings.quality=settings.quality==='light'?'standard':'light';world?.setQuality(settings.quality);refreshGraphics();high.setAttribute('aria-pressed','false');try{const shared=JSON.parse(localStorage.getItem('railway-drive-settings')??'{}');localStorage.setItem('railway-drive-settings',JSON.stringify({...shared,quality:settings.quality}));}catch{}};$('shakeStrength').value=String(settings.shake);$('shakeStrength').onchange=e=>{settings.shake=Number(e.target.value);try{localStorage.setItem('tohoku-shake',settings.shake);}catch{}};};
async function ensureWorld(){if(world)return;const [g,p,structures,extension,stationLayouts,signals]=await Promise.all([geometryPromise,fetch('./assets/bve-profile.json?v=23').then(r=>{if(!r.ok)throw Error('BVE路線データを取得できません');return r.json();}),fetch('./assets/bve-structures.json?v=23').then(r=>{if(!r.ok)throw Error('BVE構造物データを取得できません');return r.json();}),fetch('./assets/osm-extension-structures.json?v=23').then(r=>{if(!r.ok)throw Error('追加区間の構造物データを取得できません');return r.json();}),fetch('./assets/station-layouts.json?v=23').then(r=>{if(!r.ok)throw Error('駅配線データを取得できません');return r.json();}),fetch('./assets/bve-signals.json?v=33').then(r=>{if(!r.ok)throw Error('BVE信号機データを取得できません');return r.json();})]);const crossingData=await fetch('./assets/level-crossings-tohoku.json?v=79').then(r=>r.json());const roadData=await loadRoadAsset({id:'tohoku',roadAsset:'./assets/roads/tohoku.json.gz'});if(reverseDirection)roadData.roads=roadData.roads.map(r=>({...r,s:fullLength-r.s}));stationLayouts.diagramWiring=roadData.diagramWiring;for(const rail of roadData.neighborTracks??[])stationLayouts.tracks.push({...rail,id:'osm-parallel-'+rail.osmWayId,knots:rail.knots.map(([s,x])=>[s,x,rail.height??0])});profile=new RouteProfile(p);if(reverseDirection)profile=reverseLegacyProfile(profile,fullLength);const allStructures={structures:[...structures.structures,...crossingData.structures,...extension.structures.map(x=>({...x,sourceType:'osm'}))]};if(reverseDirection){g.points=g.points.map(([s,...v])=>[fullLength-s,...v]).reverse();allStructures.structures=allStructures.structures.map(x=>({...x,sStart:fullLength-x.sEnd,sEnd:fullLength-x.sStart,...(Number.isFinite(x.sOrigin)?{sOrigin:fullLength-x.sOrigin}:{})}));signals.signals=signals.signals.map((x,i)=>({...x,s:fullLength-x.s,x:-(x.x??2.5),callBlock:i+1})).sort((a,b)=>a.s-b.s);}
world=new RailWorld($('world'),g,STATIONS,profile,allStructures,reverseDirection?reverseLegacyLayout(stationLayouts,fullLength):normalizeLegacyLayout(stationLayouts,fullLength),signals.signals,{quality:settings.quality,drawDistance:settings.drawDistance,roads:roadData.roads});world.signals=signals.signals;world.setPlayerTrain('701',2);panel=await (generatedCab?GeneratedCab.load($('cabCanvas'),'701'):CabPanel.load($('cabCanvas')));world.setCabView(panel.viewOrigin);}
async function start(){
 $('start').disabled=true;
 $('start').querySelector('span').textContent='運転席を準備中…';
 sound.stop();
 const audioReady=sound.init().catch(error=>toast('走行音の読み込み失敗：'+error.message,12));
 try{
  await ensureWorld();
  const needsAudioGesture=directStart&&['suspended','interrupted'].includes(sound.ctx?.state);
  if(!needsAudioGesture)await audioReady;
  await recorder?.flush();recorder=null;legacyReplay=null;
  run=newRun();
  world.resetMotion();
  const startIndex=Number($('startStation').value);
  run.startIndex=startIndex;run.requiredStops=LAST_STATION_INDEX-startIndex;run.dutyKey=rangeQuery.get('duty')??serviceKey('tohoku',serviceChoices.tohoku[reverseDirection?1:0]);cheats.reset();viewMode=0;panorama=false;
  run.startS=STATIONS[startIndex].s;
  run.s=run.startS;
  run.next=startIndex+1;
  run.targetStops=LAST_STATION_INDEX-startIndex;
  beginStartingBoarding(run,startIndex,STATIONS);
  if(rangeQuery.get('replay')==='1'){const data=await loadReplay();if(!data?.legacy||!data.samples.length)throw Error('東北本線のリプレイがありません');legacyReplay={data,time:data.samples[0].elapsed,speed:1,eventCursor:0,viewOverride:null};Object.assign(run,replayStateAt(data.samples,legacyReplay.time));run.targetStops=LAST_STATION_INDEX-startIndex;}
  else recorder=new DutyRecorder({legacy:true,lineId:'tohoku',lineName:'東北本線',trainId:'701',trainName:'701系1500番台',from:STATIONS[startIndex].name,to:STATIONS.at(-1).name,direction:reverseDirection?'reverse':'forward',startIndex,endIndex:LAST_STATION_INDEX});
  if(sound.ctx){crossingAudio?.dispose();crossingAudio=new CrossingAudio(sound);await crossingAudio.ready;}
  mode='drive';
  if(legacyReplay)mountLegacyReplay();
  paused=needsAudioGesture;
  $('menu').hidden=true;
  $('drive').hidden=false;
  $('continue').hidden=false;
  $('directLoading').hidden=true;
  ui.setMode('drive');
  toast(`${STATIONS[startIndex].name}で戸開中。発車音声を自動再生してから戸閉します。`,9);
  if(needsAudioGesture){
   $('audioUnlock').showModal();
   $('enableAudio').onclick=async()=>{
    await sound.resume();
    await audioReady;
    $('audioUnlock').close();
    paused=false;
   };
  }else sound.setPaused(false);
 }catch(error){
  bootError=error.message;
  $('directLoading').hidden=true;
  info('<h2>運転画面を起動できませんでした</h2><p id="bootError"></p><button id="bootBack">路線選択へ</button>');
  $('bootError').textContent=error.message;
  $('bootBack').onclick=returnToRoutes;
 }finally{
  $('start').disabled=false;
  $('start').querySelector('span').textContent='最初から運転する';
 }
}
$('start').onclick=start;
function toMenu(){
 if(directStart){returnToRoutes();return;}
 mode='menu';paused=true;sound.setPaused(true);$('drive').hidden=true;$('menu').hidden=false;ui.setMode('menu');if($('pauseDialog').open)$('pauseDialog').close();
}
$('menuButton').onclick=toMenu;$('pauseMenu').onclick=toMenu;
$('continue').onclick=()=>{mode='drive';$('menu').hidden=true;$('drive').hidden=false;ui.setMode('drive');paused=false;sound.resume();};
function pause(){if(mode!=='drive'||run.finished)return;mountLegacyCheats();paused=true;sound.setPaused(true);$('pauseDialog').showModal();}
function resume(){paused=false;$('pauseDialog').close();sound.resume();}
$('pauseButton').onclick=pause;$('resume').onclick=resume;
$('pauseDialog').addEventListener('cancel',e=>{e.preventDefault();resume();});
function setNotch(n){if(mode!=='drive'||paused||run.finished)return;if(run.doors&&n>0){toast('ドアが開いています。自動で閉まるまでお待ちください。');return;}run.notch=clampNotch(n);}
function requestDeparture(){const activeRun=run;sound.playDeparture(STATIONS[run.departureStationIndex??run.next].name,stage=>{if(run===activeRun&&run.doors)run.departureStage=stage;}).then(completed=>{if(completed&&run===activeRun&&run.doors&&run.doorPhase==='announcement')run.announcementDone=true;}).catch(error=>{if(run===activeRun&&run.doors){run.doorPhase='audio-error';toast('発車音声を再生できません。ドア欄の「音声を再試行」を押してください。',15);}});}
function doors(){if(mode!=='drive'||paused||run.finished)return;if(run.doors&&run.doorPhase==='close-audio-error'){run.doorPhase='closing';requestDoorClosing();}else if(run.doors&&run.doorPhase==='audio-error'){run.doorPhase='announcement';requestDeparture();}else toast('戸開閉は自動です。±3m以内の停車後3秒で戸開します。');}
function requestDoorClosing(){const activeRun=run;run.doorCloseDone=false;toast('戸閉中。戸閉音の終了後に戸閉灯が点灯します。',10);sound.playDoorClose().then(completed=>{if(completed&&run===activeRun&&run.doors&&run.doorPhase==='closing')run.doorCloseDone=true;}).catch(()=>{if(run===activeRun&&run.doors&&run.doorPhase==='closing'){run.doorPhase='close-audio-error';toast('戸閉音を再生できません。「音声を再試行」を押してください。',15);}});}
function closeDoors(){const departedFrom=STATIONS[run.departureStationIndex??run.next];if(!completeDoorSequence(run,STATIONS))return;sound.playEffect('pilotOn');if(run.finished)showResult();else{sound.callStation('departure',departedFrom);sound.callVoiceRefs(driverWordRefs('tohoku',['doorsClosed','departure']));toast(`戸閉よし。次は${STATIONS[run.next].name}。S／↓で出発。`);}}
function updateDoors(dt){if(advanceTerminalOpening(run,STATIONS[LAST_STATION_INDEX].s,dt)){showResult();return;}if(run.doorPhase==='opening-terminal')return;const action=advanceDoorSequence(run,STATIONS[run.next].s,dt);if(action==='open'){if(!legacyReplay)progress.recordStop(run.dutyKey,run.startS??0,STATIONS[run.next].s,run);run.departureStationIndex=run.next;run.startingDeparture=false;const opening=sound.playEffect('open');if(run.next===LAST_STATION_INDEX)beginTerminalOpening(run,opening);else opening.catch(()=>{});sound.playEffect('pilotOff');toast(run.next===LAST_STATION_INDEX?'終点です。ドアを開いています。':'ドアが自動で開きました。15秒後に発車音声を流します。');}else if(action==='announcement'){toast('発車音声を再生中。再生後に自動で閉まります。');requestDeparture();}else if(action==='close')requestDoorClosing();else if(action==='closed')closeDoors();}

function showResult(){if(!legacyReplay)progress.complete(run.dutyKey,run.startS??0,ROUTE_LENGTH,run);recorder?.capture(run,score.engine.points,score.engine.chain);recorder?.flush();paused=true;const endedRun=run;pauseWhenSpeechEnds(sound,()=>mode==='drive'&&run===endedRun,()=>sound.setPaused(true));const avg=run.errors.length?run.errors.reduce((a,b)=>a+Math.abs(b),0)/run.errors.length:0;info(`<p class="eyebrow">JOURNEY COMPLETE</p><h2>${STATIONS.at(-1).name}に到着。</h2><p>乗務おつかれさま！</p><table><tr><td>運転距離</td><td>${((ROUTE_LENGTH-(run.startS??0))/1000).toFixed(1)} km</td></tr><tr><td>停車できた駅</td><td>${run.served} / ${run.targetStops}</td></tr><tr><td>通過した駅</td><td>${run.missed}</td></tr><tr><td>平均停止位置誤差</td><td>${avg.toFixed(1)} m</td></tr><tr><td>速度制限を超過した時間</td><td>${Math.round(run.overspeedSeconds??0)}秒</td></tr><tr><td>運転時間</td><td>${Math.floor(run.elapsed/60)}分${Math.floor(run.elapsed%60)}秒</td></tr></table><button id="resultMenu" class="primary">メニューへ</button>`);$('resultMenu').onclick=()=>{$('info').close();toMenu();};}
$('doors').onclick=doors;$('powerUp').onclick=()=>setNotch(run.notch+1);$('brakeDown').onclick=()=>setNotch(run.notch-1);$('neutral').onclick=()=>setNotch(0);$('emergency').onclick=()=>setNotch(NOTCH_MIN);
$('notchStrip').onclick=e=>{if(e.target.dataset.notch)setNotch(Number(e.target.dataset.notch));};
$('assist').onclick=()=>{assist=!assist;run.assistBraking=false;$('assist').textContent='停車アシスト '+(assist?'ON':'OFF');toast(assist?'駅手前の減速・停止を補助します。':'停車アシストを解除しました。');};
$('rate').onclick=()=>{rate=rate===1?3:rate===3?10:1;$('rate').textContent='速度 ×'+rate;$('simRate').textContent=rate===1?'REAL TIME':`TIME ×${rate}`;};
function setViewMode(value,manual=false){viewMode=normalizedView(value);panorama=viewMode!==0;$('drive').classList.toggle('panorama',panorama);$('viewButton').textContent='視点：'+VIEW_LABELS[viewMode];if(manual&&legacyReplay)legacyReplay.viewOverride=viewMode;}
$('viewButton').onclick=()=>setViewMode((viewMode+1)%4,true);
function cycleLegacyReplayView(){if(!legacyReplay)return;const value=legacyReplay.viewOverride;legacyReplay.viewOverride=value===null?0:value===3?null:value+1;setViewMode(replayViewMode(run,legacyReplay.viewOverride));document.querySelector('[data-replay-view]').textContent='視点：'+(legacyReplay.viewOverride===null?'記録視点':VIEW_LABELS[viewMode]);}

$('retry').onclick=()=>{if(run.finished)return;sound.stop();world.resetMotion();run.scoreTimetable=null;run.scoreCheckpoints=null;score.reset(run);run.acceleration=0;run.stopWait=0;run.doorPhase=null;run.announcementDone=false;run.assistBraking=false;run.s=STATIONS[Math.max(0,run.next-1)].s;run.v=0;run.notch=0;run.doors=false;run.stopReady=false;run.dwell=0;run.departureStationIndex=null;run.startingDeparture=false;beginStartingBoarding(run,Math.max(0,run.next-1),STATIONS);toast('前駅から再開します。');};
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')&&e.target.id!=='notchSlider')return;if(mode!=='drive'||$('info').open)return;if(e.code==='Escape'){e.preventDefault();if(!paused)pause();return;}if(e.code==='Enter'){e.preventDefault();if(!paused&&!e.repeat&&!run.finished)sound.setHorn(true);return;}if(paused||e.repeat)return;switch(e.code){case'KeyW':case'ArrowUp':case'KeyS':case'ArrowDown':e.preventDefault();setNotch(run.notch+notchDeltaForKey(e.code));break;case'ArrowLeft':e.preventDefault();setNotch(0);break;case'Space':e.preventDefault();setNotch(NOTCH_MIN);break;case'KeyO':doors();break;case'KeyJ':sound.playEffect('hornSecondary');break;}});
document.addEventListener('keyup',e=>{if(e.code==='Enter')sound.setHorn(false);});
window.addEventListener('blur',()=>sound.setHorn(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='drive'&&!paused)pause();});
function advance(dt){if(run.finished)return;const next=STATIONS[run.next],d=next.s-run.s,voicePrevious={s:run.s,v:run.v,elapsed:run.elapsed};
 if(assist&&!run.doors&&!run.stopReady)assistBrake(run,d,profile.gradeAt(run.s));
 if(!run.scoreTimetable){const schedule=resolveScoreSchedule({id:'tohoku',grades:Array.from({length:Math.ceil(fullLength/20)+2},(_,i)=>[i*20,profile.gradeAt(i*20)]),stations:STATIONS,limits:profile.limits.map((x,i)=>({sStart:x.s,sEnd:profile.limits[i+1]?.s??Infinity,kmh:x.kmh}))},run.s,{maxSpeedKmh:110,startingAccelerationKmhPerSecondApprox:2.1});run.clockStart=schedule.clockStart-run.elapsed;run.scoreTimetable=schedule.timetable;run.scoreVehicleSpec=schedule.planningSpec;}const previousV=run.v;step(run,dt,profile.gradeAt(run.s));cheats.clockStep(run,dt);run.acceleration=dt>0?(run.v-previousV)/dt:0;const overrun=detectStoppedOverrun(run,next.s,score.engine.cfg.blueTolerance);if(overrun)toast(`${next.name} オーバーラン ＋${formatStopDistance(overrun.error,true)}`,8);score.update(run,{eb:NOTCH_MIN,...currentScoreRestriction({limits:profile.limits.map((x,i)=>({sStart:x.s,sEnd:profile.limits[i+1]?.s??Infinity,kmh:x.kmh})),signals:world?.signals??[]},run.s),hazards:scoreHazards({structures:world?.routeStructures?.structures??[]}),vehicleSpec:run.scoreVehicleSpec??{maxSpeedKmh:105,startingAccelerationKmhPerSecondApprox:2.1},routeLimits:profile.limits.map((x,i)=>({sStart:x.s,sEnd:profile.limits[i+1]?.s??Infinity,kmh:x.kmh})),stations:(run.scoreTimetable??=buildScoreTimetable({stations:STATIONS,limits:profile.limits.map((x,i)=>({sStart:x.s,sEnd:profile.limits[i+1]?.s??Infinity,kmh:x.kmh}))},run.s,28800+run.elapsed,{maxSpeedKmh:110,startingAccelerationKmhPerSecondApprox:2.1}))},dt);
 if(run.v*3.6>profile.limitAt(run.s)+1)run.overspeedSeconds=(run.overspeedSeconds??0)+dt;
 const corrected=correctStoppedOverrun(run,next.s,score.engine.cfg.blueTolerance);
 for(const change of collectRestrictionReports(run,changesFromSteps(profile.limits),voicePrevious))sound.callRestriction(change.kmh);
 for(const report of collectStationReports(run,run.scoreTimetable,voicePrevious,next.s)){sound.callStationTiming(report.kind,report.station,report.error);run.lastTimingReport=report;}
 if(corrected!==null)return;
 if(run.next<LAST_STATION_INDEX&&run.s>=STATIONS[run.next+1].s-150){
  toast(`${next.name}を通過しました。次は${STATIONS[run.next+1].name}です。`,8);
  run.missed++;run.next++;run.stopReady=false;run.assistBraking=false;
 }
}
function updateDriverCalls(){
 if(run.doors||run.finished||run.v<=.01)return;
 const distance=STATIONS[run.next].s-run.s;
 if(run.lastCalledStop!==run.next&&distance>=0&&distance<=300){
  run.lastCalledStop=run.next;
  sound.callRouteCue('701-approach',ALL_STATIONS.findIndex(st=>st.name===STATIONS[run.next].name));
 }
 const block=nextSignalCall(world.signals,run.s,run.calledSignals??=new Set());
 if(block!==null)sound.callRouteCue('701-signal',block);
}
function hud(){lookahead.update(run.s,changesFromSteps(profile.limits),world?.signals??[],[...stationMarks(STATIONS),...checkpointMarks(run.scoreCheckpoints,run)].filter(x=>x.s>=STATIONS[Math.min(LAST_STATION_INDEX,run.next)].s-2).concat(hornMarks(scoreHazards({structures:world?.routeStructures?.structures??[]}),score.engine.done)));const kmh=run.v*3.6,next=STATIONS[Math.min(LAST_STATION_INDEX,run.next)],d=next.s-run.s;$('speed').textContent=Math.round(kmh);$('needle').style.transform=`rotate(${-130+kmh/120*260}deg)`;$('distance').innerHTML=(run.s/1000).toFixed(3)+' <small>km</small>';$('notch').textContent=strip[run.notch-NOTCH_MIN];$('lever').style.left=((run.notch-NOTCH_MIN)/(strip.length-1)*100)+'%';$('notchStrip').querySelectorAll('[data-notch]').forEach(el=>el.classList.toggle('selected',Number(el.dataset.notch)===run.notch));$('nextName').textContent=next.name;$('remaining').textContent=run.finished?'終点に到着':(d>=0?'停車まで ':'行き過ぎ ')+formatStopDistance(d);$('served').textContent=run.served+' / '+run.targetStops;const sec=(run.clockStart??28800)+Math.floor(run.elapsed);$('clock').textContent=[Math.floor(sec/3600)%24,Math.floor(sec/60)%60,sec%60].map(x=>String(x).padStart(2,'0')).join(':');$('doorLamp').classList.toggle('lit',!run.doors);$('doorLabel').textContent=run.doors?'戸開':'戸閉';$('brakeLamp').classList.toggle('lit',run.notch<0);$('audioStatus').textContent=sound.error?'音源エラー：'+sound.error:sound.ready?'RTM SOUND · '+(sound.activeTracks?.length??0)+' LAYERS':'走行音を読み込んでいます…';$('trainDot').style.left=Math.min(100,run.s/ROUTE_LENGTH*100)+'%';$('journeyTrack').querySelectorAll('span').forEach((el,i)=>el.classList.toggle('done',i<run.next));
 ui.update({value:run.notch,disabled:paused||run.finished,speed:Math.round(kmh),notch:strip[run.notch-NOTCH_MIN],next:next.name,distance:(d<0?'超過 ':'')+formatStopDistance(d),door:run.doorPhase==='closing'?'戸閉中':run.doors?'戸開':'戸閉',limit:(kmh>profile.limitAt(run.s)+1?'速度超過 ':'制限 ')+profile.limitAt(run.s)});
 let slope=document.getElementById('legacyGrade');if(!slope){slope=document.createElement('div');slope.id='legacyGrade';slope.style.cssText='position:fixed;left:16px;top:90px;padding:8px 12px;background:#122832dd;color:white;border-radius:6px;z-index:18;font-size:15px;pointer-events:none';document.getElementById('driveScreen').append(slope);}slope.textContent=gradeLabel(profile.gradeAt(run.s));const marker=stoppingMarker(run.s,next.s);$('stopPointer').style.top=marker.top+'%';$('stopPointer').hidden=!marker.visible;$('stopMarker').classList.toggle('in-range',marker.within);$('stopMarker').classList.toggle('outside',!marker.within);$('stopMarker').classList.toggle('overrun',marker.error>10);$('stopOffset').textContent=marker.label;$('stopHint').textContent=run.finished?'終点に到着':run.doors?'戸開中 · 自動戸閉待ち':run.stopReady?'停車確認中':marker.within?'自動戸開は±3m以内の停車時':marker.error>10?'停止位置を過ぎています':'接近中';
 const limit=profile.limitAt(run.s),grade=profile.gradeAt(run.s),upcoming=profile.nextLimit(run.s),over=kmh>limit+1;$('limitValue').textContent=limit;$('limitLabel').textContent=profile.coverageAt(run.s)==='prototype'?'仮の上限':'制限速度';$('gradient').innerHTML=(profile.coverageAt(run.s)==='prototype'?'仮設定 ':grade>0?'上り ':grade<0?'下り ':'平坦 ')+Math.abs(grade).toFixed(1)+' <small>‰</small>';$('speedWarning').textContent=(over?'速度超過　':profile.coverageAt(run.s)==='prototype'?'仮上限　':'制限　')+limit+' km/h';$('speedWarning').classList.toggle('over',over);$('speed').classList.toggle('over',over);$('coverageLabel').textContent=profile.coverageAt(run.s)==='prototype'?'試作区間':'BVEデータ参考区間';$('upcomingLimit').hidden=profile.coverageAt(run.s)==='prototype';$('upcomingLimit').textContent=upcoming?`${Math.round(upcoming.s-run.s).toLocaleString()}m先　${upcoming.kmh} km/h`:'この先、制限変更なし';$('brakeNeedle').style.transform=`rotate(${-130+(run.notch<0?Math.max(0,Math.min(7,-run.notch-1))/7*350:0)/800*260}deg)`;$('tractionLever').style.transform=`rotateX(${Math.max(0,run.notch)*-5}deg)`;$('brakeHandle').style.transform=`rotate(${Math.max(0,-run.notch)*-6}deg)`;$('doors').hidden=!['audio-error','close-audio-error'].includes(run.doorPhase);$('doors').disabled=!['audio-error','close-audio-error'].includes(run.doorPhase);$('powerUp').hidden=run.doors||run.notch===5||run.finished;$('brakeDown').hidden=run.notch===NOTCH_MIN||run.finished;$('neutral').hidden=run.notch===0||run.finished;$('emergency').hidden=run.notch===NOTCH_MIN||run.finished;$('doors').textContent=['audio-error','close-audio-error'].includes(run.doorPhase)?'音声を再試行':'ドア自動';$('operationStatus').textContent=run.correctedStopError!=null&&run.doorPhase==='waiting-open'?`行き過ぎ ${formatStopDistance(run.correctedStopError)} → 停止位置 0 cm に補正`:run.doorPhase==='waiting-open'?`停車確認 ${Math.min(3,Math.floor(run.stopWait))} / 3秒 · まもなく自動戸開`:run.doorPhase==='boarding'?`乗降中 · 自動戸閉の音声まで ${Math.max(0,Math.ceil(BOARDING_WAIT_SECONDS-run.dwell))}秒`:run.doorPhase==='closing'?'戸閉中 · 戸閉音の終了後に戸閉灯が点灯':run.doorPhase==='announcement'?(run.departureStage==='station'?'駅音声を再生中 · 続いてホイッスル':'ホイッスルを再生中 · 終了後に自動戸閉'):wall<toastUntil?lastStatus:'';
}
let last=performance.now();function frame(now){const realDt=Math.max(0,(now-last)/1000),dt=Math.min(.1,realDt);last=now;wall+=dt;if(mode==='drive'&&world){if(paused)score.pause(true);if(legacyReplay){updateLegacyReplay(dt);}else if(!paused){cheats.speedStep(run,dt);let sim=dt*rate;while(sim>0){const chunk=Math.min(.02,sim);advance(chunk);sim-=chunk;if(paused)break;}if(!paused&&!run.finished){updateDoors(realDt);updateDriverCalls();}sound.update(run.v*3.6,run.notch,dt,{doors:run.doors,holdBraking:run.holdBraking,surface:world.routeStructures.tunnelAt(run.s)?'tunnel':world.routeStructures.structures.some(x=>x.kind==='bridge'&&run.s>=x.sStart&&run.s<=x.sEnd)?'bridge':'long',curvature:world.curvature(run.s)});}if(!legacyReplay||!Number.isFinite(run.doorVisual))updateDoorVisual(run,paused?0:dt);world.doorVisual=run.doorVisual;world.doorState=run;if(!legacyReplay){run.viewMode=viewMode;recorder?.capture(run,score.engine.points,score.engine.chain);}hud();if(legacyReplay){document.querySelector('.points-number').textContent=run.points;document.querySelector('.chain-number').textContent=run.chain;document.querySelector('.score-clock-now b').textContent=$('clock').textContent;}world.camera.far=settings.drawDistance+400;world.camera.updateProjectionMatrix();world.scene.fog.far=settings.drawDistance;world.render(run.s,run.v,wall,panorama,run.acceleration??0,settings.shake,paused?0:dt,viewMode>=2,(run.clockStart??28800)+run.elapsed,viewMode===3);sound?.updatePassby(world,run.s,run.v,viewMode,paused);crossingAudio?.update(world,run.s,run.v,viewMode,paused,(world.playerTrain?.count??2)*20);if(panel&&!panorama)panel.render(run,dt,Boolean(world.routeStructures.tunnelAt(run.s)));$('bveReadout').textContent=`${Math.round(run.v*3.6)} km/h　${strip[run.notch-NOTCH_MIN]}　${run.doorPhase==='closing'?'戸閉中':run.doors?'戸開':'戸閉'}`;rendered=true;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
// Read-only diagnostics for reproducible local verification; no gameplay shortcuts.
window.railDiagnostics=()=>({run:{...run},mode,paused,assist,rate,rendered,audioReady:sound.ready,audioError:sound.error,activeTracks:sound.activeTracks,bootError});

if(directStart)start();

addEventListener('pagehide',()=>recorder?.flush());
function mountLegacyReplay(){document.body.classList.add('replaying');document.querySelector('.replay-controls')?.remove();const bar=document.createElement('div');bar.className='replay-controls';bar.innerHTML='<label>REPLAY</label><button data-play>一時停止</button><button data-speed>×1</button><button data-replay-view>視点：記録視点</button><button data-exit>再生終了</button><input aria-label="再生位置" type="range" min="'+legacyReplay.data.samples[0].elapsed+'" max="'+legacyReplay.data.samples.at(-1).elapsed+'" step="0.1">';$('drive').append(bar);bar.querySelector('[data-replay-view]').onclick=cycleLegacyReplayView;bar.querySelector('[data-play]').onclick=()=>{paused=!paused;sound.setPaused(paused);bar.querySelector('[data-play]').textContent=paused?'再生':'一時停止';};bar.querySelector('[data-speed]').onclick=e=>{legacyReplay.speed=legacyReplay.speed===1?2:legacyReplay.speed===2?.5:1;e.target.textContent='×'+legacyReplay.speed;};bar.querySelector('[data-exit]').onclick=returnToRoutes;bar.querySelector('input').oninput=e=>{legacyReplay.time=Number(e.target.value);legacyReplay.eventCursor=(legacyReplay.data.events??[]).findIndex(event=>event.time>=legacyReplay.time);if(legacyReplay.eventCursor<0)legacyReplay.eventCursor=(legacyReplay.data.events??[]).length;sound.setHorn(false);updateLegacyReplay(0);};}
function updateLegacyReplay(dt){const r=legacyReplay;if(!paused)r.time=Math.min(r.data.samples.at(-1).elapsed,r.time+dt*r.speed);if(!paused&&dt>0){const events=r.data.events??[];while(r.eventCursor<events.length&&events[r.eventCursor].time<=r.time){const event=events[r.eventCursor++];if(typeof sound[event.method]==='function')Promise.resolve(sound[event.method](...event.args)).catch(()=>{});}}Object.assign(run,replayStateAt(r.data.samples,r.time));setViewMode(replayViewMode(run,r.viewOverride));sound.update(run.v*3.6,run.notch,paused?0:dt,{doors:run.doors});document.querySelector('.replay-controls input').value=r.time;if(r.time>=r.data.samples.at(-1).elapsed){paused=true;sound.setPaused(true);}}
document.addEventListener('keydown',e=>{if(!legacyReplay){if(mode==='drive'&&e.code==='KeyV'){e.preventDefault();$('viewButton').click();}return;}if(e.code==='KeyV'){e.preventDefault();cycleLegacyReplayView();}if(['Enter','ArrowUp','ArrowDown','KeyW','KeyS','ArrowLeft','Space'].includes(e.code)&&!e.target.closest('.replay-controls')){e.preventDefault();e.stopImmediatePropagation();}if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();document.querySelector('[data-play]')?.click();}},true);

function mountLegacyCheats(){let root=$('legacyCheats');if(!root){root=document.createElement('div');root.id='legacyCheats';$('pauseDialog').append(root);}root.replaceChildren();if(!cheats.available||legacyReplay)return;root.innerHTML='<p>W：速度アップ　S：速度ダウン　T：時刻停止　R：時刻を遅くする</p><button id="legacyCheatToggle">チート '+(cheats.enabled?'ON':'OFF')+'</button><button id="legacyJump" '+(!cheats.enabled?'disabled':'')+'>駅を選んで移動</button><small>チートを使った乗務はクリア記録の対象外です。</small>';$('legacyCheatToggle').onclick=()=>{cheats.toggle();mountLegacyCheats();};$('legacyJump').onclick=showLegacyJump;}
function showLegacyJump(){if(!cheats.enabled)return;if(!run.scoreTimetable){const schedule=resolveScoreSchedule({id:'tohoku',grades:Array.from({length:Math.ceil(fullLength/20)+2},(_,i)=>[i*20,profile.gradeAt(i*20)]),stations:STATIONS,limits:profile.limits.map((x,i)=>({sStart:x.s,sEnd:profile.limits[i+1]?.s??Infinity,kmh:x.kmh}))},run.startS??0,{maxSpeedKmh:110,startingAccelerationKmhPerSecondApprox:2.1});run.clockStart=schedule.clockStart-run.elapsed;run.scoreTimetable=schedule.timetable;run.scoreVehicleSpec=schedule.planningSpec;}const stations=run.scoreTimetable.filter(st=>st.s>=(run.startS??0)&&st.s<=ROUTE_LENGTH);info('<h2>駅を選んで移動</h2><div class="station-jump-list">'+stations.map((st,i)=>'<button data-legacy-jump="'+i+'">'+st.name+'　停車</button>').join('')+'</div>');$('infoContent').querySelectorAll('[data-legacy-jump]').forEach(button=>button.onclick=()=>{const target=stations[Number(button.dataset.legacyJump)];sound.stop();jumpToStation(run,target,STATIONS,profile.limitAt(target.s),110);run.stopReady=false;run.announcementDone=false;run.doorCloseDone=false;run.departureStationIndex=null;world.resetMotion();const points=score.engine.points,chain=score.engine.chain;score.reset(run);score.engine.points=points;score.engine.chain=chain;$('info').close();resume();toast(target.name+'へ移動しました。');});}
