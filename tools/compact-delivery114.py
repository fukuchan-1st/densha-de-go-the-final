from pathlib import Path
import json,subprocess,concurrent.futures
root=Path(__file__).resolve().parents[1];p=root/'audio-delivery114.json';data=json.loads(p.read_text(encoding='utf-8'));backup=Path(data['sourceBackup'])
def encode(row):
 source=backup/Path(row['source']).relative_to('dist/assets/final/vehicles');target=root/row['file'];before=target.stat().st_size
 subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(source),'-map_metadata','-1','-c:a','libvorbis','-q:a','6',str(target)],check=True)
 row['bytes']=target.stat().st_size;return before-row['bytes']
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:saved=sum(pool.map(encode,data['files']))
data['codec']='Vorbis quality6 from original lossless sources, native rate/channels, source originals retained';p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');print('additionalbytes saved',saved)
