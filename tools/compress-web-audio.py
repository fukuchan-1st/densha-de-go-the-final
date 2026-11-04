import concurrent.futures
import json
import subprocess
from pathlib import Path
app=Path(__file__).resolve().parents[1]
root=app/'dist/assets/final/vehicles'
manifest=json.loads((root/'manifest.json').read_text('utf-8'))
jobs=[]
for vehicle,entries in manifest['trains'].items():
 for key,entry in entries.items():
  if entry['file'].endswith('.wav'): jobs.append((vehicle,key,root/vehicle/entry['file']))
def convert(job):
 vehicle,key,source=job
 target=source.with_suffix('.flac')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),'-c:a','flac','-compression_level','8',str(target)],check=True)
 if target.stat().st_size>=source.stat().st_size:
  target.unlink()
  return None
 saved=source.stat().st_size-target.stat().st_size
 source.unlink()
 return vehicle,key,target.name,saved
total=0
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for result in pool.map(convert,jobs):
  if result:
   vehicle,key,name,saved=result
   manifest['trains'][vehicle][key]['file']=name
   total+=saved
(root/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8')
print('Compressed files',len(jobs),'saved MiB',round(total/1024/1024,1))
print('Dist total MiB',round(sum(p.stat().st_size for p in (app/'dist').rglob('*') if p.is_file())/1024/1024,1))
