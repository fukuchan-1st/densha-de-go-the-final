"""Build a compact, public GSI DEM backdrop. Cached tiles stay outside the Site."""
import json,math,urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT.parent/'all-road-cache/gsi';CACHE.mkdir(exist_ok=True)
stations=json.loads((CACHE.parent/'scenery-chubu.json').read_text(encoding='utf-8'))['stations']
tiles={};Z=10;N=2**Z
def height(lon,lat):
 x=(lon+180)/360*N*256;y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*N*256
 def pixel(px,py):
  tx,ty=int(px)//256,int(py)//256;key=(tx,ty)
  if key not in tiles:
   path=CACHE/f'{Z}-{tx}-{ty}.png'
   if not path.exists():path.write_bytes(urllib.request.urlopen(f'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{Z}/{tx}/{ty}.png',timeout=30).read())
   tiles[key]=Image.open(path).convert('RGB')
  r,g,b=tiles[key].getpixel((int(px)%256,int(py)%256));v=(r<<16)+(g<<8)+b
  return 0 if v==8388608 else (v if v<8388608 else v-16777216)*.01
 a,b=int(x),int(y);u,v=x-a,y-b
 return pixel(a,b)*(1-u)*(1-v)+pixel(a+1,b)*u*(1-v)+pixel(a,b+1)*(1-u)*v+pixel(a+1,b+1)*u*v
result={}
for key,name in [('kofu','甲府'),('matsumoto','松本'),('nagano','長野')]:
 row=stations[name];lon,lat=row['lon'],row['lat'];nx,nz=128,96;w,d=48000,36000;X=111320*math.cos(math.radians(lat));values=[]
 for j in range(nz+1):
  for i in range(nx+1):values.append(round(height(lon+(i/nx-.5)*w/X,lat+(j/nz-.5)*d/111320)))
 result[key]={'name':name,'lon':lon,'lat':lat,'centerElevation':round(height(lon,lat)),'nx':nx,'nz':nz,'width':w,'depth':d,'heights':values}
 print(key,min(values),max(values),flush=True)
(ROOT/'dist/basin-elevation-data.js').write_text('// Derived from GSI DEM10B PNG tiles, zoom 10, resampled to approximately 375 m.\nexport const BASIN_ELEVATION='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('tiles',len(tiles),flush=True)
