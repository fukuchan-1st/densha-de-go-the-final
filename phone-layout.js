// Keep the picture at 16:9 and reserve an unscaled touch rail on phones.
export function phoneGeometry(width,height,touch,driving=false){
 const phone=touch&&Math.min(width,height)<600,portrait=phone&&height>=width;
 const rail=phone&&!portrait&&driving?76:0;
 const w=width-rail,scale=Math.min(w/1600,height/900);
 return {phone,portrait,rail,game:{left:(w-1600*scale)/2,top:(height-900*scale)/2,width:1600*scale,height:900*scale}};
}
export function mountPhoneLayout({controller,home,driving,onResize=()=>{}}){
 const prompt=document.createElement('section');prompt.id='rotatePrompt';prompt.hidden=true;prompt.setAttribute('role','status');
 prompt.innerHTML='<div class="rotate-phone" aria-hidden="true">↻</div><h1>端末を横向きにしてね</h1><p>横画面にすると、メニューと運転画面が表示されます。</p>';
 const rail=document.createElement('aside');rail.id='phoneMascon';rail.hidden=true;rail.setAttribute('aria-label','マスコン操作');document.body.append(prompt,rail);
 const media=matchMedia('(any-pointer:coarse)');
 function sync(){
  const vv=visualViewport,g=phoneGeometry(vv?.width??innerWidth,vv?.height??innerHeight,media.matches||Math.max(vv?.width??innerWidth,vv?.height??innerHeight)<=1000,driving());
  document.body.classList.toggle('phone-game',g.phone);document.body.classList.toggle('rotate-needed',g.portrait);
  document.documentElement.style.setProperty('--phone-rail',g.rail+'px');prompt.hidden=!g.portrait;
  const detached=g.phone&&driving()&&!g.portrait;rail.hidden=!detached;
  if(detached){if(controller.parentElement!==rail)rail.append(controller);}else if(controller.parentElement!==home)home.append(controller);
  return g;
 }
 const changed=()=>{sync();onResize();};addEventListener('resize',changed);visualViewport?.addEventListener('resize',changed);media.addEventListener?.('change',changed);
 new MutationObserver(changed).observe(document.body,{attributes:true,attributeFilter:['data-mode','data-sim-mode']});sync();return {sync};
}
