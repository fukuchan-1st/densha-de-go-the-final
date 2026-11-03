const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// PNG alpha/tRNS already carries transparency. Black is also real dashboard ink.
export function panelTransparentColor(element,panel){return element.transparentcolor??panel.this.transparentcolor??null;}
export const PANEL_CROPS={e235:{x:100,y:0,width:3600,height:2025},e233:{x:0,y:256,width:4096,height:2304},'323':{x:0,y:500,width:4096,height:2304},'207':{x:200,y:600,width:3600,height:2025}};
export function localNeedleAngle(e,value){const min=e.minimum??0,max=e.maximum??1,t=clamp((value-min)/(max-min||1),0,1);return (e.initialangle??0)+((e.lastangle??360)-(e.initialangle??0))*t;}
export function localNeedlePoint(e,x,y,angle){const scale=e.radius/e.origin[1],dx=(x-e.origin[0])*scale,dy=(y-e.origin[1])*scale,r=angle*Math.PI/180;return [e.location[0]+dx*Math.cos(r)-dy*Math.sin(r),e.location[1]+dx*Math.sin(r)+dy*Math.cos(r)];}
export function calibratedSpeedAngle(knots,speed){if(speed<=knots[0][0])return knots[0][1];for(let i=1;i<knots.length;i++)if(speed<=knots[i][0]){const a=knots[i-1],b=knots[i];return a[1]+(b[1]-a[1])*(speed-a[0])/(b[0]-a[0]);}return knots.at(-1)[1];}
export class LocalCabPanel {
 constructor(canvas,recipe,pack){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.recipe=recipe;this.pack=pack;this.images=new Map();this.bc=0;this.visible=true;this.crop=PANEL_CROPS[recipe.id];const o=recipe.panel.this.origin;this.viewOrigin={x:(o[0]-this.crop.x)*1600/this.crop.width,y:(o[1]-this.crop.y)*900/this.crop.height};canvas.width=1600;canvas.height=900;}
 static async load(canvas,recipe,pack){
  const panel=new LocalCabPanel(canvas,recipe,pack);
  const scale=Math.min(1,1600/panel.crop.width);
  for(const element of recipe.panel.elements){
   if(!panel.supported(element))continue;
   for(const ref of [element.image,element.nightImage]){
    if(!ref)continue;
    const key=panel.key(ref);
    if(panel.images.has(key))continue;
    const image=new Image();
    image.src=await pack.objectURL(ref);
    await image.decode();
    const dimensions=pack.dimensions?.(ref);
    const width=dimensions?.width??image.naturalWidth;
    const height=dimensions?.height??image.naturalHeight;
    const surface=document.createElement('canvas');
    surface.width=Math.max(1,Math.round(width*scale));
    surface.height=Math.max(1,Math.round(height*scale));
    const context=surface.getContext('2d',{willReadFrequently:true});
    context.drawImage(image,0,0,surface.width,surface.height);
    const color=panelTransparentColor(element,recipe.panel)?.replace('#','');
    if(color?.length===6){
     const [red,green,blue]=[0,2,4].map(offset=>parseInt(color.slice(offset,offset+2),16));
     const pixels=context.getImageData(0,0,surface.width,surface.height);
     for(let i=0;i<pixels.data.length;i+=4){
      if(pixels.data[i]===red&&pixels.data[i+1]===green&&pixels.data[i+2]===blue)pixels.data[i+3]=0;
     }
     context.putImageData(pixels,0,0);
    }
    panel.images.set(key,{surface,width,height,scaleX:surface.width/width,scaleY:surface.height/height});
   }
  }
  return panel;
 }
 key(ref){return `${ref.entryIndex}|${ref.transparentColor??''}`;}
 semantic(e){return this.recipe.subjectMappings.vehicle[e.subject]??this.recipe.subjectMappings.common[e.subject];}
 supported(e){return e.type==='background'||e.subject==='true'||['always','doorClosed','speedKmh','mainReservoirKpa','brakeCylinderKpa','absoluteMotorCurrent','motorCurrent','speedGaugeAngleEncoded','brakeIndex','powerIndex','hour','minute','second','controlVoltage','lineVoltage'].includes(this.semantic(e));}
 setVisible(visible){this.visible=visible;this.canvas.hidden=!visible;}
 render(state,dt=1/60,inTunnel=false){const ctx=this.ctx;ctx.clearRect(0,0,1600,900);if(!this.visible)return;const r=this.recipe.playableSpecs,bIndex=state.notch<0?Math.min(r.brakeNotches+1,-state.notch):0,btarget=bIndex/(r.brakeNotches+1)*380;this.bc+=(btarget-this.bc)*Math.min(1,dt*4);const seconds=8*3600+(state.elapsed??0),speed=state.speedKmh??(state.v??0)*3.6,values={always:1,doorClosed:!state.doors,speedKmh:speed,mainReservoirKpa:820-this.bc*.08,brakeCylinderKpa:this.bc,absoluteMotorCurrent:state.notch>0?state.notch*40:0,motorCurrent:state.notch*35,brakeIndex:bIndex,powerIndex:Math.max(0,state.notch),hour:seconds/3600%12,minute:seconds/60%60,second:seconds%60,controlVoltage:100,lineVoltage:1500};ctx.save();ctx.scale(1600/this.crop.width,900/this.crop.height);ctx.translate(-this.crop.x,-this.crop.y);
  for(const e of this.recipe.panel.elements){if(!this.supported(e))continue;const ref=inTunnel&&e.nightImage?e.nightImage:e.image,image=ref&&this.images.get(this.key(ref));if(!image)continue;const semantic=this.semantic(e),value=values[semantic],loc=e.location??[0,0];if(e.type==='needle'){
    let angle;if(semantic==='speedGaugeAngleEncoded')angle=calibratedSpeedAngle(this.recipe.panel.speedGaugeCalibration.angleKnots,speed);else if(Number.isFinite(value))angle=localNeedleAngle(e,value);else continue;
    ctx.save();ctx.translate(...loc);ctx.rotate(angle*Math.PI/180);const factor=e.radius/(e.origin?.[1]||1);ctx.scale(factor,factor);ctx.drawImage(image.surface,-e.origin[0],-e.origin[1],image.width,image.height);ctx.restore();
   }else if(e.type==='digitalnumber'){if(!Number.isFinite(value)||!e.interval)continue;const frame=clamp(Math.floor(value),0,Math.floor(image.height/e.interval)-1);ctx.drawImage(image.surface,0,frame*e.interval*image.scaleY,image.surface.width,e.interval*image.scaleY,...loc,image.width,e.interval);
   }else if(e.type==='background'||value||e.subject==='true')ctx.drawImage(image.surface,...loc,image.width,image.height);
  }ctx.restore();
 }
 dispose(){this.images.clear();this.ctx.clearRect(0,0,1600,900);}
}
