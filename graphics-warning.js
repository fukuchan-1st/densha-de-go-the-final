// High graphics is always an explicit choice, including on touch devices.
export function confirmHighGraphics(){
 if(document.querySelector('.graphics-warning'))return Promise.resolve(false);
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='graphics-warning';
  dialog.setAttribute('aria-labelledby','graphics-warning-title');dialog.setAttribute('aria-describedby','graphics-warning-description');
  dialog.innerHTML='<small>高性能PC向け</small><h2 id="graphics-warning-title">高画質モードを使いますか？</h2><p id="graphics-warning-description">柔らかな影・接地部分の濃淡・光のにじみを追加するため、描画の負荷が大きくなります。スマホやタブレット、性能の低いPCでは、動作が重くなったり、ブラウザーがクラッシュする可能性があります。</p><p>動作が重い場合は、オプションで通常表示・簡易表示に戻してください。</p><div><button data-cancel>やめる</button><button data-accept>高画質を使う</button></div>';
  const finish=value=>{window.removeEventListener('keydown',keys,true);dialog.close();dialog.remove();previous?.focus();resolve(value);};
  const keys=e=>{
   if(!['Escape','Enter','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))return;
   e.preventDefault();e.stopImmediatePropagation();
   if(e.code==='Escape'){finish(false);return;}
   if(e.repeat)return;
   if(e.code==='Enter'||e.code==='Space'){document.activeElement===dialog.querySelector('[data-accept]')?finish(true):finish(false);return;}
   const buttons=[...dialog.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[(index+1)%2].focus();
  };
  dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.querySelector('[data-accept]').onclick=()=>finish(true);
  dialog.oncancel=e=>{e.preventDefault();finish(false);};document.body.append(dialog);window.addEventListener('keydown',keys,true);dialog.showModal();dialog.querySelector('[data-cancel]').focus();
 });
}
