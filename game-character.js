import * as T from 'three';
import {collisionDelta} from './game-collision.js?v=20260926-studio1';
export function createCharacterMotion(objects){
 const states=new Map(),ray=new T.Raycaster(),normalMatrix=new T.Matrix3();
 function world(){return objects.map(o=>{o.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(o);return {visible:o.visible,min:box.min.toArray(),max:box.max.toArray()};});}
 function support(object,x,z,foot,up,down,config){
  ray.set(new T.Vector3(x,foot+up+.002,z),new T.Vector3(0,-1,0));ray.far=up+down+.004;
  const targets=objects.filter(o=>o!==object&&o.visible);targets.forEach(o=>o.updateWorldMatrix(true,true));
  const hits=[];for(const hit of ray.intersectObjects(targets,true)){if(!hit.face)continue;const n=hit.face.normal.clone().applyMatrix3(normalMatrix.getNormalMatrix(hit.object.matrixWorld)).normalize();if(n.y<Math.cos(Math.min(85,config.maxSlope)*Math.PI/180))continue;let root=hit.object;while(root.parent&&!objects.includes(root))root=root.parent;hits.push({y:hit.point.y,root});}return hits.length?{...hits[0],roots:new Set(hits.map(h=>h.root))}:null;
 }
 return {reset(){states.clear();},step(object,delta,dt,config,jump){
  const index=objects.indexOf(object);if(index<0)return;
  if(!config.gravityOn){object.position.add(new T.Vector3(...(config.collision?collisionDelta(world(),index,delta.toArray()):delta.toArray())));return;}
  let state=states.get(object);if(!state){state={velocity:0,grounded:false};states.set(object,state);}
  const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
  for(let i=0;i<steps;i++){
   let boxes=world(),foot=boxes[index].min[1];
   const below=config.collision?support(object,object.position.x,object.position.z,foot,.01,.04,config):null;
   state.grounded=!!below&&Math.abs(foot-below.y)<.045&&state.velocity<=0;
   if(i===0&&jump&&config.jumpOn&&state.grounded){state.velocity=config.jumpSpeed;state.grounded=false;}
   const dx=delta.x/steps,dz=delta.z/steps;
   const leadX=dx?Math.sign(dx)*((boxes[index].max[0]-boxes[index].min[0])/2+.03):0,leadZ=dz?Math.sign(dz)*((boxes[index].max[2]-boxes[index].min[2])/2+.03):0;
   const ahead=config.collision&&state.grounded?support(object,object.position.x+dx+leadX,object.position.z+dz+leadZ,foot,config.stepHeight,config.stepHeight+.08,config):null;
   if(ahead&&ahead.y>foot){const rise=ahead.y-foot;const test=boxes.map((b,k)=>ahead.roots.has(objects[k])?{...b,visible:false}:b);const allowed=collisionDelta(test,index,[0,rise,0])[1];if(allowed>=rise-1e-6)object.position.y+=rise;else ahead.root=null;}
   boxes=world();if(ahead?.root)for(const root of ahead.roots)boxes[objects.indexOf(root)].visible=false;
   const move=config.collision?collisionDelta(boxes,index,[dx,0,dz]):[dx,0,dz];object.position.add(new T.Vector3(...move));
   boxes=world();foot=boxes[index].min[1];state.velocity-=config.gravityStrength*h;const dy=state.velocity*h;
   const floor=config.collision&&dy<=0?support(object,object.position.x,object.position.z,foot,.01,Math.max(-dy,.05)+(state.grounded?config.stepHeight:0),config):null;
   if(floor&&floor.y<=foot+.012&&foot+dy<=floor.y+.002){object.position.y+=floor.y-foot;state.velocity=0;state.grounded=true;}
   else {if(floor)boxes[objects.indexOf(floor.root)].visible=false;const allowed=config.collision?collisionDelta(boxes,index,[0,dy,0])[1]:dy;object.position.y+=allowed;if(Math.abs(allowed-dy)>1e-7){state.grounded=dy<0;state.velocity=0;}else state.grounded=false;}
  }
 },grounded:object=>states.get(object)?.grounded??false};
}
