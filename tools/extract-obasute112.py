import osmium,json,gzip,math
from pathlib import Path
root=Path.cwd(); out=root.parent/'obasute112';out.mkdir(exist_ok=True)
rows=[];rails=[];counts={}
for w in osmium.FileProcessor(str(root.parent/'all-road-cache/chubu-latest.osm.pbf')).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)):
 tags=dict(w.tags); land=tags.get('landuse');water=tags.get('waterway');rail=tags.get('railway');building=tags.get('building')
 if land not in ('farmland','orchard','residential','commercial','industrial','forest') and water not in ('river','stream') and tags.get('natural')!='water' and rail!='rail':continue
 if not w.nodes:continue
 n=w.nodes[0]
 if not n.location.valid() or not (36.47<n.lat<36.64 and 138.06<n.lon<138.24):continue
 pts=[[round(n.lon,7),round(n.lat,7)] for n in w.nodes if n.location.valid()]
 if rail=='rail':rails.append({'id':w.id,'tags':tags,'points':pts});continue
 kind='river' if water=='river' or tags.get('water')=='river' else 'water' if tags.get('natural')=='water' else land
 if kind not in ('farmland','orchard','residential','commercial','industrial','forest','river','water'):continue
 counts[kind]=counts.get(kind,0)+1;rows.append({'id':w.id,'kind':kind,'crop':tags.get('crop'),'points':pts})
(out/'osm.json').write_text(json.dumps({'rows':rows,'rails':rails},ensure_ascii=False),encoding='utf-8')
print(counts,'rails',len(rails),flush=True)
