"""Build mobile-sized near/far meshes from five CC0 Poly Haven tree variants.

Requires numpy, scipy, Pillow and fast-simplification. Source stays outside dist.
Leaves are sampled as whole connected cards, preserving silhouettes and UVs.
"""
from pathlib import Path
import json, urllib.request, numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree
from PIL import Image
import fast_simplification

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT.parent/'real-tree-source';CACHE.mkdir(exist_ok=True)
OUT=ROOT/'dist/assets/trees';OUT.mkdir(exist_ok=True)
def get(url,path):
 if not path.exists():
  path.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Trackfinity-Railways/1.0 (offline CC0 asset preparation)'})).read())
 return path
name='searsia_lucida'
files=json.loads(get('https://api.polyhaven.com/files/'+name,CACHE/'files.json').read_text())
download=files['gltf']['1k']['gltf']
g=json.loads(get(download['url'],CACHE/'source.gltf').read_text())
raw=get(download['include'][g['buffers'][0]['uri']]['url'],CACHE/'source.bin').read_bytes()
def accessor(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
 dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']]
 return np.frombuffer(raw,dtype=dtype,count=a['count']*components,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,components).copy()
for key in ['Diffuse','Alpha','nor_gl']:
 q=files[key]['1k'];get(q.get('png',q.get('jpg'))['url'],CACHE/(key+'.png'))
atlas=Image.open(CACHE/'Diffuse.png').convert('RGBA');atlas.putalpha(Image.open(CACHE/'Alpha.png').convert('L'));atlas.thumbnail((512,512));atlas.save(OUT/'tree-atlas.webp',quality=82,method=6)
normal=Image.open(CACHE/'nor_gl.png').convert('RGB');normal.thumbnail((256,256));normal.save(OUT/'tree-normal.webp',quality=75,method=6)
models=[]
for variant in range(5):
 primitives=[];allpoints=[]
 for p in g['meshes'][variant]['primitives']:
  pos=accessor(p['attributes']['POSITION']);norm=accessor(p['attributes']['NORMAL']);uv=accessor(p['attributes']['TEXCOORD_0']);faces=accessor(p['indices']).reshape(-1,3).astype(np.int32)
  primitives.append((pos,norm,uv,faces,p['material']));allpoints.append(pos)
 bounds=np.concatenate(allpoints);low=bounds.min(axis=0);high=bounds.max(axis=0);height=float(high[1]-low[1]);center=(high+low)/2;center[1]=low[1]
 levels=[]
 for lod in range(2):
  verts=[];indices=[];groups=[];offset=0
  for pos,norm,uv,faces,mat in primitives:
   if mat==0:
    welded,remap=np.unique(np.round(pos,6),axis=0,return_inverse=True)
    points,tri=fast_simplification.simplify(welded,remap[faces].astype(np.int32),target_count=min(len(faces),700 if lod==0 else 160),agg=12)
    if lod==1:
     voxel=height/50
     for _ in range(8):
      grid,first,remap=np.unique(np.round(pos/voxel),axis=0,return_index=True,return_inverse=True);tri=remap[faces];tri=tri[(tri[:,0]!=tri[:,1])&(tri[:,0]!=tri[:,2])&(tri[:,1]!=tri[:,2])];tri=np.unique(tri,axis=0);points=pos[first]
      if len(tri)<350:break
      voxel*=1.5
    nearest=cKDTree(pos).query(points)[1];ns=norm[nearest];tex=uv[nearest]
   else:
    # Keep complete leaf/twig islands rather than disconnected triangles.
    rows=np.concatenate([faces[:,0],faces[:,1],faces[:,2]]);cols=np.concatenate([faces[:,1],faces[:,2],faces[:,0]])
    graph=coo_matrix((np.ones(len(rows)),(rows,cols)),shape=(len(pos),len(pos)))
    count,labels=connected_components(graph,directed=False)
    component=labels[faces[:,0]];sizes=np.bincount(component,minlength=count)
    rng=np.random.default_rng(7300+variant*31+mat);order=rng.permutation(np.flatnonzero(sizes));budget=(5200 if mat==1 else 900) if lod==0 else (700 if mat==1 else 150)
    keep=[];total=0
    for c in order:
     if total+sizes[c]>budget:continue
     keep.append(c);total+=sizes[c]
    # Flatten each original curved leaf island into one textured quad. This
    # retains every leaf near the camera instead of thinning out the canopy.
    selected_ids=np.flatnonzero(sizes) if lod==0 else order[::9]
    ps=[];ns_list=[];ts=[];triangles=[]
    for c in selected_ids:
     used=np.unique(faces[component==c]);tc=uv[used];pc=pos[used]
     if len(used)<3:continue
     lo=tc.min(axis=0);hi=tc.max(axis=0)
     if np.min(hi-lo)<1e-5:continue
     design=np.column_stack([np.ones(len(tc)),tc]);fit=np.linalg.lstsq(design,pc,rcond=None)[0]
     corners=np.array([[lo[0],lo[1]],[hi[0],lo[1]],[hi[0],hi[1]],[lo[0],hi[1]]])
     quad=np.column_stack([np.ones(4),corners])@fit;normal=norm[used].mean(axis=0);normal/=max(np.linalg.norm(normal),1e-8)
     at=len(ps);ps.extend(quad);ts.extend(corners);ns_list.extend([normal]*4);triangles.extend([[at,at+1,at+2],[at,at+2,at+3]])
    points=np.asarray(ps);ns=np.asarray(ns_list);tex=np.asarray(ts);tri=np.asarray(triangles)
   points=(points-center)/height
   points[:,1]+=.22
   start=len(indices);indices.extend((tri.reshape(-1)+offset).tolist());offset+=len(points)
   verts.extend(np.concatenate([points,ns,tex],axis=1).tolist());groups.append({'start':start,'count':len(indices)-start,'material':mat})
  # Extend the imported shrub/tree form with a slender bark-mapped lower trunk.
  base=len(verts)
  for y,radius in [(0,.022),(.55,.009)]:
   for j in range(9):
    angle=j/8*np.pi*2;verts.append([np.cos(angle)*radius,y,np.sin(angle)*radius,np.cos(angle),0,np.sin(angle),.68+j/8*.28,.25+y])
  for j in range(8):indices.extend([base+j,base+j+1,base+9+j,base+j+1,base+10+j,base+9+j])
  stem=f'tree-{variant+1}-'+('near' if lod==0 else 'far');np.asarray(verts,dtype='<f2').tofile(OUT/(stem+'.bin'));np.asarray(indices,dtype='<u2').tofile(OUT/(stem+'.idx'))
  assert len(verts)<65536
  levels.append({'vertices':len(verts),'triangles':len(indices)//3,'file':stem+'.bin','indices':stem+'.idx','groups':groups})
 models.append({'name':g['nodes'][variant]['name'],'sourceHeight':height,'levels':levels});print(models[-1]['name'],[l['triangles'] for l in levels])
manifest={'source':'https://polyhaven.com/a/searsia_lucida','author':'James Ray Cock; Jenelle van Heerden','license':'CC0-1.0','atlas':'tree-atlas.webp','normal':'tree-normal.webp','models':models}
(OUT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')),encoding='utf-8')
(OUT/'LICENSE.txt').write_text('Searsia Lucida — Poly Haven\nSource: https://polyhaven.com/a/searsia_lucida\nLicense: CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/\nFive original tree meshes adapted with whole-card foliage LODs, simplified trunks resized textures and bark-mapped trunk extensions.\nPowered by Poly Haven. Assets are bundled locally; no runtime API calls.\n',encoding='utf-8')
print('Tree asset bytes',sum(p.stat().st_size for p in OUT.iterdir()))
