// Keep the complete road corridors compact on disk and share each download.
const pending=new Map();
export async function loadRoadAsset(route){
 if(!route.roadAsset)return route;
 const url=route.roadAsset;
 if(!pending.has(url))pending.set(url,(async()=>{
  const response=await fetch(url+'?v=79');
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
