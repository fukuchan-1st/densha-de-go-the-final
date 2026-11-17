import importlib.util,json
from pathlib import Path
from PIL import Image
spec=importlib.util.spec_from_file_location('added','tools/import-added-trains.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
config={'id':'e131','name':'E131系','root':'train/E131系','vehicle':'0-2O.txt','maxSpeed':110,'mapping':{}}
recipe,entries=m.import_one(Path(r'C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef'),config)
for file,field,new in [('dist/assets/final/vehicle-recipes.json','trains',recipe),('dist/assets/final/vehicles/manifest.json','trains',entries)]:
 p=Path(file);d=json.loads(p.read_text(encoding='utf-8'))
 if isinstance(d[field],list):d[field]=[x for x in d[field] if x['id']!='e131']+[new]
 else:d[field]['e131']=new
 p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('E131 imported',recipe['playableSpecs'],len(entries),'assets',recipe['missingReferences'])

# ATS slots 200/201 in Sound/0-O.txt are the supplied door cues.
import subprocess
recipes_path=Path('dist/assets/final/vehicle-recipes.json');data=json.loads(recipes_path.read_text(encoding='utf-8'));recipe=next(t for t in data['trains'] if t['id']=='e131');manifest_path=Path('dist/assets/final/vehicles/manifest.json');manifest=json.loads(manifest_path.read_text(encoding='utf-8'));entries=manifest['trains']['e131'];target=Path('dist/assets/final/vehicles/e131');source=Path(r'C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/train/E131系/Sound');recipe['sounds']['door']={}
for cue,name in [('openright','Open-1.wav'),('closeright','Close.wav')]:
 index=max(map(int,entries))+1;destination=target/(str(index)+'.mp3');subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source/name),'-codec:a','libmp3lame','-q:a','2',str(destination)],check=True);entries[str(index)]={'file':destination.name};recipe['sounds']['door'][cue]={'entryIndex':index,'entryName':'Sound/'+name,'size':(source/name).stat().st_size}
for asset in entries.values():
 original=target/asset['file']
 if original.suffix.lower()=='.wav':
  destination=original.with_suffix('.mp3');subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(original),'-codec:a','libmp3lame','-q:a','2',str(destination)],check=True);original.unlink();asset['file']=destination.name
 elif original.suffix=='.webp' and original.stat().st_size>30000:
  Image.open(original).save(original,'WEBP',quality=90,method=6,exact=True)
recipes_path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8');manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
