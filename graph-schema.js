export const KEYS=[['すべてのキー','*'],['→ 右矢印','ArrowRight'],['← 左矢印','ArrowLeft'],['↑ 上矢印','ArrowUp'],['↓ 下矢印','ArrowDown'],['Tab','Tab'],['Space',' '],['Enter','Enter'],['Backspace','Backspace'],['Delete','Delete'],['Shift','Shift'],...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ',c=>[c,c.toLowerCase()]),...Array.from('0123456789',c=>[c,c]),...Array.from({length:94},(_,i)=>String.fromCharCode(i+33)).filter(c=>!/[a-z0-9]/i.test(c)).map(c=>[c,c])];
export const POINTER_EVENTS=[['クリック／タップ','click'],['ダブルクリック','dblclick'],['ボタンを押す','mousedown'],['ボタンを離す','mouseup'],['押している間','held'],['ポインターが入る','mouseover'],['ポインターが出る','mouseout'],['領域に入る','mouseenter'],['領域から出る','mouseleave'],['上にいる間','hover'],['ポインター移動','mousemove'],['ホイール','wheel'],['タッチ開始','touchstart'],['タッチ移動','touchmove'],['タッチ終了','touchend'],['ドラッグ開始','dragstart'],['ドラッグ中','drag'],['ドラッグ終了','dragend']];
export const UI_EVENTS=[...POINTER_EVENTS.filter(([,v])=>!['held','hover','drag','dragstart','dragend'].includes(v)),['入力中','input'],['値を変更','change'],['送信','submit'],['フォーカス','focus'],['フォーカスが外れる','blur'],['フォーカスが入る','focusin'],['フォーカスが出る','focusout'],['キーを押す','keydown'],['キーを離す','keyup'],['文字キー','keypress']];
export const CONTEXT=[['イベントの対象','target'],['イベントの相手','other'],['作成した形','created'],['イベントの値／回答','value'],['押されたキー','key'],['ポインターX(px)','x'],['ポインターY(px)','y'],['指している3D座標X','worldX'],['指している3D座標Y','worldY'],['指している3D座標Z','worldZ'],['移動量X(px)','dx'],['移動量Y(px)','dy'],['ホイール量','wheel'],['マウスボタン','button'],['経過秒','time'],['前フレームからの秒数','dt'],['繰り返し番号','index'],['得点','score']];
const f=(key,label,kind='number',options)=>({key,label,kind,options});
const key=f('key','キー','select',KEYS),target=f('target','対象の形','target'),other=f('other','相手の形','target'),amount=f('amount','数値'),name=f('name','名前','name'),value=f('value','値','value');
const xyz=[target,f('x','X'),f('y','Y'),f('z','Z')],perSecond=f('perSecond','毎秒の量として使う','boolean');
const conditions=[['キーを押している','key'],['2つの形が重なる','touching'],['得点が指定値以上','score'],['値を比較する','compare']];
const comparisons=[['＝','eq'],['≠','ne'],['＞','gt'],['≧','gte'],['＜','lt'],['≦','lte'],['両方true','and'],['どちらかtrue','or']];
const conditionFields=[f('condition','条件','select',conditions),key,target,other,amount,f('a','左の値','value'),f('op','比較','select',comparisons),f('b','右の値','value')];
const conditionDefaults={condition:'compare',key:'ArrowRight',target:1,other:2,amount:10,a:0,op:'gte',b:1};
const make=(name,group,defaults,fields=[],extra={})=>({name,group,defaults,fields,...extra});
const event=(name,defaults={},fields=[])=>make(name,'イベント',defaults,fields,{event:true});
export const TYPES={
 setup:make('最初の定義','初期設定',{player:0,movers:[],view:'back',forward:'-z',controls:'both',speed:4,distance:6,height:1,eyeHeight:.7,sensitivity:1,turn:true,collision:true},[f('player','プレイヤー（0＝なし）','playerTarget'),f('movers','追加の操作対象（複数選択）','targets'),f('view','プレイヤー視点','select',[['三人称（後方）','back'],['三人称（前方）','front'],['一人称','first']]),f('forward','プレイヤーの前（ローカル軸）','select',[['−Z','-z'],['＋Z','+z'],['＋X','+x'],['−X','-x']]),f('controls','移動キー','select',[['WASD＋矢印','both'],['WASD','wasd'],['矢印','arrows'],['なし（ノードで移動）','none']]),f('speed','移動速度 m/秒','setting'),f('distance','三人称の距離 m','setting'),f('height','三人称の注視点の高さ m','setting'),f('eyeHeight','一人称の目の高さ m','setting'),f('sensitivity','視点の感度','setting'),f('turn','移動方向にプレイヤーを向ける','boolean'),f('collision','形どうしの衝突を有効にする','boolean')],{event:true}),
 start:event('開始したとき'),tick:event('毎フレーム'),key:event('キーを押したとき',{key:'ArrowRight'},[key]),keyup:event('キーを離したとき',{key:'ArrowRight'},[key]),keyheld:event('キーを押している間',{key:'ArrowRight'},[key]),keypress:event('文字キーを入力したとき',{key:'*'},[key]),
 pointer:event('マウス・タッチ・ドラッグ・押している間',{kind:'click',target:0,button:-1},[f('kind','操作','select',POINTER_EVENTS),f('target','対象（0＝画面全体）','eventTarget'),f('button','ボタン','select',[['すべて',-1],['左',0],['中',1],['右',2]])]),
 collision:event('接触したとき・離れたとき',{target:1,other:2,phase:'enter'},[target,other,f('phase','タイミング','select',[['触れ始めた','enter'],['触れている間','stay'],['離れた','exit'],['触れていない間','outside']])]),
 timer:event('時間が経過したとき',{name:'timer1',seconds:1,mode:'repeat'},[name,f('seconds','秒'),f('mode','実行','select',[['繰り返し','repeat'],['一度だけ','once']])]),
 condition_event:event('条件を満たしたとき',{...conditionDefaults,mode:'once'},[...conditionFields,f('mode','実行','select',[['成立した瞬間','once'],['成立している間','repeat']])]),
 ui_event:event('画面のUIを操作したとき',{ui:'button1',kind:'click'},[f('ui','UIのID（*＝すべて）','name'),f('kind','操作','select',UI_EVENTS)]),
 message_event:event('自作イベントを受け取ったとき',{name:'event1'},[name]),
 variable_event:event('変数が変わったとき',{name:'value'},[name]),
 created:event('形が作成されたとき',{target:0},[f('target','対象（0＝すべて）','eventTarget')]),
 answer:event('質問に回答したとき',{name:'answer'},[name]),all_answers:event('すべての質問に回答したとき'),
 move:make('移動する','形',{target:1,x:1,y:0,z:0,perSecond:false},[...xyz,perSecond]),rotate:make('回転する','形',{target:1,x:0,y:15,z:0,perSecond:false},[...xyz,perSecond]),position:make('位置を設定','形',{target:1,x:0,y:0,z:0},xyz),
 color:make('色を変える','形',{target:1,color:'#ff5555'},[target,f('color','色','color')]),show:make('表示する','形',{target:1},[target]),hide:make('隠す','形',{target:1},[target]),clone:make('形を複製する','形',{target:1,x:1,y:0,z:0},xyz),
 score:make('得点を増やす','ゲーム',{amount:1},[amount]),say:make('メッセージを表示','ゲーム',{text:'ゲームスタート！'},[f('text','メッセージ','value')]),
 branch:make('if（もし〜なら）','条件',{...conditionDefaults,condition:'key'},conditionFields,{ports:['yes','no']}),
 variable:make('変数を設定・変更','変数・計算',{name:'value',mode:'set',value:0},[name,f('mode','操作','select',[['代入','set'],['加算','add'],['減算','subtract']]),value]),
 math:make('計算して変数に保存','変数・計算',{name:'result',a:0,op:'add',b:1},[name,f('a','値A','value'),f('op','計算','select',[['A＋B','add'],['A−B','subtract'],['A×B','multiply'],['A÷B','divide'],['A%B','mod'],['AのB乗','power'],['小さい方','min'],['大きい方','max'],['A〜Bの整数乱数','random'],['Aの四捨五入','round'],['Aの切り捨て','floor'],['Aの絶対値','abs'],['文字列をつなぐ','concat']]),f('b','値B','value')]),
 timer_control:make('タイマーを停止・再開','制御',{name:'timer1',mode:'stop'},[name,f('mode','操作','select',[['停止','stop'],['最初から再開','restart']])]),
 repeat:make('指定回数くり返す','制御',{count:3},[f('count','回数')],{ports:['body','next']}),wait:make('決めた秒数待つ','制御',{seconds:1},[f('seconds','秒')]),
 broadcast:make('自作イベントを送る','制御',{name:'event1',value:0},[name,value]),
 function:make('関数を定義','制御',{name:'function1'},[name],{event:true}),call:make('関数を呼ぶ','制御',{name:'function1',value:0},[name,value]),
 prompt:make('質問する','画面UI',{name:'answer',text:'名前を入力してください'},[name,f('text','質問文','value')]),
 ui_create:make('画面UIを作る','画面UI',{ui:'button1',kind:'button',text:'ボタン',value:'',options:'A,B,C'},[f('ui','UIのID','name'),f('kind','種類','select',[['ボタン','button'],['入力欄','text'],['複数行入力','textarea'],['数値入力','number'],['チェック','checkbox'],['スライダー(0〜100)','slider'],['選択欄','select'],['表示テキスト','label'],['入力＋送信フォーム','form']]),f('text','表示名','value'),value,f('options','選択肢（カンマ区切り）','text')]),
 ui_set:make('画面UIを変更','画面UI',{ui:'button1',property:'text',value:'変更後'},[f('ui','UIのID','name'),f('property','設定','select',[['表示テキスト','text'],['入力値','value'],['表示(true/false)','visible'],['有効(true/false)','enabled']]),value]),
};
export const outputs=n=>TYPES[n.type]?.ports??['next'];
