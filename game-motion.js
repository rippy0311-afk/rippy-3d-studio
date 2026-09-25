// Smooth only the rendered position; game logic always sees the exact coordinates.
export function createGameMotion(clock=()=>performance.now(),duration=50){
 const motions=new Map(),restores=[];
 const remaining=(m,now)=>m.offset.map(v=>v*Math.max(0,1-(now-m.time)/duration));
 return {
  moved(object,delta){
   if(!delta.some(v=>v!==0))return;
   const now=clock(),old=motions.get(object),offset=old?remaining(old,now):[0,0,0];
   motions.set(object,{time:now,offset:offset.map((v,i)=>v-delta[i])});
  },
  beforeRender(){
   const now=clock();
   for(const [object,m] of motions){
    if(now-m.time>=duration){motions.delete(object);continue;}
    restores.push([object,object.position.clone()]);
    const offset=remaining(m,now);
    object.position.x+=offset[0];object.position.y+=offset[1];object.position.z+=offset[2];
    object.updateWorldMatrix(true,true);
   }
  },
  afterRender(){for(const [object,position] of restores){object.position.copy(position);object.updateWorldMatrix(true,true);}restores.length=0;},
  clear(){this.afterRender();motions.clear();}
 };
}
