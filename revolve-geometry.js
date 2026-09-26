import * as T from 'three';import {validateFace} from './sketch-geometry.js?v=20260926-studio1';
export function makeRevolve({profile,angle=360}){
 const error=validateFace(profile);if(error)throw Error(error);if(!Number.isFinite(angle)||angle<=0||angle>360)throw Error('回転角度は0より大きく360°以下にしてください。');if(profile.some(([r,y])=>r<0||Math.abs(r)>10000||Math.abs(y)>10000))throw Error('断面は軸の右側（半径0以上）に描いてください。');
 const points=profile.map(p=>[...p]);const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0);if(area<0)points.reverse();
 const segments=Math.max(2,Math.ceil(angle/360*96)),radians=angle*Math.PI/180,vertices=[];const at=(i,t)=>{const [r,y]=points[i];return new T.Vector3(r*Math.cos(t),y,r*Math.sin(t));};
 function tri(a,b,c){if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()<1e-18)return;vertices.push(...a.toArray(),...b.toArray(),...c.toArray());}
 for(let k=0;k<segments;k++){const t=k/segments*radians,u=(k+1)/segments*radians;for(let i=0;i<points.length;i++){const j=(i+1)%points.length,a=at(i,t),b=at(j,t),c=at(i,u),d=at(j,u);tri(a,b,c);tri(b,d,c);}}
 if(angle<360){const triangles=T.ShapeUtils.triangulateShape(points.map(p=>new T.Vector2(...p)),[]);for(const [a,b,c]of triangles){tri(at(c,0),at(b,0),at(a,0));tri(at(a,radians),at(b,radians),at(c,radians));}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
