import {FinalWorld} from './final-world.js?v=26';
import {MenuArt} from './final-art.js?v=26';
import {loadVehicleRecipes,loadBundledTrainPacks,LocalCabPanel,LocalTrainAudio} from './final-vehicle.js?v=26';
import {clamp,controlsFor,notchLabel,createJourney,driveStep,brakeAssist,distanceLabel,stopPosition,finishStop} from './final-model.js?v=26';
import {STATIONS as TOHOKU_STATIONS} from './route-data.js?v=26';

const TOHOKU_TRAIN={id:'701',name:'701系1500番台',playableSpecs:{carCount:2}};
const $=id=>document.getElementById(id),META=[
 {id:'yamanote',name:'山手線',english:'YAMANOTE LINE',vehicle:'e235',color:'#a2cf3d',summary:'東京 → 東京 · 外回り',train:'E235系',short:'E235'},
 {id:'chuo',name:'中央線',english:'CHUO LINE',vehicle:'e233',color:'#e98a38',summary:'東京 → 高尾 · 全駅停車',train:'E233系0番台',short:'E233'},
 {id:'osaka',name:'大阪環状線',english:'OSAKA LOOP LINE',vehicle:'323',color:'#e85248',trainColor:'#e57227',summary:'大阪 → 大阪 · 外回り',train:'323系',short:'323'},
 {id:'tokaido',name:'東海道線',english:'TOKAIDO LINE',vehicle:'207',color:'#5caddb',summary:'京都 → 神戸 · 各駅停車',train:'207系2000番台',short:'207'},
 {id:'tohoku',name:'東北本線',english:'TOHOKU MAIN LINE',vehicle:'701',color:'#78b888',summary:'黒磯 → 福島 · 各駅停車',train:'701系1500番台',short:'701',legacy:true}
];
let selected=new URLSearchParams(location.search).get('route')==='tohoku'?META.length-1:0,recipes,routes=[],world,panel,sound,run,mode='menu',paused=false,assist=false,panorama=false,token=0,loading=false,toastText='',toastUntil=0,modalPaused=false;
let packs=new Map();
const settings={volume:.65,shake:1,quality:matchMedia('(pointer:coarse)').matches?'light':'standard'};
try{const saved=JSON.parse(localStorage.getItem('railway-drive-settings')??'{}');if(Number.isFinite(saved.volume))settings.volume=clamp(saved.volume,0,1);if([0,.6,1].includes(saved.shake))settings.shake=saved.shake;if(['light','standard'].includes(saved.quality))settings.quality=saved.quality;}catch{}
const saveSettings=()=>{try{localStorage.setItem('railway-drive-settings',JSON.stringify(settings));}catch{}};
let menuArt;try{menuArt=new MenuArt($('menuArtwork'));}catch(e){$('menuArtwork').setAttribute('aria-label','車両イラストを表示できませんでした');}
function fit(){const r=$('stageArea').getBoundingClientRect(),scale=Math.min(r.width/1600,r.height/900);$('stage').style.left='50%';$('stage').style.top='50%';$('stage').style.transform=`translate(-50%,-50%) scale(${scale})`;}
addEventListener('resize',fit);visualViewport?.addEventListener('resize',fit);new ResizeObserver(fit).observe($('stageArea'));fit();
function recipe(){return META[selected].legacy?TOHOKU_TRAIN:recipes.trains.find(t=>t.id===META[selected].vehicle);}
function route(){return routes[selected];}
function toast(text,seconds=5){toastText=text;toastUntil=(run?.elapsed??0)+seconds;}
function displayMenu(){const meta=META[selected],r=routes[selected],train=recipe();document.documentElement.style.setProperty('--accent',meta.color);$('trainRoute').textContent=meta.english;$('trainName').innerHTML=`${meta.short}<span>系</span>`;$('formation').textContent=`${train.playableSpecs.carCount}両編成 · 各駅停車`;$('routeSummary').textContent=meta.summary;$('routeLength').textContent=`${(r.stations.at(-1).s/1000).toFixed(1)} km / ${r.stations.length-1}駅停車`;$('compactRoute').value=String(selected);document.querySelectorAll('.route-card').forEach((el,i)=>{el.classList.toggle('active',i===selected);el.setAttribute('aria-pressed',String(i===selected));});$('startStation').innerHTML=r.stations.slice(0,-1).map((st,i)=>`<option value="${i}">${st.name}</option>`).join('');const imported=meta.legacy||packs.has(train.id);$('assetBadge').textContent=imported?'運転台・収録音 内蔵':'車両素材を確認できません';$('assetBadge').classList.toggle('imported',imported);menuArt?.draw(meta);}
function choose(i){if(loading)return;selected=(i+META.length)%META.length;displayMenu();}
function setMode(value){mode=value;document.body.dataset.mode=value;$('menuScreen').hidden=value!=='menu';$('menuControls').hidden=value!=='menu';$('driveScreen').hidden=value!=='drive';$('driveControls').hidden=value!=='drive';fit();}
async function pauseAudio(value){await sound?.setPaused(value).catch(()=>{});}
function showModal(content,{pause=true}={}){if(mode==='drive'&&pause&&!paused){paused=true;modalPaused=true;pauseAudio(true);}$('modalContent').innerHTML=content;if(!$('modal').open)$('modal').showModal();}
function closeModal(){ $('modal').close();if(modalPaused&&!run?.finished){paused=false;pauseAudio(false);}modalPaused=false;}
$('closeModal').onclick=closeModal;$('modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
function settingsDialog(){showModal(`<p class="eyebrow">OPTION</p><h2>音と、乗り心地。</h2><label>音量 <input id="volumeInput" type="range" min="0" max="100" value="${Math.round(settings.volume*100)}"></label><label>走行中の揺れ<select id="shakeInput"><option value="0">なし</option><option value="0.6">弱め</option><option value="1">標準</option></select></label><label>描画<select id="qualityInput"><option value="light">軽量 · iPad / iPhone向け</option><option value="standard">標準 · PC向け</option></select></label><small>描画設定は次の運転開始時に反映します。揺れは停車後に収まり、一時停止中は止まります。</small><p>${META[selected].legacy?'東北本線の音量と揺れは、701系の画面で調整できます。':'アプリ内蔵の運転台と車両別の収録音を使用します。'}</p><div class="dialog-buttons"><button id="helpButton">操作方法</button><button id="dataButton">路線・車両について</button></div>`);$('shakeInput').value=String(settings.shake);$('qualityInput').value=settings.quality;$('volumeInput').oninput=e=>{settings.volume=Number(e.target.value)/100;sound?.setVolume(settings.volume);saveSettings();};$('shakeInput').onchange=e=>{settings.shake=Number(e.target.value);saveSettings();};$('qualityInput').onchange=e=>{settings.quality=e.target.value;saveSettings();};$('helpButton').onclick=helpDialog;$('dataButton').onclick=dataDialog;}
function helpDialog(){showModal(`<p class="eyebrow">DRIVING GUIDE</p><h2>一駅ずつ、確実に。</h2><p><kbd>S / ↓</kbd> P側へ　<kbd>W / ↑</kbd> EB側へ<br><kbd>X</kbd> 惰行　<kbd>Space</kbd> 非常ブレーキ<br><kbd>H</kbd> 警笛　<kbd>Esc</kbd> 一時停止</p><p>扉は自動です。停止位置±3m以内で3秒停止すると戸開、15秒乗降後に合図音→戸閉音の順に再生し、最後まで鳴ってから戸閉灯が点きます。最初の駅は戸開で開始します。</p><p>停止位置±10mで右端のひし形が上から下へ動きます。残り5m以内はcm表示。停止位置を35m過ぎると通過扱いになります。</p><small>停車アシストはブレーキを補助します。通常のドア開閉ではノッチは変わりません。207系はP6、323系は抑速を備えます。</small>`);}
function dataDialog(){showModal(`<p class="eyebrow">ROUTE & VEHICLE</p><h2>5路線、5車両。</h2><p>山手線 / E235系 · 中央線 / E233系0番台<br>大阪環状線 / 323系 · 東海道線 / 207系2000番台<br>東北本線 / 701系1500番台</p><p>線路の曲がり方はOpenStreetMap、駅間距離は公開駅一覧から作成した独自試作です。ホーム・建物・停止目標は概略です。電車でGO！FINALのマップ・モデル・音声を移植したものではありません。</p><p>勾配・標高・実際の線路速度制限は取得していません。新4路線は勾配0‰、速度表示の上限は車両性能の設定です。ゲームの実データとは区別しています。</p><p>E235系は提供データの15両設定を参考に、山手線用の11両・起動加速度3.0km/h/sを試作設定。E233系は提供12両、323系8両、207系7両です。力行は提供の速度別引張力表を補間し、常用制動・抵抗は簡易モデルです。</p><p>E235系は提供データの起動時モーター音、E233系は三菱IGBTの力行・制動モーター音を使用します。発車合図には東北本線と共通のホイッスルを使います。</p><small class="credits-note"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors / ODbL</a> · <a href="./assets/final/route-data-notes.md" target="_blank">路線の出典・検証</a></small>`);}
$('settingsButton').onclick=settingsDialog;
$('driveSettings').onclick=settingsDialog;
function setNotch(n){if(mode!=='drive'||paused||run.finished)return;const c=controlsFor(recipe());run.notch=clamp(n,c.min,c.max);}
$('brakeButton').onclick=()=>setNotch(run.notch-1);$('powerButton').onclick=()=>setNotch(run.notch+1);$('neutralButton').onclick=()=>setNotch(0);$('ebButton').onclick=()=>setNotch(controlsFor(recipe()).min);$('hornButton').onclick=()=>effect('hornPrimary').catch(()=>{});
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
}
async function returnMenu(){if($('modal').open)$('modal').close();modalPaused=false;paused=true;setMode('menu');toggleExtras(false);await cleanup();run=null;displayMenu();}
$('menuButton').onclick=returnMenu;
async function effect(name){return sound?.playEffect(name)??false;}
async function closeSequence(generation){if(!run||generation!==token)return;try{run.doorPhase='announcement';await effect('whistle');if(generation!==token)return;run.doorPhase='closing';const completed=await effect('close');if(generation!==token||!completed)return;finishStop(run,route());sound.playEffect('relayOn').catch(()=>{});toast(run.finished?'全区間の運転を完了しました。':`戸閉よし。次は${route().stations[run.next].name}。`,5);if(run.finished){paused=true;pauseAudio(true);showResults();}}catch(error){if(generation!==token)return;run.doorPhase='audio-error';$('audioRetry').hidden=false;toast('戸閉音を再生できませんでした。「その他」から再試行できます。',9999);}}
$('audioRetry').onclick=()=>{$('audioRetry').hidden=true;closeSequence(token);};
function updateDoors(dt){if(run.finished||run.doorPhase==='audio-error')return;const st=route().stations[run.next];if(!run.doors){if(run.v<=.01&&Math.abs(st.s-run.s)<=3){run.stopWait+=dt;run.doorPhase='waiting-open';if(run.stopWait>=3){run.v=0;run.doors=true;run.doorPhase='boarding';run.dwell=0;effect('open').catch(()=>{});effect('relayOff').catch(()=>{});}}else{run.stopWait=0;run.doorPhase=null;}}else if(run.doorPhase==='boarding'){run.dwell+=dt;if(run.dwell>=15)closeSequence(token);}}
async function start(startIndex=Number($('startStation').value)){
 if(loading||!recipes)return;
 const meta=META[selected];
 if(meta.legacy){location.href=`./tohoku.html?v=26&drive=1&station=${startIndex}`;return;}
 loading=true;
 const controlsToLock=document.querySelectorAll('#menuControls button,#menuControls select,#routeCards button');
 controlsToLock.forEach(element=>element.disabled=true);
 $('startDrive').textContent='運転台と音を準備中…';
 let nextSound;
 try{
  const r=route(),train=recipe(),pack=packs.get(train.id);
  if(!pack)throw Error('車両の運転台と収録音が見つかりません');
  nextSound=new LocalTrainAudio(train,pack,{volume:settings.volume});
  const audioEnabled=nextSound.resume();
  await cleanup();
  sound=nextSound;
  const [loadedPanel]=await Promise.all([LocalCabPanel.load($('cab'),train,pack),sound.prepare(),audioEnabled]);
  panel=loadedPanel;
  run=createJourney(r,train,startIndex);
  r.color=meta.color;
  r.carCount=train.playableSpecs.carCount;
  r.eyeHeight=Number(train.playableSpecs.viewpoint?.y??2.7);
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
  $('hudRoute').textContent=meta.name;
  $('vehicleLimit').textContent=`車両上限 ${train.playableSpecs.maxSpeedKmh} km/h`;
  $('viewButton').textContent='前面展望';
  $('audioRetry').hidden=true;
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
function hud(){const r=route(),next=r.stations[Math.min(run.next,r.stations.length-1)],d=next.s-run.s,notch=notchLabel(recipe(),run.notch),speed=Math.round(run.v*3.6),door=run.doorPhase==='closing'?'戸閉中':run.doors?'戸開':'戸閉';$('hudNext').textContent=next.name;$('hudDistance').textContent=run.finished?'運転完了':`${d<0?'超過 ':'あと '}${distanceLabel(d)}`;$('hudSpeed').textContent=speed;$('nativeSpeed').textContent=speed;$('hudNotch').textContent=notch;$('nativeNotch').textContent=notch;$('hudDoors').textContent=door;$('nativeDoor').textContent=door;$('nativeNext').textContent=next.name;$('nativeDistance').textContent=(d<0?'超過 ':'')+distanceLabel(d);$('closedLamp').classList.toggle('lit',!run.doors);const t=8*3600+Math.floor(run.elapsed);$('hudTime').textContent=[Math.floor(t/3600)%24,Math.floor(t/60)%60,t%60].map(x=>String(x).padStart(2,'0')).join(':');$('hudScore').textContent=`停車 ${run.served} / ${r.stations.length-1-run.startIndex}`;$('speedBar').style.setProperty('--speed',speed/recipe().playableSpecs.maxSpeedKmh*100);const marker=stopPosition(d);$('stopDiamond').hidden=!marker.visible;$('stopDiamond').style.top=marker.percent+'%';$('stopGauge').setAttribute('aria-label',`停止位置±10メートルマーカー ${marker.text}`);$('notchStrip').querySelectorAll('button').forEach(b=>b.classList.toggle('active',Number(b.dataset.notch)===run.notch));
 $('eventText').textContent=run.doorPhase==='waiting-open'?`停車確認 ${Math.min(3,Math.floor(run.stopWait))} / 3秒`:run.doorPhase==='boarding'?`乗降中　戸閉合図まで ${Math.max(0,Math.ceil(15-run.dwell))}秒`:run.doorPhase==='announcement'?'合図音を再生中':run.doorPhase==='closing'?'戸閉中 · 音の終了後に戸閉灯が点灯':run.elapsed<toastUntil?toastText:'';
}
function advance(dt){if(run.finished)return;const r=route(),train=recipe();if(assist&&!run.doors)brakeAssist(run,r,train);driveStep(run,train,dt,world.grade(run.s));if(run.s>r.stations[run.next].s+35){run.missed++;if(run.next===r.stations.length-1){run.v=0;paused=true;pauseAudio(true);showModal('<h2>終点の停止位置を過ぎました</h2><p>前の駅からもう一度チャレンジできます。</p><div class="dialog-buttons"><button id="missRetry">前駅から再開</button><button id="missMenu">路線選択へ</button></div>',{pause:false});$('missRetry').onclick=()=>{$('modal').close();start(Math.max(run.startIndex,run.next-1));};$('missMenu').onclick=returnMenu;}else{toast(`${r.stations[run.next].name}を通過しました。`);run.next++;run.stopWait=0;run.assistBraking=false;}}}
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||$('modal').open)return;if(mode==='menu'){if(e.code==='ArrowUp'||e.code==='ArrowDown'){e.preventDefault();if(recipes)choose(selected+(e.code==='ArrowDown'?1:-1));}else if(e.code==='Enter'){if(e.target.closest('button,a')&&!e.target.closest('.route-card'))return;e.preventDefault();start();}return;}if(e.code==='Escape'){e.preventDefault();$('pauseButton').click();return;}if(paused||e.repeat)return;if(['KeyW','ArrowUp','KeyS','ArrowDown','Space'].includes(e.code))e.preventDefault();if(['KeyW','ArrowUp'].includes(e.code))setNotch(run.notch-1);else if(['KeyS','ArrowDown'].includes(e.code))setNotch(run.notch+1);else if(e.code==='KeyX')setNotch(0);else if(e.code==='Space')setNotch(controlsFor(recipe()).min);else if(e.code==='KeyH')effect('hornPrimary').catch(()=>{});else if(e.code==='KeyJ')effect('hornSecondary').catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='drive'&&!paused&&!run.finished)$('pauseButton').click();});
let last=performance.now();function frame(now){const dt=Math.min(.08,Math.max(0,(now-last)/1000));last=now;if(mode==='drive'&&world&&run){if(!paused){let remaining=dt;while(remaining>0&&!paused){const step=Math.min(.02,remaining);advance(step);remaining-=step;}if(!paused){updateDoors(dt);sound.update(run.v*3.6,run.notch,dt,{doors:run.doors,surface:(route().structures??[]).some(t=>t.kind==='tunnel'&&run.s>=t.sStart&&run.s<=t.sEnd)?'tunnel':(route().structures??[]).some(t=>t.kind==='bridge'&&run.s>=t.sStart&&run.s<=t.sEnd)?'bridge':'long'});}}hud();world.render(run.s,run.v,paused?0:dt,{acceleration:run.acceleration,shake:settings.shake,panorama});if(!panorama)panel?.render(run,paused?0:dt,(route().structures??[]).some(t=>t.kind==='tunnel'&&run.s>=t.sStart&&run.s<=t.sEnd));}requestAnimationFrame(frame);}requestAnimationFrame(frame);
try {
 const routeLoads=META.map(async meta=>{
  if(meta.legacy)return {id:meta.id,stations:TOHOKU_STATIONS};
  const response=await fetch(`./assets/final/${meta.id}-route.json?v=26`);
  if(!response.ok)throw Error('路線データを読み込めません');
  return response.json();
 });
 [recipes,packs,...routes]=await Promise.all([loadVehicleRecipes(),loadBundledTrainPacks(),...routeLoads]);
 $('routeCards').innerHTML=META.map((m,i)=>`<button class="route-card${m.legacy?' tohoku-card':''}" data-route="${i}" style="--i:${i};--route-color:${m.color};--card-image:url(./assets/final/${m.id}-route-button-v25.png)" aria-pressed="false"><span class="route-copy"><strong>${m.name}</strong><small>${m.english}</small><em>普通　${m.train}</em></span><span class="sun" aria-hidden="true">☀</span></button>`).join('');
 $('routeCards').querySelectorAll('button').forEach(button=>button.onclick=()=>choose(Number(button.dataset.route)));
 $('compactRoute').innerHTML=META.map((m,i)=>`<option value="${i}">${m.name} · ${m.train}</option>`).join('');
 $('compactRoute').onchange=event=>choose(Number(event.target.value));
 displayMenu();
} catch(error){
 $('startDrive').disabled=true;
 showModal('<h2>データを読み込めませんでした</h2><p id="loadError"></p>');
 $('loadError').textContent=error.message;
}
