export function wheelVisibleIndices(selected,count){if(!count)return [null,null,null];if(count===1)return [null,0,null];return [(selected-1+count)%count,selected,(selected+1)%count];}
export function mountWheelPicker(select){
 select.hidden=true;select.dataset.wheel='true';const root=document.createElement('div');root.className='wheel-picker';root.setAttribute('role','group');root.setAttribute('aria-label',select.getAttribute('aria-label')??'列車を選択');
 root.innerHTML='<button type="button" class="wheel-up" aria-label="前の項目">▲</button><div class="wheel-list"></div><button type="button" class="wheel-down" aria-label="次の項目">▼</button>';
 select.after(root);const list=root.querySelector('.wheel-list');let lastWheel=-Infinity,touchY=null;
 function choose(index,focus=false){const count=select.options.length;if(!count||select.disabled)return;index=(index%count+count)%count;const option=select.options[index];if(option.disabled)return;if(select.selectedIndex!==index){select.selectedIndex=index;select.dispatchEvent(new Event('change',{bubbles:true}));}sync();if(focus)list.children[1]?.focus({preventScroll:true});}
 function sync(){
  const slots=wheelVisibleIndices(Math.max(0,select.selectedIndex),select.options.length);
  list.replaceChildren(...slots.map((index,slot)=>{const button=document.createElement('button');button.type='button';button.className=slot===1?'active':'';button.setAttribute('aria-current',slot===1?'true':'false');if(index===null){button.disabled=true;button.classList.add('wheel-empty');button.setAttribute('aria-hidden','true');}else{const option=select.options[index];button.textContent=option.textContent;button.disabled=select.disabled||option.disabled;button.onclick=()=>choose(index);}return button;}));
  root.querySelector('.wheel-up').disabled=select.disabled||select.options.length<2;root.querySelector('.wheel-down').disabled=select.disabled||select.options.length<2;
 }
 root.querySelector('.wheel-up').onclick=()=>choose(select.selectedIndex-1);root.querySelector('.wheel-down').onclick=()=>choose(select.selectedIndex+1);
 root.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(event.code))return;event.preventDefault();event.stopPropagation();choose(event.code==='Home'?0:event.code==='End'?select.options.length-1:select.selectedIndex+(event.code==='ArrowDown'?1:-1),true);});
 list.addEventListener('wheel',event=>{event.preventDefault();if(Math.abs(event.deltaY)<2)return;const now=performance.now();if(now-lastWheel<150)return;lastWheel=now;choose(select.selectedIndex+(event.deltaY>0?1:-1));},{passive:false});
 list.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchY=event.clientY;});
 list.addEventListener('pointerup',event=>{if(touchY===null)return;const delta=touchY-event.clientY;touchY=null;if(Math.abs(delta)>24){event.preventDefault();choose(select.selectedIndex+(delta>0?1:-1));}});
 list.addEventListener('pointercancel',()=>touchY=null);
 select.addEventListener('change',sync);new MutationObserver(sync).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});sync();return {root,sync,focus(){list.children[1]?.focus({preventScroll:true});}};
}
