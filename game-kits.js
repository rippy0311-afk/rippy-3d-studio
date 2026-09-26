import * as T from 'three';
import {validateGraph,TYPES} from './graph-core.js?v=20260926-studio1';
import {validateUILayout,freeUIPosition} from './ui-layout.js?v=20260926-studio1';
export function validateKit(data){
 if(!data||data.format!=='rippy-kit'||data.version!==1||!Array.isArray(data.items)||!data.items.length||data.items.length>1000)throw Error('部品セットのファイルを選んでください');
 return {...structuredClone(data),graph:validateGraph(data.graph,data.items.length),uiLayout:validateUILayout(data.uiLayout)};
}
export function mergeKit(existing,kit,prefix){
 kit=validateKit(kit);const offset=existing.items.length,hasSetup=existing.graph.nodes.some(n=>n.type==='setup');
 if(offset+kit.items.length>1000)throw Error('形は1000個までです');
 const rename=v=>v==='*'?v:prefix+v;
 const nodes=kit.graph.nodes.map(node=>{const n=structuredClone(node);n.id=prefix+n.id;n.x=Math.min(3500,n.x+60);n.y=Math.min(2000,n.y+60);
  if(n.type==='setup'&&hasSetup){n.type='start';n.params={};return n;}
  for(const field of TYPES[n.type].fields){const k=field.key,v=n.params[k];if(['target','eventTarget','playerTarget'].includes(field.kind)&&v>0)n.params[k]=v+offset;else if(field.kind==='targets')n.params[k]=v.map(id=>id+offset);else if(v&&typeof v==='object'){if(v.source==='object')v.target=v.target>0?v.target+offset:v.target;if(v.source==='variable')v.name=rename(v.name);}
   if(['name','ui'].includes(k)&&typeof v==='string')n.params[k]=rename(v);
  }
  return n;
 });
 const graph=validateGraph({nodes:[...existing.graph.nodes,...nodes],edges:[...existing.graph.edges,...kit.graph.edges.map(e=>({...e,from:prefix+e.from,to:prefix+e.to}))]},offset+kit.items.length);
 const uiLayout=structuredClone(existing.uiLayout??[]);for(const ui of kit.uiLayout){const placed=freeUIPosition({...ui,id:rename(ui.id)},uiLayout);if(!placed)throw Error('部品セットのUIを置く空きがありません');uiLayout.push(placed);}validateUILayout(uiLayout);
 return {items:[...existing.items,...kit.items],graph,uiLayout};
}
export const GAME_TEMPLATES={parkour:'アスレチック',race:'レース',explore:'探索',shoot:'シューティング'};
export function makeGameTemplate(kind){
 if(!Object.hasOwn(GAME_TEMPLATES,kind))throw Error('ひな形を選んでください');
 const items=[],nodes=[],edges=[];
 const shape=(label,pos,size,color,geometry=new T.BoxGeometry(1,1,1),rotation=[0,0,0,'XYZ'])=>{const item={label,position:pos,scale:size,rotation,visible:true,colors:[color],geometry:new T.BufferGeometry().copy(geometry).toJSON()};geometry.dispose();items.push(item);return items.length;};
 const add=(type,params={},x=40,y=40)=>{const n={id:'t'+(nodes.length+1),type,x,y,params:{...structuredClone(TYPES[type].defaults),...params}};nodes.push(n);return n.id;};
 const link=(a,b,port='next')=>edges.push({from:a,to:b,port});
 shape('地面',[0,-.5,-9],[18,1,30],0xc7bbef);
 const player=shape('プレイヤー',[0,1,3],[.7,1.6,.7],0x58bca9);
 add('setup',{player,gravityOn:true,jumpOn:true,sprintOn:true,speed:kind==='race'?6:4,runSpeed:kind==='race'?10:7,distance:6,eyeHeight:.6,height:.6},40,40);
 const begin=add('start',{},380,40),help=add('say',{text:kind==='shoot'?'的をクリックして得点！ WASDで移動':kind==='race'?'WASDで走路を進もう。Shiftで加速、奥の黄色いゴールへ':kind==='explore'?'黄色い宝を3つ集めよう。Spaceでジャンプ':'Spaceでジャンプ！ 足場を渡って黄色いゴールへ'},700,40);link(begin,help);
 const fall=add('condition_event',{condition:'compare',a:{source:'object',target:player,field:'y'},op:'lt',b:-12,mode:'repeat'},40,950),reset=add('position',{target:player,x:0,y:2,z:3},380,950);link(fall,reset);
 if(kind==='parkour'){
  items[0].scale=[6,1,7];items[0].position=[0,-.5,2];
  for(let i=0;i<5;i++)shape('足場 '+(i+1),[(i%2?1:-1),i*.4,-3-i*3],[3, .5,2],0x9580d8);
 }else if(kind==='race'){
  shape('左の壁',[-5,1,-9],[.4,3,30],0x8a77c8);shape('右の壁',[5,1,-9],[.4,3,30],0x8a77c8);
  for(let i=0;i<4;i++)shape('障害物 '+(i+1),[i%2?2:-2,.5,-3-i*4],[4,1,1],0x9d81d7);
  const timer=add('timer',{seconds:1},40,1400),v=add('variable',{name:'経過秒',mode:'add',value:1},380,1400);link(timer,v);
 }else if(kind==='explore'){
  shape('丘',[4,.5,-9],[4,1,5],0x8ba9cf);
  for(let i=0;i<3;i++){const treasure=shape('宝 '+(i+1),[i===0?-4:i===1?4:0,i===1?1.6:.6,-4-i*5],[.8,.8,.8],0xf8cb5a,new T.SphereGeometry(.5,12,8));const e=add('collision',{target:player,other:treasure,phase:'enter'},40,1650+i*20),hide=add('hide',{target:treasure},380,1650+i*20),score=add('score',{amount:1},700,1650+i*20);link(e,hide);link(hide,score);}
  const won=add('condition_event',{condition:'score',amount:3,mode:'once'},1050,950),say=add('say',{text:'宝をすべて見つけた！'},1400,950);link(won,say);
 }else if(kind==='shoot'){
  for(let i=0;i<5;i++)shape('的 '+(i+1),[(i-2)*2,1.2,-7-(i%2)*3],[1,2,.5],0xeb8c83);
  for(let i=3;i<=7;i++){const e=add('pointer',{kind:'click',target:i,button:0},40+(i-3)*320,1650),hide=add('hide',{target:i},40+(i-3)*320,1950),score=add('score',{amount:1},40+(i-3)*320,2200);link(e,hide);link(hide,score);}
  const won=add('condition_event',{condition:'score',amount:5,mode:'once'},1050,950),say=add('say',{text:'すべての的を倒した！'},1400,950);link(won,say);
 }
 if(['race','parkour'].includes(kind)){const goal=shape('ゴール',[0,kind==='parkour'?2.5:1,-18],[4,3,1],0xf8cb5a),e=add('collision',{target:player,other:goal,phase:'enter'},1050,950),say=add('say',{text:'ゴール！ おめでとう！'},1400,950);link(e,say);}
 let slot=0;for(const n of nodes){if(n.type==='setup')continue;n.x=400+(slot%7)*430;n.y=40+Math.floor(slot/7)*520;slot++;}
 return {items,graph:validateGraph({nodes,edges},items.length),uiLayout:[]};
}

