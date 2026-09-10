import { profileFixture } from './profile-fixture.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root=await fs.mkdtemp('/private/tmp/ocw-run-contract-');const directory=path.join(root,'workspace');await fs.mkdir(directory);
const env=Object.fromEntries(Object.entries(process.env).filter((e):e is [string,string]=>e[1]!==undefined));
env.OPENCODE_WORKER_OMO_CONFIG = await profileFixture(directory);
env.OPENCODE_WORKER_STATE_DIR=path.join(root,'state');env.OPENCODE_WORKER_BIN=path.resolve('tests/fake-opencode.mjs');env.OPENCODE_WORKER_FAKE_DB=path.join(root,'db');
const client=new Client({name:'run-contract',version:'1'});await client.connect(new StdioClientTransport({command:process.execPath,args:[path.resolve('dist/mcp.mjs')],env,stderr:'inherit'}));
const call=async(name:string,args:any={})=>{const r:any=await client.callTool({name,arguments:args});assert.equal(r.isError,undefined,JSON.stringify(r));return JSON.parse(r.content[0].text);};
try{
 const args={request_id:'normal',directory,task:'FAKE_NORMAL',timeout_seconds:30,wait_seconds:10};
 const first=await call('run',args);assert.equal(first.state,'completed');assert.equal(first.wait_expired,false);
 const repeated=await call('run',args);assert.equal(repeated.task_id,first.task_id);
 const next=await call('followup',{task_id:first.task_id,request_id:'next',task:'FAKE_NORMAL',wait_seconds:10});assert.equal(next.turn,2);assert.equal(next.state,'completed');
 const old=await call('run',args);assert.equal(old.turn,1);assert.equal(old.request_id,'normal');
 const failed=await call('run',{...args,request_id:'fail',task:'FAKE_MODEL_ERROR'});assert.equal(failed.state,'failed');assert.equal(failed.finished,true);
 const expired=await call('run',{...args,request_id:'window',task:'FAKE_STALL',wait_seconds:1});assert.equal(expired.wait_expired,true);assert.equal(expired.finished,false);
 await call('cancel',{task_id:expired.task_id});assert.equal((await call('wait',{task_id:expired.task_id,timeout_seconds:10})).state,'cancelled');
 const controller=new AbortController();
 const pending=client.callTool({name:'run',arguments:{...args,request_id:'abort-wait',task:'FAKE_STALL'}},undefined,{signal:controller.signal}).then(()=>false,()=>true);
 let active;
 for(let i=0;i<30;i++){active=(await call('status')).active_task;if(active?.request_id==='abort-wait'&&active.state==='running')break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(active.request_id,'abort-wait');controller.abort();assert.equal(await pending,true);
 const still=await call('status',{task_id:active.task_id});assert.equal(still.finished,false);
 await call('cancel',{task_id:active.task_id});assert.equal((await call('wait',{task_id:active.task_id,timeout_seconds:10})).state,'cancelled');
 console.log('RUN_CONTRACT_PASS',root);
}finally{await client.close();}
