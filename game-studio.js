import * as T from 'three';
import {createGraphEditor} from './graph-editor.js';
import {validateGraph} from './graph-core.js';
export function initGameStudio(bridge){
 const $=s=>document.querySelector(s),{objects}=bridge;
 const dialog=document.createElement('dialog');dialog.id='code-dialog';dialog.setAttribute('aria-labelledby','code-title');
 dialog.innerHTML=`<div class="code-heading"><div><span class="eyebrow">RIPPY • NODE GRAPH</span><h2 id="code-title">ノードでゲームを作る</h2></div><button id="close-code" aria-label="ノードエディターを閉じる">✕</button></div><div class="code-actions"><button id="code-example">移動サンプルに置き換える</button><button id="code-run">▶ プレイ</button><button id="save-game">↓ ゲームを保存</button><button id="load-game">ゲームを読み込む</button><input id="load-game-file" type="file" accept=".json" hidden></div><div id="node-editor"></div><p id="code-notice" role="status">イベントの出力から、動かしたいノードの入力へ線をつなぎます。</p><p class="graph-footnote">白い線＝実行の順番 ／ 空白をドラッグ＝画面移動 ／ ノードを選択してDelete＝削除 ／ Ctrl+Z＝戻す。重なり判定は外接する箱を使用します。</p>`;
 document.body.append(dialog);dialog.addEventListener('close',()=>{document.querySelector('main').inert=false;document.querySelector('header').inert=false;});
 const hud=document.createElement('div');hud.id='game-hud';hud.hidden=true;hud.innerHTML='<b id="game-score">得点：0</b><span id="game-message">準備中…</span><small>Escで停止</small>';$('#viewport').append(hud);
 let graphEditor,worker,busy=false,timer,tickTimer,running=false,keys=new Set(),before,oldSelection,cameraState,queuedKeys=[],last=0;
 const notice=message=>{$('#code-notice').textContent=message;};
 const state=()=>objects.map(o=>{const box=new T.Box3().setFromObject(o);return{position:o.position.toArray(),visible:o.visible,min:box.min.toArray(),max:box.max.toArray()};});
 function stop(message='停止しました。編集時の状態に戻りました'){
 if(!running)return;running=false;clearTimeout(timer);clearInterval(tickTimer);worker?.terminate();worker=null;busy=false;keys.clear();queuedKeys=[];
 objects.forEach((o,i)=>{const s=before[i];o.position.fromArray(s.position);o.rotation.fromArray(s.rotation);o.scale.fromArray(s.scale);o.visible=s.visible;let c=0;o.traverse(m=>{if(m.isMesh)m.material.color.setHex(s.colors[c++]);});});
 bridge.camera.position.copy(cameraState.position);bridge.orbit.target.copy(cameraState.target);bridge.setEditing(true);bridge.select(oldSelection);$('#play-game').hidden=false;$('#stop-game').hidden=true;hud.hidden=true;$('#status').textContent=message;
 }
 function dispatch(data,timeout=2000){busy=true;worker.postMessage({...data,world:state(),keys:[...keys]});clearTimeout(timer);timer=setTimeout(()=>stop('処理が長すぎるため停止しました。繰り返しを確認してください。'),timeout);}
 function run(){
 if(running)return;let graph;try{graph=graphEditor.validate();if(!graph.nodes.some(n=>['start','tick','key'].includes(n.type)))throw Error('イベントノードを追加してください');}catch(e){notice(e.message);$('#status').textContent=e.message;return;}
 oldSelection=bridge.getSelected();objects.forEach(bridge.centerPivot);before=objects.map(o=>{const colors=[];o.traverse(m=>{if(m.isMesh)colors.push(m.material.color.getHex());});return{position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),visible:o.visible,colors};});cameraState={position:bridge.camera.position.clone(),target:bridge.orbit.target.clone()};
 bridge.select(null);bridge.setEditing(false);dialog.close();running=true;hud.hidden=false;$('#game-score').textContent='得点：0';$('#game-message').textContent='ゲーム開始';$('#play-game').hidden=true;$('#stop-game').hidden=false;$('#stop-game').focus();
 worker=new Worker(new URL('./game-worker.js',import.meta.url),{type:'module'});
 worker.onerror=e=>stop('実行エラー：'+e.message);
 worker.onmessage=({data})=>{if(!running)return;clearTimeout(timer);if(data.type==='error'){stop('ノードの実行エラー：'+data.message);notice(data.message);return;}try{for(const {type,args}of data.commands){const o=objects[args[0]-1];if(type==='score')$('#game-score').textContent='得点：'+args[0];else if(type==='say')$('#game-message').textContent=args[0];else if(o){if(type==='move')o.position.add(new T.Vector3(...args.slice(1)));if(type==='position')o.position.set(...args.slice(1));if(type==='rotate')for(const [i,a]of ['x','y','z'].entries())o.rotation[a]+=T.MathUtils.degToRad(args[i+1]);if(type==='visible')o.visible=args[1];if(type==='color')o.traverse(m=>{if(m.isMesh)m.material.color.set(args[1]);});}}}catch(e){stop('実行エラー：'+e.message);return;}busy=false;};
 dispatch({type:'init',graph});last=performance.now();tickTimer=setInterval(()=>{if(busy)return;const now=performance.now(),dt=Math.min((now-last)/1000,.1);last=now;dispatch({type:'tick',dt,key:queuedKeys.shift()});},33);
 }
 $('#open-code').textContent='◇ ノード';$('#open-code').onclick=()=>{dialog.showModal();graphEditor.refresh();};$('#close-code').onclick=()=>dialog.close();
 $('#code-example').onclick=()=>{graphEditor.example(Math.max(1,objects.indexOf(bridge.getSelected())+1));notice('移動サンプルに置き換えました。右矢印で移動して得点。Ctrl+Zで元のノードに戻せます。');};
 $('#code-run').onclick=run;$('#play-game').onclick=run;$('#stop-game').onclick=()=>stop();
 window.addEventListener('keydown',e=>{if(!running)return;if(e.key==='Escape'){e.preventDefault();stop();return;}if(e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();const key=e.key.toLowerCase();if(!keys.has(key)&&queuedKeys.length<50)queuedKeys.push(key);keys.add(key);},true);
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop('画面が非表示になったため停止しました');});
 $('#save-game').onclick=()=>{const data={format:'rippy-game',version:2,items:objects.map(bridge.encode),graph:graphEditor.save()};const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='rippy-nodes-game.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('形とノードを保存しました。');};
 $('#load-game').onclick=()=>$('#load-game-file').click();$('#load-game-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>30000000)throw Error('30MB以下のファイルを選んでください');const data=JSON.parse(await file.text());if(data.format==='rippy-game'&&data.version===1)throw Error('旧ブロック・テキスト形式は読み込めません。元のファイルはそのまま保管してください。');if(data.format!=='rippy-game'||data.version!==2||!Array.isArray(data.items)||data.items.length>1000)throw Error('ノード方式で保存したゲームを選んでください');const graph=validateGraph(data.graph,data.items.length);const next=data.items.map(bridge.decode);bridge.remember();bridge.select(null);for(const o of objects)bridge.scene.remove(o);objects.splice(0,objects.length,...next);for(const o of next)bridge.scene.add(o);graphEditor.load(graph);bridge.refreshCount();notice('形とノードを読み込みました。プレイで実行できます。');}catch(error){notice('読み込み失敗：'+error.message);}e.target.value='';};
 graphEditor=createGraphEditor($('#node-editor'),()=>objects,notice);graphEditor.example(Math.min(2,objects.length)||1);$('#open-code').disabled=false;$('#play-game').disabled=false;
}
