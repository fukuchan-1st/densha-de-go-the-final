import {WeatherScene} from './weather-scene.js?v=100final';
import {weatherType} from './weather.js?v=100final';
import {TrainWindowEnvironment,updateTrainWindowLighting} from './train-window-reflections.js?v=96';
import {tunnelAdaptation} from './tunnel-effects.js?v=93';
import * as T from './assets/vendor/three.module.js';
import {graphicsProfile,HighQualityRenderer} from './graphics-quality.js?v=87b';
export function lightingProfile(quality='standard',night=false){
 const simple=quality==='light';return {simple,shadows:!simple&&!night,clouds:!simple,sky:night?.25:simple?1.3:.82,sun:night?.06:simple?1.8:3.1,exposure:night?1.02:1.04};
}
export function solarState(clock){
 const seconds=((Number(clock)%86400)+86400)%86400,hour=seconds/3600,phase=(hour-6)/12*Math.PI;
 const direction=new T.Vector3(Math.cos(phase),Math.sin(phase)*1.1,Math.sin(phase)*.6).normalize();
 const x=T.MathUtils.clamp((direction.y+.06)/.24,0,1),daylight=x*x*(3-2*x);
 return {hour,direction,daylight,altitude:Math.asin(direction.y)*180/Math.PI};
}
export function followSunShadow(sun,point,direction){
 const x=Math.round(point.x*4)/4,z=Math.round(point.z*4)/4;
 sun.target.position.set(x,point.y,z);sun.position.copy(sun.target.position).add(direction?direction.clone().multiplyScalar(500):new T.Vector3(-220,360,140));sun.target.updateMatrixWorld();sun.updateMatrixWorld();
}
export function applyObjectShadows(root,enabled){
 root.traverse(object=>{if(!object.isMesh||object.userData.atmosphere)return;object.receiveShadow=enabled;object.castShadow=enabled&&(object.userData.shadowCaster??['BoxGeometry','CylinderGeometry','ConeGeometry','DodecahedronGeometry','ExtrudeGeometry'].includes(object.geometry?.type));});
}
function cloudTexture(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');
 let seed=7601;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<80;i++){
  const x=85+random()*340,y=70+random()*115,r=22+random()*53,g=c.createRadialGradient(x,y,r*.08,x,y,r);
  g.addColorStop(0,'rgba(255,255,255,.32)');g.addColorStop(.5,'rgba(239,245,249,.20)');g.addColorStop(1,'rgba(226,235,244,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map;
}
const hash=(x,z)=>{let n=Math.imul(x+93,374761393)^Math.imul(z+51,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
export class SceneAtmosphere{
 constructor(world){
  this.world=world;this.sun=world.sun;this.sky=world.sky??world.skyLight;this.elapsed=0;this.cover=0;this.shadowClock=0;
  this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:900});this.sun.shadow.camera.updateProjectionMatrix();this.sun.shadow.bias=-.00016;this.sun.shadow.normalBias=.065;this.sun.shadow.radius=3;
  world.scene.add(this.sun.target);world.renderer.shadowMap.type=T.PCFSoftShadowMap;world.renderer.shadowMap.autoUpdate=false;world.renderer.toneMapping=T.ACESFilmicToneMapping;
  if(!world.headlight){world.headlight=new T.SpotLight('#fff1d1',0,110,.4,.8,1.6);world.headlight.position.set(0,-.8,-.4);world.headlight.target.position.set(0,-1.6,-35);world.camera.add(world.headlight,world.headlight.target);if(!world.camera.parent)world.scene.add(world.camera);}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),glow=ctx.createRadialGradient(64,64,0,64,64,64);glow.addColorStop(0,'rgba(255,255,240,1)');glow.addColorStop(.12,'rgba(255,253,219,1)');glow.addColorStop(.22,'rgba(255,235,165,.5)');glow.addColorStop(1,'rgba(255,222,132,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,128,128);this.sunMap=new T.CanvasTexture(canvas);this.sunMap.colorSpace=T.SRGBColorSpace;this.sunSpriteMaterial=new T.SpriteMaterial({map:this.sunMap,transparent:true,depthWrite:false,blending:T.AdditiveBlending});this.sunSprite=new T.Sprite(this.sunSpriteMaterial);this.sunSprite.scale.set(120,120,1);this.sunSprite.raycast=()=>{};world.scene.add(this.sunSprite);
  this.setQuality(world.quality??'standard');
 }
 makeClouds(){
  if(this.clouds)return;this.clouds=new T.Group();this.clouds.userData.atmosphere=true;this.clouds.name='moving-clouds';this.map=cloudTexture();this.cloudGeometry=new T.PlaneGeometry(1,1);
  this.cloudMaterial=new T.MeshBasicMaterial({map:this.map,transparent:true,opacity:this.world.route?.night?.42:.94,depthWrite:false,side:T.DoubleSide,alphaTest:.025,color:this.world.route?.night?'#7c849c':'#ffffff'});
  this.cloudDepth=new T.MeshDepthMaterial({map:this.map,alphaTest:.32,depthPacking:T.RGBADepthPacking,side:T.DoubleSide});
  this.patches=[];for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){
   const mesh=new T.Mesh(this.cloudGeometry,this.cloudMaterial);mesh.rotation.x=-Math.PI/2;mesh.customDepthMaterial=this.cloudDepth;mesh.userData.atmosphere=true;mesh.raycast=()=>{};this.clouds.add(mesh);this.patches.push({mesh,x,z});
  }this.world.scene.add(this.clouds);
 }
 prepare(root){applyObjectShadows(root,this.profile.shadows);root.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){
  const anisotropy=Math.min(this.graphics.anisotropy,this.world.renderer.capabilities.getMaxAnisotropy());
  for(const key of ['map','normalMap','bumpMap','roughnessMap'])if(m[key]?.isTexture&&m[key].anisotropy!==anisotropy){m[key].anisotropy=anisotropy;m[key].needsUpdate=true;}
  if(!m.userData.richNormalMap)continue;const map=this.profile.simple?null:m.userData.richNormalMap;if(m.normalMap!==map){m.normalMap=map;m.needsUpdate=true;}
 }});}

 setQuality(quality){
  if(this.quality===quality)return;this.quality=quality;this.world.quality=quality;this.profile=lightingProfile(quality,Boolean(this.world.route?.night));
  const {renderer}=this.world;this.graphics=graphicsProfile(quality,globalThis.devicePixelRatio??1,renderer.capabilities.maxTextureSize);renderer.setPixelRatio(this.graphics.pixelRatio);
  renderer.shadowMap.type=this.graphics.shadowType;
  this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.sun.shadow.mapPass?.dispose();this.sun.shadow.mapPass=null;
  this.sun.shadow.mapSize.set(this.graphics.shadowSize,this.graphics.shadowSize);this.sun.shadow.radius=this.graphics.shadowRadius;this.sun.shadow.blurSamples=this.graphics.shadowSamples;this.sun.shadow.normalBias=this.graphics.high?.035:.065;
  this.highRenderer?.dispose();this.highRenderer=this.graphics.high?new HighQualityRenderer(renderer):null;
  if(this.profile.clouds)this.makeClouds();if(this.clouds)this.clouds.visible=this.profile.clouds;
  this.setShadowState(this.profile.shadows);this.prepare(this.world.scene);this.lastShadowPosition=null;
 }
 setShadowState(enabled){
  this.profile.shadows=enabled;if(this.shadowEnabled===enabled)return;this.shadowEnabled=enabled;const {renderer,scene}=this.world;renderer.shadowMap.enabled=enabled;this.sun.castShadow=enabled;this.prepare(scene);scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[]))m.needsUpdate=true;});if(!enabled){this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.sun.shadow.mapPass?.dispose();this.sun.shadow.mapPass=null;}renderer.shadowMap.needsUpdate=enabled;
 }
 update(s,dt,{tunnel=0,moving=false,clock}={}){
  const {world}=this,point=(world.drivePoint?.(s)??world.frame(s,world.driveOffset?.(s)??0).p).clone();this.elapsed+=Math.max(0,Math.min(dt,.1));
  const time=Number.isFinite(clock)?clock:(world.route?.night?20:9)*3600,solar=solarState(time);this.solar=solar;this.profile=lightingProfile(this.quality,solar.direction.y<-.03);this.setShadowState(!this.profile.simple&&solar.direction.y>.08);const {profile}=this;
  const inside=typeof tunnel==='number'?T.MathUtils.clamp(tunnel,0,1):tunnel?1:0;
  let cover=0;
  if(this.clouds?.visible){
   const drift=this.elapsed*2.4,cx=Math.floor((point.x-drift)/420),cz=Math.floor(point.z/420);
   for(const patch of this.patches){
    const tx=cx+patch.x,tz=cz+patch.z,h=hash(tx,tz),w=200+h*240,d=120+hash(tz,tx)*145;
    const x=tx*420+hash(tx+11,tz)*170+drift,z=tz*420+hash(tx,tz+19)*170,y=point.y+210+h*80;
    patch.mesh.position.set(x,y,z);patch.mesh.scale.set(w,d,1);patch.mesh.castShadow=false;
    const sx=x-(y-point.y)*solar.direction.x/Math.max(.08,solar.direction.y),sz=z-(y-point.y)*solar.direction.z/Math.max(.08,solar.direction.y);cover=Math.max(cover,Math.exp(-(((point.x-sx)/(w*.35))**2+((point.z-sz)/(d*.35))**2)));
   }
  }
  this.cover=T.MathUtils.lerp(this.cover,cover,1-Math.exp(-Math.max(dt,.001)*1.4));
  const day=lightingProfile(this.quality,false),warm=1-T.MathUtils.clamp(solar.direction.y/.5,0,1);
  this.sky.color.set('#6c81bb').lerp(new T.Color('#c7e3ff'),solar.daylight);this.sky.groundColor.set('#303342').lerp(new T.Color('#62563e'),solar.daylight);this.sun.color.set('#fff0d2').lerp(new T.Color('#ff9a53'),warm);
  this.sky.intensity=(.18+(day.sky-.18)*solar.daylight)*(1-inside*.65);this.sun.intensity=day.sun*solar.daylight*(1-this.cover*.48)*(1-inside*.88);this.tunnelEye=tunnelAdaptation(this.tunnelEye,inside>.5,dt,solar.daylight);world.renderer.toneMappingExposure=profile.exposure*this.tunnelEye.exposure;
  const skyColor=new T.Color('#0b1528').lerp(new T.Color('#8bbde0').lerp(new T.Color('#e5b59d'),warm*.45),solar.daylight);world.scene.background.copy(skyColor).lerp(new T.Color('#080b10'),inside*.98);world.scene.fog?.color.copy(new T.Color('#111c2d').lerp(new T.Color('#b3cbd9').lerp(new T.Color('#e1b7a3'),warm*.5),solar.daylight));
  if(this.cloudMaterial){this.cloudMaterial.color.set('#68748f').lerp(new T.Color('#ffffff').lerp(new T.Color('#f6c8ac'),warm*.35),solar.daylight);this.cloudMaterial.opacity=.42+solar.daylight*.52;}
  this.sunSprite.visible=solar.direction.y>-.025;this.sunSprite.position.copy(point).addScaledVector(solar.direction,1400);this.sunSpriteMaterial.color.copy(this.sun.color);world.headlight.intensity=(1-solar.daylight)*750+inside*450;
  if(world.externalView){world.scene.add(world.headlight,world.headlight.target);const nose=world.drivePoint?.(s)??world.frame(s,world.driveOffset?.(s)??0).p,ahead=world.drivePoint?.(s+75)??world.frame(s+75,world.driveOffset?.(s+75)??0).p;world.headlight.position.copy(nose);world.headlight.position.y+=2.2;world.headlight.target.position.copy(ahead);world.headlight.target.position.y+=.3;}
  else if(world.headlight.parent!==world.camera){world.camera.add(world.headlight,world.headlight.target);world.headlight.position.set(0,-.8,-.4);world.headlight.target.position.set(0,-1.6,-35);}
  for(const material of (world.materials instanceof Map?world.materials.values():Object.values(world.materials??{})))if(material.userData.windowLight)material.emissiveIntensity=(1-solar.daylight)*1.1;
  world.scene.fog?.color.lerp(new T.Color('#080b10'),inside*.94);
  this.windowEnvironment??=new TrainWindowEnvironment(world);this.windowEnvironment.update(dt,point);updateTrainWindowLighting(world.scene,solar.daylight,inside);
  const wet=weatherType(world.weather)!=='clear';
  if(wet){this.sun.intensity*=.22;this.sky.intensity*=.82;this.sunSprite.visible=false;const grey=new T.Color('#101820').lerp(new T.Color('#7d8892'),solar.daylight);world.scene.background.lerp(grey,1-inside);world.scene.fog?.color.lerp(grey,.9*(1-inside));this.sky.color.lerp(new T.Color('#96a0a8'),.85);if(this.cloudMaterial){this.cloudMaterial.color.copy(grey);this.cloudMaterial.opacity=.98;}}
  this.weatherScene??=new WeatherScene(world);this.weatherScene.update(dt,{type:world.weather,tunnel:inside,daylight:solar.daylight});
  followSunShadow(this.sun,point,solar.direction);
  this.shadowClock+=dt;if(profile.shadows&&(moving||this.shadowClock>.12||!this.lastShadowPosition||point.distanceTo(this.lastShadowPosition)>3||Math.abs(time-(this.lastShadowTime??time))>1)){
   world.renderer.shadowMap.needsUpdate=true;this.shadowClock=0;this.lastShadowPosition=point.clone();this.lastShadowTime=time;
  }
 }
 render(){if(this.highRenderer)this.highRenderer.render(this.world.scene,this.world.camera);else this.world.renderer.render(this.world.scene,this.world.camera);}
 dispose(){this.weatherScene?.dispose();this.windowEnvironment?.dispose();this.highRenderer?.dispose();this.sun.shadow.mapPass?.dispose();this.world.scene.remove(this.sun.target,this.sunSprite);if(this.clouds)this.world.scene.remove(this.clouds);this.map?.dispose();this.cloudGeometry?.dispose();this.cloudMaterial?.dispose();this.cloudDepth?.dispose();this.sunMap.dispose();this.sunSpriteMaterial.dispose();this.sun.shadow.map?.dispose();}
}
