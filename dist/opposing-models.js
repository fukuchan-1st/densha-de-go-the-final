import {addTrainWindowReflections} from './train-window-reflections.js?v=112c';
import {tint6050Bogies} from './vehicle-details.js?v=112c';
import {carVariant} from './train-formation.js?v=112c';
import {decodeVertices,decodeIndices} from './model-format.js?v=112c';
import {repair701Body} from './701-body-repair.js?v=112c';
import * as T from './assets/vendor/three.module.js?v=112c';
import {stationLeg} from './geographic-sections.js?v=112c';
const chuoOrder=["東京", "神田", "御茶ノ水", "四ツ谷", "新宿", "中野", "高円寺", "阿佐ケ谷", "荻窪", "西荻窪", "吉祥寺", "三鷹", "武蔵境", "東小金井", "武蔵小金井", "国分寺", "西国分寺", "国立", "立川", "日野", "豊田", "八王子", "西八王子", "高尾", "相模湖", "藤野", "上野原", "四方津", "梁川", "鳥沢", "猿橋", "大月", "初狩", "笹子", "甲斐大和", "勝沼ぶどう郷", "塩山", "東山梨", "山梨市", "春日居町", "石和温泉", "酒折", "甲府", "竜王", "塩崎", "韮崎", "新府", "穴山", "日野春", "長坂", "小淵沢", "信濃境", "富士見", "すずらんの里", "青柳", "茅野", "上諏訪", "下諏訪", "岡谷", "みどり湖", "塩尻", "広丘", "村井", "平田", "南松本", "松本"];
const rank=new Map(chuoOrder.map((name,i)=>[name,i]));
const oitoNames=new Set('松本 北松本 島内 島高松 梓橋 一日市場 中萱 南豊科 豊科 柏矢町 穂高 有明 安曇追分 細野 北細野 信濃松川 安曇沓掛 信濃常盤 南大町 信濃大町 北大町 信濃木崎 稲尾 海ノ口 簗場 ヤナバ前 南神城 神城 飯森 白馬 信濃森上 白馬大池 千国 南小谷'.split(' '));
const shinonoiNames=new Set('松本 田沢 明科 西条 坂北 聖高原 冠着 姨捨 稲荷山 篠ノ井 今井 川中島 安茂里 長野'.split(' '));
const omeBranchNames=new Set('立川 西立川 東中神 中神 昭島 拝島 牛浜 福生 羽村 小作 河辺 東青梅 青梅 宮ノ平 日向和田 石神前 二俣尾 軍畑 沢井 御嶽 川井 古里 鳩ノ巣 白丸 奥多摩 熊川 東秋留 秋川 武蔵引田 武蔵増戸 武蔵五日市'.split(' '));
export function opposingCarCount(route,s,vehicle,fallback){if(vehicle!=='e233')return fallback;if(route.id==='ome-okutama')return 4;if(['itsukaichi','chuo-itsukaichi'].includes(route.id))return 6;return fallback;}
export function opposingVehicles(route={},s=0){
 const id=route.id??'tohoku';if(id==='yagan')return [];
 if(id==='yamagata')return ['719-5000'];if(id==='yamanote')return ['e235'];if(id==='osaka')return ['323'];if(id==='tokaido')return ['221'];if(id==='tohoku')return ['701'];
 const leg=stationLeg(route,s),names=leg.map(x=>x.name);if(['ome','ome-okutama','itsukaichi'].includes(id)||names.length===2&&names.every(n=>omeBranchNames.has(n)))return ['e233'];
 if(names.length===2&&names.every(x=>oitoNames.has(x))){const all=route.sceneryStations??route.stations,omachi=all.find(x=>x.name==='信濃大町'),matsumoto=all.find(x=>x.name==='松本');let north;
  if(omachi&&matsumoto)north=(s-omachi.s)*(matsumoto.s-omachi.s)<0;
  else north=names.some(x=>['北大町','信濃木崎','稲尾','海ノ口','簗場','南神城','神城','飯森','白馬','信濃森上','白馬大池','千国','南小谷'].includes(x));
  return north?['e127','e353','383']:['211','e353','e127','383'];
 }
 if(names.length===2&&names.every(x=>shinonoiNames.has(x)))return ['211','383','e127'];
 if(names.length===2&&names.every(x=>rank.has(x))){const n=names.reduce((sum,x)=>sum+rank.get(x),0)/2;
  if(n<rank.get('高尾'))return ['e233','e353'];
  if(n<rank.get('大月'))return ['211','e131','e233','e353'];
  if(n<rank.get('上諏訪'))return ['211','e131','e353'];
  if(n<rank.get('塩尻'))return ['211','e131','e353','313'];
  return ['211','e131','e353','313','383','e127'];
 }
 if(/chuo|shinonoi|oito/.test(id))return ['211'];return ['701'];
}
export function opposingVehicle(route={},s=0,selection=0){const pool=opposingVehicles(route,s);return pool.length?pool[((selection%pool.length)+pool.length)%pool.length]:null;}
export class ImportedTrafficModels{
 constructor(){this.models=new Map();this.loading=new Map();this.textures=new Map();this.materials=new Map();this.geometries=new Set();this.disposed=false;}
 async load(id){
  if(!id)return null;if(this.loading.has(id))return this.loading.get(id);
  const promise=this.loadModel(id);this.loading.set(id,promise);return promise;
 }
 async loadModel(id){
  this.manifest??=fetch(new URL('./assets/opposing/manifest.json?v=97final',import.meta.url)).then(response=>{if(!response.ok)throw Error('対向列車データを取得できません');return response.json();});
  const definition=(await this.manifest).models[id];if(!definition)throw Error('対向列車 '+id+' がありません');
  const variants={};
  for(const [role,part]of Object.entries(definition.variants)){
   const response=await fetch(new URL('./assets/opposing/'+part.file+'?v=88',import.meta.url));if(!response.ok)throw Error('対向列車の車体を取得できません');
   const index=part.indexFile?decodeIndices(await (await fetch(new URL('./assets/opposing/'+part.indexFile+'?v=88',import.meta.url))).arrayBuffer()):null;
   const array=decodeVertices(await response.arrayBuffer(),part.componentType),interleaved=new T.InterleavedBuffer(array,part.stride??8),group=new T.Group();
   for(const item of part.groups){
    const key=JSON.stringify(item.material);if(!this.materials.has(key)){
     const data=item.material;let texture;
     if(data.texture){if(!this.textures.has(data.texture)){const pending=new T.TextureLoader().loadAsync(new URL('./assets/opposing/'+data.texture,import.meta.url).href).then(value=>{value.colorSpace=T.SRGBColorSpace;return value;});this.textures.set(data.texture,pending);}texture=await this.textures.get(data.texture);}
     this.materials.set(key,new T.MeshStandardMaterial({roughness:.68,metalness:.13,color:new T.Color().setRGB(...data.color),map:texture??null,side:T.DoubleSide,opacity:data.alpha,transparent:data.alpha<.99,alphaTest:.4}));
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.InterleavedBufferAttribute(interleaved,3,0));if(part.stride!==5)geometry.setAttribute('normal',new T.InterleavedBufferAttribute(interleaved,3,3));geometry.setAttribute('uv',new T.InterleavedBufferAttribute(interleaved,2,part.stride===5?3:6));if(index)geometry.setIndex(new T.BufferAttribute(index,1));geometry.setDrawRange(item.start,item.count);if(part.stride===5)geometry.computeVertexNormals();geometry.computeBoundingSphere();this.geometries.add(geometry);
    const mesh=new T.Mesh(geometry,this.materials.get(key));mesh.userData.shadowCaster=true;group.add(mesh);
   }variants[role]=group;
  }
  if(id==='701'&&definition.frontRepair){const loader=new T.TextureLoader(),load=async file=>{const texture=await loader.loadAsync(new URL('./assets/opposing/'+file,import.meta.url).href);texture.colorSpace=T.SRGBColorSpace;this.textures.set('701-repair-'+file,Promise.resolve(texture));return texture;};const [front,under]=await Promise.all([load(definition.frontRepair.front),load(definition.frontRepair.under)]);for(const group of Object.values(variants))repair701Body(group,front,under,this);}
  if(id==='6050')for(const body of Object.values(variants))tint6050Bogies(body,this);
  const model={...definition,variants};if(!this.disposed)this.models.set(id,model);else this.dispose();return model;
 }
 car(id,index,count,options){const model=this.models.get(id);if(!model)return null;const spec=carVariant(model,id,index,count,options),car=new T.Group(),body=model.variants[spec.role].clone(true);addTrainWindowReflections(body,this,id,spec.role);body.rotation.y=spec.rotation;body.userData.variant=spec.role;car.add(body);return car;}
 dispose(){this.disposed=true;for(const geometry of this.geometries)geometry.dispose();for(const material of this.materials.values())material.dispose();for(const texture of this.textures.values())texture.then(value=>value.dispose()).catch(()=>{});this.geometries.clear();this.materials.clear();this.models.clear();}
}
