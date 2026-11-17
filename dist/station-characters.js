import * as T from './assets/vendor/three.module.js';
import {decodeVertices,decodeIndices} from './model-format.js?v=88';
export const STATION_CHARACTERS=[{id:'reimu',station:'博麗前',name:'霊夢'},{id:'marisa',station:'霧雨',name:'魔理沙'},{id:'sakuya',station:'紅魔',name:'咲夜'}];
export function characterAnchors(route){
 if(!route.id?.startsWith('toho'))return [];
 return STATION_CHARACTERS.flatMap(character=>{const st=(route.sceneryStations??route.stations).find(s=>s.name===character.station);if(!st)return [];const platforms=route.stationLayouts?.[st.name]?.platforms??[],platform=platforms.find(p=>p.boarding!==false)??platforms[0],row=platform?.edges.reduce((best,x)=>Math.abs(x[0]+12)<Math.abs(best[0]+12)?x:best,platform.edges[0]);return [{...character,s:st.s-12,x:row?(row[1]+row[2])/2:-4.5,y:(platform?.height??0)+1.01}];});
}
export class StationCharacters{
 constructor(world){this.world=world;this.instances=new Map();this.loading=new Map();this.resources=[];this.anchors=characterAnchors(world.route);this.disposed=false;}
 async load(anchor){
  const base=new URL('./assets/station-characters/',import.meta.url);this.manifest??=fetch(new URL('manifest.json?v=88',base)).then(r=>r.json());const definition=(await this.manifest).models[anchor.id];
  const [bytes,indices]=await Promise.all([fetch(new URL(definition.file,base)).then(r=>r.arrayBuffer()),fetch(new URL(definition.indexFile,base)).then(r=>r.arrayBuffer())]);
  const values=decodeVertices(bytes,definition.componentType),buffer=new T.InterleavedBuffer(values,8),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.InterleavedBufferAttribute(buffer,3,0));geometry.setAttribute('normal',new T.InterleavedBufferAttribute(buffer,3,3));geometry.setAttribute('uv',new T.InterleavedBufferAttribute(buffer,2,6));geometry.setIndex(new T.BufferAttribute(decodeIndices(indices),1));const materials=[],textures=new Map();
  for(const item of definition.groups){const data=item.material;let texture=null;if(data.texture){if(!textures.has(data.texture)){const t=await new T.TextureLoader().loadAsync(new URL(data.texture,base).href);t.colorSpace=T.SRGBColorSpace;textures.set(data.texture,t);}texture=textures.get(data.texture);}const material=new T.MeshStandardMaterial({color:new T.Color().setRGB(...data.color),map:texture,roughness:.85,side:T.DoubleSide,opacity:data.alpha,transparent:data.alpha<.99,alphaTest:.12});geometry.addGroup(item.start,item.count,materials.length);materials.push(material);}
  this.resources.push(geometry,...materials,...textures.values());if(this.disposed){for(const resource of this.resources)resource.dispose();return;}
  const mesh=new T.Mesh(geometry,materials);mesh.name=anchor.name;mesh.userData.stationCharacter=anchor.id;mesh.userData.shadowCaster=true;const frame=this.world.frame(anchor.s,anchor.x);mesh.position.copy(frame.p);mesh.position.y+=anchor.y+(this.world.deckHeight?.(anchor.s)??0);mesh.rotation.y=frame.angle+Math.PI/2;this.world.atmosphere.prepare(mesh);this.world.scene.add(mesh);this.instances.set(anchor.id,mesh);
 }
 update(s){for(const anchor of this.anchors){const visible=Math.abs(anchor.s-s)<Math.min(900,this.world.drawDistance??1500);if(visible&&!this.instances.has(anchor.id)&&!this.loading.has(anchor.id))this.loading.set(anchor.id,this.load(anchor).catch(error=>console.warn('Station character:',error.message)));const mesh=this.instances.get(anchor.id);if(mesh)mesh.visible=visible;}}
 dispose(){this.disposed=true;for(const mesh of this.instances.values())this.world.scene.remove(mesh);for(const resource of this.resources)resource.dispose();this.resources=[];this.instances.clear();}
}
