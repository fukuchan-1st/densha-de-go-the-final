import {mountDrivingOverlay} from './driving-overlay.js?v=49';import {mountLookahead,changesFromSections,stationMarks} from './lookahead.js?v=49';
import {serviceChoices,makeServiceRoute} from './train-selection.js?v=41';
import {GeneratedCab,generatedCab} from './generated-cab.js';
import {FinalWorld} from './final-world.js?v=41';
import {MenuArt} from './final-art.js?v=41';
import {loadVehicleRecipes,loadBundledTrainPacks,LocalCabPanel,LocalTrainAudio} from './final-vehicle.js?v=41';
import {clamp,controlsFor,notchLabel,createJourney,driveStep,brakeAssist,distanceLabel,routeLimitAt,stopPosition,finishStop,takeDepartureCall} from './final-model.js?v=41';
import {STATIONS as TOHOKU_STATIONS} from './route-data.js?v=41';
import {FINAL_SCENARIOS,scenarioJourney} from './final-scenarios.js?v=41';
import {correctStoppedOverrun,nextSignalCall} from './train-operations.js?v=41';
import {bindHornButton} from './assets/audio/held-horn.js';

const TOHOKU_TRAIN={id:'701',name:'701系1500番台',playableSpecs:{carCount:2}};
const $=id=>document.getElementById(id),META=[
 {id:'yamanote',name:'山手線',english:'YAMANOTE LINE',vehicle:'e235',color:'#a2cf3d',summary:'東京 → 東京 · 外回り',train:'E235系',short:'E235'},
 {id:'chuo',name:'中央線系統',english:'CHUO LINE',vehicle:'e233',color:'#e98a38',summary:'東京 → 高尾 · 全駅停車',train:'E233系0番台',short:'E233'},
 {id:'osaka',name:'大阪環状線',english:'OSAKA LOOP LINE',vehicle:'323',color:'#e85248',trainColor:'#e57227',summary:'大阪 → 大阪 · 外回り',train:'323系',short:'323'},
 {id:'tokaido',name:'東海道線',english:'TOKAIDO LINE',vehicle:'207',color:'#5caddb',summary:'京都 → 神戸 · 各駅停車',train:'207系2000番台',short:'207'},
 {id:'tohoku',name:'東北本線',english:'TOHOKU MAIN LINE',vehicle:'701',color:'#78b888',summary:'黒磯 → 福島 · 各駅停車',train:'701系1500番台',short:'701',legacy:true},
 {id:'yagan',name:'野岩鉄道',english:'AIZU KINUGAWA LINE',vehicle:'6050',color:'#d7b991',trainColor:'#a53037',bodyColor:'#f2e4c7',summary:'新藤原 → 会津高原尾瀬口 · 各駅停車',train:'6050型',short:'6050',series:'型',card:'yagan-route-button.svg'}
];
const preferredRoute=new URLSearchParams(location.search).get('route');
let selected=Math.max(0,META.findIndex(meta=>meta.id===preferredRoute)),recipes,routes=[],world,panel,sound,run,mode='menu',paused=false,assist=false,panorama=false,token=0,loading=false,toastText='',toastUntil=0,modalPaused=false;
let packs=new Map(),activeRoute,chosenVehicle=null,chosenRoute=null,chosenService='普通',trainSelectionOpen=false;
const extraRoutes=new Map();
const settings={volume:.65,shake:1,quality:matchMedia('(pointer:coarse)').matches?'light':'standard'};
try{const saved=JSON.parse(localStorage.getItem('railway-drive-settings')??'{}');if(Number.isFinite(saved.volume))settings.volume=clamp(saved.volume,0,1);if([0,.6,1].includes(saved.shake))settings.shake=saved.shake;if(['light','standard'].includes(saved.quality))settings.quality=saved.quality;}catch{}
const saveSettings=()=>{try{localStorage.setItem('railway-drive-settings',JSON.stringify(settings));}catch{}};
const overlayControls=mountDrivingOverlay($('driveScreen'),{onChange:n=>setNotch(n),actions:[$('hornButton'),$('pauseButton'),$('moreButton')],instructionElement:$('eventText')});$('driveScreen').append($('extras'));const lookahead=mountLookahead($('driveScreen'));
function playMenuSound(name,{waitForEnd=false}={}){
 if(settings.volume===0)return;
 const clip=$('menuSound-'+name);
 clip.volume=settings.volume;
 clip.currentTime=0;
 const playback=clip.play();
 if(!waitForEnd){playback.catch(()=>{});return;}
 // The 701 screen loads a new page, so let the decision sound finish before navigating.
 return new Promise(resolve=>{
  const finish=()=>{
   clearTimeout(timeout);
   clip.removeEventListener('ended',finish);
   resolve();
  };
  const timeout=setTimeout(finish,1700);
  clip.addEventListener('ended',finish);
  playback.catch(finish);
 });
}
let menuArt;try{menuArt=new MenuArt($('menuArtwork'));}catch(e){$('menuArtwork').setAttribute('aria-label','車両イラストを表示できませんでした');}
function fit(){const r=$('stageArea').getBoundingClientRect(),scale=Math.min(r.width/1600,r.height/900);document.documentElement.style.setProperty('--overlay-ui-scale',Math.max(1,Math.min(3.5,44/(54*scale))));$('stage').style.left='50%';$('stage').style.top='50%';$('stage').style.transform=`translate(-50%,-50%) scale(${scale})`;}
addEventListener('resize',fit);visualViewport?.addEventListener('resize',fit);new ResizeObserver(fit).observe($('stageArea'));fit();
function recipe(){return META[selected].legacy?TOHOKU_TRAIN:recipes.trains.find(t=>t.id===(chosenVehicle??META[selected].vehicle));}
function selectedRoute(){return chosenRoute??routes[selected];}
function route(){return activeRoute??selectedRoute();}
function selectedScenario(){
 const value=$('scenarioSelect').value;
 return value===''?null:FINAL_SCENARIOS[META[selected].id]?.[Number(value)]??null;
}
function displayScenario(){
 const r=selectedRoute(),scenario=selectedScenario();
 $('startStationControl').hidden=!!scenario;
 if(!scenario){
  $('routeSummary').textContent=META[selected].summary;
  $('routeLength').textContent=`${(r.stations.at(-1).s/1000).toFixed(1)} km / ${r.stations.length-1}駅停車`;
  return;
 }
 const [,from,to]=scenario;
 const start=r.stations.find(station=>station.name===from).s;
 let distance=r.stations.find(station=>station.name===to).s-start;
 if(r.loop&&distance<=0)distance+=r.length;
 $('routeSummary').textContent=`${from} → ${to} · FINAL区間`;
 $('routeLength').textContent=`${(distance/1000).toFixed(1)} km / 各駅停車`;
}
$('scenarioSelect').onchange=()=>{playMenuSound('cursor');displayScenario();};
$('startStation').onchange=()=>playMenuSound('cursor');
function toast(text,seconds=5){toastText=text;toastUntil=(run?.elapsed??0)+seconds;}
function displayMenu(){const meta=META[selected],r=routes[selected],train=recipe();document.documentElement.style.setProperty('--accent',meta.color);$('trainRoute').textContent=meta.english;$('trainName').innerHTML=`${meta.short}<span>${meta.series??'系'}</span>`;$('formation').textContent=`${train.playableSpecs.carCount}両編成 · 各駅停車`;$('compactRoute').value=String(selected);document.querySelectorAll('.route-card').forEach((el,i)=>{el.classList.toggle('active',i===selected);el.setAttribute('aria-pressed',String(i===selected));});$('startStation').innerHTML=r.stations.slice(0,-1).map((st,i)=>`<option value="${i}">${st.name}</option>`).join('');const scenarios=FINAL_SCENARIOS[meta.id]??[];$('scenarioControl').hidden=!scenarios.length;$('scenarioSelect').replaceChildren(new Option('自由運転',''),...scenarios.map(([id,from,to],i)=>new Option(`#${id} ${from} → ${to}`,String(i))));displayScenario();const imported=meta.legacy||packs.has(train.id);$('assetBadge').textContent=imported?'運転台・収録音 内蔵':'車両素材を確認できません';$('assetBadge').classList.toggle('imported',imported);menuArt?.draw(meta);}
function choose(i){
 if(loading)return;
 const next=(i+META.length)%META.length;
 if(selected!==next)playMenuSound('cursor');
 selected=next;
 chosenVehicle=null;chosenRoute=null;
 displayMenu();
}
function setMode(value){mode=value;$('menuScreen').inert=false;$('menuControls').inert=false;if(value==='drive'){$('trainSelection').hidden=true;trainSelectionOpen=false;}document.body.dataset.mode=value;$('menuScreen').hidden=value!=='menu';$('menuControls').hidden=value!=='menu';$('driveScreen').hidden=value!=='drive';$('driveControls').hidden=value!=='drive';fit();}
async function pauseAudio(value){await sound?.setPaused(value).catch(()=>{});}
function showModal(content,{pause=true}={}){if(mode==='drive'&&pause&&!paused){paused=true;modalPaused=true;pauseAudio(true);}$('modalContent').innerHTML=content;if(!$('modal').open)$('modal').showModal();}
function closeModal(){if(mode==='menu')playMenuSound('cancel');$('modal').close();if(modalPaused&&!run?.finished){paused=false;pauseAudio(false);}modalPaused=false;}
$('closeModal').onclick=closeModal;$('modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
function settingsDialog(){showModal(`<p class="eyebrow">OPTION</p><h2>音と、乗り心地。</h2><label>音量 <input id="volumeInput" type="range" min="0" max="100" value="${Math.round(settings.volume*100)}"></label><label>走行中の揺れ<select id="shakeInput"><option value="0">なし</option><option value="0.6">弱め</option><option value="1">標準</option></select></label><label>描画<select id="qualityInput"><option value="light">軽量 · iPad / iPhone向け</option><option value="standard">標準 · PC向け</option></select></label><small>描画設定は次の運転開始時に反映します。揺れは停車後に収まり、一時停止中は止まります。</small><p>${META[selected].legacy?'東北本線の音量と揺れは、701系の画面で調整できます。':'アプリ内蔵の運転台と車両別の収録音を使用します。'}</p><div class="dialog-buttons"><button id="helpButton">操作方法</button><button id="dataButton">路線・車両について</button></div>`);$('shakeInput').value=String(settings.shake);$('qualityInput').value=settings.quality;$('volumeInput').oninput=e=>{settings.volume=Number(e.target.value)/100;sound?.setVolume(settings.volume);saveSettings();};$('shakeInput').onchange=e=>{settings.shake=Number(e.target.value);saveSettings();};$('qualityInput').onchange=e=>{settings.quality=e.target.value;saveSettings();};$('helpButton').onclick=helpDialog;$('dataButton').onclick=dataDialog;}
function helpDialog(){showModal(`<p class="eyebrow">DRIVING GUIDE</p><h2>一駅ずつ、確実に。</h2><p><kbd>S / ↓</kbd> P側へ　<kbd>W / ↑</kbd> EB側へ<br><kbd>X</kbd> 惰行　<kbd>Space</kbd> 非常ブレーキ<br><kbd>Enter 長押し</kbd> 警笛　<kbd>Esc</kbd> 一時停止</p><p>扉は自動です。停止位置±3m以内で3秒停止すると戸開、15秒乗降後に合図音→戸閉音の順に再生し、最後まで鳴ってから戸閉灯が点きます。最初の駅は戸開で開始します。</p><p>停止位置±10mで右端のひし形が上から下へ動きます。残り5m以内はcm表示。5m以上行き過ぎて停止すると、停止位置の0cmに補正します。</p><p>運転士音声は駅の手前150mで「駅名、停車。停止位置と両数」、戸閉灯の点灯後に「戸閉、点」「出発進行」が順に鳴り、発車すると「出発駅名、定発」が続きます。出発の喚呼はこの試作での発車扱いに合わせています。</p><small>停車アシストはブレーキを補助します。通常のドア開閉ではノッチは変わりません。207系はP6、323系は抑速を備えます。</small>`);}
function dataDialog(){showModal(`<p class="eyebrow">ROUTE & VEHICLE</p><h2>6路線、6車両。</h2><p>山手線 / E235系 · 中央線 / E233系0番台<br>大阪環状線 / 323系 · 東海道線 / 207系2000番台<br>東北本線 / 701系1500番台 · 野岩鉄道 / 6050型</p><p>野岩鉄道は提供BVEデータの新藤原〜会津高原尾瀬口を再現。線形、勾配、ホーム、トンネル・橋、明示された速度制限、車内放送を読み込みます。山や林は景観用の近似です。</p><p>線路の曲がり方はOpenStreetMap、駅間距離は公開駅一覧を使用。4路線のホーム・並走線は地図やJRの構内図を参照し、電車でGO！FINALの映像で見え方を照合しました。建物・停止目標は試作上の概略です。シナリオの運転区間はFINALの公開プレイ記録を参照し、現在の車両で各駅に停まります。</p><p>中央線・大阪環状線は位置を確認できた信号機を描画します。FINALを参考にした4路線の速度上限は車両性能の設定です。ゲームの実データとは区別しています。</p><p>E235系は提供データの15両設定を参考に、山手線用の11両・起動加速度3.0km/h/sを試作設定。E233系は提供12両、323系8両、207系7両です。力行は提供の速度別引張力表を補間し、常用制動・抵抗は簡易モデルです。</p><p>E235系は提供データの起動時モーター音、E233系は三菱IGBTの力行・制動モーター音を使用します。発車合図には東北本線と共通のホイッスルを使います。4路線の運転士喚呼にはFINALの路線別音声を使います。</p><small class="credits-note"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors / ODbL</a> · <a href="./assets/final/route-data-notes.md" target="_blank">路線の出典・検証</a> · <a href="./assets/final/scenario-notes.md" target="_blank">シナリオの出典</a></small>`);}
$('settingsButton').onclick=()=>{playMenuSound('confirm');settingsDialog();};
$('driveSettings').onclick=settingsDialog;
function setNotch(n){if(mode!=='drive'||paused||run.finished)return;const c=controlsFor(recipe());run.notch=clamp(n,c.min,c.max);}
$('brakeButton').onclick=()=>setNotch(run.notch-1);$('powerButton').onclick=()=>setNotch(run.notch+1);$('neutralButton').onclick=()=>setNotch(0);$('ebButton').onclick=()=>setNotch(controlsFor(recipe()).min);bindHornButton($('hornButton'),pressed=>sound?.setHorn(pressed&&!paused&&!run?.finished));
function toggleExtras(show){$('extras').hidden=!show;$('moreButton').setAttribute('aria-expanded',String(show));}
$('moreButton').onclick=()=>toggleExtras($('extras').hidden);$('closeExtras').onclick=()=>toggleExtras(false);
$('viewButton').onclick=()=>{panorama=!panorama;$('cab').hidden=panorama;$('viewButton').textContent=panorama?'運転台を表示':'前面展望';toggleExtras(false);};
$('assistButton').onclick=()=>{assist=!assist;$('assistButton').textContent='停車アシスト '+(assist?'ON':'OFF');if(run)run.assistBraking=false;toast(assist?'停車アシストを有効にしました。':'停車アシストを解除しました。');toggleExtras(false);};
$('pauseButton').onclick=()=>{if(paused)return;showModal('<p class="eyebrow">PAUSED</p><h2>ひと休み。</h2><p>運転と音声を一時停止しています。</p><div class="dialog-buttons"><button id="resumeButton" class="start-button">運転を再開</button><button id="pauseMenuButton">路線選択へ</button></div>');$('resumeButton').onclick=closeModal;$('pauseMenuButton').onclick=returnMenu;};
async function cleanup(){
 token++;
 sound?.stop();
 panel?.dispose();
 panel=null;
 world?.dispose();
 world=null;
 await sound?.dispose().catch(()=>{});
 sound=null;
 activeRoute=null;
}
async function returnMenu(){playMenuSound('cancel');if($('modal').open)$('modal').close();modalPaused=false;paused=true;setMode('menu');toggleExtras(false);await cleanup();run=null;chosenVehicle=null;chosenRoute=null;displayMenu();}
$('menuButton').onclick=returnMenu;
async function effect(name){return sound?.playEffect(name)??false;}
async function closeSequence(generation){
 if(!run||generation!==token)return;
 try{
  run.doorPhase='announcement';
  const r=route(),departureKey=run.startingDeparture&&r.stations[run.startIndex].departureSound;
  if(departureKey){
   await sound.playRouteAnnouncement(r.stations[run.startIndex].announcementRouteId??r.id,departureKey);
   if(generation!==token)return;
  }
  await effect('whistle');
  if(generation!==token)return;
  run.doorPhase='closing';
  const completed=await effect('close');
  if(generation!==token||!completed)return;
  finishStop(run,route());
  sound.playEffect('relayOn').catch(()=>{});
  toast(run.finished?'全区間の運転を完了しました。':`戸閉よし。次は${route().stations[run.next].name}。`,5);
  if(run.finished){
   paused=true;
   pauseAudio(true);
   showResults();
  }else{
   sound.callDriver('doorsClosed','departure');
  }
 }catch(error){
  if(generation!==token)return;
  run.doorPhase='audio-error';
  $('audioRetry').hidden=false;
  toast('戸閉音を再生できませんでした。「その他」から再試行できます。',9999);
 }
}
function updateDriverCalls(){
 if(run.finished||run.doors)return;
 const r=route();
 if(r.soundEvents){
  for(let event=r.soundEvents[run.soundCursor];event&&event.s<=run.s;event=r.soundEvents[++run.soundCursor]){
   if(event.action==='play')sound.callRouteAnnouncement(event.routeId??r.id,event.key);
  }
  return;
 }
 const departedFrom=takeDepartureCall(run);
 if(departedFrom!==null){
  const station=r.stations[departedFrom];
  sound.callDepartureFrom(station.layoutIndex??departedFrom);
 }
 if(run.v<=.01)return;
 const station=r.stations[run.next],distance=station.s-run.s;
 if(run.lastCalledStop!==run.next&&distance>=0&&distance<=150){
  run.lastCalledStop=run.next;
  sound.callRouteCue('approach',station.layoutIndex??run.next);
 }
 const block=nextSignalCall(r.signals??[],run.s,run.calledSignals??=new Set());
 if(block!==null)sound.callRouteCue('signal',block);
}
$('audioRetry').onclick=()=>{$('audioRetry').hidden=true;closeSequence(token);};
function updateDoors(dt){if(run.finished||run.doorPhase==='audio-error')return;const st=route().stations[run.next];if(!run.doors){if(run.v<=.01&&Math.abs(st.s-run.s)<=3){run.stopWait+=dt;run.doorPhase='waiting-open';if(run.stopWait>=3){run.v=0;run.doors=true;run.doorPhase='boarding';run.dwell=0;effect('open').catch(()=>{});effect('relayOff').catch(()=>{});}}else{run.stopWait=0;run.doorPhase=null;}}else if(run.doorPhase==='boarding'){run.dwell+=dt;if(run.dwell>=15)closeSequence(token);}}
async function start(startIndex){
 if(loading||!recipes)return;
 const meta=META[selected];
 const scenario=selectedScenario();
 const freeStart=Number($('startStation').value);
 loading=true;
 const controlsToLock=document.querySelectorAll('#menuControls button,#menuControls select,#routeCards button');
 controlsToLock.forEach(element=>element.disabled=true);
 $('startDrive').textContent='運転台と音を準備中…';
 let nextSound;
 try{
  if(meta.legacy){
   await playMenuSound('confirm',{waitForEnd:true});
   location.href=`./tohoku.html?v=41&drive=1&station=${startIndex??freeStart}${generatedCab?'&cab=generated':''}`;
   return;
  }
  if(mode==='menu')playMenuSound('confirm');
  const trip=scenarioJourney(makeServiceRoute(selectedRoute(),recipe().id,chosenService),scenario);
  if(!trip)throw Error('運転できるシナリオ区間を確認できません');
  const r=trip.route,train=recipe(),pack=packs.get(train.id);
  startIndex??=scenario?trip.startIndex:freeStart;
  if(!pack)throw Error('車両の運転台と収録音が見つかりません');
  nextSound=new LocalTrainAudio(train,pack,{volume:settings.volume});
  const audioEnabled=nextSound.resume();
  await cleanup();
  activeRoute=r;
  sound=nextSound;
  const [loadedPanel]=await Promise.all([generatedCab&&['e235','e233','323','207','6050'].includes(train.id)?GeneratedCab.load($('cab'),train.id):LocalCabPanel.load($('cab'),train,pack),sound.prepare(),audioEnabled]);
  panel=loadedPanel;
  run=createJourney(r,train,startIndex,trip.endIndex);
  if(r.soundEvents){
   const first=r.soundEvents.findIndex(event=>event.s>=run.s);
   run.soundCursor=first<0?r.soundEvents.length:first;
  }
  const startTime=r.stations[startIndex].startTime;
  run.clockStart=startTime?startTime.split(':').reduce((seconds,part)=>seconds*60+Number(part),0):8*3600;
  r.color=meta.color;
  r.carCount=train.playableSpecs.carCount;
  r.eyeHeight=Number(train.playableSpecs.viewpoint?.y??2.7);
  if(r.id==='yagan')r.eyeOffset=Number(train.playableSpecs.viewpoint.x);
  world=new FinalWorld($('world'),r,{quality:settings.quality});
  world.setCabView(panel.viewOrigin);
  panorama=false;
  $('cab').hidden=false;
  paused=false;
  modalPaused=false;
  setMode('drive');
  const controls=controlsFor(train);
  $('notchStrip').innerHTML=controls.labels.map((label,i)=>`<button data-notch="${i-controls.neutral}" aria-label="ノッチ ${label}">${label}</button>`).join('');
  $('notchStrip').querySelectorAll('button').forEach(button=>button.onclick=()=>setNotch(Number(button.dataset.notch)));
  $('driveScreen').querySelector('.hud-route span').textContent=chosenService;
  $('hudRoute').textContent=scenario?`${meta.name} · ${r.stations[trip.endIndex].name}行`:meta.name;
  $('vehicleLimit').textContent=`車両上限 ${train.playableSpecs.maxSpeedKmh} km/h`;
  $('mapQuality').textContent=r.soundEvents?'提供BVE路線データ':'地図を参考にした試作';
  $('mapAttribution').hidden=!!r.soundEvents&&!r.osmSections;
  $('viewButton').textContent='前面展望';
  $('audioRetry').hidden=true;
  $('hornButton').hidden=!sound.effectRef('hornPrimary');
  toast(`${r.stations[startIndex].name}で戸開中。合図音の後に自動で戸閉します。`,8);
  closeSequence(token);
 }catch(error){
  if(nextSound&&nextSound!==sound)await nextSound.dispose().catch(()=>{});
  await cleanup();
  setMode('menu');
  showModal('<h2>運転を開始できませんでした</h2><p id="startError"></p>');
  $('startError').textContent=error.message;
 }finally{
  loading=false;
  controlsToLock.forEach(element=>element.disabled=false);
  $('startDrive').innerHTML='<span>▶</span> 運転をはじめる';
 }
}
$('startDrive').onclick=()=>start();$('retryButton').onclick=()=>{const index=Math.max(run.startIndex,run.next-1);toggleExtras(false);start(index);};
function showResults(){const errors=run.errors.map(x=>Math.abs(x)),mean=errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:0;showModal(`<p class="eyebrow">DRIVER'S WORK COMPLETE</p><h2>乗務、おつかれさま。</h2><p>${META[selected].name} · ${recipe().name}<br>停車 ${run.served}駅 / 通過 ${run.missed}駅<br>平均停止誤差 ${distanceLabel(mean)}</p><div class="dialog-buttons"><button id="resultMenu" class="start-button">路線選択へ</button></div>`,{pause:false});$('resultMenu').onclick=returnMenu;}
function hud(){{const lr=route(),end=lr.stations[run.endIndex]?.s??Infinity;lookahead.update(run.s,changesFromSections(lr.limits),lr.signals??[],stationMarks(lr.stations,lr.sceneryStations).filter(x=>x.s<=end+1&&(!x.stop||x.s>=(lr.stations[Math.min(run.next,run.endIndex)]?.s??0)-2)));}const r=route(),next=r.stations[Math.min(run.next,run.endIndex)],d=next.s-run.s,notch=notchLabel(recipe(),run.notch),speed=Math.round(run.v*3.6),door=run.doorPhase==='closing'?'戸閉中':run.doors?'戸開':'戸閉';$('hudNext').textContent=next.name;$('hudDistance').textContent=run.finished?'運転完了':`${d<0?'超過 ':'あと '}${distanceLabel(d)}`;$('hudSpeed').textContent=speed;$('nativeSpeed').textContent=speed;$('hudNotch').textContent=notch;$('hudNotch').parentElement.dataset.kind=notch==='EB'?'eb':run.notch<0?'brake':run.notch>0?'power':'neutral';$('nativeNotch').textContent=notch;$('hudDoors').textContent=door;$('nativeDoor').textContent=door;$('nativeNext').textContent=next.name;$('nativeDistance').textContent=(d<0?'超過 ':'')+distanceLabel(d);$('closedLamp').classList.toggle('lit',!run.doors);const t=run.clockStart+Math.floor(run.elapsed);$('hudTime').textContent=[Math.floor(t/3600)%24,Math.floor(t/60)%60,t%60].map(x=>String(x).padStart(2,'0')).join(':');$('hudScore').textContent=`停車 ${run.served} / ${run.endIndex-run.startIndex}`;$('speedBar').style.setProperty('--speed',speed/recipe().playableSpecs.maxSpeedKmh*100);const marker=stopPosition(d);$('stopDiamond').hidden=!marker.visible;$('stopDiamond').style.top=marker.percent+'%';$('stopGauge').setAttribute('aria-label',`停止位置±10メートルマーカー ${marker.text}`);$('notchStrip').querySelectorAll('button').forEach(b=>b.classList.toggle('active',Number(b.dataset.notch)===run.notch));
 const upcoming=Math.abs(d)<=3?next:(r.sceneryStations??r.stations).find(station=>station.s>run.s+2);
 if(upcoming&&!run.finished){
  const stops=r.stations.some(station=>Math.abs(station.s-upcoming.s)<.5);
  $('hudNext').textContent=upcoming.name;
  $('hudNextKind').textContent=stops?'次の停車駅':'次の駅 · 通過';
  $('hudDistance').textContent='あと '+distanceLabel(upcoming.s-run.s);
  $('nativeNext').textContent=upcoming.name+(stops?'':'（通過）');
  $('nativeDistance').textContent=distanceLabel(upcoming.s-run.s);
 }
 const limit=routeLimitAt(r,run.s);
 $('vehicleLimit').textContent=limit===null?`車両上限 ${recipe().playableSpecs.maxSpeedKmh} km/h`:`区間制限 ${limit} km/h`;
 $('vehicleLimit').classList.toggle('overspeed',limit!==null&&speed>limit);
 $('eventText').textContent=run.correctedStopError!=null&&run.doorPhase==='waiting-open'?`行き過ぎ ${distanceLabel(run.correctedStopError)} → 停止位置 0 cm に補正`:run.doorPhase==='waiting-open'?`停車確認 ${Math.min(3,Math.floor(run.stopWait))} / 3秒`:run.doorPhase==='boarding'?`乗降中　戸閉合図まで ${Math.max(0,Math.ceil(15-run.dwell))}秒`:run.doorPhase==='announcement'?'合図音を再生中':run.doorPhase==='closing'?'戸閉中 · 音の終了後に戸閉灯が点灯':run.elapsed<toastUntil?toastText:`次の停車駅は ${next.name} です。`;
 const controller=controlsFor(recipe());overlayControls.update({value:run.notch,min:controller.min,max:controller.max,labels:controller.labels,disabled:paused||run.finished});
}
function advance(dt){
 if(run.finished)return;
 const r=route(),train=recipe(),station=r.stations[run.next];
 if(assist&&!run.doors)brakeAssist(run,r,train);
 driveStep(run,train,dt,world.grade(run.s));
 if(correctStoppedOverrun(run,station.s)!==null)return;
 if(run.next<run.endIndex&&run.s>=r.stations[run.next+1].s-150){
  toast(`${station.name}を通過しました。`);
  run.missed++;
  run.next++;
  run.stopWait=0;
  run.assistBraking=false;
 }
}
document.addEventListener('keydown',e=>{if((e.target.matches('input,select,textarea')&&e.target.id!=='notchSlider')||$('modal').open)return;if(mode==='menu'){if(trainSelectionOpen&&['ArrowUp','ArrowDown'].includes(e.code))return;if(e.code==='Escape'&&trainSelectionOpen){e.preventDefault();closeTrainSelection();return;}if(e.code==='ArrowUp'||e.code==='ArrowDown'){e.preventDefault();if(recipes)choose(selected+(e.code==='ArrowDown'?1:-1));}else if(e.code==='Enter'){if(e.target.closest('button,a')&&!e.target.closest('.route-card'))return;e.preventDefault();if(trainSelectionOpen)start();else openTrainSelection();}return;}if(e.code==='Escape'){e.preventDefault();$('pauseButton').click();return;}if(e.code==='Enter'){e.preventDefault();if(!paused&&!e.repeat&&!run.finished)sound.setHorn(true);return;}if(paused||e.repeat)return;if(['KeyW','ArrowUp','KeyS','ArrowDown','Space'].includes(e.code))e.preventDefault();if(['KeyW','ArrowUp'].includes(e.code))setNotch(run.notch-1);else if(['KeyS','ArrowDown'].includes(e.code))setNotch(run.notch+1);else if(e.code==='KeyX')setNotch(0);else if(e.code==='Space')setNotch(controlsFor(recipe()).min);else if(e.code==='KeyJ')effect('hornSecondary').catch(()=>{});});
document.addEventListener('keyup',e=>{if(e.code==='Enter'&&mode==='drive')sound?.setHorn(false);});
window.addEventListener('blur',()=>sound?.setHorn(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='drive'&&!paused&&!run.finished)$('pauseButton').click();});
let last=performance.now();
function frame(now){
 const dt=Math.min(.08,Math.max(0,(now-last)/1000));
 last=now;
 if(mode==='drive'&&world&&run){
  const r=route();
  if(!paused){
   let remaining=dt;
   while(remaining>0&&!paused){
    const step=Math.min(.02,remaining);
    advance(step);
    remaining-=step;
   }
   if(!paused){
    updateDoors(dt);
    updateDriverCalls();
    const surface=world.structureAt(run.s,'tunnel')?'tunnel':world.structureAt(run.s,'bridge')?'bridge':'long';
    const rollingIndex=r.rollingNoise?.findLast(change=>change.s<=run.s)?.index;
    sound.update(run.v*3.6,run.notch,dt,{doors:run.doors,surface,rollingIndex});
   }
  }
  hud();
  world.render(run.s,run.v,paused?0:dt,{acceleration:run.acceleration,shake:settings.shake,panorama});
  if(!panorama)panel?.render(run,paused?0:dt,Boolean(world.structureAt(run.s,'tunnel')));
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
try {
 const routeLoads=META.map(async meta=>{
  if(meta.legacy)return {id:meta.id,stations:TOHOKU_STATIONS};
  const response=await fetch(`./assets/final/${meta.id}-route.json?v=41`);
  if(!response.ok)throw Error('路線データを読み込めません');
  return response.json();
 });
 [recipes,packs,...routes]=await Promise.all([loadVehicleRecipes(),loadBundledTrainPacks(),...routeLoads]);
 $('routeCards').innerHTML=META.map((m,i)=>`<button class="route-card${m.card?' yagan-card':m.legacy?' tohoku-card':''}" data-route="${i}" style="--i:${i};--route-color:${m.color};--card-image:url(./assets/final/${m.card??m.id+'-route-button-v25.png'})" aria-pressed="false"><span class="route-copy"><strong>${m.name}</strong><small>${m.english}</small><em>普通　${m.train}</em></span><span class="sun" aria-hidden="true">☀</span></button>`).join('');
 $('routeCards').querySelectorAll('button').forEach(button=>button.onclick=()=>{choose(Number(button.dataset.route));openTrainSelection();});
 $('compactRoute').innerHTML=META.map((m,i)=>`<option value="${i}">${m.name} · ${m.train}</option>`).join('');
 $('compactRoute').onchange=event=>{choose(Number(event.target.value));openTrainSelection();};
 const additions=await Promise.all(['chuo-extended','shinonoi-extended','chuo-kofu','chuo-shinshu','shinonoi','oito'].map(async id=>{
 const response=await fetch('./assets/final/'+id+'-route.json?v=41');
 if(response.ok)extraRoutes.set(id,await response.json());
}));
 setupTrainSelection();
 displayMenu();
} catch(error){
 $('startDrive').disabled=true;
 showModal('<h2>データを読み込めませんでした</h2><p id="loadError"></p>');
 $('loadError').textContent=error.message;
}

function setupTrainSelection(){
 const overlay=document.createElement('section');
 overlay.id='trainSelection';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.hidden=true;overlay.setAttribute('aria-label','列車選択');
 overlay.innerHTML='<div class="selection-card"><p>TRAIN SELECT</p><h2 id="selectionTitle">列車選択</h2><label>車両・運転区間<select id="trainChoice"></select></label><p id="selectionNotes"></p><div id="departureOptions"></div><div class="selection-actions"><button id="selectionBack">路線選択に戻る</button></div></div>';
 $('stage').append(overlay);
 for(const id of ['scenarioControl','startStationControl'])$('departureOptions').append($(id));
 overlay.querySelector('.selection-actions').append($('startDrive'));
 overlay.addEventListener('keydown',event=>{if(event.code==='Escape'){event.preventDefault();event.stopPropagation();closeTrainSelection();}});
 const next=document.createElement('button');next.id='routeContinue';next.className='start-button';next.textContent='列車を選ぶ';
 $('menuControls').append(next);next.onclick=openTrainSelection;
 $('selectionBack').onclick=closeTrainSelection;
 $('trainChoice').onchange=()=>{playMenuSound('cursor');applyTrainChoice();};
}
function applyTrainChoice(){
 const choices=serviceChoices[META[selected].id];
 const [routeId,vehicle,service]=choices[Number($('trainChoice').value)];
 chosenVehicle=vehicle;chosenService=service;
 chosenRoute=extraRoutes.get(routeId)??routes[selected];
 const playable=makeServiceRoute(chosenRoute,vehicle,service);
 $('startStation').replaceChildren(...playable.stations.slice(0,-1).map((station,index)=>new Option(station.name,String(index))));
 $('scenarioSelect').value='';
 $('scenarioControl').hidden=routeId!==META[selected].id||service!=='普通';
 $('startStationControl').hidden=false;
 $('selectionNotes').textContent=vehicle==='681'?'681系の性能表・警笛は提供フォルダ内に揃っていないため、加速度は仮設定です。':vehicle==='223-1000'?'外部参照の操作音10件は提供フォルダ内にありません。':rNote(chosenRoute);
 $('selectionTitle').textContent=META[selected].name+' · 列車選択';
}
function openTrainSelection(){
 if(loading||!recipes)return;
 playMenuSound('confirm');
 const choices=serviceChoices[META[selected].id];
 $('trainChoice').replaceChildren(...choices.map(([routeId,vehicle,service],index)=>{
  const train=vehicle==='701'?TOHOKU_TRAIN:recipes.trains.find(t=>t.id===vehicle);
  const r=makeServiceRoute(extraRoutes.get(routeId)??routes[selected],vehicle,service);
  return new Option((train?.name??vehicle)+' · '+service+' · '+r.name+' · '+r.stations[0].name+' → '+r.stations.at(-1).name,String(index));
 }));
 trainSelectionOpen=true;$('menuScreen').inert=true;$('menuControls').inert=true;applyTrainChoice();$('trainSelection').hidden=false;$('trainChoice').focus();
}
function closeTrainSelection(){
 if(loading)return;
 playMenuSound('cancel');trainSelectionOpen=false;$('menuScreen').inert=false;$('menuControls').inert=false;$('trainSelection').hidden=true;chosenVehicle=null;chosenRoute=null;displayMenu();
}

function rNote(r){return r.geometrySections?'BVE収録区間を地図の線路で接続した運転コースです。':r.id.startsWith('shinonoi')?'この運転コースでは姨捨の通過線を走ります。':'';}
