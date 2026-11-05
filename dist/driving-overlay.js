export function notchKeyValue(code,value,min,max){
 const delta=['ArrowUp','ArrowLeft','KeyW'].includes(code)?-1:['ArrowDown','ArrowRight','KeyS'].includes(code)?1:0;
 if(delta)return Math.max(min,Math.min(max,value+delta));
 if(code==='KeyX')return 0;
 if(['Space','Home'].includes(code))return min;
 if(code==='End')return max;
 return null;
}
export function mountDrivingOverlay(parent,{onChange,actions=[],instructionElement,readouts=false}={}){
 const root=document.createElement('section');root.className='driving-overlay';root.setAttribute('aria-label','運転操作');
 root.innerHTML='<div class="overlay-controller"><div class="overlay-guidance"><small>運転指示</small></div><div class="overlay-slider-panel"><div class="overlay-slider-heading"><label for="notchSlider">マスコン</label><output id="sliderNotch">N</output><span>制動 ←　→ 力行</span></div><div class="overlay-slider-body"><input id="notchSlider" type="range" min="-9" max="5" step="1" value="0" aria-label="マスコンのノッチ" aria-orientation="vertical"><div class="overlay-notch-labels" aria-hidden="true"></div></div></div></div><nav class="overlay-actions" aria-label="運転補助"></nav>';
 const instruction=instructionElement??document.createElement('div');instruction.classList.add('overlay-instruction');instruction.setAttribute('role','status');root.querySelector('.overlay-guidance').append(instruction);
 for(const action of actions)root.querySelector('.overlay-actions').append(action);
 const slider=root.querySelector('input'),output=root.querySelector('output'),ticks=root.querySelector('.overlay-notch-labels');
 if(readouts){const speed=document.createElement('div');speed.className='overlay-speed';speed.innerHTML='<small>速度</small><strong>0</strong><span>km/h</span><p></p>';const notch=document.createElement('div');notch.className='overlay-state';notch.innerHTML='<b>N</b><span>戸閉</span><i></i>';root.append(speed,notch);}
 parent.append(root);let signature='',labels=[];
 slider.addEventListener('input',()=>onChange?.(Number(slider.value)));
 slider.addEventListener('keydown',event=>{const next=notchKeyValue(event.code,Number(slider.value),Number(slider.min),Number(slider.max));if(next===null)return;event.preventDefault();event.stopPropagation();if(event.repeat||slider.disabled)return;slider.value=String(next);onChange?.(next);});
 return {root,slider,update(state){
  const key=state.labels.join('|');if(signature!==key){signature=key;labels=state.labels;slider.min=String(state.min);slider.max=String(state.max);ticks.replaceChildren(...labels.map(label=>{const span=document.createElement('span');span.textContent=label;return span;}));}
  slider.value=String(state.value);slider.disabled=Boolean(state.disabled);const label=labels[state.value-state.min]??'N';slider.setAttribute('aria-valuetext',label);output.textContent=label;root.style.setProperty('--notch-position',(state.value-state.min)/(state.max-state.min)*100+'%');root.style.setProperty('--neutral-position',-state.min/(state.max-state.min)*100+'%');
  if(state.instruction!==undefined)instruction.textContent=state.instruction;
  if(readouts){root.querySelector('.overlay-speed strong').textContent=state.speed;root.querySelector('.overlay-speed p').textContent=state.limit;root.querySelector('.overlay-state b').textContent=label;root.querySelector('.overlay-state span').textContent=state.door;root.querySelector('.overlay-state i').classList.toggle('lit',state.door==='戸閉');}
 }};
}
