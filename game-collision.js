// Sweep one axis at a time so fast translations stop at thin walls and slide along them.
export function collisionDelta(world,index,delta){
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
