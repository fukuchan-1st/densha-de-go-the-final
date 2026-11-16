import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/assets/vendor/three.module.js';
import {graphicsProfile,HighQualityRenderer} from '../dist/graphics-quality.js';
import {treeDetail} from '../dist/real-trees.js';
import {SceneAtmosphere} from '../dist/scene-atmosphere.js';
import {platformExtent} from '../dist/station-platform-length.js';
import {loadServiceRoutes} from './service-fixture.mjs';
import {serviceChoices,makeServiceRoute} from '../dist/train-selection.js';
test('high quality uses a different shadow algorithm and keeps light/standard budgets',()=>{
 const high=graphicsProfile('high',1),standard=graphicsProfile('standard',1),light=graphicsProfile('light',3);
 assert.equal(high.shadowType,T.VSMShadowMap);assert.equal(standard.shadowType,T.PCFSoftShadowMap);assert.notEqual(high.shadowType,standard.shadowType);
 assert.equal(high.shadowSize,4096);assert.equal(high.pixelRatio,1.5);assert.equal(graphicsProfile('high',4,2048).shadowSize,2048);assert.equal(graphicsProfile('high',4).pixelRatio,2);
 assert.equal(standard.shadowSize,2048);assert.equal(standard.pixelRatio,1);assert.equal(light.pixelRatio,1);
 assert.equal(treeDetail(120,false,true),0);assert.equal(treeDetail(120,false),1);
});
function renderer(hdr=true){return {extensions:{has:()=>hdr},capabilities:{maxSamples:4},toneMapping:T.ACESFilmicToneMapping,toneMappingExposure:.8,target:null,calls:[],getDrawingBufferSize:p=>p.set(1280,720),getRenderTarget(){return this.target;},setRenderTarget(t){this.target=t;},render(scene){this.calls.push({scene,target:this.target,tone:this.toneMapping});}};}
test('high renders linear color and sampled depth, then composites once with restored renderer state',()=>{
 const r=renderer(),pipeline=new HighQualityRenderer(r),scene=new T.Scene(),camera=new T.PerspectiveCamera();pipeline.render(scene,camera);
 assert.equal(r.calls.length,2);assert.equal(r.calls[0].target,pipeline.target);assert.equal(r.calls[0].tone,T.NoToneMapping);assert.equal(r.calls[1].target,null);
 assert.equal(r.toneMapping,T.ACESFilmicToneMapping);assert.equal(r.target,null);assert.equal(pipeline.target.texture.type,T.HalfFloatType);assert.equal(pipeline.target.samples,4);
 assert.equal(pipeline.target.depthTexture.type,T.UnsignedIntType);assert.equal(pipeline.target.width,1280);assert.equal(pipeline.material.uniforms.toneMappingExposure.value,.8);
 const disposed=[];pipeline.target.addEventListener('dispose',()=>disposed.push('target'));pipeline.material.addEventListener('dispose',()=>disposed.push('material'));pipeline.quad.geometry.addEventListener('dispose',()=>disposed.push('geometry'));pipeline.dispose();assert.equal(disposed.length,3);
});
test('render errors restore the previous target/tone mapping and missing float buffers have a safe color format',()=>{
 const r=renderer(false),previous=new T.WebGLRenderTarget();r.target=previous;const p=new HighQualityRenderer(r);assert.equal(p.target.texture.type,T.UnsignedByteType);
 r.render=()=>{throw Error('render failed');};assert.throws(()=>p.render(new T.Scene(),new T.PerspectiveCamera()));assert.equal(r.target,previous);assert.equal(r.toneMapping,T.ACESFilmicToneMapping);p.dispose();previous.dispose();
});
test('standard and light never allocate or invoke the high-quality postprocess',()=>{
 const r=renderer(),world={renderer:r,scene:new T.Scene(),camera:new T.Camera()},atmosphere={world,highRenderer:null};SceneAtmosphere.prototype.render.call(atmosphere);assert.equal(r.calls.length,1);assert.equal(r.calls[0].scene,world.scene);
});
test('Hakuba Shinano stops at Kamishiro in both directions; every Kamishiro platform is 80 m',async()=>{
 const routes=await loadServiceRoutes(),choices=serviceChoices.chuo.filter(x=>x[0]==='chuo-oito'&&x[1]==='383');assert.equal(choices.length,2);
 for(const x of choices){const route=makeServiceRoute(routes.get(x[0]),...x.slice(1));assert.ok(route.stations.some(st=>st.name==='神城'));for(const platform of route.stationLayouts['神城'].platforms){const [a,b]=platformExtent(route,{name:'神城'},platform,280);assert.equal(b-a,80);}}
 const tokyo=routes.get('chuo'),oito=routes.get('oito'),length=(r,name)=>{const p=r.stationLayouts[name].platforms.find(p=>p.boarding!==false),[a,b]=platformExtent(r,{name},p,280);return b-a;};
 assert.equal(length(tokyo,'東京'),240);assert.equal(length(oito,'豊科'),175);assert.ok(length(oito,'南小谷')<70);
 assert.deepEqual(platformExtent({id:'osaka'},{name:'大阪'},{edges:[[-100,0,3],[10,0,3]]},220),[-202,18]);
});
