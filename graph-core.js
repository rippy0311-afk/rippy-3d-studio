export const KEYS=[['→ 右矢印','ArrowRight'],['← 左矢印','ArrowLeft'],['↑ 上矢印','ArrowUp'],['↓ 下矢印','ArrowDown'],['Tab','Tab'],['Space',' '],['Enter','Enter'],['Backspace','Backspace'],['Delete','Delete'],...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ',c=>[c,c.toLowerCase()]),...Array.from('0123456789',c=>[c,c]),...Array.from({length:94},(_,i)=>String.fromCharCode(i+33)).filter(c=>!/[a-z0-9]/i.test(c)).map(c=>[c,c])];
const xyz={target:1,x:0,y:0,z:0,perSecond:false};
export const TYPES={
 start:{name:'開始したとき',group:'イベント',event:true,defaults:{}},
 key:{name:'キーを押したとき',group:'イベント',event:true,defaults:{key:'ArrowRight'}},
 tick:{name:'毎フレーム',group:'イベント',event:true,defaults:{}},
 move:{name:'移動する',group:'形',defaults:{...xyz,x:1}},
 rotate:{name:'回転する',group:'形',defaults:{...xyz,y:15}},
 position:{name:'位置を設定',group:'形',defaults:{...xyz}},
 color:{name:'色を変える',group:'形',defaults:{target:1,color:'#ff5555'}},
 show:{name:'表示する',group:'形',defaults:{target:1}},hide:{name:'隠す',group:'形',defaults:{target:1}},
 score:{name:'得点を増やす',group:'ゲーム',defaults:{amount:1}},
 say:{name:'メッセージを表示',group:'ゲーム',defaults:{text:'ゲームスタート！'}},
 branch:{name:'条件分岐',group:'条件',defaults:{condition:'key',key:'ArrowRight',target:1,other:2,amount:10}},
};
export const outputs=n=>n.type==='branch'?['yes','no']:['next'];
export function validateGraph(input,count=Infinity){
 if(!input||!Array.isArray(input.nodes)||!Array.isArray(input.edges)||input.nodes.length>300||input.edges.length>600)throw Error('ノードは300個までです。正しい保存ファイルを選んでください。');
 const graph=structuredClone(input),ids=new Map();
 for(const n of graph.nodes){if(typeof n.id!=='string'||ids.has(n.id)||!TYPES[n.type]||!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.abs(n.x)>10000||Math.abs(n.y)>10000)throw Error('不正なノードです');ids.set(n.id,n);n.params={...TYPES[n.type].defaults,...n.params};const p=n.params;
 for(const k of ['x','y','z','amount'])if(k in p&&(!Number.isFinite(p[k])||Math.abs(p[k])>100000))throw Error('数値は -100000〜100000 にしてください');
 const needsTarget=['move','rotate','position','color','show','hide'].includes(n.type)||n.type==='branch'&&p.condition==='touching';
 for(const k of needsTarget?(n.type==='branch'?['target','other']:['target']):[])if(!Number.isInteger(p[k])||p[k]<1||p[k]>count)throw Error(TYPES[n.type].name+'：対象の形を選び直してください');
 if('key'in p&&!KEYS.some(([,v])=>v===p.key))throw Error('キーを一覧から選んでください');
 if(n.type==='branch'&&!['key','touching','score'].includes(p.condition))throw Error('条件を選び直してください');
 if('color'in p&&!/^#[0-9a-f]{6}$/i.test(p.color))throw Error('色が不正です');
 if('text'in p&&(typeof p.text!=='string'||p.text.length>500))throw Error('メッセージは500文字までです');
 }
 const used=new Set();for(const e of graph.edges){if(!ids.has(e.from)||!ids.has(e.to)||TYPES[ids.get(e.to).type].event||!outputs(ids.get(e.from)).includes(e.port)||used.has(e.from+':'+e.port))throw Error('接続が不正です');used.add(e.from+':'+e.port);}
 const active=new Set(),done=new Set();function visit(id){if(active.has(id))throw Error('線が一周しています。繰り返しは「毎フレーム」を使ってください。');if(done.has(id))return;active.add(id);for(const e of graph.edges.filter(e=>e.from===id))visit(e.to);active.delete(id);done.add(id);}for(const id of ids.keys())visit(id);
 return graph;
}
export class GraphRuntime{
 constructor(graph,count){this.graph=validateGraph(graph,count);this.nodes=new Map(this.graph.nodes.map(n=>[n.id,n]));this.links=new Map(this.graph.edges.map(e=>[e.from+':'+e.port,e.to]));this.score=0;}
 run(event,{world,keys=[],key,dt=0}){
 const commands=[],pressed=new Set(keys),data=structuredClone(world);let steps=0;
 const emit=(type,...args)=>{if(commands.length>=1000)throw Error('1フレームの処理が多すぎます');commands.push({type,args});};
 const object=id=>{const o=data[id-1];if(!o)throw Error('対象の形がありません');return o;};
 const walk=id=>{while(id){if(++steps>2000)throw Error('処理が多すぎます');const n=this.nodes.get(id),p=n.params;let port='next';
 if(n.type==='branch'){let yes=false;if(p.condition==='key')yes=pressed.has(p.key.toLowerCase());else if(p.condition==='score')yes=this.score>=p.amount;else{const a=object(p.target),b=object(p.other);yes=a.visible&&b.visible&&a.min.every((v,i)=>v<=b.max[i]&&a.max[i]>=b.min[i]);}port=yes?'yes':'no';}
 else if(['move','rotate','position'].includes(n.type)){const o=object(p.target),v=[p.x,p.y,p.z].map(v=>v*(p.perSecond&&n.type!=='position'?dt:1));emit(n.type,p.target,...v);if(n.type!=='rotate'){const delta=n.type==='move'?v:v.map((x,i)=>x-o.position[i]);o.position=o.position.map((x,i)=>x+delta[i]);o.min=o.min.map((x,i)=>x+delta[i]);o.max=o.max.map((x,i)=>x+delta[i]);}}
 else if(n.type==='color')emit('color',p.target,p.color);
 else if(n.type==='hide'||n.type==='show'){object(p.target).visible=n.type==='show';emit('visible',p.target,n.type==='show');}
 else if(n.type==='score'){this.score+=p.amount;emit('score',this.score);}
 else if(n.type==='say')emit('say',p.text);
 id=this.links.get(n.id+':'+port);
 }};
 for(const n of this.graph.nodes)if(n.type===event&&(event!=='key'||n.params.key.toLowerCase()===key))walk(n.id);
 return commands;
 }
}
