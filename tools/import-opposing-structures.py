"""Convert the supplied text DirectX meshes and their textures for the web renderer."""
from pathlib import Path
import re,json,hashlib,struct
from collections import defaultdict
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(r'C:/Users/bmwhz/OneDrive/Desktop/dengo_thef/structures')
OUT=ROOT/'assets/opposing';OUT.mkdir(parents=True,exist_ok=True)
NUMBER=re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?')
def read(path):
 data=path.read_bytes()
 for encoding in ['utf-8-sig','cp932']:
  try:return data.decode(encoding)
  except UnicodeDecodeError:pass
 return data.decode('cp932',errors='replace')
def blocks(text,name):
 result=[]
 for match in re.finditer(r'\b'+name+r'\b\s*(?:[\w.-]+\s*)?\{',text):
  if re.search(r'template\s*$',text[max(0,match.start()-15):match.start()]):continue
  start=match.end();depth=1;quote=False;i=start
  while depth and i<len(text):
   ch=text[i]
   if ch=='"':quote=not quote
   elif not quote:depth+=(ch=='{')-(ch=='}')
   i+=1
  result.append(text[start:i-1])
 return result
class Numbers:
 def __init__(self,text):self.values=iter(NUMBER.findall(text))
 def n(self):return float(next(self.values))
 def i(self):return int(self.n())
 def vectors(self,count,size):return [[self.n() for _ in range(size)] for _ in range(count)]
 def faces(self,count):return [[self.i() for _ in range(self.i())] for _ in range(count)]
textures={};missing=[]
def texture(path,name):
 name=name.replace("\\'","'").replace('\\','/');candidate=path.parent/name
 if not candidate.exists():
  candidate=next((p for p in path.parent.rglob('*') if p.is_file() and p.name.lower()==Path(name).name.lower()),None)
 if not candidate or not candidate.exists():missing.append(str(path)+' : '+name);return None
 key=hashlib.sha256(candidate.read_bytes()).hexdigest()[:16]
 if key not in textures:
  target=OUT/(key+'.webp')
  with Image.open(candidate) as image:
   image=image.convert('RGBA');image.thumbnail((768,768));image.save(target,quality=86,method=6)
  textures[key]=target.name
 return textures[key]
def mesh(path):
 text=re.sub(r'/\*.*?\*/','',read(path),flags=re.S);text=re.sub(r'//[^\r\n]*','',text);all_groups=defaultdict(list)
 for body in blocks(text,'Mesh'):
  try:
   n=Numbers(body);vertices=n.vectors(n.i(),3);faces=n.faces(n.i())
  except (ValueError,StopIteration):continue
  uvblock=blocks(body,'MeshTextureCoords');uv=[]
  if uvblock:n=Numbers(uvblock[0]);uv=n.vectors(n.i(),2)
  normals=[];normal_faces=[];nb=blocks(body,'MeshNormals')
  if nb:n=Numbers(nb[0]);normals=n.vectors(n.i(),3);normal_faces=n.faces(n.i())
  materials=[];face_material=[0]*len(faces);ml=blocks(body,'MeshMaterialList')
  if ml:
   n=Numbers(ml[0]);count=n.i();face_material=[n.i() for _ in range(n.i())]
   for material_index,material in enumerate(blocks(ml[0],'Material')):
    n=Numbers(material);color=[n.n() for _ in range(4)];tex=blocks(material,'TextureFilename');filename=re.search(r'"([^"]+)"',tex[0]).group(1) if tex else None
    materials.append({'color':color[:3],'alpha':color[3],'texture':texture(path,filename) if filename and material_index in face_material else None})
  if not materials:materials=[{'color':[.7,.7,.7],'alpha':1,'texture':None}]
  for face_i,face in enumerate(faces):
   mat=materials[min(face_material[face_i] if face_i<len(face_material) else 0,len(materials)-1)]
   key=json.dumps(mat,sort_keys=True)
   for j in range(1,len(face)-1):
    for corner in [0,j,j+1]:
     index=face[corner];pos=vertices[index];normal=normals[normal_faces[face_i][corner]] if normals and face_i<len(normal_faces) else [0,1,0];texcoord=uv[index] if index<len(uv) else [0,0]
     all_groups[key].extend([*pos,*normal,texcoord[0],1-texcoord[1]])
 return all_groups
def convert(id,variant,paths):
 groups=defaultdict(list)
 for path in paths:
  for material,vertices in mesh(SOURCE/path).items():groups[material].extend(vertices)
 positions=[v for vertices in groups.values() for v in [vertices[i:i+3] for i in range(0,len(vertices),8)]]
 if not positions:raise RuntimeError(str(paths))
 low=[min(v[c] for v in positions) for c in range(3)];high=[max(v[c] for v in positions) for c in range(3)]
 center=[(low[i]+high[i])/2 for i in range(3)]
 # All component meshes share the car origin. Center longitudinally; retain rail height.
 meta=[];blob=bytearray();offset=0
 for material,vertices in groups.items():
  for i in range(0,len(vertices),8):vertices[i]-=center[0];vertices[i+2]-=center[2]
  blob.extend(struct.pack('<'+'f'*len(vertices),*vertices));count=len(vertices)//8
  meta.append({'start':offset,'count':count,'material':json.loads(material)});offset+=count
 file=id+'-'+variant+'.bin';(OUT/file).write_bytes(blob)
 print(id,variant,'vertices',offset,'bounds',low,high)
 return {'file':file,'groups':meta,'vertices':offset,'bounds':[low,high],'source':[str(p) for p in paths]}

e233head=['E233/E233-0/Tc1-1.x','E233/Common/UnderTc1.x','E233/Common/Skirt1.x','E233/Common/Cooler1_1.x','E233/Common/RoofTc1.x','E233/Common/FMAntenna_1.x','E233/Common/Head.x']
e233middle=['E233/E233-0/M1-1.x','E233/Common/UnderM1.x','E233/Common/Cooler1_2.x','E233/Common/PS33_1.x']
e235='JR東日本E235系山手線車両ストラクチャ/'
configs={
 'e233':{'cars':10,'head':e233head,'middle':e233middle,'tail':['E233/E233-0/Tc10-1.x','E233/Common/UnderTc1.x','E233/Common/Skirt10.x','E233/Common/Cooler1_1.x','E233/Common/RoofTc10.x']},
 '211':{'cars':3,'head':['ec576/211/Tc211-N.x'],'middle':['ec576/211/M211-N.x'],'tail':['ec576/211/Tc211-Nb.x']},
 'e235':{'cars':11,'head':[e235+'235-1A.x'],'middle':[e235+'235-3A.x'],'tail':[e235+'235-5A.x']},
 '323':{'cars':8,'head':['323/Mc323b.x'],'middle':['323/M323a.x'],'tail':['323/Mc322b.x']},
 '221':{'cars':8,'head':['221/221_1.x'],'middle':['221/221_2P.x'],'tail':['221/221_3.x']},
 '701':{'cars':2,'head':['701-sen1000-2/Mc1-2.x'],'middle':['701-sen1000-2/Tc1-1.x'],'tail':['701-sen1000-2/Tc1-1.x']}
}
manifest={}
for id,config in configs.items():manifest[id]={'carCount':config['cars'],'variants':{part:convert(id,part,[Path(p) for p in config[part]]) for part in ['head','middle','tail']}}
if missing:raise RuntimeError('Missing textures: '+str(missing))
(OUT/'manifest.json').write_text(json.dumps({'models':manifest},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Total MiB',round(sum(p.stat().st_size for p in OUT.iterdir())/1048576,2))
