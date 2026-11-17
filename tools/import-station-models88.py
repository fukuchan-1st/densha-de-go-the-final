"""Convert supplied Bedrock cuboids and static PMX meshes to browser assets."""
from pathlib import Path
import json,struct,gzip,hashlib,math
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('C:/Users/bmwhz/OneDrive/Desktop/整理/folder/dengo_thef/structures')
OUT=ROOT/'dist/assets/station-characters';OUT.mkdir(exist_ok=True)
def image(source,out=OUT):
 if not source.exists():return None
 name='texture-'+hashlib.sha256(source.read_bytes()).hexdigest()[:16]+'.webp';target=out/name
 if not target.exists():
  im=Image.open(source).convert('RGBA');im.thumbnail((512,512));im.save(target,quality=86,method=6)
 return name
def pack(id,vertices,indices,groups,out=OUT):
 v=np.array(vertices,dtype=np.float32).reshape(-1,8);p=v[:,:3];low=p.min(axis=0);high=p.max(axis=0)
 a=id+'.bin.gz';b=id+'.idx.gz';(out/a).write_bytes(gzip.compress(v.astype('<f2').tobytes(),mtime=0));(out/b).write_bytes(gzip.compress(np.array(indices,dtype='<u4').tobytes(),mtime=0))
 return {'file':a,'indexFile':b,'componentType':'float16','stride':8,'vertices':len(v),'bounds':[low.tolist(),high.tolist()],'groups':groups}
class PMX:
 def __init__(self,path):self.path=path;self.data=path.read_bytes();self.at=0
 def read(self,fmt):
  size=struct.calcsize('<'+fmt);v=struct.unpack_from('<'+fmt,self.data,self.at);self.at+=size;return v[0] if len(v)==1 else v
 def skip(self,n):self.at+=n
 def text(self):
  n=self.read('i');v=self.data[self.at:self.at+n];self.at+=n;return v.decode(self.encoding,errors='replace')
 def index(self,size,signed=True):return self.read({1:'b' if signed else 'B',2:'h' if signed else 'H',4:'i' if signed else 'I'}[size])
 def convert(self,id,height):
  assert self.data[:4]==b'PMX ';self.at=4;self.read('f');n=self.read('B');header=self.read('B'*n);self.encoding='utf-16-le' if header[0]==0 else 'utf-8';extra,vi,ti,mi,bi=header[1:6]
  names=[self.text() for _ in range(4)];vertices=[]
  for _ in range(self.read('i')):
   p=self.read('3f');normal=self.read('3f');uv=self.read('2f');self.skip(extra*16);kind=self.read('B')
   self.skip({0:bi,1:2*bi+4,2:4*bi+16,3:2*bi+40,4:4*bi+16}[kind]);self.skip(4)
   vertices.append([p[0],p[1],-p[2],normal[0],normal[1],-normal[2],uv[0],1-uv[1]])
  count=self.read('i');indices=[self.index(vi,False) for _ in range(count)]
  for i in range(0,count,3):indices[i+1],indices[i+2]=indices[i+2],indices[i+1]
  textures=[self.text().replace('\\','/') for _ in range(self.read('i'))];groups=[];start=0
  for _ in range(self.read('i')):
   self.text();self.text();rgba=self.read('4f');self.skip(12+4+12);flags=self.read('B');self.skip(16+4);tex=self.index(ti);self.index(ti);self.skip(1);shared=self.read('B');self.skip(1 if shared else ti);self.text();n=self.read('i')
   source=self.path.parent/textures[tex] if 0<=tex<len(textures) else None
   if source and not source.exists():source=next((p for p in self.path.parent.rglob('*') if p.is_file() and p.name.lower()==Path(textures[tex]).name.lower()),source)
   groups.append({'start':start,'count':n,'material':{'color':list(rgba[:3]),'alpha':rgba[3],'texture':image(source) if source else None}});start+=n
  v=np.array(vertices);lo=v[:,:3].min(axis=0);hi=v[:,:3].max(axis=0);scale=height/(hi[1]-lo[1]);v[:,0]=(v[:,0]-(hi[0]+lo[0])/2)*scale;v[:,1]=(v[:,1]-lo[1])*scale;v[:,2]=(v[:,2]-(hi[2]+lo[2])/2)*scale
  return {**pack(id,v,indices,groups),'name':names[0],'source':str(self.path.relative_to(SOURCE)),'height':height}
def transform(rotation,pivot):
 a=np.radians(rotation);cx,cy,cz=np.cos(a);sx,sy,sz=np.sin(a);rx=np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]]);ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]);rz=np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]]);r=rz@ry@rx;t=np.eye(4);t[:3,:3]=r;t[:3,3]=np.array(pivot)-r@pivot;return t
