"""Refresh mapped land cover around the Niwasaka–Sekine mountain corridor."""
from pathlib import Path
import requests, json
cache=Path(__file__).resolve().parents[2]/'yamagata99'
cache.mkdir(exist_ok=True)
query='''[out:json][timeout:120];(way[building](37.74,140.12,37.89,140.42);way[landuse](37.74,140.12,37.89,140.42);relation[landuse](37.74,140.12,37.89,140.42);way[natural~"wood|scrub|grassland|heath"](37.74,140.12,37.89,140.42);relation[natural~"wood|scrub|grassland|heath"](37.74,140.12,37.89,140.42););out geom;'''
for endpoint in ['https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
    try:
        response=requests.get(endpoint,params={'data':query},headers={'User-Agent':'RailwaySimulator-YamagataScenery/99 (personal railway landscape mapping; https://tohoku-701-prototype-1030.w1324.chatgpt.site/)'},timeout=160)
        response.raise_for_status()
        data=response.json()
        if 'remark' in data:raise RuntimeError(data['remark'])
        (cache/'osm.json').write_text(json.dumps(data,ensure_ascii=False),encoding='utf8')
        (cache/'query.txt').write_text(query,encoding='utf8')
        print(json.dumps(dict(endpoint=endpoint,timestamp=data.get('osm3s',{}).get('timestamp_osm_base'),elements=len(data['elements'])),ensure_ascii=False))
        break
    except Exception as error:
        print(type(error).__name__,str(error)[:180],flush=True)
else:raise RuntimeError('Neither Overpass endpoint returned a complete response')
