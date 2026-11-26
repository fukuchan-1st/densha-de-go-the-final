import {obasuteServing,updateObasuteOperation,obasuteDirection,obasuteActive,obasuteShunting,obasuteDoorReady,advanceObasute,obasuteCaption,obasuteTarget,obasuteSpeedLimit} from './obasute-operations.js?v=118';
import {DriveIntro} from './drive-intro.js?v=118';
import {omeOnboardFile} from './station-broadcast.js?v=118';
import {wallet,SCENARIO_PRICE} from './scenario-wallet.js?v=118';
import {TOHOKU_TRAIN,loadTohokuRoute} from './tohoku-integration.js?v=118';
import {TohokuAudio} from './tohoku-audio.js?v=118';
import {CabPanel} from './cab-panel.js?v=118';
import {fitStationName} from './station-name-layout.js?v=118';
import {weatherRoute,weatherLimits,weatherLimitAt,reportTyphoon} from './weather-operations.js?v=118';
import {mountRoutePages} from './route-pages.js?v=118';
import {WEATHER,weatherType,updateWeatherStatus} from './weather.js?v=118';
import {gradeLabel} from './tunnel-effects.js?v=118';
import {updateDoorVisual} from './train-doors.js?v=118';
import {scheduledBoardingDelay} from './published-schedules.js?v=118';
import {loadRoadAsset} from './road-assets.js?v=118';import {OnboardBroadcast} from './onboard-broadcast.js?v=118';
import {CrossingAudio} from './crossings.js?v=119';
import {VIEW_LABELS,normalizedView,replayViewMode} from './view-modes.js?v=118';
import {yaganPlanningSpec,yaganBoardingReady,yaganBoardingDelay} from './yagan-timetable.js?v=118';
import {progress,serviceKey} from './scenario-progress.js?v=118';
import {scenarioRanges} from './scenario-ranges.js?v=118';
import {installCheats,jumpToStation} from './game-cheats.js?v=118';
import {mountGameShell} from './game-shell.js?v=118';
import {DutyRecorder,replayStateAt,recordReplayAudio} from './replay-store.js?v=118';
import {osakaPlanningSpec} from './osaka-timetable.js?v=118';
import {collectStationReports,collectRestrictionReports,pauseWhenSpeechEnds} from './station-timing.js?v=118';
import {buildConnectingRoutes} from './service-catalog.js?v=118';
import {loadAudioMix,audioMixMarkup,bindAudioMix} from './audio-mix.js?v=118';
import {bindRouteKeys,bindScreenKeys} from './screen-keys.js?v=118';
import {sharedEffects} from './buffered-effects.js?v=118';
import {bindTrainSelectionKeys} from './selection-keys.js?v=118';
import {beginTerminalOpening,advanceTerminalOpening} from './terminal-arrival.js?v=118';
import {vehiclePhoto} from './vehicle-photos.js?v=118';
import {mountTrainDetails} from './train-details.js?v=118';
import {mountWheelPicker} from './wheel-picker.js?v=118';
import {routePlanningSpec,mountScoring,checkpointMarks,scoringStations,buildScoreTimetable,resolveScoreSchedule,scoreHazards,hornMarks,currentScoreRestriction,signalRestriction} from './scoring.js?v=119';
import {mountDrivingOverlay} from './driving-overlay.js?v=118';import {mountLookahead,changesFromSections,stationMarks} from './lookahead.js?v=118';
import {serviceChoices,makeServiceRoute} from './train-selection.js?v=118';
import {GeneratedCab,generatedCab} from './generated-cab.js?v=118';
import {FinalWorld} from './final-world.js?v=119';
import {setMenuPhoto,mountMenuMusic} from './photo-menu.js?v=118';
import {loadVehicleRecipes,loadBundledTrainPacks,LocalCabPanel,LocalTrainAudio} from './final-vehicle.js?v=118';
import {clamp,controlsFor,notchLabel,createJourney,driveStep,brakeAssist,distanceLabel,routeLimitAt,stopPosition,finishStop,beginDoorClosing,isDoorClosing,takeDepartureCall} from './final-model.js?v=118';
import {STATIONS as TOHOKU_STATIONS} from './route-data.js?v=118';
import {FINAL_SCENARIOS,scenarioJourney} from './final-scenarios.js?v=118';
import {detectStoppedOverrun,correctStoppedOverrun,nextSignalCall} from './train-operations.js?v=118';
import {bindHornButton} from './assets/audio/held-horn.js?v=118';


const $=id=>document.getElementById(id),META=[
 {id:'yamanote',name:'山手線',english:'YAMANOTE LINE',vehicle:'e235',color:'#a2cf3d',summary:'東京 → 東京 · 外回り',train:'E235系',short:'E235'},
 {id:'chuo',name:'中央線系統',english:'CHUO LINE',vehicle:'e233',color:'#e98a38',summary:'東京 → 高尾 · 全駅停車',train:'E233系0番台',short:'E233'},
 {id:'osaka',name:'大阪環状線',english:'OSAKA LOOP LINE',vehicle:'323',color:'#e85248',trainColor:'#e57227',summary:'大阪 → 大阪 · 外回り',train:'323系',short:'323'},
 {id:'tokaido',name:'東海道線',english:'TOKAIDO LINE',vehicle:'207',color:'#5caddb',summary:'京都 → 神戸 · 各駅停車',train:'207系2000番台',short:'207'},
 {id:'tohoku',name:'東北本線',english:'TOHOKU MAIN LINE',vehicle:'701',color:'#78b888',summary:'黒磯 → 福島 · 各駅停車',train:'701系1500番台',short:'701'},
 {id:'yagan',name:'東武スカイツリーライン・日光線系統',english:'TOBU SKYTREE / NIKKO LINES',vehicle:'6050',color:'#d7b991',trainColor:'#a53037',bodyColor:'#f2e4c7',summary:'浅草〜東武日光・会津田島',train:'500・10030・70000・20400・6050系',short:'6050',series:'型',card:'yagan-route-button.svg'},
 {id:'toho',name:'東方鉄道線',english:'TOHO RAILWAY',vehicle:'6050',color:'#cda86f',summary:'東方本線・人里線・センター支線',train:'6050型 / 211系',short:'6050',series:'型',card:'toho-route-button.svg'},
 {id:'yamagata',name:'奥羽本線（山形線）',english:'YAMAGATA LINE',vehicle:'719-5000',color:'#e9a34b',summary:'福島〜米沢 / 米沢〜新庄 · 各駅停車',train:'719系5000番台',short:'719',card:'../vehicle-photos/719-5000.webp'}
];
const preferredRoute=new URLSearchParams(location.search).get('route');
const driveIntro=new DriveIntro();
let selected=Math.max(0,META.findIndex(meta=>meta.id===preferredRoute)),recipes,routes=[],world,panel,sound,run,mode='menu',paused=false,assist=false,panorama=false,viewMode=0,token=0,loading=false,toastText='',toastUntil=0,modalPaused=false;
let chosenOption,routePages;
let packs=new Map(),activeRoute,chosenVehicle=null,chosenRoute=null,chosenService='普通',trainSelectionOpen=false;
let trainDetails,detailEndIndex=null;
import {integrateTobuVehicles} from './tobu-vehicles.js?v=118';
import {loadTobuRouteParts,assembleTobuRoutes} from './tobu-routes.js?v=119';
import {formationCount} from './formation-operations.js?v=118';
const extraRoutes=new Map();
let recorder=null,replaySession=null,crossingAudio=null;
const settings={weather:'clear',volume:.65,shake:1,drawDistance:1500,quality:matchMedia('(pointer:coarse)').matches?'light':'standard'};
try{const saved=JSON.parse(localStorage.getItem('railway-drive-settings')??'{}');settings.weather=weatherType(saved.weather);if(Number.isFinite(saved.volume))settings.volume=clamp(saved.volume,0,1);if(Number.isFinite(saved.shake))settings.shake=clamp(saved.shake,0,1);if(Number.isFinite(saved.drawDistance))settings.drawDistance=clamp(saved.drawDistance,500,2000);if(['light','standard','high'].includes(saved.quality))settings.quality=saved.quality;}catch{}
const audioMix=loadAudioMix(localStorage,settings.volume);
const cheats=installCheats({getState:()=>run,active:()=>mode==='drive'&&!replaySession,paused:()=>paused||!run||run.finished,onChange:()=>{try{if(sessionStorage.getItem('trackfinity-admin')==='1')wallet.unlockAll();}catch{}refreshScenarioAccess();},onMessage:text=>toast(text,8)});
const saveSettings=()=>{try{localStorage.setItem('railway-drive-settings',JSON.stringify(settings));}catch{}};
const overlayControls=mountDrivingOverlay($('driveScreen'),{onChange:n=>setNotch(n),actions:[$('hornButton'),$('pauseButton'),$('moreButton')],instructionElement:$('eventText')});$('driveScreen').append($('extras'));const lookahead=mountLookahead($('driveScreen'));
const score=mountScoring($('driveScreen'),{badge:document.querySelector('.hud-route'),volume:()=>audioMix.se});
const menuEffects=sharedEffects();
const menuEffectURLs=Object.fromEntries(['cursor','confirm','cancel'].map(name=>[name,new URL($('menuSound-'+name).getAttribute('src'),location.href).href]));
menuEffects?.preload([...Object.values(menuEffectURLs),new URL('./assets/title-start.wav',location.href).href]).catch(()=>{});
function playMenuSound(name,{waitForEnd=false}={}){
 if(audioMix.se===0)return Promise.resolve();
 if(menuEffects){const group=menuEffects.playSequence([menuEffectURLs[name]],audioMix.se);return waitForEnd?group.done:undefined;}
 const clip=$('menuSound-'+name);clip.volume=audioMix.se;clip.currentTime=0;const playback=clip.play();if(!waitForEnd){playback.catch(()=>{});return;}
 return new Promise(resolve=>{clip.onended=resolve;playback.catch(resolve);});
}
const menuMusic=mountMenuMusic(()=>audioMix.bgm,{active:false});
let shellActive=true;
const gameShell=mountGameShell({stage:$('stage'),settings,mix:audioMix,onSound:playMenuSound,onPage:page=>menuMusic.setMenu(page!=='title'),onTitleStart:()=>{menuEffects?.playSequence([new URL('./assets/title-start.wav',location.href).href],audioMix.se);},onActive:active=>{shellActive=active;if(!active&&mode==='drive')menuMusic.setMenu(false);$('menuScreen').inert=active;$('menuControls').inert=active;},onDrive:()=>{setMode('menu');document.querySelector('#routeCards [data-route="'+selected+'"]')?.focus();},onReplay:playSavedReplay,onSettings:kind=>{updateMenuWeather();if(kind==='scenery')world?.refreshScenery?.();saveSettings();sound?.setMix(audioMix);menuMusic.setVolume();world?.setDrawDistance?.(settings.drawDistance);world?.setQuality?.(settings.quality);if(kind==='close'&&mode==='drive'){paused=false;pauseAudio(false);}}});
if(new URLSearchParams(location.search).get('menu')==='main')gameShell.showMain();
const routeMain=document.createElement('button');routeMain.id='routeMainMenu';routeMain.textContent='Esc　メインメニューへ';$('menuScreen').append(routeMain);routeMain.onclick=()=>gameShell.showMain();

