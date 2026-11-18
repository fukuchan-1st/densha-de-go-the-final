import importlib.util,json,math
from pathlib import Path
p=Path('tools/import-all-roads.py');sp=importlib.util.spec_from_file_location('roads',p);m=importlib.util.module_from_spec(sp);exec(p.read_text(encoding='utf8').replace('alignments={k:Alignment(r) for k,r in routes.items()}',"alignments={k:Alignment(r) for k,r in routes.items() if not (k=='toho' or k.startswith('toho-'))}"),m.__dict__)
import osmium
cells=set()
for a in m.alignments.values():
 for s in range(0,int(a.r['length'])+1,200):
  lat,lon=a.gps(m.sample(a.geo,s));x,y=math.floor(lat*200),math.floor(lon*200)
  for dx in [-1,0,1]:
   for dy in [-1,0,1]:cells.add((x+dx,y+dy))
ways={}
for region in ['kanto','chubu','kansai','tohoku']:
 cache=m.CACHE/(region+'-corridor-rails.json')
 if cache.exists():rows=m.read(cache)
 else:
  print('Extracting railway',region,flush=True);rows=[]
  proc=osmium.FileProcessor(str(m.CACHE/(region+'-latest.osm.pbf'))).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.KeyFilter('railway'))
  for w in proc:
   if w.tags.get('railway')!='rail' or w.tags.get('tunnel')=='yes' or w.tags.get('service') in ['siding','yard','spur']:continue
   g=[[n.lat,n.lon] for n in w.nodes if n.location.valid()]
   if len(g)<2 or not any((math.floor(n[0]*200),math.floor(n[1]*200)) in cells for n in g):continue
   rows.append(dict(id=w.id,name=w.tags.get('name',''),bridge=w.tags.get('bridge')=='yes',geometry=g))
  cache.write_text(json.dumps(rows),encoding='utf8')
 ways.update({w['id']:w for w in rows});print(region,len(rows),flush=True)
(m.CACHE/'parallel-source-rails.json').write_text(json.dumps(list(ways.values())),encoding='utf8')
print('DONE',len(ways),flush=True)
