import {GraphRuntime} from './graph-core.js';
let runtime;
self.onmessage=({data})=>{try{let commands=[];if(data.type==='init'){runtime=new GraphRuntime(data.graph,data.world.length);commands=runtime.run('start',data);}else{if(data.key)commands.push(...runtime.run('key',data));commands.push(...runtime.run('tick',data));}self.postMessage({type:'done',commands});}catch(e){self.postMessage({type:'error',message:e.message});}};
