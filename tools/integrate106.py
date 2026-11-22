from pathlib import Path
import re
D=Path(__file__).resolve().parents[1]/'dist';p=D/'final-app.js';t=p.read_text(encoding='utf8')
t="import {TOHOKU_TRAIN,loadTohokuRoute} from './tohoku-integration.js?v=106';\nimport {TohokuAudio} from './tohoku-audio.js?v=106';\nimport {CabPanel} from './cab-panel.js?v=106';\n"+t
t=t.replace("const TOHOKU_TRAIN={id:'701',name:'701系1500番台',playableSpecs:{carCount:2}};",'')
t=t.replace("short:'701',legacy:true","short:'701'")
t=t.replace("META[selected].legacy?TOHOKU_TRAIN:recipes.trains.find(t=>t.id===(chosenVehicle??META[selected].vehicle))","(chosenVehicle??META[selected].vehicle)==='701'?TOHOKU_TRAIN:recipes.trains.find(t=>t.id===(chosenVehicle??META[selected].vehicle))")
start=t.index('  if(meta.legacy){',t.index('async function start('));end=t.index("  if(mode==='menu')",start);t=t[:start]+t[end:]
t=t.replace('pack=packs.get(train.id);',"pack=train.id==='701'?{}:packs.get(train.id);")
t=t.replace('new LocalTrainAudio(train,pack,',"new (train.id==='701'?TohokuAudio:LocalTrainAudio)(train,pack,")
t=t.replace('LocalCabPanel.load($(\'cab\'),train,pack)',"train.id==='701'?CabPanel.load($('cab')):LocalCabPanel.load($('cab'),train,pack)")
t=t.replace("['e235','e233','323','207','6050'].includes(train.id)","['e235','e233','323','207','6050','701'].includes(train.id)")
t=t.replace("if(meta.legacy)return {id:meta.id,name:meta.name,length:TOHOKU_STATIONS.at(-1).s,stations:TOHOKU_STATIONS};","if(meta.id==='tohoku')return loadTohokuRoute();")
old="if(data.legacy){location.href='./tohoku.html?v=79&drive=1&replay=1&direction='+data.direction+'&station='+data.startIndex+'&end='+data.endIndex;return;}"
new="if(data.legacy){const base=routes.find(r=>r.id==='tohoku'),option=serviceChoices.tohoku.find(x=>!!x[3]?.reverse===(data.direction==='reverse'))?.[3];const r=makeServiceRoute(base,'701','普通',option);data={...data,legacy:false,route:r,train:TOHOKU_TRAIN,timetable:data.timetable,samples:data.samples.map(x=>({...x,startIndex:x.startIndex??data.startIndex,endIndex:x.endIndex??data.endIndex,clockStart:x.clockStart??28800,errors:[]}))};}"
assert old in t;t=t.replace(old,new)
# Old deep links now enter the same game without the legacy redirect hop.
needle=' setupTrainSelection();\n displayMenu();'
replacement=needle+"\n const entry=new URLSearchParams(location.search);if(entry.get('drive')==='1'&&entry.get('route')==='tohoku'){gameShell.hide();if(entry.get('replay')==='1'){await playSavedReplay(await loadReplay());}else{openTrainSelection();const choice=serviceChoices.tohoku.findIndex(x=>!!x[3]?.reverse===(entry.get('direction')==='reverse'));$('trainChoice').value=String(Math.max(0,choice));applyTrainChoice();detailEndIndex=Math.max(1,Math.min(23,Number(entry.get('end')??23)));await start(Math.max(0,Math.min(detailEndIndex-1,Number(entry.get('station')??0))));}}"
assert needle in t;t=t.replace(needle,replacement);p.write_text(t,encoding='utf8')
# Keep bookmarked legacy URLs and duty ranges usable, including extensionless hosting.
(D/'tohoku.html').write_text('''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>東北本線 · Trackfinity Railways</title><p>共通の運転画面を準備しています…</p><script>const q=new URLSearchParams(location.search);q.set('route','tohoku');q.set('v','106');location.replace('./?'+q);</script><noscript><a href="./?route=tohoku">共通画面へ</a></noscript></html>''',encoding='utf8')
# Include rural rendering / headlight support on the unified real corridor.
p=D/'final-world.js';t=p.read_text(encoding='utf8').replace("this.rural=['yamagata'","this.rural=['tohoku','yamagata'");p.write_text(t,encoding='utf8')
# Refresh only module paths (never the .js prefix of .json resources).
for p in D.rglob('*.js'):
 if 'vendor' in p.parts:continue
 t=p.read_text(encoding='utf8');new=re.sub(r"((?:\./|\.\./)[^'\"\s?]+\.js)(?=[?'\"])(?:\?v=[^'\"\s]+)?",r'\1?v=106',t)
 if new!=t:p.write_text(new,encoding='utf8')
p=D/'index.html';t=p.read_text(encoding='utf8').replace('final-app.js?v=105','final-app.js?v=106');p.write_text(t,encoding='utf8')
print('Integrated Tohoku with common driving flow')
