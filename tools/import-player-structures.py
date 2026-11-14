"""Import supplied player-train structures with indexed, lossless vertex reuse."""
from pathlib import Path
from collections import defaultdict
import re,json,struct,math
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/structures')
OUT=ROOT/'dist/assets/opposing'
namespace={"__file__":str(ROOT/"tools/import-opposing-structures.py")}
code=(ROOT/'tools/import-opposing-structures.py').read_text(encoding='utf-8').split('e233head=')[0]
exec(code,namespace)
namespace['SOURCE']=SOURCE;namespace['OUT']=OUT
def texture(path,name):
 if not name:return None
 candidate=path.parent/name.replace('\\','/')
 if not candidate.exists():candidate=next((p for p in path.parent.rglob('*') if p.name.lower()==Path(name.replace('\\','/')).name.lower()),None)
 if not candidate:return None
 import hashlib
 key='player-'+hashlib.sha256(candidate.read_bytes()).hexdigest()[:16]+'.webp'
 if not (OUT/key).exists():
  image=Image.open(candidate).convert('RGBA');image.thumbnail((256,256));image.save(OUT/key,quality=78,method=6)
 return key
namespace['texture']=texture

def export(id,role,groups,sources):
 compact=id in ['6050','681'];stride=5 if compact else 8
 vertices=[];indices=[];lookup={};metadata=[]
 points=[v[i:i+3] for v in groups.values() for i in range(0,len(v),8)]
 low=[min(p[c] for p in points) for c in range(3)];high=[max(p[c] for p in points) for c in range(3)]
 center=[(low[c]+high[c])/2 for c in range(3)]
 for material,values in groups.items():
  start=len(indices)
  for i in range(0,len(values),8):
   v=list(values[i:i+8]);v[0]-=center[0];v[2]-=center[2];v=v[:3]+v[6:] if compact else v;key=struct.pack('<'+'f'*stride,*v)
   if key not in lookup:lookup[key]=len(vertices)//stride;vertices.extend(v)
   indices.append(lookup[key])
  metadata.append({'start':start,'count':len(indices)-start,'material':json.loads(material)})
 file='player-'+id+'-'+role+'.bin';indexfile='player-'+id+'-'+role+'.idx'
 (OUT/file).write_bytes(struct.pack('<'+'e'*len(vertices),*vertices));(OUT/indexfile).write_bytes(struct.pack('<'+'I'*len(indices),*indices))
 return {'file':file,'indexFile':indexfile,'componentType':'float16','stride':stride,'groups':metadata,'vertices':len(vertices)//stride,'bounds':[low,high],'source':sources}

def xparts(paths):
 result=defaultdict(list)
 for name in paths:
  for key,values in namespace['mesh'](SOURCE/name).items():result[key].extend(values)
 return result

def named_blocks(text,pattern):
 for match in re.finditer(pattern,text):
  begin=match.end();depth=1;i=begin
  while depth and i<len(text):depth+=(text[i]=='{')-(text[i]=='}');i+=1
  yield text[begin:i-1]
def mqo(path,textures,offset=(0,0,0)):
 text=namespace['read'](path);materialblock=next(named_blocks(text,r'\bMaterial\s+\d+\s*\{'))
 materials=[]
 for line in materialblock.splitlines():
  match=re.search(r'"([^"]+)".*?col\(([^)]+)\)',line)
  if not match:continue
  color=list(map(float,match[2].split()));materials.append({'color':color[:3],'alpha':color[3],'texture':textures.get(match[1])})
 result=defaultdict(list)
 for body in named_blocks(text,r'\bObject\s+"[^"]*"\s*\{'):
  if re.search(r'\bvisible\s+0\b',body):continue
  verts=next(named_blocks(body,r'\bvertex\s+\d+\s*\{'),None);faces=next(named_blocks(body,r'\bface\s+\d+\s*\{'),None)
  if verts is None or faces is None:continue
  points=[list(map(float,line.split())) for line in verts.splitlines() if len(line.split())==3]
  scale=re.search(r'\bscale\s+([^\r\n]+)',body);translate=re.search(r'\btranslation\s+([^\r\n]+)',body)
  scale=list(map(float,scale[1].split())) if scale else [1,1,1];translate=list(map(float,translate[1].split())) if translate else [0,0,0]
  points=[[(p[c]*scale[c]+translate[c])*.01+offset[c] for c in range(3)] for p in points]
  mirror=re.search(r'\bmirror\s+([12])\b',body);axis=re.search(r'\bmirror_axis\s+(\d+)',body)
  mirrored=[c for c in range(3) if (int(axis[1]) if axis else 1)&(1<<c)] if mirror else []
  pointsets=[(points,False)]
  if mirrored:pointsets.append(([[(-p[c]+2*(translate[c]*.01+offset[c])) if c in mirrored else p[c] for c in range(3)] for p in points],len(mirrored)%2==1))
  for points,reverse in pointsets:
   for line in faces.splitlines():
    v=re.search(r'\bV\(([^)]+)\)',line)
    if not v:continue
    face=list(map(int,v[1].split()));mat=re.search(r'\bM\((\d+)\)',line);uv=re.search(r'\bUV\(([^)]+)\)',line);uv=list(map(float,uv[1].split())) if uv else [0,0]*len(face)
    material=materials[int(mat[1]) if mat else 0];key=json.dumps(material,sort_keys=True)
    a,b,c=[points[index] for index in face[:3]];u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)];n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];length=max(1e-10,math.sqrt(sum(x*x for x in n)));n=[x/length*(-1 if reverse else 1) for x in n]
    for j in range(1,len(face)-1):
     for corner in ([0,j+1,j] if reverse else [0,j,j+1]):result[key].extend([*points[face[corner]],*n,uv[corner*2],1-uv[corner*2+1]])
 return result

manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
configs={
 '223':(8,{'head':['223_2000/223_2000_1.x'],'middle':['223_2000/223_2000_2P.x'],'tail':['223_2000/223_2000_3.x']}),
 '223-0':(8,{'head':['223_0/223_0_1.x'],'middle':['223_0/223_0_2P.x'],'tail':['223_0/223_0_3.x']}),
 '681':(9,{'head':['681-0_W/Tsc681.x'],'trailer':['681-0_W/T680.x'],'middle':['681-0_W/M681.x'],'trailer200':['681-0_W/T681-200.x'],'motor200':['681-0_W/M681-200.x'],'coupledFront':['681-0_W/Tc681.x'],'coupledRear':['681-0_W/Tc680-500.x'],'trailer300':['681-0_W/T681-300.x'],'tail':['681-0_W/Mc681-500.x']}),
 '383':(6,{'head':['383/Mc383.x'],'middle':['383/M383-0.x'],'tail':['383/Tc383.x']}),
 'e353':(9,{'head':['E353/Tc_E353.x'],'middle':['E353/M_E353.x'],'tail':['E353/Tc_E352.x']})}
for id,(count,roles) in configs.items():
 variants={role:export(id,role,xparts(paths),paths) for role,paths in roles.items()}
 manifest['models'][id]={'carCount':count,'variants':variants,'frontRotation':(3.141592653589793 if (id.startswith('223') or id in ['383','681']) else 0),'tailRotation':(3.141592653589793 if id in ['383','681'] else 0)}
 if id=='681':manifest['models'][id]['formation']=['head','trailer','middle','trailer200','motor200','coupledFront','coupledRear','trailer300','tail']
 print(id,sum((OUT/p[k]).stat().st_size for p in variants.values() for k in ['file','indexFile']))

base=SOURCE/'am_tb6050/assets/minecraft'
model=base/'models';variants={}
for role,number in [('head','yg61102_mc'),('tail','yg62102_tc')]:
 definition=model/'json'/('ModelTrain_'+number+'_am.json');config=json.loads(definition.read_text(encoding='utf-8-sig'))
 body=config['trainModel2']['modelFile'];bogie=config['bogieModel2']['modelFile']
 def configured_textures(part):
  return {entry[0]:texture(base/entry[1],Path(entry[1]).name) for entry in part['textures']}
 groups=mqo(model/body,configured_textures(config['trainModel2']))
 bogietex=configured_textures(config['bogieModel2'])
 for offset in config['bogiePos']:
  for key,values in mqo(model/bogie,bogietex,offset).items():groups[key].extend(values)
 minimum=min(values[i+1] for values in groups.values() for i in range(0,len(values),8))
 for values in groups.values():
  for i in range(0,len(values),8):values[i+1]-=minimum
 variants[role]=export('6050',role,groups,[str((model/body).relative_to(SOURCE)),str(definition.relative_to(SOURCE))])
if variants:
 variants['middle']=variants['tail'];manifest['models']['6050']={'carCount':2,'variants':variants,'frontRotation':0,'tailRotation':3.141592653589793}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Player structures imported.')

