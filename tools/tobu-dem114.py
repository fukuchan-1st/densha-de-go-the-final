"""Estimate vertical rail profiles from GSI DEM, preserving horizontal mapped rails. Explicit approximation."""
from pathlib import Path
import math,json,urllib.request,concurrent.futures
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT.parent/'all-road-cache/gsi';Z=12;N=2**Z;tiles={}
def gettile(key):
 tx,ty=key;p=CACHE/f'{Z}-{tx}-{ty}.png'
 if not p.exists():p.write_bytes(urllib.request.urlopen(f'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{Z}/{tx}/{ty}.png',timeout=20).read())
 return key,Image.open(p).convert('RGB')
def height(lat,lon):
 x=(lon+180)/360*N*256;y=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*N*256;im=tiles[int(x)//256,int(y)//256];r,g,b=im.getpixel((int(x)%256,int(y)%256));v=(r<<16)+(g<<8)+b;return 0 if v==8388608 else (v if v<8388608 else v-16777216)*.01
routes={};keys=set()
for rid in ['tobu-skytree','tobu-nikko','tobu-kinugawa','aizu']:
 p=ROOT/f'dist/assets/final/{rid}-route.json';r=json.loads(p.read_text(encoding='utf8'));q=r['projection'];pts=np.array(r['points']);ss=np.arange(0,r['length']+100,100);xx=np.interp(ss,pts[:,0],pts[:,1]);zz=np.interp(ss,pts[:,0],pts[:,2]);lat=q['referenceLatitude']+np.degrees(zz/6371008.8);lon=q['referenceLongitude']+np.degrees(xx/6371008.8/math.cos(math.radians(q['scaleLatitude'])));rows=list(zip(ss,lat,lon));routes[rid]=(p,r,pts,rows)
 for s,la,lo in rows:keys.add((int((lo+180)/360*N),int((1-math.asinh(math.tan(math.radians(la)))/math.pi)/2*N)))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for k,img in pool.map(gettile,keys):tiles[k]=img
for rid,(p,r,pts,rows) in routes.items():
 ss=np.array([a[0] for a in rows]);h=np.array([height(a[1],a[2]) for a in rows]);# symmetric smoothing prevents DEM noise from becoming abrupt cab jolts
 h=np.convolve(np.pad(h,(3,3),mode='edge'),np.ones(7)/7,mode='valid')
 for span in r['structures']:
  if span['kind']=='tunnel':
   a,b=span['sStart'],span['sEnd'];ha,hb=np.interp([a,b],ss,h);mask=(ss>=a)&(ss<=b);h[mask]=ha+(hb-ha)*(ss[mask]-a)/(b-a)
 for _ in range(3):
  for i in range(1,len(h)):h[i]=max(h[i-1]-3.5,min(h[i-1]+3.5,h[i]))
  for i in range(len(h)-2,-1,-1):h[i]=max(h[i+1]-3.5,min(h[i+1]+3.5,h[i]))
 h-=h[0];r['points']=[[float(a),float(b),float(c),round(float(np.interp(a,ss,h)),3)] for a,b,c,*_ in pts];r['grades']=[[round(float(s),1),round(float((h[i+1]-h[i])/100*1000),3)] for i,s in enumerate(ss[:-1])]
 for st in r['stations']:st['height']=round(float(np.interp(st['s'],ss,h)),3)
 r['verticalProfileSource']='GSI DEM PNG z12, ~30 m terrain, 700 m smoothing, tunnel portal interpolation, gradient limited to ±35‰; approximate rail elevation, not survey/BVE'
 r['sources'].append(dict(title='国土地理院 基盤地図情報 数値標高モデル',url='https://maps.gsi.go.jp/development/ichiran.html#dem',license='国土地理院コンテンツ利用規約'))
 r['importNotes'].append('Vertical rail profile estimated from GSI terrain; bridge deck heights and tunnel grades remain approximations.')
 p.write_text(json.dumps(r,ensure_ascii=False,separators=(',',':')),encoding='utf8');print(rid,round(min(h),1),round(max(h),1),flush=True)
