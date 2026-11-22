from pathlib import Path
import re
D=Path(__file__).resolve().parents[1]/'dist'
for p in D.rglob('*.js'):
 if 'vendor' in p.parts:continue
 t=p.read_text(encoding='utf8');new=re.sub(r"((?:\./|\.\./)[^'\"\s?]+\.js)(?=[?'\"])(?:\?v=[^'\"\s]+)?",r'\1?v=105',t)
 if p.name=='mapped-buildings.js':new=new.replace('.json.gz?v=104','.json.gz?v=105')
 if new!=t:p.write_text(new,encoding='utf8')
p=D/'scene.js';t=p.read_text(encoding='utf8').replace("ground.rotation.x=-Math.PI/2","ground.material.name='textured-ground';ground.rotation.x=-Math.PI/2");p.write_text(t,encoding='utf8')
p=D/'weather-operations.js';t=p.read_text(encoding='utf8').replace('section.sStart-650','section.sStart-1000');p.write_text(t,encoding='utf8')
p=D.parent/'tests/mapped-buildings104.test.mjs';t=p.read_text(encoding='utf8').replace('assert.equal(row.length,7);','assert.equal(row.length,8);assert.ok(row[7]===0||row[7]===1);');p.write_text(t,encoding='utf8')
print('Refreshed module graph')
