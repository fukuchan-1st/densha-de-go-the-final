"""Bundle supplied station name clips unchanged, alongside the Osaka driver bank."""
from pathlib import Path
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]
source=Path('C:/Users/bmwhz/OneDrive/Desktop/yamagata_station')
out=ROOT/'dist/assets/final/driver-voice'
p=ROOT/'dist/station-voice-data.js'
data=json.loads(p.read_text(encoding='utf8').split('=',1)[1].strip().removesuffix(';'))
bank={**data['tohoku'],'stations':{'福島':data['tohoku']['stations']['福島']},'fallbacks':{},'position':{},'counts':[2,4],'genericFallback':True}
aliases={'ささきの':'笹木野','おいたま':'置賜','うぜん中山':'羽前中山','うぜん千歳':'羽前千歳','たかたま':'高擶','じんまち':'神町','乱れ川':'乱川','北おお石田':'北大石田'}
clips=[]
for f in sorted(source.glob('*.mp3')):
    name=f.stem.split('-')[-1];name=aliases.get(name,name)
    filename='stations/yamagata97-'+hashlib.sha256(name.encode()).hexdigest()[:12]+'.mp3'
    shutil.copyfile(f,out/filename);bank['stations'][name]=filename
    clips.append(dict(station=name,file=filename,sha256=hashlib.sha256(f.read_bytes()).hexdigest()))
data['yamagata']=bank
p.write_text('export const stationVoiceData='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
manifest=out/'yamagata-import97.json'
previous=json.loads(manifest.read_text(encoding='utf8')) if manifest.exists() else {'clips':[]}
for clip in previous['clips']:
    old=out/clip['file']
    if old.exists() and clip['file'] not in bank['stations'].values():old.unlink()
manifest.write_text(json.dumps(dict(clips=clips),ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('Yamagata name clips',len(clips),'with Fukushima reused from the same driver')
