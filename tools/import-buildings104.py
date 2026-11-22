"""Map OSM building footprints onto every real railway; retain sources outside dist."""
from pathlib import Path
import math,json,gzip,collections,re
import osmium
from shapely.geometry import Polygon
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT.parent/'buildings104';CACHE.mkdir(exist_ok=True)
ns={'__file__':str(ROOT/'tools/import-all-roads.py'),'__name__':'building_alignment'}
exec((ROOT/'tools/import-all-roads.py').read_text(encoding='utf8').split('alignments=')[0],ns)
align={}
for key,route in ns['routes'].items():
    if key=='toho' or key.startswith('toho-'):continue
    try:align[key]=ns['Alignment'](route)
    except Exception as e:raise RuntimeError(f'Cannot align {key}') from e
X=math.pi/180*6371008.8*math.cos(math.radians(36));Y=math.pi/180*6371008.8
grid=collections.defaultdict(set)
def cell(lat,lon):return math.floor(lon*X/500),math.floor(lat*Y/500)
for key,a in align.items():
    for _,x,z in a.geo:
        lat,lon=a.gps(complex(x,z));cx,cz=cell(lat,lon)
        for dx in [-1,0,1]:
            for dz in [-1,0,1]:grid[cx+dx,cz+dz].add(key)
def height(tags):
    value=tags.get('height');levels=tags.get('building:levels')
    for raw,mult in [(value,1),(levels,3.1)]:
        match=re.match(r'^\s*([\d.]+)',str(raw or ''))
        if match:return round(max(2,min(180,float(match[1])*mult)),1)
    return {'house':6,'detached':6,'apartments':12,'industrial':8,'warehouse':7,'commercial':12,'office':20,'retail':7,'roof':3,'garage':3,'garages':3}.get(tags.get('building'),7)
for region in ['tohoku','kanto','chubu','kansai']:
    target=CACHE/(region+'.json.gz')
    if target.exists():continue
    source=ROOT.parent/'all-road-cache'/(region+'-latest.osm.pbf');rows=[]
    print('Extracting',region,flush=True)
    for way in osmium.FileProcessor(str(source)).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)).with_filter(osmium.filter.KeyFilter('building')):
        if way.tags.get('building') in ('no','construction') or len(way.nodes)<4 or way.nodes[0].ref!=way.nodes[-1].ref:continue
        first=way.nodes[0]
        if not first.location.valid() or cell(first.lat,first.lon) not in grid:continue
        coords=[(n.lon*X,n.lat*Y) for n in way.nodes if n.location.valid()]
        if len(coords)<4:continue
        polygon=Polygon(coords)
        if not polygon.is_valid:polygon=polygon.buffer(0)
        if polygon.is_empty or polygon.area<8:continue
        rect=polygon.minimum_rotated_rectangle
        if rect.geom_type!='Polygon':continue
        points=list(rect.exterior.coords)[:4];center=rect.centroid
        rows.append([way.id,center.y/Y,center.x/X,[[z/Y,x/X] for x,z in points],height(dict(way.tags))])
    reader=osmium.io.Reader(str(source));timestamp=reader.header().get('osmosis_replication_timestamp');reader.close()
    target.write_bytes(gzip.compress(json.dumps(dict(timestamp=timestamp,rows=rows),separators=(',',':')).encode(),mtime=0))
    print(region,'retained nearby buildings',len(rows),flush=True)
from shapely.geometry import LineString
from shapely.strtree import STRtree
from shapely import points as vector_points
out={key:[] for key in align};seen={key:set() for key in align};timestamps={}
nearest={key:STRtree([LineString([(u[1],u[2]),(v[1],v[2])]) for u,v in zip(a.geo,a.geo[1:])]) for key,a in align.items()}
for region in ['tohoku','kanto','chubu','kansai']:
    data=json.loads(gzip.decompress((CACHE/(region+'.json.gz')).read_bytes()));timestamps[region]=data['timestamp']
    buckets=collections.defaultdict(list)
    for row in data['rows']:
        for key in grid.get(cell(row[1],row[2]),[]):
            if row[0] not in seen[key]:buckets[key].append(row)
    for key,entries in buckets.items():
        a=align[key];centers=[a.xy(row[1],row[2]) for row in entries]
        indices,distances=nearest[key].query_nearest(vector_points([(v.real,v.imag) for v in centers]),max_distance=220,return_distance=True,all_matches=False)
        for (index,segment),distance in zip(indices.T,distances):
            ident,lat,lon,corners,h=entries[index]
            if ident in seen[key]:continue
            u,v=a.geo[segment:segment+2];start=complex(u[1],u[2]);delta=complex(v[1]-u[1],v[2]-u[2]);relative=centers[index]-start
            t=max(0,min(1,(relative.real*delta.real+relative.imag*delta.imag)/max(.001,abs(delta)**2)))
            chain=u[0]+t*(v[0]-u[0])
            if not -200<=chain<=a.r['length']+200:continue
            anchor=a.transform(chain);scale=anchor[3];center=anchor[1]+(centers[index]-anchor[2])/scale
            local=[anchor[1]+(a.xy(*point)-anchor[2])/scale for point in corners]
            width,depth=abs(local[1]-local[0]),abs(local[2]-local[1]);angle=math.atan2((local[1]-local[0]).imag,(local[1]-local[0]).real)
            if min(width,depth)<2 or max(width,depth)>300:continue
            seen[key].add(ident);reference=ns['sample'](a.points,chain)
            out[key].append((float(distance),[round(chain*10),round((center.real-reference.real)*10),round((center.imag-reference.imag)*10),round(width*10),round(depth*10),round(angle*1000),round(h*10)]))
    print('Mapped',region,sum(len(rows) for rows in out.values()),flush=True)
folder=ROOT/'dist/assets/buildings';folder.mkdir(exist_ok=True)
coverage={}
for radius in [220,150,100,75]:
    packed={}
    for key,entries in out.items():
        rows=sorted((row for distance,row in entries if distance<=radius),key=lambda row:row[0])
        payload=dict(route=key,bufferM=radius,encoding='decimetre-center-delta-v1',source='OpenStreetMap building footprints / ODbL',height='Mapped height/levels when available; otherwise approximate by building type',rows=rows)
        packed[key]=(rows,gzip.compress(json.dumps(payload,separators=(',',':')).encode(),mtime=0))
    if sum(len(data) for rows,data in packed.values())<3600000:break
for key,(rows,data) in packed.items():
    (folder/(key+'.json.gz')).write_bytes(data);coverage[key]=dict(buildings=len(rows),bytes=len(data));print(key,len(rows),len(data),flush=True)
(folder/'coverage.json').write_text(json.dumps(dict(timestamp=timestamps,bufferM=radius,routes=coverage,attribution='© OpenStreetMap contributors / ODbL',googleStreetView='Visual reference only; imagery not redistributed'),ensure_ascii=False,indent=2),encoding='utf8')
print('Total bytes',sum(v['bytes'] for v in coverage.values()),'buffer',radius,flush=True)
