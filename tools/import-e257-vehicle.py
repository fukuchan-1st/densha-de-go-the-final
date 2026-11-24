"""E257系(提供BVE車両 train/E257)の運転台・性能・音を 'e257-5000' として取り込む。外観は import-e257-5000.py。"""
import importlib.util, json, subprocess
from pathlib import Path
from PIL import Image

spec = importlib.util.spec_from_file_location('added', 'tools/import-added-trains.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
ID = 'e257-5000'
config = {'id': ID, 'name': 'E257系5000番台', 'root': 'train/E257', 'vehicle': 'Vehicle.txt', 'maxSpeed': 130, 'mapping': {}}
recipe, entries = m.import_one(Path(r'C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef'), config)
recipe['playableSpecs']['carCount'] = 9
recipe.setdefault('notes', []).append('外観はE257系5000番台のRTMモデル(test_E257_5000_mi)。運転台・音は提供BVE車両 train/E257。')
target = Path('dist/assets/final/vehicles') / ID
for asset in entries.values():
    original = target / asset['file']
    if original.suffix.lower() == '.wav':
        destination = original.with_suffix('.mp3')
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(original), '-codec:a', 'libmp3lame', '-q:a', '2', str(destination)], check=True)
        original.unlink(); asset['file'] = destination.name
    elif original.suffix == '.webp' and original.stat().st_size > 30000:
        Image.open(original).save(original, 'WEBP', quality=90, method=6, exact=True)
for file, field, new in [('dist/assets/final/vehicle-recipes.json', 'trains', recipe), ('dist/assets/final/vehicles/manifest.json', 'trains', entries)]:
    p = Path(file); d = json.loads(p.read_text(encoding='utf-8'))
    if isinstance(d[field], list): d[field] = [x for x in d[field] if x['id'] != ID] + [new]
    else: d[field][ID] = new
    p.write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(ID, 'imported', recipe['playableSpecs'], len(entries), 'assets', 'missing:', recipe['missingReferences'])
