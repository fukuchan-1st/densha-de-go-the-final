import {createTerrainMaterial} from './terrain-materials.js?v=76';
import {RealTrees,treeVariant} from './real-trees.js?v=83';
import {settlementAt} from './route-data.js?v=23';
import * as T from './assets/vendor/three.module.js?v=23';

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

export function createSurfaceMaterial(kind='ground'){return createTerrainMaterial(kind==='ground'?'grass':kind);}

function addInstances(scene,geometry,material,items){
 const meshes=[],dummy=new T.Object3D(),color=new T.Color();
 for(let base=0;base<items.length;base+=1000){const part=items.slice(base,base+1000),mesh=new T.InstancedMesh(geometry,material,part.length);for(let i=0;i<part.length;i++){const a=part[i];dummy.position.set(a.x,a.y,a.z);dummy.scale.set(a.w,a.h,a.d??1);dummy.rotation.set(0,a.rotation??0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.setRGB(a.shade??1,(a.shade??1)*.99,(a.shade??1)*.92);mesh.setColorAt(i,color);}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh);meshes.push(mesh);}return meshes;
}

export function addVegetation(world){
 const r=random(7011500),broad=[],pine=[],bush=[],grass=[],trunks=[],trees=[];
 const stationClear=(s,offset)=>(world.isStructureCorridor?.(s,offset)??false)||(world.trackLayout?.occupied(s,offset)??false);
 const at=(s,offset)=>world.frame(s,offset).p;
 for(let s=-120;s<world.length+300;s+=14){
  for(const side of [-1,1])for(const row of [18,42,80]){
   // Denser woodland stretches alternate with open farmland.
   const wooded=settlementAt(s)<.6&&Math.sin(s/700)+Math.sin(s/211)>.1;
   if(!wooded&&r()>(settlementAt(s)>.65?.25:.65))continue;
   const ss=s+(r()-.5)*24,offset=side*(row+r()*16),p=at(ss,offset),height=6+r()*8,conifer=r()<.22,shade=.68+r()*.34;
   if(stationClear(ss,offset))continue;
   trees.push({s:ss,x:offset,y:0,h:height,variant:treeVariant(r()),rotation:r()*Math.PI*2,shade});
  }
 }
 for(let s=-120;s<world.length+300;s+=15){for(const side of [-1,1]){
  if(r()>.72)continue;
  const ss=s+r()*13,offset=side*(side<0?6+r()*13:9+r()*13);if(stationClear(ss,offset))continue;
  const p=at(ss,offset),height=.7+r()*1.7,width=height*(1.5+r());
  for(let j=0;j<2;j++)bush.push({x:p.x,y:p.y+height*.45,z:p.z,w:width,h:height*1.2,rotation:j*Math.PI/2+r(),shade:.67+r()*.3});
 }}
 for(let s=-110;s<world.length+200;s+=6){for(const side of [-1,1]){
  const ss=s+r()*5,offset=side<0?-(3.2+r()*5.5):7.25+r()*4.5;if(stationClear(ss,offset))continue;
  const p=at(ss,offset),height=.3+r()*.8,width=1.2+r()*2.3;
  for(let j=0;j<2;j++)grass.push({x:p.x,y:p.y+height*.48,z:p.z,w:width,h:height,rotation:r()*Math.PI,shade:.78+r()*.35});
 }}
 const realTrees=world.trees??=new RealTrees(world);realTrees.add(world.scene,trees);
 const broadMap=crownTexture(false),pineMap=crownTexture(true),grassMap=grassTexture();
 const foliage=map=>new T.MeshStandardMaterial({map,alphaTest:.36,side:T.DoubleSide,roughness:1,emissive:'#1e2b13',emissiveIntensity:.28});
 const plane=new T.PlaneGeometry(1,1),mBroad=foliage(broadMap),mPine=foliage(pineMap),mGrass=foliage(grassMap);
 const meshes=[addInstances(world.scene,plane,mBroad,broad),addInstances(world.scene,plane,mPine,pine),addInstances(world.scene,plane,mBroad,bush),addInstances(world.scene,plane,mGrass,grass),addInstances(world.scene,new T.CylinderGeometry(.5,.7,1,5),new T.MeshStandardMaterial({color:'#635844',roughness:1}),trunks)].flat().filter(Boolean);
 return {meshes,treeCount:trees.length,grassCount:grass.length,dispose(){for(const m of meshes){world.scene.remove(m);m.geometry.dispose();m.material.dispose();}broadMap.dispose();pineMap.dispose();grassMap.dispose();}};
}
