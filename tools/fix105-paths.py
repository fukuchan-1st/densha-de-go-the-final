from pathlib import Path
import re
D=Path(__file__).resolve().parents[1]/'dist'
for p in D.rglob('*.js'):
 if 'vendor' in p.parts:continue
 t=p.read_text(encoding='utf8');new=t.replace('.js?v=105on','.json')
 if new!=t:p.write_text(new,encoding='utf8')
for helper in ['cache105.py','wire105.py']:
 p=D.parent/'tools'/helper;t=p.read_text(encoding='utf8');t=t.replace('\\.js)(?:','\\.js)(?=[?\'\\\"])(?:');p.write_text(t,encoding='utf8')
print('Restored JSON resource paths')
