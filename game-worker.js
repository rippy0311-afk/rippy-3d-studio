let handlers={},keys=new Set(),world=[],commands=[],score=0,python;
const send=postMessage.bind(self);
const emit=(type,...args)=>{if(commands.length>=1000)throw Error('1回の処理が多すぎます');commands.push({type,args});};
const obj=id=>{const o=world[Number(id)-1];if(!o)throw Error('オブジェクト番号 '+id+' はありません');return o;};
const vector=v=>{if(!v.every(n=>Number.isFinite(n)&&Math.abs(n)<=100000))throw Error('数値は -100000〜100000 にしてください');return v;};
const on=(name,fn)=>{if(typeof fn!=='function')throw Error('イベントには関数を指定してください');(handlers[name]??=[]).push(fn.copy ? fn.copy() : fn);};
const api={
 on_start:fn=>on('start',fn),on_tick:fn=>on('tick',fn),on_key:(key,fn)=>on('key:'+String(key).toLowerCase(),fn),
 move:(id,x=0,y=0,z=0)=>{obj(id);emit('move',Number(id),...vector([x,y,z]));},
 rotate:(id,x=0,y=0,z=0)=>{obj(id);emit('rotate',Number(id),...vector([x,y,z]));},
 set_position:(id,x,y,z)=>{obj(id);emit('position',Number(id),...vector([x,y,z]));},
 set_color:(id,color)=>{obj(id);if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('色は #ff0000 の形式です');emit('color',Number(id),color);},
 show:id=>{obj(id);emit('visible',Number(id),true);},hide:id=>{obj(id);emit('visible',Number(id),false);},
 add_score:n=>{vector([n]);score+=n;emit('score',score);},get_score:()=>score,
 say:message=>emit('say',String(message).slice(0,500)),
 key_down:key=>keys.has(String(key).toLowerCase()),
 touching:(a,b)=>{const aa=obj(a),bb=obj(b);return aa.visible&&bb.visible&&aa.min.every((v,i)=>v<=bb.max[i]&&aa.max[i]>=bb.min[i]);},
 get_x:id=>obj(id).position[0],get_y:id=>obj(id).position[1],get_z:id=>obj(id).position[2]
};
self.onmessage=async({data})=>{try{
 commands=[];world=data.world;keys=new Set(data.keys??[]);
 if(data.type==='init'){
  handlers={};score=0;
  if(data.language==='python'){
   send({type:'progress',message:'Pythonライブラリ読み込み'});importScripts('./vendor/python/pyodide.js');send({type:'progress',message:'Pythonエンジン起動中'});
   python=await loadPyodide({indexURL:new URL('./vendor/python/',self.location.href).href,stdout:api.say,stderr:api.say});
   send({type:'progress',message:'Pythonコード実行中'});for(const [name,fn]of Object.entries(api))python.globals.set(name,fn);
   await python.runPythonAsync(data.code);
  }else new Function(...Object.keys(api),'"use strict";\n'+data.code)(...Object.values(api));
  for(const fn of handlers.start??[])await fn();
 }else{
  if(data.key)for(const fn of handlers['key:'+data.key]??[])await fn();
  if(data.type==='tick')for(const fn of handlers.tick??[])await fn(data.dt);
 }
 send({type:'done',commands});
}catch(error){send({type:'error',message:String(error.message??error)});}};

