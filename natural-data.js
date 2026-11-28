// Terrain and mapped natural features follow the same transforms as the rails.
export function mapNatural(data,transform,sMap=x=>x,{reverse=false}={}){
 if(!data)return undefined;
 const xyz=p=>{const q=transform([p[0],p[1],p[2]??0]);return [...q,...p.slice(3)];};
 const rows=data.terrain?.rows.map(([s,rail,bed,points])=>[sMap(s),transform([0,0,rail])[2],transform([0,0,bed])[2],(reverse?[...points].reverse():points).map(xyz)]).sort((a,b)=>a[0]-b[0]);
 const features=key=>(data[key]??[]).map(f=>({...f,sStart:Math.min(sMap(f.sStart),sMap(f.sEnd)),sEnd:Math.max(sMap(f.sStart),sMap(f.sEnd)),points:f.points?.map(p=>Array.isArray(p[0])?p.map(xyz):xyz(p))}));
 return {...data,terrain:data.terrain?{...data.terrain,rows,offsets:reverse?data.terrain.offsets.map(x=>-x).reverse():data.terrain.offsets}:undefined,waterLines:features('waterLines'),waterAreas:features('waterAreas'),landAreas:features('landAreas')};
}
export function sliceNatural(data,a,b){
 if(!data)return undefined;const mapped=mapNatural(data,p=>p,s=>s-a),within=f=>f.sEnd>=-300&&f.sStart<=b-a+300;
 return {...mapped,terrain:mapped.terrain?{...mapped.terrain,rows:mapped.terrain.rows.filter(r=>r[0]>=-400&&r[0]<=b-a+400)}:undefined,waterLines:mapped.waterLines.filter(within),waterAreas:mapped.waterAreas.filter(within),landAreas:mapped.landAreas.filter(within)};
}
export function joinNatural(target,data,transform,offset){
 if(!data)return target;const mapped=mapNatural(data,transform,s=>s+offset);if(!target)return mapped;
 return {...target,terrain:target.terrain&&mapped.terrain?{...target.terrain,rows:[...target.terrain.rows,...mapped.terrain.rows].sort((a,b)=>a[0]-b[0])}:target.terrain??mapped.terrain,waterLines:[...target.waterLines,...mapped.waterLines],waterAreas:[...target.waterAreas,...mapped.waterAreas],landAreas:[...target.landAreas,...mapped.landAreas]};
}
function bracket(rows,value,component=0){let lo=0,hi=rows.length-1;if(value<=rows[0][component])return [rows[0],rows[0],0];if(value>=rows[hi][component])return [rows[hi],rows[hi],0];while(hi-lo>1){const m=(lo+hi)>>1;if(rows[m][component]<=value)lo=m;else hi=m;}return [rows[lo],rows[hi],(value-rows[lo][component])/Math.max(.001,rows[hi][component]-rows[lo][component])];}
export function naturalHeight(route,s,offset=0){
 const terrain=route.naturalFeatures?.terrain;if(!terrain?.rows.length)return null;const [a,b,t]=bracket(terrain.rows,s),columns=terrain.offsets.map((x,i)=>[x,i]);const [l,r,f]=bracket(columns,offset);
 const at=row=>{const p=row[3][l[1]],q=row[3][r[1]],h=v=>Number.isFinite(v[2])&&v[3]!==0?v[2]:row[1]-.2;return h(p)+(h(q)-h(p))*f;};return at(a)+(at(b)-at(a))*t;
}
export function terrainRowAt(data,s){const rows=data.terrain.rows,[a,b,t]=bracket(rows,s);return [s,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3].map((p,i)=>p.map((v,k)=>k===3?Math.min(v,b[3][i][k]):v+(b[3][i][k]-v)*t))];}
export function pointInArea(x,z,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return {distance:Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz),height:(a[2]??0)+((b[2]??0)-(a[2]??0))*t};}
