"""Compress source WAV containers losslessly; the pack loader restores exact bytes."""
from pathlib import Path
import json,gzip,hashlib
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'dist/assets/final/vehicles'
p=folder/'manifest.json';data=json.loads(p.read_text(encoding='utf8'));total=0;records=[]
for train,entries in data['trains'].items():
    for ref in entries.values():
        name=ref['file']
        if not name.endswith('.wav'):continue
        path=(folder/train/name).resolve();raw=path.read_bytes();zipped=gzip.compress(raw,mtime=0)
        if len(raw)-len(zipped)<16384:continue
        target=path.with_suffix('.wav.gz');target.write_bytes(zipped)
        assert gzip.decompress(target.read_bytes())==raw
        ref['file']=name+'.gz';total+=len(raw)-len(zipped)
        records.append(dict(file=path.relative_to(folder).as_posix(),originalSha256=hashlib.sha256(raw).hexdigest(),originalBytes=len(raw)))
used={(folder/train/ref['file']).resolve() for train,entries in data['trains'].items() for ref in entries.values()}
for record in records:
    path=(folder/record['file']).resolve()
    if path not in used:path.unlink()
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
audit=folder/'wave-compression97.json';previous=json.loads(audit.read_text(encoding='utf8')) if audit.exists() else []
audit.write_text(json.dumps(previous+records,separators=(',',':')),encoding='utf8')
print('source WAV bytes preserved; saved',total,'bytes across',len(records),'assets',flush=True)
