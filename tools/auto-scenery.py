"""Derive station scenery indices from local OSM extracts; never hand-tune stations.
Run --region kanto/chubu/kansai/tohoku, then --merge. See SCENERY-PROFILES.md.
"""
import argparse,json,math,time
from pathlib import Path
import osmium
from shapely.geometry import Point,Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT.parent/'all-road-cache'
REGIONS={'kanto':{'yamanote','chuo','ome','okutama','itsukaichi','yagan','tohoku'},'chubu':{'chuo','shinonoi','oito','tatsuno'},'kansai':{'osaka','tokaido'},'tohoku':{'tohoku'}}
GREEN={'forest','farmland','farmyard','orchard','vineyard','meadow','grass','allotments','recreation_ground','village_green'}
URBAN={'residential','commercial','industrial','retail','railway','construction'}
X=111320*math.cos(math.radians(36));Y=111320
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
def run(region):
 start=time.time();source=json.loads((CACHE/'scenery-input.json').read_text(encoding='utf-8'));profiles=[p for p in source['profiles'] if p['id'] in REGIONS[region]]
 names={r['name'] for p in profiles for r in p['rows']};known={n:p for n,p in source['known'].items() if n in names};candidates={}
 pbf=CACHE/(region+'-latest.osm.pbf')
 for o in osmium.FileProcessor(str(pbf)).with_filter(osmium.filter.EntityFilter(osmium.osm.NODE)).with_filter(osmium.filter.TagFilter(('railway','station'),('railway','halt'))):
  name=o.tags.get('name:ja',o.tags.get('name','')).removesuffix('駅')
  if name in names:candidates.setdefault(name,[]).append([o.location.lon,o.location.lat])
 for p in profiles:
  rows=p['rows']
  for i,row in enumerate(rows):
   name=row['name']
   if name in known or name not in candidates:continue
   nearby=[(abs(j-i),known[r['name']]) for j,r in enumerate(rows) if r['name'] in known]
   reference=min(nearby,key=lambda v:v[0])[1] if nearby else candidates[name][0]
   known[name]=min(candidates[name],key=lambda a:(a[0]-reference[0])**2+(a[1]-reference[1])**2)
 # Known points outside this extract are harmless: no polygons will intersect.
 stations=sorted(known);buffers=[Point(known[n][0]*X,known[n][1]*Y).buffer(600,quad_segs=16) for n in stations];tree=STRtree(buffers)
 buckets=[{k:[] for k in ['building','green','urban','forest','farmland','orchard']} for _ in stations]
 bounds=(min(v[0] for v in known.values())-.15,min(v[1] for v in known.values())-.15,max(v[0] for v in known.values())+.15,max(v[1] for v in known.values())+.15)
 seen=0;used=0
 processor=osmium.FileProcessor(str(pbf)).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.KeyFilter('building','landuse','natural','leisure'))
 for way in processor:
  tags=way.tags;building=tags.get('building') not in [None,'no'];land=tags.get('landuse');natural=tags.get('natural');leisure=tags.get('leisure')
  green=land in GREEN or natural in ['wood','scrub','grassland','heath'] or leisure in ['park','garden','golf_course','nature_reserve']
  urban=land in URBAN
  if not(building or green or urban) or len(way.nodes)<4 or way.nodes[0].ref!=way.nodes[-1].ref:continue
  try:
   first=way.nodes[0].location
   if not(bounds[0]<=first.lon<=bounds[2] and bounds[1]<=first.lat<=bounds[3]):continue
   if building and not tree.query(Point(first.lon*X,first.lat*Y).buffer(1000)).size:continue
   coordinates=[(n.lon*X,n.lat*Y) for n in way.nodes]
   polygon=Polygon(coordinates)
   if not polygon.is_valid:polygon=polygon.buffer(0)
   if polygon.is_empty:continue
  except (RuntimeError,ValueError):continue
  seen+=1;hits=tree.query(polygon)
  if not hits.size:continue
  keys=[]
  if building:keys.append('building')
  if green:keys.append('green')
  if urban:keys.append('urban')
  if land=='forest' or natural in ['wood','scrub']:keys.append('forest')
  if land in ['farmland','meadow','grass']:keys.append('farmland')
  if land in ['orchard','vineyard']:keys.append('orchard')
  for index in hits:
   clip=polygon.intersection(buffers[index])
   if clip.is_empty:continue
   for key in keys:buckets[index][key].append(clip)
   used+=1
 result={}
 for i,name in enumerate(stations):
  parts={k:unary_union(v).area/buffers[i].area if v else 0 for k,v in buckets[i].items()}
  coverage=unary_union(sum([buckets[i][k] for k in ['building','green','urban']],[])).area/buffers[i].area
  result[name]={'lon':known[name][0],'lat':known[name][1],**{k:round(v,5) for k,v in parts.items()},'coverage':round(coverage,5)}
 write(CACHE/('scenery-'+region+'.json'),{'region':region,'radiusM':600,'stations':result,'polygons':used,'elapsedSeconds':round(time.time()-start)})
 print(json.dumps({'region':region,'stations':len(result),'polygons':used,'seconds':round(time.time()-start)}),flush=True)
