import * as T from './assets/vendor/three.module.js?v=118';
export const GRAPHICS_QUALITIES=['light','standard','high'];
export function graphicsProfile(quality='standard',pixelRatio=1,maxTextureSize=4096){
 const high=quality==='high',light=quality==='light';
 return {high,light,pixelRatio:high?Math.min(2,Math.max(1.5,pixelRatio)):Math.min(light?1:1.5,pixelRatio),
  shadowType:high?T.VSMShadowMap:T.PCFSoftShadowMap,shadowSize:Math.min(high?4096:2048,maxTextureSize),
  shadowRadius:high?6:3,shadowSamples:high?12:8,anisotropy:high?16:2,treeNear:high?180:light?40:75};
}
// A separate HDR/depth pipeline, allocated only for high quality. VSM shadows
// supply soft sun shadows; screen-space occlusion supplies local contact shade.
export class HighQualityRenderer{
 constructor(renderer){
  this.renderer=renderer;this.size=new T.Vector2();this.hdr=renderer.extensions.has('EXT_color_buffer_float');
  this.target=new T.WebGLRenderTarget(1,1,{type:this.hdr?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true,stencilBuffer:false,samples:Math.min(4,renderer.capabilities.maxSamples??0)});
  this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);this.target.texture.name='high-quality-linear-color';
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{
   colorMap:{value:this.target.texture},depthMap:{value:this.target.depthTexture},resolution:{value:this.size},inverseProjection:{value:new T.Matrix4()},projection:{value:new T.Matrix4()},toneMappingExposure:{value:1},bloomThreshold:{value:this.hdr?1.25:.85}},
   vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
   fragmentShader:`
    precision highp float;
    #include <tonemapping_pars_fragment>
    varying vec2 vUv;
    uniform sampler2D colorMap,depthMap;
    uniform vec2 resolution;
    uniform mat4 inverseProjection,projection;
    uniform float bloomThreshold;
    vec3 viewPosition(vec2 uv,float depth){vec4 p=inverseProjection*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);return p.xyz/p.w;}
    vec3 bright(vec2 uv){vec3 c=texture2D(colorMap,clamp(uv,vec2(0.0),vec2(1.0))).rgb;float l=max(c.r,max(c.g,c.b));return c*max(0.0,l-bloomThreshold)/max(l,0.001);}
    vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),c));}
    void main(){
     vec3 color=texture2D(colorMap,vUv).rgb;float depth=texture2D(depthMap,vUv).r,occlusion=0.0;
     if(depth<0.999999){
      vec3 p=viewPosition(vUv,depth),normal=normalize(cross(dFdx(p),dFdy(p)));if(normal.z<0.0)normal=-normal;
      float radius=1.5;
      vec2 screenRadius=vec2(projection[0][0],projection[1][1])*radius/(2.0*max(0.1,-p.z));
      screenRadius=min(screenRadius,vec2(70.0)/resolution);
      for(int i=0;i<24;i++){
       float angle=float(i)*2.39996323;float ring=sqrt((float(i)+0.5)/24.0);
       vec2 uv=vUv+vec2(cos(angle),sin(angle))*screenRadius*ring;
       float d=texture2D(depthMap,clamp(uv,vec2(0.0),vec2(1.0))).r;
       vec3 delta=viewPosition(uv,d)-p;float distance=length(delta);
       float horizon=max(0.0,dot(normal,delta/max(distance,0.001))-0.09);
       occlusion+=horizon*(1.0-smoothstep(0.15,radius,distance))*step(d,0.999999);
      }
      // Preserve visibility in deep shade: contact shadows darken indirect light
      // gradually, with no black outline on the sky or distant geometry.
      occlusion=clamp(occlusion/24.0*2.2,0.0,0.48);
     }
     vec3 glow=vec3(0.0);
     for(int j=0;j<8;j++){float a=float(j)*0.78539816;vec2 offset=vec2(cos(a),sin(a))/resolution;glow+=bright(vUv+offset*5.0)*0.065+bright(vUv+offset*16.0)*0.035;}
     color=color*(1.0-occlusion)+glow*0.2;
     gl_FragColor=vec4(srgb(ACESFilmicToneMapping(color)),1.0);
    }`});
  this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.quad.frustumCulled=false;this.scene.add(this.quad);
 }
 render(scene,camera){
  const r=this.renderer,size=r.getDrawingBufferSize(new T.Vector2());
  if(!size.equals(this.size)){this.size.copy(size);this.target.setSize(size.x,size.y);}
  this.material.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);this.material.uniforms.projection.value.copy(camera.projectionMatrix);this.material.uniforms.toneMappingExposure.value=r.toneMappingExposure;
  const target=r.getRenderTarget(),toneMapping=r.toneMapping;
  try{r.toneMapping=T.NoToneMapping;r.setRenderTarget(this.target);r.render(scene,camera);r.setRenderTarget(target);r.render(this.scene,this.camera);}
  finally{r.setRenderTarget(target);r.toneMapping=toneMapping;}
 }
 dispose(){this.target.dispose();this.quad.geometry.dispose();this.material.dispose();}
}
