export const UI_KINDS={button:'ボタン',label:'文字',text:'入力欄',number:'数値入力',checkbox:'チェック',slider:'スライダー',select:'選択欄',textarea:'複数行入力'};
export function validateUILayout(value=[]){
 if(!Array.isArray(value)||value.length>50)throw Error('画面UIは50個までです');
 const ids=new Set();
 const result=value.map(item=>{
  if(!item||typeof item.id!=='string'||!/^[-a-zA-Z0-9_]{1,64}$/.test(item.id)||ids.has(item.id))throw Error('UIのIDは重複しない半角英数字・_・-にしてください');
  ids.add(item.id);if(!Object.hasOwn(UI_KINDS,item.kind))throw Error('UIの種類が不正です');
  const result={id:item.id,kind:item.kind};
  for(const k of ['text','value','options']){if(typeof item[k]!=='string'||item[k].length>500)throw Error('UIの文字は500文字以内です');result[k]=item[k];}
  for(const k of ['x','y','w','h']){const n=item[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>100||(['w','h'].includes(k)&&n<3))throw Error('UIの位置・サイズが不正です');result[k]=n;}
  if(result.x+result.w>100.001||result.y+result.h>100.001)throw Error('UIを画面内に配置してください');
  return result;
 });
 for(let i=0;i<result.length;i++)if(result.slice(i+1).some(other=>overlapsUI(result[i],other)))throw Error('UI同士が重なっています。空いている場所に配置してください');
 return result;
}
export function placeUI(element,item){Object.assign(element.style,{position:'absolute',left:item.x+'%',top:item.y+'%',width:item.w+'%',height:item.h+'%',boxSizing:'border-box'});}

export function overlapsUI(a,b){return a.x<b.x+b.w-1e-7&&a.x+a.w>b.x+1e-7&&a.y<b.y+b.h-1e-7&&a.y+a.h>b.y+1e-7;}
export function freeUIPosition(item,others){
 if(!others.some(o=>overlapsUI(item,o)))return {...item};
 const xs=[0,...others.map(o=>o.x+o.w)],ys=[0,...others.map(o=>o.y+o.h)];
 for(const y of ys.sort((a,b)=>a-b))for(const x of xs.sort((a,b)=>a-b)){const next={...item,x,y};if(x+item.w<=100&&y+item.h<=100&&!others.some(o=>overlapsUI(next,o)))return next;}
 return null;
}
