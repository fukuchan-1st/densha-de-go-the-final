// Reflection is composited behind panel pixels, so it appears through cab windows.
export function drawCabSheen(ctx,night=0){
 if(!Number.isFinite(ctx.canvas?.width))return;
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='destination-over';
 const w=ctx.canvas.width,h=ctx.canvas.height,strength=.19*(1-Math.max(0,Math.min(1,night))*.48);
 const gloss=ctx.createLinearGradient(0,0,w*.95,h*.68);
 for(const [at,alpha]of [[0,0],[.12,0],[.155,strength],[.205,0],[.55,0],[.68,strength*.62],[.74,0],[1,0]])gloss.addColorStop(at,`rgba(225,240,255,${alpha})`);
 ctx.fillStyle=gloss;ctx.fillRect(0,0,w,h);
 // A narrow highlight and a faint lower reflection make the pane legible even
 // against a bright sky, while leaving the centre of the sightline clear.
 ctx.strokeStyle=`rgba(245,250,255,${strength*.7})`;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(w*.085,0);ctx.lineTo(w*.32,h*.66);ctx.stroke();
 const lower=ctx.createLinearGradient(0,h*.34,0,h*.75);lower.addColorStop(0,'rgba(185,205,215,0)');lower.addColorStop(.65,`rgba(185,205,215,${strength*.25})`);lower.addColorStop(1,'rgba(185,205,215,0)');ctx.fillStyle=lower;ctx.fillRect(0,0,w,h);
 ctx.restore();
}
