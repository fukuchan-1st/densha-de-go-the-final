// Non-uniform Hermite interpolation passes through the mapped points and keeps
// one tangent on both sides of each point, including closely spaced BVE knots.
export function sampleRouteCurve(points,s){
 let lo=0,hi=points.length-1;
 if(s<=points[0][0])hi=1;
 else if(s>=points[hi][0])lo=hi-1;
 else while(hi-lo>1){const m=(lo+hi)>>1;if(points[m][0]<=s)lo=m;else hi=m;}
 const a=points[lo],b=points[hi],span=b[0]-a[0],t=(s-a[0])/span;
 if(t<0||t>1)return [1,2,3].map(k=>(a[k]??0)+((b[k]??0)-(a[k]??0))*t);
 const before=points[Math.max(0,lo-1)],after=points[Math.min(points.length-1,hi+1)];
 const h0=2*t**3-3*t*t+1,h1=t**3-2*t*t+t,h2=-2*t**3+3*t*t,h3=t**3-t*t;
 return [1,2,3].map(k=>h0*(a[k]??0)+h1*span*((b[k]??0)-(before[k]??0))/(b[0]-before[0])+h2*(b[k]??0)+h3*span*((after[k]??0)-(a[k]??0))/(after[0]-a[0]));
}
