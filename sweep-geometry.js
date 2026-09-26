import * as T from 'three';
import {validateFace} from './sketch-geometry.js?v=20260925-ui2';
export function makeSweep({profile,path,smooth=true}){
 const error=validateFace(profile);if(error)throw Error('断面：'+error);
 if(!Array.isArray(path)||path.length<2||path.length>100)throw Error('経路は2〜100点で指定してください。');
 if(path.some(p=>!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isFinite(v)||Math.abs(v)>10000)))throw Error('経路の座標は±10000 m以内の数値にしてください。');
 const points=path.map(p=>new T.Vector3(...p));for(let i=1;i<points.length;i++)if(points[i].distanceTo(points[i-1])<.001)throw Error('経路の隣り合う点を離してください。');
 if(points[0].distanceTo(points.at(-1))<.001)throw Error('始点と終点を離した経路を指定してください。');
 let curve;if(points.length===2)curve=new T.LineCurve3(...points);else if(smooth)curve=new T.CatmullRomCurve3(points,false,'centripetal');else{curve=new T.CurvePath();for(let i=1;i<points.length;i++)curve.add(new T.LineCurve3(points[i-1],points[i]));}
 const shape=new T.Shape(profile.map(([x,y])=>new T.Vector2(x,y)));const geometry=new T.ExtrudeGeometry(shape,{steps:Math.min(500,Math.max(32,points.length*24)),bevelEnabled:false,extrudePath:curve});geometry.computeVertexNormals();if([...geometry.attributes.position.array].some(v=>!Number.isFinite(v))){geometry.dispose();throw Error('この経路では作成できません。曲がり方を調整してください。');}return geometry;
}
