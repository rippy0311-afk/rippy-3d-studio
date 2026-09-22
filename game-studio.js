import * as T from 'three';
export function initGameStudio(bridge){
 const $=s=>document.querySelector(s),{objects}=bridge;
 const dialog=document.createElement('dialog');dialog.id='code-dialog';dialog.setAttribute('aria-labelledby','code-title');
 dialog.innerHTML=`<div class="code-heading"><div><span class="eyebrow">GAME LOGIC</span><h2 id="code-title">ゲームの動きを作る</h2></div><button id="close-code" aria-label="コードを閉じる">✕</button></div><div class="code-actions"><label>作り方 <select id="code-language"><option value="blocks">ブロック</option><option value="javascript">JavaScript</option><option value="python">Python</option></select></label><button id="code-example">矢印キーのサンプルを読み込む</button><button id="code-convert">ブロックをJS欄へコピー</button><button id="code-run">▶ このコードでプレイ</button></div><div class="code-layout"><div class="code-edit"><div id="block-editor"></div><textarea id="text-code" aria-label="ゲームのコード" spellcheck="false" hidden></textarea></div><aside class="code-guide"><h3>オブジェクト番号</h3><div id="code-objects"></div><h3>使い方</h3><p>イベントの中に動きをつなげます。プレイ中は矢印キーなどで操作。停止すると元の配置に戻ります。</p><p>ブロック・JS・Pythonの原稿は別々に保持します。実行するのは選択中の1種類です。</p><details><summary>JS / Python 共通API</summary><pre>on_start(関数)
on_key("ArrowRight", 関数)
on_tick(関数)  # 引数 dt は秒
move(番号, x, y, z)
rotate(番号, x度, y度, z度)
set_position(番号, x, y, z)
set_color(番号, "#ff0000")
hide(番号) / show(番号)
add_score(数) / get_score()
say("メッセージ")
key_down("ArrowRight")
touching(番号, 番号)
get_x(番号) / get_y / get_z</pre><p>touching は外接する箱の重なり判定です。物理演算はありません。座標の取得・判定はフレーム開始時点です。</p></details></aside></div><p id="code-notice" role="status">準備しています…</p><div class="code-actions"><button id="save-game">↓ ゲームを保存</button><button id="load-game">ゲームを読み込む</button><input id="load-game-file" type="file" accept=".json" hidden><span>形と3種類のコードをまとめてJSON保存</span></div>`;
 document.body.append(dialog);
 const hud=document.createElement('div');hud.id='game-hud';hud.hidden=true;hud.innerHTML='<b id="game-score">得点：0</b><span id="game-message">準備中…</span><small>Escで停止</small>';$('#viewport').append(hud);
 let blocks,language='blocks',drafts={javascript:'',python:''},worker,busy=false,timer,tickTimer,running=false,keys=new Set(),before,oldSelection,cameraState,queuedKeys=[],last=0;
 const notice=message=>{$('#code-notice').textContent=message;};
 const state=()=>objects.map(o=>{const box=new T.Box3().setFromObject(o);return{position:o.position.toArray(),visible:o.visible,min:box.min.toArray(),max:box.max.toArray()};});
 const stash=()=>{if(language!=='blocks')drafts[language]=$('#text-code').value;};
 const list=()=>{$('#code-objects').replaceChildren(...objects.map((o,i)=>{const div=document.createElement('div');div.textContent=(i+1)+'：'+o.userData.label;return div;}));};
 function stop(message='停止しました。編集時の状態に戻りました'){
 if(!running)return;running=false;clearTimeout(timer);clearInterval(tickTimer);worker?.terminate();worker=null;busy=false;keys.clear();queuedKeys=[];
 objects.forEach((o,i)=>{const s=before[i];o.position.fromArray(s.position);o.rotation.fromArray(s.rotation);o.scale.fromArray(s.scale);o.visible=s.visible;let c=0;o.traverse(m=>{if(m.isMesh)m.material.color.setHex(s.colors[c++]);});});
 bridge.camera.position.copy(cameraState.position);bridge.orbit.target.copy(cameraState.target);bridge.setEditing(true);bridge.select(oldSelection);$('#play-game').hidden=false;$('#stop-game').hidden=true;hud.hidden=true;$('#status').textContent=message;
 }
 function dispatch(data,timeout=2000){busy=true;worker.postMessage({...data,world:state(),keys:[...keys]});clearTimeout(timer);timer=setTimeout(()=>stop('処理が長すぎるため停止しました。繰り返しを確認してください。'),timeout);}
 function run(){
 if(running)return;stash();let code;try{code=language==='blocks'?blocks.code():drafts[language];if(!code.trim())throw Error('コードまたはイベントブロックを追加してください');}catch(e){notice(e.message);return;}
 oldSelection=bridge.getSelected();objects.forEach(bridge.centerPivot);before=objects.map(o=>{const colors=[];o.traverse(m=>{if(m.isMesh)colors.push(m.material.color.getHex());});return{position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),visible:o.visible,colors};});cameraState={position:bridge.camera.position.clone(),target:bridge.orbit.target.clone()};
 bridge.select(null);bridge.setEditing(false);dialog.close();running=true;hud.hidden=false;$('#game-score').textContent='得点：0';$('#game-message').textContent=language==='python'?'Pythonを準備中…（初回は少し時間がかかります）':'ゲーム開始';$('#play-game').hidden=true;$('#stop-game').hidden=false;$('#stop-game').focus();
 worker=new Worker(new URL('./game-worker.js',import.meta.url));
 worker.onerror=e=>stop('実行エラー：'+e.message);
 worker.onmessage=({data})=>{if(!running)return;if(data.type==='progress'){$('#game-message').textContent=data.message;return;}clearTimeout(timer);if(data.type==='error'){stop('コードエラー：'+data.message);notice(data.message);return;}try{for(const {type,args}of data.commands){const o=objects[args[0]-1];if(type==='score')$('#game-score').textContent='得点：'+args[0];else if(type==='say')$('#game-message').textContent=args[0];else if(o){if(type==='move')o.position.add(new T.Vector3(...args.slice(1)));if(type==='position')o.position.set(...args.slice(1));if(type==='rotate')for(const [i,a]of ['x','y','z'].entries())o.rotation[a]+=T.MathUtils.degToRad(args[i+1]);if(type==='visible')o.visible=args[1];if(type==='color')o.traverse(m=>{if(m.isMesh)m.material.color.set(args[1]);});}}}catch(e){stop('実行エラー：'+e.message);return;}busy=false;if($('#game-message').textContent.startsWith('Python'))$('#game-message').textContent='ゲーム開始';};
 dispatch({type:'init',language,code},language==='python'?60000:2000);last=performance.now();tickTimer=setInterval(()=>{if(busy)return;const now=performance.now(),dt=Math.min((now-last)/1000,.1);last=now;dispatch({type:'tick',dt,key:queuedKeys.shift()});},33);
 }
 const showLanguage=()=>{const isBlocks=language==='blocks';$('#block-editor').hidden=!isBlocks;$('#text-code').hidden=isBlocks;if(!isBlocks)$('#text-code').value=drafts[language];$('#code-convert').hidden=!isBlocks;if(isBlocks)requestAnimationFrame(()=>blocks.resize());};
 $('#open-code').onclick=()=>{list();dialog.showModal();showLanguage();};$('#close-code').onclick=()=>{stash();dialog.close();};dialog.addEventListener('cancel',stash);
 $('#code-language').onchange=e=>{stash();language=e.target.value;showLanguage();};
 $('#code-example').onclick=()=>{const id=Math.max(1,objects.indexOf(bridge.getSelected())+1);if(language==='blocks')blocks.example(id);else{drafts[language]=language==='python'?`def start():\n    say("矢印キーで移動！")\non_start(start)\n\ndef update(dt):\n    if key_down("ArrowRight"):\n        move(${id}, 3 * dt, 0, 0)\n    if key_down("ArrowLeft"):\n        move(${id}, -3 * dt, 0, 0)\n    if key_down("ArrowUp"):\n        move(${id}, 0, 0, -3 * dt)\n    if key_down("ArrowDown"):\n        move(${id}, 0, 0, 3 * dt)\non_tick(update)\n\ndef point():\n    add_score(1)\non_key(" ", point)\n`:`on_start(() => say("矢印キーで移動！"));\non_tick(dt => {\n  if (key_down("ArrowRight")) move(${id}, 3 * dt, 0, 0);\n  if (key_down("ArrowLeft")) move(${id}, -3 * dt, 0, 0);\n  if (key_down("ArrowUp")) move(${id}, 0, 0, -3 * dt);\n  if (key_down("ArrowDown")) move(${id}, 0, 0, 3 * dt);\n});\non_key(" ", () => add_score(1));\n`;showLanguage();}notice('現在の原稿にサンプルを読み込みました。対象は形 '+id+'。テキスト版はスペースで得点。');};
 $('#code-convert').onclick=()=>{drafts.javascript=blocks.code();language='javascript';$('#code-language').value=language;showLanguage();notice('ブロックの内容をJavaScript欄へコピーしました。');};
 $('#code-run').onclick=run;$('#play-game').onclick=run;$('#stop-game').onclick=()=>stop();
 window.addEventListener('keydown',e=>{if(!running)return;if(e.key==='Escape'){e.preventDefault();stop();return;}if(e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();const key=e.key.toLowerCase();if(!keys.has(key)&&queuedKeys.length<50)queuedKeys.push(key);keys.add(key);},true);
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop('画面が非表示になったため停止しました');});
 $('#save-game').onclick=()=>{stash();const data={format:'rippy-game',version:1,items:objects.map(bridge.encode),language,drafts,blocks:blocks.save()};const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='rippy-game.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('形とコードを保存しました。');};
 $('#load-game').onclick=()=>$('#load-game-file').click();$('#load-game-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>30000000)throw Error('30MB以下のファイルを選んでください');const data=JSON.parse(await file.text());if(data.format!=='rippy-game'||data.version!==1||!Array.isArray(data.items)||data.items.length>1000||!['blocks','javascript','python'].includes(data.language)||typeof data.drafts?.javascript!=='string'||typeof data.drafts?.python!=='string'||!data.blocks)throw Error('Rippyのゲーム保存ファイルを選んでください');const next=data.items.map(bridge.decode);const previousBlocks=blocks.save();try{blocks.load(data.blocks);}catch(e){blocks.load(previousBlocks);throw e;}bridge.remember();bridge.select(null);for(const o of objects)bridge.scene.remove(o);objects.splice(0,objects.length,...next);for(const o of next)bridge.scene.add(o);drafts=data.drafts;language=data.language;$('#code-language').value=language;showLanguage();bridge.refreshCount();list();notice('ゲームを読み込みました。プレイで実行できます。');}catch(error){notice('読み込み失敗：'+error.message);}e.target.value='';};
 import('./game-blocks.js').then(({createBlocks})=>{blocks=createBlocks($('#block-editor'),()=>objects);blocks.example(Math.min(2,objects.length)||1);$('#open-code').disabled=false;$('#play-game').disabled=false;notice('サンプル：右矢印で移動して得点。イベントにつなげたブロックが動きます。');}).catch(e=>notice('ブロックの読み込みに失敗しました：'+e.message));
}