def bedrock(path,id,role):
 out=ROOT/'dist/assets/opposing';g=json.loads(path.read_text(encoding='utf-8-sig'))['minecraft:geometry'][0];bones={b['name']:b for b in g['bones']};matrices={}
 def matrix(name):
  if name in matrices:return matrices[name]
  b=bones[name];local=transform(np.array(b.get('rotation',[0,0,0]))*[-1,1,-1],b.get('pivot',[0,0,0]));matrices[name]=(matrix(b['parent'])@local if b.get('parent') in bones else local);return matrices[name]
 texture=next(path.parents[2].glob('textures/entity/*_1.png')) if role=='head' else next(path.parents[2].glob('textures/entity/*_4.png'))
 tex=image(texture,out);vertices=[];indices=[];lookup={};tw=g['description']['texture_width'];th=g['description']['texture_height']
 for bone in g['bones']:
  for cube in bone.get('cubes',[]):
   x,y,z=cube['origin'];dx,dy,dz=cube['size'];inflate=cube.get('inflate',0);x-=inflate;y-=inflate;z-=inflate;dx+=2*inflate;dy+=2*inflate;dz+=2*inflate
   faces={'north':[(x+dx,y,z),(x,y,z),(x,y+dy,z),(x+dx,y+dy,z)],'south':[(x,y,z+dz),(x+dx,y,z+dz),(x+dx,y+dy,z+dz),(x,y+dy,z+dz)],'east':[(x+dx,y,z+dz),(x+dx,y,z),(x+dx,y+dy,z),(x+dx,y+dy,z+dz)],'west':[(x,y,z),(x,y,z+dz),(x,y+dy,z+dz),(x,y+dy,z)],'up':[(x,y+dy,z+dz),(x+dx,y+dy,z+dz),(x+dx,y+dy,z),(x,y+dy,z)],'down':[(x,y,z),(x+dx,y,z),(x+dx,y,z+dz),(x,y,z+dz)]}
   uv=cube.get('uv',{})
   if isinstance(uv,list):
    u,v=uv;uv={name:{'uv':p,'uv_size':s} for name,p,s in [('north',[u+dz,v+dz],[dx,dy]),('south',[u+2*dz+dx,v+dz],[dx,dy]),('east',[u,v+dz],[dz,dy]),('west',[u+dz+dx,v+dz],[dz,dy]),('up',[u+dz,v],[dx,dz]),('down',[u+dz+dx,v],[dx,dz])]}
   m=matrix(bone['name'])@transform(np.array(cube.get('rotation',[0,0,0]))*[-1,1,-1],cube.get('pivot',[0,0,0]))
   for name,points in faces.items():
    if name not in uv:continue
    points=np.array([(m@np.array([*p,1]))[:3] for p in points]);normal=np.cross(points[1]-points[0],points[2]-points[0]);length=np.linalg.norm(normal)
    if length<1e-9:continue
    normal/=length;u,v=uv[name]['uv'];du,dv=uv[name].get('uv_size',[dx,dy]);coords=[(u+du,v+dv),(u,v+dv),(u,v),(u+du,v)];face=[]
    for point,coord in zip(points,coords):
     row=[*point,*normal,coord[0]/tw,1-coord[1]/th];key=tuple(round(float(q),5) for q in row)
     if key not in lookup:lookup[key]=len(vertices);vertices.append(row)
     face.append(lookup[key])
    indices.extend([face[0],face[1],face[2],face[0],face[2],face[3]])
 # Bedrock axes: X/Z rotation signs differ from the renderer coordinates.
 # Preserve every source part; do not crop malformed transforms or replace cabs.
 v=np.array(vertices);low=v[:,:3].min(axis=0);high=v[:,:3].max(axis=0);scale=20/(high[2]-low[2]);v[:,0]=(v[:,0]-(high[0]+low[0])/2)*scale;v[:,1]=(v[:,1]-low[1])*scale;v[:,2]=(v[:,2]-(high[2]+low[2])/2)*scale
 return {**pack('player-'+id+'-'+role,v,indices,[{'start':0,'count':len(indices),'material':{'color':[1,1,1],'alpha':1,'texture':tex}}],out),'source':str(path.relative_to(SOURCE)),'sourceCubeCount':sum(len(b.get('cubes',[])) for b in g['bones']),'bedrockRotationSigns':[-1,1,-1]}
if __name__=='__main__':
 characters={'reimu':(SOURCE/'reimu/博麗霊夢X/reimuX_typeA.pmx',1.62),'marisa':(SOURCE/'霧雨魔理沙/霧雨魔理沙R.pmx',1.6),'sakuya':(next(p for p in (SOURCE/'十六夜咲夜Ver2.20_Rev.G').rglob('*.pmx') if 'Type-A' in p.name and '上着A_' in p.name and 'パ' in p.name),1.68)}
 models={}
 for id,(path,height) in characters.items():models[id]=PMX(path).convert(id,height);print(id,models[id]['vertices'],flush=True)
 (OUT/'manifest.json').write_text(json.dumps({'models':models},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 base=SOURCE/'E131系修正Ver.R/models/entity';out=ROOT/'dist/assets/opposing';manifest=json.loads((out/'manifest.json').read_text(encoding='utf-8'));variants={role:bedrock(base/name,'e131',role) for role,name in [('head','mtc3151_1.json'),('tail','mtc3151_4.json')]};variants['middle']=variants['tail'];manifest['models']['e131']={'carCount':2,'variants':variants,'frontRotation':math.pi,'tailRotation':0};(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8');print('e131 converted',flush=True)
