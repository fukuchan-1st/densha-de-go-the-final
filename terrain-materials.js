import * as T from './assets/vendor/three.module.js?v=118';
export function terrainKind(color){return ({'#869177':'grass','#667d52':'forest','#74746b':'ballast','#565b5b':'asphalt','#9a9d93':'concrete','#a8aaa1':'concrete','#e3ce67':'tactile'})[color]??null;}
export function terrainShade(x,z){return .94+.07*Math.sin(x/27+z/53)+.05*Math.cos(z/31-x/67);}
export function createTerrainMaterial(kind='grass'){
 const size=512,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d');
 let seed=76000+kind.length*97;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const base=({grass:[82,99,45],forest:[62,74,39],field:[112,119,53],ballast:[113,112,102],asphalt:[65,68,68],concrete:[145,146,135]})[kind]??[82,99,45];
 const image=c.createImageData(size,size),heights=new Float32Array(size*size),stone=kind==='ballast',plants=['grass','forest','field'].includes(kind);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=(random()-.5)*24+Math.sin(x/31)*Math.cos(y/37)*7+Math.sin(x/9+y/13)*3,i=y*size+x;heights[i]=random()*.35+(n+30)/160;
  for(let channel=0;channel<3;channel++)image.data[i*4+channel]=Math.max(0,Math.min(255,base[channel]+n));image.data[i*4+3]=255;
 }c.putImageData(image,0,0);
 if(plants){
  for(let i=0;i<220;i++){const x=random()*size,y=random()*size,r=4+random()*20;c.fillStyle=kind==='forest'?'rgba(104,77,43,.15)':'rgba(130,112,63,.12)';c.beginPath();c.ellipse(x,y,r,r*.6,random()*3,0,Math.PI*2);c.fill();}
  c.lineCap='round';for(let i=0;i<19000;i++){const x=random()*size,y=random()*size,l=2+random()*7;c.strokeStyle=i%4===0?'rgba(166,153,91,.37)':`rgba(${45+random()*65},${69+random()*65},${24+random()*39},.48)`;c.lineWidth=.5+random()*.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+(random()-.5)*4,y-l);c.stroke();}
  if(kind==='forest')for(let i=0;i<1300;i++){c.fillStyle=['#78613d88','#a18b5088','#514b2d88'][i%3];c.beginPath();c.ellipse(random()*size,random()*size,1+random()*3,.5+random(),random()*6,0,Math.PI*2);c.fill();}
  if(kind==='field'){c.strokeStyle='#52673866';c.lineWidth=2;for(let x=0;x<size;x+=16){c.beginPath();c.moveTo(x,0);c.lineTo(x,size);c.stroke();}}
 }else if(stone){
  for(let i=0;i<15000;i++){const x=random()*size,y=random()*size,r=1+random()*3.3,v=74+random()*90;c.fillStyle=`rgb(${v+3},${v+2},${v-5})`;c.strokeStyle='#45484066';c.lineWidth=.5;c.beginPath();c.moveTo(x-r,y);c.lineTo(x-.4*r,y-r);c.lineTo(x+r,y-r*.3);c.lineTo(x+r*.6,y+r);c.closePath();c.fill();c.stroke();}
 }else{
  for(let i=0;i<24000;i++){const v=random()>.5?185:24;c.fillStyle=`rgba(${v},${v},${v},.13)`;c.fillRect(random()*size,random()*size,1+random(),1+random());}
  if(kind==='concrete'){c.strokeStyle='#74756d55';c.lineWidth=1;c.strokeRect(1,1,size-2,size-2);}
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
 const normalCanvas=document.createElement('canvas');normalCanvas.width=normalCanvas.height=size;const nc=normalCanvas.getContext('2d'),normal=nc.createImageData(size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,dx=heights[y*size+(x+1)%size]-heights[y*size+(x+size-1)%size],dy=heights[((y+1)%size)*size+x]-heights[((y+size-1)%size)*size+x];normal.data[i*4]=128-dx*130;normal.data[i*4+1]=128-dy*130;normal.data[i*4+2]=250;normal.data[i*4+3]=255;}nc.putImageData(normal,0,0);const normalMap=new T.CanvasTexture(normalCanvas);normalMap.wrapS=normalMap.wrapT=T.RepeatWrapping;
 const material=new T.MeshStandardMaterial({map,normalMap,normalScale:new T.Vector2(stone?.5:.2,stone?.5:.2),roughness:1,side:T.DoubleSide});material.name='textured-'+kind;material.userData.richNormalMap=normalMap;return material;
}
export function buildingVariant(s,x){let n=Math.imul(Math.round(s)+371,374761393)^Math.imul(Math.round(x*3)+97,668265263);return ((n^(n>>>16))>>>0)%30;}
export function buildingPalette(variant,house=false){const office=['#c3c7c9','#c9c1b3','#b9b6ab','#a1afba','#bcafa0','#d0c9b9','#9caaa9','#b2bac1','#c6b6a2','#a5a3a0'],homes=['#dfd6bd','#c5b6a0','#c3c8c0','#b8aba0','#d8c8b0','#b5b9b9','#d6d0bf','#bda99a','#a9b6bb','#c9b6a6'];return (house?homes:office)[variant%10];}
export function createBuildingMaterial(color,house=false,variant=0){
 const canvas=document.createElement('canvas'),glow=document.createElement('canvas');canvas.width=glow.width=128;canvas.height=glow.height=house?128:256;const c=canvas.getContext('2d'),g=glow.getContext('2d');c.fillStyle=color;c.fillRect(0,0,canvas.width,canvas.height);g.fillStyle='#000';g.fillRect(0,0,glow.width,glow.height);
 let seed=(house?761:762)+variant*7919;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<4000;i++){c.fillStyle=random()>.5?'#ffffff0c':'#0000000b';c.fillRect(random()*128,random()*canvas.height,1,2);}
 const gapX=house?(variant%2?37:51):[24,31,19,39,26][Math.floor(variant/6)],gapY=house?55:[29,36,25,42,31][Math.floor(variant/6)],w=house?(variant%2?22:28):gapX-9,h=house?26:gapY-12;
 for(let y=12;y<canvas.height-10;y+=gapY)for(let x=house?15:9;x<116;x+=gapX){
  c.fillStyle=house?'#33494e':['#405b68','#304b57','#51636a','#2c464e','#68787d'][variant%5];c.fillRect(x,y,w,h);if(variant%3===0){c.fillStyle='#777d7f';c.fillRect(x-2,y+h+2,w+4,3);c.fillStyle='#424c50';for(let bar=0;bar<w;bar+=5)c.fillRect(x+bar,y+h-4,1,7);}c.fillStyle='#b5beb3';c.fillRect(x+w/2,y,1,h);c.fillRect(x,y+h/2,w,1);
  if(random()>.25+(variant%4)*.1){const shade=.4+random()*.6;g.fillStyle=`rgb(${Math.round(255*shade)},${Math.round(213*shade)},${Math.round(151*shade)})`;g.fillRect(x+1,y+1,w-2,h-2);g.fillStyle='#23180b';g.fillRect(x+w/2,y,1,h);}
 }
 if(house){c.fillStyle='#64513a';c.fillRect(56,90,18,38);}
 const map=new T.CanvasTexture(canvas),emissiveMap=new T.CanvasTexture(glow);map.colorSpace=emissiveMap.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshStandardMaterial({map,emissiveMap,emissive:'#ffdcaa',emissiveIntensity:0,roughness:.9});material.userData.windowLight=true;material.userData.facadeVariant=variant;return material;
}
