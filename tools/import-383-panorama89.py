from pathlib import Path
import json,gzip
ROOT=Path(__file__).resolve().parents[1]
ns={'__file__':str(ROOT/'tools/import-player-structures.py')}
exec((ROOT/'tools/import-player-structures.py').read_text(encoding='utf-8').split("manifest=json.loads")[0],ns)
paths=['383/Tsc383s.x'];part=ns['export']('383','panorama',ns['xparts'](paths),paths)
for key in ['file','indexFile']:
 source=ns['OUT']/part[key];packed=source.with_name(source.name+'.gz');packed.write_bytes(gzip.compress(source.read_bytes(),mtime=0));part[key]=packed.name;source.unlink()
manifestPath=ns['OUT']/'manifest.json';manifest=json.loads(manifestPath.read_text(encoding='utf-8'));manifest['models']['383']['variants']['panorama']=part;manifest['models']['383']['panoramaRotation']=3.141592653589793
manifestPath.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8');print(part['vertices'],part['bounds'])
