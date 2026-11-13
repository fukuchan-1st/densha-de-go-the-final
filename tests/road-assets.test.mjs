import test from 'node:test';import assert from 'node:assert/strict';import {gzipSync} from 'node:zlib';
import {loadRoadAsset} from '../dist/road-assets.js';
test('compressed OSM corridors load once and survive automatic HTTP decompression',async()=>{
 const original=globalThis.fetch;let requests=0;const roads=[{s:123,points:[[1,2],[3,4]]}];
 try{
  globalThis.fetch=async()=>{requests++;return new Response(gzipSync(JSON.stringify({roads})));};
  const [a,b]=await Promise.all([loadRoadAsset({roadAsset:'test-compressed'}),loadRoadAsset({roadAsset:'test-compressed'})]);assert.equal(requests,1);assert.deepEqual(a.roads,roads);assert.equal(a.roads,b.roads);
  globalThis.fetch=async()=>new Response(JSON.stringify({roads}));assert.deepEqual((await loadRoadAsset({roadAsset:'test-decoded'})).roads,roads);
  globalThis.fetch=async()=>new Response('',{status:503});await assert.rejects(loadRoadAsset({roadAsset:'test-retry'}));globalThis.fetch=async()=>new Response(JSON.stringify({roads}));assert.deepEqual((await loadRoadAsset({roadAsset:'test-retry'})).roads,roads);
 }finally{globalThis.fetch=original;}
});