def merge():
 source=json.loads((CACHE/'scenery-input.json').read_text(encoding='utf-8'));all_data={}
 for region in REGIONS:
  for name,row in json.loads((CACHE/('scenery-'+region+'.json')).read_text(encoding='utf-8'))['stations'].items():
   if name not in all_data or row['coverage']>all_data[name]['coverage']:all_data[name]=row
 profiles=source['profiles'];missing=[]
 for profile in profiles:
  for i,row in enumerate(profile['rows']):
   name=row['name'];data=all_data.get(name)
   if profile['id'] in ['toho','toho-village','toho-center']:
    # Fictional geography: derive land use from the user's village/forest districts.
    village=profile['id']=='toho-village' or profile['id']=='toho' and 10<=i<=16 or profile['id']=='toho-center' and i==0
    underground=profile['id']=='toho-center' and i>0
    row.update(building=0 if underground else 82 if village else 6,green=0 if underground else 32 if village else 92,forest=0 if village or underground else .85,farmland=.15 if village else 0,orchard=0,coverage=1,source='fictional-landuse')
    continue
   if not data:
    missing.append([profile['id'],name]);row.update(building=0,green=0,forest=0,farmland=0,orchard=0,urban=0,coverage=0,source='interpolated-osm');continue
   building=min(100,100*max(math.sqrt(data['building']/.28),data['urban']*.85))
   # Unmapped ground is estimated from mapped land use nearby; clearly marked.
   green=min(100,100*max(data['green'],(1-data['urban'])*.55 if data['coverage']<.15 else 0))
   row.update(building=round(building),green=round(green),urban=data['urban'],forest=data['forest'],farmland=data['farmland'],orchard=data['orchard'],coverage=data['coverage'],lat=data['lat'],lon=data['lon'],source='osm-600m')
 for profile in profiles:
  rows=profile['rows']
  for i,row in enumerate(rows):
   if row['source']!='interpolated-osm':continue
   good=[(abs(j-i),r) for j,r in enumerate(rows) if r['source']=='osm-600m']
   neighbors=sorted(good,key=lambda pair:pair[0])[:2]
   for key in ['building','green','forest','farmland','orchard','urban']:
    row[key]=sum(r.get(key,0)/max(1,d) for d,r in neighbors)/sum(1/max(1,d) for d,r in neighbors) if neighbors else 0
 (ROOT/'dist/scenery-profile-data.js').write_text('// Automatically derived from OpenStreetMap extracts. See SCENERY-PROFILES.md.\nexport const SCENERY_PROFILES='+json.dumps(profiles,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
 write(CACHE/'scenery-coverage.json',{'missing':missing,'stations':sum(len(p['rows']) for p in profiles),'sources':['© OpenStreetMap contributors, ODbL'],'radiusM':600})
 print(json.dumps({'profiles':len(profiles),'missing':missing},ensure_ascii=True))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--region',choices=REGIONS);parser.add_argument('--merge',action='store_true');args=parser.parse_args();merge() if args.merge else run(args.region)