export function captureKit(scene,selectedIds){
 if(!selectedIds)return {format:'rippy-kit',version:1,...structuredClone(scene)};
 const ids=new Set(selectedIds),graph=validateGraph(scene.graph,scene.items.length),picked=new Set();
 const references=n=>{const refs=[];for(const f of TYPES[n.type].fields){const v=n.params[f.key];if(['target','eventTarget','playerTarget'].includes(f.kind)&&v>0)refs.push(v);if(f.kind==='targets')refs.push(...v);if(v?.source==='object'&&v.target>0)refs.push(v.target);}return refs;};
 let changed=true;while(changed){changed=false;for(const n of graph.nodes){if(n.type==='setup')continue;const connected=graph.edges.some(e=>e.from===n.id&&picked.has(e.to)||e.to===n.id&&picked.has(e.from));if(!picked.has(n.id)&&(connected||references(n).some(id=>ids.has(id)))){picked.add(n.id);references(n).forEach(id=>ids.add(id));changed=true;}}
  for(const n of graph.nodes){if(n.type==='setup'||picked.has(n.id))continue;const names=node=>{const a=[];if(typeof node.params.name==='string')a.push(node.params.name);for(const v of Object.values(node.params))if(v?.source==='variable')a.push(v.name);return a;};if([...picked].some(id=>names(graph.nodes.find(n=>n.id===id)).some(name=>names(n).includes(name)))){picked.add(n.id);references(n).forEach(id=>ids.add(id));changed=true;}}
 }
 const order=[...ids].sort((a,b)=>a-b),mapping=new Map(order.map((id,i)=>[id,i+1]));const nodes=graph.nodes.filter(n=>picked.has(n.id));
 for(const n of nodes)for(const f of TYPES[n.type].fields){const v=n.params[f.key];if(['target','eventTarget','playerTarget'].includes(f.kind)&&v>0)n.params[f.key]=mapping.get(v);if(v?.source==='object'&&v.target>0)v.target=mapping.get(v.target);}
 // Setup execution outputs become a start event, without replacing the destination game's player.
 const roots=graph.edges.filter(e=>graph.nodes.find(n=>n.id===e.from)?.type==='setup'&&picked.has(e.to));
 if(roots.length){nodes.push({id:'kit-start',type:'start',x:40,y:40,params:{}});roots.forEach(e=>e.from='kit-start');picked.add('kit-start');}
 const uiIds=new Set(nodes.map(n=>n.params.ui).filter(Boolean));
 return validateKit({format:'rippy-kit',version:1,items:order.map(id=>structuredClone(scene.items[id-1])),graph:{nodes,edges:graph.edges.filter(e=>picked.has(e.from)&&picked.has(e.to))},uiLayout:(scene.uiLayout??[]).filter(i=>uiIds.has(i.id)||uiIds.has('*'))});
}
