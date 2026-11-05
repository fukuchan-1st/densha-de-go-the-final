"""Apply Nagano's conventional-line schematic and mapped approach platforms.

Run after import/extension generation with the OSM station snapshots directory.
The operating rail, stops, timetable and limits remain the route's originals.
"""
import argparse
from bisect import bisect_right
from copy import deepcopy
import json
import math
from pathlib import Path

RADIUS=6371008.8
REFERENCE_LATITUDE=35.6812546
REFERENCE_LONGITUDE=139.766706
STATIONS={"長野":("nagano",[183932548,183932549,183940300]),
          "安茂里":("amori",[82246799,183813600]),
          "川中島":("kawanakajima",[184727739]),
          "今井":("imai",[403616349,403616350])}
NAGANO_REFS={403637939:"2",403637910:"3",403637936:"5",859360728:"6",1460538581:"7"}
NAGANO_OFFICIAL="https://www.jreast.co.jp/estation/stations/1105.html"
KAWANAKAJIMA_OFFICIAL="https://www.jreast.co.jp/estation/stations/532.html"
SOURCE="Nagano station layout import"


def read(path):
    return json.loads(path.read_text(encoding="utf8"))


def interpolate(rows,s,column=1):
    i=max(0,min(len(rows)-2,bisect_right(rows,s,key=lambda row:row[0])-1))
    a,b=rows[i:i+2]
    return a[column]+(b[column]-a[column])*(s-a[0])/(b[0]-a[0])


def rawxy(node):
    factor=RADIUS*math.pi/180
    return ((node["lon"]-REFERENCE_LONGITUDE)*factor*math.cos(math.radians(REFERENCE_LATITUDE)),
            (node["lat"]-REFERENCE_LATITUDE)*factor)


class Geometry:
    def __init__(self,route,ways):
        self.route=route
        self.ways=ways
        label=rawxy(route["stations"][0])
        coordinates=[rawxy(node) for node in ways[403637910]["geometry"]]
        candidates=[]
        for a,b in zip(coordinates,coordinates[1:]):
            dx,dz=b[0]-a[0],b[1]-a[1]
            t=max(0,min(1,((label[0]-a[0])*dx+(label[1]-a[1])*dz)/(dx*dx+dz*dz)))
            p=a[0]+t*dx,a[1]+t*dz
            candidates.append((math.dist(label,p),p))
        self.origin=min(candidates)[1]

    def xy(self,node):
        x,z=rawxy(node)
        return x-self.origin[0],z-self.origin[1]

    def point(self,s):
        return interpolate(self.route["points"],s,1),interpolate(self.route["points"],s,2)

    def hits(self,way,s,closed=False):
        points=[self.xy(node) for node in way["geometry"]]
        if closed and points[0]!=points[-1]:
            points.append(points[0])
        center=self.point(s)
        a,b=self.point(s-3),self.point(s+3)
        dx,dz=b[0]-a[0],b[1]-a[1]
        length=math.hypot(dx,dz)
        dx,dz=dx/length,dz/length
        found=[]
        for a,b in zip(points,points[1:]):
            u=(a[0]-center[0])*dx+(a[1]-center[1])*dz
            v=(b[0]-center[0])*dx+(b[1]-center[1])*dz
            if u*v>0 or abs(u-v)<1e-5:
                continue
            t=-u/(v-u)
            found.append((a[0]+t*(b[0]-a[0])-center[0])*dz-(a[1]+t*(b[1]-a[1])-center[1])*dx)
        return sorted(set(round(x,5) for x in found))

    def platform(self,station,way):
        edges=[]
        for relative in range(-290,251,5):
            xs=self.hits(way,station["s"]+relative,closed=True)
            if len(xs)>=2 and xs[-1]-xs[0]>.8:
                edges.append([relative,round(xs[0],3),round(xs[-1],3)])
        if len(edges)<2:
            raise ValueError("Platform polygon has no usable width")
        near=interpolate(edges,0,1),interpolate(edges,0,2)
        boarding=min(map(abs,near))<2.5
        return dict(edges=edges,boarding=boarding,roof=[edges[0][0]+10,edges[-1][0]-10],
                    osmWayId=way["id"],ref=way["tags"].get("ref"),
                    source=f'https://www.openstreetmap.org/way/{way["id"]}',
                    basis="Mapped platform polygon; canopy coverage approximated",layoutSource=SOURCE)


