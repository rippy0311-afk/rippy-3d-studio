// Sweep one axis at a time so fast translations stop at thin walls and slide along them.
function boxDelta(world,index,delta){
 const body=world[index];if(!body?.visible)return [...delta];
 const min=[...body.min],max=[...body.max],result=[...delta],epsilon=1e-7;
 for(let axis=0;axis<3;axis++){
  let amount=result[axis];if(!amount)continue;
  for(let i=0;i<world.length;i++){
   const obstacle=world[i];if(i===index||!obstacle?.visible)continue;
   if(!min.every((v,k)=>k===axis||max[k]>obstacle.min[k]+epsilon&&v<obstacle.max[k]-epsilon))continue;
   if(amount>0&&max[axis]<=obstacle.min[axis]+epsilon)amount=Math.min(amount,Math.max(0,obstacle.min[axis]-max[axis]));
   else if(amount<0&&min[axis]>=obstacle.max[axis]-epsilon)amount=Math.max(amount,Math.min(0,obstacle.max[axis]-min[axis]));
  }
  result[axis]=amount;min[axis]+=amount;max[axis]+=amount;
 }
 return result;
}

const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const eps=1e-8;
function triangles(o,offset=[0,0,0]){return o.triangles.map(t=>t.map(p=>p.map((v,i)=>v+(o.position?.[i]??0)+offset[i])));}
function bounds(t){return [0,1,2].map(i=>[Math.min(...t.map(p=>p[i])),Math.max(...t.map(p=>p[i]))]);}
// Continuous separating-axis test: test the actual triangle surfaces throughout the move.
function sweep(a,b,velocity,contact=false){
 const ea=a.map((p,i)=>sub(a[(i+1)%3],p)),eb=b.map((p,i)=>sub(b[(i+1)%3],p));
 const na=cross(ea[0],ea[1]),nb=cross(eb[0],eb[1]);
 if(!contact&&(dot(na,velocity)<=eps||dot(nb,velocity)>=-eps))return null;
 const axes=[na,nb,...ea.flatMap(x=>eb.map(y=>cross(x,y))),...ea.map(e=>cross(na,e)),...eb.map(e=>cross(nb,e))];
 let enter=-Infinity,exit=Infinity;
 for(const raw of axes){const length=Math.sqrt(dot(raw,raw));if(length<eps)continue;const axis=raw.map(v=>v/length),pa=a.map(p=>dot(p,axis)),pb=b.map(p=>dot(p,axis));
 const lo=Math.min(...pb)-Math.max(...pa),hi=Math.max(...pb)-Math.min(...pa),speed=dot(velocity,axis);
 if(Math.abs(speed)<eps){if(contact?lo>eps||hi<-eps:lo>=-eps||hi<=eps)return null;continue;}
 enter=Math.max(enter,Math.min(lo/speed,hi/speed));exit=Math.min(exit,Math.max(lo/speed,hi/speed));if(enter>exit+eps)return null;
 }
 // Existing contact moving along or away from a surface must remain free.
 if(contact)return 0;
 return enter>=-eps&&enter<=1+eps&&exit>=-eps?Math.max(0,enter):null;
}
export function collisionDelta(world,index,delta){
 const body=world[index];if(!body?.visible)return [...delta];if(!body.triangles)return boxDelta(world,index,delta);
 const offset=[0,0,0],result=[...delta];
 for(let axis=0;axis<3;axis++){
  const amount=result[axis];if(!amount)continue;const velocity=[0,0,0];velocity[axis]=amount;let fraction=1;
  const moving=triangles(body,offset).map(t=>({t,b:bounds(t)}));
  for(let k=0;k<world.length;k++){
   const obstacle=world[k];if(k===index||!obstacle?.visible)continue;
   if(!body.min.every((v,i)=>body.max[i]+offset[i]+Math.max(0,velocity[i])>=obstacle.min[i]-eps&&v+offset[i]+Math.min(0,velocity[i])<=obstacle.max[i]+eps))continue;
   if(!obstacle.triangles){const d=boxDelta([{...body,min:body.min.map((v,i)=>v+offset[i]),max:body.max.map((v,i)=>v+offset[i])},obstacle],0,velocity);fraction=Math.min(fraction,d[axis]/amount);continue;}
   const fixed=triangles(obstacle).map(t=>({t,b:bounds(t)}));
   for(const a of moving)for(const b of fixed){if(!a.b.every(([lo,hi],i)=>hi+Math.max(0,velocity[i]*fraction)>=b.b[i][0]-eps&&lo+Math.min(0,velocity[i]*fraction)<=b.b[i][1]+eps))continue;const hit=sweep(a.t,b.t,velocity);if(hit!==null)fraction=Math.min(fraction,hit);}
  }
  result[axis]=amount*fraction;offset[axis]+=result[axis];
 }
 return result;
}

