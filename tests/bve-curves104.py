from importlib.machinery import SourceFileLoader
from pathlib import Path
import math,json
root=Path(__file__).resolve().parents[1]
m=SourceFileLoader('profile104',str(root/'tools/import-shinshu-bve.py')).load_module()
def command(s,args):return (s,'curve',None,'interpolate',args)
profile=m.Profile([command(0,[0]),command(100,[400]),command(150,[]),command(200,[0])],'curve')
assert abs(profile.at(125)-1/400)<1e-12
assert abs(profile.at(150)-1/400)<1e-12
assert max(abs(v) for s,v,t in profile.knots)<=1/400
profile=m.Profile([command(0,[0]),command(100,[0]),command(100,[270]),command(125,[]),command(125,[0])],'curve')
assert profile.at(50)==0
assert abs(profile.at(110)-1/270)<1e-12
assert profile.at(125)==0
r=json.loads((root/'dist/assets/final/yamagata-route.json').read_text(encoding='utf8'))
from shapely.geometry import LineString
first=[p for p in r['points'] if 0<=p[0]<=6747]
assert LineString([(p[1],p[2]) for p in first]).is_simple,'Fukushima–Niwasaka must not loop or cross itself'
headings=[math.atan2(b[1]-a[1],b[2]-a[2]) for a,b in zip(first,first[1:])]
turn=sum((b-a+math.pi)%(2*math.pi)-math.pi for a,b in zip(headings,headings[1:]))
assert abs(math.degrees(turn))<90
assert r['length']>149000 and r['stations'][1]['s']==3605 and r['stations'][2]['s']==6747
assert all(t['tracks']==2 for t in r['trafficSections'])
print('Omitted curve values, same-distance interpolation, and Fukushima-Niwasaka geometry passed')
