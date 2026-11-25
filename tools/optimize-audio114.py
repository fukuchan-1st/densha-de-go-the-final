"""Re-encode bundled lossless delivery copies without changing cue keys, timing or pitch."""
from pathlib import Path
import json,subprocess,concurrent.futures,hashlib,shutil
root=Path(__file__).resolve().parents[1];base=root/'dist/assets/final/vehicles';backup=root.parent/'audio-source114';backup.mkdir(exist_ok=True)
manifest=base/'manifest.json';data=json.loads(manifest.read_text(encoding='utf-8'));jobs={}
for vehicle,assets in data['trains'].items():
 for key,asset in assets.items():
  p=(base/vehicle/asset['file']).resolve()
  if p.suffix=='.flac':jobs.setdefault(p,[]).append((vehicle,key))
def duration(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)]))
def encode(item):
 p,refs=item;q=p.with_suffix('.ogg')
 if q.exists():raise RuntimeError('Existing target '+str(q))
 subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(p),'-map_metadata','-1','-c:a','libvorbis','-q:a','7',str(q)],check=True)
 old=p.stat().st_size;new=q.stat().st_size;d0,d1=duration(p),duration(q)
 if abs(d0-d1)>.010:q.unlink();return None
 if new>=old:q.unlink();return None
 row={'source':str(p.relative_to(root)),'file':str(q.relative_to(root)),'originalBytes':old,'bytes':new,'duration':d0,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'refs':refs}
 dst=backup/p.relative_to(base);dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst);return row
rows=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for r in pool.map(encode,jobs.items()):
  if r:
   rows.append(r)
   for vehicle,key in r['refs']:data['trains'][vehicle][key]['file']=str(Path(data['trains'][vehicle][key]['file']).with_suffix('.ogg')).replace('\\','/')
for row in rows:(root/row['source']).unlink()
manifest.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(root/'audio-delivery114.json').write_text(json.dumps({'codec':'Vorbis quality7, native rate/channels, no pitch or timing changes','sourceBackup':str(backup),'files':rows},ensure_ascii=False,indent=2),encoding='utf-8')
print('encoded',len(rows),'saved',sum(r['originalBytes']-r['bytes'] for r in rows),flush=True)

