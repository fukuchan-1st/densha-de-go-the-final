export function addStoppingMarker(T,world,parent,s,offset,side,height=0){
 const {p,angle}=world.frame(s,offset);
 const group=new T.Group();
 group.position.copy(p);
 group.position.y+=height;
 group.rotation.y=angle;
 function marker(geometry,color,x,y,z,rx=0,rz=0){
  const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({color,side:T.DoubleSide}));
  mesh.userData.disposeWithChunk=true;
  mesh.position.set(x,y,z);
  mesh.rotation.set(rx,0,rz);
  group.add(mesh);
 }
 marker(new T.PlaneGeometry(1.65,.15),'#fff7b2',0,.21,0,-Math.PI/2);
 marker(new T.PlaneGeometry(.8,.8),'#ffffff',0,.205,0,-Math.PI/2,Math.PI/4);
 marker(new T.PlaneGeometry(.61,.61),'#ffcd26',0,.209,0,-Math.PI/2,Math.PI/4);
 const edge=side*1.7;
 marker(new T.BoxGeometry(.055,2.2,.055),'#e7ebdf',edge,1.1,0);
 marker(new T.PlaneGeometry(.49,.49),'#fffde7',edge,2.27,0,0,Math.PI/4);
 marker(new T.PlaneGeometry(.36,.36),'#ffba17',edge,2.27,.012,0,Math.PI/4);
 parent.add(group);
}
