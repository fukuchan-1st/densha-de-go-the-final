"""Import the actual 719-5000 cab, sounds and force tables supplied with the route."""
from pathlib import Path
from importlib.machinery import SourceFileLoader
import json
ROOT=Path(__file__).resolve().parents[1]
h=SourceFileLoader('added719',str(ROOT/'tools/import-added-trains.py')).load_module()
source=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/data/A_Ishida/奥羽本線(山形線)')
config=dict(id='719-5000',name='719系5000番台',root='719-5000',vehicle='Vehicle.txt',maxSpeed=110,mapping={})
recipe,entries=h.import_one(source,config)
recipe['panel']['crop']={'x':-50,'y':-237.5,'width':2200,'height':1237.5}
recipe['notes'].append('外観は別途提供された719系0番台ストラクチャを使用。5000番台の専用台車などは近似。')
recipe['rollingSoundIndexes']={'long':1,'slab25':0,'ballast25':0,'bridge':4,'tunnel':2}
out=ROOT/'dist/assets/final'
p=out/'vehicle-recipes.json';data=json.loads(p.read_text(encoding='utf8'));data['trains']=[t for t in data['trains'] if t['id']!='719-5000']+[recipe];p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
p=out/'vehicles/manifest.json';data=json.loads(p.read_text(encoding='utf8'));data['trains']['719-5000']=entries;p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('719-5000 actual vehicle',recipe['sourceSpecs'],len(entries),'assets; missing',recipe['missingReferences'],flush=True)