function updateMenuWeather(){const type=weatherType(settings.weather),icon={clear:'☀',rain:'☂',snow:'❄',heavySnow:'❄',settledSnow:'❄',thunderstorm:'ϟ',typhoon:'≋'}[type];const label=document.querySelector('.menu-bottom>.sun');if(label)label.textContent=icon+' '+WEATHER[type].name;document.querySelectorAll('.route-card>.sun').forEach(el=>el.textContent=icon);}
function fit(){const r=$('stageArea').getBoundingClientRect(),scale=Math.min(r.width/1600,r.height/900);document.documentElement.style.setProperty('--overlay-ui-scale',Math.max(1,Math.min(3.5,44/(54*scale))));$('stage').style.left='50%';$('stage').style.top='50%';$('stage').style.transform=`translate(-50%,-50%) scale(${scale})`;}
addEventListener('resize',fit);visualViewport?.addEventListener('resize',fit);new ResizeObserver(fit).observe($('stageArea'));fit();
function recipe(){const train=(chosenVehicle??META[selected].vehicle)==='701'?TOHOKU_TRAIN:recipes.trains.find(t=>t.id===(chosenVehicle??META[selected].vehicle));const count=mode==='drive'&&run?.carCount?run.carCount:chosenOption?.carCount;return chosenVehicle&&count?{...train,playableSpecs:{...train.playableSpecs,carCount:count}}:train;}
function selectedRoute(){return chosenRoute??routes[selected];}
function route(){const base=activeRoute??selectedRoute();return mode==='drive'&&run?weatherRoute(run,base):base;}
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
function displayMenu(){updateMenuWeather();const meta=META[selected],r=routes[selected],train=recipe();document.documentElement.style.setProperty('--accent',meta.color);$('trainRoute').textContent=meta.english;$('trainName').innerHTML=`${meta.short}<span>${meta.series??'系'}</span>`;$('formation').textContent=`${train.playableSpecs.carCount}両編成 · 各駅停車`;$('compactRoute').value=String(selected);document.querySelectorAll('.route-card').forEach((el,i)=>{el.classList.toggle('active',i===selected);el.setAttribute('aria-pressed',String(i===selected));});$('startStation').innerHTML=r.stations.slice(0,-1).map((st,i)=>`<option value="${i}">${st.name}</option>`).join('');const scenarios=FINAL_SCENARIOS[meta.id]??[];$('scenarioControl').hidden=!scenarios.length;$('scenarioSelect').replaceChildren(new Option('自由運転',''),...scenarios.map(([id,from,to],i)=>new Option(`#${id} ${from} → ${to}`,String(i))));displayScenario();setMenuPhoto(meta.id);refreshClears();refreshScenarioAccess();routePages?.sync();}
function choose(i){
 if(loading)return;
 const next=(i+META.length)%META.length;
 if(selected!==next)playMenuSound('cursor');
 selected=next;
 chosenVehicle=null;chosenRoute=null;
 displayMenu();
}
function setMode(value){menuMusic.setMenu(value!=='drive');mode=value;$('menuScreen').inert=false;$('menuControls').inert=false;if(value==='drive'){$('trainSelection').hidden=true;trainSelectionOpen=false;}document.body.dataset.mode=value;$('menuScreen').hidden=value!=='menu';$('menuControls').hidden=value!=='menu';$('driveScreen').hidden=value!=='drive';$('driveControls').hidden=value!=='drive';fit();}
function pauseAfterArrivalVoice(){const endedRun=run,endedSound=sound;score.pause(true);pauseWhenSpeechEnds(endedSound,()=>mode==='drive'&&run===endedRun&&sound===endedSound,()=>pauseAudio(true));}
async function pauseAudio(value){score.pause(value);await sound?.setPaused(value).catch(()=>{});}
function showModal(content,{pause=true}={}){if(mode==='drive'&&pause&&!paused){paused=true;modalPaused=true;pauseAudio(true);}$('modalContent').innerHTML=content;if(!$('modal').open)$('modal').showModal();}
function closeModal(){if(mode==='menu')playMenuSound('cancel');$('modal').close();if(modalPaused&&!run?.finished){paused=false;pauseAudio(false);}modalPaused=false;}
$('closeModal').onclick=closeModal;$('modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
function settingsDialog(){if(mode==='drive'){paused=true;pauseAudio(true);}gameShell.showOptions(mode==='drive'?'drive':'main');}
function helpDialog(){showModal(`<p class="eyebrow">DRIVING GUIDE</p><h2>一駅ずつ、確実に。</h2><p><kbd>S / ↓</kbd> P側へ　<kbd>W / ↑</kbd> EB側へ<br><kbd>←</kbd> 惰行　<kbd>Space</kbd> 非常ブレーキ<br><kbd>Enter 長押し</kbd> 警笛　<kbd>Esc</kbd> 一時停止</p><p>扉は自動です。停止位置±3m以内で3秒停止すると戸開、15秒乗降後に合図音→戸閉音の順に再生し、最後まで鳴ってから戸閉灯が点きます。最初の駅は戸開で開始します。</p><p>停止位置±10mで右端のひし形が上から下へ動きます。残り5m以内はcm表示。5m以上行き過ぎて停止すると、停止位置の0cmに補正します。</p><p>運転士音声は駅の手前300mで「駅名、停車。停止位置と両数」、戸閉灯の点灯後に「戸閉、点」「出発進行」が順に鳴り、発車すると「出発駅名、定発」が続きます。出発の喚呼はこの試作での発車扱いに合わせています。</p><small>停車アシストはブレーキを補助します。通常のドア開閉ではノッチは変わりません。207系はP6、323系は抑速を備えます。</small>`);}
function dataDialog(){showModal(`<p class="eyebrow">ROUTE & VEHICLE</p><h2>8路線の運転乗務。</h2><p>奥羽本線（山形線）福島〜新庄：福島〜米沢は提供BVE、米沢〜新庄はOpenStreetMap。719系5000番台の提供運転台・走行音・性能表を使用。外観は提供0番台の構造を流用しています。</p><p>山手線 / E235系 · 中央線 / E233系0番台<br>大阪環状線 / 323系 · 東海道線 / 207系2000番台<br>東北本線 / 701系1500番台 · 野岩鉄道 / 6050型<br>東方鉄道線 / 6050型・211系（提供地図と駅間距離から作成した架空路線）</p><p>東方鉄道線は提供地図と駅間距離から作成した架空路線です。東方本線・人里線・センター支線で6050型と211系を選べます。</p><p>野岩鉄道は提供BVEデータの新藤原〜会津高原尾瀬口を再現。線形、勾配、ホーム、トンネル・橋、明示された速度制限、車内放送を読み込みます。山や林は景観用の近似です。</p><p>線路の曲がり方はOpenStreetMap、駅間距離は公開駅一覧を使用。4路線のホーム・並走線は地図やJRの構内図を参照し、電車でGO！FINALの映像で見え方を照合しました。建物・停止目標は試作上の概略です。シナリオの運転区間はFINALの公開プレイ記録を参照し、現在の車両で各駅に停まります。</p><p>中央線・大阪環状線は位置を確認できた信号機を描画します。FINALを参考にした4路線の速度上限は車両性能の設定です。ゲームの実データとは区別しています。</p><p>E235系は提供データの15両設定を参考に、山手線用の11両・起動加速度3.0km/h/sを試作設定。E233系は提供12両、323系8両、207系7両です。力行は提供の速度別引張力表を補間し、常用制動・抵抗は簡易モデルです。</p><p>E235系は提供データの起動時モーター音、E233系は三菱IGBTの力行・制動モーター音を使用します。発車合図には東北本線と共通のホイッスルを使います。4路線の運転士喚呼にはFINALの路線別音声を使います。</p><small class="credits-note"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors / ODbL</a> · <a href="./assets/final/route-data-notes.md" target="_blank">路線の出典・検証</a> · <a href="./assets/final/scenario-notes.md" target="_blank">シナリオの出典</a> · <a href="./assets/final/expansion-v82-notes.md" target="_blank">追加路線・ダイヤの出典</a></small>`);}
$('driveSettings').onclick=settingsDialog;
function setNotch(n){if(replaySession)return;if(mode!=='drive'||paused||run.finished)return;const c=controlsFor(recipe());run.notch=clamp(n,c.min,c.max);}
$('brakeButton').onclick=()=>setNotch(run.notch-1);$('powerButton').onclick=()=>setNotch(run.notch+1);$('neutralButton').onclick=()=>setNotch(0);$('ebButton').onclick=()=>setNotch(controlsFor(recipe()).min);bindHornButton($('hornButton'),pressed=>sound?.setHorn(pressed&&!paused&&!run?.finished));
function toggleExtras(show){$('extras').hidden=!show;$('moreButton').setAttribute('aria-expanded',String(show));}
$('moreButton').onclick=()=>toggleExtras($('extras').hidden);$('closeExtras').onclick=()=>toggleExtras(false);
function setViewMode(value,manual=false){if(manual&&loading)return;viewMode=normalizedView(value);panorama=viewMode!==0;$('cab').hidden=panorama;$('viewButton').textContent='視点：'+VIEW_LABELS[viewMode];if(manual&&replaySession)replaySession.viewOverride=viewMode;}
$('viewButton').onclick=()=>{setViewMode((viewMode+1)%4,true);toggleExtras(false);};
function cycleReplayView(){if(!replaySession)return;const current=replaySession.viewOverride;replaySession.viewOverride=current===null?0:current===3?null:current+1;setViewMode(replayViewMode(run,replaySession.viewOverride));const button=document.querySelector('[data-replay-view]');if(button)button.textContent='視点：'+(replaySession.viewOverride===null?'記録視点':VIEW_LABELS[viewMode]);}

$('assistButton').onclick=()=>{assist=!assist;$('assistButton').textContent='停車アシスト '+(assist?'ON':'OFF');if(run)run.assistBraking=false;toast(assist?'停車アシストを有効にしました。':'停車アシストを解除しました。');toggleExtras(false);};
$('pauseButton').onclick=()=>showPause();

async function cleanup(){onboard?.stop();onboard=null;await recorder?.flush();recorder=null;replaySession=null;document.body.classList.remove('replaying');document.querySelector('.replay-controls')?.remove();score.dispose();
 token++;
 crossingAudio?.dispose();crossingAudio=null;
 sound?.stop();
 panel?.dispose();
 panel=null;
 world?.dispose();
 world=null;
 await sound?.dispose().catch(()=>{});
 sound=null;
 activeRoute=null;
}
async function returnMenu(){settlePoints();playMenuSound('cancel');if($('modal').open)$('modal').close();modalPaused=false;paused=true;setMode('menu');toggleExtras(false);await cleanup();run=null;chosenVehicle=null;chosenRoute=null;displayMenu();}
$('menuButton').onclick=returnMenu;
async function effect(name){return sound?.playEffect(name)??false;}
async function closeSequence(generation){
 if(!run||generation!==token)return;
 const activeRun=run,r=route(),stationIndex=activeRun.startingDeparture?activeRun.startIndex:activeRun.next,attempt=beginDoorClosing(activeRun,stationIndex);
 if(!attempt)return;
 const current=()=>run===activeRun&&generation===token&&isDoorClosing(activeRun,attempt);
 try{
  const departureKey=activeRun.startingDeparture&&r.stations[activeRun.startIndex].departureSound;
  if(departureKey){await sound.playRouteAnnouncement(r.stations[activeRun.startIndex].announcementRouteId??r.id,departureKey);if(!current())return;}
  await sound.playStationDeparture(r.stations[stationIndex],current);if(!current())return;
  if(!omeOnboardFile(r,r.stations[stationIndex]))await effect('whistle');if(!current())return;
  activeRun.doorPhase='closing';const completed=await effect('close');
  if(!current()||!completed)return;
  if(!finishStop(activeRun,r,attempt.stationIndex)){activeRun.doorPhase='audio-error';toast('停車位置を確認できません。戸開状態を維持します。',10);return;}
  syncFormation(r);
  sound.playEffect('relayOn').catch(()=>{});
  toast(activeRun.finished?'全区間の運転を完了しました。':`戸閉よし。次は${r.stations[activeRun.next].name}。`,5);
  if(activeRun.finished){paused=true;pauseAfterArrivalVoice();showResults();}else{sound.departureStationName=r.stations[attempt.stationIndex]?.name??null;sound.callDriver('doorsClosed','departure');}
 }catch(error){if(!current())return;activeRun.doorPhase='audio-error';$('audioRetry').hidden=false;toast('戸閉音を再生できませんでした。「その他」から再試行できます。',9999);}
}
function syncFormation(r){
 const count=formationCount(r,run,recipe().playableSpecs.carCount);
 if(run.carCount===count)return;run.carCount=count;r.carCount=count;world.route.carCount=count;
 world.playerTrain?.setCount(count);
 if(sound?.recipe?.playableSpecs)sound.recipe={...sound.recipe,playableSpecs:{...sound.recipe.playableSpecs,carCount:count}};
}
function updateDriverCalls(){
 if(run.finished||run.doors||obasuteShunting(run))return;
 const r=route();
 if(r.soundEvents?.length){
  for(let event=r.soundEvents[run.soundCursor];event&&event.s<=run.s;event=r.soundEvents[++run.soundCursor]){
   if(event.action==='play')sound.callRouteAnnouncement(event.routeId??r.id,event.key);
  }
  if(!sound.driverRouteLine)return;
 }
 const departedFrom=takeDepartureCall(run);
 if(departedFrom!==null){
  const station=r.stations[departedFrom];
  sound.callStation('departure',station);
 }
 if(run.v<=.01)return;
 const station=r.stations[run.next],distance=station.s-run.s;
 if(run.lastCalledStop!==run.next&&distance>=0&&distance<=300){
  run.lastCalledStop=run.next;
  sound.currentCarCount=run.carCount;sound.callStation('approach',station);
 }
 const block=nextSignalCall(r.signals??[],run.s,run.calledSignals??=new Set());
 if(block!==null)sound.callRouteCue('signal',block);
}
$('audioRetry').onclick=()=>{$('audioRetry').hidden=true;closeSequence(token);};
function updateDoors(dt){if(!obasuteDoorReady(run))return;if(advanceTerminalOpening(run,route().stations[run.endIndex].s,dt)){paused=true;pauseAfterArrivalVoice();showResults();return;}if(run.doorPhase==='opening-terminal')return;if(run.finished||run.doorPhase==='audio-error')return;const st=route().stations[run.next];if(!run.doors){if(run.v<=.01&&Math.abs(st.s-run.s)<=3){run.stopWait+=dt;run.doorPhase='waiting-open';if(run.stopWait>=3){run.v=0;run.doors=true;if(!replaySession)progress.recordStop(run.dutyKey,route().stations[run.startIndex].s,st.s,run);run.doorPhase='boarding';run.dwell=0;const opening=effect('open');if(run.next===run.endIndex)beginTerminalOpening(run,opening);else opening.catch(()=>{});effect('relayOff').catch(()=>{});}}else{run.stopWait=0;run.doorPhase=null;}}else if(run.doorPhase==='boarding'){run.dwell+=dt;if(run.dwell>=15&&yaganBoardingReady(run,route())&&scheduledBoardingDelay(run,route())<=0)closeSequence(token);}}
// Roads, mapped buildings, station wiring and parallel tracks are only needed
// once a run starts. Loading them for every route made the menu slow to open.
let onboard=null;
const assetLoads=new Map(),CONNECTING_ROUTES=new Set(['chuo-nagano','tatsuno-nagano','chuo-itsukaichi','chuo-ome','chuo-oito','suwa-nagano']);
function hydrateRoute(route){if(!route||route.assetsReady)return Promise.resolve(route);if(!assetLoads.has(route))assetLoads.set(route,loadRoadAsset(route).then(full=>{Object.assign(route,full,{assetsReady:true});return route;}).catch(error=>{assetLoads.delete(route);throw error;}));return assetLoads.get(route);}
async function ensureRouteAssets(){const base=selectedRoute();if(!base||base.assetsReady)return;
 if(!CONNECTING_ROUTES.has(base.id)){await hydrateRoute(base);return;}
 const parts=new Map([...extraRoutes].filter(([id])=>!CONNECTING_ROUTES.has(id)));await Promise.all([...parts.values()].map(hydrateRoute));
 for(const [id,r] of buildConnectingRoutes(parts)){r.assetsReady=true;extraRoutes.set(id,r);}chosenRoute=extraRoutes.get(base.id)??chosenRoute;}
async function start(startIndex){
 if(loading||!recipes)return;
 if(cheats.admin)wallet.unlockAll();if(!wallet.isUnlocked(currentDutyKey())){showScenarioPurchase();return;}
 const meta=META[selected];
 const scenario=selectedScenario();
 const freeStart=Number($('startStation').value);
 loading=true;paused=true;
 const controlsToLock=document.querySelectorAll('#menuControls button,#menuControls select,#routeCards button');
 controlsToLock.forEach(element=>element.disabled=true);
 $('startDrive').textContent='運転台と音を準備中…';
 let nextSound;
 try{
  await Promise.all([driveIntro.begin(),ensureRouteAssets()]);
  if(mode==='menu')playMenuSound('confirm');
  const trip=scenarioJourney(makeServiceRoute(selectedRoute(),recipe().id,chosenService,chosenOption),scenario);
  if(!trip)throw Error('運転できるシナリオ区間を確認できません');if(!scenario&&detailEndIndex!==null)trip.endIndex=detailEndIndex;
  const r=trip.route,train=recipe(),pack=train.id==='701'?{}:packs.get(train.id);
  startIndex??=scenario?trip.startIndex:freeStart;
  if(!pack)throw Error('車両の運転台と収録音が見つかりません');
  nextSound=new (train.id==='701'?TohokuAudio:LocalTrainAudio)(train,pack,{volume:1,mix:audioMix,context:menuEffects?.context});
  nextSound.configureDriverRoute(r,meta.id);
  const audioEnabled=nextSound.resume();
  await cleanup();
  activeRoute=r;
  sound=nextSound;
  recordReplayAudio(sound,()=>recorder,()=>run);
  const [loadedPanel]=await Promise.all([generatedCab&&['e235','e233','323','207','6050','701'].includes(train.id)?GeneratedCab.load($('cab'),train.id):train.id==='701'?CabPanel.load($('cab')):LocalCabPanel.load($('cab'),train,pack),sound.prepare(),audioEnabled]);
  panel=loadedPanel;
  crossingAudio=new CrossingAudio(sound,r);await crossingAudio.ready;
  run=createJourney(r,train,startIndex,trip.endIndex);run.carCount=formationCount(r,run,train.playableSpecs.carCount);r.carLengthM=train.playableSpecs.carLengthM??r.carLengthM??20;onboard=null;OnboardBroadcast.create(sound,r,train.id,chosenService).then(o=>{if(!o||activeRoute!==r)return;onboard=o;o.preload(r,run.startIndex,run.endIndex);}).catch(()=>{});run.rewardId=globalThis.crypto?.randomUUID?.()??Date.now()+':'+Math.random();run.weather=weatherType(settings.weather);run.dutyKey=currentDutyKey();run.requiredStops=trip.endIndex-startIndex;run.obasuteCarLength=train.playableSpecs.carCount*20;cheats.reset();score.reset(run);score.bindHorn(sound,()=>run,()=>scoreHazards(route()));
  if(r.soundEvents?.length){
   const first=r.soundEvents.findIndex(event=>event.s>=run.s);
   run.soundCursor=first<0?r.soundEvents.length:first;
  }
  run.scoreVehicleSpec=routePlanningSpec(r,yaganPlanningSpec(r,osakaPlanningSpec(r,{...train.playableSpecs,maxSpeedKmh:Math.min(train.playableSpecs.maxSpeedKmh,r.serviceSpeedKmh??Infinity),powerNotches:controlsFor(train).max,powerForceRows:train.performance?.power?.force?.rows})));
  const schedule=resolveScoreSchedule(r,run.s,run.scoreVehicleSpec);
  run.clockStart=schedule.clockStart;
  run.scoreVehicleSpec=schedule.planningSpec;
  run.scoreTimetable=schedule.timetable.filter(st=>st.s<=r.stations[run.endIndex].s+.5);
  r.color=meta.color;
  r.carCount=run.carCount;
  r.eyeHeight=Number(train.playableSpecs.viewpoint?.y??2.7);
  if(r.id==='yagan')r.eyeOffset=Number(train.playableSpecs.viewpoint.x);
  world=new FinalWorld($('world'),r,{quality:settings.quality,drawDistance:settings.drawDistance});
  world.setCabView(panel.viewOrigin);world.setPlayerTrain(train.id,run?.carCount??train.playableSpecs.carCount);
  setViewMode(3);
  paused=true;
  modalPaused=false;
  setMode('drive');$('driveScreen').inert=true;$('driveControls').inert=true;
  const controls=controlsFor(train);
  $('notchStrip').innerHTML=controls.labels.map((label,i)=>`<button data-notch="${i-controls.neutral}" aria-label="ノッチ ${label}">${label}</button>`).join('');
  $('notchStrip').querySelectorAll('button').forEach(button=>button.onclick=()=>setNotch(Number(button.dataset.notch)));
  $('driveScreen').querySelector('.hud-route span').textContent=chosenService;
  $('hudRoute').textContent=scenario?`${meta.name} · ${r.stations[trip.endIndex].name}行`:meta.name;
  $('vehicleLimit').textContent=`車両上限 ${train.playableSpecs.maxSpeedKmh} km/h`;
  $('mapQuality').textContent=r.geometryQuality??(r.soundEvents?.length?'提供BVE路線データ':'地図を参考にした試作');
  $('mapAttribution').hidden=obasuteServing(r)?false:!!r.soundEvents?.length&&!r.osmSections;$('obasuteCredit')?.remove();if(world.obasute.info){const credit=document.createElement('span');credit.id='obasuteCredit';credit.textContent=' · 地理院標高タイル / OSM農地・建物 · ';$('mapAttribution').append(credit);}
  $('viewButton').textContent='視点：沿線撮影';
  $('audioRetry').hidden=true;
  $('hornButton').hidden=!sound.effectRef('hornPrimary');
  toast(`${r.stations[startIndex].name}で戸開中。合図音の後に自動で戸閉します。`,8);
  recorder=new DutyRecorder({lineId:meta.id,lineName:meta.name,trainId:train.id,trainName:train.name,from:r.stations[startIndex].name,to:r.stations[run.endIndex].name,route:structuredClone(r),train:structuredClone(train),timetable:structuredClone(run.scoreTimetable)});recorder.capture(run);
  await Promise.all([world.playerTrain.ready,world.obasute.ready]);
  await driveIntro.reveal(meta.english);
  setViewMode(0);driveIntro.finish();paused=false;
  if(r.publishedSchedule){run.doorPhase='boarding';run.dwell=0;}else closeSequence(token);
 }catch(error){
  if(nextSound&&nextSound!==sound)await nextSound.dispose().catch(()=>{});
  await cleanup();
  setMode('menu');
  showModal('<h2>運転を開始できませんでした</h2><p id="startError"></p>');
  $('startError').textContent=error.message;
 }finally{
  driveIntro.finish();$('driveScreen').inert=false;$('driveControls').inert=false;
  loading=false;
  controlsToLock.forEach(element=>element.disabled=false);
  refreshScenarioAccess();
 }
}
$('startDrive').onclick=()=>start();$('retryButton').onclick=()=>{const index=Math.max(run.startIndex,run.next-1);toggleExtras(false);start(index);};
function showResults(){const credit=settlePoints();if(!replaySession){progress.complete(run.dutyKey,route().stations[run.startIndex].s,route().stations[run.endIndex].s,run);refreshClears();}recorder?.capture(run,score.engine.points,score.engine.chain);recorder?.flush();const errors=run.errors.map(x=>Math.abs(x)),mean=errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:0;showModal(`<p class="eyebrow">DRIVER'S WORK COMPLETE</p><h2>乗務、おつかれさま。</h2><p>${score.engine.points} points · ${score.engine.chain} chain<br>獲得 +${credit} points · 所持 ${wallet.balance} points<br>${META[selected].name} · ${recipe().name}<br>停車 ${run.served}駅 / 通過 ${run.missed}駅<br>平均停止誤差 ${distanceLabel(mean)}</p><div class="dialog-buttons"><button id="resultMenu" class="start-button">路線選択へ</button></div>`,{pause:false});$('resultMenu').onclick=returnMenu;}
function hud(){updateWeatherStatus($('driveScreen'),run);{const lr=route(),end=lr.stations[run.endIndex]?.s??Infinity;lookahead.update(run.s,changesFromSections(lr.limits),lr.signals??[],[...stationMarks(lr.stations,lr.sceneryStations),...checkpointMarks(run.scoreCheckpoints,run),...hornMarks(scoreHazards(lr),score.engine.done)].filter(x=>x.s<=end+1&&(!x.stop||x.s>=(lr.stations[Math.min(run.next,run.endIndex)]?.s??0)-2)));}const r=route(),next=r.stations[Math.min(run.next,run.endIndex)],d=next.s-run.s,notch=notchLabel(recipe(),run.notch),speed=Math.round(run.v*3.6),door=run.doorPhase==='closing'?'戸閉中':run.doors?'戸開':'戸閉';fitStationName($('hudNext'),next.name);if(recipe().id==='e131')$('hudNextKind').textContent=`次の停車駅 · ${recipe().playableSpecs.carCount===6?6:3}両停止位置`;$('hudDistance').textContent=run.finished?'運転完了':`${d<0?'超過 ':'あと '}${distanceLabel(d)}`;$('hudSpeed').textContent=speed;$('nativeSpeed').textContent=speed;$('hudNotch').textContent=notch;$('hudNotch').parentElement.dataset.kind=notch==='EB'?'eb':run.notch<0?'brake':run.notch>0?'power':'neutral';$('nativeNotch').textContent=notch;$('hudDoors').textContent=door;$('hudGrade').textContent=gradeLabel(world.grade(run.s));$('nativeDoor').textContent=door;$('nativeNext').textContent=next.name;$('nativeDistance').textContent=(d<0?'超過 ':'')+distanceLabel(d);$('closedLamp').classList.toggle('lit',!run.doors);const t=run.clockStart+Math.floor(run.elapsed);$('hudTime').textContent=[Math.floor(t/3600)%24,Math.floor(t/60)%60,t%60].map(x=>String(x).padStart(2,'0')).join(':');$('hudScore').textContent=`停車 ${run.served} / ${run.endIndex-run.startIndex}`;$('speedBar').style.setProperty('--speed',speed/recipe().playableSpecs.maxSpeedKmh*100);const marker=stopPosition(d);$('stopDiamond').hidden=!marker.visible;$('stopGauge').classList.toggle('far',Math.abs(d)>150);$('stopDiamond').style.top=marker.percent+'%';$('stopGauge').setAttribute('aria-label',`停止位置±10メートルマーカー ${marker.text}`);$('notchStrip').querySelectorAll('button').forEach(b=>b.classList.toggle('active',Number(b.dataset.notch)===run.notch));
 const upcoming=Math.abs(d)<=3?next:(r.sceneryStations??r.stations).find(station=>station.s>run.s+2);
 if(upcoming&&!run.finished){
  const stops=r.stations.some(station=>Math.abs(station.s-upcoming.s)<.5);
  $('hudNext').textContent=upcoming.name;
  $('hudNextKind').textContent=stops?('次の停車駅'+(recipe().id==='e131'?` · ${recipe().playableSpecs.carCount===6?6:3}両停止位置`:'')):'次の駅 · 通過';
  $('hudDistance').textContent='あと '+distanceLabel(upcoming.s-run.s);
  $('nativeNext').textContent=upcoming.name+(stops?'':'（通過）');
  $('nativeDistance').textContent=distanceLabel(upcoming.s-run.s);
 }
 const limit=routeLimitAt(r,run.s);
 $('vehicleLimit').textContent=limit===null?'区間制限 解除':r.limits.some(x=>x.weather&&run.s>=x.sStart&&run.s<x.sEnd)&&limit===40?'徐行40 km/h':`区間制限 ${limit} km/h`;
 $('vehicleLimit').classList.toggle('overspeed',limit!==null&&speed>limit);
 $('eventText').textContent=run.correctedStopError!=null&&run.doorPhase==='waiting-open'?`オーバーラン ＋${distanceLabel(run.correctedStopError)}（判定済み）→ 0 cm に補正`:run.doorPhase==='waiting-open'?`停車確認 ${Math.min(3,Math.floor(run.stopWait))} / 3秒`:run.doorPhase==='boarding'?`乗降中　戸閉合図まで ${Math.max(0,Math.ceil(Math.max(15-run.dwell,yaganBoardingDelay(run,r),scheduledBoardingDelay(run,r))))}秒`:run.doorPhase==='announcement'?'合図音を再生中':run.doorPhase==='closing'?'戸閉中 · 音の終了後に戸閉灯が点灯':run.elapsed<toastUntil?toastText:`次の停車駅は ${next.name} です。`;
 updateObasuteControls();
 const controller=controlsFor(recipe());overlayControls.update({value:run.notch,min:controller.min,max:controller.max,labels:controller.labels,disabled:paused||run.finished});
}
function updateObasuteControls(){let box=$('obasuteControls');if(!box){box=document.createElement('div');box.id='obasuteControls';box.className='obasute-controls';box.innerHTML='<span></span><button data-direction="KeyB">B 後進</button><button data-direction="KeyF">F 前進</button>';$('driveScreen').append(box);box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(paused||replaySession)return;const message=obasuteDirection(run,b.dataset.direction);if(message)toast(message,6);});}box.hidden=!obasuteActive(run);if(box.hidden)return;box.querySelector('span').textContent=obasuteCaption(run);box.querySelectorAll('button').forEach(b=>b.disabled=paused||run.v>.01||!!replaySession);$('eventText').textContent=obasuteCaption(run);if(obasuteShunting(run)){$('hudNext').textContent='姨捨';$('hudNextKind').textContent='スイッチバック';const target=obasuteTarget(run);$('hudDistance').textContent=target===null?'停止して方向を切替':('あと '+distanceLabel(target-run.obasute.u));$('vehicleLimit').textContent=`構内 ${obasuteSpeedLimit(run)} km/h`;}}
function advance(dt){
 if(run.finished)return;
 const r=route(),train=recipe(),station=r.stations[run.next],previous={s:run.s,v:run.v,elapsed:run.elapsed};
 updateObasuteOperation(run,r);if(run.obasute?.phase==='head-in'&&run.lastCalledStop!==run.next){run.lastCalledStop=run.next;sound.currentCarCount=run.carCount;sound.callStation('approach',station);}
 if(obasuteShunting(run)){run.inTunnel=false;if(assist){const target=obasuteTarget(run),op=run.obasute;if(target!==null){const distance=Math.abs(target-op.u),limit=op.phase==='head-in'&&op.u>-450?Math.min(45/3.6,Math.sqrt((15/3.6)**2+1.2*(op.u+450))):15/3.6,desired=Math.min(limit,Math.sqrt(Math.max(0,distance-1)*.6));run.notch=run.v>desired?-4:run.v<desired-.3?Math.min(4,Math.max(1,run.notch)+(run.acceleration<.05?1:0)):0;}}advanceObasute(run,r,train,dt,driveStep,world.grade(run.s));cheats.clockStep(run,dt);return;}
 if(assist&&!run.doors)brakeAssist(run,r,train);
 run.inTunnel=Boolean(world.structureAt(run.s,'tunnel'));driveStep(run,train,dt,world.grade(run.s));cheats.clockStep(run,dt);onboard?.update(run,r);
 const overrun=detectStoppedOverrun(run,station.s,score.engine.cfg.blueTolerance);if(overrun)toast(`${station.name} オーバーラン ＋${distanceLabel(overrun.error)}`,8);
 score.update(run,{eb:controlsFor(train).min,...currentScoreRestriction(r,run.s),hazards:scoreHazards(r),vehicleSpec:run.scoreVehicleSpec??train.playableSpecs,routeLimits:r.limits,stations:run.scoreTimetable??scoringStations(r)},dt);
 const corrected=correctStoppedOverrun(run,station.s,score.engine.cfg.blueTolerance);
 reportTyphoon(run,r,previous,sound);
 for(const change of collectRestrictionReports(run,changesFromSections(r.limits),previous))(change.weather?sound.callSlowRestriction(40):sound.callRestriction(change.kmh));
 for(const report of collectStationReports(run,run.scoreTimetable,previous,station.s)){sound.callStationTiming(report.kind,report.station,report.error);run.lastTimingReport=report;}
 if(corrected!==null)return;
 if(run.next<run.endIndex&&run.s>=r.stations[run.next+1].s-150){
  toast(`${station.name}を通過しました。`);
  run.missed++;
  run.next++;
  run.stopWait=0;
  run.assistBraking=false;
 }
}
bindRouteKeys(document,{active:()=>!shellActive&&!!recipes&&mode==='menu'&&!trainSelectionOpen&&!$('modal').open&&!loading,choose,current:()=>selected,focusRoute:()=>document.querySelector('#routeCards [data-route="'+selected+'"]').focus({preventScroll:true}),open:openTrainSelection});
bindScreenKeys(document,{root:()=>trainDetails?.root,active:()=>trainSelectionOpen&&$('trainSelection').dataset.view==='details'&&!$('modal').open&&!loading,onBack:showTrainList,onSound:playMenuSound});
bindScreenKeys(document,{root:()=>$('modal'),active:()=>$('modal').open,onBack:closeModal,onSound:playMenuSound});
document.addEventListener('keydown',e=>{if(shellActive||loading)return;if(replaySession){if(e.code==='KeyV'){e.preventDefault();cycleReplayView();}if(e.code==='Escape'){e.preventDefault();$('pauseButton').click();}return;}if(mode==='menu'&&!trainSelectionOpen&&e.code==='Escape'){e.preventDefault();gameShell.showMain();return;}if((e.target.matches('input,select,textarea')&&e.target.id!=='notchSlider')||$('modal').open)return;if(mode==='menu'){if(trainSelectionOpen&&['ArrowUp','ArrowDown'].includes(e.code))return;if(e.code==='Escape'&&trainSelectionOpen){e.preventDefault();closeTrainSelection();return;}if(e.code==='ArrowUp'||e.code==='ArrowDown'){e.preventDefault();if(recipes)choose(selected+(e.code==='ArrowDown'?1:-1));}else if(e.code==='Enter'){if(e.target.closest('button,a')&&!e.target.closest('.route-card'))return;e.preventDefault();if(trainSelectionOpen){if($('trainSelection').dataset.view==='details')start();else showTrainDetails();}else openTrainSelection();}return;}if(e.code==='KeyV'){e.preventDefault();$('viewButton').click();return;}if(e.code==='Escape'){e.preventDefault();$('pauseButton').click();return;}if(e.code==='Enter'){e.preventDefault();if(!paused&&!e.repeat&&!run.finished)sound.setHorn(true);return;}if(paused||e.repeat)return;if(['KeyB','KeyF'].includes(e.code)){const message=obasuteDirection(run,e.code);if(message){e.preventDefault();toast(message,6);return;}}if(['KeyW','ArrowUp','KeyS','ArrowDown','ArrowLeft','Space'].includes(e.code))e.preventDefault();if(['KeyW','ArrowUp'].includes(e.code))setNotch(run.notch-1);else if(['KeyS','ArrowDown'].includes(e.code))setNotch(run.notch+1);else if(e.code==='ArrowLeft')setNotch(0);else if(e.code==='Space')setNotch(controlsFor(recipe()).min);else if(e.code==='KeyJ')effect('hornSecondary').catch(()=>{});});
document.addEventListener('keyup',e=>{if(e.code==='Enter'&&mode==='drive'&&!replaySession)sound?.setHorn(false);});
window.addEventListener('blur',()=>sound?.setHorn(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='drive'&&!paused&&!run.finished)$('pauseButton').click();});
let last=performance.now();
function frame(now){
 const dt=Math.min(.08,Math.max(0,(now-last)/1000));
 last=now;
 if(mode==='drive'&&world&&run){
  const r=route();
  if(!replaySession&&run.weather!==settings.weather){run.weather=weatherType(settings.weather);delete run.typhoonSection;delete run.typhoonAnnounced;run.wheelSlip=false;run.wheelSlide=false;run.wheelExcess=0;run.wheelDeficit=0;run.wheelSpeed=run.v;}
  if(replaySession){updateReplay(dt);if(run.carCount&&world.playerTrain.count!==run.carCount)world.playerTrain.setCount(run.carCount);}
  else if(!paused){
   cheats.speedStep(run,dt);
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
    sound.update(run.v*3.6,run.notch,dt,{doors:run.doors,surface,rollingIndex,motorSpeed:(run.wheelSpeed??run.v)*3.6,inTunnel:run.inTunnel});
   }
  }
  if(!replaySession||!Number.isFinite(run.doorVisual))updateDoorVisual(run,paused?0:dt);world.doorVisual=run.doorVisual;world.doorState=run;if(!replaySession){run.viewMode=viewMode;recorder?.capture(run,score.engine.points,score.engine.chain);}
  const reversing=obasuteActive(run)&&run.obasute.direction<0;$('cab').hidden=panorama||reversing;$('driveScreen').classList.toggle('switchback-window',reversing);
  hud();
  if(replaySession)replayHud();
  world.weather=weatherType(run.weather);world.render(run.s,run.v,paused?0:dt,{acceleration:run.acceleration,shake:settings.shake,panorama,outer:viewMode>=2,railfan:viewMode===3&&!reversing,windowView:reversing,clock:run.clockStart+run.elapsed});sound?.updatePassby(world,run.s,run.v,viewMode,paused);crossingAudio?.update(world,run.s,run.v,viewMode,paused,(world.playerTrain?.count??2)*20);
  if(!panorama&&!reversing)panel?.render(run,paused?0:dt,Boolean(world.structureAt(run.s,'tunnel'))||Boolean(r.night));
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
try {
 const routeLoads=META.map(async meta=>{
  if(meta.id==='tohoku')return loadTohokuRoute();
  const response=await fetch(`./assets/final/${meta.id}-route.json?v=104`);
  if(!response.ok)throw Error('路線データを読み込めません');
  return response.json();
 });
 [recipes,packs,...routes]=await Promise.all([loadVehicleRecipes(),loadBundledTrainPacks(),...routeLoads]);
 await integrateTobuVehicles(recipes,packs);
 $('routeCards').innerHTML=META.map((m,i)=>`<button class="route-card${m.card?' yagan-card':m.legacy?' tohoku-card':''}" data-route="${i}" data-line="${m.id}" style="--i:${i};--route-color:${m.color};--card-image:url(./assets/final/${m.card??m.id+'-route-button-v26.webp'})" aria-pressed="false"><span class="route-copy"><strong>${m.name}</strong><small>${m.english}</small><em>普通　${m.train}</em></span><span class="sun" aria-hidden="true">☀</span></button>`).join('');
 $('routeCards').querySelectorAll('button').forEach(button=>button.onclick=()=>{choose(Number(button.dataset.route));openTrainSelection();});
 routePages=mountRoutePages($('routeCards'),{choose,current:()=>selected,active:()=>!shellActive&&mode==='menu'&&!trainSelectionOpen&&!$('modal').open&&!loading});
 $('compactRoute').innerHTML=META.map((m,i)=>`<option value="${i}">${m.name} · ${m.train}</option>`).join('');
 $('compactRoute').onchange=event=>{choose(Number(event.target.value));openTrainSelection();};
 const additions=await Promise.all(['chuo-extended','shinonoi-extended','chuo-kofu','chuo-shinshu','shinonoi','oito','ome','ome-okutama','itsukaichi','tatsuno','toho-village','toho-center'].map(async id=>{
 const response=await fetch('./assets/final/'+id+'-route.json?v=104');
 if(response.ok)extraRoutes.set(id,await response.json());
}));
 for(const [id,r] of buildConnectingRoutes(extraRoutes))extraRoutes.set(id,r);
 const originalYagan=await loadRoadAsset(routes[META.findIndex(m=>m.id==='yagan')]);
 extraRoutes.set('yagan',originalYagan);
 const tobu=assembleTobuRoutes(await loadTobuRouteParts(),originalYagan);
 extraRoutes.set('tobu-aizu',tobu.main);extraRoutes.set('tobu-nikko',tobu.nikko);
 routes[META.findIndex(m=>m.id==='yagan')]=tobu.main;
 registerProgressCatalog();
 setupTrainSelection();
 displayMenu();
 const entry=new URLSearchParams(location.search);if(entry.get('drive')==='1'&&entry.get('route')==='tohoku'){gameShell.hide();if(entry.get('replay')==='1'){showModal('<h2>東北本線のリプレイ</h2><button id="resumeOldReplay">再生する</button>');$('resumeOldReplay').onclick=async()=>{closeModal();await playSavedReplay(await loadReplay());};}else{openTrainSelection();const choice=serviceChoices.tohoku.findIndex(x=>!!x[3]?.reverse===(entry.get('direction')==='reverse'));$('trainChoice').value=String(Math.max(0,choice));applyTrainChoice();detailEndIndex=Math.max(1,Math.min(23,Number(entry.get('end')??23)));$('startStation').value=String(Math.max(0,Math.min(detailEndIndex-1,Number(entry.get('station')??0))));showTrainDetails();}}
} catch(error){
 $('startDrive').disabled=true;
 showModal('<h2>データを読み込めませんでした</h2><p id="loadError"></p>');
 $('loadError').textContent=error.message;
}

function setupTrainSelection(){
 const overlay=document.createElement('section');
 overlay.id='trainSelection';overlay.setAttribute('role','region');overlay.hidden=true;overlay.setAttribute('aria-label','列車選択');
 overlay.innerHTML='<div class="selection-key-guide">↑↓ 列車　←→ 路線　Enter 決定　Esc 戻る</div><div class="selection-page-heading"><p>TRAIN SELECT</p><h2 id="selectionTitle">列車選択</h2><p>上下のボタン・スクロールで選択</p></div><div class="selection-wheel-column"><h3>乗務する列車</h3><select id="trainChoice" data-wheel="true" aria-label="乗務する列車"></select></div><div class="selection-settings-column"><div id="departureOptions"></div><p id="selectionNotes"></p></div><div class="selection-actions"><button id="selectionBack">◀ 路線選択に戻る</button><button id="trainDetailsNext">列車詳細・運転区間 ▶</button></div><div class="selection-line-controls"><button id="previousLine">◀ 前の路線</button><button id="nextLine">次の路線 ▶</button></div>';

 const photo=document.createElement('img');photo.className='menu-route-photo selection-photo';photo.alt='';photo.setAttribute('aria-hidden','true');overlay.prepend(photo);$('stage').append(overlay);
 for(const id of ['scenarioControl','startStationControl'])$('departureOptions').append($(id));
 trainDetails=mountTrainDetails(overlay,{onSound:playMenuSound,onBack:()=>showTrainList(),onRange:(from,to)=>{$('startStation').value=String(from);$('scenarioSelect').value='';detailEndIndex=to;}});trainDetails.root.querySelector('.detail-start-mount').append($('startDrive'));$('trainDetailsNext').onclick=showTrainDetails;$('previousLine').onclick=()=>switchSelectionLine(-1);$('nextLine').onclick=()=>switchSelectionLine(1);
 $('trainChoice').wheel=mountWheelPicker($('trainChoice'));
 bindTrainSelectionKeys(document,{active:()=>trainSelectionOpen&&!loading&&$('trainSelection').dataset.view==='list'&&!$('modal').open,previous:()=>$('trainChoice').wheel.step(-1),next:()=>$('trainChoice').wheel.step(1),previousLine:()=>switchSelectionLine(-1),nextLine:()=>switchSelectionLine(1),details:showTrainDetails,back:closeTrainSelection});
 for(const id of ['startStation','scenarioSelect']){$(id).dataset.wheel='true';const previous=$(id).nextElementSibling;if(previous?.classList.contains('game-select'))previous.remove();$(id).wheel=mountWheelPicker($(id));}
 overlay.addEventListener('keydown',event=>{if(event.code==='Escape'){event.preventDefault();event.stopPropagation();if(!trainDetails.root.hidden)showTrainList();else closeTrainSelection();}else if(trainDetails.root.hidden&&['ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();event.stopPropagation();switchSelectionLine(event.code==='ArrowLeft'?-1:1);}});
 $('selectionBack').onclick=closeTrainSelection;
 $('trainChoice').onchange=()=>{playMenuSound('cursor');applyTrainChoice();};
}
function applyTrainChoice(){
 const choices=serviceChoices[META[selected].id];
 const [routeId,vehicle,service,option]=choices[Number($('trainChoice').value)];
 chosenOption=option;chosenVehicle=vehicle;chosenService=service;detailEndIndex=null;
 chosenRoute=extraRoutes.get(routeId)??routes[selected];
 const playable=makeServiceRoute(chosenRoute,vehicle,service,option);
 $('startStation').replaceChildren(...playable.stations.slice(0,-1).map((station,index)=>new Option(station.name,String(index))));
 $('scenarioSelect').value='';
 $('scenarioControl').hidden=routeId!==META[selected].id||service!=='普通';
 $('startStationControl').hidden=false;
 $('selectionNotes').textContent=vehicle==='681'?'681系の性能表・警笛は提供フォルダ内に揃っていないため、加速度は仮設定です。':vehicle==='223-1000'?'外部参照の操作音10件は提供フォルダ内にありません。':rNote(chosenRoute);
 $('selectionTitle').textContent=META[selected].english;document.querySelector('.selection-page-heading>p:last-child').textContent=META[selected].name+' · 列車・ダイヤを選択';
}
function openTrainSelection(){
 if(loading||!recipes)return;
 playMenuSound('confirm');
 const choices=serviceChoices[META[selected].id];
 setMenuPhoto(META[selected].id);
 $('trainChoice').replaceChildren(...choices.map(([routeId,vehicle,service,option],index)=>{
  const train=vehicle==='701'?TOHOKU_TRAIN:recipes.trains.find(t=>t.id===vehicle);
  const r=makeServiceRoute(extraRoutes.get(routeId)??routes[selected],vehicle,service,option);
  const element=new Option((train?.name??vehicle)+' · '+service+' · '+r.name+' · '+r.stations[0].name+' → '+r.stations.at(-1).name,String(index));Object.assign(element.dataset,{train:train?.name??vehicle,service:(!wallet.isUnlocked(serviceKey(META[selected].id,choices[index]))?'🔒 1000points · ':'')+service+(option.carCount?` · ${option.carCount}両`:'')+((option.reverse||r.reverseDirection)?' / 逆方向':' / 順方向')+(option.night?'・夜':''),range:r.stations[0].name+' → '+r.stations.at(-1).name,photo:vehiclePhoto(vehicle,META[selected].id),index:String(index+1),locked:String(!wallet.isUnlocked(serviceKey(META[selected].id,choices[index]))),progress:String(progress.fraction(serviceKey(META[selected].id,choices[index]),r.stations[0].s,r.stations.at(-1).s)),cleared:String(progress.cleared(serviceKey(META[selected].id,choices[index]),r.stations[0].s,r.stations.at(-1).s))});return element;
 }));
 showTrainList();trainSelectionOpen=true;$('menuScreen').hidden=true;$('menuControls').hidden=true;$('menuScreen').inert=true;$('menuControls').inert=true;document.body.dataset.mode='selection';applyTrainChoice();$('trainSelection').hidden=false;fit();$('trainChoice').wheel.sync();$('trainChoice').wheel.focus();
}
function closeTrainSelection(){
 if(loading)return;
 playMenuSound('cancel');document.body.dataset.mode='menu';$('menuScreen').hidden=false;$('menuControls').hidden=false;trainSelectionOpen=false;$('menuScreen').inert=false;$('menuControls').inert=false;$('trainSelection').hidden=true;chosenVehicle=null;chosenRoute=null;displayMenu();fit();
}

function rNote(r){if(obasuteServing(r))return '姨捨：普通列車はスイッチバック。停止中に B 後進 / F 前進で切替。後進中は車窓視点。';if(r.id==='yamagata')return '福島〜米沢：提供BVE / 米沢〜新庄：OSM。719系5000番台の運転台・音・性能は提供データ、外観は0番台モデルによる近似です。';return r.geometrySections?'BVE収録区間を地図の線路で接続した運転コースです。':r.id.startsWith('shinonoi')?'姨捨：普通列車はスイッチバック。停止中に B 後進 / F 前進で切替。後進中は車窓視点。':'';}

function switchSelectionLine(delta){choose((selected+delta+META.length)%META.length);openTrainSelection();}
function showTrainList(){if(!trainDetails)return;trainDetails.hide();$('trainSelection').dataset.view='list';detailEndIndex=null;$('trainChoice')?.wheel?.focus();}
function showTrainDetails(){
 if(loading||!recipes)return;playMenuSound('confirm');const base=makeServiceRoute(selectedRoute(),recipe().id,chosenService,chosenOption),ranges=scenarioRanges(META[selected].id,base,chosenOption?.reverse).map(range=>({...range,progress:progress.fraction(currentDutyKey(),base.stations[range.start].s,base.stations[range.end].s),cleared:progress.cleared(currentDutyKey(),base.stations[range.start].s,base.stations[range.end].s)}));
 $('trainSelection').dataset.view='details';trainDetails.show({route:base,train:recipe(),service:chosenService,line:META[selected].id,ranges,fraction:(a,b)=>progress.fraction(currentDutyKey(),base.stations[a].s,base.stations[b].s),isCleared:(a,b)=>progress.cleared(currentDutyKey(),base.stations[a].s,base.stations[b].s),start:Number($('startStation').value),end:detailEndIndex??base.stations.length-1});refreshScenarioAccess();
}

addEventListener('pagehide',()=>recorder?.flush());
async function playSavedReplay(data){
 if(!data?.samples?.length)return;
 if(data.legacy){const base=routes.find(r=>r.id==='tohoku'),option=serviceChoices.tohoku.find(x=>!!x[3]?.reverse===(data.direction==='reverse'))?.[3];const r=makeServiceRoute(base,'701','普通',option);data={...data,legacy:false,route:r,train:TOHOKU_TRAIN,timetable:data.timetable,samples:data.samples.map(x=>({...x,startIndex:x.startIndex??data.startIndex,endIndex:x.endIndex??data.endIndex,clockStart:x.clockStart??28800,errors:[]}))};}
 try{
  await cleanup();selected=Math.max(0,META.findIndex(x=>x.id===data.lineId));chosenVehicle=data.trainId;chosenOption=null;
  activeRoute=structuredClone(data.route);const train=data.train,pack=train.id==='701'?{}:packs.get(train.id);if(!pack)throw Error('リプレイの車両素材がありません');
  sound=new (train.id==='701'?TohokuAudio:LocalTrainAudio)(train,pack,{volume:1,mix:audioMix,context:menuEffects?.context});sound.configureDriverRoute(activeRoute,data.lineId);
  [panel]=await Promise.all([train.id==='701'?CabPanel.load($('cab')):LocalCabPanel.load($('cab'),train,pack),sound.prepare(),sound.resume()]);
  world=new FinalWorld($('world'),activeRoute,{quality:settings.quality,drawDistance:settings.drawDistance});world.setCabView(panel.viewOrigin);world.setPlayerTrain(train.id,run?.carCount??train.playableSpecs.carCount);viewMode=0;crossingAudio=new CrossingAudio(sound,activeRoute);await Promise.all([crossingAudio.ready,world.obasute.ready,world.playerTrain.ready]);
  run=replayStateAt(data.samples,data.samples[0].elapsed);run.scoreTimetable=data.timetable??resolveScoreSchedule(activeRoute,run.s,osakaPlanningSpec(activeRoute,train.playableSpecs)).timetable;score.reset(run);
  replaySession={data,time:run.elapsed,speed:1,eventCursor:0,viewOverride:null};paused=false;panorama=false;setMode('drive');document.body.classList.add('replaying');setViewMode(replayViewMode(run));
  $('vehicleLimit').textContent='リプレイ · '+data.trainName;$('hudRoute').textContent=data.lineName;
  const bar=document.createElement('div');bar.className='replay-controls';bar.innerHTML='<label>REPLAY</label><button data-replay-pause>一時停止</button><button data-replay-speed>×1</button><button data-replay-view>視点：記録視点</button><button data-replay-exit>再生終了</button><input aria-label="再生位置" type="range" min="'+data.samples[0].elapsed+'" max="'+data.samples.at(-1).elapsed+'" step="0.1">';$('driveScreen').append(bar);
  bar.querySelector('[data-replay-view]').onclick=cycleReplayView;bar.querySelector('[data-replay-pause]').onclick=()=>{paused=!paused;pauseAudio(paused);bar.querySelector('[data-replay-pause]').textContent=paused?'再生':'一時停止';};bar.querySelector('[data-replay-speed]').onclick=e=>{replaySession.speed=replaySession.speed===1?2:replaySession.speed===2?.5:1;e.target.textContent='×'+replaySession.speed;};bar.querySelector('[data-replay-exit]').onclick=async()=>{await returnMenu();gameShell.showMain();};bar.querySelector('input').oninput=e=>{replaySession.time=Number(e.target.value);replaySession.eventCursor=(replaySession.data.events??[]).findIndex(event=>event.time>=replaySession.time);if(replaySession.eventCursor<0)replaySession.eventCursor=(replaySession.data.events??[]).length;sound.setHorn(false);updateReplay(0);};
 }catch(error){await returnMenu();gameShell.showMain();showModal('<h2>リプレイを再生できませんでした</h2><p id="replayError"></p>');$('replayError').textContent=error.message;}
}
function updateReplay(dt){const r=replaySession;if(!r)return;if(!paused)r.time=Math.min(r.data.samples.at(-1).elapsed,r.time+dt*r.speed);if(!paused&&dt>0){const events=r.data.events??[];while(r.eventCursor<events.length&&events[r.eventCursor].time<=r.time){const event=events[r.eventCursor++];const fn=sound[event.method];if(typeof fn==='function')Promise.resolve(fn.apply(sound,event.args)).catch(()=>{});}}const timetable=run.scoreTimetable;Object.assign(run,replayStateAt(r.data.samples,r.time));run.scoreTimetable=timetable;setViewMode(replayViewMode(run,r.viewOverride));sound.update(run.v*3.6,run.notch,paused?0:dt,{doors:run.doors,motorSpeed:(run.wheelSpeed??run.v)*3.6,inTunnel:run.inTunnel,surface:world.structureAt(run.s,'tunnel')?'tunnel':'long'});const slider=document.querySelector('.replay-controls input');if(slider)slider.value=String(r.time);if(r.time>=r.data.samples.at(-1).elapsed){if(!paused)pauseAudio(true);paused=true;document.querySelector('[data-replay-pause]').textContent='再生終了';}}
function replayHud(){const badge=document.querySelector('.score-hud');badge.querySelector('.points-number').textContent=run.points;badge.querySelector('.chain-number').textContent=run.chain;const format=n=>[Math.floor(n/3600)%24,Math.floor(n/60)%60,Math.floor(n)%60].map(x=>String(x).padStart(2,'0')).join(':');document.querySelector('.score-clock-now b').textContent=format(run.clockStart+run.elapsed);const st=run.scoreTimetable?.find(st=>st.s>run.s),row=document.querySelector('.score-clock-next');row.querySelector('small').textContent=st?.stop?'停車予定':'通過予定';row.querySelector('span').textContent=st?.name??'';row.querySelector('b').textContent=st?format(st.time):'—';}

function currentDutyKey(){return serviceKey(META[selected].id,serviceChoices[META[selected].id][Number($('trainChoice')?.value??0)]);}
function registerProgressCatalog(){const entries=[];for(const [line,choices]of Object.entries(serviceChoices))for(const choice of choices){const raw=extraRoutes.get(choice[0])??routes[META.findIndex(x=>x.id===choice[0])];if(!raw)continue;const r=makeServiceRoute(raw,...choice.slice(1));for(const range of scenarioRanges(line,r,choice[3]?.reverse))entries.push({key:serviceKey(line,choice),from:r.stations[range.start].s,to:r.stations[range.end].s,line,label:choice[2]+' '+range.label});}progress.register(entries);wallet.register(Object.entries(serviceChoices).map(([line,choices])=>serviceKey(line,choices[0])),entries.map(e=>e.key));if(cheats.admin)wallet.unlockAll();}
function refreshClears(){if(!recipes)return;document.querySelectorAll('#routeCards button').forEach((button,i)=>{const entries=progress.catalog.filter(e=>e.line===META[i].id);button.classList.toggle('scenario-cleared',entries.length>0&&entries.every(e=>progress.cleared(e.key,e.from,e.to)));});}
function showPause(force=false){if(paused&&!force)return;const available=cheats.available&&!replaySession;showModal('<p class="eyebrow">PAUSED</p><h2>ひと休み。</h2><p>運転と音声を一時停止しています。</p><div class="dialog-buttons"><button id="resumeButton" class="start-button">運転を再開</button><button id="pauseMenuButton">路線選択へ</button>'+(available?'<button id="cheatToggle">チート '+(cheats.enabled?'ON':'OFF')+'</button><button id="jumpStationButton" '+(!cheats.enabled?'disabled':'')+'>駅を選んで移動</button>':'')+'</div>'+(available?'<p>W：速度アップ　S：速度ダウン<br>T：時刻停止　R：時刻を遅くする<br>チートを使った乗務はクリア記録の対象外です。</p>':'<small>シナリオクリア '+progress.count+' / '+progress.catalog.length+'</small>'));$('resumeButton').onclick=closeModal;$('pauseMenuButton').onclick=returnMenu;if(available){$('cheatToggle').onclick=()=>{cheats.toggle();showPause(true);};$('jumpStationButton').onclick=showStationJump;}}
function showStationJump(){if(!cheats.enabled)return;const stations=run.scoreTimetable.filter(st=>st.s>=route().stations[run.startIndex].s&&st.s<=route().stations[run.endIndex].s);showModal('<h2>駅を選んで移動</h2><div class="station-jump-list">'+stations.map((st,i)=>'<button data-jump="'+i+'">'+st.name+'　'+(st.stop?'停車':'通過')+'</button>').join('')+'</div><button id="jumpBack">ひと休みに戻る</button>');$('jumpBack').onclick=()=>showPause(true);$('modalContent').querySelectorAll('[data-jump]').forEach(button=>button.onclick=()=>{const target=stations[Number(button.dataset.jump)];token++;sound.stop();jumpToStation(run,target,route().stations,routeLimitAt(route(),target.s),recipe().playableSpecs.maxSpeedKmh);run.soundCursor=(route().soundEvents??[]).findIndex(event=>event.s>=run.s);if(run.soundCursor<0)run.soundCursor=(route().soundEvents??[]).length;world.suspension.reset?.();const points=score.engine.points,chain=score.engine.chain;score.reset(run);score.engine.points=points;score.engine.chain=chain;closeModal();toast(target.name+'へ移動しました。',5);});}

function settlePoints(){if(!run||replaySession)return 0;return wallet.settle(run.rewardId,score.engine.points,!run.cheatUsed&&!cheats.enabled);}
function refreshScenarioAccess(){if(!recipes)return;const unlocked=wallet.isUnlocked(currentDutyKey());const button=$('startDrive');if(button&&!loading)button.textContent=unlocked?'▶ 運転をはじめる':'🔒 1000pointsで解放';let badge=$('walletBalance');if(!badge&&$('trainSelection')){badge=document.createElement('div');badge.id='walletBalance';badge.style.cssText='position:absolute;right:55px;top:80px;color:#ffe167;font-size:24px;z-index:10';$('trainSelection').append(badge);}const options=$('trainChoice')?.options;if(options){for(const [index,option]of Array.from(options).entries()){const key=serviceKey(META[selected].id,serviceChoices[META[selected].id][index]);if(wallet.isUnlocked(key)){option.dataset.service=option.dataset.service?.replace('🔒 1000points · ','')??'';option.dataset.locked='false';}}$('trainChoice').wheel?.sync();}if(badge)badge.textContent='所持 '+wallet.balance+' points'+(cheats.admin?' · 全解放':'');}
function showScenarioPurchase(){const key=currentDutyKey(),enough=wallet.balance>=SCENARIO_PRICE;showModal('<h2>シナリオを解放</h2><p>'+recipe().name+' · '+chosenService+'</p><p>1000pointsで解放すると、以後いつでも運転できます。<br>所持 '+wallet.balance+' points</p>'+(enough?'':'<p>各路線のシナリオ1は無料です。乗務でpointsを貯めてください。</p>')+'<div class="dialog-buttons"><button id="buyScenario" '+(enough?'':'disabled')+'>1000pointsで解放</button><button id="cancelPurchase">戻る</button></div>');$('cancelPurchase').onclick=closeModal;$('buyScenario').onclick=()=>{if(wallet.purchase(key)){closeModal();refreshScenarioAccess();playMenuSound('confirm');}};}
