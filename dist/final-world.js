import {addMappedBuildings} from './mapped-buildings.js?v=106';
import {tamaTown} from './tama-scenery.js?v=106';
import {StationCharacters} from './station-characters.js?v=106';
import {residentialAllowed} from './yamagata-mountain.js?v=106';
import {sceneryDensity} from './scenery-profile.js?v=106';
import {platformExtent} from './station-platform-length.js?v=106';
import {BasinScenery,addBasinFields} from './basin-scenery.js?v=106';
import {basinDensity,basinAnchors,basinTerrainAreas,basinTerrainAt} from './basin-profile.js?v=106';
import {TohoLandmarks} from './toho-landmarks.js?v=106';
import {isToho,villageAt,woodMaterial,addTohoHouses} from './toho-scenery.js?v=106';
import {filmingChunkIndices} from './railfan-tunnel.js?v=106';
import {chuoScenery,mountainArea} from './geographic-sections.js?v=106';
import {prepareUrbanViaduct} from './urban-viaduct.js?v=106';
import {RoadScenery} from './road-scenery.js?v=106';
import {BallastDetail} from './ballast-detail.js?v=106';
import {whiteRailPost,tactileMaterial,safePlatformBounds,platformStripClear} from './platform-details.js?v=106';
import {LevelCrossings} from './crossings.js?v=106';
import {createTerrainMaterial,createBuildingMaterial,terrainKind,terrainShade,buildingVariant,buildingPalette} from './terrain-materials.js?v=106';
import {SceneAtmosphere} from './scene-atmosphere.js?v=106';
import {RealTrees,treeVariant} from './real-trees.js?v=106';
import {PlayerTrain} from './player-train.js?v=106';
import {prepareLeftTraffic} from './route-traffic.js?v=106';
import {prepareCorridorScenery,corridorSceneryType} from './corridor-scenery.js?v=106';
import {sampleRouteCurve} from './route-curve.js?v=106';
import {prepareTurnoutLayout} from './turnout-layout.js?v=106';
import {addTurnouts} from './turnout-scene.js?v=106';
import {OpposingTrains} from './opposing-trains.js?v=106';
import * as T from './assets/vendor/three.module.js?v=106';
import {CabSuspension} from './cab-motion.js?v=106';
import {addTrackSignal} from './track-signal.js?v=106';
import {addStoppingMarker} from './stop-scene.js?v=106';
import {interpolateKnots} from './track-layout.js?v=106';
import {addYaganHillsides,addYaganTunnel} from './yagan-scenery.js?v=106';
const clamp=T.MathUtils.clamp;
// Original streamed scenery. Track coordinates come from the route JSON; buildings and platforms are approximate.
export class FinalWorld {
 constructor(container,route,{quality='standard',drawDistance=1500}={}){
  route=prepareUrbanViaduct(prepareLeftTraffic(prepareCorridorScenery(route)));
  this.quality=quality;this.route=route;this.sceneryStations=route.sceneryStations??route.stations;this.points=route.points;this.length=route.stations.at(-1).s;this.chunks=new Map();this.suspension=new CabSuspension();this.materials=new Map();this.rural=['tohoku','yamagata','toho','toho-village','toho-center','tatsuno','tatsuno-nagano','yagan','shinonoi','oito','chuo-shinshu','chuo-kofu','chuo-system','ome','itsukaichi','chuo-itsukaichi','ome-okutama','chuo-ome','chuo-oito','suwa-nagano','chuo-extended','shinonoi-extended','chuo'].includes(route.id);
  this.chuoCorridor=['chuo','chuo-extended','chuo-ome','chuo-oito'].includes(route.id);
  this.mountainStart=this.chuoCorridor?(this.sceneryStations.find(st=>st.name==='高尾')?.s??Infinity):-Infinity;
  this.cityEnd=this.chuoCorridor?(this.sceneryStations.find(st=>st.name==='中野')?.s??0):0;
  this.scene=new T.Scene();this.scene.background=new T.Color('#a4c5db');this.scene.fog=new T.Fog('#b3c9d3',350,1600);if(route.night){this.scene.background.set('#050a17');this.scene.fog.color.set('#0b1527');this.scene.fog.near=80;this.scene.fog.far=900;}
  this.renderer=new T.WebGLRenderer({antialias:quality!=='light',powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='light'?1:1.5));this.renderer.setSize(1600,900);this.renderer.outputColorSpace=T.SRGBColorSpace;container.replaceChildren(this.renderer.domElement);
  this.camera=new T.PerspectiveCamera(58,16/9,.15,1900);this.sky=new T.HemisphereLight('#e3f4ff','#79766b',2.1);this.scene.add(this.sky);this.sun=new T.DirectionalLight('#fff1d8',2.1);this.sun.position.set(-150,300,90);this.scene.add(this.sun);this.box=new T.BoxGeometry(1,1,1);this.houseRoof=new T.ConeGeometry(Math.SQRT1_2,1,4);this.houseRoof.rotateY(Math.PI/4);this.traffic=new OpposingTrains(this);this.trees=new RealTrees(this);this.quality=quality;this.panorama=false;this.viewOrigin=null;this.setDrawDistance(drawDistance);
  const normalize=(rail,index)=>({...rail,id:'neighbor-'+index,knots:rail.knots.map(([s,x])=>[s,x,rail.heightKnots?.length?interpolateKnots(rail.heightKnots,s):rail.height??0])});
  const neighbors=(route.neighborTracks??[{knots:Array.from({length:Math.ceil(this.length/30)+1},(_,i)=>{const s=Math.min(this.length,i*30);return [s,this.oppositeOffset(s)];})}]).map(normalize);
  const playerKnots=route.drivingTrack?.map(([s,x])=>[s,x,0])??[[-300,0,0],[this.length+300,0,0]];
  const prepared=prepareTurnoutLayout([{id:'player',player:true,knots:playerKnots},...neighbors],{length:this.length,stations:this.sceneryStations.map(st=>({...st,platforms:route.stationLayouts?.[st.name]?.platforms??[]}))});
  this.railTracks=prepared.tracks;this.turnouts=prepared.turnouts;
  this.route={...route,neighborTracks:prepared.tracks.filter(t=>!t.player).map(t=>({...t,heightKnots:t.knots.map(([s,x,y])=>[s,y])}))};
  if(this.rural||route.night){
   this.pine=new T.ConeGeometry(.5,1,6);
   this.canopy=new T.DodecahedronGeometry(.56);
   this.headlight=new T.SpotLight('#fff1d1',0,100,.4,.8,1.6);
   this.headlight.position.set(0,-.8,0);
   this.headlight.target.position.set(0,-1.6,-35);
   this.camera.add(this.headlight,this.headlight.target);
   this.scene.add(this.camera);
  }
  this.basin=new BasinScenery(this);this.atmosphere=new SceneAtmosphere(this);this.crossings=new LevelCrossings(this);this.ballastDetail=new BallastDetail(this);this.roadScenery=new RoadScenery(this);this.landmarks=isToho(route)?new TohoLandmarks(this):null;this.characters=isToho(route)?new StationCharacters(this):null;
 }
 setQuality(quality){this.atmosphere.setQuality(quality);}
 mat(color){
  if(!this.materials.has(color)){
   const kind=terrainKind(color),id=color.startsWith('facade:')?color.split(':'):null,facade=id||['#b7b5aa','#b1b7b5','#d1c4a9'].includes(color);
   const material=color.startsWith('toho-wood:')?woodMaterial(Number(color.split(':')[1])):kind==='tactile'?tactileMaterial():kind?createTerrainMaterial(kind):facade?createBuildingMaterial(id?buildingPalette(Number(id[2]),id[1]==='house'):color,id?id[1]==='house':color==='#d1c4a9',id?Number(id[2]):0):new T.MeshStandardMaterial({color,roughness:.85});
   if(kind&&this.quality==='light')material.normalMap=null;
   if(['grass','forest'].includes(kind))material.vertexColors=true;
   if(color==='#405d68'){material.userData.windowLight=true;material.emissive.set('#ffbc72');material.emissiveIntensity=0;}
   this.materials.set(color,material);
  }return this.materials.get(color);
 }
 point(s){const [x,z,y]=sampleRouteCurve(this.points,s);return new T.Vector3(x,y,-z);}
 frame(s,offset=0){const p=this.point(s),dir=this.point(s+3).sub(this.point(s-3)).normalize(),right=new T.Vector3(-dir.z,0,dir.x).normalize();p.addScaledVector(right,offset);return {p,dir,right,angle:Math.atan2(-dir.x,-dir.z)};}
 driveOffset(s){return this.route.drivingTrack?interpolateKnots(this.route.drivingTrack,s):0;}
 deckHeight(s){return this.route.elevatedTrack?interpolateKnots(this.route.elevatedTrack,s):0;}
 drivePoint(s){
  const p=this.route.drivingTrack?this.frame(s,this.driveOffset(s)).p:this.point(s);
  p.y+=this.deckHeight(s);
  return p;
 }
 driveFrame(s){
  if(!this.route.drivingTrack&&!this.route.elevatedTrack)return this.frame(s);
  const p=this.drivePoint(s),dir=this.drivePoint(s+3).sub(this.drivePoint(s-3)).normalize();
  return {p,dir,right:new T.Vector3(-dir.z,0,dir.x).normalize()};
 }
 curvature(s){const a=this.driveFrame(s-20).dir.setY(0).normalize(),b=this.driveFrame(s+20).dir.setY(0).normalize();return Math.atan2(a.x*b.z-a.z*b.x,a.dot(b))/40;}
 grade(s){return clamp((this.drivePoint(s+10).y-this.drivePoint(s-10).y)/20*1000,-40,40);}
 structureAt(s,kind){return this.route.structures?.find(item=>(!kind||item.kind===kind)&&s>=item.sStart&&s<=item.sEnd);}
 sceneryTypeAt(s){if(tamaTown(this.route,s)?.weight>.4)return 'suburban';if(isToho(this.route))return villageAt(this.route,s)?'suburban':'mountain';const density=sceneryDensity(this.route,s);if(density.source==='osm-600m'||Number.isFinite(density.urban))return density.building>=70?'city':density.forest>.45&&density.green>55?'mountain':'suburban';if(['itsukaichi','chuo-itsukaichi'].includes(this.route.id)){const end=this.sceneryStations.find(st=>st.name==='武蔵増戸')?.s??this.length;return this.route.reverseDirection?(s>end?'suburban':'mountain'):(s<end?'suburban':'mountain');}const chuo=chuoScenery(this.route,s);if(chuo)return chuo;const corridor=corridorSceneryType(this.route,s);if(corridor)return corridor;if(this.chuoCorridor)return s<this.cityEnd?'city':s<this.mountainStart?'suburban':'mountain';return this.rural?'mountain':(['yamanote','osaka'].includes(this.route.id)||this.stationNear(s).d<900?'city':'suburban');}
 stationNear(s){let nearest=null,d=Infinity;for(const st of this.sceneryStations??this.route.stations){const dd=Math.abs(st.s-s);if(dd<d){nearest=st;d=dd;}}return {st:nearest,d};}
 platformLength(){return clamp((this.route.carCount??10)*20+20,180,280);}
 oppositeOffset(s){
  const {st}=this.stationNear(s);
  const measured=this.route.stationLayouts?.[st.name]?.opposite;
  if(measured?.length){
   const relative=s-st.s;
   const outside=Math.max(measured[0][0]-relative,relative-measured.at(-1)[0],0);
   const x=interpolateKnots(measured,relative);
   return T.MathUtils.lerp(x,this.route.defaultOppositeOffset??4,clamp(outside/100,0,1));
  }
  const reference=this.route.parallelTrackReference?.find(row=>row.s===st.s);
  const spacing=reference?.oppositeTrackSpacingM;
  if(!Number.isFinite(spacing))return this.route.defaultOppositeOffset??4;
  // Keep the measured gap throughout the platform and blend into the adjacent scene.
  const platformStart=st.s-this.platformLength()+18;
  const platformEnd=st.s+18;
  const outside=Math.max(platformStart-s,s-platformEnd,0);
  return T.MathUtils.lerp(spacing,4,clamp(outside/100,0,1));
 }
 cube(group,s,x,y,w,h,d,color){const f=this.frame(s,x),m=new T.Mesh(this.box,this.mat(color));m.position.copy(f.p);m.position.y+=y+h/2;m.rotation.order='YXZ';m.rotation.set(Math.asin(clamp(f.dir.y,-1,1)),f.angle,0);m.scale.set(w,h,d);m.userData.shadowCaster=h>.4;group.add(m);return m;}
 ribbon(group,start,end,offset,width,height,color,step=7,valid=null){
  let lastS=start;const pos=[],idx=[],uv=[],colors=[],kind=terrainKind(color),tile=kind==='ballast'?3:kind==='asphalt'?5:7;
  for(let s=start,i=0;s<=end+.01;s=Math.min(end,s+step),i++){
   const x=typeof offset==='function'?offset(s):offset,w=typeof width==='function'?width(s):width,f=this.frame(s,x);
   for(const dx of[-w/2,w/2]){const px=f.p.x+f.right.x*dx,pz=f.p.z+f.right.z*dx;pos.push(px,f.p.y+(typeof height==='function'?height(s):height),pz);if(kind==='tactile')uv.push(dx/Math.max(.001,w)+.5,s/.3);else uv.push(px/tile,pz/tile);const shade=terrainShade(px,pz);colors.push(shade,shade,shade);}
   if(i&&(!valid||valid(lastS,s))){const k=i*2;idx.push(k-2,k-1,k,k-1,k+1,k);}lastS=s;if(s===end)break;
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
  const m=new T.Mesh(g,this.mat(color));m.material.side=T.DoubleSide;m.userData.shadowCaster=color==='#677778';group.add(m);
 }
 instances(group,items,color,geometry=this.box){if(!items.length)return;const m=new T.InstancedMesh(geometry,this.mat(color),items.length),o=new T.Object3D();items.forEach((a,i)=>{const f=this.frame(a.s,a.x);o.position.copy(f.p);o.position.y+=a.y+a.h/2;o.rotation.order='YXZ';o.rotation.set(Math.asin(clamp(f.dir.y,-1,1)),f.angle,0);o.scale.set(a.w,a.h,a.d);o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.computeBoundingSphere();m.userData.shadowCaster=items.some(a=>a.h>.5);group.add(m);}
 sign(group,name,s,x,level=0){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#f0f0df';c.fillRect(0,0,512,128);c.fillStyle=this.route.color??'#5aa642';c.fillRect(0,96,512,16);c.fillStyle='#16282a';c.font='bold 55px sans-serif';c.textAlign='center';c.fillText(name,256,74);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(2.7,.675),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide})),f=this.frame(s,x);m.position.copy(f.p);m.position.y+=level+3.75;m.rotation.y=f.angle+Math.PI/2;group.add(m);for(const delta of[-.85,.85])this.cube(group,s+delta,x,level+4.08,.025,.3,.025,'#aeb3ad');}
 platformBounds(st,platform,s,tracks){return safePlatformBounds(st,platform,s,tracks);}
 addPlatform(group,st,platform,tracks,start,end){
  const [platformFrom,platformTo]=platformExtent(this.route,st,platform,this.platformLength());
  const from=Math.max(start,st.s+platformFrom);
  const to=Math.min(end,st.s+platformTo);
  if(to<=from)return;
  const sameLevel=tracks.filter(t=>Math.abs((t.height??0)-(platform.height??0))<.3).map(t=>({...t,height:0}));
  const bounds=s=>this.platformBounds(st,{...platform,height:0},s,sameLevel);
  const level=s=>(platform.height??0)+this.deckHeight(s);
  const center=s=>{const [l,r]=bounds(s);return (l+r)/2;};
  const width=s=>{const [l,r]=bounds(s);return r-l;};
  this.ribbon(group,from,to,center,width,s=>level(s)+1,'#a8aaa1',2,(a,b)=>platformStripClear(a,b,bounds,sameLevel));
  for(let a=from;a<to;a+=12){const d=Math.min(12,to-a),s=a+d/2;if(this.deckHeight(s)>1.3&&width(s)>1){this.cube(group,s,center(s),level(s)-.6,width(s),.6,d,'#929991');if(Math.floor(a/12)%3===0)this.cube(group,s,center(s),0,.65,Math.max(.2,level(s)-.6),.9,'#a6aaa2');}}
  for(const edge of [0,1]){
   const inset=edge===0?.28:-.28;
   this.ribbon(group,from,to,s=>bounds(s)[edge]+inset,s=>Math.min(.3,width(s)),s=>level(s)+1.015,'#e3ce67',2,(a,b)=>platformStripClear(a,b,bounds,sameLevel,edge));
   for(let a=from;a<to;a+=5){
    const d=Math.min(5,to-a),s=a+d/2;
    if(width(s)>.65)this.cube(group,s,bounds(s)[edge]+inset/3,level(s),.1,1,d,'#7d837c');
   }
  }
  const roofFrom=Math.max(from,st.s+(platform.roof?.[0]??-123));
  const roofTo=Math.min(to,st.s+(platform.roof?.[1]??8));
  if(roofTo>roofFrom){
   this.ribbon(group,roofFrom,roofTo,center,s=>Math.max(0,Math.min(width(s)-.35,10)),s=>level(s)+4.4,'#677778',4);
   for(let s=st.s-107;s<roofTo;s+=16){
    if(s>=roofFrom&&width(s)>1.2)whiteRailPost(this,group,s,center(s),level(s)+1);
   }
  }
  for(const s of [st.s-105,st.s-22]){
   if(s>=from&&s<to&&width(s)>1.2)this.sign(group,st.name,s,center(s),level(s));
  }
 }
 buildChunk(index){const group=new T.Group(),start=Math.max(-300,index*500),end=Math.min(this.length+300,(index+1)*500);if(end<=start)return group;this.roadScenery.prepareProfiles(Math.floor((start+end)/480));
  {const finish=end;for(let a=start;a<finish;a+=50){const b=Math.min(finish,a+50),kind=this.sceneryTypeAt((a+b)/2);if(basinTerrainAt(this.route,(a+b)/2))this.ribbon(group,a,b,0,2200,-.8,'#869177',10);this.ribbon(group,a,b,0,260,-.2,kind==='mountain'?'#869177':'#9a9d93',10);}}
  const tracks=[{start,end,offset:s=>this.driveOffset(s)}];
  const nearby=(this.sceneryStations??this.route.stations).filter(st=>st.s+360>=start&&st.s-420<=end);
  if(this.route.neighborTracks){
   for(const {knots,height,heightKnots} of this.route.neighborTracks){
    const a=Math.max(start,knots[0][0]),b=Math.min(end,knots.at(-1)[0]);
    if(b>a)tracks.push({start:a,end:b,offset:s=>interpolateKnots(knots,s),height,heightKnots});
   }
  }else{
   tracks.push({start,end,offset:s=>this.oppositeOffset(s)});
  }
  const trackEnvelope=s=>{
   const offsets=tracks.filter(rail=>s>=rail.start&&s<=rail.end).map(rail=>rail.offset(s));
   return [Math.min(...offsets),Math.max(...offsets)];
  };
  const structures=(this.route.structures??[]).filter(item=>item.sStart<end&&item.sEnd>start);
  let seed=(index*1297+this.route.id.length*701)>>>0;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  if(this.rural&&mountainArea(this.route,(start+end)/2))addYaganHillsides(T,this,group,start,end,trackEnvelope,structures.filter(item=>item.kind==='bridge'),random);
  if(this.route.elevatedTrack){
   for(let a=start;a<end;a+=6){
    const depth=Math.min(6,end-a),s=a+depth/2,height=this.deckHeight(s);
    if(height<.25)continue;
    const layers=new Map();for(const rail of tracks){if(s<rail.start||s>rail.end)continue;const delta=rail.heightKnots?.length?interpolateKnots(rail.heightKnots,s):(rail.height??0),key=Math.round(delta*10)/10,layer=layers.get(key)??[];layer.push(rail.offset(s));layers.set(key,layer);}for(const [delta,offsets]of layers){const min=Math.min(...offsets),max=Math.max(...offsets);this.cube(group,s,(min+max)/2,height+delta-.85,max-min+7,.85,depth+.08,'#92948b');}
   }
   for(let s=Math.ceil(start/28)*28;s<end;s+=28){
    const height=this.deckHeight(s);
    if(height<1.3||this.route.roadsBelow?.some(road=>Math.abs(road.s-s)<road.width))continue;
    const [min,max]=trackEnvelope(s);
    for(const x of [min-1.8,max+1.8])this.cube(group,s,x,0,1.15,height-.8,1.3,'#a5a69b');
   }
   for(const road of this.route.roads?.length?[]:this.route.roadsBelow??[]){
    if(road.s<start||road.s>=end)continue;
    const f=this.point(road.s),mesh=new T.Mesh(this.box,this.mat('#565b5b'));
    mesh.position.set(road.x,f.y-.13,-road.z);
    mesh.rotation.y=Math.atan2(-road.dx,road.dz);
    mesh.scale.set(road.width,.13,98);
    group.add(mesh);
   }
  }
  const ties=[],poles=[],arms=[],buildings=[],windows=[],trees=[];
  for(const rail of tracks){
   const {start:a,end:b,offset,height=0,heightKnots}=rail;
   const level=s=>this.deckHeight(s)+(heightKnots?.length?interpolateKnots(heightKnots,s):height);
   this.ribbon(group,a,b,offset,3.15,s=>level(s)+.02,'#74746b');
   for(const dx of[-(this.route.gaugeM??1.067)/2,(this.route.gaugeM??1.067)/2])this.ribbon(group,a,b,s=>offset(s)+dx,.07,s=>level(s)+.19,'#b7c3c3',2);
   for(let s=Math.ceil(a/1.1)*1.1;s<b;s+=1.1)ties.push({s,x:offset(s),y:level(s)+.06,w:this.route.gaugeM===1.435?2.4:2.05,h:.1,d:.18});
   if(height>0){
    for(let s=a;s<b;s+=10){
     const d=Math.min(10,b-s),mid=s+d/2;
     this.cube(group,mid,offset(mid),this.deckHeight(mid)+height-.6,3.4,.55,d,'#9c9e94');
    }
    for(let s=Math.ceil(a/20)*20;s<b;s+=20)this.cube(group,s,offset(s),0,.65,height-.55,.8,'#9c9e94');
   }
  }
  this.instances(group,ties,'#625f56');
  const wires=[];
  for(let s=Math.ceil(start/40)*40;s<end;s+=40){
   if(this.rural&&this.structureAt(s,'tunnel'))continue;
   const [min,max]=trackEnvelope(s);
   const left=min-2.5,right=max+2.5;
   for(const x of [left,right])poles.push({s,x,y:this.deckHeight(s),w:.16,h:7.1,d:.16});
   arms.push({s,x:(left+right)/2,y:this.deckHeight(s)+6.9,w:right-left,h:.12,d:.14});
  }
  for(const rail of tracks){
   for(let s=rail.start;s<rail.end;s+=24){
    const next=Math.min(rail.end,s+24),a=this.frame(s,rail.offset(s)).p,b=this.frame(next,rail.offset(next)).p;
    const level=m=>this.deckHeight(m)+(rail.heightKnots?.length?interpolateKnots(rail.heightKnots,m):rail.height??0);
    const wireHeight=this.rural?4.8:5.7;
    wires.push(a.x,a.y+level(s)+wireHeight,a.z,b.x,b.y+level(next)+wireHeight,b.z);
   }
  }
  this.instances(group,poles,'#9da5a2');this.instances(group,arms,'#737c7a');const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wires,3));group.add(new T.LineSegments(wg,new T.LineBasicMaterial({color:'#3d4d53'})));
  const roofs=[];addMappedBuildings(this,group,start,end);
  if(isToho(this.route))addTohoHouses(this,group,start,end,trackEnvelope,random);
  for(let s=Math.ceil(start/26)*26;s<end;s+=26)for(const side of[-1,1]){
   const near=this.stationNear(s),kind=this.sceneryTypeAt(s),density=sceneryDensity(this.route,s),inBasin=!!basinTerrainAt(this.route,s);
   if(this.route.mappedBuildings||!residentialAllowed(this.route,s,32)||density&&random()>density.building/100)continue;
   if(isToho(this.route))continue;
   if(this.structureAt(s,'tunnel')||(kind==='mountain'&&density.building<35&&(near.d>260||random()>.38)))continue;
   const tama=tamaTown(this.route,s),urban=tama?random()>tama.houseShare:(inBasin?density.building>=80&&near.d<600:kind==='city'),[min,max]=trackEnvelope(s),edge=side<0?min:max;
   const h=urban?(tama?7+random()*11:14+random()*(inBasin?15:42)):3.2+random()*2.8,w=urban?8+random()*15:5.5+random()*3,d=urban?10+random()*12:6+random()*3;
   const x=edge+side*(urban?8+w/2+random()*7:13+random()*30);
   if((this.route.structures??[]).some(c=>c.kind==='crossing'&&Math.abs((c.sOrigin??c.sStart)-s)<d/2+9))continue;
   const frontageClear=this.roadScenery.buildingClear(s,x,w,d);if(frontageClear)buildings.push({s,x,y:0,w,h,d});
   if(urban&&!tama)for(const row of(this.quality==='light'?[1]:[1,2])){if(inBasin&&random()>.65)continue;const xx=edge+side*(row===1?43+random()*12:77+random()*18),height=inBasin?7+random()*20:18+random()*(row===1?44:65);const ww=14+random()*13,dd=18+random()*7;if(this.roadScenery.buildingClear(s,xx,ww,dd))buildings.push({s,x:xx,y:0,w:ww,h:height,d:dd});}
   if((inBasin||tama)&&!urban)for(const row of (tama?[42,68,100]:[65,100,145])){if(random()>density.building/100)continue;const xx=edge+side*(row+random()*9);if(this.roadScenery.buildingClear(s,xx,w,d)){buildings.push({s,x:xx,y:0,w,h,d});roofs.push({s,x:xx,y:h,w:w+.5,h:.8,d:d+.5});}}
   if(!urban&&!frontageClear)continue;
   if(!urban){roofs.push({s,x,y:h,w:w+.5,h:this.route.id==='tokaido'?1.7:.3,d:d+.5});if(this.route.id==='tokaido'){const x2=x+side*18;if(this.roadScenery.buildingClear(s+8,x2,w*.9+.5,d+.5)){buildings.push({s:s+8,x:x2,y:0,w:w*.9,h:h*.9,d});roofs.push({s:s+8,x:x2,y:h*.9,w:w*.9+.5,h:1.7,d:d+.5});}}}
   if(frontageClear&&this.quality!=='light')for(let y=2.5;y<h-1;y+=3)windows.push({s:s-d/2-.03,x,y,w:w*.65,h:1.1,d:.05});

  }
  for(let s=Math.ceil(start/14)*14;s<end;s+=14){
   const kind=this.sceneryTypeAt(s),near=this.stationNear(s),density=sceneryDensity(this.route,s);if(density&&random()>Math.max(density.green,tamaTown(this.route,s)?.green??0)/100)continue;if(kind==='mountain'||this.structureAt(s,'tunnel')||near.d<200)continue;
   const [min,max]=trackEnvelope(s);for(const side of [-1,1])for(const row of (kind==='city'?[15]:[16,33])){
    if(kind==='city'&&random()>.3)continue;trees.push({s:s+(random()-.5)*8,x:(side<0?min:max)+side*(row+random()*6),y:0,h:(kind==='city'?4:5)+random()*4});
   }
  }
  // Fill the city depth with blocks, while retaining the Tama house/green mix.
  const occupied=(s,x,w,d)=>buildings.some(b=>Math.abs(b.s-s)<(b.d+d)/2+2&&Math.abs(b.x-x)<(b.w+w)/2+2);
  for(let s=Math.ceil(start/32)*32;s<end;s+=32){const density=sceneryDensity(this.route,s),tama=tamaTown(this.route,s),city=this.sceneryTypeAt(s)==='city';if(this.route.mappedBuildings||!residentialAllowed(this.route,s,32)||isToho(this.route)||this.structureAt(s,'tunnel')||(!city&&!tama&&density.building<70))continue;const [min,max]=trackEnvelope(s),rows=city?(this.quality==='light'?[110,155]:[105,145,190,240,300]):(this.quality==='light'?[70,110]:[55,80,110,145]);for(const side of [-1,1])for(const row of rows){const w=city?20+random()*10:6+random()*3,d=city?21+random()*7:7+random()*3,h=city?13+random()*45:3.5+random()*3,x=(side<0?min:max)+side*(row+(random()-.5)*8);if(occupied(s,x,w,d)||!this.roadScenery.buildingClear(s,x,w,d))continue;buildings.push({s,x,y:0,w,h,d});if(!city)roofs.push({s,x,y:h,w:w+.5,h:1,d:d+.5});}}
  addBasinFields(this,group,start,end,trackEnvelope,random);
  this.instances(group,roofs,'#616b71',this.route.id==='tokaido'?this.houseRoof:this.box);
  for(let variant=0;variant<30;variant++){this.instances(group,buildings.filter(a=>a.h>9&&buildingVariant(a.s,a.x)===variant),'facade:office:'+variant);this.instances(group,buildings.filter(a=>a.h<=9&&buildingVariant(a.s,a.x)===variant),'facade:house:'+variant);}this.instances(group,windows,'#405d68');this.trees.add(group,trees.map(a=>({...a,y:0,variant:treeVariant(random()),rotation:random()*Math.PI*2}))); 
  for(const st of nearby){
   const drive=this.driveOffset(st.s),opposite=this.oppositeOffset(st.s);
   const edge=drive+(opposite>=drive?-1.55:1.55);
   const outer=edge+Math.sign(edge-drive)*4.8;
   const fallback=[{edges:[[-this.platformLength()+18,Math.min(edge,outer),Math.max(edge,outer)],[18,Math.min(edge,outer),Math.max(edge,outer)]]}];
   const platforms=this.route.stationLayouts?.[st.name]?.platforms??fallback;
   for(const platform of platforms)this.addPlatform(group,st,platform,tracks,start,end);
   if(st.s>=start&&st.s<end){
    const boarding=platforms.find(p=>p.boarding)??platforms[0];
    const side=boarding&&interpolateKnots(boarding.edges,0,1)>drive?1:-1;
    addStoppingMarker(T,this,group,st.s,drive,side,this.deckHeight(st.s));
   }
  }
  for(const structure of structures){
   const a=Math.max(start,structure.sStart),b=Math.min(end,structure.sEnd);
   const tunnel=structure.kind==='tunnel',step=tunnel?10:12;
   if(this.rural&&tunnel){
    const bounds=s=>{
     let [left,right]=trackEnvelope(s);
     for(const st of nearby)for(const platform of this.route.stationLayouts[st.name]?.platforms??[]){
      const relative=s-st.s;
      if(relative<platform.edges[0][0]-8||relative>platform.edges.at(-1)[0]+8)continue;
      const [l,r]=this.platformBounds(st,platform,s,tracks);
      left=Math.min(left,l-.5);right=Math.max(right,r+.5);
     }
     return [left-2.3,right+2.3];
    };
    addYaganTunnel(T,this,group,structure,a,b,bounds);
    continue;
   }
   if(this.rural){
    const center=s=>{const [l,r]=trackEnvelope(s);return (l+r)/2;};
    const width=s=>{const [l,r]=trackEnvelope(s);return r-l+4.4;};
    this.ribbon(group,a,b,center,width,-.03,'#8c9190',5);
    for(let s=a+10;s<b;s+=24)this.cube(group,s,center(s),-8,1.3,8,1.5,'#939897');
   }
   for(let s=a;s<b;s+=step){
    const [min,max]=trackEnvelope(s);
    this.cube(group,s,min-2.2,this.deckHeight(s),tunnel?.4:.13,tunnel?5.2:1.1,step,tunnel?'#686d6e':'#879797');
    this.cube(group,s,max+2.2,this.deckHeight(s),tunnel?.4:.13,tunnel?5.2:1.1,step,tunnel?'#686d6e':'#879797');
    if(tunnel)this.cube(group,s,(min+max)/2,this.deckHeight(s)+5.2,max-min+4.8,.5,step,'#5d6265');
   }
  }
  for(const rail of this.route.neighborTracks??[]){
   if(!rail.endBuffer)continue;
   const [s,x]=rail.knots.at(-1);
   if(s>=start&&s<end){this.cube(group,s,x,this.deckHeight(s)+.4,2.2,.35,.22,'#c95749');for(const side of [-.8,.8])this.cube(group,s,x+side,this.deckHeight(s),.15,1,.3,'#545d5c');}
  }
  for(const signal of this.route.signals??[]){
   if(signal.s>=start&&signal.s<end)addTrackSignal(T,this,group,signal);
  }
  this.landmarks?.add(group,start,end,trackEnvelope,random);addTurnouts(this,group,this.turnouts,this.railTracks,start,end);
  for(const c of this.route.structures??[])if(c.kind==='crossing'&&(c.sOrigin??c.sStart)>=start&&(c.sOrigin??c.sStart)<end)this.crossings.add(group,c);this.atmosphere.prepare(group);this.scene.add(group);return group;
 }
 disposeChunk(group){this.crossings.release(group);this.trees.release(group);this.scene.remove(group);const cached=new Set(this.materials.values());group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.sharedDistrictResource)return;if(o.geometry&&o.geometry!==this.box&&o.geometry!==this.platformRailGeometry&&o.geometry!==this.pine&&o.geometry!==this.canopy&&o.geometry!==this.houseRoof)o.geometry.dispose();if(o.material?.map&&!cached.has(o.material)){o.material.map.dispose();o.material.dispose();}else if(o.userData.disposeWithChunk&&!cached.has(o.material))o.material.dispose();});}
 setPlayerTrain(id,count){this.playerTrain?.dispose();this.playerTrain=new PlayerTrain(this,id,count);}
 setCabView(origin){this.viewOrigin=origin;this.currentView=undefined;}
 refreshScenery(){for(const g of this.chunks.values())this.disposeChunk(g);this.chunks.clear();}
 setDrawDistance(value){this.drawDistance=Math.max(500,Math.min(2000,Number(value)||1500));this.camera.far=basinTerrainAreas(this.route).length?40000:this.drawDistance+400;this.camera.near=basinTerrainAreas(this.route).length?.5:.15;this.camera.updateProjectionMatrix();this.scene.fog.far=this.drawDistance;this.scene.fog.near=Math.min(350,this.drawDistance*.3);}
 render(s,v,dt,{acceleration=0,shake=1,panorama=false,outer=false,railfan=false,clock}={}){this.externalView=outer;const clearProjection=panorama||outer||!this.viewOrigin;if(this.currentView!==clearProjection){if(clearProjection)this.camera.clearViewOffset();else this.camera.setViewOffset(1600,900,800-clamp(this.viewOrigin.x,550,1050),450-clamp(this.viewOrigin.y,240,330),1600,900);this.currentView=clearProjection;}const focus=railfan?this.playerTrain?.railfanController.prepare(s)??s:s,needed=filmingChunkIndices(s,focus,this.drawDistance);for(const i of needed)if(!this.chunks.has(i))this.chunks.set(i,this.buildChunk(i));for(const [i,g]of this.chunks)if(!needed.has(i)){this.disposeChunk(g);this.chunks.delete(i);}

  const f=this.driveFrame(s),head=this.drivePoint(s+45),motion=this.suspension.update({s,speed:v,curvature:this.curvature(s),acceleration},dt,shake),eye=Number(this.route.eyeHeight??2.7),offset=(this.route.eyeOffset??0)+motion.lateral;this.camera.position.copy(f.p).addScaledVector(f.right,offset);this.camera.position.y+=eye+motion.vertical;head.addScaledVector(f.right,offset);head.y+=eye+motion.vertical;this.camera.lookAt(head);this.camera.rotateX(motion.pitch);this.camera.rotateY(motion.yaw);this.camera.rotateZ(motion.roll);const tunnel=(this.route.structures??[]).some(t=>t.kind==='tunnel'&&(railfan?focus:s)>=t.sStart&&(railfan?focus:s)<=t.sEnd);this.sky.intensity=this.route.night?.22:tunnel?.6:2.1;this.sun.intensity=this.route.night?.04:tunnel?.3:2.1;if(this.headlight)this.headlight.intensity=this.route.night?750:tunnel?550:0;this.trees.update(s,focus);this.traffic.update(s,dt);this.playerTrain?.update(s,outer);if(outer)this.playerTrain?.camera(s,railfan,v,dt);this.crossings.update(s,v,dt,(this.playerTrain?.count??2)*20);this.ballastDetail.update(s,railfan?this.playerTrain?.railfanController.spot?.s??s:s);this.roadScenery.update(s,v,dt,railfan?this.playerTrain?.railfanController.spot?.s??s:s);this.atmosphere.update(s,dt,{tunnel,clock,moving:Math.abs(v)>.1||this.traffic.trains.length>0});this.landmarks?.update(focus??s,dt);this.characters?.update(focus??s);this.basin?.update(focus??s);this.atmosphere.render();
 }
 dispose(){this.characters?.dispose();this.basin?.dispose();this.landmarks?.dispose();this.roadScenery.dispose();this.ballastDetail.dispose();this.crossings.dispose();this.atmosphere.dispose();this.trees.dispose();this.playerTrain?.dispose();this.traffic.dispose();for(const g of this.chunks.values())this.disposeChunk(g);this.chunks.clear();for(const m of this.materials.values()){m.map?.dispose();m.emissiveMap?.dispose();m.bumpMap?.dispose();m.userData.richNormalMap?.dispose();m.dispose();}this.box.dispose();this.platformRailGeometry?.dispose();this.houseRoof.dispose();this.pine?.dispose();this.canopy?.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
