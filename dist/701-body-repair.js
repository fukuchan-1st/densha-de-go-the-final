import * as T from './assets/vendor/three.module.js?v=111';
export function repair701Body(group,front,under,resources){
 const material=(options)=>{const m=new T.MeshStandardMaterial({roughness:.78,metalness:.1,...options});resources.materials.set('701-repair-'+resources.materials.size,m);return m;};
 const add=(geometry,mat,x,y,z)=>{resources.geometries.add(geometry);const mesh=new T.Mesh(geometry,mat);mesh.userData.shadowCaster=true;mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 // The supplied body has a blank +Z end. This is the driving front specified by the user.
 add(new T.PlaneGeometry(2.77,3.18),material({map:front,side:T.DoubleSide}),0,2.36,10.045);
 add(new T.BoxGeometry(2.5,.52,18.6),material({color:'#3f4447'}),0,.64,0);
 const underMat=material({map:under,side:T.DoubleSide,transparent:true,alphaTest:.15});
 for(const x of [-1.36,1.36]){const side=add(new T.PlaneGeometry(19,.68),underMat,x,.67,0);side.rotation.y=x>0?Math.PI/2:-Math.PI/2;}
 const wheelMat=material({color:'#242a2d'});for(const z of [-6.6,6.6])for(const x of [-1.01,1.01])for(const axle of [-.9,.9]){const wheel=add(new T.CylinderGeometry(.36,.36,.15,12),wheelMat,x,.36,z+axle);wheel.rotation.z=Math.PI/2;}
}
