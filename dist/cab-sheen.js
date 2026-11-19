const reflections=new WeakMap();
// The actual instrument panel is mirrored into the clear window pixels.
export function drawCabSheen(ctx,night=0){
 const canvas=ctx.canvas;if(!Number.isFinite(canvas?.width))return;
 let mirror=reflections.get(canvas);if(!mirror){mirror=document.createElement('canvas');reflections.set(canvas,mirror);}if(mirror.width!==canvas.width||mirror.height!==canvas.height){mirror.width=canvas.width;mirror.height=canvas.height;}
 const m=mirror.getContext('2d'),w=canvas.width,h=canvas.height;m.clearRect(0,0,w,h);m.drawImage(canvas,0,0);
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='destination-over';
 // Windshield reflection: a reversed, faint image of the live dashboard.
 ctx.globalAlpha=.075+Math.max(0,Math.min(1,night))*.045;ctx.translate(w*.01,h*.81);ctx.scale(.98,-.48);ctx.drawImage(mirror,0,h*.49,w,h*.51,0,h*.49,w,h*.51);
 ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=.07;ctx.translate(w*.20,0);ctx.scale(-.28,.72);ctx.drawImage(mirror,w*.2,h*.45,w*.75,h*.55,0,h*.22,w*.75,h*.55);
 ctx.restore();
}
