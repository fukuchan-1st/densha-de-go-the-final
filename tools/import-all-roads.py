"""Fetch actual OSM road corridors and align them to every playable route.

Run download-road-regions.py first. Regional source data stays outside the
distributable. Coverage distinguishes source extraction from inferred scenery.
"""
import bisect, collections, gzip, json, math
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'dist/assets'; CACHE=ROOT.parent/'all-road-cache'; CACHE.mkdir(exist_ok=True)
R=6371008.8
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def sample(points,s):
 i=max(0,min(len(points)-2,bisect.bisect_right([p[0] for p in points],s)-1))
 a,b=points[i:i+2];f=(s-a[0])/max(.001,b[0]-a[0]);return complex(a[1]+f*(b[1]-a[1]),a[2]+f*(b[2]-a[2]))

station_geo={}
for p in (ROOT.parent/'crossing-reference-data').glob('*-st.geojson'):
 for f in read(p)['features']:
  name=f['properties'].get('sname','').removesuffix('駅');lon,lat=f['geometry']['coordinates'][:2];station_geo[name]=(lat,lon)
station_geo.update(read(ROOT.parent/'yagan-station-coordinates.json'))
paths=sorted((ASSETS/'final').glob('*-route.json'))
routes={p.stem.removesuffix('-route'):read(p) for p in paths}
g=read(ASSETS/'route-geometry.json');routes['tohoku']={**g,'id':'tohoku','length':g['points'][-1][0],'stations':[{**s,'s':s.get('s',s.get('distanceM'))} for s in g['stations']]}

class Alignment:
 def __init__(self,r):
  self.r=r;self.points=r['points'];self.stations=[]
  for st in r['stations']:
   geo=(st['lat'],st['lon']) if st.get('lat') is not None else station_geo.get(st['name'].removesuffix('駅'))
   if geo:self.stations.append((st['s'],geo))
  if len(self.stations)<2:raise ValueError('Missing geographic anchors '+r['id'])
  self.lat,self.lon=self.stations[0][1];self.cos=math.cos(math.radians(self.lat))
  self.anchor=[]
  projection=r.get('projection')
  if projection:
   self.lat=projection['referenceLatitude'];self.lon=projection['referenceLongitude'];self.cos=math.cos(math.radians(self.lat))
   self.anchor=[(0,0j,0j,1+0j),(r['length'],0j,0j,1+0j)]
  else:
   for (s,a),(t,b) in zip(self.stations,self.stations[1:]):
    pa,pb=sample(self.points,s),sample(self.points,t);ga,gb=self.xy(*a),self.xy(*b)
    self.anchor.append((s,pa,ga,(gb-ga)/(pb-pa)))
  self.keys=[a[0] for a in self.anchor];self.geo=[];self.grid=collections.defaultdict(list)
  for s,x,z,*_ in self.points:
   a=self.transform(s);v=a[2]+(complex(x,z)-a[1])*a[3];self.geo.append((s,v.real,v.imag))
  for i,(a,b) in enumerate(zip(self.geo,self.geo[1:])):
   for x in range(math.floor(min(a[1],b[1])/200),math.floor(max(a[1],b[1])/200)+1):
    for y in range(math.floor(min(a[2],b[2])/200),math.floor(max(a[2],b[2])/200)+1):self.grid[x,y].append(i)
 def xy(self,lat,lon):return complex(math.radians(lon-self.lon)*R*self.cos,math.radians(lat-self.lat)*R)
 def gps(self,v):return self.lat+math.degrees(v.imag/R),self.lon+math.degrees(v.real/R/self.cos)
 def transform(self,s):return self.anchor[max(0,min(len(self.anchor)-1,bisect.bisect_right(self.keys,s)-1))]
 def project(self,lat,lon):
  v=self.xy(lat,lon);gx,gy=math.floor(v.real/200),math.floor(v.imag/200);best=(1e9,0)
  for i in set(i for x in range(gx-1,gx+2) for y in range(gy-1,gy+2) for i in self.grid[x,y]):
   a,b=self.geo[i:i+2];pa=complex(a[1],a[2]);d=complex(b[1]-a[1],b[2]-a[2]);f=max(0,min(1,((v-pa).real*d.real+(v-pa).imag*d.imag)/max(.001,abs(d)**2)));distance=abs(v-pa-d*f)
   if distance<best[0]:best=distance,a[0]+f*(b[0]-a[0])
  a=self.transform(best[1]);local=a[1]+(v-a[2])/a[3];return best[0],best[1],[round(local.real,1),round(local.imag,1)]

