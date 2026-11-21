import * as T from './assets/vendor/three.module.js';
import {weatherType} from './weather.js?v=100';
const fraction=x=>x-Math.floor(x),seed=(i,k)=>fraction(Math.sin(i*127.1+k*311.7)*43758.5453);
export class WeatherScene{
 constructor(world){
  this.world=world;this.clock=0;this.group=new T.Group();this.group.name='weather-precipitation';world.scene.add(this.group);
  this.count=2200;this.rainGeometry=new T.BufferGeometry();this.rainPositions=new Float32Array(this.count*6);this.rainGeometry.setAttribute('position',new T.BufferAttribute(this.rainPositions,3));
  this.rain=new T.LineSegments(this.rainGeometry,new T.LineBasicMaterial({color:'#c5deeb',transparent:true,opacity:.52,depthWrite:false}));this.rain.frustumCulled=false;this.group.add(this.rain);
  this.snowGeometry=new T.BufferGeometry();this.snowPositions=new Float32Array(this.count*3);this.snowGeometry.setAttribute('position',new T.BufferAttribute(this.snowPositions,3));
  this.snow=new T.Points(this.snowGeometry,new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{brightness:{value:1}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(95./max(1.,-p.z),1.,7.);}',fragmentShader:'uniform float brightness; void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;gl_FragColor=vec4(vec3(brightness),.9*(1.-smoothstep(.2,.5,r)));}'}));this.snow.frustumCulled=false;this.group.add(this.snow);
 }
 update(dt,{type='clear',tunnel=0,daylight=1}={}){
  type=weatherType(type);this.clock+=Math.max(0,dt);this.group.visible=type!=='clear'&&Number(tunnel)<.12;
  this.rain.visible=type==='rain';this.snow.visible=type==='snow';if(!this.group.visible)return;
  const camera=this.world.camera;camera.getWorldPosition(this.group.position);const snow=type==='snow',count=this.world.quality==='light'?(snow?650:300):(snow?this.count:1000),positions=snow?this.snowPositions:this.rainPositions,span=90;
  for(let i=0;i<count;i++){
   const x=(fraction(seed(i,1)+this.clock*(snow?.008:.025))-.5)*span,z=(seed(i,2)-.5)*span,y=fraction(seed(i,3)-this.clock*(snow?.065:.9))*30-7;
   // Leave the cab volume clear. Snow drifts; rain forms fast slanting streaks.
   const xx=Math.abs(x)<2&&Math.abs(z)<3?x+5:x;
   if(snow){positions.set([xx+Math.sin(this.clock*.9+i)*.5,y,z],i*3);}else positions.set([xx,y,z,xx+.09,y-.85,z],i*6);
  }
  const geometry=snow?this.snowGeometry:this.rainGeometry;geometry.setDrawRange(0,snow?count:count*2);geometry.attributes.position.needsUpdate=true;
  this.rain.material.opacity=.28+.28*daylight;this.snow.material.uniforms.brightness.value=.52+.48*daylight;
 }
 dispose(){this.world.scene.remove(this.group);this.rainGeometry.dispose();this.snowGeometry.dispose();this.rain.material.dispose();this.snow.material.dispose();}
}
