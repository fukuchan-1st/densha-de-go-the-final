import {decodeVertices} from '../dist/model-format.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from '../dist/assets/vendor/three.module.js';import {prepareCarDoors} from '../dist/train-doors.js';
test('splitting E233 passenger doors preserves the complete body surface and original UV coordinates',()=>{
const m=JSON.parse(fs.readFileSync('dist/assets/opposing/manifest.json')).models.e233.variants.head;
// Buffer byte offsets must be retained for the source vertex stream.
const raw=fs.readFileSync('dist/assets/opposing/'+m.file),arr=decodeVertices(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),m.componentType),ib=new T.InterleavedBuffer(arr,8),group=new T.Group(),owner={geometries:new Set(),materials:new Map()};
for(const item of m.groups){const g=new T.BufferGeometry();g.setAttribute('position',new T.InterleavedBufferAttribute(ib,3,0));g.setAttribute('normal',new T.InterleavedBufferAttribute(ib,3,3));g.setAttribute('uv',new T.InterleavedBufferAttribute(ib,2,6));g.setDrawRange(item.start,item.count);group.add(new T.Mesh(g,new T.MeshBasicMaterial()));}
function area(group){let area=0;group.traverse(o=>{if(!o.isMesh||o.userData.doorRecess)return;const g=o.geometry,p=g.getAttribute('position'),end=Math.min(p.count,g.drawRange.start+g.drawRange.count);for(let i=g.drawRange.start;i<end;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);area+=b.sub(a).cross(c.sub(a)).length()/2;}});return area;}
const before=area(group);prepareCarDoors(group,'e233',owner);assert.ok(Math.abs(area(group)-before)<1e-6);assert.ok(group.children.some(m=>m.userData.doorLeaf));for(const mesh of group.children){const uv=mesh.geometry.getAttribute('uv');assert.ok(Array.from(uv.data?.array??uv.array).every(Number.isFinite));}
});
