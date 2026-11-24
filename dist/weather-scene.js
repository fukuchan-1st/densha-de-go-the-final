import * as T from './assets/vendor/three.module.js?v=113';
import {weatherType} from './weather.js?v=113';
import {WEATHER} from './weather.js?v=113';
import {snowCover} from './weather-operations.js?v=113';
import {SnowBanks} from './snow-banks.js?v=113';
const fraction=x=>x-Math.floor(x),seed=(i,k)=>fraction(Math.sin(i*127.1+k*311.7)*43758.5453);
export class WeatherScene{
 constructor(world){
  this.world=world;this.clock=0;this.group=new T.Group();this.group.name='weather-precipitation';world.scene.add(this.group);
  this.count=20000;this.rainGeometry=new T.BufferGeometry();this.rainPositions=new Float32Array(this.count*6);this.rainGeometry.setAttribute('position',new T.BufferAttribute(this.rainPositions,3));
  this.rain=new T.LineSegments(this.rainGeometry,new T.LineBasicMaterial({color:'#c5deeb',transparent:true,opacity:.52,depthWrite:false}));this.rain.frustumCulled=false;this.group.add(this.rain);
  this.snowGeometry=new T.BufferGeometry();this.snowPositions=new Float32Array(this.count*3);this.snowGeometry.setAttribute('position',new T.BufferAttribute(this.snowPositions,3));
  this.snow=new T.Points(this.snowGeometry,new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{brightness:{value:1}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(95./max(1.,-p.z),1.,7.);}',fragmentShader:'uniform float brightness; void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;gl_FragColor=vec4(vec3(brightness),.9*(1.-smoothstep(.2,.5,r)));}'}));this.snow.frustumCulled=false;this.group.add(this.snow);
 }
 update(dt,{type='clear',tunnel=0,daylight=1,s=0}={}){
  type=weatherType(type);this.clock+=Math.max(0,dt);const precipitation=WEATHER[type].precipitation;
  this.updateSnow(s,type,tunnel);this.banks??=new SnowBanks(this.world);this.banks.update(s,type);
  if(type==='thunderstorm'&&tunnel<.12){const phase=this.clock%13,flash=phase<.07?1:phase>.18&&phase<.24?.65:0;if(flash){this.world.scene.background.lerp(new T.Color('#e9edff'),flash*.8);this.world.atmosphere?.sky&&(this.world.atmosphere.sky.intensity+=flash*1.4);}}
  this.group.visible=Boolean(precipitation)&&Number(tunnel)<.12;
  this.rain.visible=precipitation==='rain';this.snow.visible=precipitation==='snow';if(!this.group.visible)return;
  const camera=this.world.camera;camera.getWorldPosition(this.group.position);const snow=precipitation==='snow',heavy=type==='heavySnow'||type==='thunderstorm'||type==='typhoon',count=this.world.quality==='light'?(snow?(heavy?6000:3250):(heavy?900:300)):(snow?(heavy?20000:11000):(heavy?3500:1000)),positions=snow?this.snowPositions:this.rainPositions,span=90,wind=type==='typhoon'?1.8:heavy?1.5:1;
  for(let i=0;i<count;i++){
   const x=(fraction(seed(i,1)+this.clock*(snow?.008:.025)*wind)-.5)*span,z=(fraction(seed(i,2)+this.clock*(type==='typhoon'?.06:0))-.5)*span,y=fraction(seed(i,3)-this.clock*(snow?.065:.9))*30-7;
   // Leave the cab volume clear. Snow drifts; rain forms fast slanting streaks.
   const xx=Math.abs(x)<2&&Math.abs(z)<3?x+5:x;
   if(snow){positions.set([xx+Math.sin(this.clock*.9+i)*.5,y,z],i*3);}else positions.set([xx,y,z,xx+(type==='typhoon'?1.2:.09),y-.85,z+(type==='typhoon'?.45:0)],i*6);
  }
  const geometry=snow?this.snowGeometry:this.rainGeometry;geometry.setDrawRange(0,snow?count:count*2);geometry.attributes.position.needsUpdate=true;
  this.rain.material.opacity=.28+.28*daylight;this.snow.material.uniforms.brightness.value=.52+.48*daylight;
 }
 updateSnow(s,type,tunnel){
  const cover=tunnel>.6?0:snowCover(this.world.route??this.world.sceneryRoute,s,type);
  if(!this.snowMaterials||this.clock>=(this.snowScan??0)){this.snowMaterials=new Set();this.world.scene.traverse(o=>{for(const material of(Array.isArray(o.material)?o.material:o.material?[o.material]:[]))if(material.isMeshStandardMaterial&&(material.name?.startsWith('textured-')||material.userData.windowLight))this.snowMaterials.add(material);});this.snowScan=this.clock+.5;}
  const materials=this.snowMaterials;
  for(const material of materials){
   if(!material?.isMeshStandardMaterial||!(material.name?.startsWith('textured-')||material.userData.windowLight))continue;
   if(!material.userData.snow105){
    const uniform={value:cover};material.userData.snow105=uniform;const previous=material.onBeforeCompile;
    material.onBeforeCompile=function(shader,renderer){previous?.call(this,shader,renderer);shader.uniforms.snowCover105=uniform;shader.vertexShader='varying float snowUp105;varying vec2 snowPos105;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsnowUp105=normalize(mat3(modelMatrix)*objectNormal).y;vec4 snowP105=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nsnowP105=instanceMatrix*snowP105;\n#endif\nsnowPos105=(modelMatrix*snowP105).xz;');shader.fragmentShader='uniform float snowCover105;varying float snowUp105;varying vec2 snowPos105;float snowHash105(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float snowNoiseFn105(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(snowHash105(i),snowHash105(i+vec2(1.,0.)),f.x),mix(snowHash105(i+vec2(0.,1.)),snowHash105(i+vec2(1.,1.)),f.x),f.y);}\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat snowNoise105=.6*snowNoiseFn105(snowPos105*.32)+.27*snowNoiseFn105(snowPos105*1.4)+.13*snowNoiseFn105(snowPos105*5.);float snowMask105=smoothstep(1.-snowCover105,1.03-snowCover105,snowNoise105)*smoothstep(.4,.9,snowUp105)*min(1.,snowCover105*3.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.88,.92,.95),snowMask105*.94);');};
    material.customProgramCacheKey=()=> 'snow105';material.needsUpdate=true;
   }
   material.userData.snow105.value=cover;
  }
 }
 dispose(){this.banks?.dispose();this.world.scene.remove(this.group);this.rainGeometry.dispose();this.snowGeometry.dispose();this.rain.material.dispose();this.snow.material.dispose();}
}
