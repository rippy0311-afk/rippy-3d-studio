import * as T from 'three';
const cache=new WeakMap();
// Store world-oriented vertices relative to the root position, so worker translations
// and clones can reuse their surface without introducing stale collider offsets.
export function colliderState(o){
 o.updateWorldMatrix(true,true);
 const meshes=[];o.traverseVisible(m=>{if(m.isMesh)meshes.push(m);});
 const key=meshes.map(m=>[m.uuid,m.geometry.uuid,m.geometry.attributes.position?.version,m.geometry.index?.version,...m.matrixWorld.elements].join(',')).join(';')+'|'+o.position.toArray().join(',');
 const cached=cache.get(o);if(cached?.key===key)return {...cached.state,visible:o.visible};
 const box=new T.Box3().setFromObject(o,true),triangles=[],v=new T.Vector3();
 o.traverseVisible(m=>{if(!m.isMesh)return;const g=m.geometry,p=g.attributes.position,index=g.index;if(!p)return;
 const count=index?index.count:p.count;for(let i=0;i+2<count;i+=3){const t=[];for(let j=0;j<3;j++){v.fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(m.matrixWorld).sub(o.position);t.push(v.toArray());}if(m.matrixWorld.determinant()<0)t.reverse();triangles.push(t);}});
 const state={rotation:[o.rotation.x,o.rotation.y,o.rotation.z],position:o.position.toArray(),visible:o.visible,min:box.min.toArray(),max:box.max.toArray(),triangles};cache.set(o,{key,state});return {...state};
}
