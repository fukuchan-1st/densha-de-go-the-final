import * as T from './assets/vendor/three.module.js?v=115';
export class TunnelExitLight{
 constructor(world){this.world=world;this.group=new T.Group();this.group.name='tunnel-exit-daylight';world.scene.add(this.group);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),g=c.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'rgba(255,251,224,.65)');g.addColorStop(.45,'rgba(236,248,255,.25)');g.addColorStop(1,'rgba(220,238,255,0)');c.fillStyle=g;c.fillRect(0,0,128,128);this.texture=new T.CanvasTexture(canvas);this.texture.colorSpace=T.SRGBColorSpace;
  this.glow=new T.Sprite(new T.SpriteMaterial({map:this.texture,transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false}));this.glow.scale.set(9,8,1);this.group.add(this.glow);
  this.light=new T.SpotLight('#e5f1ff',1600,110,.6,.85,1.4);this.group.add(this.light,this.light.target);
  this.geometry=new T.ConeGeometry(5,45,24,1,true);this.material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{strength:{value:.05}},vertexShader:'varying float along;void main(){along=(position.y+22.5)/45.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float along;uniform float strength;void main(){float a=sin(clamp(along,0.,1.)*3.14159);gl_FragColor=vec4(.78,.87,1.,strength*a*a);}'});this.beam=new T.Mesh(this.geometry,this.material);this.group.add(this.beam);this.group.visible=false;
 }
 update(s,daylight=1){const world=this.world,structures=world.route?.structures??world.routeStructures?.structures??[],tunnel=structures.find(t=>t.kind==='tunnel'&&s>=t.sStart&&s<=t.sEnd);this.group.visible=Boolean(tunnel);if(!tunnel)return;
  const point=ss=>world.drivePoint?.(ss)??world.frame(ss,world.driveOffset?.(ss)??0).p,end=point(tunnel.sEnd+.5).clone(),inside=point(tunnel.sEnd-8).clone(),direction=end.clone().sub(inside).normalize(),strength=(.04+.96*daylight)*(world.weather&&world.weather!=='clear'?.6:1);end.y+=3;
  this.glow.position.copy(end);this.glow.material.opacity=strength*.75;this.light.position.copy(end).addScaledVector(direction,2);this.light.target.position.copy(end).addScaledVector(direction,-45);this.light.target.position.y-=1.6;this.light.intensity=1700*strength;
  this.beam.position.copy(end).addScaledVector(direction,-22.5);this.beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);this.material.uniforms.strength.value=.055*strength;
 }
 dispose(){this.world.scene.remove(this.group);this.geometry.dispose();this.material.dispose();this.texture.dispose();this.glow.material.dispose();this.light.dispose?.();}
}
