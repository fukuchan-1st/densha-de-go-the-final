from pathlib import Path
import osmium,json
out=Path('../tobu-route-cache');out.mkdir(exist_ok=True)
rows=[]
for region in ['kanto','tohoku']:
 for n in osmium.FileProcessor('../all-road-cache/'+region+'-latest.osm.pbf').with_filter(osmium.filter.EntityFilter(osmium.osm.NODE)).with_filter(osmium.filter.TagFilter(('railway','station'),('railway','halt'))):
  if 35.65<n.lat<37.3 and 139.2<n.lon<140.05: rows.append(dict(type='node',id=n.id,lat=n.lat,lon=n.lon,tags=dict(n.tags)))
 for w in osmium.FileProcessor('../all-road-cache/'+region+'-latest.osm.pbf').with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.TagFilter(('railway','rail'))):
  if not w.nodes or not w.nodes[0].location.valid():continue
  if not (35.65<w.nodes[0].lat<37.3 and 139.2<w.nodes[0].lon<140.05):continue
  rows.append(dict(type='way',id=w.id,nodes=[n.ref for n in w.nodes],geometry=[dict(lat=n.lat,lon=n.lon) for n in w.nodes],tags=dict(w.tags)))
 print(region,len(rows),flush=True)
(out/'rails.json').write_text(json.dumps(dict(elements=rows),ensure_ascii=False,separators=(',',':')),encoding='utf8')
