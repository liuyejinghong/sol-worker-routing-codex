import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { profileFixture } from './profile-fixture.js';
import { goObserver } from './go-observer.js';
if (process.env.OPENCODE_WORKER_LIVE_TEST !== '1') throw new Error('Synthetic live test requires explicit Go authorization');
const root = await fs.mkdtemp('/private/tmp/ocw-tree-safety-'); const directory = path.join(root, 'workspace'); await fs.mkdir(directory); execFileSync('git', ['init', '-q'], { cwd: directory });
await fs.writeFile(path.join(directory, 'hold.py'), 'import time\nfrom pathlib import Path\nprint("SHELL_STARTED", flush=True)\ntime.sleep(12)\nPath("late.txt").write_text("UNEXPECTED_AFTER_CANCEL")\n');
const configFiles = ['/Users/ethan/.omo/omo.jsonc', '/Users/ethan/.config/opencode/opencode.json', '/Users/ethan/.config/opencode/oh-my-openagent.json'];
const before = await Promise.all(configFiles.map(f => fs.readFile(f)));
const observer = await goObserver();
const env = { ...process.env, OPENCODE_WORKER_STATE_DIR: path.join(root, 'state'), OPENCODE_WORKER_OMO_CONFIG: await profileFixture(directory), OPENCODE_WORKER_TEST_GO_PROXY: observer.url } as Record<string, string>;
const client = new Client({ name: 'tree-safety', version: '1' }); await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('dist/mcp.mjs')], env, stderr: 'inherit' }));
const evidence: any = { root, wire: observer.requests, cases: [] };
const call = async (name: string, args: any = {}) => { const r: any = await client.callTool({ name, arguments: args }, undefined, { timeout: 360000 }); if (r.isError) throw new Error(JSON.stringify(r)); return JSON.parse(r.content[0].text); };
console.log('SAFETY_ROOT', root);
try {
  let denied = await call('run', { request_id: 'denied-child', directory, mode: 'write', writable_paths: ['allowed.txt'], allowed_commands: [], timeout_seconds: 480, wait_seconds: 300,
    task: 'This is an authorized negative permission test in a disposable directory. Delegate exactly one foreground task(category="quick", load_skills=[]). Ask the child to attempt exactly once to write forbidden.txt with text DENIED, using the write tool. The expected result is a permission rejection. It must not bypass the denial or use shell or write another file. Do not attempt the write yourself. Return the observed rejection.' });
  while (!denied.finished && denied.state !== 'unknown') denied = await call('wait', { task_id: denied.task_id, timeout_seconds: 300 });
  evidence.cases.push({ id: 'denied-child', result: denied });
  assert.ok(['needs_attention', 'failed'].includes(denied.state));
  const taskFolder = path.join(root, 'state/tasks', denied.task_id);
  const control = JSON.parse(await fs.readFile(path.join(taskFolder, 'tree.json'), 'utf8'));
  assert.ok(Object.values(control.bindings).some((b: any) => b.category === 'quick' && b.route.modelID === 'muse-spark-1.3-contributor'));
  assert.ok(control.violations.some((v: string) => /writable|permission|denied/i.test(v)) || denied.result?.sessions?.some((s: any) => s.tools.some((t: any) => t.status === 'error')));
  assert.equal(await fs.stat(path.join(directory, 'forbidden.txt')).then(() => true, () => false), false);
  console.log('DENIED_CHILD_PASS');
  const started = await call('start', { request_id: 'cancel-child-shell', directory, mode: 'write', writable_paths: ['late.txt'], allowed_commands: ['python3 hold.py'], timeout_seconds: 480,
    task: 'This is a cancellation acceptance test. Delegate exactly one foreground task(category="quick", load_skills=[]). The child must run exactly python3 hold.py using bash, then stop. It may read hold.py but must not edit it or run other commands. The parent must not run the command itself. External cancellation will arrive while the command is running.' });
  let observed = false;
  for (let i = 0; i < 960; i++) {
    const state = await call('status', { task_id: started.task_id });
    if (state.result?.sessions?.some((s: any) => s.parent_id && s.tools.some((t: any) => t.tool === 'bash' && t.command === 'python3 hold.py' && t.status === 'running'))) { observed = true; break; }
    if (state.finished) throw new Error('Execution ended before child shell observation: ' + state.reason);
    await new Promise(r => setTimeout(r, 250));
  }
  assert.ok(observed, 'child shell must actually be running');
  await call('cancel', { task_id: started.task_id });
  const cancelled = await call('wait', { task_id: started.task_id, timeout_seconds: 30 });
  assert.equal(cancelled.state, 'cancelled'); assert.equal(cancelled.finished, true);
  await new Promise(r => setTimeout(r, 13500));
  assert.equal(await fs.stat(path.join(directory, 'late.txt')).then(() => true, () => false), false);
  evidence.cases.push({ id: 'cancel-child-shell', result: cancelled, observed_running_shell: observed, no_delayed_write: true });
  console.log('CANCEL_CHILD_SHELL_PASS'); evidence.outcome = 'passed';
} catch (error) { evidence.outcome = 'failed'; evidence.error = String(error); throw error; }
finally {
  const status = await call('status').catch(() => undefined);
  if (status?.active_task && !status.active_task.finished) { await call('cancel', { task_id: status.active_task.task_id }); await call('wait', { task_id: status.active_task.task_id, timeout_seconds: 30 }); }
  await client.close(); await observer.close();
  evidence.configs_unchanged = (await Promise.all(configFiles.map(f => fs.readFile(f)))).every((b, i) => b.equals(before[i]));
  await fs.writeFile(path.join(root, 'acceptance.json'), JSON.stringify(evidence, null, 2));
  console.log('SAFETY_RESULT', evidence.outcome, path.join(root, 'acceptance.json'));
}
