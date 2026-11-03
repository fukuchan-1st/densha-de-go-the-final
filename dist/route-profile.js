// BVE route commands converted to simulation chainage; original route files are read only.
export class RouteProfile {
 constructor(data){this.data=data;this.grades=data.grades;this.limits=data.limits;this.heights=[0];for(let i=0;i<this.grades.length-1;i++){const a=this.grades[i],b=this.grades[i+1],avg=a.interpolationToNext==='linear'?(a.perMille+b.perMille)/2:a.perMille;this.heights.push(this.heights[i]+(b.s-a.s)*avg/1000);}}
 index(list,s){let lo=0,hi=list.length;while(lo<hi){const m=(lo+hi)>>1;if(list[m].s<=s)lo=m+1;else hi=m;}return Math.max(0,lo-1);}
 coverageAt(s){return s<=this.data.lengthM?'bve':'prototype';}
 gradeAt(s){if(this.coverageAt(s)==='prototype')return 0;const i=this.index(this.grades,s),a=this.grades[i],b=this.grades[i+1];if(b&&a.interpolationToNext==='linear')return a.perMille+(b.perMille-a.perMille)*Math.max(0,(s-a.s)/(b.s-a.s));return a.perMille;}
 elevationAt(s){s=Math.min(s,this.data.lengthM);const i=this.index(this.grades,s),a=this.grades[i],b=this.grades[i+1],t=s-a.s;let h=this.heights[i]+t*a.perMille/1000;if(b&&a.interpolationToNext==='linear')h+=.5*(b.perMille-a.perMille)/(b.s-a.s)*t*t/1000;return h;}
 limitAt(s){if(this.coverageAt(s)==='prototype')return 110;return this.limits[this.index(this.limits,s)].kmh;}
 nextLimit(s){const current=this.limitAt(s);return this.limits.find(l=>l.s>s+.5&&l.kmh!==current)??null;}
}
