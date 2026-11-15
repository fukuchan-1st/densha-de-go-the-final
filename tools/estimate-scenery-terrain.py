"""Fill unclassified OSM land with a documented, automatic terrain-based estimate."""
import json,math,runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
height=runpy.run_path(str(ROOT/'tools/basin-dem.py'))['height']
path=ROOT/'dist/scenery-profile-data.js';text=path.read_text(encoding='utf-8');profiles=json.loads(text[text.index('['):text.rindex(']')+1]);cache={}
for profile in profiles:
 for row in profile['rows']:
  if row['source']!='osm-600m':continue
  point=(row['lon'],row['lat'])
  if point not in cache:
   lon,lat=point;X=111320*math.cos(math.radians(lat))
   samples=[height(lon+math.cos(a*math.pi/4)*1500/X,lat+math.sin(a*math.pi/4)*1500/111320) for a in range(8)]
   cache[point]=(round(height(lon,lat)),round(max(samples)-min(samples)))
  elevation,relief=cache[point];unclassified=max(0,1-row['coverage']);open_ground=max(0,1-row['building']/100)
  forest_prior=max(.08,min(.92,relief/420))
  row['forest']=round(min(1,row['forest']+unclassified*open_ground*forest_prior),4)
  row['farmland']=round(min(1,row['farmland']+unclassified*open_ground*(1-forest_prior)*.65),4)
  row['green']=round(min(100,max(row['green'],100*(row['forest']+row['farmland']+row['orchard']))))
  row['elevationM']=elevation;row['reliefM']=relief;row['terrainEstimated']=row['coverage']<.85
for profile in profiles:
 rows=profile['rows']
 for i,row in enumerate(rows):
  if row['source']!='interpolated-osm':continue
  neighbors=sorted([(abs(j-i),r) for j,r in enumerate(rows) if r['source']=='osm-600m'],key=lambda v:v[0])[:2]
  for key in ['building','green','forest','farmland','orchard','urban']:
   row[key]=round(sum(r.get(key,0)/max(1,d) for d,r in neighbors)/sum(1/max(1,d) for d,r in neighbors),4) if neighbors else 0
path.write_text('// Automatically derived from OSM footprints / land use and GSI DEM10B terrain.\nexport const SCENERY_PROFILES='+json.dumps(profiles,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('terrain-estimated station positions',len(cache),flush=True)
