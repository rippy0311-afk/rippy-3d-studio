import * as T from 'three';
export function offsetGeometry(o,offset){
 if(o.isMesh){const geometry=o.geometry.clone();geometry.translate(-offset.x,-offset.y,-offset.z);if(o.userData.pivotOwned)o.geometry.dispose();o.geometry=geometry;o.userData.pivotOwned=true;}
 else for(const child of o.children)child.position.sub(offset);
}
export function centerPivot(o){
 o.updateWorldMatrix(true,true);const inverse=o.matrixWorld.clone().invert(),bounds=new T.Box3();
 o.traverse(mesh=>{if(!mesh.isMesh)return;mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox,mat=inverse.clone().multiply(mesh.matrixWorld);for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])bounds.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(mat));});
 if(bounds.isEmpty())return;const center=bounds.getCenter(new T.Vector3());if(center.length()<1e-7)return;
 offsetGeometry(o,center);o.position.add(center.clone().multiply(o.scale).applyQuaternion(o.quaternion));
 if(!o.userData.isJoined){const previous=new T.Vector3().fromArray(o.userData.pivotOffset??[0,0,0]);o.userData.pivotOffset=previous.add(center).toArray();}
 o.updateWorldMatrix(true,true);
}
