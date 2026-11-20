export const ROUTES_PER_PAGE=4;
export function routePage(index,count){return Math.min(Math.max(0,Math.ceil(count/ROUTES_PER_PAGE)-1),Math.max(0,Math.floor(index/ROUTES_PER_PAGE)));}
export function mountRoutePages(cards,{choose,current,active}){
 const bar=document.createElement('nav');bar.className='route-pagination';bar.setAttribute('aria-label','路線ページ');
 bar.innerHTML='<button type="button" class="route-page-prev">前の4路線</button><span class="route-page-status" aria-live="polite"></span><button type="button" class="route-page-next">次の4路線</button><small class="route-page-hint"></small>';
 cards.after(bar);const prev=bar.querySelector('.route-page-prev'),next=bar.querySelector('.route-page-next');
 const go=delta=>{const count=cards.children.length,page=routePage(current(),count),target=page+delta;if(target<0||target>=Math.ceil(count/4))return;choose(target*4);cards.querySelector('[data-route="'+current()+'"]')?.focus({preventScroll:true});};
 prev.onclick=()=>go(-1);next.onclick=()=>go(1);
 document.addEventListener('keydown',e=>{if(!active()||!['PageDown','PageUp'].includes(e.code))return;e.preventDefault();e.stopImmediatePropagation();go(e.code==='PageDown'?1:-1);},true);
 return {sync(){const buttons=[...cards.children],count=buttons.length,page=routePage(current(),count),pages=Math.ceil(count/4);buttons.forEach((button,index)=>{button.hidden=Math.floor(index/4)!==page;button.style.setProperty('--i',String(index%4));button.style.setProperty('--route-number','"'+String(index+1).padStart(2,'0')+'"');});cards.dataset.page=String(page+1);prev.disabled=page===0;next.disabled=page===pages-1;bar.querySelector('.route-page-status').textContent=`${page+1} / ${pages} ページ`;bar.querySelector('.route-page-hint').textContent=page<pages-1?'下にも4路線あります　↓ / PageDown で次のページ':'上に4路線あります　↑ / PageUp で前のページ';}};
}