def add_station_rails(route,geometry):
    station=route["stations"][0]
    output=[]
    for way_id,ref in NAGANO_REFS.items():
        if ref=="3":
            continue
        way=geometry.ways[way_id]
        rows=[]
        for relative in range(-280,391,5):
            xs=geometry.hits(way,station["s"]+relative)
            if xs:
                rows.append([station["s"]+relative,round(min(xs,key=abs),3)])
        if len(rows)<3:
            continue
        # Existing counterpart traces are retained. Add only missing extent.
        missing=[]
        for s,x in rows:
            exists=any(t["knots"][0][0]<=s<=t["knots"][-1][0] and
                       abs(interpolate(t["knots"],s)-x)<.35 for t in route["neighborTracks"])
            if exists:
                if len(missing)>2:
                    output.append(dict(knots=missing,osmWayId=way_id,trackRef=ref,
                                       source=SOURCE,station="長野"))
                missing=[]
            else:
                missing.append([s,x])
        if len(missing)>2:
            output.append(dict(knots=missing,osmWayId=way_id,trackRef=ref,source=SOURCE,station="長野"))
    output.append(dict(knots=[[-170,-5.4],[-85,-5.4]],trackRef="4",station="長野",terminating=True,
                       source=SOURCE,approximate=True,endBuffer=True,
                       basis="Schematic bay inside 3/5 island; OSM bay length about87m; lateral position schematic"))
    route["neighborTracks"].extend(output)


def station_layouts(route,ways):
    geometry=Geometry(route,ways)
    layouts={}
    for station in route["stations"]:
        name=station["name"]
        if name not in STATIONS:
            continue
        platforms=[geometry.platform(station,ways[way_id]) for way_id in STATIONS[name][1]]
        if name=="長野":
            for platform in platforms:
                platform["officialSource"]=NAGANO_OFFICIAL
            central=next(p for p in platforms if p["osmWayId"]==183932548)
            # The mapped polygon is rectangular. The supplied schematic adds
            # the short 4-track bay entering its back end, beside the 5 face.
            for edge in central["edges"]:
                relative=edge[0]
                if relative<=-85:
                    edge[2]=min(edge[2],-7.0)
                elif relative<-75:
                    t=(relative+85)/10
                    edge[2]=-7.0+t*(edge[2]+7.0)
            central["boarding"]=True
            central["bayTrack"]="4"
            central["bayReference"]="Supplied station schematic; bay notch and lateral position approximate"
            central["ref"]="3;5 (4 bay)"
            next(p for p in platforms if p["osmWayId"]==183940300)["boarding"]=False
            layouts[name]=dict(platforms=platforms,reference=NAGANO_OFFICIAL,
                               bayTrack=dict(ref="4",sStart=-170,sEnd=-85,x=-5.4,approximate=True))
        else:
            layouts[name]=dict(platforms=platforms)
            if name=="川中島":
                layouts[name]["reference"]=KAWANAKAJIMA_OFFICIAL
                layouts[name]["type"]="island"
                platforms[0]["ref"]="1;2"
                platforms[0]["boarding"]=True
                platforms[0]["faces"]="both running tracks"
            # Mark the platform nearest the operating rail. Its mirror serves
            # the mapped counter-direction track, without changing operations.
            elif not any(p["boarding"] for p in platforms):
                min(platforms,key=lambda p:min(abs(v) for edge in p["edges"] for v in edge[1:]))["boarding"]=True
    return layouts,geometry


def bounds(route,station,platform,s):
    left=interpolate(platform["edges"],s-station["s"],1)
    right=interpolate(platform["edges"],s-station["s"],2)
    middle=(left+right)/2
    for track in [{"knots":[[-300,0],[route["length"]+300,0]]},*route["neighborTracks"]]:
        if track["knots"][0][0]<=s<=track["knots"][-1][0]:
            x=interpolate(track["knots"],s)
            if x<middle:left=max(left,x+1.45)
            else:right=min(right,x-1.45)
    return left,right


def apply(cache,assets):
    ways={}
    for filename,_ in STATIONS.values():
        for way in read(cache/(filename+"-station-core-osm.json"))["elements"]:
            ways[way["id"]]=way
    approach=read(assets/"shinonoi-approach-route.json")
    composite=read(assets/"shinonoi-extended-route.json")
    layouts,geometry=station_layouts(approach,ways)
    report={}
    for route in (approach,composite):
        route.setdefault("neighborTracks",[])[:]=[t for t in route.get("neighborTracks",[]) if t.get("source")!=SOURCE]
        route.setdefault("stationLayouts",{}).update(deepcopy(layouts))
        if route["id"]=="shinonoi-approach":
            route["stationLayouts"]["篠ノ井"]=deepcopy(composite["stationLayouts"]["篠ノ井"])
        add_station_rails(route,geometry)
        checked={}
        for station in route["stations"][:5]:
            name=station["name"]
            platforms=route["stationLayouts"][name]["platforms"]
            widths=[]
            for platform in platforms:
                for rel,_,_ in platform["edges"]:
                    left,right=bounds(route,station,platform,station["s"]+rel)
                    widths.append(max(0,right-left))
            checked[name]=dict(platforms=len(platforms),minimumClippedWidth=round(min(widths),3))
            if name in STATIONS and min(widths)<.8:
                raise ValueError((route["id"],name,"platform clipped",min(widths)))
        (assets/(route["id"]+"-route.json")).write_text(
            json.dumps(route,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
        report[route["id"]]=checked
    return report


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cache",type=Path)
    parser.add_argument("--assets",type=Path,default=Path(__file__).resolve().parents[1]/"dist/assets/final")
    args=parser.parse_args()
    print(json.dumps(apply(args.cache,args.assets),ensure_ascii=False))
