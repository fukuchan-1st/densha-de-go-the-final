import test from 'node:test';
import assert from 'node:assert/strict';
import {notchKeyValue} from '../dist/driving-overlay.js';
import {controlsFor} from '../dist/final-model.js';
import {readFile} from 'node:fs/promises';
test('スライドバーにフォーカスしても上がEB側、下が力行側で車両の端を超えない',async()=>{
 const {trains}=JSON.parse(await readFile(new URL('../dist/assets/final/vehicle-recipes.json',import.meta.url),'utf8'));
 for(const recipe of trains){const c=controlsFor(recipe);let value=0;
  for(let i=0;i<30;i++)value=notchKeyValue('ArrowUp',value,c.min,c.max);assert.equal(value,c.min);
  for(let i=0;i<30;i++)value=notchKeyValue('ArrowDown',value,c.min,c.max);assert.equal(value,c.max);
  assert.equal(notchKeyValue('KeyX',value,c.min,c.max),0);assert.equal(notchKeyValue('Space',value,c.min,c.max),c.min);assert.equal(notchKeyValue('Enter',value,c.min,c.max),null);
 }
});
