"""Rebuild only Yamagata geometry, preserving all service, wiring and vehicle edits."""
from pathlib import Path
from importlib.machinery import SourceFileLoader
import json, math, bisect
ROOT=Path(__file__).resolve().parents[1]
module=SourceFileLoader('bve104',str(ROOT/'tools/import-shinshu-bve.py')).load_module()
module.BveMap.path=lambda self,name:(self.root/name.strip().replace('\\','/')).resolve()
source=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/data/A_Ishida/奥羽本線(山形線)/431M.txt')
bve,_=module.make_route(source,'yamagata-bve','奥羽本線（山形線）')
file=ROOT/'dist/assets/final/yamagata-route.json'
route=json.loads(file.read_text(encoding='utf8'));old=route['points']
def at(points,s):
    i=max(0,min(len(points)-2,bisect.bisect_right([p[0] for p in points],s)-1));a,b=points[i:i+2];t=(s-a[0])/(b[0]-a[0]);return [a[k]+(b[k]-a[k])*t for k in [1,2,3]]
seam=next(s['s'] for s in route['stations'] if s['name']=='米沢')
end=at(bve['points'],seam);before=at(bve['points'],seam-10);oldend=at(old,seam);after=at(old,seam+10)
angle=math.atan2(end[1]-before[1],end[0]-before[0])-math.atan2(after[1]-oldend[1],after[0]-oldend[0]);c,s=math.cos(angle),math.sin(angle)
def transform(p):
    x,z,y=[v-u for v,u in zip(p,oldend)];return [round(end[0]+c*x-s*z,4),round(end[1]+s*x+c*z,4),round(end[2]+y,4)]
anchors={st['s'] for st in bve['stations']}
points=[p for i,p in enumerate(bve['points']) if 0<=p[0]<=seam and (i%4==0 or p[0] in anchors or p[0]==seam)]
route['points']=points+[[p[0],*transform(p[1:])] for p in old if p[0]>seam]
for st in [*route['stations'],*route.get('historicalStations',[])]:st['x'],st['z'],st['height']=at(route['points'],st['s'])
route['geometryRevision']=104
route['geometryQuality']='Provided BVE curve/grade with omitted interpolation parameters correctly reused; OSM tail aligned continuously at Yonezawa'
route.setdefault('importNotes',[]).append('v104: 曲線パラメータ省略時の二重逆数変換を修正。全区間の距離程、勾配、停車駅と配線設定を維持。')
file.write_text(json.dumps(route,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('Rebuilt geometry',len(route['points']),'points; seam',seam)
