import {GraphRuntime} from './graph-core.js?v=20260926-studio1';
let runtime;
self.onmessage=({data})=>{try{if(data.type==='init')runtime=new GraphRuntime(data.graph,data.world.length);const commands=runtime.run(data.type==='init'?'start':'tick',data);self.postMessage({type:'done',commands,variables:Object.fromEntries(runtime.vars),trace:runtime.trace,traceEdges:runtime.traceEdges});}catch(e){self.postMessage({type:'error',message:e.message,nodeId:e.nodeId??runtime?.activeNode,trace:runtime?.trace??[],traceEdges:runtime?.traceEdges??[]});}};
