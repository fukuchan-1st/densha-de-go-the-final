import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPanelImage} from '../dist/panel-image.js';
test('decodeが失敗してもload済みの正常画像を使える',async()=>{
 class LoadedImage{naturalWidth=800;naturalHeight=600;set src(value){queueMicrotask(()=>this.onload());}async decode(){throw Error('The source image cannot be decoded.');}}
 const image=await loadPanelImage('/221/6.png','221系',{ImageClass:LoadedImage});assert.equal(image.naturalWidth,800);
});
test('一度取得失敗した画像を再取得し、一時URLを解放する',async()=>{
 let attempts=0,fetches=0,revoked=0;
 class RetryImage{naturalWidth=800;naturalHeight=600;set src(value){queueMicrotask(()=>++attempts===1?this.onerror():this.onload());}}
 await loadPanelImage('/221/6.png','221系',{ImageClass:RetryImage,fetchImage:async(url,options)=>{fetches++;assert.equal(options.cache,'reload');return {ok:true,blob:async()=>({})};},urls:{createObjectURL:()=> 'blob:retry',revokeObjectURL:()=>revoked++}});
 assert.equal(attempts,2);assert.equal(fetches,1);assert.equal(revoked,1);
});
test('取得失敗を隠さず、車両名と画像名を表示する',async()=>{
 class FailedImage{set src(value){queueMicrotask(()=>this.onerror());}}
 await assert.rejects(loadPanelImage('/221/6.png','221系 / ApanelUL.png',{ImageClass:FailedImage,fetchImage:async()=>({ok:false,status:404})}),/221系 \/ ApanelUL.png.*HTTP 404/);
});
