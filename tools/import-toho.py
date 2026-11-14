"""Import the supplied fictional railway workbook; scenery geometry is an approximation."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import json,math
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('C:/Users/bmwhz/OneDrive/Desktop/東方鉄道駅館距離.xlsx')
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(SOURCE) as z:
 shared=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  shared=[''.join(t.itertext()) for t in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
 rows=[]
 for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//s:row',ns):
  values={}
  for c in row.findall('s:c',ns):
   v=c.find('s:v',ns);value=v.text if v is not None else ''.join(c.find('s:is',ns).itertext()) if c.find('s:is',ns) is not None else ''
   values[''.join(ch for ch in c.attrib['r'] if ch.isalpha())]=shared[int(value)] if c.attrib.get('t')=='s' else value
  rows.append(values)
 routes={};current=None
 for row in rows:
  if row.get('A') in ['東方本線','人里線','センター支線']:current=row['A'];routes.setdefault(current,[])
  if current and row.get('B') and row.get('E','').replace('.','',1).isdigit():routes[current].append({'name':row['B'],'reading':row.get('C',''),'s':float(row['E'])})
# Bearings follow the supplied map; workbook distances, not the illustration scale, set chainage.
landmarks=[(910,950),(850,760),(735,810),(755,670),(830,680),(860,560),(885,445),(825,275),(680,145),(670,310),(700,395),(750,365),(550,530),(520,570),(470,570),(415,580),(345,620),(310,700),(80,570),(90,520),(115,455),(135,500),(80,340),(145,190),(100,75)]
for name,identity in [('東方本線','toho'),('人里線','toho-village'),('センター支線','toho-center')]:
 stations=routes[name];L=stations[-1]['s'];points=[];x=z=0
 # Each station gets a straight approach and departure. Heading changes happen
 # between those tangents, with zero curvature at both ends (minimum R650 m).
 headings=[]
 for i in range(len(stations)-1):
  if identity=='toho':p,q=landmarks[i:i+2];angle=math.atan2(-(q[1]-p[1]),q[0]-p[0])
  else:angle=math.pi*.83 if identity=='toho-center' else -.2+i*.2
  if headings:
   while angle-headings[-1]>math.pi:angle-=2*math.pi
   while angle-headings[-1]<-math.pi:angle+=2*math.pi
  headings.append(angle)
 tangents=[headings[0]]+[(a+b)/2 for a,b in zip(headings,headings[1:])]+[headings[-1]]
 for _ in range(16):
  for indices in [range(len(headings)),range(len(headings)-1,-1,-1)]:
   for i in indices:
    curve=max(100,stations[i+1]['s']-stations[i]['s']-600);maximum=curve/(1.875*650)
    delta=tangents[i+1]-tangents[i]
    if abs(delta)>maximum:
     excess=(abs(delta)-maximum)*math.copysign(.5,delta);tangents[i]+=excess;tangents[i+1]-=excess
 for i,(a,b) in enumerate(zip(stations,stations[1:])):
  length=b['s']-a['s']
  steps=math.ceil(length/15);dx=length/steps;initial=tangents[i];delta=tangents[i+1]-initial
  if not points:points.append([-300,x-300*math.cos(initial),z-300*math.sin(initial),0]);points.append([0,x,z,0])
  for j in range(steps):
   progress=max(0,min(1,((j+.5)*dx-250)/max(100,length-600)))
   ease=progress**3*(10-15*progress+6*progress*progress);angle=initial+delta*ease
   x+=dx*math.cos(angle);z+=dx*math.sin(angle)
   points.append([round(a['s']+(j+1)*dx,3),round(x,3),round(z,3),0])
 points.append([L+300,x+300*math.cos(tangents[-1]),z+300*math.sin(tangents[-1]),0])
 stations[0]['startTime']='09:00:00'
 structures=[{'kind':'tunnel','sStart':100,'sEnd':L+250,'source':'User instruction: underground center branch'}] if identity=='toho-center' else []
 data=dict(id=identity,name='東方鉄道・'+name,length=L,loop=False,direction=stations[0]['name']+' → '+stations[-1]['name'],stations=stations,points=points,limits=[dict(sStart=0,sEnd=L+1,kmh=75 if identity=='toho' else 55)],grades=[],signals=[],structures=structures,neighborTracks=[],drivingTrack=[[-300,0],[L+300,0]],trafficSections=[dict(sStart=-300,sEnd=L+300,tracks=1)],stationLayouts={st['name']:{'platforms':[dict(boarding=True,edges=[[-100,-6,-1.55],[18,-6,-1.55]],roof=[-85,5])]} for st in stations},sources=[dict(title=SOURCE.name,type='user-provided station distance workbook')],geometryQuality='提供地図・駅間距離から作成した架空路線',importNotes=['木造・江戸風の家屋。人里線全線および霧雨〜命蓮寺は人里。','実在の鉄道路線や実測配線ではありません。'])
 (ROOT/'dist/assets/final'/f'{identity}-route.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 print(identity,len(stations),L)
