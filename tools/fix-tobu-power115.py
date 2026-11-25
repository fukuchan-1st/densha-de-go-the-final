"""東武10030型・70000系の力行を直す。

元データの細かい制御段(直列S1〜S24・渡り・並列P1〜P21・弱め界磁)から作った
「定常状態の推定」引張力表は、40km/h付近でほぼ0になり、10030型は24km/h、
70000系は23km/hで頭打ちになっていた。この表は使わず、500系・20400型と同じ
標準の求め方(段数に比例した起動加速度が速度とともに弱まる)にする。
10030型はマスコンを P1〜P4 の4段にする(元データは PowerNotchCount=3)。
元の表は performance.power.sourceStepForce に残っている。
"""
import json
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'dist/assets/final/tobu114/vehicle-patch.json'
patch = json.loads(path.read_text(encoding='utf-8'))
for train in patch['trains']:
    if train['id'] not in ('10030', '70000'):
        continue
    power = train['performance']['power']
    if 'force' in power:
        power['steadyStateForceUnused'] = {'labels': power['force'].get('labels'), 'method': power['force'].get('method'),
                                           'reason': '40km/h付近で力がほぼ0になり加速できないため不使用(v115)'}
        del power['force']
    if train['id'] == '10030' and 'P4' not in train['notchLabels']:
        train['notchLabels'] = train['notchLabels'] + ['P4']
        train['playableSpecs']['powerNotches'] = 4
    train.setdefault('notes', []).append('力行は標準の求め方(段数比例・速度で減衰)。元の制御段表から作った定常推定表は加速できなかったため不使用。'
                                         + ('マスコンはP1〜P4。' if train['id'] == '10030' else ''))
path.write_text(json.dumps(patch, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('fixed', [(t['id'], t['notchLabels'][-1], t['playableSpecs']['powerNotches']) for t in patch['trains'] if t['id'] in ('10030', '70000')])
