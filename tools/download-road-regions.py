"""Download official OSM regional extracts once; resume verified byte ranges.

Only the small corridor derivatives produced by import-all-roads.py are shipped.
"""
import concurrent.futures,time,urllib.request
from pathlib import Path
CACHE=Path(__file__).resolve().parents[2]/'all-road-cache';CACHE.mkdir(exist_ok=True)
def download(region):
 path=CACHE/(region+'-latest.osm.pbf');path.touch(exist_ok=True)
 url='https://download.geofabrik.de/asia/japan/'+region+'-latest.osm.pbf'
 def request(start,end):return urllib.request.urlopen(urllib.request.Request(url,headers={'Range':f'bytes={start}-{end}','User-Agent':'Trackfinity-road-scenery/1.0'}),timeout=60)
 with request(0,0) as response:total=int(response.headers['Content-Range'].split('/')[-1])
 if path.stat().st_size>total:raise ValueError('Cached source is newer/larger; keep it separately before updating '+region)
 while path.stat().st_size<total:
  start=path.stat().st_size;end=min(total-1,start+33554431)
  for attempt in range(3):
   try:
    with request(start,end) as response:
     if response.status!=206 or not response.headers.get('Content-Range','').startswith(f'bytes {start}-'):raise ValueError('Unexpected byte range')
     data=response.read()
    if len(data)!=end-start+1:raise ValueError('Incomplete source download')
    with path.open('ab') as output:output.write(data)
    print(region,round(path.stat().st_size/total*100),'%',flush=True);break
   except Exception:
    if attempt==2:raise
    time.sleep(2)
 print(region,'complete',total,flush=True)
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(download,['kanto','chubu','kansai','tohoku']))
