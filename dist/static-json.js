import {gunzipSync} from './assets/vendor/fflate.module.js?v=118';

export async function readStaticJson(response){
 const bytes=new Uint8Array(await response.arrayBuffer());
 const json=bytes[0]===0x1f&&bytes[1]===0x8b?gunzipSync(bytes):bytes;
 return JSON.parse(new TextDecoder().decode(json));
}
