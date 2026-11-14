import * as T from './assets/vendor/three.module.js';
import {districtAt,fixedMoodAt,DISTRICTS} from './toho-biomes.js?v=83';
import {treeVariant} from './real-trees.js?v=83';
const clamp=T.MathUtils.clamp;
function flowerMap(kind){
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=128;const c=canvas.getContext('2d');c.strokeStyle='#446739';c.lineWidth=3;c.beginPath();c.moveTo(48,127);c.quadraticCurveTo(42,75,48,28);c.stroke();
 c.fillStyle='#496e31';for(const [x,y,r]of [[39,90,-.8],[56,72,.8]]){c.beginPath();c.ellipse(x,y,16,5,r,0,Math.PI*2);c.fill();}
 if(kind==='sunflower'){
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;c.save();c.translate(48,33);c.rotate(a);c.fillStyle=i%2?'#f8ca27':'#ffe04f';c.beginPath();c.ellipse(0,-20,6,17,0,0,Math.PI*2);c.fill();c.restore();}
  c.fillStyle='#564124';c.beginPath();c.arc(48,33,14,0,7);c.fill();for(let i=0;i<35;i++){c.fillStyle='#8d652b';c.fillRect(38+(i*17%20),23+(i*13%20),1,2);}
 }else if(kind==='lily'){
  c.strokeStyle='#6c963d';c.lineWidth=2;for(let i=0;i<6;i++){const x=i%2?62:37,y=20+i*11;c.beginPath();c.moveTo(48,y-8);c.quadraticCurveTo(x,y-12,x,y);c.stroke();c.fillStyle='#f2f0e5';c.beginPath();c.ellipse(x,y+5,7,9,0,0,7);c.fill();c.fillStyle='#d7dce5';c.fillRect(x-7,y+10,14,2);}
 }else if(kind==='higan'){
  c.strokeStyle='#ed4555';c.lineWidth=1.5;for(let i=0;i<17;i++){const a=i/17*Math.PI*2;c.beginPath();c.moveTo(48,40);c.quadraticCurveTo(48+Math.cos(a)*28,40+Math.sin(a)*24,48+Math.cos(a+.4)*33,40+Math.sin(a+.4)*28);c.stroke();c.fillStyle='#ff8291';c.beginPath();c.arc(48+Math.cos(a+.4)*33,40+Math.sin(a+.4)*28,1.5,0,7);c.fill();}
 }else if(kind==='mushroom'){
  c.clearRect(0,0,96,128);c.fillStyle='#d1bd88';c.fillRect(42,51,13,70);c.fillStyle='#c07535';c.beginPath();c.ellipse(48,53,40,27,0,Math.PI,Math.PI*2);c.lineTo(88,55);c.lineTo(8,55);c.fill();c.fillStyle='#eee0b3';for(let i=0;i<10;i++){c.beginPath();c.arc(23+i*17%49,36+i*11%15,3,0,7);c.fill();}
 }else{
  c.fillStyle='#f1c5e0';for(let i=0;i<5;i++){const a=i/5*Math.PI*2;c.beginPath();c.ellipse(48+Math.cos(a)*16,35+Math.sin(a)*16,13,8,a,0,7);c.fill();}c.fillStyle='#ecd391';c.beginPath();c.arc(48,35,5,0,7);c.fill();
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map;
}
function roofGeometry(){
 const x=[-.6,-.48,0,.48,.6],y=[-.27,-.38,.5,-.38,-.27],p=[],idx=[];
 for(const z of[-.5,.5])for(let i=0;i<x.length;i++)p.push(x[i],y[i],z);
 for(let i=0;i<4;i++)idx.push(i,i+5,i+1,i+1,i+5,i+6);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function petalMap(){const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.fillStyle='#f6cfe9';x.beginPath();x.ellipse(16,16,12,7,-.5,0,7);x.fill();const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;}
export class TohoLandmarks{
 constructor(world){
  this.world=world;this.resources=[];this.materials=new Map();this.geometries={box:new T.BoxGeometry(1,1,1),pole:new T.CylinderGeometry(.5,.5,1,7),cone:new T.ConeGeometry(.5,1,7),crown:new T.IcosahedronGeometry(.5,1),crystal:new T.OctahedronGeometry(.5),roof:roofGeometry(),plane:new T.PlaneGeometry(1,1),floor:new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),ring:new T.TorusGeometry(.5,.07,6,24).rotateX(Math.PI/2)};this.resources.push(...Object.values(this.geometries));this.elapsed=0;
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(96*3),3));const map=petalMap(),mat=new T.PointsMaterial({map,color:'#f4c4e6',size:.22,transparent:true,alphaTest:.12,depthWrite:false});this.petals=new T.Points(geo,mat);this.petals.userData.atmosphere=true;this.petals.frustumCulled=false;world.scene.add(this.petals);this.resources.push(geo,map,mat);
 }
 mat(key){
  if(key.startsWith('#'))return this.world.mat(key);
  if(this.materials.has(key))return this.materials.get(key);let material;
  if(key.startsWith('flower:')){const map=flowerMap(key.split(':')[1]);this.resources.push(map);material=new T.MeshStandardMaterial({map,side:T.DoubleSide,alphaTest:.38,roughness:1});}
  else if(key.startsWith('field:')||key==='bamboo'){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
   if(key==='bamboo'){const g=c.createLinearGradient(0,0,128,0);g.addColorStop(0,'#5d713a');g.addColorStop(.4,'#a3b272');g.addColorStop(1,'#607444');c.fillStyle=g;c.fillRect(0,0,128,128);for(let y=0;y<128;y+=16){c.fillStyle='#c5c18b';c.fillRect(0,y,128,2);c.fillStyle='#405936';c.fillRect(0,y+2,128,1);}}
   else{c.fillStyle=key.endsWith('sunflower')?'#b4a544':'#7b8550';c.fillRect(0,0,128,128);for(let i=0;i<850;i++){const x=i*73%128,y=i*47%128;c.fillStyle=key.endsWith('sunflower')?'#d8bd36':key.endsWith('lily')?'#d6dfbc':'#bd485a';c.beginPath();c.arc(x,y,key.endsWith('sunflower')?2.4:1.8,0,7);c.fill();}}
   const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;if(key!=='bamboo')map.repeat.set(7,3);this.resources.push(map);material=new T.MeshStandardMaterial({map,roughness:1,side:T.DoubleSide});
  }
  else if(key==='water'){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#526d78';x.fillRect(0,0,128,128);for(let i=0;i<24;i++){x.strokeStyle=i%3?'#91b4c34a':'#d6e6dc55';x.lineWidth=1;x.beginPath();x.moveTo(i*13%128,i*19%128);x.bezierCurveTo(38,i*19%128-2,78,i*19%128+3,128,i*19%128);x.stroke();}const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(5,10);this.resources.push(map);material=new T.MeshStandardMaterial({map,color:'#658e9c',roughness:.25,metalness:.25,side:T.DoubleSide,emissive:'#131726',emissiveIntensity:.22});}
  else if(key==='crystal'){material=new T.MeshStandardMaterial({color:'#97f4df',emissive:'#31b8b3',emissiveIntensity:1,roughness:.18,metalness:.2});}
  else if(key==='lamp'){material=new T.MeshStandardMaterial({color:'#ffe8a9',emissive:'#ffc66b',emissiveIntensity:.9});}
  else if(key.startsWith('label:')){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#cbb58a';c.fillRect(0,0,512,128);c.strokeStyle='#4b3424';c.lineWidth=10;c.strokeRect(7,7,498,114);c.fillStyle='#332921';c.textAlign='center';c.font='bold 65px serif';c.fillText(key.slice(6),256,86);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;this.resources.push(map);material=new T.MeshStandardMaterial({map,side:T.DoubleSide,roughness:.85});
  }else material=this.world.mat('#b8b4a2');
  this.materials.set(key,material);if(![...this.world.materials.values()].includes(material))this.resources.push(material);return material;
 }
 add(group,start,end,envelope,random){
  const nativeTrees={sakura:[],autumn:[]};
  const batches=new Map(),put=(geometry,material,s,x,y,w,h,d,r=0)=>{const key=geometry+'|'+material;if(!batches.has(key))batches.set(key,{geometry,material,items:[]});batches.get(key).items.push({s,x,y,w,h,d,r});};
  const box=(s,x,y,w,h,d,color)=>put('box',color,s,x,y,w,h,d),roof=(s,x,y,w,h,d,color='#53595a')=>put('roof',color,s,x,y,w,h,d),pole=(s,x,y,w,h,color)=>put('pole',color,s,x,y,w,h,w);
  const tree=(s,x,autumn=false,pink=false)=>{const h=pink?8+random()*3:10+random()*4;if(pink||autumn){nativeTrees[pink?'sakura':'autumn'].push({s,x,y:-.25,h,variant:treeVariant(random()),rotation:random()*6.28,shade:1});return;}pole(s,x,-.25,.55,h*.75,'#655046');for(const [dx,ds,dy,k]of [[0,0,.65,1],[-1.8,-.8,.6,.7],[1.8,1,.65,.75],[0,1.4,.85,.75]])put('crown','#49683c',s+ds,x+dx,h*dy,h*.8*k,h*.8*k,h*.8*k);};
  for(let s=Math.ceil(start/13)*13;s<end;s+=13){
   if(this.world.structureAt(s,'tunnel'))continue;const region=districtAt(this.world.route,s);if(!region||region.distance>1200)continue;
   const edge=envelope(s),kind=region.kind;
   if(['sakura','mugen','waterfall','sanzu'].includes(kind)&&Math.floor(s/13)%2===0)for(const side of[-1,1])for(const row of [23,49]){if(side===(this.world.route.reverseDirection?-1:1)&&region.landmark&&region.distance<160)continue;tree(s+(random()-.5)*7,(side<0?edge[0]:edge[1])+side*(row+random()*7),kind==='waterfall',kind!=='waterfall');}
   if(kind==='bamboo')for(const side of [-1,1])for(let i=0;i<(this.world.quality==='light'?10:18);i++){
    const x=(side<0?edge[0]:edge[1])+side*(20+random()*44),ss=s+(random()-.5)*12,h=8+random()*7;put('pole','bamboo',ss,x,-.25,.18,h,.18);put('crown','#52713d',ss,x,h-2,3.3,4,3.3);
   }
   if(region.flowers&&region.flowers!=='sakura'&&region.flowers!=='mushroom')for(const side of[-1,1])put('floor','field:'+region.flowers,s,(side<0?edge[0]:edge[1])+side*50,-.13,70,0,15);
   if(region.flowers)for(const side of[-1,1])for(let row=0;row<(this.world.quality==='light'?3:5);row++)for(let i=0;i<(region.flowers==='sunflower'?(this.world.quality==='light'?5:9):3);i++){
    const x=(side<0?edge[0]:edge[1])+side*(19+row*10+random()*6),ss=s+(random()-.5)*11,h=region.flowers==='sunflower'?1.7+random()*.7:region.flowers==='mushroom'?.6+random()*.6:.65+random()*.35,w=h*(region.flowers==='higan'?1.1:.75);
    for(const r of[0,Math.PI/2])put('plane','flower:'+region.flowers,ss,x,-.1,w,h,1,r);
   }
   if(['sanzu','canal','riverbank'].includes(kind))put('floor','water',s,this.world.route.reverseDirection?-48:48,-.12,48,0,15);
   if(kind==='sanzu'&&Math.floor(s/13)%4===0){pole(s,20,0,.5,.9,'#858993');put('crown','#9696a0',s,20,.85,.65,.6,.65);}
  }
  const stations=this.world.sceneryStations??this.world.route.stations;
  for(const st of stations){
   const sign=this.world.route.reverseDirection?-1:1,anchor=st.s+sign*70;if(anchor<start||anchor>=end||this.world.structureAt(anchor,'tunnel'))continue;
   const district=this.world.route.id==='toho-village'?{kind:'village',landmark:'village',label:st.name}:DISTRICTS[st.name];if(!district)continue;
   const S=(d=0)=>anchor+d*sign,X=(x=45)=>Math.max(14,x-18)*sign,style=district.landmark;
   const label=(name,s,x,y,w=6)=>put('plane','label:'+name,s,x,y,w,1.4,1,Math.PI/2);
   const house=(s,x,w=16,h=5,d=11,name=district.label,color='#c8b795',roofColor='#535d60')=>{
    box(s,x,0,w,h,d,color);roof(s,x,h-.2,w+2,3,d+2,roofColor);for(const ds of[-d*.38,0,d*.38])box(s+ds,x-w/2-.1,.6,.2,h-1,.35,'#44372d');
    for(const ds of[-d*.26,d*.26])box(s+ds,x-w/2-.22,1.5,.08,2,d*.32,'#cbc8ac');label(name,s,x-w/2-.25,h-1.3,Math.min(7,d*.75));
   };
   if(style==='gate'||style==='shrine'||style==='temple'||style==='bamboo-house'){
    const meikai=style==='gate';house(S(24),X(meikai?68:55),meikai?25:21,meikai?8:6,17,district.label,'#b5a88d',meikai?'#6e9eaa':style==='temple'?'#688879':'#5c6c69');
    for(const side of[-1,1])for(let row=0;row<3;row++)pole(S(side*7),X(34+row*4),0,.45,3.6,'#847b6c');
    if(meikai){for(let i=0;i<16;i++)box(S(),(18+i*1.1)*sign,i*.16,2.2,.2,11,'#9d9da8');for(const side of[-1,1]){pole(S(side*8),X(52),0,1.1,8,'#514e55');}roof(S(),X(52),8,24,4,10,'#7b96a2');}
    if(style==='shrine'){
     for(const ds of[-5,5])pole(S(ds),X(23),0,.6,6,'#b64a37');box(S(),X(23),5.6,.65,.5,13,'#a63e31');box(S(),X(23),6.2,.85,.45,15,'#322b2d');
     for(const ds of[-9,9]){pole(S(ds),X(32),0,.65,2.1,'#9b9d93');box(S(ds),X(32),2,.9,.7,.9,'#e0ddba');roof(S(ds),X(32),2.7,1.5,.6,1.5);}
    }
   }else if(style==='mansion'){
    box(S(),X(65),0,39,16,46,'#744652');roof(S(),X(65),16,43,8,50,'#484250');
    for(const ds of[-19,19])for(const dx of[-15,15]){pole(S(ds),X(65+dx),0,7,22,'#7e5060');put('cone','#3e384b',S(ds),X(65+dx),22,10,13,10);}
    box(S(),X(43),0,8,27,9,'#805365');put('cone','#40374d',S(),X(43),27,12,15,13);label('紅魔館',S(),X(36),18,7);
    for(let ds=-18;ds<=18;ds+=6)for(let y=4;y<15;y+=5)box(S(ds),X(44.9),y,.15,2.8,1.6,'#c8b1a0');
    put('ring','#9b9290',S(),X(24),.15,11,.6,11);put('floor','water',S(),X(24),.5,9,0,9);pole(S(),X(24),.5,.7,3,'#a89da0');
   }else if(style==='cave'||style==='rainbow-cave'){
    for(let i=0;i<11;i++){const angle=i/10*Math.PI;put('crown','#514b63',S(Math.cos(angle)*9),X(48),Math.sin(angle)*12,7,8,7);}
    put('plane','#171a31',S(),X(48),0,15,13,1,Math.PI/2);
    for(let i=0;i<12;i++)put('crystal',i%3===0?'#bda2de':'crystal',S((random()-.5)*15),X(37+random()*9),0,1.2+random(),2+random()*5,1.2+random(),random());
    label(district.label,S(),X(30),1.4,7);
   }else if(style==='pagoda'){
    for(let level=0;level<5;level++){const w=13-level*1.5;box(S(),X(46),level*5,w,4.8,w,'#6b506b');roof(S(),X(46),level*5+4,w+5,2.8,w+5,'#4e4868');}pole(S(),X(46),26,.3,6,'#b69ab9');label(district.label,S(),X(36),1.5,8);
   }else if(style==='antique'||style==='magic-shop'||style==='bookshop'){
    const magic=style==='magic-shop';house(S(),X(40),18,magic?8:5.5,15,district.label,magic?'#b88da4':'#d2c3a2',magic?'#666c7c':'#595b56');
    if(magic){roof(S(-5),X(35),8,10,8,8,'#606778');for(let i=0;i<6;i++)put('crown','#526843',S(-7+i*2.5),X(42),9,4,1.4,3);}
    for(let i=0;i<9;i++){box(S(i*1.3-5),X(27),0,1,.8,1,['#785448','#997b58','#b5a173'][i%3]);if(magic)put('crown','lamp',S(i*1.3-5),X(27),2.5,.2,.2,.2);}
   }else if(['village','market'].includes(style)){
    const market=style==='market';for(let i=0;i<8;i++){const ss=S(-45+i*13),xx=X(40+(market?i*1.8:0)),y=market?i*.45:0;
     box(ss,xx,y,10,5.5,10,['#d0b798','#c9bd9a','#b19d81'][i%3]);roof(ss,xx,y+5.5,13,2.6,13);
     box(ss,xx-sign*6,y+2.3,.4,1.3,8,['#b36a55','#6d977b','#c0a25f','#716680'][i%4]);box(ss,xx-sign*7,y,2,.8,6,'#80694d');for(let j=0;j<3;j++)put('crown',['#caa563','#829354','#a25d55'][j],ss-2+j*2,xx-sign*7,y+.8,1,.7,1);
     if(market)for(let j=0;j<4;j++)box(ss+j*2.5,xx-sign*10,y+j*.1,2,.2,7,'#a49d8b');
    }label(district.label,S(),X(27),4,8);
   }else if(style==='graves'){
    for(let i=0;i<16;i++){const ss=S(-65+i*9),x=X(22+random()*20);box(ss,x,0,.9,.25,.9,'#898c91');box(ss,x,.25,.48,.9,.48,'#a5a6a8');}label(district.label,S(),X(22),1.5,6);
   }else if(style==='river'||style==='canal'){
    if(style==='river'){box(S(20),X(60),.15,1.7,.4,7,'#66514d');for(const ds of[-2.5,0,2.5])box(S(20+ds),X(60),.55,1.7,.16,.4,'#9a806a');box(S(20),X(60),.55,.15,1.4,.15,'#746254');}
    else{for(let ds=-40;ds<=40;ds+=16){pole(S(ds),X(23),0,.35,6,'#6a644c');for(let j=0;j<5;j++)put('crown','#71875a',S(ds+(random()-.5)*5),X(23+(random()-.5)*7),3.5,2,5,2);}box(S(),X(35),.5,28,.6,5,'#7b7767');}
   }else if(style==='waterfall'){
    for(let i=0;i<13;i++)put('crown','#767d79',S((random()-.5)*25),X(61+random()*15),0,9+random()*6,12+random()*18,10);
    put('plane','water',S(),X(49),0,11,27,1,Math.PI/2);put('floor','water',S(),X(40),-.08,24,0,65);
    for(let i=0;i<12;i++)tree(S(-65+i*12),X(31+random()*18),true,false);
   }else if(style==='forest'){
    for(let i=0;i<9;i++)tree(S(-60+i*15),X(30+random()*20));
    for(let i=0;i<5;i++)put('plane','flower:mushroom',S(i*5-12),X(24),0,2.2,3.5,1,Math.PI/2);
   }
  }
  for(const tint of ['sakura','autumn'])if(nativeTrees[tint].length)this.world.trees.add(group,nativeTrees[tint],{tint});
  for(const {geometry,material,items}of batches.values()){
   const surface=this.mat(material);if(geometry==='roof')surface.side=T.DoubleSide;const mesh=new T.InstancedMesh(this.geometries[geometry],surface,items.length),o=new T.Object3D();items.forEach((a,i)=>{const f=this.world.frame(a.s,a.x);o.position.copy(f.p);o.position.y+=a.y+a.h/2;o.rotation.set(0,f.angle+a.r,0);o.scale.set(a.w,a.h||1,a.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.computeBoundingSphere();mesh.userData.sharedDistrictResource=true;mesh.userData.shadowCaster=!['plane','floor','ring'].includes(geometry);group.add(mesh);
  }
 }
 update(s,dt){
  this.elapsed+=Math.max(0,Math.min(.1,dt));const world=this.world,mood=fixedMoodAt(world.route,s);this.petals.visible=!!mood;
  const water=this.materials.get('water');if(water)water.map.offset.x=this.elapsed*.008;
  if(!mood)return;
  const w=mood.weight;world.scene.background.lerp(new T.Color(mood.sky),w);world.scene.fog?.color.lerp(new T.Color(mood.fog),w);world.sky.color.lerp(new T.Color(mood.light),w);world.sky.groundColor.lerp(new T.Color('#424459'),w);world.sky.intensity=T.MathUtils.lerp(world.sky.intensity,.9,w);world.sun.color.lerp(new T.Color(mood.sun),w);world.sun.intensity=T.MathUtils.lerp(world.sun.intensity,.55,w);world.renderer.toneMappingExposure=T.MathUtils.lerp(world.renderer.toneMappingExposure,1.1,w);if(w>.7)world.atmosphere.sunSprite.visible=false;if(world.atmosphere.cloudMaterial)world.atmosphere.cloudMaterial.color.lerp(new T.Color('#9b8aa9'),w);
  world.headlight.intensity=T.MathUtils.lerp(world.headlight.intensity,180,w);this.petals.material.opacity=w*.8;const p=this.petals.geometry.attributes.position;for(let i=0;i<p.count;i++){const t=this.elapsed;const x=(i*17.13%44)-22+Math.sin(t*.4+i)*2,y=(i*7.31-t*.9)%17,z=(i*23.71%50)-25;p.setXYZ(i,world.camera.position.x+x,world.camera.position.y+((y+17)%17)-4,world.camera.position.z+z);}p.needsUpdate=true;
 }
 dispose(){this.world.scene.remove(this.petals);for(const r of new Set(this.resources))r.dispose();}
}
