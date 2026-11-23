// The reveal never navigates. Only an explicit title input opens the main menu.
export function startTitleIntro({image,button,onStart,onEnter,duration=1900}){
 let cancelled=false,started=false,raf=0;
 const canvas=document.createElement('canvas');canvas.width=1050;canvas.height=640;canvas.className='shell-logo title-mosaic';canvas.setAttribute('aria-hidden','true');image.before(canvas);image.style.opacity='0';
 const ctx=canvas.getContext('2d'),small=document.createElement('canvas'),sample=small.getContext('2d');
 const begin=()=>{if(cancelled)return;canvas.height=Math.round(canvas.width*image.naturalHeight/image.naturalWidth);let start;const draw=now=>{if(cancelled)return;start??=now;const p=Math.min(1,(now-start)/duration),ease=1-(1-p)**3,columns=Math.max(12,Math.round(12+1038*p**2.8));small.width=columns;small.height=Math.max(1,Math.round(columns*image.naturalHeight/image.naturalWidth));sample.clearRect(0,0,small.width,small.height);sample.drawImage(image,0,0,small.width,small.height);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;ctx.globalAlpha=ease;const h=1050*image.naturalHeight/image.naturalWidth;ctx.drawImage(small,0,0,1050,h);if(p<1)raf=requestAnimationFrame(draw);else{image.style.opacity='1';canvas.remove();}};raf=requestAnimationFrame(draw);};
 if(image.complete&&image.naturalWidth)begin();else image.addEventListener('load',begin,{once:true});
 return {enter(){if(cancelled||started)return;started=true;onEnter?.();onStart();},cancel(){cancelled=true;cancelAnimationFrame(raf);canvas.remove();}};
}
