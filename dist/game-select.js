// Keep the data-backed native select for existing logic; render game buttons only.
export function installGameSelectors(){
 const controls=new Map();
 function refresh(){
  for(const select of document.querySelectorAll('#trainSelection select,#menuControls select,dialog select,#mobileMenuPanel select,.start-selector select')){
   if(select.dataset.wheel==='true')continue;
   let ui=controls.get(select);
   if(!ui){
    const root=document.createElement('div');root.className='game-select';const button=document.createElement('button');button.type='button';button.className='game-select-current';button.setAttribute('aria-expanded','false');
    const options=document.createElement('div');options.className='game-select-options';options.hidden=true;options.setAttribute('role','group');root.append(button,options);select.after(root);select.hidden=true;select.setAttribute('aria-hidden','true');
    button.onclick=()=>{const show=options.hidden;for(const item of controls.values()){item.options.hidden=true;item.button.setAttribute('aria-expanded','false');}if(show){const box=root.getBoundingClientRect(),stage=root.closest('#stage,#simulator'),bounds=stage?.getBoundingClientRect()??{top:0,bottom:innerHeight},scale=stage?bounds.height/900:1,below=bounds.bottom-box.bottom,above=box.top-bounds.top,up=below<150*scale&&above>below;options.style.top=up?'auto':'calc(100% + 6px)';options.style.bottom=up?'calc(100% + 6px)':'auto';options.style.maxHeight=Math.max(80,Math.min(310,(up?above:below)/scale-18))+'px';}options.hidden=!show;button.setAttribute('aria-expanded',String(show));};
    root.addEventListener('keydown',event=>{if(event.code==='Escape'&&!options.hidden){event.stopPropagation();options.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}});
    ui={root,button,options,signature:''};controls.set(select,ui);
   }
   const label=select.getAttribute('aria-label')??select.parentElement.querySelector('label')?.textContent??select.parentElement.firstChild?.textContent??'選択';
   const selected=select.selectedOptions[0]?.textContent??'選択';
   if(ui.button.textContent!==selected+'　▶')ui.button.textContent=selected+'　▶';ui.button.setAttribute('aria-label',label.trim()+': '+selected);if(ui.button.disabled!==select.disabled)ui.button.disabled=select.disabled;
   const signature=[...select.options].map(o=>o.value+'|'+o.textContent+'|'+o.disabled).join(';')+'|'+select.value;
   if(signature!==ui.signature){ui.signature=signature;ui.options.replaceChildren(...[...select.options].map(option=>{const choice=document.createElement('button');choice.type='button';choice.textContent=option.textContent;choice.disabled=option.disabled;choice.className=option.selected?'chosen':'';choice.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));ui.options.hidden=true;ui.button.setAttribute('aria-expanded','false');refresh();ui.button.focus();};return choice;}));}
  }
 }
 new MutationObserver(()=>refresh()).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});
 document.addEventListener('change',refresh);document.addEventListener('pointerdown',event=>{if(!event.target.closest('.game-select'))for(const ui of controls.values()){ui.options.hidden=true;ui.button.setAttribute('aria-expanded','false');}});refresh();
}
installGameSelectors();
