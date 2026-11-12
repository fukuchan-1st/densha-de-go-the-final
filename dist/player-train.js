import {OuterCamera} from './outer-camera.js?v=73';
import * as T from './assets/vendor/three.module.js';
import {ImportedTrafficModels} from './opposing-models.js?v=72';
const COLORS={'207':'#3879ba','681':'#215b9c',e127:'#5dad9e','223-1000':'#b5a176'};
export class PlayerTrain{
 constructor(world,id,count=2){this.world=world;this.id=id;this.count=count;this.models=new ImportedTrafficModels();this.group=new T.Group();this.group.visible=false;world.scene.add(this.group);this.cars=[];this.own=[];this.cameraController=new OuterCamera(world,this.group,s=>this.frame(s));this.ready=this.load();}
 async load(){try{await this.models.load(this.id);if(this.disposed)return;for(let i=0;i<this.count;i++){const car=this.models.car(this.id,i,this.count);this.group.add(car);this.cars.push(car);}this.imported=true;}catch(error){if(this.disposed)return;this.imported=false;this.error=error;for(let i=0;i<this.count;i++){const car=this.simpleCar();this.group.add(car);this.cars.push(car);}}}
 simpleCar(){const group=new T.Group();const box=(w,h,d,x,y,z,color)=>{const geometry=new T.BoxGeometry(w,h,d),material=new T.MeshStandardMaterial({color,roughness:.6});this.own.push(geometry,material);const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);};box(2.8,2.9,19.5,0,2,0,'#cbd2d2');box(2.82,.22,19.6,0,1.3,0,COLORS[this.id]??'#61a4ad');box(2.6,.45,17,0,.45,0,'#343c44');for(const x of [-1.41,1.41])for(let z=-8;z<=8;z+=2.5)box(.035,.9,1.7,x,2.6,z,'#183445');box(2.35,1, .04,0,2.7,9.78,'#183445');return group;}
 frame(s){if(this.world.driveFrame)return this.world.driveFrame(s);return this.world.frame(s,this.world.driveOffset?.(s)??0);}
 update(s,visible){this.group.visible=Boolean(visible);if(!visible){this.cameraController.reset();return;}for(let i=0;i<this.cars.length;i++){const f=this.frame(s-10-i*20),car=this.cars[i];car.position.copy(f.p);car.rotation.y=Math.atan2(f.dir.x,f.dir.z);}}
 camera(s){this.cameraController.update(s);}
 dispose(){this.disposed=true;this.world.scene.remove(this.group);this.models.dispose();for(const resource of this.own)resource.dispose();}
}
