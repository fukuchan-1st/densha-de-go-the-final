"""Convert genuine user-supplied Tobu meshes into an isolated opposing patch."""
from pathlib import Path
import json,math,gzip,hashlib,re
from collections import defaultdict
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
DESKTOP=Path('C:/Users/bmwhz/OneDrive/Desktop')
OUT=ROOT/'dist/assets/opposing/tobu114';OUT.mkdir(parents=True,exist_ok=True)
code=(ROOT/'tools/import-player-structures.py').read_text(encoding='utf-8').split('manifest=json.loads')[0]
code=code.replace('face=list(map(int,v[1].split()));mat=', 'face=list(map(int,v[1].split()))\n    if len(face)<3:continue\n    mat=')
ns={'__file__':str(ROOT/'tools/import-player-structures.py')};exec(code,ns)
ns['OUT']=OUT
missing=[]
def texture(path,name):
    if not name:return None
    file=path.parent/name.replace('\\','/')
    if not file.exists():
        file=next((p for p in path.parent.rglob('*') if p.is_file() and p.name.lower()==Path(name).name.lower()),None)
    if not file:
        missing.append(str(path)+' : '+name);return None
    key=hashlib.sha256(file.read_bytes()).hexdigest()[:16]+'.webp'
    if not (OUT/key).exists():
        image=Image.open(file).convert('RGBA');image.thumbnail((768,768));image.save(OUT/key,'WEBP',quality=90,method=5,exact=True)
    return 'tobu114/'+key
ns['texture']=texture;ns['namespace']['texture']=texture
def save(id,role,groups,sources):
    minimum=min(v[i+1] for v in groups.values() for i in range(0,len(v),8))
    for values in groups.values():
        for i in range(0,len(values),8):values[i+1]-=minimum
    part=ns['export'](id,role,groups,sources)
    for key in ['file','indexFile']:
        path=OUT/part[key];target=path.with_suffix(path.suffix+'.gz');target.write_bytes(gzip.compress(path.read_bytes(),mtime=0));path.unlink();part[key]='tobu114/'+target.name
    return part

models={}; measured_doors={}
def door_layout(model,groups):
    text=ns['namespace']['read'](model);points=[]
    matches=list(re.finditer(r'Object\s+"([^"]+)"\s*\{',text))
    for index,match in enumerate(matches):
        if 'door' not in match[1].lower():continue
        body=text[match.end():matches[index+1].start() if index+1<len(matches) else len(text)]
        vertices=re.search(r'\bvertex\s+\d+\s*\{([^}]+)',body)
        if vertices:points.extend([[float(v)*.01 for v in line.split()] for line in vertices[1].splitlines() if len(line.split())==3])
    if not points:return None
    floor=min(v[i+1] for v in groups.values() for i in range(0,len(v),8))
    zz=[v[i+2] for v in groups.values() for i in range(0,len(v),8)];center=(min(zz)+max(zz))/2
    clusters=[]
    for z in sorted(set(p[2] for p in points)):
        if not clusters or z-clusters[-1][-1]>2:clusters.append([])
        clusters[-1].append(z)
    return {'centres':[round((c[0]+c[-1])/2-center,3) for c in clusters],'width':round(max(c[-1]-c[0] for c in clusters),3),'bottom':round(min(p[1] for p in points)-floor,3),'top':round(max(p[1] for p in points)-floor,3),'single':len(clusters)==1}
for id,base,roles,count in [
 ('500',DESKTOP/'ST_tobu500_RTM ver0.0', [('head','1'),('middle','2'),('tail','3')],3),
 ('20400',DESKTOP/'整理/folder/am_tb20400', [('head','21411_tc'),('middle','22411_mp'),('motor','23411_m'),('tail','24411_tc')],4)]:
    minecraft=base/'assets/minecraft';variants={}
    for role,num in roles:
        definition=base/f'mods/RTM/train/ModelTrain_tobu500-{num}.json' if id=='500' else minecraft/f'models/json/ModelTrain_tb{num}_am.json'
        config=json.loads(definition.read_text(encoding='utf-8-sig'))
        def textures(part):
            result={}
            for entry in part['textures']:
                file=minecraft/entry[1]
                # The 500 source's bogie JSON points to DT138; actual supplied file is DT138.png.
                result[entry[0]]=texture(file,file.name)
            return result
        model=minecraft/'models'/config['trainModel2']['modelFile']
        groups=ns['mqo'](model,textures(config['trainModel2']))
        bogie=minecraft/'models'/config['bogieModel2']['modelFile'];tex=textures(config['bogieModel2'])
        for offset in config['bogiePos']:
            for key,values in ns['mqo'](bogie,tex,offset).items():groups[key].extend(values)
        measured_doors.setdefault(id,{})[role]=door_layout(model,groups)
        variants[role]=save(id,role,groups,[str(model.relative_to(base)),str(definition.relative_to(base))])
    models[id]={'carCount':count,'carLengthM':18 if id=='20400' else 20,'variants':variants,'frontRotation':0,'tailRotation':math.pi,'formation':['head','middle','motor','tail'] if id=='20400' else ['head','middle','tail'],'credit':base.name}

base=DESKTOP/'ARATobu-main/ARATobu-main/Scenarios/東武伊勢崎線下り/Structure/Train'
for id,folder,roles,count in [('10030','10000',[('head','10000 1.x'),('middle','10000 2.x'),('tail','10000 8.x')],6),('70000','70000',[('head','70000 1.x'),('middle','70000 2.x'),('tail','70000 7.x')],7)]:
    variants={}
    for role,name in roles:
        model=base/folder/name;groups=ns['namespace']['mesh'](model)
        # The supplied 70000 separates passenger-door leaves into D meshes.
        if id=='70000':
            number={'head':1,'middle':2,'tail':7}[role]
            door=base/folder/f'70000 {number}D.x'
            if door.exists():
                for key,values in ns['namespace']['mesh'](door).items():groups[key].extend(values)
        variants[role]=save(id,role,groups,[str(model.relative_to(base))])
    models[id]={'carCount':count,'carLengthM':20,'variants':variants,'frontRotation':0,'tailRotation':0,'credit':'ARATobu supplied BVE structures'}
    if id=='10030':models[id]['provisional']='外観は提供10000型ストラクチャで近似。10030型固有の前面・コルゲート等は未再現。'

patch={'models':models,'missingTextures':missing,'doorLayouts':{'20400':{'centres':[-5.6,0,5.6],'width':1.3,'bottom':1.1,'top':3.1},'70000':{'centres':[-6.4,0,6.4],'width':1.3,'bottom':1.1,'top':3.1},'10030':{'centres':[-7.1,-2.35,2.35,7.1],'width':1.3,'bottom':1.1,'top':3.1},'500':{'centres':[-8,8],'width':.8,'bottom':1.1,'top':3.1,'single':True}}}
for id,roles in measured_doors.items():
    if roles.get('head'):
        patch['doorLayouts'][id]={**roles['head'],'variants':{role:layout for role,layout in roles.items() if layout}}
(OUT/'opposing-patch.json').write_text(json.dumps(patch,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
for id,model in models.items():print(id,[(r,p['vertices'],p['bounds']) for r,p in model['variants'].items()],flush=True)
print('Missing textures:',missing,'Total bytes:',sum(p.stat().st_size for p in OUT.iterdir() if p.is_file()),flush=True)
