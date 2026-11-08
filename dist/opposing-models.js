import * as T from './assets/vendor/three.module.js';
export function opposingVehicle(route={},s=0){
 const id=route.id??'tohoku';if(id==='yagan')return null;
 if(id==='yamanote')return 'e235';if(id==='osaka')return '323';if(id==='tokaido')return '221';if(id==='tohoku')return '701';
 if(id==='chuo'||id==='chuo-extended'){const takao=(route.sceneryStations??route.stations??[]).find(st=>st.name==='高尾')?.s;return takao!=null&&s<takao?'e233':'211';}
 if(/chuo|shinonoi|oito/.test(id))return '211';return '701';
}
export class ImportedTrafficModels{
 constructor(){this.models=new Map();this.loading=new Map();this.textures=new Map();this.materials=new Map();this.geometries=new Set();this.disposed=false;}
 async load(id){
  if(!id)return null;if(this.loading.has(id))return this.loading.get(id);
  const promise=this.loadModel(id);this.loading.set(id,promise);return promise;
 }
 async loadModel(id){
  this.manifest??=fetch(new URL('./assets/opposing/manifest.json',import.meta.url)).then(response=>{if(!response.ok)throw Error('対向列車データを取得できません');return response.json();});
  const definition=(await this.manifest).models[id];if(!definition)throw Error('対向列車 '+id+' がありません');
  const variants={};
  for(const [role,part]of Object.entries(definition.variants)){
   const response=await fetch(new URL('./assets/opposing/'+part.file,import.meta.url));if(!response.ok)throw Error('対向列車の車体を取得できません');
   const array=new Float32Array(await response.arrayBuffer()),interleaved=new T.InterleavedBuffer(array,8),group=new T.Group();
   for(const item of part.groups){
    const key=JSON.stringify(item.material);if(!this.materials.has(key)){
     const data=item.material;let texture;
     if(data.texture){if(!this.textures.has(data.texture)){const pending=new T.TextureLoader().loadAsync(new URL('./assets/opposing/'+data.texture,import.meta.url).href).then(value=>{value.colorSpace=T.SRGBColorSpace;return value;});this.textures.set(data.texture,pending);}texture=await this.textures.get(data.texture);}
     this.materials.set(key,new T.MeshBasicMaterial({color:new T.Color().setRGB(...data.color),map:texture,side:T.DoubleSide,opacity:data.alpha,transparent:data.alpha<.99,alphaTest:.4}));
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.InterleavedBufferAttribute(interleaved,3,0));geometry.setAttribute('normal',new T.InterleavedBufferAttribute(interleaved,3,3));geometry.setAttribute('uv',new T.InterleavedBufferAttribute(interleaved,2,6));geometry.setDrawRange(item.start,item.count);geometry.computeBoundingSphere();this.geometries.add(geometry);
    group.add(new T.Mesh(geometry,this.materials.get(key)));
   }variants[role]=group;
  }
  const model={...definition,variants};if(!this.disposed)this.models.set(id,model);else this.dispose();return model;
 }
 car(id,index,count){const model=this.models.get(id);if(!model)return null;const car=new T.Group(),body=model.variants[index===0?'head':index===count-1?'tail':'middle'].clone(true);if(['e233','211','221'].includes(id))body.rotation.y=Math.PI;car.add(body);return car;}
 dispose(){this.disposed=true;for(const geometry of this.geometries)geometry.dispose();for(const material of this.materials.values())material.dispose();for(const texture of this.textures.values())texture.then(value=>value.dispose()).catch(()=>{});this.geometries.clear();this.materials.clear();this.models.clear();}
}
