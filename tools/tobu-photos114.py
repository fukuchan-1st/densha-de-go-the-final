from pathlib import Path
from PIL import Image,ImageOps
import json
root=Path(__file__).resolve().parents[1];src=Path('C:/Users/bmwhz/OneDrive/Desktop');out=root/'dist/assets/vehicle-photos'
names={'500':'Tobu-Series500_Revaty_Kegon28_Aizu128.jpg','10030':'images.jpg','20400':'Tobu-Type20400-21442.jpg'}
for id,name in names.items():
 image=ImageOps.exif_transpose(Image.open(src/name)).convert('RGB');image.thumbnail((1600,1100));image.save(out/(id+'.webp'),quality=88,method=6)
p=root/'dist/vehicle-photos.js';s=p.read_text(encoding='utf-8').replace('const supplied=new Set([','const supplied=new Set(["500","10030","20400",');p.write_text(s,encoding='utf-8')
p=root/'dist/photo-menu.js';s=p.read_text(encoding='utf-8').replace("yagan:{file:'yagan.webp',flip:true}","yagan:{file:'../vehicle-photos/500.webp',flip:false}");p.write_text(s,encoding='utf-8')
p=root/'dist/station-voice-data.js';s=p.read_text(encoding='utf-8');prefix=s[:s.index('{')];d=json.loads(s[s.index('{'):].strip().rstrip(';'));d['yagan']['stations']['獨協大学前〈草加松原〉']=d['yagan']['stations']['獨協大学前'];p.write_text(prefix+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(out/'tobu114-sources.json').write_text(json.dumps(names,ensure_ascii=False,indent=2),encoding='utf-8')
print('Imported three user-supplied photos without flipping')
