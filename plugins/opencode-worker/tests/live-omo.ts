import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { profileFixture } from './profile-fixture.js';
import { goObserver } from './go-observer.js';
if (process.env.OPENCODE_WORKER_LIVE_TEST !== '1') throw new Error('This test spends Go quota on synthetic files only');
const root = await fs.mkdtemp('/private/tmp/ocw-omo-live-'); const directory = path.join(root, 'workspace'); await fs.mkdir(directory); execFileSync('git', ['init', '-q'], { cwd: directory });
const marker = randomUUID(); await fs.writeFile(path.join(directory, 'input.txt'), marker);
const files = ['/Users/ethan/.omo/omo.jsonc', '/Users/ethan/.config/opencode/opencode.json', '/Users/ethan/.config/opencode/oh-my-openagent.json']; const originals = await Promise.all(files.map(p => fs.readFile(p)));
const observer = await goObserver();
const env = { ...process.env, OPENCODE_WORKER_STATE_DIR: path.join(root, 'state'), OPENCODE_WORKER_OMO_CONFIG: await profileFixture(directory), OPENCODE_WORKER_TEST_GO_PROXY: observer.url } as Record<string, string>;
const client = new Client({ name: 'omo-live-acceptance', version: '1' }); await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('dist/mcp.mjs')], env, stderr: 'inherit' }));
const evidence: any = { root, cases: [], wire: observer.requests };
const call = async (name: string, args: any = {}) => { const r: any = await client.callTool({ name, arguments: args }, undefined, { timeout: 360000 }); const data = JSON.parse(r.content[0].text); if (r.isError) throw new Error(JSON.stringify(data)); return data; };
const run = async (id: string, task: string, extra: any = {}) => {
  let result = await call('run', { request_id: id, directory, task, timeout_seconds: 480, wait_seconds: 300, ...extra });
  while (!result.finished && result.state !== 'unknown') result = await call('wait', { task_id: result.task_id, timeout_seconds: 300 });
  evidence.cases.push({ id, result }); await fs.writeFile(path.join(root, 'acceptance.json'), JSON.stringify(evidence, null, 2));
  console.log(id, result.state, result.reason ?? '', JSON.stringify(result.result?.sessions?.map((s: any) => ({ role: s.role, category: s.category, model: s.modelID, reasoning: s.reasoning, state: s.state }))));
  assert.equal(result.state, 'completed', result.reason); return result;
};
console.log('LIVE_ROOT', root);
try {
  if (process.env.OPENCODE_WORKER_SKIP_READER !== '1') {
  const read = await run('reader', 'Connectivity acceptance: delegate exactly one named explore task (subagent_type="explore", run_in_background=true, load_skills=[]). It must read input.txt and return its exact contents. Retrieve its result using background_output with its returned background ID. Return the exact contents. Do not read the file yourself, edit files, invoke skills or delegate other work.');
  assert.ok(read.result.sessions.some((s: any) => s.role === 'explore' && s.modelID === 'muse-spark-1.3-contributor' && s.reasoning === 'xhigh' && s.state === 'completed'));
  assert.ok(read.result.text.includes(marker));
  }
  if (process.env.OPENCODE_WORKER_LIVE_CASES === 'reader') { evidence.outcome = 'passed-reader'; }
  else {
    await fs.writeFile(path.join(directory, 'normalize.py'), 'def normalize(tags):\n    return sorted(set(tags))\n');
    const checks = 'from normalize import normalize\nassert normalize([" Blue ","red","blue","", " RED "]) == ["blue","red"]\nassert normalize([]) == []\nprint("CHECK_PASS")\n';
    await fs.writeFile(path.join(directory, 'check.py'), checks);
    const quick = await run('quick', 'Delegate exactly one foreground task(category="quick", load_skills=[]): fix normalize.py to trim, lowercase, discard empty strings and deduplicate preserving first occurrence order. Child must read check.py, modify only normalize.py and run exactly python3 check.py. Do not change the code yourself. Collect the child result and return a short summary.', { mode: 'write', writable_paths: ['normalize.py'], allowed_commands: ['python3 check.py'] });
    assert.ok(quick.result.sessions.some((s: any) => s.category === 'quick' && s.modelID === 'muse-spark-1.3-contributor'));
    assert.equal(await fs.readFile(path.join(directory, 'check.py'), 'utf8'), checks); execFileSync('python3', ['check.py'], { cwd: directory });
    await fs.writeFile(path.join(directory, 'intervals.py'), 'def merge_intervals(items):\n    return list(items)\n');
    const deepChecks = 'from intervals import merge_intervals\nx=[(5,7),(1,3),(3,4),(2,2),(9,10)]\nassert merge_intervals(x)==[(1,4),(5,7),(9,10)]\nassert x==[(5,7),(1,3),(3,4),(2,2),(9,10)]\nassert merge_intervals([])==[]\nassert merge_intervals([(2,5),(1,7),(7,8)])==[(1,8)]\ntry: merge_intervals([(4,2)])\nexcept ValueError: pass\nelse: raise AssertionError("inverted interval accepted")\nprint("DEEP_CHECK_PASS")\n';
    await fs.writeFile(path.join(directory, 'deep_check.py'), deepChecks);
    const deep = await run('deep', 'Delegate exactly one foreground task(category="deep", load_skills=[]): implement merge_intervals in intervals.py. Merge overlapping or touching closed intervals, return sorted tuples, do not mutate input, reject reversed intervals with ValueError. Child must read deep_check.py, modify only intervals.py, and run exactly python3 deep_check.py. Do not implement it yourself.', { mode: 'write', writable_paths: ['intervals.py'], allowed_commands: ['python3 deep_check.py'] });
    assert.ok(deep.result.sessions.some((s: any) => s.category === 'deep' && s.modelID === 'deepseek-flash' && s.reasoning === 'max'));
    assert.equal(await fs.readFile(path.join(directory, 'deep_check.py'), 'utf8'), deepChecks); execFileSync('python3', ['deep_check.py'], { cwd: directory });
    const oracle = await run('oracle', 'Delegate exactly one read-only task(subagent_type="oracle", load_skills=[]): read intervals.py and deep_check.py and identify whether the input-mutation and reversed-interval requirements are met. Ask it to return concise evidence, not edits or further delegation. Collect its response.');
    assert.ok(oracle.result.sessions.some((s: any) => s.role === 'oracle' && s.modelID === 'deepseek-flash'));
    evidence.outcome = 'passed';
  }
  assert.ok(observer.requests.length > 0 && observer.requests.every(r => !r.blocked && r.status === 200 && r.response_models?.includes(r.model)));
} catch (e) { evidence.outcome = 'failed'; evidence.error = String(e); throw e; }
finally {
  const s = await call('status').catch(() => undefined);
  if (s?.active_task && !s.active_task.finished) { await call('cancel', { task_id: s.active_task.task_id }); await call('wait', { task_id: s.active_task.task_id, timeout_seconds: 30 }); }
  await client.close(); await observer.close();
  evidence.global_configs_unchanged = (await Promise.all(files.map(p => fs.readFile(p)))).every((b, i) => b.equals(originals[i]));
  await fs.writeFile(path.join(root, 'acceptance.json'), JSON.stringify(evidence, null, 2));
  console.log('LIVE_RESULT', evidence.outcome, path.join(root, 'acceptance.json'));
}
