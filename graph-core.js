import {collisionDelta} from './game-collision.js?v=20260925-ui2';
import {TYPES,KEYS,CONTEXT,outputs} from './graph-schema.js?v=20260925-ui2';
export {TYPES,KEYS,CONTEXT,outputs} from './graph-schema.js?v=20260925-ui2';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const binding=v=>v&&typeof v==='object'&&!Array.isArray(v);
function checkValue(v){if(binding(v)){if(!['variable','event','object'].includes(v.source))throw Error('値の参照先が不正です');if(v.source==='variable'&&(typeof v.name!=='string'||!v.name.length||v.name.length>64))throw Error('変数名を指定してください');if(v.source==='event'&&!CONTEXT.some(([,key])=>key===v.field))throw Error('イベントの値を選んでください');if(v.source==='object'&&(!Number.isInteger(v.target)||v.target===0||v.target< -3||!['x','y','z'].includes(v.field)))throw Error('形の座標の参照が不正です');}else if(!['number','string','boolean'].includes(typeof v)||typeof v==='number'&&(!Number.isFinite(v)||Math.abs(v)>1e9)||typeof v==='string'&&v.length>500)throw Error('値が不正です（文字は500字以内）');}
export function validateGraph(input,count=Infinity){
 if(!input||!Array.isArray(input.nodes)||!Array.isArray(input.edges)||input.nodes.length>300||input.edges.length>600)throw Error('ノードは300個までです。正しい保存ファイルを選んでください。');
 const graph=structuredClone(input),ids=new Map();
 for(const n of graph.nodes){if(typeof n.id!=='string'||n.id.length>80||ids.has(n.id)||!own(TYPES,n.type)||!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.abs(n.x)>10000||Math.abs(n.y)>10000)throw Error('不正なノードです');ids.set(n.id,n);const def=TYPES[n.type];n.params={...def.defaults,...n.params};const p=n.params;
 for(const field of def.fields){const v=p[field.key];if(['number','value'].includes(field.kind)){checkValue(v);if(field.kind==='number'&&!binding(v)&&(!Number.isFinite(v)||Math.abs(v)>100000))throw Error('数値は -100000〜100000 にしてください');}
 else if(field.kind==='setting'&&(!Number.isFinite(v)||v<0||v>1000||['distance','sensitivity'].includes(field.key)&&v<=0))throw Error('初期設定の数値は0〜1000（距離と感度は0より大きい値）です');
 else if(field.kind==='playerTarget'&&(!Number.isInteger(v)||v<0||v>count))throw Error('プレイヤーを選び直してください');
 else if(field.kind==='targets'&&(!Array.isArray(v)||v.some(id=>!Number.isInteger(id)||id<1||id>count)||new Set(v).size!==v.length))throw Error('操作対象を選び直してください');
 else if(field.kind==='select'&&!field.options.some(([,x])=>x===v))throw Error(def.name+'：選択肢を選んでください');
 else if(['target','eventTarget'].includes(field.kind)){const relevant=!(n.type==='branch'||n.type==='condition_event')||p.condition==='touching';if(relevant&&(!Number.isInteger(v)||v<(def.event?(field.kind==='eventTarget'?-1:0):-3)||field.kind==='target'&&v===0||v>count))throw Error(def.name+'：対象の形を選び直してください');}
 else if(field.kind==='boolean'&&typeof v!=='boolean')throw Error('チェックの設定が不正です');
 else if(field.kind==='color'&&!/^#[0-9a-f]{6}$/i.test(v))throw Error('色が不正です');
 else if(['text','name'].includes(field.kind)&&(typeof v!=='string'||v.length>(field.kind==='name'?64:500)||field.kind==='name'&&!v.trim()))throw Error('名前やテキストを確認してください');
 }
 }
 if(graph.nodes.filter(n=>n.type==='setup').length>1)throw Error('最初の定義は1個だけ配置してください');
 const used=new Set();for(const e of graph.edges){if(!ids.has(e.from)||!ids.has(e.to)||TYPES[ids.get(e.to).type].event||!outputs(ids.get(e.from)).includes(e.port)||used.has(JSON.stringify([e.from,e.port,e.to])))throw Error('接続が不正です');used.add(JSON.stringify([e.from,e.port,e.to]));}
 const active=new Set(),done=new Set();function visit(id){if(active.has(id))throw Error('線が一周しています。「くり返す」か「毎フレーム」を使ってください。');if(done.has(id))return;active.add(id);for(const e of graph.edges.filter(e=>e.from===id))visit(e.to);active.delete(id);done.add(id);}for(const id of ids.keys())visit(id);
 const names=new Set();for(const n of graph.nodes.filter(n=>n.type==='function')){if(names.has(n.params.name))throw Error('同じ名前の関数があります');names.add(n.params.name);}for(const n of graph.nodes.filter(n=>n.type==='call'))if(!names.has(n.params.name))throw Error('関数「'+n.params.name+'」を定義してください');
 return graph;
}
export class GraphRuntime{
 constructor(graph,count){this.graph=validateGraph(graph,count);this.nodes=new Map(this.graph.nodes.map(n=>[n.id,n]));this.links=new Map();for(const e of this.graph.edges){const key=e.from+':'+e.port;this.links.set(key,[...(this.links.get(key)??[]),e.to]);}this.collision=this.graph.nodes.find(n=>n.type==='setup')?.params.collision??true;this.score=0;this.vars=new Map();this.time=0;this.pending=[];this.previous=new Map();this.timerNext=new Map();this.disabledTimers=new Set();this.prompts=new Set();this.promptSerial=0;this.functions=new Map(this.graph.nodes.filter(n=>n.type==='function').map(n=>[n.params.name,n]));}
 run(event,input){
 const {world,keys=[],dt=0}=input;this.world=structuredClone(world);this.keys=new Set(keys);this.dt=Math.max(0,Math.min(Number(dt)||0,.25));if(event==='tick')this.time+=this.dt;this.commands=[];this.jobs=[];this.steps=0;
 const queue=(n,ctx={})=>{this.jobs.push({stack:[{id:n.id,ctx:{time:this.time,dt:this.dt,...ctx}}]});};this.queue=queue;
 const trigger=(type,ctx={})=>{for(const n of this.graph.nodes){if(n.type!==type)continue;const p=n.params;
 if(['key','keyup','keypress'].includes(type)&&p.key!=='*'&&p.key.toLowerCase()!==String(ctx.key).toLowerCase())continue;
 if(['message_event','variable_event','answer'].includes(type)&&p.name!==ctx.name)continue;
 if(type==='created'&&p.target>0&&p.target!==ctx.target&&p.target!==ctx.source)continue;
 if(type==='ui_event'&&(p.kind!==ctx.kind||p.ui!=='*'&&p.ui!==ctx.ui))continue;
 if(type==='pointer'&&(p.kind!==ctx.kind||p.target===-1&&!ctx.target||p.target>0&&p.target!==ctx.target||p.button!==-1&&p.button!==ctx.button))continue;
 queue(n,ctx);
 }};this.trigger=trigger;
 if(event==='start'){trigger('setup');trigger('start');this.world.forEach((_,i)=>trigger('created',{target:i+1,created:i+1}));}
 else if(event==='tick'){
  const due=this.pending.filter(p=>p.time<=this.time);this.pending=this.pending.filter(p=>p.time>this.time);this.jobs.push(...due.map(p=>({stack:p.stack})));
  for(const e of input.events??[]){if(e.type==='answer'){if(!this.prompts.has(e.token))continue;this.prompts.delete(e.token);this.setVar(e.name,e.value);trigger('answer',e);if(!this.prompts.size)trigger('all_answers',e);}else trigger(e.type,e);}
  if(input.key)trigger('key',{key:input.key});
  trigger('tick');
  for(const n of this.graph.nodes){const p=n.params;
   if(n.type==='keyheld'&&(p.key==='*'?this.keys.size:this.keys.has(p.key.toLowerCase())))queue(n,{key:p.key==='*'?[...this.keys][0]:p.key});
   if(n.type==='timer'&&!this.disabledTimers.has(n.id)){const seconds=this.number(p.seconds,{});if(seconds<.01||seconds>86400)throw Error('タイマーの秒数は0.01〜86400です');let next=this.timerNext.get(n.id)??seconds;let repeats=0;while(this.time+1e-8>=next&&repeats++<100){queue(n);next=p.mode==='once'?Infinity:next+seconds;}this.timerNext.set(n.id,next);}
   if(n.type==='collision'){const on=this.touching(p.target,p.other),old=this.previous.get(n.id)??false;this.previous.set(n.id,on);if(p.phase==='enter'&&on&&!old||p.phase==='stay'&&on||p.phase==='exit'&&!on&&old||p.phase==='outside'&&!on)queue(n,{target:p.target,other:p.other});}
   if(n.type==='condition_event'){const on=this.condition(p,{}),old=this.previous.get(n.id)??false;this.previous.set(n.id,on);if(on&&(p.mode==='repeat'||!old))queue(n);}
   if(n.type==='pointer'&&['held','hover'].includes(p.kind)){const pointer=input.pointer??{},matches=p.target===0?pointer.inside:p.target===-1?pointer.target>0:p.target===pointer.target;const down=p.button===-1?(pointer.buttons??[]).length:(pointer.buttons??[]).includes(p.button);if(matches&&(p.kind==='hover'||down))queue(n,{...pointer,button:p.button===-1?(pointer.buttons?.[0]??0):p.button});}
  }
 }else trigger(event,{...input});
 while(this.jobs.length){if(this.jobs.length>500)throw Error('同時イベントが多すぎます');const job=this.jobs.shift();while(job.stack.length){if(++this.steps>5000)throw Error('処理が多すぎます。関数や自作イベントの循環を確認してください');const task=job.stack.pop(),n=this.nodes.get(task.id),p=n.params,ctx=task.ctx;let next=this.links.get(n.id+':next');const push=(target,c=ctx)=>{const ids=Array.isArray(target)?target:target?[target]:[];for(const id of [...ids].reverse())job.stack.push({id,ctx:{...c}});};
  if(n.type==='branch'){push(this.links.get(n.id+':'+(this.condition(p,ctx)?'yes':'no')));continue;}
  if(n.type==='repeat'){const count=this.number(p.count,ctx);if(!Number.isInteger(count)||count<0||count>1000)throw Error('繰り返し回数は0〜1000の整数です');push(next);for(let i=count-1;i>=0;i--)push(this.links.get(n.id+':body'),{...ctx,index:i});continue;}
  if(n.type==='wait'){const seconds=this.number(p.seconds,ctx);if(seconds<0||seconds>86400)throw Error('待機秒数は0〜86400です');push(next);if(job.stack.length){if(this.pending.length>=500)throw Error('待機中の処理が多すぎます');this.pending.push({time:this.time+Math.max(.001,seconds),stack:job.stack});}break;}
  if(n.type==='call'){push(next);const fn=this.functions.get(p.name);const depth=(ctx.depth??0)+1;if(depth>32)throw Error('関数の呼び出しが深すぎます');push(fn.id,{...ctx,value:this.value(p.value,ctx),depth});continue;}
  if(['move','rotate','position','clone'].includes(n.type)){const id=this.target(p.target,ctx),o=this.object(id),v=['x','y','z'].map(k=>this.number(p[k],ctx)*(p.perSecond&&n.type!=='position'?this.dt:1));if(n.type==='clone'){if(this.world.length>=1000)throw Error('形は1000個までです');const copy=structuredClone(o);for(const prop of ['position','min','max'])copy[prop]=copy[prop].map((x,i)=>x+v[i]);this.world.push(copy);const created=this.world.length;ctx.created=created;this.emit('clone',id,created,...v);trigger('created',{target:created,created,source:id});}else{if(n.type==='rotate')this.emit(n.type,id,...v);else{const requested=n.type==='move'?v:v.map((x,i)=>x-o.position[i]);const delta=this.collision?collisionDelta(this.world,id-1,requested):requested;this.emit('move',id,...delta);for(const prop of ['position','min','max'])o[prop]=o[prop].map((x,i)=>x+delta[i]);}}}
  else if(n.type==='color')this.emit('color',this.target(p.target,ctx),p.color);
  else if(['hide','show'].includes(n.type)){const id=this.target(p.target,ctx);this.object(id).visible=n.type==='show';this.emit('visible',id,n.type==='show');}
  else if(n.type==='score'){this.score+=this.number(p.amount,ctx);this.emit('score',this.score);}
  else if(n.type==='say')this.emit('say',String(this.value(p.text,ctx)).slice(0,500));
  else if(n.type==='variable'){const value=this.value(p.value,ctx);this.setVar(p.name,p.mode==='set'?value:this.num(this.vars.get(p.name)??0)+(p.mode==='subtract'?-1:1)*this.num(value));}
  else if(n.type==='math'){const a=this.value(p.a,ctx),b=this.value(p.b,ctx);let value;if(p.op==='concat')value=String(a)+String(b);else{const x=this.num(a),y=this.num(b);switch(p.op){case'add':value=x+y;break;case'subtract':value=x-y;break;case'multiply':value=x*y;break;case'divide':if(!y)throw Error('0で割れません');value=x/y;break;case'mod':if(!y)throw Error('0で割れません');value=x%y;break;case'power':value=x**y;break;case'min':value=Math.min(x,y);break;case'max':value=Math.max(x,y);break;case'random':{const lo=Math.ceil(Math.min(x,y)),hi=Math.floor(Math.max(x,y));if(lo>hi)throw Error('乱数の範囲に整数がありません');value=lo+Math.floor(Math.random()*(hi-lo+1));break;}case'round':value=Math.round(x);break;case'floor':value=Math.floor(x);break;case'abs':value=Math.abs(x);break;}}this.setVar(p.name,value);}
  else if(n.type==='timer_control'){for(const timer of this.graph.nodes.filter(n=>n.type==='timer'&&(p.name==='*'||n.params.name===p.name))){if(p.mode==='stop')this.disabledTimers.add(timer.id);else{this.disabledTimers.delete(timer.id);this.timerNext.set(timer.id,this.time+this.number(timer.params.seconds,ctx));}}}
  else if(n.type==='broadcast')trigger('message_event',{...ctx,name:p.name,value:this.value(p.value,ctx)});
  else if(n.type==='prompt'){if(this.prompts.size>=20)throw Error('未回答の質問は20個までです');const token=String(++this.promptSerial);this.prompts.add(token);this.emit('prompt',token,p.name,String(this.value(p.text,ctx)));}
  else if(n.type==='ui_create')this.emit('ui_create',p.ui,p.kind,String(this.value(p.text,ctx)),this.value(p.value,ctx),p.options);
  else if(n.type==='ui_set')this.emit('ui_set',p.ui,p.property,this.value(p.value,ctx));
  push(next,ctx);
 }}
 return this.commands;
 }
 emit(type,...args){if(this.commands.length>=1000)throw Error('1フレームの処理が多すぎます');this.commands.push({type,args});}
 object(id){const o=this.world[id-1];if(!o)throw Error('対象の形がありません');return o;}
 target(id,ctx){const resolved=id===-1?ctx.target:id===-2?ctx.other:id===-3?ctx.created:id;this.object(resolved);return resolved;}
 num(v){const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>1e9)throw Error('計算結果が大きすぎるか、数値ではありません');return n;}
 number(v,ctx){return this.num(this.value(v,ctx));}
 value(v,ctx){if(!binding(v))return v;if(v.source==='variable')return this.vars.get(v.name)??0;if(v.source==='event')return v.field==='score'?this.score:v.field==='time'?this.time:v.field==='dt'?this.dt:ctx[v.field]??0;const id=this.target(v.target,ctx);return this.object(id).position[['x','y','z'].indexOf(v.field)];}
 setVar(name,value){checkValue(value);if(!this.vars.has(name)&&this.vars.size>=500)throw Error('変数は500個までです');const previous=this.vars.get(name);this.vars.set(name,value);if(previous!==value)this.trigger('variable_event',{name,value,previous});}
 touching(a,b){const aa=this.object(a),bb=this.object(b);return aa.visible&&bb.visible&&aa.min.every((v,i)=>v<=bb.max[i]&&aa.max[i]>=bb.min[i]);}
 condition(p,ctx){if(p.condition==='key')return p.key==='*'?!!this.keys.size:this.keys.has(p.key.toLowerCase());if(p.condition==='touching')return this.touching(this.target(p.target,ctx),this.target(p.other,ctx));if(p.condition==='score')return this.score>=this.number(p.amount,ctx);const a=this.value(p.a,ctx),b=this.value(p.b,ctx);switch(p.op){case'eq':return a===b;case'ne':return a!==b;case'gt':return this.num(a)>this.num(b);case'gte':return this.num(a)>=this.num(b);case'lt':return this.num(a)<this.num(b);case'lte':return this.num(a)<=this.num(b);case'and':return Boolean(a)&&Boolean(b);case'or':return Boolean(a)||Boolean(b);}return false;}
}
