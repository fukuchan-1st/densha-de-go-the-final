export function spatialNext(items,current,direction){
 if(!items.length)return -1;if(current<0)return 0;const a=items[current],horizontal=direction==='ArrowLeft'||direction==='ArrowRight',sign=['ArrowLeft','ArrowUp'].includes(direction)?-1:1;
 let best=-1,cost=Infinity;items.forEach((b,i)=>{if(i===current)return;const dx=b.x-a.x,dy=b.y-a.y,forward=(horizontal?dx:dy)*sign,side=Math.abs(horizontal?dy:dx);if(forward<2)return;const score=forward+side*3;if(score<cost){best=i;cost=score;}});return best<0?current:best;
}
export function bindScreenKeys(document,{root,active,onBack,onSound=()=>{}}){
 document.addEventListener('keydown',event=>{if(!active()||event.altKey||event.ctrlKey||event.metaKey)return;const surface=root();if(!surface)return;const target=event.target;
  if(target.closest?.('.game-select')&&(event.code!=='Escape'||!target.closest('.game-select').querySelector('.game-select-options')?.hidden))return;
  if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();onBack();return;}
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(event.code))return;
  if(target.matches?.('input[type=range]')&&['ArrowLeft','ArrowRight'].includes(event.code))return;
  const controls=[...surface.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type=hidden])')].filter(el=>el.getClientRects().length&&!el.closest('[hidden],[inert]')&&getComputedStyle(el).visibility!=='hidden');
  const index=controls.indexOf(target);event.preventDefault();event.stopImmediatePropagation();
  if(event.repeat&&event.code==='Enter')return;
  if(event.code==='Enter'&&index>=0&&target.tagName==='BUTTON'){target.click();return;}
  const items=controls.map(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});const next=event.code==='Enter'?(index+1)%controls.length:spatialNext(items,index,event.code);const el=controls[next];if(el){el.focus({preventScroll:true});if(el.closest('.detail-ranges'))el.scrollIntoView({block:'nearest',inline:'nearest'});onSound('cursor');}
 },true);
}
export function bindRouteKeys(document,{active,choose,current,focusRoute,settings,focusSettings,open}){
 let option=false;document.addEventListener('keydown',event=>{if(!active()||event.altKey||event.ctrlKey||event.metaKey)return;
 const code=event.code;if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','KeyO','F1','Escape'].includes(code))return;event.preventDefault();event.stopImmediatePropagation();
 if(code==='KeyO'||code==='F1'){settings();return;}
 if(code==='ArrowLeft'||code==='ArrowRight'){option=event.target.id!=='settingsButton';option?focusSettings():focusRoute();return;}
 if(code==='ArrowUp'||code==='ArrowDown'){option=false;choose(current()+(code==='ArrowDown'?1:-1));focusRoute();return;}
 if(code==='Escape'){option=false;document.getElementById('routeMainMenu')?.click();return;}if(code==='Enter'){if(event.repeat)return;if(event.target.id==='settingsButton')settings();else open();}
 },true);
}
