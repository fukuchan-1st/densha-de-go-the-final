"""Add supplied E127 and 313 bodies without rebuilding the other rolling stock."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
namespace={'__file__':str(ROOT/'tools/import-player-structures.py')}
exec((ROOT/'tools/import-player-structures.py').read_text(encoding='utf8').split('manifest=json.loads')[0],namespace)
out=ROOT/'dist/assets/opposing';manifest=json.loads((out/'manifest.json').read_text(encoding='utf8'))
for id,head,tail in [('e127','E127/McE127-100.x','E127/TcE126-100.x'),('313','313-1300/Mc313-1300.x','313-1300/Tc312-1300.x')]:
 roles={role:namespace['export'](id,role,namespace['xparts']([name]),[name]) for role,name in [('head',head),('tail',tail)]}
 roles['middle']=roles['tail'];manifest['models'][id]={'carCount':2,'variants':roles,'frontRotation':3.141592653589793,'tailRotation':0}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf8')
