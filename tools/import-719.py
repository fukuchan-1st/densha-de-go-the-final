"""Use the supplied 719-0 structure as the explicitly provisional 5000 exterior."""
from pathlib import Path
import copy, gzip, json

ROOT=Path(__file__).resolve().parents[1]
namespace={'__file__':str(ROOT/'tools/import-player-structures.py')}
exec((ROOT/'tools/import-player-structures.py').read_text(encoding='utf8').split('manifest=json.loads')[0],namespace)
out=namespace['OUT']
source='719系ストラクチャー/x/719-0/'
variants={}
for role,file in [('head','719-0Mc.x'),('tail','718-0Tc.x')]:
    part=namespace['export']('719-5000',role,namespace['xparts']([source+file]),[source+file])
    for key in ['file','indexFile']:
        path=out/part[key]
        target=path.with_suffix(path.suffix+'.gz')
        target.write_bytes(gzip.compress(path.read_bytes(),mtime=0))
        path.unlink()
        part[key]=target.name
    variants[role]=part
manifest=json.loads((out/'manifest.json').read_text(encoding='utf8'))
manifest['models']['719-5000']={'carCount':2,'variants':variants,'frontRotation':3.141592653589793,'tailRotation':3.141592653589793,'formation':['head','tail'],'provisional':'Provided 719-0 structure; 5000 subseries body/bogie details are approximate.'}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf8')
assets=ROOT/'dist/assets/final'
recipes=json.loads((assets/'vehicle-recipes.json').read_text(encoding='utf8'))
base=next(t for t in recipes['trains'] if t['id']=='211')
train=copy.deepcopy(base)
train.update(id='719-5000',name='719系5000番台（仮）',sourceArchive='提供719系0番台ストラクチャ',sourceVehicle='719-0Mc.x + 718-0Tc.x',notes=['外観は提供719系0番台を使用した仮モデル。5000番台専用の台車・帯・屋根機器は未再現。','運転台・走行音・性能曲線は211系を借用した仮設定。'])
train['playableSpecs'].update(carCount=2,massKg=75000,maxSpeedKmh=110,startingAccelerationKmhPerSecondApprox=2.1)
train['sourceSpecs']={'note':'No original 719 driving cab or traction data supplied; provisional settings.'}
recipes['trains']=[t for t in recipes['trains'] if t['id']!='719-5000']+[train]
(assets/'vehicle-recipes.json').write_text(json.dumps(recipes,ensure_ascii=False,separators=(',',':')),encoding='utf8')
packs=json.loads((assets/'vehicles/manifest.json').read_text(encoding='utf8'))
packs['trains']['719-5000']=copy.deepcopy(packs['trains']['211'])
for row in packs['trains']['719-5000'].values(): row['file']='../211/'+row['file']
(assets/'vehicles/manifest.json').write_text(json.dumps(packs,ensure_ascii=False,separators=(',',':')),encoding='utf8')
(assets/'719-credits.txt').write_bytes((namespace['SOURCE']/'719系ストラクチャー/説明書.txt').read_bytes())
print('719 provisional exterior imported',[(k,v['vertices'],v['bounds']) for k,v in variants.items()])
