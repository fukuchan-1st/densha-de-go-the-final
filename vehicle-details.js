import * as T from './assets/vendor/three.module.js?v=116';
export function tint6050Bogies(body,owner){
 const key='6050-brown-bogies';if(!owner.materials.has(key))owner.materials.set(key,new T.MeshStandardMaterial({color:'#70533d',metalness:.25,roughness:.85,side:T.DoubleSide}));
 for(const mesh of [...body.children]){if(!mesh.isMesh)continue;const g=mesh.geometry,p=g.getAttribute('position'),fixed=[],bogie=[],end=Math.min(g.index?.count??p.count,g.drawRange.start+g.drawRange.count);
  for(let i=g.drawRange.start;i<end;i+=3){const ids=[0,1,2].map(j=>g.index?g.index.getX(i+j):i+j),isBogie=ids.every(k=>p.getY(k)<=1.02&&Math.abs(p.getZ(k))>=5&&Math.abs(p.getZ(k))<=9.05);(isBogie?bogie:fixed).push(...ids);}
  if(!bogie.length)continue;
  const make=index=>{const result=g.clone();result.setIndex(index);result.setDrawRange(0,index.length);owner.geometries.add(result);return result;};mesh.geometry=make(fixed);const detail=new T.Mesh(make(bogie),owner.materials.get(key));detail.userData.shadowCaster=true;detail.userData.bogie=true;body.add(detail);
 }
}
