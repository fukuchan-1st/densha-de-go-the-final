import json,math,urllib.request,gzip
from pathlib import Path
from PIL import Image
root=Path.cwd();cache=root.parent/'all-road-cache/gsi';out=root.parent/'obasute112';out.mkdir(exist_ok=True)
tiles={};Z=12;N=2**Z
exec((root/'tools/basin-dem.py').read_text(encoding='utf-8').split('result={}')[0].split('tiles={};Z=10;N=2**Z')[1].replace('CACHE','cache'))
def grid(lon,lat,width,depth,nx,nz):
 X=111320*math.cos(math.radians(lat));v=[]
 for j in range(nz+1):
  for i in range(nx+1):v.append(round(height(lon+(i/nx-.5)*width/X,lat+(j/nz-.5)*depth/111320)))
 return dict(lon=lon,lat=lat,width=width,depth=depth,nx=nx,nz=nz,heights=v)
coarse=json.loads((root/'dist/basin-elevation-data.js').read_text(encoding='utf-8').split('export const BASIN_ELEVATION=',1)[1].strip().rstrip(';'))['nagano']
fine=grid(138.095,36.5025,3000,3000,120,120)
(out/'dem.json').write_text(json.dumps(dict(coarse=coarse,fine=fine)),encoding='utf-8'); print('DEM ready',len(tiles),min(coarse['heights']),max(coarse['heights']),flush=True)

