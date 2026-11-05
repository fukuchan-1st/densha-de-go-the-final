import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleRouteCurve} from '../dist/route-curve.js';
test('曲線は元の位置を通り、制御点の両側で接線が滑らかにつながる',()=>{
 const p=[[0,0,0,0],[20,2,20,1],[80,35,70,3],[120,70,85,4]];
 for(const row of p)assert.deepEqual(sampleRouteCurve(p,row[0]),row.slice(1));
 for(const s of [20,80]){
  const a=sampleRouteCurve(p,s-.001),b=sampleRouteCurve(p,s),c=sampleRouteCurve(p,s+.001);
  for(let i=0;i<3;i++)assert.ok(Math.abs((b[i]-a[i])/.001-(c[i]-b[i])/.001)<.001);
 }
 assert.deepEqual(sampleRouteCurve([[0,0,0],[100,0,100]],50),[0,50,0]);
 assert.ok(sampleRouteCurve(p,125).every(Number.isFinite));
});
