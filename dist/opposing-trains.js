import {panoramaAtFront} from './train-formation.js?v=107';
import {setRailPose} from './rail-pose.js?v=107';
import {ImportedTrafficModels,opposingVehicle,opposingVehicles,opposingCarCount} from './opposing-models.js?v=107';
import * as T from './assets/vendor/three.module.js?v=107';
import {interpolateKnots} from './track-layout.js?v=107';
import {smoothTrafficStep,crossoverHold} from './opposing-motion.js?v=107';

export function trafficInterval(type){return type==='city'?60:300;}
export function adjacentTracks(world,s){
 const tokyo=world.route?.tokyoLayout?.north&&(world.route.sceneryStations??world.route.stations??[]).find(st=>st.name==='東京');
 if((s<0&&!(tokyo&&s>=tokyo.s-245))||s>world.length)return [];
 const own=world.driveOffset?.(s)??0;
 if(world.trackLayout)return world.trackLayout.activeAt(s).filter(t=>t.track.direction==='opposing'&&t.x>own+2.8).map(t=>({x:t.x,y:t.y}));
 const rails=world.route.neighborTracks;
 if(!rails){const x=world.oppositeOffset(s);return x>own+2.8?[{x,y:0}]:[];}
 return rails.filter(t=>(!t.direction||t.direction==='opposing')&&!t.terminating&&s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]).map(t=>({x:interpolateKnots(t.knots,s),y:t.heightKnots?.length?interpolateKnots(t.heightKnots,s):t.height??0,...(t.tokyoTrafficPath?{crossing:true}:{})})).filter(t=>t.crossing||t.x>own+2.8);
}
export class TrafficClock {
 constructor({initialDelay=true}={}){this.elapsed=0;this.first=initialDelay;this.retry=0;}
 update(dt,type,spawn){if(!(dt>0))return;const step=Math.min(dt,.25);this.elapsed+=step;this.retry-=step;const interval=this.first?(type==='city'?15:30):trafficInterval(type);if(this.elapsed>=interval&&this.retry<=0){this.retry=2;if(spawn()){this.elapsed=0;this.first=false;}}}
}

