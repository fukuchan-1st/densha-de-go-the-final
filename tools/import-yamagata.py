"""Join supplied Fukushima–Yonezawa BVE geometry to OSM standard-gauge rails."""
from pathlib import Path
from importlib.machinery import SourceFileLoader
import json, math, bisect
from shapely.geometry import LineString, Point
from shapely.strtree import STRtree

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT.parent/'yamagata97'
OUT=ROOT/'dist/assets/final'
shin=SourceFileLoader('shinshu97',str(ROOT/'tools/import-shinshu-bve.py')).load_module()
# Structure-list fields in this pack contain leading spaces after commas.
shin.BveMap.path=lambda self,name:(self.root/name.strip().replace('\\','/')).resolve()
source=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/data/A_Ishida/奥羽本線(山形線)/431M.txt')
bve,parsed=shin.make_route(source,'yamagata-bve','奥羽本線（山形線）')
osm={'__name__':'yamagata_osm'}
exec((ROOT/'tools/extend-shinshu-osm.py').read_text(encoding='utf8').split('if __name__')[0].replace('"1067"','"1435"').replace('"新幹線", "貨物", "緩行", "飯田線"','"東北新幹線", "貨物", "緩行", "飯田線"'),osm)
osm['BASE_LAT'],osm['BASE_LON']=37.7542,140.4596
doc=json.loads((CACHE/'rails.json').read_text(encoding='utf8'))
network=osm['RailNetwork']([doc])
names='米沢 置賜 高畠 赤湯 中川 羽前中山 かみのやま温泉 茂吉記念館前 蔵王 山形 北山形 羽前千歳 南出羽 漆山 高擶 天童南 天童 乱川 神町 さくらんぼ東根 東根 村山 袖崎 大石田 北大石田 芦沢 舟形 新庄'.split()
tail=osm['make_route'](network,names,'yamagata-osm','奥羽本線（山形線）')
fullgeo=osm['make_route'](network,[s['name'] for s in bve['stations'] if s['name']!='赤岩']+names[1:],'yamagata-geographic','山形線')
(CACHE/'geographic.json').write_text(json.dumps(fullgeo,ensure_ascii=False,separators=(',',':')),encoding='utf8')
for station in bve['stations']:
    if station['name']=='赤岩':continue
    label=network.label(station['name']);station.update(lat=label['lat'],lon=label['lon'])
# Retain the old site's scenery and source chainage, but do not schedule a stop.
historic=next(s for s in bve['stations'] if s['name']=='赤岩')
bve['stations']=[s for s in bve['stations'] if s['name']!='赤岩']
for s in bve['stations']:
    for key in ['arrival','departure','startTime','arrivalSound','departureSound']:s.pop(key,None)
bve['soundEvents']=[]
anchors={s['s'] for s in bve['stations']}
bve['points']=[p for i,p in enumerate(bve['points']) if i%4==0 or p[0] in anchors or i==len(bve['points'])-1]
route=osm['concatenate']([(bve,'Provided BVE: 431M.txt + curve/gradient/structure includes'),(tail,'OpenStreetMap 1435 mm rail graph')],'yamagata','奥羽本線（山形線）')
route['gaugeM']=1.435
route['historicalStations']=[dict(**{**historic,'name':'赤岩（廃駅）','closed':True,'source':'JR East 20210120_s01.pdf'})]
route['vegetation']=bve['vegetation']
route['roadAsset']='./assets/roads/yamagata.json.gz'
route['importNotes'] += ['赤岩は廃駅のため停車駅から除外。','福島〜米沢のホームは提供ストラクチャの位置から読み取り。','米沢以北の勾配と速度規制、駅の停止位置・ホーム幅は未提供部分を近似。','719系5000番台は提供0番台車体＋211系運転台・走行音を使用した仮モデル。','ダイヤは運転性能に合わせて生成したゲーム用時刻。']
route['sources'] += [dict(title='OpenStreetMap / Geofabrik Tohoku extract',url='https://download.geofabrik.de/asia/japan/tohoku.html',license='ODbL-1.0'),dict(title='赤岩駅廃止',url='https://www.jreast.co.jp/press/2021/sendai/20210120_s01.pdf')]

# Infer double track only where OSM contains a second standard-gauge main rail.
lines=[]
for way in network.ways.values():
    tags=way['tags']
    if tags.get('gauge')!='1435' or tags.get('service'):continue
    lines.append(LineString([osm['xy'](p['lat'],p['lon']) for p in way['geometry']]))
tree=STRtree(lines)
geo_origin=network.route([s['name'] for s in fullgeo['stations']])[4][0][2]
geo_st={s['name']:s['s'] for s in fullgeo['stations']}
def chain_to_geo(s):
    stations=route['stations'];i=max(0,min(len(stations)-2,bisect.bisect_right([a['s'] for a in stations],s)-1));a,b=stations[i:i+2]
    return geo_st[a['name']]+(geo_st[b['name']]-geo_st[a['name']])*(s-a['s'])/(b['s']-a['s'])
def count(s):
    g=chain_to_geo(s);p=osm['point_at'](fullgeo['points'],g);point=Point(p[0]+geo_origin[0],p[1]+geo_origin[1])
    return 2 if any(2.6<lines[i].distance(point)<8 for i in tree.query(point.buffer(8))) else 1
sections=[]
for a in range(0,math.ceil(route['length']),400):
    b=min(route['length'],a+400);n=2 if sum(count(min(route['length']-1,max(1,s)))==2 for s in [a+40,(a+b)/2,b-40])>=2 else 1
    if sections and sections[-1]['tracks']==n:sections[-1]['sEnd']=b
    else:sections.append(dict(sStart=a,sEnd=b,tracks=n,source='OSM parallel 1435 mm main rails; boundaries approximated at 400 m resolution'))
route['trafficSections']=sections
route['trafficSections'][0]['sStart']=-300
route['trafficSections'][-1]['sEnd']=route['length']+300

# Platforms outside the supplied BVE area: fit a local-train platform around the stop.
for st in route['stations']:
    if st['name'] in route['stationLayouts']:continue
    length=160 if st['name'] in ('山形','天童','村山','大石田','新庄') else 100
    route['stationLayouts'][st['name']]={'platforms':[dict(edges=[[-length+20,-7.5,-1.55],[20,-7.5,-1.55]],roof=[-length+40,0],boarding=True,basis='Approximate platform around OSM station anchor') ]}
    st['platformGeometryQuality']='OSM station anchor; platform dimensions approximate'
    st['passingLoop']=any(count(max(0,min(route['length'],st['s']+d)))==2 for d in [-100,0,100])
(OUT/'yamagata-route.json').write_text(json.dumps(route,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('Yamagata',round(route['length']),len(route['stations']),'stations',len(route['points']),'points',len(route['structures']),'structures',len(sections),'track sections',flush=True)
