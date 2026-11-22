"""Retain measured-height provenance, allowing all-route contextual estimation."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
text=(ROOT/'tools/import-buildings104.py').read_text(encoding='utf8')
text=text.replace("CACHE=ROOT.parent/'buildings104'","CACHE=ROOT.parent/'buildings105'")
text=text.replace('height(dict(way.tags))])',"height(dict(way.tags)),int(not(way.tags.get('height') or way.tags.get('building:levels')))])")
text=text.replace('ident,lat,lon,corners,h=entries[index]','ident,lat,lon,corners,h,estimated=entries[index]')
text=text.replace('round(h*10)]))','round(h*10),estimated]))')
text=text.replace("otherwise approximate by building type'","otherwise Street View informed settlement/footprint estimation' ")
exec(compile(text,str(ROOT/'tools/import-buildings104.py'),'exec'),{'__file__':str(ROOT/'tools/import-buildings104.py'),'__name__':'__main__'})
