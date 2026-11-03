import {inflateSync} from './assets/vendor/fflate.module.js';

export async function loadVehicleRecipes(){const r=await fetch(new URL('./assets/final/vehicle-recipes.json',import.meta.url));if(!r.ok)throw Error('車両設定を読み込めません');return r.json();}

class BundledTrainPack {
 constructor(id){this.root=new URL(`./local-vehicles/${id}/`,import.meta.url);}
 objectURL(ref){
  const extension=ref.entryName.slice(ref.entryName.lastIndexOf('.')).toLowerCase();
  return new URL(`${ref.entryIndex}${extension}`,this.root).href;
 }
 async bytes(ref){
  const response=await fetch(this.objectURL(ref));
  if(!response.ok)throw Error('アプリ内の音源を読み込めません');
  return new Uint8Array(await response.arrayBuffer());
 }
}

export async function loadBundledTrainPacks(){
 if(!['127.0.0.1','localhost','[::1]'].includes(location.hostname))return new Map();
 const response=await fetch(new URL('./local-vehicles/manifest.json',import.meta.url));
 if(response.status===404)return new Map();
 if(!response.ok)throw Error('アプリ内の車両一覧を読み込めません');
 const {trains}=await response.json();
 return new Map(trains.map(id=>[id,new BundledTrainPack(id)]));
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
const fail=()=>{throw Error('指定の元ZIPと内容が一致しません。未変更の車両ZIPを選んでください。');};
const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export class LocalTrainPack {
 constructor(file,recipe,entries){this.file=file;this.recipe=recipe;this.entries=entries;this.urls=new Map();this.pending=new Map();this.disposed=false;}
 static async open(file,recipe){
  if(!file||file.size!==recipe.archive.size)fail();
  const tail=new Uint8Array(await file.slice(Math.max(0,file.size-65557)).arrayBuffer()),d=view(tail);let at=-1;
  for(let i=tail.length-22;i>=0;i--)if(d.getUint32(i,true)===0x06054b50&&i+22+d.getUint16(i+20,true)===tail.length){at=i;break;}
  if(at<0)fail();
  const count=d.getUint16(at+10,true),size=d.getUint32(at+12,true),offset=d.getUint32(at+16,true);
  if(d.getUint16(at+4,true)||d.getUint16(at+6,true)||count!==recipe.archive.entryCount||count===65535||size>16*1024*1024||offset+size>file.size)fail();
  const bytes=new Uint8Array(await file.slice(offset,offset+size).arrayBuffer()),c=view(bytes),entries=[];let p=0;
  while(p+46<=bytes.length){if(c.getUint32(p,true)!==0x02014b50)fail();const nl=c.getUint16(p+28,true),el=c.getUint16(p+30,true),cl=c.getUint16(p+32,true);if(p+46+nl+el+cl>bytes.length)fail();entries.push({flags:c.getUint16(p+8,true),method:c.getUint16(p+10,true),crc32:c.getUint32(p+16,true),compressedSize:c.getUint32(p+20,true),size:c.getUint32(p+24,true),localHeaderOffset:c.getUint32(p+42,true),rawName:bytes.slice(p+46,p+46+nl)});p+=46+nl+el+cl;}
  if(entries.length!==count||p!==bytes.length)fail();
  return new LocalTrainPack(file,recipe,entries);
 }
 async bytes(ref){
  if(this.disposed)throw Error('車両データは解除されています');if(!ref)throw Error('音源・画像が指定されていません');
  const e=this.entries[ref.entryIndex];
  if(!e||e.flags&1||e.method!==ref.method||e.size!==ref.size||e.compressedSize!==ref.compressedSize||e.crc32!==ref.crc32||e.localHeaderOffset!==ref.localHeaderOffset||!same(e.rawName,from64(ref.rawNameBase64))||e.size>80*1024*1024)fail();
  if(![0,8].includes(e.method))throw Error('未対応のZIP圧縮形式です');
  const h=new Uint8Array(await this.file.slice(e.localHeaderOffset,e.localHeaderOffset+30).arrayBuffer());if(h.length!==30||view(h).getUint32(0,true)!==0x04034b50)fail();const hd=view(h),nl=hd.getUint16(26,true),el=hd.getUint16(28,true);if(hd.getUint16(6,true)&1||hd.getUint16(8,true)!==e.method)fail();
  const names=new Uint8Array(await this.file.slice(e.localHeaderOffset+30,e.localHeaderOffset+30+nl).arrayBuffer());if(!same(names,e.rawName))fail();
  const start=e.localHeaderOffset+30+nl+el;if(start+e.compressedSize>this.file.size)fail();const compressed=new Uint8Array(await this.file.slice(start,start+e.compressedSize).arrayBuffer());let result;
  if(e.method===0)result=compressed;
  else{
   try{const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));result=new Uint8Array(await new Response(stream).arrayBuffer());}
   catch{result=inflateSync(compressed,{out:new Uint8Array(e.size)});}
  }
  if(result.length!==e.size||crc32(result)!==e.crc32)fail();return result;
 }
 async objectURL(ref){const key=ref.entryIndex;if(this.urls.has(key))return this.urls.get(key);if(this.pending.has(key))return this.pending.get(key);const promise=this.bytes(ref).then(bytes=>{if(this.disposed)throw Error('車両データは解除されています');const type=/\.png$/i.test(ref.entryName)?'image/png':/\.wav$/i.test(ref.entryName)?'audio/wav':'application/octet-stream',url=URL.createObjectURL(new Blob([bytes],{type}));this.urls.set(key,url);return url;}).finally(()=>this.pending.delete(key));this.pending.set(key,promise);return promise;}
 dispose(){this.disposed=true;for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();this.pending.clear();this.file=null;}
}
export function interpolateColumn(table,column,speed,defaultValue=0){const rows=table?.rows?.filter(r=>Number.isFinite(r[0])&&Number.isFinite(r[column+1]));if(!rows?.length)return defaultValue;if(speed<=rows[0][0])return rows[0][column+1];for(let i=1;i<rows.length;i++)if(speed<=rows[i][0]){const a=rows[i-1],b=rows[i];return a[column+1]+(b[column+1]-a[column+1])*(speed-a[0])/(b[0]-a[0]);}return rows.at(-1)[column+1];}
export {LocalCabPanel} from './final-panel.js';
export {LocalTrainAudio} from './final-audio.js';
