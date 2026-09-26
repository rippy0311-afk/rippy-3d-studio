import {UI_KINDS,validateUILayout,placeUI,overlapsUI,freeUIPosition} from './ui-layout.js?v=20260926-studio1';
export function createUILayoutEditor(viewport,inspector,onToggle,onSave=()=>{}){
 let items=[],selected=null,active=false,history=[],drag=null;
 const layer=document.createElement('div');layer.id='ui-design-layer';layer.hidden=true;viewport.append(layer);
 const panel=document.createElement('section');panel.id='ui-inspector';panel.hidden=true;inspector.append(panel);
 const bar=document.createElement('div');bar.id='ui-design-bar';bar.hidden=true;
 bar.innerHTML='<b>画面UIを配置</b><select aria-label="追加するUIの種類"></select><button type="button" data-add>＋ 追加</button><button type="button" data-undo>戻す</button><button type="button" data-save>ゲームを保存</button><button type="button" data-done>配置を完了</button><small>ドラッグで移動・右下の↘でサイズ変更</small><span data-feedback role="status"></span>';
 viewport.parentElement.prepend(bar);
 const kinds=bar.querySelector('select');for(const [value,text]of Object.entries(UI_KINDS)){const option=document.createElement('option');option.value=value;option.textContent=text;kinds.append(option);}
 const snapshot=()=>{history.push(structuredClone(items));if(history.length>100)history.shift();bar.querySelector('[data-undo]').disabled=false;};
 const current=()=>items.find(i=>i.id===selected);
 function unique(){let i=1;while(items.some(item=>item.id==='ui'+i))i++;return 'ui'+i;}
 function draw(){
  layer.replaceChildren();
  for(const item of items){const el=document.createElement('div');el.className='ui-design-item'+(item.id===selected?' selected':'');el.tabIndex=0;el.dataset.uiId=item.id;el.setAttribute('role','button');el.setAttribute('aria-label','配置UI '+item.id);placeUI(el,item);
   const preview=document.createElement('span');preview.className='ui-design-preview '+item.kind;preview.textContent=item.kind==='checkbox'?'☐ '+item.text:item.kind==='slider'?item.text+' ━━━●━━':item.text||UI_KINDS[item.kind];
   const tag=document.createElement('small');tag.textContent=item.id;const handle=document.createElement('span');handle.className='ui-resize';handle.setAttribute('aria-label','サイズ変更');handle.title='ドラッグして幅・高さを変更';handle.textContent='↘';el.append(preview,tag,handle);layer.append(el);
   el.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();selected=item.id;snapshot();const rect=layer.getBoundingClientRect();drag={id:item.id,start:{...item},x:e.clientX,y:e.clientY,rect,resize:e.target===handle};el.setPointerCapture?.(e.pointerId);layer.querySelectorAll('.ui-design-item').forEach(n=>n.classList.toggle('selected',n===el));properties();};
   el.onpointermove=e=>{if(!drag||drag.id!==item.id)return;const dx=(e.clientX-drag.x)/drag.rect.width*100,dy=(e.clientY-drag.y)/drag.rect.height*100,s=drag.start,next={...item};if(drag.resize){next.w=Math.max(3,Math.min(100-item.x,s.w+dx));next.h=Math.max(3,Math.min(100-item.y,s.h+dy));}else{next.x=Math.max(0,Math.min(100-item.w,s.x+dx));next.y=Math.max(0,Math.min(100-item.h,s.y+dy));}if(!items.some(o=>o!==item&&overlapsUI(next,o))){Object.assign(item,next);placeUI(el,item);bar.querySelector('[data-feedback]').textContent='';}else bar.querySelector('[data-feedback]').textContent='ほかのUIと重なるため、ここには配置できません';};
   const finish=()=>{if(!drag)return;drag=null;properties();};el.onpointerup=finish;el.onpointercancel=finish;
   el.onclick=()=>{selected=item.id;properties();};
  }
  bar.querySelector('[data-undo]').disabled=!history.length;
 }
 function properties(){
  panel.replaceChildren();const title=document.createElement('h2');title.textContent='UIの設定';panel.append(title);
  const help=document.createElement('p');help.textContent='画面の部品を選んで編集します。位置とサイズは画面に対する割合（%）です。';panel.append(help);
  const item=current();if(!item)return;
  for(const [key,label]of [['w','幅 %'],['h','高さ %'],['x','左から %'],['y','上から %'],['text','表示する文字'],['id','UIのID'],['value','初期値'],['options','選択肢（カンマ区切り）']]){
   const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.setAttribute('aria-label','配置UI '+label);input.value=typeof item[key]==='number'?Number(item[key].toFixed(2)):item[key];input.type=['x','y','w','h'].includes(key)?'number':'text';input.step='.1';row.append(input);panel.append(row);
   input.onchange=()=>{const next={...item,[key]:input.type==='number'?Number(input.value):input.value};try{validateUILayout(items.map(i=>i===item?next:i));snapshot();Object.assign(item,next);selected=item.id;draw();properties();}catch(e){message.textContent=e.message;input.value=item[key];}};
  }
  const hint=document.createElement('p');hint.textContent='ノード「画面のUIを操作したとき」のUIのIDに「'+item.id+'」を指定すると、この部品の操作に処理をつなげられます。';panel.append(hint);
  const message=document.createElement('p');message.setAttribute('role','status');panel.append(message);
  const copy=document.createElement('button');copy.textContent='UIを複製';copy.onclick=()=>{if(items.length>=50)return;const next=freeUIPosition({...item,id:unique()},items);if(!next){message.textContent='この大きさのUIを置く空きがありません';return;}snapshot();items.push(next);selected=next.id;draw();properties();};
  const remove=document.createElement('button');remove.textContent='UIを削除';remove.onclick=()=>{snapshot();items=items.filter(i=>i!==item);selected=null;draw();properties();};panel.append(copy,remove);
 }
 bar.querySelector('[data-add]').onclick=()=>{if(items.length>=50)return;const kind=kinds.value,base={id:unique(),kind,text:UI_KINDS[kind],value:'',options:'A,B,C',x:10,y:25,w:25,h:12};const item=freeUIPosition(base,items);if(!item){bar.querySelector('[data-feedback]').textContent='この大きさのUIを置く空きがありません';return;}snapshot();items.push(item);selected=item.id;draw();properties();};
 function undo(){if(!history.length)return;items=history.pop();selected=items.some(i=>i.id===selected)?selected:null;draw();properties();}
 bar.querySelector('[data-save]').onclick=onSave;bar.querySelector('[data-undo]').onclick=undo;bar.querySelector('[data-done]').onclick=()=>api.close();
 // Capture before the 3D editor's shortcuts so Delete/undo never affect the scene.
 window.addEventListener('keydown',e=>{if(!active)return;if(e.target.matches('input,textarea,select'))return;e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();api.close();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}else if(e.key==='Delete'&&current()){e.preventDefault();snapshot();items=items.filter(i=>i.id!==selected);selected=null;draw();properties();}},true);
 const api={open(){if(active)return;active=true;layer.hidden=panel.hidden=bar.hidden=false;document.body.classList.add('ui-designing');onToggle(true);draw();properties();},close(){if(!active)return;active=false;drag=null;layer.hidden=panel.hidden=bar.hidden=true;document.body.classList.remove('ui-designing');onToggle(false);},save:()=>structuredClone(items),load(value){items=validateUILayout(value);history=[];selected=null;draw();properties();}};
 return api;
}
