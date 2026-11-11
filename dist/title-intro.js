// Reveal immediately; audio follows the completed picture and respects browser autoplay policy.
export function startTitleIntro({image,button,onCall,onStart,onEnter,duration=1900}){
 let cancelled=false,ready=false,requested=false,played=false,playing=false,started=false,raf=0;
 const canvas=document.createElement('canvas');canvas.width=1050;canvas.height=640;canvas.className='shell-logo title-mosaic';canvas.setAttribute('aria-hidden','true');image.before(canvas);image.style.opacity='0';
 const ctx=canvas.getContext('2d'),small=document.createElement('canvas'),sample=small.getContext('2d');
 function next(){if(requested&&played&&!cancelled&&!started){started=true;onStart();}}
 async function call(){if(cancelled||!ready||playing||played){next();return;}playing=true;const ok=await onCall();playing=false;if(cancelled)return;if(ok){played=true;button.textContent='PRESS ENTER / TOUCH TO START';next();}else button.textContent='ENTER / タップでタイトルコールを再生';}
 const begin=()=>{if(cancelled)return;let start;const draw=now=>{if(cancelled)return;start??=now;const p=Math.min(1,(now-start)/duration),ease=1-(1-p)**3,columns=Math.max(12,Math.round(12+1038*p**2.8));small.width=columns;small.height=Math.max(1,Math.round(columns*image.naturalHeight/image.naturalWidth));sample.clearRect(0,0,small.width,small.height);sample.drawImage(image,0,0,small.width,small.height);ctx.clearRect(0,0,1050,640);ctx.imageSmoothingEnabled=false;ctx.globalAlpha=ease;const h=1050*image.naturalHeight/image.naturalWidth;ctx.drawImage(small,0,(640-h)/2,1050,h);if(p<1)raf=requestAnimationFrame(draw);else{image.style.opacity='1';canvas.remove();ready=true;call();}};raf=requestAnimationFrame(draw);};
 if(image.complete&&image.naturalWidth)begin();else image.addEventListener('load',begin,{once:true});
 return {enter(){if(!requested)onEnter?.();requested=true;call();},cancel(){cancelled=true;cancelAnimationFrame(raf);canvas.remove();}};
}
