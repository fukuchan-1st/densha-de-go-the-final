"""Import nearby OSM public-road polylines, simplified for browser scenery."""
from pathlib import Path
import json,math,urllib.request,urllib.parse,collections
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'dist/assets/final';R=6371008.8
for name in ['yamanote','osaka','tokaido']:
 path=ASSETS/(name+'-route.json');r=json.loads(path.read_text(encoding='utf-8'));p=r.get('projection');stations=r['stations'];lat=p['referenceLatitude'];lon=p['referenceLongitude'];cos=math.cos(math.radians(lat));points=r['points'];xs=[x['lat'] for x in stations if x.get('lat')];ys=[x['lon'] for x in stations if x.get('lon')];bbox=','.join(map(str,[min(xs)-.003,min(ys)-.003,max(xs)+.003,max(ys)+.003]));cache=ROOT.parent/('roads-osm-'+name+'.json')
 if cache.exists():doc=json.loads(cache.read_text())
 else:
  query='[out:json][timeout:40];way[highway~"^(primary|secondary|tertiary|residential|unclassified|service)$"]('+bbox+');out geom;'
  if name in ['osaka','tokaido']:
   selected=[st for st in stations if st['name'] in (['大阪','京橋','天王寺'] if name=='osaka' else ['京都','新大阪','大阪','神戸'])]
   boxes=[','.join(map(str,[st['lat']-.005,st['lon']-.006,st['lat']+.005,st['lon']+.006])) for st in selected]
   query='[out:json][timeout:35];('+''.join('way[highway~"^(primary|secondary|tertiary|residential|unclassified|service)$"]('+box+');' for box in boxes)+');out geom;' 
  doc=None
  for endpoint in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
   try:
    req=urllib.request.Request(endpoint,data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'Trackfinity-road-scenery/1.0'})
    with urllib.request.urlopen(req,timeout=48) as response:doc=json.load(response)
    cache.write_text(json.dumps(doc));break
   except Exception as error:print(name,'OSM request:',str(error),flush=True)
  if doc is None:continue
 grid=collections.defaultdict(list)
 for i,(a,b) in enumerate(zip(points,points[1:])):
  for gx in range(math.floor(min(a[1],b[1])/200),math.floor(max(a[1],b[1])/200)+1):
   for gz in range(math.floor(min(a[2],b[2])/200),math.floor(max(a[2],b[2])/200)+1):grid[gx,gz].append(i)
 def project(x,z):
  gx,gz=math.floor(x/200),math.floor(z/200);best=(1e9,0)
  for i in set(i for xx in range(gx-1,gx+2) for zz in range(gz-1,gz+2) for i in grid[xx,zz]):
   a,b=points[i],points[i+1];dx,dz=b[1]-a[1],b[2]-a[2];f=max(0,min(1,((x-a[1])*dx+(z-a[2])*dz)/max(.001,dx*dx+dz*dz)));d=math.hypot(x-a[1]-f*dx,z-a[2]-f*dz)
   if d<best[0]:best=d,a[0]+f*(b[0]-a[0])
  return best
 roads=[]
 for way in doc.get('elements',[]):
  if way.get('type')!='way':continue
  tags=way.get('tags',{});geometry=[];near=[]
  for node in way.get('geometry',[]):
   x=math.radians(node['lon']-lon)*R*cos;z=math.radians(node['lat']-lat)*R;distance,s=project(x,z)
   if distance>130:
    if len(geometry)>1:roads.append(dict(osmWayId=way['id'],s=round(sum(near)/len(near),1),points=geometry,width=6 if tags.get('highway') in ['residential','service'] else 10,source='OpenStreetMap',bridge=tags.get('bridge')=='yes'))
    geometry=[];near=[];continue
   if not geometry or math.dist(geometry[-1],[x,z])>=8:geometry.append([round(x,1),round(z,1)]);near.append(s)
  if len(geometry)>1:roads.append(dict(osmWayId=way['id'],s=round(sum(near)/len(near),1),points=geometry,width=6 if tags.get('highway') in ['residential','service'] else 10,source='OpenStreetMap',bridge=tags.get('bridge')=='yes'))
 r['roads']=roads;r['roadSource']='OpenStreetMap contributors / Overpass API; geographic road positions; grade-separated heights approximate';path.write_text(json.dumps(r,ensure_ascii=False,separators=(',',':')),encoding='utf-8');print(name,len(roads),'road segments',flush=True)
