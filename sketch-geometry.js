import * as T from 'three';
export function validateFace(points){
 if(!Array.isArray(points)||points.length<3)return '3点以上を指定してください。';
 if(points.length>200)return '点の数は200個以内にしてください。';
 if(points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))))return '座標には有限の数値を入力してください。';
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-8&&p[0]>=Math.min(a[0],b[0])-1e-8&&p[0]<=Math.max(a[0],b[0])+1e-8&&p[1]>=Math.min(a[1],b[1])-1e-8&&p[1]<=Math.max(a[1],b[1])+1e-8;
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6)return '同じ位置に連続した点があります。';for(let j=i+1;j<points.length;j++){if(j===i+1||(i===0&&j===points.length-1))continue;const c=points[j],d=points[(j+1)%points.length];if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return '線が交差・重複しています。点を戻して描き直してください。';}}
 const area=points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2;
 if(Math.abs(area)<1e-6)return '面積のある面を描いてください。';return null;
}
export function makeExtrusion(points,distance){
 const error=validateFace(points);if(error)throw Error(error);if(!Number.isFinite(distance)||Math.abs(distance)<.001||Math.abs(distance)>1000)throw Error('押し出す距離は±0.001〜1000 mにしてください。');
 const shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z)));
 const geometry=new T.ExtrudeGeometry(shape,{depth:Math.abs(distance),bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);if(distance<0)geometry.translate(0,distance,0);geometry.computeVertexNormals();return geometry;
}
