import * as T from './assets/vendor/three.module.js';

// Reproducible, browser-native vegetation. No images or network fetches required.
function random(seed=701153){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function canvasTexture(width,height,paint){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;paint(canvas.getContext('2d'),width,height);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;}

function crownTexture(conifer=false){
 const r=random(conifer?1941:7015);
 return canvasTexture(512,640,(ctx,w,h)=>{
  // Layered, irregular leaf clusters give an uneven outline and internal gaps.
  const clusters=[];
  if(conifer){for(let layer=0;layer<17;layer++){const y=55+layer*31,spread=14+layer*11;for(let i=0;i<10;i++)clusters.push([256+(r()-.5)*spread*2,y+r()*25,14+r()*20]);}}
  else {for(let i=0;i<75;i++){const angle=r()*Math.PI*2,rad=Math.sqrt(r());clusters.push([256+Math.cos(angle)*rad*185,280+Math.sin(angle)*rad*225,23+r()*35]);}}
  ctx.lineCap='round';ctx.strokeStyle='#423e2b';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(256,620);ctx.lineTo(250,290);ctx.stroke();
  for(let i=0;i<20;i++){const y=240+r()*260;ctx.lineWidth=2+r()*4;ctx.beginPath();ctx.moveTo(253,500);ctx.lineTo(256+(r()-.5)*300,y);ctx.stroke();}
  clusters.sort((a,b)=>a[1]-b[1]);
  for(const [x,y,radius] of clusters){
   const shade=22+r()*24;ctx.fillStyle=`rgb(${shade+7},${shade+37},${shade-3})`;ctx.beginPath();ctx.ellipse(x,y,radius*1.1,radius,0,0,Math.PI*2);ctx.fill();
   for(let j=0;j<34;j++){const a=r()*Math.PI*2,rad=Math.sqrt(r())*radius,xx=x+Math.cos(a)*rad,yy=y+Math.sin(a)*rad,leaf=2+r()*5;const light=(1-(yy-y)/radius)*13+r()*16;ctx.fillStyle=`rgba(${Math.floor(53+light)},${Math.floor(81+light)},${Math.floor(28+light*.6)},${.6+r()*.4})`;ctx.beginPath();ctx.ellipse(xx-2,yy-3,leaf*1.4,leaf,.4,0,Math.PI*2);ctx.fill();}
  }
 });
}
function grassTexture(){const r=random(776);return canvasTexture(256,256,(ctx)=>{
 for(let i=0;i<115;i++){
  const x=10+r()*235,base=254-r()*21,top=30+r()*177,bend=(r()-.5)*100,green=65+r()*47;
  ctx.strokeStyle=`rgba(${Math.floor(green*.8)},${Math.floor(green)},${Math.floor(green*.4)},${.6+r()*.4})`;ctx.lineWidth=.8+r()*2.2;ctx.beginPath();ctx.moveTo(x,base);ctx.quadraticCurveTo(x+bend*.1,top+45,x+bend,top);ctx.stroke();
  if(i%9===0){ctx.strokeStyle='#b6a474';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+bend,top);ctx.lineTo(x+bend+5,top-18);ctx.stroke();for(let k=0;k<5;k++){ctx.fillStyle='#afa06d';ctx.beginPath();ctx.ellipse(x+bend+3+k*.5,top-14+k*3,2,4,-.5,0,Math.PI*2);ctx.fill();}}
 }
});}

export function createSurfaceMaterial(kind='ground'){
 const r=random(kind==='ballast'?192:kind==='field'?174:701),ballast=kind==='ballast',field=kind==='field';
 const texture=canvasTexture(512,512,(ctx,w,h)=>{
  ctx.fillStyle=ballast?'#78766b':field?'#9a9b58':'#777d4b';ctx.fillRect(0,0,w,h);
  for(let i=0;i<(ballast?12500:19000);i++){
   const x=r()*w,y=r()*h,shade=r();
   if(ballast){const c=Math.floor(64+shade*105);ctx.fillStyle=`rgb(${c+4},${c+3},${c-2})`;const s=1+r()*4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+s,y-s*.7);ctx.lineTo(x+s*1.5,y+s*.7);ctx.lineTo(x+s*.3,y+s);ctx.closePath();ctx.fill();}
   else {const c=field?78:55;ctx.fillStyle=`rgba(${c+Math.floor(shade*60)},${c+10+Math.floor(shade*65)},${25+Math.floor(shade*38)},${.2+r()*.4})`;ctx.fillRect(x,y,.5+r()*3,1+r()*5);}
  }
  if(field){ctx.strokeStyle='#596b3930';ctx.lineWidth=1;for(let x=0;x<w;x+=9){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}}
 });
 texture.wrapS=texture.wrapT=T.RepeatWrapping;
 const m=new T.MeshStandardMaterial({map:texture,color:ballast?'#dbd9cd':'#e1e1cc',roughness:1,side:T.DoubleSide});
 m.name=`procedural-${kind}`;return m;
}

