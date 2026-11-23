import osmium,json
from pathlib import Path
rows=[]
for w in osmium.FileProcessor('../all-road-cache/chubu-latest.osm.pbf').with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.TagFilter(('railway','platform'))):
 if w.nodes and w.nodes[0].location.valid() and 36.49<w.nodes[0].lat<36.51 and 138.08<w.nodes[0].lon<138.11: rows.append({'id':w.id,'tags':dict(w.tags),'points':[[n.lon,n.lat] for n in w.nodes]})
Path('../obasute112/platforms.json').write_text(json.dumps(rows),encoding='utf-8');print(rows)
