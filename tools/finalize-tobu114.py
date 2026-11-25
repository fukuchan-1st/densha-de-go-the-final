from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];dist=root/'dist'
p=root/'tools/import-tobu114.py';s=p.read_text(encoding='utf-8').replace("'origin':[835.5,180]","'origin':[830,-75]").replace("'x':0,'y':0,'width':1671,'height':941","'x':180,'y':-280,'width':1300,'height':731.25");p.write_text(s,encoding='utf-8')
for p in dist.iterdir():
 if p.suffix in ['.js','.html','.css']:
  s=p.read_text(encoding='utf-8');t=s.replace('?v=113','?v=114')
  if p.name=='opposing-models.js':t=t.replace('manifest.json?v=97final','manifest.json?v=114')
  if t!=s:p.write_text(t,encoding='utf-8')
print('Version114 cache references updated')