function addInstances(scene,geometry,material,items){
 if(!items.length)return null;
 const mesh=new T.InstancedMesh(geometry,material,items.length),dummy=new T.Object3D(),color=new T.Color();
 for(let i=0;i<items.length;i++){const a=items[i];dummy.position.set(a.x,a.y,a.z);dummy.scale.set(a.w,a.h,a.d??1);dummy.rotation.set(0,a.rotation??0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.setRGB(a.shade??1,(a.shade??1)*.99,(a.shade??1)*.92);mesh.setColorAt(i,color);}
 mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh);return mesh;
}

export function addVegetation(world){
 const r=random(7011500),broad=[],pine=[],bush=[],grass=[],trunks=[];
 const stationClear=(s,offset)=>offset<0&&offset>-14&&world.stations.some(st=>s>st.s-170&&s<st.s+35);
 const at=(s,offset)=>world.frame(s,offset).p;
 for(let s=-120;s<22400;s+=27){
  for(const side of [-1,1]){
   // Denser woodland stretches alternate with open farmland.
   const wooded=Math.sin(s/700)+Math.sin(s/211)>.1;
   if(!wooded&&r()>.4)continue;
   const ss=s+(r()-.5)*24,offset=side*(15+r()*125),p=at(ss,offset),height=5+r()*8,conifer=r()<.22,shade=.68+r()*.34;
   if(stationClear(ss,offset))continue;
   trunks.push({x:p.x,y:p.y+height*.23,z:p.z,w:.18+r()*.17,h:height*.46,d:.18+r()*.17,shade:.7+r()*.2});
   const layers=conifer?2:3;
   for(let layer=0;layer<layers;layer++)(conifer?pine:broad).push({x:p.x,y:p.y+height*.57,z:p.z,w:height*(conifer?.63:.94)*(1+r()*.13),h:height*.95,d:1,rotation:layer*Math.PI/layers+r()*.3,shade});
  }
 }
 for(let s=-120;s<22400;s+=15){for(const side of [-1,1]){
  if(r()>.72)continue;
  const ss=s+r()*13,offset=side*(side<0?6+r()*13:9+r()*13);if(stationClear(ss,offset))continue;
  const p=at(ss,offset),height=.7+r()*1.7,width=height*(1.5+r());
  for(let j=0;j<2;j++)bush.push({x:p.x,y:p.y+height*.45,z:p.z,w:width,h:height*1.2,rotation:j*Math.PI/2+r(),shade:.67+r()*.3});
 }}
 for(let s=-110;s<22300;s+=6){for(const side of [-1,1]){
  const ss=s+r()*5,offset=side<0?-(3.2+r()*5.5):7.25+r()*4.5;if(stationClear(ss,offset))continue;
  const p=at(ss,offset),height=.3+r()*.8,width=1.2+r()*2.3;
  for(let j=0;j<2;j++)grass.push({x:p.x,y:p.y+height*.48,z:p.z,w:width,h:height,rotation:r()*Math.PI,shade:.78+r()*.35});
 }}
 const broadMap=crownTexture(false),pineMap=crownTexture(true),grassMap=grassTexture();
 const foliage=map=>new T.MeshStandardMaterial({map,alphaTest:.36,side:T.DoubleSide,roughness:1,emissive:'#1e2b13',emissiveIntensity:.28});
 const plane=new T.PlaneGeometry(1,1),mBroad=foliage(broadMap),mPine=foliage(pineMap),mGrass=foliage(grassMap);
 const meshes=[addInstances(world.scene,plane,mBroad,broad),addInstances(world.scene,plane,mPine,pine),addInstances(world.scene,plane,mBroad,bush),addInstances(world.scene,plane,mGrass,grass),addInstances(world.scene,new T.CylinderGeometry(.5,.7,1,5),new T.MeshStandardMaterial({color:'#635844',roughness:1}),trunks)].filter(Boolean);
 return {meshes,treeCount:trunks.length,grassCount:grass.length,dispose(){for(const m of meshes){world.scene.remove(m);m.geometry.dispose();m.material.dispose();}broadMap.dispose();pineMap.dispose();grassMap.dispose();}};
}
