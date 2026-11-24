"""E257系5000番台(RTMモデル test_E257_5000_mi)をプレイヤー車両として取り込む。

import-player-structures.py の mqo/export 関数を流用し、manifest に 'e257-5000' だけを追加する。
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / 'tools/import-player-structures.py').read_text(encoding='utf-8').split('manifest=json.loads')[0]
# 2頂点の面(線)を持つモデルがあるので読み飛ばす
source = source.replace("face=list(map(int,v[1].split()));mat=", "face=list(map(int,v[1].split()))\n    if len(face)<3:continue\n    mat=")
assert 'if len(face)<3' in source
ns = {'__file__': str(ROOT / 'tools/import-player-structures.py')}
exec(source, ns)
SOURCE, OUT, mqo, export, texture = ns['SOURCE'], ns['OUT'], ns['mqo'], ns['export'], ns['texture']

base = SOURCE / 'test_E257_5000_mi/assets/minecraft'
model = base / 'models'
variants = {}
# 1号車(クハE257) / 5号車(モハ) / 9号車(クハE256)
for role, number in [('head', '01'), ('middle', '05'), ('tail', '09')]:
    definition = base / 'json/50_om' / f'ModelTrain_E257_50_0_{number}_mi.json'
    config = json.loads(definition.read_text(encoding='utf-8-sig'))
    body, bogie = config['trainModel2']['modelFile'], config['bogieModel2']['modelFile']

    def configured(part):
        return {entry[0]: texture(base / entry[1], Path(entry[1]).name) for entry in part['textures']}

    groups = mqo(model / body, configured(config['trainModel2']))
    bogietex = configured(config['bogieModel2'])
    for offset in config['bogiePos']:
        for key, values in mqo(model / bogie, bogietex, offset).items():
            groups[key].extend(values)
    minimum = min(values[i + 1] for values in groups.values() for i in range(0, len(values), 8))
    for values in groups.values():
        for i in range(0, len(values), 8):
            values[i + 1] -= minimum
    variants[role] = export('e257-5000', role, groups, [str((model / body).relative_to(SOURCE)), str(definition.relative_to(SOURCE))])

manifest_path = OUT / 'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['models']['e257-5000'] = {'carCount': 9, 'variants': variants, 'frontRotation': 0, 'tailRotation': 3.141592653589793,
                                   'credit': 'E257系5000番台モデル: test_E257_5000_mi (RealTrainMod 用モデル)'}
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
for role, v in variants.items():
    print(role, v['vertices'], [round(x, 2) for x in v['bounds'][0]], [round(x, 2) for x in v['bounds'][1]])
