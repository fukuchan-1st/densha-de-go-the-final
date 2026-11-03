from pathlib import Path
import re,json,math,bisect,hashlib,ast
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT.parent.parent/'work'
BVE=Path('C:/Users/bmwhz/OneDrive/ドキュメント/BveTs/Scenarios/東北本線/Map')
OUT=ROOT/'dist/assets/station-layouts.json'
profile=json.loads((ROOT/'dist/assets/bve-profile.json').read_text(encoding='utf-8'));anchors=profile['metadata']['stationAnchors']
stations=json.loads((ROOT/'dist/assets/route-stations.json').read_text(encoding='utf-8'))['stations']
variables={'Dis':0,'Distance':0}
def read(p):
 raw=p.read_bytes()
 for enc in ['utf-8-sig','cp932']:
  try:return raw.decode(enc)
  except UnicodeError:pass
 raise ValueError(p)
def number(expr):
 expr=re.sub(r'\$(\w+)',lambda m:str(variables[m[1]]),expr.strip())
 def calc(n):
  if isinstance(n,ast.Constant) and isinstance(n.value,(int,float)):return n.value
  if isinstance(n,ast.UnaryOp) and isinstance(n.op,(ast.UAdd,ast.USub)):return calc(n.operand)*(1 if isinstance(n.op,ast.UAdd) else -1)
  if isinstance(n,ast.BinOp) and isinstance(n.op,(ast.Add,ast.Sub,ast.Mult,ast.Div)):
   a,b=calc(n.left),calc(n.right);return a+b if isinstance(n.op,ast.Add) else a-b if isinstance(n.op,ast.Sub) else a*b if isinstance(n.op,ast.Mult) else a/b
  raise ValueError(expr)
 return float(calc(ast.parse(expr,mode='eval').body))
def chain(x):
 i=max(0,min(len(anchors)-2,bisect.bisect_right([a['bveDistanceM'] for a in anchors],x)-1));a,b=anchors[i:i+2]
 return round(a['s']+(x-a['bveDistanceM'])*(b['s']-a['s'])/(b['bveDistanceM']-a['bveDistanceM']),4)
records=[];intervals=[];active={};track_points={};platform_commands=[]
for fn in ['Map_Kuroiso4.txt','Map_Kuro-Shira.txt']:
 distance=0
 for line_no,line in enumerate(read(BVE/fn).splitlines(),1):
  line=re.split(r'#|//',line)[0].strip()
  if not line:continue
  assign=re.match(r'\$(\w+)\s*=\s*([^;]+);',line)
  if assign:
   try:variables[assign[1]]=number(assign[2])
   except (ValueError,KeyError):pass
   continue
  if not re.search(r'\b(?:Track|Repeater|Structure|Curve|Gradient|Station|Signal|Sound|Section|Rolling|Joint|Cab|Background)\b',line) and line.endswith(';'):
   try:distance=number(line[:-1])
   except (ValueError,KeyError,SyntaxError):pass
  evidence={'file':fn,'line':line_no,'bveM':distance,'command':line}
  m=re.match(r"Track\['([^']+)'\]\.(Position|X\.Interpolate|Y\.Interpolate)\(([^)]*)\)",line,re.I)
  if m:
   vals=[number(x) for x in m[3].split(',') if x.strip()];axis='both' if m[2].lower()=='position' else m[2][0].lower()
   track_points.setdefault(m[1],[]).append({'s':chain(distance),'axis':axis,'values':vals,'evidence':evidence})
  m=re.match(r"Repeater\['([^']+)'\]\.(Begin|End)\(([^)]*)\)",line,re.I)
  if m:
   key=m[1];args=[a.strip().strip("'") for a in m[3].split(',')]
   if m[2].lower()=='begin':
    if any(re.fullmatch(r'Rail[1-4]',x,re.I) for x in args[10:]):active[key]={'id':key,'track':args[0] or '0','start':chain(distance),'evidence':[evidence]}
    if any(re.search(r'Form|Platform|StationForm',x,re.I) for x in args[10:]):platform_commands.append(evidence)
   elif key in active:
    item=active.pop(key);item.update(end=chain(distance));item['evidence'].append(evidence);intervals.append(item)
