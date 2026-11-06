import {mountDrivingOverlay} from './driving-overlay.js?v=43';
import {NOTCH_LABELS,NOTCH_MIN} from './physics.js?v=23';
import {bindHornButton} from './assets/audio/held-horn.js';
import {responsiveLayout} from './responsive-layout.js?v=41';
export function mountResponsiveUI(){
 const $=id=>document.getElementById(id),deck=document.createElement('aside');deck.id='controlDeck';deck.hidden=true;deck.setAttribute('aria-label','運転操作');
 deck.innerHTML='<div class="deck-core"><div class="deck-status"><div class="deck-speed"><b id="deckSpeed">0</b><small>km/h</small><span id="deckLimit">制限 110</span></div><output id="deckNotch" aria-label="現在のノッチ">N</output><div class="deck-target"><small>次の駅</small><b id="deckNext">高久</b><span id="deckDistance">4,000 m</span><small id="deckDoor">戸閉</small></div></div><div class="deck-primary"></div><div class="deck-utility"></div><div class="deck-strip"></div><div class="deck-message"></div></div><div id="controlExtras" hidden><div class="extras-grid"></div><button id="closeControls" type="button">閉じる</button></div>';
 document.body.append(deck);
 const primary=deck.querySelector('.deck-primary'),utility=deck.querySelector('.deck-utility'),extras=deck.querySelector('.extras-grid');
 function slot(parent,button){const holder=document.createElement('div');holder.className='control-slot';holder.append(button);parent.append(holder);}
 for(const id of ['brakeDown','neutral','powerUp'])slot(primary,$(id));
 $('brakeDown').innerHTML='<b>− 制動</b><small>EB側へ</small>';$('neutral').innerHTML='<b>N</b><small>惰行</small>';$('powerUp').innerHTML='<b>力行 ＋</b><small>P5側へ</small>';
 $('emergency').innerHTML='<b>非常</b><small>EB</small>';slot(utility,$('emergency'));
 const horn=document.createElement('button');horn.type='button';horn.id='hornButton';horn.className='main-horn';horn.innerHTML='警笛<small>Enter</small>';slot(utility,horn);horn.parentElement.classList.add('main-horn-slot');
 $('pauseButton').textContent='Ⅱ 一時停止';slot(utility,$('pauseButton'));
 const more=document.createElement('button');more.id='moreControls';more.type='button';more.textContent='その他';more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls','controlExtras');slot(utility,more);
 deck.querySelector('.deck-strip').append($('notchStrip'));deck.querySelector('.deck-message').append($('operationStatus'));
 for(const id of ['menuButton','viewButton','assist','rate','retry','doors'])extras.append($(id));
 const extraHorn=document.createElement('button');extraHorn.type='button';extraHorn.className='extra-horn';extraHorn.textContent='警笛';extras.append(extraHorn);
 const airHorn=document.createElement('button');airHorn.type='button';airHorn.textContent='空気笛';airHorn.id='airHornButton';extras.append(airHorn);
 const closeExtras=()=>{$('controlExtras').hidden=true;more.setAttribute('aria-expanded','false');};more.onclick=()=>{const opened=$('controlExtras').hidden;$('controlExtras').hidden=!opened;more.setAttribute('aria-expanded',String(opened));};$('closeControls').onclick=closeExtras;
 for(const id of ['menuButton','viewButton','retry'])$(id).addEventListener('click',closeExtras);
 document.addEventListener('pointerdown',e=>{if(!$('controlExtras').hidden&&!deck.contains(e.target)&&!e.target.closest('#controlExtras,.overlay-actions'))closeExtras();});
 const overlay=mountDrivingOverlay($('drive'),{readouts:true,onChange:value=>api.onNotch?.(value),actions:[horn,$('pauseButton'),more]});$('drive').append($('controlExtras'));
 const menuPanel=document.createElement('aside');menuPanel.id='mobileMenuPanel';menuPanel.hidden=true;menuPanel.setAttribute('aria-label','運転メニュー');menuPanel.innerHTML='<div class="mobile-menu-heading"><b>東北本線</b><small id="mobileRoute">黒磯 → 福島 · 701系</small></div><div class="menu-station-mount"></div><div class="menu-nav-mount"></div><small class="orientation-tip">横向きにすると、前方が大きく見えるよ。</small>';document.body.append(menuPanel);
 const nav=document.querySelector('.menu-main nav'),navHome=nav.parentElement,selector=document.querySelector('.start-selector'),selectorHome=selector.parentElement;
 $('startStation').addEventListener('change',()=>{$('mobileRoute').textContent=$('startStation').selectedOptions[0].textContent.replace(/（.*?）/g,'')+' → 福島 · 701系';});
 const probe=document.createElement('div');probe.className='safe-area-probe';document.body.append(probe);
 let mode='menu',refit=()=>{};const media=matchMedia('(any-pointer: coarse)');
 function position(element,rect){if(!rect)return;for(const key of ['left','top','width','height'])element.style[key]=rect[key]+'px';}
 const api={onHorn:null,onNotch:null,setRefit(callback){refit=callback;},setMode(value){mode=value;closeExtras();refit();},layout(){
  const vv=window.visualViewport,style=getComputedStyle(probe),safe={left:parseFloat(style.paddingLeft)||0,right:parseFloat(style.paddingRight)||0,top:parseFloat(style.paddingTop)||0,bottom:parseFloat(style.paddingBottom)||0},count=[...nav.querySelectorAll('button')].filter(b=>!b.hidden).length;
  const layout=responsiveLayout(vv?.width??innerWidth,vv?.height??innerHeight,{touch:media.matches,mode,safe,menuHeight:126+count*52});const dx=vv?.offsetLeft??0,dy=vv?.offsetTop??0;
  for(const rect of [layout.game,layout.controls,layout.menu])if(rect){rect.left+=dx;rect.top+=dy;}
  document.body.dataset.deviceLayout=layout.kind;document.body.classList.toggle('phone-columns',layout.columns);document.body.classList.toggle('phone-portrait',layout.kind==='phone'&&!layout.landscape);document.body.classList.toggle('adaptive-menu',mode==='menu'&&layout.kind!=='desktop');document.body.dataset.simMode=mode;
  const adaptive=layout.kind!=='desktop';if(adaptive){menuPanel.querySelector('.menu-station-mount').append(selector);menuPanel.querySelector('.menu-nav-mount').append(nav);}else{selectorHome.append(selector);navHome.append(nav);}
  deck.hidden=mode!=='drive';menuPanel.hidden=mode!=='menu'||!adaptive;position(deck,layout.controls);position(menuPanel,layout.menu);return layout.game;
 },update(state){$('deckSpeed').textContent=state.speed;$('deckNotch').textContent=state.notch;$('deckNext').textContent=state.next;$('deckDistance').textContent=state.distance;$('deckDoor').textContent=state.door;$('deckLimit').textContent=state.limit;overlay.update({value:state.value,min:NOTCH_MIN,max:5,labels:NOTCH_LABELS,disabled:state.disabled,speed:state.speed,limit:state.limit,door:state.door,instruction:$('operationStatus').textContent||`次の停車駅は ${state.next} です。`});}};
 for(const button of [horn,extraHorn])bindHornButton(button,pressed=>api.onHorn?.(pressed,'hornPrimary'));
 bindHornButton(airHorn,pressed=>api.onHorn?.(pressed,'hornSecondary'));
 media.addEventListener?.('change',()=>refit());window.visualViewport?.addEventListener('resize',()=>refit());window.visualViewport?.addEventListener('scroll',()=>refit());addEventListener('orientationchange',()=>refit());
 return api;
}
