"""Produce road corridors and automatic 600 m OSM land-use indices."""
from pathlib import Path
import json, math, gzip
from shapely.geometry import Point, Polygon, box
from shapely.strtree import STRtree
from shapely.ops import unary_union
from shapely.geometry import shape
from shapely.ops import transform
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT.parent/'yamagata97'
OUT=ROOT/'dist/assets'
route=json.loads((OUT/'final/yamagata-route.json').read_text(encoding='utf8'))
ns={'__file__':str(ROOT/'tools/import-all-roads.py'),'__name__':'yamagata_roads'}
exec((ROOT/'tools/import-all-roads.py').read_text(encoding='utf8').split('alignments=')[0],ns)
a=ns['Alignment'](route)
roads=[]
for way in json.loads((CACHE/'roads.json').read_text(encoding='utf8'))['elements']:
    tags=way['tags'];part=[];chain=[]
    def finish():
        if len(part)>1:roads.append(dict(osmWayId=way['id'],s=round(sum(chain)/len(chain),1),points=part.copy(),width=5 if tags.get('highway') in ('service','living_street') else 6 if tags.get('highway')=='residential' else 10,bridge=tags.get('bridge','no') not in ('no','false','0',''),osmBridge=tags.get('bridge','no'),osmLayer=tags.get('layer','0'),osmTunnel=tags.get('tunnel','no'),osmLevelVerified=True,source='OpenStreetMap'))
    if not any(a.project(n['lat'],n['lon'])[0]<350 for n in way['geometry']):continue
    dense=[]
    for u,v in zip(way['geometry'],way['geometry'][1:]):
        count=max(1,math.ceil(math.hypot((v['lat']-u['lat'])*111200,(v['lon']-u['lon'])*88000)/40))
        for i in range(count):
            f=i/count;dense.append(dict(lat=u['lat']+(v['lat']-u['lat'])*f,lon=u['lon']+(v['lon']-u['lon'])*f))
    dense.append(way['geometry'][-1])
    for n in dense:
        distance,s,p=a.project(n['lat'],n['lon'])
        if distance>150 or not 0<=s<=route['length']:finish();part=[];chain=[];continue
        if not part or math.dist(part[-1],p)>=5:part.append(p);chain.append(s)
    finish()
payload=dict(route='yamagata',roads=roads,attribution='© OpenStreetMap contributors / ODbL',alignment='OSM full Tohoku extract; BVE station-anchor alignment; mapped bridge/layer/tunnel retained')
(OUT/'roads/yamagata.json.gz').write_bytes(gzip.compress(json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
print('roads',len(roads),flush=True)

X=111320*math.cos(math.radians(38));Y=111320
stations=route['stations'];buffers=[Point(s['lon']*X,s['lat']*Y).buffer(600,quad_segs=16) for s in stations];tree=STRtree(buffers)
buckets=[{k:[] for k in ['building','green','urban','forest','farmland','orchard']} for _ in stations]
for way in json.loads((CACHE/'land.json').read_text(encoding='utf8'))['elements']:
    pts=way['geometry']
    if len(pts)<4 or pts[0]!=pts[-1]:continue
    coords=[(n['lon']*X,n['lat']*Y) for n in pts]
    bounds=box(min(x for x,y in coords),min(y for x,y in coords),max(x for x,y in coords),max(y for x,y in coords))
    hits=tree.query(bounds)
    if not len(hits):continue
    tags=way['tags'];land=tags.get('landuse');natural=tags.get('natural');keys=[]
    if tags.get('building') not in (None,'no'):keys.append('building')
    if land in ('forest','farmland','farmyard','orchard','vineyard','meadow','grass','allotments','recreation_ground','village_green') or natural in ('wood','scrub','grassland','heath'):keys.append('green')
    if land in ('residential','commercial','industrial','retail','railway','construction'):keys.append('urban')
    if land=='forest' or natural in ('wood','scrub'):keys.append('forest')
    if land in ('farmland','meadow','grass'):keys.append('farmland')
    if land in ('orchard','vineyard'):keys.append('orchard')
    if not keys:continue
    poly=Polygon(coords)
    if not poly.is_valid:poly=poly.buffer(0)
    for index in hits:
        clip=poly.intersection(buffers[index])
        if not clip.is_empty:
            for key in keys:buckets[index][key].append(clip)
area_file=CACHE/'areas.json'
if area_file.exists():
    for row in json.loads(area_file.read_text(encoding='utf8')):
        tags=row['tags'];land=tags.get('landuse');natural=tags.get('natural');keys=[]
        if land in ('forest','farmland','farmyard','orchard','vineyard','meadow','grass','allotments','recreation_ground','village_green') or natural in ('wood','scrub','grassland','heath'):keys.append('green')
        if land=='forest' or natural in ('wood','scrub'):keys.append('forest')
        if land in ('farmland','meadow','grass'):keys.append('farmland')
        if land in ('orchard','vineyard'):keys.append('orchard')
        if land in ('residential','commercial','industrial','retail','railway','construction'):keys.append('urban')
        if not keys:continue
        poly=transform(lambda x,y,z=None:(x*X,y*Y),shape(row['geometry']))
        if not poly.is_valid:poly=poly.buffer(0)
        for index in tree.query(poly):
            clip=poly.intersection(buffers[index])
            if not clip.is_empty:
                for key in keys:buckets[index][key].append(clip)
rows=[]
for i,st in enumerate(stations):
    parts={k:unary_union(v).area/buffers[i].area if v else 0 for k,v in buckets[i].items()}
    coverage=unary_union(sum([buckets[i][k] for k in ['building','green','urban']],[])).area/buffers[i].area
    building=min(100,100*max(math.sqrt(parts['building']/.28),parts['urban']*.85))
    green=min(100,100*max(parts['green'],(1-parts['urban'])*.55 if coverage<.15 else 0))
    rows.append(dict(name=st['name'],lat=st['lat'],lon=st['lon'],building=round(building),green=round(green),**{k:round(v,5) for k,v in parts.items() if k not in ('building','green')},coverage=round(coverage,5),source='osm-600m'))
route['sceneryProfile']=rows
(OUT/'final/yamagata-route.json').write_text(json.dumps(route,ensure_ascii=False,separators=(',',':')),encoding='utf8')
p=ROOT/'dist/scenery-profile-data.js';text=p.read_text(encoding='utf8');profiles=json.loads(text.split('export const SCENERY_PROFILES=')[1].strip().removesuffix(';'))
profiles=[p for p in profiles if p['id']!='yamagata']+[dict(id='yamagata',name='奥羽本線（山形線）',rows=rows)]
p.write_text('// Automatically derived from OSM footprints / land use and GSI DEM10B terrain.\nexport const SCENERY_PROFILES='+json.dumps(profiles,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print('automatic scenery rows',len(rows),flush=True)
