"""Import only explicit BVE level crossings and OSM level_crossing nodes on mapped rails."""
from pathlib import Path
from importlib.machinery import SourceFileLoader
import json,math,re,urllib.request,urllib.parse
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'dist/assets/final'
SOURCE=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/data')
helper=SourceFileLoader('bve_crossing_parser',str(ROOT/'tools/import-shinshu-bve.py')).load_module()
read=lambda name:json.loads((ASSETS/(name+'-route.json')).read_text(encoding='utf-8'))
write=lambda name,data:(ASSETS/(name+'-route.json')).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
counts={}
def put(route,positions):
 original=[x for x in route.get('structures',[]) if x.get('kind')!='crossing'];accepted=[]
 for pos in sorted(positions,key=lambda x:x['s']):
  s=pos['s']
  if s<0 or s>route['stations'][-1]['s'] or any(abs(s-x['s'])<12 for x in accepted):continue
  accepted.append(pos)
 route['structures']=sorted(original+[dict(kind='crossing',sStart=p['s']-3,sEnd=p['s']+3,sOrigin=p['s'],source=p['source'],name=p.get('name','踏切')) for p in accepted],key=lambda x:x['sStart'])
 return len(accepted)
for name,master in [('yagan','AizuKinugawa/Map_0805.txt'),*[(c[0],c[2]) for c in helper.CONFIGS]]:
 route=read(name);bve=helper.BveMap(SOURCE/master);origin=route['stations'][0].get('sourceS',16192);positions=[]
 for s,obj,key,method,args in bve.commands:
  if obj=='structure' and method in ('put','put0','putbetween') and re.search('crossing|fumikiri',key or '',re.I):
   positions.append(dict(s=round(s-origin,3),source='BVE: '+master+' / '+key))
 counts[name]=put(route,positions);write(name,route)
# Transfer BVE chainage onto connected OSM sections using shared station boundaries.
for target,parts in [('chuo-extended',['chuo-kofu','chuo-shinshu']),('shinonoi-extended',['shinonoi'])]:
 route=read(target);positions=[]
 for part in parts:
  source=read(part);anchors=sorted((a['s'],b['s']) for a in source['stations'] for b in route['stations'] if a['name']==b['name'])
  for crossing in source['structures']:
   if crossing['kind']!='crossing':continue
   s=crossing['sOrigin']
   for (a,x),(b,y) in zip(anchors,anchors[1:]):
    if a<=s<=b:
     positions.append(dict(s=x+(s-a)/(b-a)*(y-x),source=crossing['source']+' (station-aligned)',name=crossing['name']));break
 counts[target]=put(route,positions);write(target,route)
# OSM railway ways already selected for the running corridor. Do not invent crossings.
for name in ['tokaido','chuo']:
 route=read(name);ways=route.get('drivingTrackOsmWays',[]);projection=route.get('projection')
 if not ways or not projection:continue
 cache=ROOT.parent/('crossings-osm-'+name+'.json')
 if cache.exists():doc=json.loads(cache.read_text())
 else:
  query='[out:json][timeout:45];way(id:'+','.join(map(str,ways))+');node(w)[railway=level_crossing];out;'
  request=urllib.request.Request('https://overpass-api.de/api/interpreter',data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'Trackfinity-crossings-import/1.0'})
  try:
   with urllib.request.urlopen(request,timeout=55) as response:doc=json.load(response)
   cache.write_text(json.dumps(doc))
  except Exception as error:print('OSM import unavailable:',name,str(error));continue
 lat,lon,R=projection['referenceLatitude'],projection['referenceLongitude'],projection.get('radiusM',6371008.8);positions=[];points=route['points']
 for node in doc.get('elements',[]):
  x=math.radians(node['lon']-lon)*R*math.cos(math.radians(lat));z=math.radians(node['lat']-lat)*R;best=None
  for a,b in zip(points,points[1:]):
   dx,dz=b[1]-a[1],b[2]-a[2];f=max(0,min(1,((x-a[1])*dx+(z-a[2])*dz)/max(.001,dx*dx+dz*dz)));distance=math.hypot(x-a[1]-dx*f,z-a[2]-dz*f)
   if best is None or distance<best[0]:best=(distance,a[0]+f*(b[0]-a[0]))
  if best[0]<18:positions.append(dict(s=round(best[1],2),source='OpenStreetMap node '+str(node['id']),name=node.get('tags',{}).get('name','踏切')))
 counts[name]=put(route,positions);write(name,route)
print(json.dumps(counts))