for item in active.values():item['end']=22100;intervals.append(item)
def curve(key,axis):
 values={}
 for item in track_points.get(key,[]):
  if item['axis']==axis:values[item['s']]=item['values'][0]
  elif item['axis']=='both':values[item['s']]=item['values'][0 if axis=='x' else 1]
 return sorted(values.items()) or [(0,0)]
def lerp(keys,s):
 i=bisect.bisect_right([p[0] for p in keys],s)-1
 if i<0:return keys[0][1]
 if i>=len(keys)-1:return keys[-1][1]
 a,b=keys[i:i+2];return a[1]+(b[1]-a[1])*(s-a[0])/(b[0]-a[0])
def knots(key,a,b):
 xs,ys=curve(key,'x'),curve(key,'y');ss=sorted({a,b,*[p[0] for p in xs+ys if a<p[0]<b]})
 return [[round(s,4),round(lerp(xs,s),4),round(lerp(ys,s),4)] for s in ss]
tracks=[{'id':'player','source':'route','knots':[[-400,0,0],[110000,0,0]],'primary':True}, {'id':'bve-opposite','source':'bve','knots':knots('Track-6',-400,22100),'primary':True}]
for item in intervals:
 key=item['track'];a=max(-400,item['start']);b=min(22100,item['end'])
 if key in ['0','Track-6'] or b-a<2:continue
 if key=='Track-5':
  # Track-5 and Track-6 become the same visual rail; never duplicate it northward.
  b=min(b,next((s for s in range(max(0,int(a)),int(b)+1,5) if abs(lerp(curve(key,'x'),s)-lerp(curve('Track-6','x'),s))<.25),int(b)))
 if b-a<2:continue
 tracks.append({'id':'bve-'+item['id']+str(round(a)),'source':'bve','knots':knots(key,a,b),'evidence':item['evidence']})
# Project actual OSM rail way vertices onto the already calibrated player path.
route=json.loads((ROOT/'dist/assets/route-geometry.json').read_text(encoding='utf-8'))['points'];grid={};size=250
for i,(a,b) in enumerate(zip(route,route[1:])):
 for gx in range(math.floor((min(a[1],b[1])-95)/size),math.floor((max(a[1],b[1])+95)/size)+1):
  for gy in range(math.floor((min(a[2],b[2])-95)/size),math.floor((max(a[2],b[2])+95)/size)+1):grid.setdefault((gx,gy),[]).append(i)
R=6371008.8
# The original Kuroiso coordinate projection is fixed in route-geometry.json.
def xy(lat,lon):return ((lon-140.0601121)*math.pi/180*R*math.cos(36.9701908*math.pi/180)+7.761184880889843,(lat-36.9701908)*math.pi/180*R-5.379638120562561)
def project(x,y):
 best=None
 for i in grid.get((math.floor(x/size),math.floor(y/size)),[]):
  a,b=route[i:i+2];dx,dy=b[1]-a[1],b[2]-a[2];ll=dx*dx+dy*dy
  if not ll:continue
  t=max(0,min(1,((x-a[1])*dx+(y-a[2])*dy)/ll));px,py=a[1]+dx*t,a[2]+dy*t;dist=(x-px)**2+(y-py)**2
  if best is None or dist<best[0]:best=(dist,a[0]+t*(b[0]-a[0]),((x-px)*dy-(y-py)*dx)/math.sqrt(ll))
 if best and best[0]<90**2:return [round(best[1],4),round(best[2],4),0]
ways={}
for file in ['osm-1.json',*[f'osm-fukushima-{i}.json' for i in range(3)],*(['osm-station-yards.json'] if (WORK/'osm-station-yards.json').exists() else [])]:
 for w in json.loads((WORK/file).read_text(encoding='utf-8'))['elements']:
  if w.get('type')=='way':ways[w['id']]=w
