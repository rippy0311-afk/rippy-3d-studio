import {GraphRuntime} from './graph-core.js?v=20260925-collision2';
let runtime;
self.onmessage=({data})=>{try{if(data.type==='init')runtime=new GraphRuntime(data.graph,data.world.length);const commands=runtime.run(data.type==='init'?'start':'tick',data);self.postMessage({type:'done',commands,variables:Object.fromEntries(runtime.vars)});}catch(e){self.postMessage({type:'error',message:e.message});}};
