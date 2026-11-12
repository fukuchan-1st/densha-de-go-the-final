import {terrainShade} from './terrain-materials.js?v=76';
import {treeVariant} from './real-trees.js?v=76';
import {interpolateKnots} from './track-layout.js?v=23';

const hillsides=[-148,-96,-61,-36,-20,-10,10,20,36,61,96,148];

function hillsideHeight(s,x){
 const distance=Math.abs(x),side=Math.sign(x);
 const valley=.63+.25*Math.sin(s/640+side)+.12*Math.sin(s/161+side*2);
 const rise=Math.max(0,distance-10);
 return rise*valley*.8+Math.min(7,rise*.18)*Math.sin(s/95+x/23)-.25;
}

export function addYaganHillsides(T,world,group,start,end,envelope,bridges,random){
 const vertices=[],indices=[],uv=[],colors=[];
 const deckDrop=s=>bridges.some(bridge=>s>=bridge.sStart&&s<=bridge.sEnd)?-8:0;
 const railEdge=(x,limits)=>x<0?limits[0]:limits[1];
 for(let s=start,row=0;;s=Math.min(s+10,end),row++){
  const limits=envelope(s);
  for(const x of hillsides){
   const {p}=world.frame(s,x+railEdge(x,limits));
   vertices.push(p.x,p.y+hillsideHeight(s,x)+deckDrop(s),p.z);uv.push(p.x/7,p.z/7);const shade=terrainShade(p.x,p.z);colors.push(shade,shade,shade);
  }
  const width=hillsides.length;
  if(row)for(let col=0;col<width-1;col++){
   const a=(row-1)*width+col,b=a+width;
   indices.push(a,b,a+1,a+1,b,b+1);
  }
  if(s===end)break;
 }
 const ground=new T.BufferGeometry();
 ground.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 ground.setAttribute('uv',new T.Float32BufferAttribute(uv,2));ground.setAttribute('color',new T.Float32BufferAttribute(colors,3));ground.setIndex(indices);
 ground.computeVertexNormals();
 const material=world.mat('#667d52');
 material.side=T.DoubleSide;
 const hillside=new T.Mesh(ground,material);hillside.userData.shadowCaster=true;group.add(hillside);

 const tunnelRanges=world.route.structures.filter(structure=>structure.kind==='tunnel');
 const trees=[],pines=[],leaves=[],shade=[];
 const addTree=(position,kind)=>{
  const h=5.5+random()*7.5,w=h*(.39+random()*.22);
  trees.push({...position,h,variant:treeVariant(random()),rotation:random()*Math.PI*2,shade:.85+random()*.15});
 };
 for(const placement of world.route.vegetation??[]){
  if(placement.sEnd<start||placement.sStart>=end)continue;
  const {sStart,interval,knots,model}=placement;
  const first=sStart+Math.max(0,Math.ceil((start-sStart)/interval))*interval;
  for(let s=first;s<end&&s<=placement.sEnd;s+=interval){
   const x=interpolateKnots(knots,s);
   const [left,right]=envelope(s);
   if(x>left-5&&x<right+5)continue;
   const height=interpolateKnots(knots,s,2);
   const groundLevel=hillsideHeight(s,x-railEdge(x,[left,right]))+deckDrop(s);
   addTree({s,x,y:Math.max(groundLevel,height)},model.startsWith('TreesC')?pines:leaves);
  }
 }
 const deepForest=world.route.id==='yagan';
 const interval=world.quality==='light'?(deepForest?9:12):(deepForest?6:8);
 for(let s=Math.ceil(start/interval)*interval;s<end;s+=interval){
  if(tunnelRanges.some(tunnel=>s>=tunnel.sStart-8&&s<=tunnel.sEnd+8))continue;
  const limits=envelope(s),station=world.stationNear(s);
  for(const side of [-1,1]){
   for(const distance of (deepForest?[station.d<180?32:16,27,39,52,66,81,97,113,129,140]:[station.d<180?32:16,29,45,65,88,116])){
    const x=side*(distance+random()*7);
    const ss=s+(random()-.5)*6;
    const position={s:ss,x:x+railEdge(x,limits),y:hillsideHeight(ss,x)+deckDrop(ss)};
    const crown=random()<.57?pines:random()<.55?leaves:shade;
    addTree(position,crown);
   }
  }
 }
 world.trees.add(group,trees);
}

export function addYaganTunnel(T,world,group,tunnel,start,end,bounds){
 const vertices=[],indices=[],segments=12,width=segments+3;
 const section=s=>{
  const [left,right]=bounds(s),center=(left+right)/2,radius=(right-left)/2;
  const crown=2.6+Math.min(2,radius*.32);
  const arch=Array.from({length:segments+1},(_,i)=>{
   const angle=Math.PI*(1-i/segments);
   return [center+radius*Math.cos(angle),3.2+crown*Math.sin(angle)];
  });
  return [[left,-.25],...arch,[right,-.25]];
 };
 for(let s=start,row=0;;s=Math.min(s+5,end),row++){
  for(const [x,y] of section(s)){
   const {p}=world.frame(s,x);
   vertices.push(p.x,p.y+y,p.z);
  }
  if(row)for(let col=0;col<width-1;col++){
   const a=(row-1)*width+col,b=a+width;
   indices.push(a,b,a+1,a+1,b,b+1);
  }
  if(s===end)break;
 }
 const shell=new T.BufferGeometry();
 shell.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 shell.setIndex(indices);
 shell.computeVertexNormals();
 const material=world.mat('#626361');
 material.side=T.DoubleSide;
 group.add(new T.Mesh(shell,material));

 for(const s of [tunnel.sStart,tunnel.sEnd]){
  if(s<start||s>end)continue;
  const outline=section(s),[left,right]=bounds(s),center=(left+right)/2;
  const p=world.frame(s,center);
  const rimVertices=[],rimIndices=[];
  for(const [i,[x,y]] of outline.entries()){
   rimVertices.push(x-center,y,0,(x-center)*1.14,y<0?y:y+.7,0);
   if(i){const a=(i-1)*2;rimIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const rim=new T.BufferGeometry();
  rim.setAttribute('position',new T.Float32BufferAttribute(rimVertices,3));
  rim.setIndex(rimIndices);
  rim.computeVertexNormals();
  const rimMaterial=world.mat('#b5b2a4');
  rimMaterial.side=T.DoubleSide;
  const mesh=new T.Mesh(rim,rimMaterial);
  mesh.position.copy(p.p);
  mesh.rotation.y=p.angle;
  group.add(mesh);
 }
}
