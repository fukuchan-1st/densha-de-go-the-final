import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {stationVoiceData} from '../dist/station-voice-data.js';import {stationCueRefs,stationVoiceBank,driverWordRefs} from '../dist/station-voice.js';import {timingVoiceRefs,restrictionVoiceRefs} from '../dist/station-timing.js';
const base=new URL('../dist/assets/final/driver-voice/',import.meta.url);
test('new actors cover every station on Tohoku, Yagan and all Toho branches, including Shin-fujiwara',()=>{
 for(const [line,bank,prefix,files]of [['tohoku','kanko2','utd',['../dist/assets/route-stations.json']],['yagan','kanko0','uta',['../dist/assets/final/yagan-route.json']],['toho','kanko3','ute',['../dist/assets/final/toho-route.json','../dist/assets/final/toho-village-route.json','../dist/assets/final/toho-center-route.json']]]){
  assert.deepEqual(stationVoiceBank(line),[bank,prefix]);const names=new Set(files.flatMap(f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url),'utf8')).stations.map(s=>s.name)));
  for(const name of names){const file=stationVoiceData[line].stations[name];assert.ok(file,name);assert.ok(file.includes('actor84'),line+' '+name);assert.ok(fs.statSync(new URL(file,base)).size>1000);for(const kind of ['pass','arrival']){const refs=timingVoiceRefs(line,name,kind,17);assert.ok(refs.length>=4);assert.ok(refs.slice(1).every(r=>r.driverVoiceFile.includes(bank)||r.driverVoiceFile.includes(line==='toho'?'tokaido':line==='yagan'?'yamanote':'osaka')));}}
  assert.ok(stationCueRefs(line,[...names][0],'approach',2).length>=2);assert.ok(restrictionVoiceRefs(line,65)[0].driverVoiceFile.includes(bank));assert.ok(driverWordRefs(line,['doorsClosed','departure']).every(r=>r.driverVoiceFile.includes(bank)));
 }
});
test('all imported station recordings match supplied source bytes and reference existing files',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('station-actor-import-v84.json',base),'utf8'));assert.equal(manifest.clips.length,63);assert.deepEqual(manifest.pending,[]);
 for(const clip of manifest.clips)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(clip.file,base))).digest('hex'),clip.sha256);
});

 test('legacy arrival approach and departure queues start with the real station-name recording',async()=>{
  const {SoundEngine}=await import('../dist/assets/audio/sound-engine.js');const engine=new SoundEngine(),loaded=[];
  engine.ready=true;engine.routeCueBuffer=async file=>{loaded.push(file);return file;};engine.playEffectBuffer=async()=>true;
  await engine.callRouteCue('701-approach',1);assert.ok(loaded[0].endsWith(stationVoiceData.tohoku.stations['高久']));
  loaded.length=0;await engine.callStation('departure',{name:'黒磯'});assert.ok(loaded[0].endsWith(stationVoiceData.tohoku.stations['黒磯']));assert.equal(loaded.length,2);
 });
