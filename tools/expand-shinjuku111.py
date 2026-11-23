from pathlib import Path
import json,gzip,math
ns={'__file__':str(Path('tools/import-all-roads.py').resolve()),'__name__':'align111'};exec(Path('tools/import-all-roads.py').read_text(encoding='utf-8').split('alignments=')[0].replace('range(gx-1,gx+2)','range(gx-6,gx+7)').replace('range(gy-1,gy+2)','range(gy-6,gy+7)'),ns)
R=6371008.8;lat0,lon0=35.6902618,139.7005142;source=json.loads(gzip.decompress(Path('../buildings105/kanto.json.gz').read_bytes()))['rows'];chosen=[r for r in source if math.hypot(math.radians(r[1]-lat0)*R,math.radians(r[2]-lon0)*R*math.cos(math.radians(lat0)))<1100]
out={}
for key in ['chuo','yamanote']:
 a=ns['Alignment'](ns['routes'][key]);rows=[]
 for ident,lat,lon,corners,h,estimated in chosen:
  dist,s,center=a.project(lat,lon)
  if not math.isfinite(dist):continue
  anchor=a.transform(s);local=[anchor[1]+(a.xy(*point)-anchor[2])/anchor[3] for point in corners];width,depth=abs(local[1]-local[0]),abs(local[2]-local[1]);angle=math.atan2((local[1]-local[0]).imag,(local[1]-local[0]).real)
  if min(width,depth)<2 or max(width,depth)>300:continue
  reference=ns['sample'](a.points,s);rows.append([round(s*10),round((center[0]-reference.real)*10),round((center[1]-reference.imag)*10),round(width*10),round(depth*10),round(angle*1000),round(h*10),estimated])
 out[key]=sorted(rows,key=lambda r:r[0]);print(key,len(rows))
payload=dict(radiusM=1100,source='OpenStreetMap building footprints / ODbL',referenceStation='新宿',routes=out)
data=gzip.compress(json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode(),mtime=0);Path('dist/assets/buildings/shinjuku-district111.json.gz').write_bytes(data);print('district bytes',len(data))
