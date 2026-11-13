import test from 'node:test';import assert from 'node:assert/strict';import {roadPath,sampleRoad,holdAtCrossing,roadHeightOffset,segmentHitsFootprint} from '../dist/road-scenery.js';
test('silent road vehicles follow the supplied polyline at consistent distance',()=>{const path=roadPath([[0,0],[30,0],[30,40]]);assert.equal(path.length,70);assert.deepEqual(sampleRoad(path,15),{x:15,z:0,dx:1,dz:0});assert.deepEqual(sampleRoad(path,50),{x:30,z:20,dx:0,dz:1});});
test('crossing approach vehicles stop before lowered barriers in either direction and resume after opening',()=>{assert.equal(holdAtCrossing(40,50,50,true,1),43);assert.equal(holdAtCrossing(60,50,50,true,-1),57);assert.equal(holdAtCrossing(40,50,50,false,1),50);assert.equal(holdAtCrossing(52,54,50,true,1),54);});

test('roads and cars remain at street level under elevated Yamanote and Chuo rails',()=>{assert.equal(roadHeightOffset(false,4.8),-.1);assert.equal(roadHeightOffset(true,4.8),-.1);assert.equal(roadHeightOffset(true,0),6);});

test('buildings leave mapped road footprints clear',()=>{assert.equal(segmentHitsFootprint([-20,0],[20,0],12,18),true);assert.equal(segmentHitsFootprint([-20,20],[20,20],12,18),false);assert.equal(segmentHitsFootprint([0,0],[0,2],12,18),true);});
