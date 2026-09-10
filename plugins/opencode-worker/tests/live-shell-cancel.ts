import { profileFixture } from './profile-fixture.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { execFileSync } from 'node:child_process';
if (process.env.OPENCODE_WORKER_LIVE_TEST !== '1') throw new Error('Explicit live-test opt-in required');
const root=await fs.mkdtemp('/private/tmp/ocw-shell-cancel-');const directory=path.join(root,'workspace');await fs.mkdir(directory);execFileSync('git',['init','-q'],{cwd:directory});
await fs.writeFile(path.join(directory,'slow_check.py'),'from pathlib import Path\nimport time\nPath("started.txt").write_text("started")\ntime.sleep(12)\nPath("late.txt").write_text("late")\n');
const env=Object.fromEntries(Object.entries(process.env).filter((e):e is [string,string]=>e[1]!==undefined));env.OPENCODE_WORKER_OMO_CONFIG = await profileFixture(directory);
env.OPENCODE_WORKER_STATE_DIR=path.join(root,'state');
const client=new Client({name:'shell-cancel-acceptance',version:'1'});await client.connect(new StdioClientTransport({command:process.execPath,args:[path.resolve('dist/mcp.mjs')],env,stderr:'inherit'}));
const call=async(name:string,args:any={})=>{const r:any=await client.callTool({name,arguments:args});assert.equal(r.isError,undefined,JSON.stringify(r));return JSON.parse(r.content[0].text);};
let task:any;const evidence:any={root};
try{
 task=await call('start',{request_id:'shell-cancel',directory,mode:'write',writable_paths:['started.txt','late.txt'],allowed_commands:['python3 slow_check.py'],timeout_seconds:90,task:'Run exactly python3 slow_check.py using the bash tool. This is an authorized foreground-command cancellation test. Do not edit the script or other files and do not delegate. Report actual outcome.'});
 let started=false;
 for(let i=0;i<180;i++){started=await fs.stat(path.join(directory,'started.txt')).then(()=>true,()=>false);if(started)break;const s=await call('status',{task_id:task.task_id});if(s.finished)throw new Error(JSON.stringify(s));await new Promise(r=>setTimeout(r,500));}
 assert.equal(started,true,'shell did not start');await call('cancel',{task_id:task.task_id});
 let done:any;
 for(let i=0;i<10;i++){done=await call('wait',{task_id:task.task_id,timeout_seconds:3});if(done.finished)break;}
 assert.equal(done.state,'cancelled');assert.equal(done.finished,true);
 await new Promise(r=>setTimeout(r,13000));
 const late=await fs.stat(path.join(directory,'late.txt')).then(()=>true,()=>false);assert.equal(late,false,'cancelled command wrote its delayed file');
 evidence.result=done;evidence.late_file_absent_after_13_seconds=true;evidence.outcome='passed';console.log('SHELL_CANCEL_PASS',root);
}catch(e){evidence.outcome='failed';evidence.error=String(e);throw e;}
finally{if(task){const s=await call('status',{task_id:task.task_id});if(!s.finished){await call('cancel',{task_id:task.task_id});await call('wait',{task_id:task.task_id,timeout_seconds:30});}}await fs.writeFile(path.join(root,'acceptance.json'),JSON.stringify(evidence,null,2));await client.close();}
