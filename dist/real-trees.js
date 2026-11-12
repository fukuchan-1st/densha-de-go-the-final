import * as T from './assets/vendor/three.module.js';
import {decodeVertices} from './model-format.js?v=72';
export function treeVariant(value){return Math.min(4,Math.max(0,Math.floor(value*5)));}
export function treeDetail(distance,light=false){return distance<(light?40:75)?0:1;}
// Five source meshes, shared materials, and per-instance near/far selection.
export class RealTrees{
 constructor(world){this.world=world;this.batches=new Set();this.resources=[];this.ready=this.load();this.lastUpdate=-Infinity;}
 async load(){
  const base='./assets/trees/',response=await fetch(base+'manifest.json?v=74');if(!response.ok)throw Error('Tree manifest could not be loaded');this.manifest=await response.json();
  const loader=new T.TextureLoader(),atlas=await loader.loadAsync(base+this.manifest.atlas),normal=await loader.loadAsync(base+this.manifest.normal);atlas.colorSpace=T.SRGBColorSpace;atlas.flipY=false;normal.flipY=false;atlas.anisotropy=2;
  this.material=new T.MeshStandardMaterial({map:atlas,normalMap:normal,normalScale:new T.Vector2(.45,.45),alphaTest:.42,side:T.DoubleSide,roughness:.92});this.resources.push(atlas,normal,this.material);
  this.geometries=await Promise.all(this.manifest.models.map(model=>Promise.all(model.levels.map(async level=>{
   const [vertices,indices]=await Promise.all([fetch(base+level.file).then(r=>r.arrayBuffer()),fetch(base+level.indices).then(r=>r.arrayBuffer())]);
   const data=decodeVertices(vertices,'float16'),buffer=new T.InterleavedBuffer(data,8),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.InterleavedBufferAttribute(buffer,3,0));geometry.setAttribute('normal',new T.InterleavedBufferAttribute(buffer,3,3));geometry.setAttribute('uv',new T.InterleavedBufferAttribute(buffer,2,6));geometry.setIndex(new T.BufferAttribute(new Uint16Array(indices),1));geometry.computeBoundingSphere();this.resources.push(geometry);return geometry;
  }))));
 }
 add(group,items){
  const batch={group,items,meshes:[],disposed:false};this.batches.add(batch);
  this.ready.then(()=>{if(this.disposed||batch.disposed)return;for(let variant=0;variant<5;variant++)for(let detail=0;detail<2;detail++){
   const selected=items.filter(a=>a.variant===variant);if(!selected.length)continue;
   const mesh=new T.InstancedMesh(this.geometries[variant][detail],this.material,selected.length);mesh.userData.shadowCaster=detail===0;this.world.atmosphere?.prepare(mesh);mesh.count=0;mesh.raycast=()=>{};mesh.userData.sharedTreeResource=true;mesh.userData.ignoreOuterCamera=true;group.add(mesh);batch.meshes.push({mesh,selected,detail});
  }this.fill(batch,this.lastS??0);}).catch(error=>{if(!this.warned){console.warn('Real tree assets:',error.message);this.warned=true;}});
  return batch;
 }
 fill(batch,s){
  const dummy=new T.Object3D(),color=new T.Color();for(const {mesh,selected,detail} of batch.meshes){let count=0;for(const a of selected){const distance=Math.hypot(a.s-s,a.x-(this.world.driveOffset?.(s)??0));if(distance>Math.min(this.world.drawDistance??1500,1500)+150||treeDetail(distance,this.world.quality==='light')!==detail)continue;const f=this.world.frame(a.s,a.x);dummy.position.copy(f.p);dummy.position.y+=a.y??0;dummy.scale.set(a.h*1.25,a.h,a.h*1.25);dummy.rotation.set(0,a.rotation??0,0);dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);color.setScalar(a.shade??1);mesh.setColorAt(count,color);count++;}mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;if(count)mesh.computeBoundingSphere();}
 }
 update(s){this.lastS=s;const now=performance.now();if(now-this.lastUpdate<250&&Math.abs(s-(this.updatedS??s))<60)return;this.lastUpdate=now;this.updatedS=s;for(const batch of this.batches)this.fill(batch,s);}
 release(group){for(const batch of this.batches)if(batch.group===group){batch.disposed=true;for(const {mesh} of batch.meshes){group.remove(mesh);mesh.dispose();}this.batches.delete(batch);}}
 dispose(){this.disposed=true;for(const batch of [...this.batches])this.release(batch.group);this.ready.finally(()=>{for(const resource of this.resources)resource.dispose();}).catch(()=>{});}
}