alignments={k:Alignment(r) for k,r in routes.items()}
def regional_roads():
 import osmium
 cells=set()
 for a in alignments.values():
  for s in range(0,int(a.r['length'])+1,100):
   lat,lon=a.gps(sample(a.geo,s));x,y=math.floor(lat*200),math.floor(lon*200)
   for dx in [-1,0,1]:
    for dy in [-1,0,1]:cells.add((x+dx,y+dy))
 docs=[]
 for region in ['kanto','chubu','kansai','tohoku']:
  cache=CACHE/(region+'-corridor-ways.json');pbf=CACHE/(region+'-latest.osm.pbf')
  if cache.exists():docs.append(read(cache));continue
  if not pbf.exists() or pbf.stat().st_size<100000000:raise ValueError('Regional download is incomplete: '+region)
  ways=[];print('extracting',region,flush=True)
  processor=osmium.FileProcessor(str(pbf)).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.KeyFilter('highway'))
  for w in processor:
   if w.tags.get('highway') not in ['motorway','trunk','primary','secondary','tertiary','unclassified','residential','service','living_street']:continue
   geometry=[dict(lat=n.lat,lon=n.lon) for n in w.nodes if n.location.valid()]
   if not any((math.floor(n['lat']*200),math.floor(n['lon']*200)) in cells for n in geometry):continue
   ways.append(dict(type='way',id=w.id,tags={k:v for k,v in w.tags},geometry=geometry))
  doc=dict(elements=ways,source='https://download.geofabrik.de/asia/japan/'+region+'.html',pbfBytes=pbf.stat().st_size)
  cache.write_text(json.dumps(doc),encoding='utf8');docs.append(doc);print(region,'extracted',len(ways),flush=True)
 return docs

if __name__=='__main__':
 docs=regional_roads()
 coverage=[dict(route=name,start=0,end=r['length'],status='fetched',method='Geofabrik complete regional extracts; full corridor filtered locally') for name,r in routes.items()]
 (CACHE/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2),encoding='utf8')
 ways={w['id']:w for doc in docs for w in doc.get('elements',[]) if w.get('type')=='way' and w.get('geometry')}
 out=ASSETS/'roads';out.mkdir(exist_ok=True)
 stats={}
 for name,a in alignments.items():
  roads=[]
  for way in ways.values():
   tags=way.get('tags',{});part=[];chain=[]
   def finish():
    if len(part)>1:roads.append(dict(osmWayId=way['id'],s=round(sum(chain)/len(chain),1),points=part.copy(),width=5 if tags.get('highway') in ['service','living_street'] else 6 if tags.get('highway')=='residential' else 10,bridge=tags.get('bridge')=='yes',source='OpenStreetMap'))
   dense=[]
   for u,v in zip(way['geometry'],way['geometry'][1:]):
    count=max(1,math.ceil(math.hypot((v['lat']-u['lat'])*111200,(v['lon']-u['lon'])*90000)/40))
    for i in range(count):
     f=i/count;dense.append(dict(lat=u['lat']+(v['lat']-u['lat'])*f,lon=u['lon']+(v['lon']-u['lon'])*f))
   dense.append(way['geometry'][-1])
   for node in dense:
    distance,s,p=a.project(node['lat'],node['lon'])
    if distance>150 or not 0<=s<=a.r['length']:
     finish();part=[];chain=[];continue
    if not part or math.dist(part[-1],p)>=5:part.append(p);chain.append(s)
   finish()
  payload=dict(route=name,roads=roads,attribution='© OpenStreetMap contributors',alignment='OSM geographic coordinates; BVE tracks aligned between station anchors; scenery heights approximate')
  with gzip.GzipFile(filename=str(out/(name+'.json.gz')),mode='wb',mtime=0) as f:f.write(json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode())
  r=routes[name];r.pop('roads',None);r['roadAsset']='./assets/roads/'+name+'.json.gz';r['roadSource']=payload['attribution']+'; '+payload['alignment']
  if name!='tohoku':(ASSETS/'final'/(name+'-route.json')).write_text(json.dumps(r,ensure_ascii=False,separators=(',',':')),encoding='utf8')
  stats[name]=len(roads);print(name,'saved',len(roads),flush=True)
 (ASSETS/'road-coverage.json').write_text(json.dumps(dict(corridors=coverage,segments=stats,source='OpenStreetMap',bufferM=150,notes='Fetched means a complete regional extract was filtered along the full corridor, including sections with no mapped roads. Geographic alignment to BVE is approximate.'),ensure_ascii=False,indent=2),encoding='utf8')
