"""Project user-supplied crossing-map geographic markers onto the simulator corridor."""
import json,math,re,statistics,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'dist/assets/final';CACHE=ROOT.parent/'crossing-reference-data';CACHE.mkdir(exist_ok=True)
PAGES=[5566,7223,7226,7068,7084,7087,6869,5388,5330]
def fetch(url,path):
 if not path.exists():
  with urllib.request.urlopen(url,timeout=30) as response:path.write_bytes(response.read())
 return path.read_text(encoding='utf-8-sig')
docs=[]
for page in PAGES:
 url='https://fumikiri.info/?page_id='+str(page);html=fetch(url,CACHE/(str(page)+'.html'))
 f=re.search(r'var fdata\s*=\s*"([^"]+)"',html)[1];st=re.search(r'var sdata\s*=\s*"([^"]+)"',html)[1]
 load=lambda value:json.loads(fetch('https://fumikiri.info/'+value.removeprefix('./'),CACHE/Path(value).name))
 docs.append(dict(url=url,page=page,features=load(f)['features'],stations=load(st)['features']))
def sample(points,s):
 lo,hi=0,len(points)-1
 while hi-lo>1:
  mid=(lo+hi)//2
  if points[mid][0]<=s:lo=mid
  else:hi=mid
 a,b=points[lo],points[hi];f=(s-a[0])/max(.001,b[0]-a[0]);return a[1]+f*(b[1]-a[1]),a[2]+f*(b[2]-a[2])
def add(route,selected):
 stations=route.get('sceneryStations',route['stations']);points=route['points'];existing=[c for c in route.get('structures',[]) if c['kind']=='crossing'];others=[c for c in route.get('structures',[]) if c['kind']!='crossing'];origin=stations[0];lat=route.get('projection',{}).get('referenceLatitude',origin.get('lat'));lon=route.get('projection',{}).get('referenceLongitude',origin.get('lon'));R=6371008.8
 if lat is None:return 0
 xy=lambda glat,glon:((glon-lon)*math.pi/180*R*math.cos(math.radians(lat)),(glat-lat)*math.pi/180*R)
 offsets=[]
 if not route.get('projection'):
  for st in stations:
   if st.get('lat') is not None:
    x,z=xy(st['lat'],st['lon']);px,pz=sample(points,st['s']);offsets.append((px-x,pz-z))
 ox=statistics.median(x for x,z in offsets) if offsets else 0;oz=statistics.median(z for x,z in offsets) if offsets else 0
 count=0
 for doc in selected:
  for feature in doc['features']:
   prop=feature['properties'];glon,glat=feature['geometry']['coordinates'];x,z=xy(glat,glon);x+=ox;z+=oz;best=None
   for a,b in zip(points,points[1:]):
    dx,dz=b[1]-a[1],b[2]-a[2];f=max(0,min(1,((x-a[1])*dx+(z-a[2])*dz)/max(.001,dx*dx+dz*dz)));d=math.hypot(x-a[1]-f*dx,z-a[2]-f*dz)
    if best is None or d<best[0]:best=d,a[0]+f*(b[0]-a[0])
   distance,s=best
   if distance>115 or s<0 or s>stations[-1]['s']:continue
   prior=max((st for st in stations if st['s']<=s),key=lambda x:x['s'],default=stations[0]);after=min((st for st in stations if st['s']>s),key=lambda x:x['s'],default=stations[-1]);
   bve=[c for c in existing if 'BVE:' in c.get('source','') and prior['s']<=c.get('sOrigin',(c['sStart']+c['sEnd'])/2)<=after['s']]
   if bve:
    closest=min(bve,key=lambda c:abs(c['sOrigin']-s))
    if abs(closest['sOrigin']-s)<160:closest.update(name=prop.get('fname') or '踏切',reference=doc['url'])
    continue
   near=[c for c in existing if abs(c.get('sOrigin',(c['sStart']+c['sEnd'])/2)-s)<55]
   if near:
    near[0].update(name=prop.get('fname') or '踏切',reference=doc['url']);continue
   existing.append(dict(kind='crossing',sStart=round(s-3,2),sEnd=round(s+3,2),sOrigin=round(s,2),name=prop.get('fname') or '踏切',source=doc['url'],sourceMarker=prop.get('fid'),positionQuality='geographic marker projected to simulated track',projectionErrorM=round(distance,2)));count+=1
 route['structures']=sorted(others+existing,key=lambda c:c['sStart']);return count
choices={'yamanote':[5566],'itsukaichi':[7223],'ome':[7226],'ome-okutama':[7226],'chuo':[7068],'chuo-extended':[7068,7084],'shinonoi-extended':[7084],'tokaido':[5388,5330]};counts={}
for name,pages in choices.items():
 path=ASSETS/(name+'-route.json');r=json.loads(path.read_text(encoding='utf-8'));counts[name]=add(r,[d for d in docs if d['page'] in pages]);path.write_text(json.dumps(r,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
g=json.loads((ROOT/'dist/assets/route-geometry.json').read_text(encoding='utf-8'));r=dict(stations=[dict(st,s=st.get('s',st.get('distanceM'))) for st in g['stations']],points=g['points'],structures=[]);counts['tohoku']=add(r,[d for d in docs if d['page']==6869]);(ROOT/'dist/assets/level-crossings-tohoku.json').write_text(json.dumps(dict(structures=r['structures'],source='https://fumikiri.info/?page_id=6869'),ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(ROOT/'dist/assets/crossing-sources.json').write_text(json.dumps(dict(references=['https://fumikiri.info/?page_id='+str(p) for p in PAGES],notes='BVE chainage is retained where supplied. Other crossings are geographic markers projected onto the prototype railway; local alignment is approximate.',added=counts),ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(counts))
