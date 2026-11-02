export function brakeSpriteFrame(notch){return notch<=-9?9:notch===-1?1:notch<0?Math.min(8,-notch):0;}
export const PANEL_VIEW={x:100,y:90,width:3300,height:1856.25,scale:1600/3300};
export function panelPoint(x,y){return {x:(x-PANEL_VIEW.x)*PANEL_VIEW.scale,y:(y-PANEL_VIEW.y)*PANEL_VIEW.scale};}
export function needleAngle(element,value){const t=Math.max(0,Math.min(1,(value-element.minimum)/(element.maximum-element.minimum)));return element.initialAngle+(element.lastAngle-element.initialAngle)*t;}
export function needlePoint(element,x,y,angle){const scale=element.radius/element.origin[1],dx=(x-element.origin[0])*scale,dy=(y-element.origin[1])*scale,r=angle*Math.PI/180;return {x:element.location[0]+dx*Math.cos(r)-dy*Math.sin(r),y:element.location[1]+dx*Math.sin(r)+dy*Math.cos(r)};}
export class CabPanel {
 constructor(canvas,config,images){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.config=config;this.images=images;this.night=0;this.bc=0;this.mr=800;this.viewOrigin=panelPoint(...config.this.origin);}
 static async load(canvas){
  const base=new URL('./assets/cab-panel/',import.meta.url),r=await fetch(new URL('panel-config.json?v=22',base));if(!r.ok)throw Error('運転台の設定を読み込めません');const config=await r.json();
  const keys=new Set();for(const t of config.backgroundTiles)for(const k of ['dayImage','nightImage'])if(t[k])keys.add(t[k]);for(const e of config.elements)if(e.useInPrototype)for(const k of ['dayImage','nightImage'])if(e[k])keys.add(e[k]);
  const images=new Map();await Promise.all([...keys].map(async path=>{const image=new Image();image.src=new URL(path,base);await image.decode();const surface=document.createElement('canvas');surface.width=image.width;surface.height=image.height;const ctx=surface.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height);let keyed=false;for(let i=0;i<pixels.data.length;i+=4)if(pixels.data[i]===0&&pixels.data[i+1]===0&&pixels.data[i+2]===255&&pixels.data[i+3]){pixels.data[i+3]=0;keyed=true;}if(keyed)ctx.putImageData(pixels,0,0);images.set(path,surface);}));
  canvas.width=1600;canvas.height=900;return new CabPanel(canvas,config,images);
 }
 image(path,x,y,alpha=1,crop=null){const image=this.images.get(path);if(!image)return;this.ctx.globalAlpha=alpha;if(crop)this.ctx.drawImage(image,...crop,x,y,crop[2],crop[3]);else this.ctx.drawImage(image,x,y);this.ctx.globalAlpha=1;}
 drawElement(e,state,night){const ctx=this.ctx,path=(night&&e.nightImage)?e.nightImage:e.dayImage;if(!path)return;const binding=e.binding?.state;
  if(e.kind==='needle'){
   const values={speedKmh:state.v*3.6,brakeCylinderKpa:this.bc,mainReservoirKpa:this.mr};if(!(binding in values))return;
   const value=values[binding]*(e.binding.multiplier??1),angle=needleAngle(e,value),image=this.images.get(path);if(!image)return;
   ctx.save();ctx.translate(...e.location);ctx.rotate(angle*Math.PI/180);const scale=e.radius/e.origin[1];ctx.scale(scale,scale);ctx.drawImage(image,-e.origin[0],-e.origin[1]);ctx.restore();
  }else if(e.kind==='digitalnumber'&&binding==='brakeNotch'){
   const frame=brakeSpriteFrame(state.notch),image=this.images.get(path);if(image){this.image(path,...e.location,1,[0,frame*e.interval,image.width,e.interval]);}
  }else if(e.kind==='pilotlamp'){
   const on=binding==='constant'?e.binding.value:binding==='doorsClosed'?!state.doors:binding==='doorsOpen'?state.doors:binding==='emergency'?state.notch===-9:false;
   if(on)this.image(path,...e.location);
  }
 }
 render(state,dt,inTunnel=false){
  this.night+=(Number(inTunnel)-this.night)*Math.min(1,dt*3);const target=state.notch<0?Math.max(0,Math.min(7,-state.notch-1))/7*350:0;this.bc+=(target-this.bc)*Math.min(1,dt*4);this.mr=800-this.bc*.08;
  const ctx=this.ctx;ctx.clearRect(0,0,1600,900);ctx.save();ctx.scale(PANEL_VIEW.scale,PANEL_VIEW.scale);ctx.translate(-PANEL_VIEW.x,-PANEL_VIEW.y);
  for(const t of this.config.backgroundTiles){this.image(t.dayImage,...t.location);if(this.night>.005)this.image(t.nightImage,...t.location,this.night);}
  const elements=this.config.elements.filter(e=>e.useInPrototype&&e.role!=='background-tile').slice().sort((a,b)=>a.layer-b.layer);
  for(const e of elements)this.drawElement(e,state,this.night>.5);
  ctx.restore();
 }
}
