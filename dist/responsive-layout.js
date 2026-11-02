import {fitDisplay} from './display.js?v=23';
export function responsiveLayout(width,height,{touch=false,mode='menu',safe={},menuHeight=340}={}){
 const inset={left:0,right:0,top:0,bottom:0,...safe},w=Math.max(1,width-inset.left-inset.right),h=Math.max(1,height-inset.top-inset.bottom),kind=!touch&&Math.min(w,h*16/9)>=1280?'desktop':Math.min(w,h)>=600?'tablet':'phone',landscape=w>h,columns=kind==='phone'&&landscape&&w>=520;
 const fit=(x,y,ww,hh)=>{const b=fitDisplay(ww,hh);return {left:inset.left+x+b.left,top:inset.top+y+b.top,width:b.width,height:b.height};};
 let game,controls=null,menu=null;
 if(mode==='drive'&&columns){game=fit(92,0,w-184,h);controls={left:inset.left+8,top:game.top,width:w-16,height:game.height};}
 else if(mode==='drive'&&kind!=='desktop'){
  const dockHeight=kind==='tablet'?148:204,available=Math.max(1,h-dockHeight-12),b=fitDisplay(w,available),top=Math.max(0,(h-b.height-dockHeight-12)/2);game={left:inset.left+b.left,top:inset.top+top,width:b.width,height:b.height};controls={left:inset.left+Math.max(12,(w-980)/2),top:game.top+game.height+12,width:Math.min(w-24,980),height:dockHeight};
 }else{game=fit(0,0,w,h);if(mode==='drive')controls={left:game.left+24,top:Math.max(inset.top,game.top+game.height-246),width:Math.min(520,w-48),height:182};}
 if(mode==='menu'&&kind!=='desktop'){
  if(kind==='phone'&&!landscape){const mh=Math.min(menuHeight,h-100),b=fitDisplay(w,Math.max(1,h-mh-12)),top=Math.max(0,(h-b.height-mh-12)/2);game={left:inset.left+b.left,top:inset.top+top,width:b.width,height:b.height};menu={left:inset.left+12,top:game.top+game.height+12,width:w-24,height:mh};}
  else menu={left:game.left+12,top:inset.top+Math.max(12,(h-Math.min(menuHeight,h-24))/2),width:Math.min(350,Math.max(220,w*.44)),height:Math.min(menuHeight,h-24)};
 }
 return {kind,landscape,columns,game,controls,menu};
}