narrow_ids={w['id'] for w in ways.values() if w.get('tags',{}).get('gauge')=='1067'}
narrow_nodes={n for w in ways.values() if w['id'] in narrow_ids for n in w['nodes']}
for _ in range(10):
 changed=False
 for w in ways.values():
  tags=w.get('tags',{})
  if w['id'] in narrow_ids or tags.get('railway')!='rail' or tags.get('gauge') not in [None,'1067'] or tags.get('voltage')=='25000' or '新幹線' in tags.get('name',''):continue
  if any(n in narrow_nodes for n in w['nodes']):narrow_ids.add(w['id']);narrow_nodes.update(w['nodes']);changed=True
 if not changed:break
for w in ways.values():
 tags=w.get('tags',{})
 if w['id'] not in narrow_ids:continue
 values=[project(*xy(p['lat'],p['lon'])) for p in w['geometry']];parts=[];part=[]
 for v in values:
  if v is None or v[0]<22100:
   if len(part)>1:parts.append(part)
   part=[];continue
  part.append(v)
 if len(part)>1:parts.append(part)
 for n,part in enumerate(parts):
  if part[-1][0]<part[0][0]:part.reverse()
  part=[a for i,a in enumerate(part) if not i or a[0]>part[i-1][0]+.02]
  if len(part)<2 or part[-1][0]-part[0][0]<3 or max(abs(a[1]) for a in part)<1.0:continue
  if max(abs(a[1]) for a in part)>80:continue
  tracks.append({'id':f'osm-{w["id"]}-{n}','source':'osm','wayId':w['id'],'knots':part,'service':tags.get('service')})
# A short continuity blend joins the BVE offset at the data boundary to mapped rails.
# It is an explicit prototype connection, not a continuation of BVE past Shinshirakawa.
tracks[1]['knots'].append([22400,4,0])
# Platform edges are generated from source-relative measurements, never reused .x meshes.
def edge(s,left,right):return [round(s,4),round(left,4),round(right,4)]
def pform(a,b,left,right,roof=0):
 return {'start':a,'end':b,'edges':[edge(a,left,right),edge(b,left,right)],'roofLength':roof}
