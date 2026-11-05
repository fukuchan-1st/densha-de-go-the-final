import * as T from './assets/vendor/three.module.js';
import {interpolateKnots} from './track-layout.js';

export function trafficInterval(type){return type==='city'?60:300;}
export function adjacentTracks(world,s){
 if(s<0||s>world.length)return [];
 const own=world.driveOffset?.(s)??0;
 if(world.trackLayout)return world.trackLayout.activeAt(s).filter(t=>Math.abs(t.x-own)>2.8).map(t=>({x:t.x,y:t.y}));
 const rails=world.route.neighborTracks;
 if(!rails)return [{x:world.oppositeOffset(s),y:0}];
 return rails.filter(t=>!t.terminating&&s>=t.knots[0][0]&&s<=t.knots.at(-1)[0]).map(t=>({x:interpolateKnots(t.knots,s),y:t.heightKnots?.length?interpolateKnots(t.heightKnots,s):t.height??0})).filter(t=>Math.abs(t.x-own)>2.8);
}
export class TrafficClock {
 constructor({initialDelay=true}={}){this.elapsed=0;this.first=initialDelay;this.retry=0;}
 update(dt,type,spawn){if(!(dt>0))return;const step=Math.min(dt,.25);this.elapsed+=step;this.retry-=step;const interval=this.first?(type==='city'?15:30):trafficInterval(type);if(this.elapsed>=interval&&this.retry<=0){this.retry=2;if(spawn()){this.elapsed=0;this.first=false;}}}
}

// Lightweight original models follow the same mapped rail positions as the scenery.
export class OpposingTrains {
 constructor(world){this.world=world;this.clock=new TrafficClock();this.trains=[];this.serial=0;this.geometry=new T.BoxGeometry(1,1,1);this.materials=new Map();}
 mat(color){if(!this.materials.has(color))this.materials.set(color,new T.MeshStandardMaterial({color,roughness:.65}));return this.materials.get(color);}
 type(s){return this.world.sceneryTypeAt?.(s)??'mountain';}
 spawn(player){
  if(this.trains.length>=2)return false;
  const urban=this.type(player)==='city',id=this.world.route?.id??'tohoku',count=urban?10:['oito','yagan','tohoku'].includes(id)?2:4;
  const choices=[];
  for(const distance of [360,520,700,900,1100,180,80,20]){
   const s=player+distance;if(s+count*20.1>this.world.length)continue;
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
  const {s,track,positions}=choices[this.serial++%choices.length];
  const stripe=id==='yamanote'?'#83ba33':id==='osaka'?'#e78027':id.includes('chuo')?'#e66f25':id==='yagan'?'#b74a40':'#419e86';
  const group=new T.Group(),cars=[];
  const part=(car,color,x,y,z,w,h,d)=>{const m=new T.Mesh(this.geometry,this.mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);car.add(m);};
  for(let i=0;i<count;i++){
   const car=new T.Group();part(car,'#bbc3c5',0,2,0,2.75,2.65,19);part(car,'#293940',0,2.65,0,2.79,.9,17.8);part(car,stripe,0,1.8,0,2.8,.28,19.05);part(car,'#535a5c',0,.65,0,2.4,.6,16);part(car,'#d2d5d1',0,3.4,0,2.7,.2,18.8);
   for(const z of [-6.4,6.4])part(car,'#292e30',0,.36,z,2.5,.55,2.1);
   if(i===0){part(car,'#24363f',0,2.7,9.55,2.3,.95,.08);for(const x of [-.9,.9])part(car,'#fff3ba',x,1.35,9.6,.3,.2,.08);}
   group.add(car);cars.push(car);
  }
  this.world.scene.add(group);this.trains.push({s,x:track.x,y:track.y,speed:urban?17:22,group,cars,positions,blocked:0});return true;
 }
 update(player,dt){
  this.clock.update(dt,this.type(player),()=>this.spawn(player));
  for(const train of [...this.trains]){
   const proposed=train.s-Math.max(0,dt)*train.speed,positions=[];
   for(let i=0;i<train.cars.length;i++){
    const previous=train.positions[i],near=adjacentTracks(this.world,proposed+i*20.1).sort((a,b)=>Math.abs(a.x-previous.x)-Math.abs(b.x-previous.x))[0];
    if(!near||Math.abs(near.x-previous.x)>2.5||Math.abs(near.y-previous.y)>1)break;
    positions.push(near);
   }
   if(positions.length===train.cars.length){train.s=proposed;train.positions=positions;train.blocked=0;}else train.blocked+=Math.max(0,dt);
   const valid=train.s+train.cars.length*20>player-350&&train.blocked<40;
   for(let i=0;valid&&i<train.cars.length;i++){
    const s=train.s+i*20.1,near=train.positions[i],f=this.world.frame(s,near.x),aheadTracks=adjacentTracks(this.world,s+3),next=aheadTracks.sort((a,b)=>Math.abs(a.x-near.x)-Math.abs(b.x-near.x))[0];
    const car=train.cars[i];car.position.copy(f.p);car.position.y+=near.y+(this.world.deckHeight?.(s)??0);
    const ahead=this.world.frame(s+3,next?.x??near.x).p;car.rotation.y=Math.atan2(-(ahead.x-f.p.x),-(ahead.z-f.p.z));
   }

   if(!valid){this.world.scene.remove(train.group);this.trains.splice(this.trains.indexOf(train),1);}
  }
 }
 dispose(){for(const t of this.trains)this.world.scene.remove(t.group);this.trains=[];this.geometry.dispose();for(const m of this.materials.values())m.dispose();}
}
