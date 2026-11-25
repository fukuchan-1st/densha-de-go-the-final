import {loadMappedBuildings} from './mapped-buildings.js?v=114';
import {loadStationWiring} from './station-wiring.js?v=114';
// Keep the complete road corridors compact on disk and share each download.
const pending=new Map();let parallelPending;
async function parallelRails(id){
 if(!parallelPending)parallelPending=(async()=>{const r=await fetch('./assets/parallel-railways.json.gz?v=90');if(!r.ok)throw new Error('並走線データを読み込めません');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes[0]!==31||bytes[1]!==139)return JSON.parse(new TextDecoder().decode(bytes));return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();})().catch(e=>{parallelPending=null;throw e;});
 return (await parallelPending).routes[id]??[];
}
export async function loadRoadAsset(route){
 route=await loadMappedBuildings(await loadStationWiring(route));
 if(route.id&&!route.osmParallelVersion&&!route.id.startsWith('toho-')&&route.id!=='toho'){route.neighborTracks=[...(route.neighborTracks??[]),...await parallelRails(route.id)];route.osmParallelVersion=90;}
 if(!route.roadAsset)return route;
 const url=route.roadAsset;
 if(!pending.has(url))pending.set(url,(async()=>{
  const response=await fetch(url+'?v=104');
  if(!response.ok)throw new Error('沿線道路データを読み込めません');
  const bytes=new Uint8Array(await response.arrayBuffer());
  // A host may already have decompressed a Content-Encoding: gzip response.
  if(bytes[0]!==31||bytes[1]!==139)return JSON.parse(new TextDecoder().decode(bytes)).roads;
  if(typeof DecompressionStream==='undefined')throw new Error('このブラウザーは圧縮された沿線道路データに対応していません。ブラウザーを更新してください。');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return (await new Response(stream).json()).roads;
 })().catch(error=>{pending.delete(url);throw error;}));
 route.roads=await pending.get(url);return route;
}