def side(name,a,b,left,right,roof=0):return pform(chain(a),chain(b),left,right,roof)
layouts=[]
video_times=[0,300,540,780,1080,1260,1440,1740,2040,2340,2580,2940,3300,3600,3960,4260,4500,4860,5160,5400,5700,6000,6360,6660]
# Right/left boarding side was inspected in ordered station scenes in the supplied video.
video_sides=['right','left','left','right','right','right','right','right','right','left','left','right','right','left','left','right','right','left','left','right','left','right','right','left']
for i,st in enumerate(stations):
 s=st['s'];layout={'name':st['name'],'s':s,'source':'bve' if i<6 else 'video+osm','videoTime':video_times[i],'videoSide':video_sides[i],'platforms':[],'buildingSide':video_sides[i],'footbridge':s-75,'roofColor':'#879c8f' if i%3==0 else '#a4aaa4'}
 if i==0:
  layout['platforms']=[side('k',590,740,1.5,8.4,120),side('k',425,725,-16.5,-9.5,190)];layout['footbridge']=chain(560);layout['buildingSide']='left'
 elif i==1:layout['platforms']=[side('t',4695,4890,-3.5,-1.49,50),side('t',4665,4875,5.3,7.3,40)];layout['footbridge']=chain(4813)
 elif i==2:layout['platforms']=[side('k',8650,8830,-4.5,-1.49,65),side('k',8650,8830,10.0,13.0,60)]
 elif i==3:
  a,b=chain(13595),chain(13855);x=lerp(curve('Track-6','x'),s);layout['platforms']=[pform(a,b,1.5,x-1.5,55)];layout['buildingSide']='right';layout['footbridge']=None
 elif i==4:
  layout['platforms']=[side('s',19890,20060,1.5,7.2,45)];layout['buildingSide']='right';layout['footbridge']=s-60
 elif i==5:
  a,b=chain(23495),chain(23840);points=knots('Tracks-2',a,b);layout['platforms']=[{'start':a,'end':b,'edges':[edge(k[0],k[1]+1.5,-1.5) for k in points],'roofLength':240}];layout['buildingSide']='left';layout['footbridge']=s-70;layout['notes']='BVE terminal-era platform takes priority; the historical video shows a different through layout. Player route remains connected toward Fukushima.'
 else:
  local=[]
  for t in tracks[2:]:
   ks=t['knots']
   if ks[0][0]<=s<=ks[-1][0]:
    x=lerp([(k[0],k[1]) for k in ks],s)
    if abs(x)>1:local.append(x)
  local=sorted(local);boarding=1 if video_sides[i]=='right' else -1
  closest=min((abs(x) for x in local if x*boarding>0),default=99)
  large=i in [13,23];length=320 if large else 190 if i in [6,11,12,16,18,20] else 165
  roof=270 if large else 115 if i in [6,11,12,16,18,20,22] else 55
  # Fit an island only when an actual mapped rail bounds its far side.
  width=closest-3.0 if 6.0<=closest<(22 if large else 16) else 3.5
  left,right=(1.5,1.5+width) if boarding>0 else (-1.5-width,-1.5)
  layout['platforms']=[pform(s-length+30,s+30,left,right,roof)]
  # Other active platform faces are fitted into actual track gaps or outside the outermost rail.
  rails=sorted({round(x,1) for x in [0,*local] if abs(x)<65});used=[(left,right)]
  for j,(x,y) in enumerate(zip(rails,rails[1:])):
   if y-x<6.4 or any(not(y-1.5<=l or x+1.5>=r) for l,r in used):continue
   if not large and len(used)>=2:break
   l,r=x+1.5,y-1.5
   if r-l>(18 if large else 8) or (large and max(abs(l),abs(r))>32):continue
   used.append((l,r));layout['platforms'].append(pform(s-length+25+(j%2)*15,s+25,l,r,roof*.8))
  if len(used)==1 and len(rails)>1:
   # Add only an unserved rail's outer platform; never board both sides of the player track.
   candidates=[x for x in rails if abs(x)>1 and not any(min(abs(x-l),abs(x-r))<1.8 for l,r in used)]
   if candidates:
    far=min(candidates,key=abs);l,r=(far+1.5,far+5.0) if far>0 else (far-5.0,far-1.5)
    if all(r<=a or l>=b for a,b in used):layout['platforms'].append(pform(s-length+15,s+10,l,r,roof*.65))
 layouts.append(layout)
data={'schema':'tohoku-station-layouts-v1','stations':layouts,'tracks':tracks,'metadata':{'bveEndM':22100,'video':'https://www.youtube.com/watch?v=FMLp1KOVSn0','stationCalibration':anchors,'sources':[{'file':n,'sha256':hashlib.sha256((BVE/n).read_bytes()).hexdigest()} for n in ['Map_Kuroiso4.txt','Map_Kuro-Shira.txt','Structures/List_Common.txt']],'limitations':['BVE lateral interpolation is rendered with smooth prototype curves, not an exact BVE engine.','Northern rail positions use the retained OSM survey; platform side and general station form use inspected video frames.','Platform lengths, width beyond source edge strips, roof, stairs and buildings are approximate.','Historical video and current OSM/BVE may represent different eras; no original .x model, texture or video frame is redistributed.']}}
if (WORK/'osm-station-yards.json').exists():
 yard=json.loads((WORK/'osm-station-yards.json').read_text(encoding='utf-8'));data['metadata']['stationYardSource']={'file':'osm-station-yards-source.json','sha256':hashlib.sha256((WORK/'osm-station-yards.json').read_bytes()).hexdigest(),'osmTimestamp':yard.get('osm3s',{}).get('timestamp_osm_base'),'attribution':'OpenStreetMap contributors / ODbL'}
OUT.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('tracks',len(tracks),'stations',len(layouts),'bytes',OUT.stat().st_size)
for st in layouts:print(st['name'],st['videoSide'],'platforms',len(st['platforms']),[(round(p['edges'][0][1],1),round(p['edges'][0][2],1)) for p in st['platforms']])