// Lightweight original models follow the same mapped rail positions as the scenery.
export class OpposingTrains {
 constructor(world,{models}={}){this.world=world;this.clock=new TrafficClock();this.trains=[];this.serial=0;this.geometry=new T.BoxGeometry(1,1,1);this.materials=new Map();this.models=models??new ImportedTrafficModels();const stations=world.route?.sceneryStations??world.route?.stations??[],ids=new Set([0,world.length,...stations.map(x=>x.s+1)].flatMap(s=>opposingVehicles(world.route,s)));for(const id of ids)if(id)this.models.load(id).catch(error=>console.warn('対向列車:',error.message));}
 mat(color){if(!this.materials.has(color))this.materials.set(color,new T.MeshStandardMaterial({color,roughness:.65}));return this.materials.get(color);}
 type(s){return this.world.sceneryTypeAt?.(s)??'mountain';}
 spawn(player){
  const vehicle=opposingVehicle(this.world.route,Math.min(this.world.length,player+360),this.serial++);if(!vehicle||this.trains.length>=2)return false;const imported=this.models.models.get(vehicle);if(!imported)return false;
  const urban=this.type(player)==='city',id=this.world.route?.id??'tohoku',count=opposingCarCount(this.world.route,player,vehicle,imported.carCount);
  const choices=[];
  for(const distance of [360,520,700,900,1100,180,80,20]){
   const s=player+distance,hold=crossoverHold(this.world,player);if(s+count*20.1>this.world.length||hold!==null&&s<hold+(urban?17:22)**2/1.3+25)continue;
   for(const track of adjacentTracks(this.world,s)){
    const positions=[track];let previous=track;
    for(let i=1;i<count;i++){
     const near=adjacentTracks(this.world,s+i*20.1).sort((a,b)=>Math.abs(a.x-previous.x)-Math.abs(b.x-previous.x))[0];
     if(!near||Math.abs(near.x-previous.x)>2.5||Math.abs(near.y-previous.y)>1)break;
     positions.push(near);previous=near;
    }
    if(positions.length===count)choices.push({s,track,positions});
   }
   if(choices.length)break;
  }
  if(!choices.length)return false;
  const {s,track,positions}=choices[(this.serial-1)%choices.length];
  const group=new T.Group(),cars=[];
  for(let i=0;i<count;i++){const car=this.models.car(vehicle,i,count,{panoramaAtFront:!panoramaAtFront(this.world.route)});group.add(car);cars.push(car);}
  let speed=urban?17:22;for(const st of this.world.route?.sceneryStations??this.world.route?.stations??this.world.stations??[]){const d=s-(st.s-count*20+15);if(d>0)speed=Math.min(speed,Math.sqrt(.64*d));}
  this.world.atmosphere?.prepare(group);this.world.scene.add(group);this.trains.push({s,x:track.x,y:track.y,speed,cruise:urban?17:22,vehicle,group,cars,positions,blocked:0,doneStops:new Set(),probeTime:0});return true;
 }
 update(player,dt){
  this.clock.update(dt,this.type(player),()=>this.spawn(player));
  for(const train of [...this.trains]){
   train.doneStops??=new Set();train.cruise??=train.speed;train.probeTime=(train.probeTime??0)-Math.max(0,dt);
   let stopAt=crossoverHold(this.world,player),stationStop=null;
   if(stopAt!==null&&train.s<stopAt-1)stopAt=null;
   if(!['e353','383','681'].includes(train.vehicle))for(const station of this.world.route?.sceneryStations??this.world.route?.stations??this.world.stations??[]){
    const target=station.s-train.cars.length*20+15,key=station.name+':'+station.s;
    if(target<=train.s+.05&&target>=train.s-850&&!train.doneStops.has(key)&&(!stationStop||target>stationStop.target))stationStop={target,key,terminal:station.s<=.01};
   }
   if(stationStop&&(stopAt===null||stationStop.target>stopAt))stopAt=stationStop.target;
   if(train.probeTime<=0){
    train.probeTime=.35;train.boundary=null;let before=train.positions;
    const horizon=Math.min(650,train.speed*train.speed/1.3+45);
    for(let d=8;d<=horizon;d+=8){const found=[];for(let i=0;i<train.cars.length;i++){const near=adjacentTracks(this.world,train.s-d+i*20.1).sort((a,b)=>Math.abs(a.x-before[i].x)-Math.abs(b.x-before[i].x))[0];if(!near||Math.abs(near.x-before[i].x)>2.5||Math.abs(near.y-before[i].y)>1)break;found.push(near);}if(found.length!==train.cars.length){train.boundary=train.s-d+16;break;}before=found;}
   }
   if(train.boundary!==null&&train.boundary!==undefined&&(stopAt===null||train.boundary>stopAt))stopAt=Math.min(train.s,train.boundary);
   const motion=smoothTrafficStep(train.s,train.speed,train.cruise,dt,stopAt),proposed=motion.s,positions=[];
   for(let i=0;i<train.cars.length;i++){
    const previous=train.positions[i],near=adjacentTracks(this.world,proposed+i*20.1).sort((a,b)=>Math.abs(a.x-previous.x)-Math.abs(b.x-previous.x))[0];
    if(!near||Math.abs(near.x-previous.x)>2.5||Math.abs(near.y-previous.y)>1)break;
    positions.push(near);
   }
   if(positions.length===train.cars.length){train.s=proposed;train.speed=motion.speed;train.positions=positions;train.blocked=0;}else {train.speed=Math.max(0,train.speed-.65*Math.max(0,dt));train.blocked+=Math.max(0,dt);}
   if(stationStop&&Math.abs(train.s-stationStop.target)<.06&&train.speed<.03){train.dwell=(train.dwell??0)+Math.max(0,dt);if(train.dwell>=10&&!stationStop.terminal){train.doneStops.add(stationStop.key);train.dwell=0;}}
   const valid=train.s+train.cars.length*20>player-350&&train.blocked<120;
   for(let i=0;valid&&i<train.cars.length;i++){
    const s=train.s+i*20.1,near=train.positions[i],f=this.world.frame(s,near.x),aheadTracks=adjacentTracks(this.world,s+3),next=aheadTracks.sort((a,b)=>Math.abs(a.x-near.x)-Math.abs(b.x-near.x))[0];
    const car=train.cars[i],railPoint=at=>{const track=adjacentTracks(this.world,at).sort((a,b)=>Math.abs(a.x-near.x)-Math.abs(b.x-near.x))[0]??near,p=this.world.frame(at,track.x).p;p.y+=track.y+(this.world.frameIncludesDeck?0:this.world.deckHeight?.(at)??0);return p;};setRailPose(car,railPoint(s-7.1),railPoint(s+7.1));
   }

   if(!valid){this.world.scene.remove(train.group);this.trains.splice(this.trains.indexOf(train),1);}
  }
 }
 dispose(){for(const t of this.trains)this.world.scene.remove(t.group);this.trains=[];this.models.dispose();this.geometry.dispose();for(const m of this.materials.values())m.dispose();}
}