function inside(point,mesh){
 const direction=[1,.371390676,.52912731],hits=[];
 for(const t of mesh){const e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(direction,e2),det=dot(e1,h);if(Math.abs(det)<eps)continue;const s=sub(point,t[0]),u=dot(s,h)/det;if(u<-eps||u>1+eps)continue;const q=cross(s,e1),v=dot(direction,q)/det;if(v<-eps||u+v>1+eps)continue;const distance=dot(e2,q)/det;if(distance>eps&&!hits.some(x=>Math.abs(x-distance)<eps))hits.push(distance);}
 return hits.length%2===1;
}
export function collidersTouch(a,b){
 if(!a?.visible||!b?.visible||!a.min.every((v,i)=>v<=b.max[i]+eps&&a.max[i]>=b.min[i]-eps))return false;
 if(!a.triangles||!b.triangles)return true;
 const aa=triangles(a),bb=triangles(b),ab=aa.map(bounds),bbounds=bb.map(bounds);
 for(let i=0;i<aa.length;i++)for(let j=0;j<bb.length;j++)if(ab[i].every(([lo,hi],k)=>hi>=bbounds[j][k][0]-eps&&lo<=bbounds[j][k][1]+eps)&&sweep(aa[i],bb[j],[0,0,0],true)!==null)return true;
 return aa.some(t=>inside(t[0],bb))||bb.some(t=>inside(t[0],aa));
}

export function rotateCollider(o,degrees){
 if(!o.triangles){o.rotation=(o.rotation??[0,0,0]).map((v,i)=>v+degrees[i]*Math.PI/180);return;}if(!o.rotation)return;
 const old=o.rotation,next=old.map((v,i)=>v+degrees[i]*Math.PI/180);
 function turn(p,axis,angle){const i=(axis+1)%3,j=(axis+2)%3,c=Math.cos(angle),s=Math.sin(angle),a=p[i],b=p[j];p[i]=a*c-b*s;p[j]=a*s+b*c;}
 o.min=[Infinity,Infinity,Infinity];o.max=[-Infinity,-Infinity,-Infinity];
 for(const t of o.triangles)for(const p of t){for(const i of [0,1,2])turn(p,i,-old[i]);for(const i of [2,1,0])turn(p,i,next[i]);for(let i=0;i<3;i++){o.min[i]=Math.min(o.min[i],p[i]+o.position[i]);o.max[i]=Math.max(o.max[i],p[i]+o.position[i]);}}
 o.rotation=next;
}

// Test penetration separately from contact: a resting floor contact must allow turning.
export function collidersPenetrate(a,b){
 const center=a.min.map((v,i)=>(v+a.max[i])/2),factor=1-1e-6;
 const inner={...a,min:a.min.map((v,i)=>center[i]+(v-center[i])*factor),max:a.max.map((v,i)=>center[i]+(v-center[i])*factor)};
 if(a.triangles)inner.triangles=a.triangles.map(t=>t.map(p=>p.map((v,i)=>{const origin=a.position?.[i]??0;return center[i]+(v+origin-center[i])*factor-origin;})));
 return collidersTouch(inner,b);
}
