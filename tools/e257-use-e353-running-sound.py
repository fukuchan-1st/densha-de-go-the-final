"""E257系5000番台の走行音・モーター音をE353系のものにする(運転台・性能・その他の音はE257系のまま)。"""
import json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'dist/assets/final'
recipes_path, manifest_path = ROOT / 'vehicle-recipes.json', ROOT / 'vehicles/manifest.json'
recipes, manifest = json.loads(recipes_path.read_text(encoding='utf-8')), json.loads(manifest_path.read_text(encoding='utf-8'))
trains = {t['id']: t for t in recipes['trains']}
src, dst = trains['e353'], trains['e257-5000']
src_assets, dst_assets = manifest['trains']['e353'], manifest['trains']['e257-5000']
next_index = max(map(int, dst_assets)) + 1
copied = {}
def remap(group):
    global next_index
    out = {}
    for key, ref in group.items():
        old = ref['entryIndex']
        if old not in copied:
            asset = dict(src_assets[str(old)])
            name = f'{next_index}' + Path(asset['file']).suffix
            shutil.copyfile(ROOT / 'vehicles/e353' / asset['file'], ROOT / 'vehicles/e257-5000' / name)
            asset['file'] = name; dst_assets[str(next_index)] = asset
            copied[old] = next_index; next_index += 1
        out[key] = {**ref, 'entryIndex': copied[old], 'entryName': 'E353:' + ref.get('entryName', '')}
    return out
for group in ['run', 'motor', 'flange', 'joint']:
    if group in src['sounds']:
        dst['sounds'][group] = remap(src['sounds'][group])
dst['motorNoise'] = src['motorNoise']
dst['rollingSoundIndexes'] = src.get('rollingSoundIndexes', dst.get('rollingSoundIndexes'))
dst['notes'] = [n for n in dst.get('notes', []) if 'E353' not in n] + ['走行音・モーター音はE353系(提供BVE)を使用。運転台・性能・ドア音などはE257系。']
recipes_path.write_text(json.dumps(recipes, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('copied', len(copied), 'files')
