export function decodeVertices(buffer,componentType){
 if(componentType!=='float16')return new Float32Array(buffer);
 const source=new Uint16Array(buffer),result=new Float32Array(source.length);
 for(let i=0;i<source.length;i++){const h=source[i],sign=h&32768?-1:1,e=(h>>10)&31,m=h&1023;result[i]=e===0?sign*m*2**-24:e===31?sign*(m?NaN:Infinity):sign*(1+m/1024)*2**(e-15);}
 return result;
}
