// The fixtures show source positions. The lamp faces have no simulated aspect.
export function addTrackSignal(T,world,parent,signal){
 const {s,x,y,support}=signal;
 const {p,angle}=world.frame(s,x);
 const group=new T.Group();
 group.position.copy(p);
 group.rotation.y=angle;
 const lamps=signal.lights??(signal.type==='type2'?4:3);
 const relay=signal.kind==='relay';
 const spacing=.23;
 const headHeight=lamps*spacing+.13;
 function box(width,height,depth,dx,dy,dz,color){
  const mesh=new T.Mesh(world.box,world.mat(color));
  mesh.scale.set(width,height,depth);
  mesh.position.set(dx,dy,dz);
  group.add(mesh);
 }
 if(signal.mount==='bridge'){
  for(const offset of [-2.6,2.6])box(.16,y+.12,.16,offset,(y+.12)/2,0,'#777d76');
  box(5.35,.15,.2,0,y+.1,0,'#777d76');
 }else{
  const base=support?.y??signal.baseY??0;
  const baseX=support?support.x-x:0;
  const top=y-headHeight/2;
  box(.16,top-base,.16,baseX,(base+top)/2,0,'#777d76');
  box(.31,.14,.31,baseX,base+.07,0,'#666c67');
  if(Math.abs(baseX)>.05)box(Math.abs(baseX)+.14,.12,.16,baseX/2,top,0,'#777d76');
 }
 box(.39,headHeight,.23,0,y,0,'#222c2b');
 const colors=relay?['#a3aba3','#a3aba3','#a3aba3']:['#723d38','#8f7141','#3a6956','#917b44'];
 const lens=new T.CylinderGeometry(.083,.083,.04,12);
 for(let i=0;i<lamps;i++){
  const mesh=new T.Mesh(lens,world.mat(colors[i]));
  mesh.rotation.x=Math.PI/2;
  mesh.position.set(0,y+((lamps-1)/2-i)*spacing,.132);
  group.add(mesh);
 }
 parent.add(group);
}
