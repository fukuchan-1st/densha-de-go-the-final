"""Build the Tatsuno branch from the already downloaded official OSM extract."""
from pathlib import Path
import json,math,heapq,runpy
import osmium
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT.parent/'all-road-cache';target=CACHE/'tatsuno-rail.json'
if not target.exists():
 elements=[]
 for obj in osmium.FileProcessor(str(CACHE/'chubu-latest.osm.pbf')).with_locations().with_filter(osmium.filter.KeyFilter('railway')):
  if obj.is_node() and obj.tags.get('railway')=='station' and 35.9<obj.lat<36.16 and 137.9<obj.lon<138.13:
   elements.append(dict(type='node',id=obj.id,lat=obj.lat,lon=obj.lon,tags=dict(obj.tags)))
  elif obj.is_way() and obj.tags.get('railway')=='rail':
   nodes=[n for n in obj.nodes if n.location.valid()]
   if not any(35.9<n.lat<36.16 and 137.9<n.lon<138.13 for n in nodes):continue
   elements.append(dict(type='way',id=obj.id,nodes=[n.ref for n in nodes],geometry=[dict(lat=n.lat,lon=n.lon) for n in nodes],tags=dict(obj.tags)))
 target.write_text(json.dumps(dict(elements=elements)),encoding='utf8')
helpers=runpy.run_path(str(ROOT/'tools/extend-shinshu-osm.py'),run_name='library');Base=helpers['RailNetwork'];xy=helpers['xy']
class ViaNetwork(Base):
 def route(self,names):
  labels=[self.label(n) for n in names];anchors=[]
  for label in labels:
   point=xy(label['lat'],label['lon']);anchors.append(min(self.points,key=lambda n:math.dist(self.points[n],point)))
  path=[]
  for first,last in zip(anchors,anchors[1:]):
   queue=[(0,first)];dist={first:0};prev={first:None}
   while queue:
    cost,node=heapq.heappop(queue)
    if node==last:break
    if dist[node]!=cost:continue
    for other,length in self.graph[node].items():
     if cost+length<dist.get(other,math.inf):dist[other]=cost+length;prev[other]=node;heapq.heappush(queue,(cost+length,other))
   if last not in prev:raise ValueError('Disconnected branch between '+str(first)+' and '+str(last))
   part=[];node=last
   while node is not None:part.append(node);node=prev[node]
   part.reverse();path.extend(part if not path else part[1:])
  positions=[self.points[n] for n in path];raw=[0]
  for a,b in zip(positions,positions[1:]):raw.append(raw[-1]+math.dist(a,b))
  projections=[];last_index=0
  for label,node in zip(labels,anchors):
   i=path.index(node,last_index);last_index=i;projections.append((math.dist(xy(label['lat'],label['lon']),positions[i]),raw[i],positions[i]))
  return labels,path,positions,raw,projections
network=ViaNetwork([json.loads(target.read_text())]);names=['岡谷','川岸','辰野','信濃川島','小野','塩尻']
r=helpers['make_route'](network,names,'tatsuno','中央本線・辰野支線',[0,3500,9500,13800,17800,27700])
r.update(trafficSections=[dict(sStart=-300,sEnd=28000,tracks=1)],drivingTrack=[[-300,0],[28000,0]],neighborTracks=[],stationLayouts={})
for st in r['stations']:
 s=st['s'];r['stationLayouts'][st['name']]={'platforms':[dict(boarding=True,edges=[[-90,-5.5,-1.55],[15,-5.5,-1.55]],roof=[-75,-10]) ]}
r['limits']=[dict(sStart=0,sEnd=27701,kmh=85,source='prototype operating cap')]
out=ROOT/'dist/assets/final/tatsuno-route.json';out.write_text(json.dumps(r,ensure_ascii=False,separators=(',',':')),encoding='utf8');print('Tatsuno:',len(r['points']),'points',len(r['structures']),'structures',flush=True)
