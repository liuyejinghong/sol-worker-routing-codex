import { profileFixture } from './profile-fixture.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

if (process.env.OPENCODE_WORKER_LIVE_TEST !== '1') throw new Error('Set OPENCODE_WORKER_LIVE_TEST=1: this test spends Go quota on synthetic files');
const root = await fs.mkdtemp('/private/tmp/opencode-worker-live-');
const directory = path.join(root, 'workspace');
await fs.mkdir(directory);
execFileSync('git', ['init', '-q'], { cwd: directory });
const marker = randomUUID();
await fs.writeFile(path.join(directory, 'input.txt'), `marker=${marker}\n`);
await fs.writeFile(path.join(directory, 'normalize.py'), 'def normalize_tags(tags):\n    return sorted(set(tags))\n');
const checks = 'from normalize import normalize_tags\nassert normalize_tags([" Blue ", "RED", "blue", "", " red "]) == ["blue", "red"]\nassert normalize_tags([]) == []\nprint("WORKER_TEST_PASS")\n';
await fs.writeFile(path.join(directory, 'check.py'), checks);
const env = Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined));
env.OPENCODE_WORKER_OMO_CONFIG = await profileFixture(directory);
env.OPENCODE_WORKER_STATE_DIR = path.join(root, 'state');
const connect = async () => {
  const client = new Client({ name: 'opencode-worker-acceptance', version: '0.1.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('dist/mcp.mjs')], env, stderr: 'inherit' }));
  return client;
};
let client = await connect();
const evidence: any = { root, directory, model: 'opencode-go/muse-spark-1.3-contributor', checks: [] };
async function call(name: string, args: any = {}) {
  const response: any = await client.callTool({ name, arguments: args });
  const data = JSON.parse(response.content.find((x: any) => x.type === 'text').text);
  if (response.isError) throw new Error(`${name}: ${JSON.stringify(data)}`);
  return data;
}
async function finish(id: string) {
  for (let i = 0; i < 20; i++) {
    const current = await call('wait', { task_id: id, timeout_seconds: 10 });
    console.log(JSON.stringify({ task_id: id, state: current.state, finished: current.finished, reason: current.reason }));
    if (current.finished || current.state === 'unknown') return current;
  }
  await call('cancel', { task_id: id });
  throw new Error('Acceptance time budget exceeded');
}
try {
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map(t => t.name).sort(), ['cancel', 'followup', 'run', 'start', 'status', 'wait']);
  evidence.tools = tools.tools.map(t => t.name);
  evidence.status = await call('status');
  console.log('LIVE_ROOT', root);
  const readArgs = { request_id: 'read-1', directory, mode: 'read-only', task: 'Read input.txt with the read tool and return the exact marker. Do not edit any file, run shell, delegate or use skills.', timeout_seconds: 120 };
  const read = await call('start', readArgs);
  const dedup = await call('start', readArgs); assert.equal(dedup.task_id, read.task_id); assert.equal(dedup.deduplicated, true);
  // Reconnect while the detached runner owns the task.
  await client.close(); client = await connect();
  const readResult = await finish(read.task_id); evidence.checks.push({ name: 'read_and_client_restart', result: readResult });
  assert.equal(readResult.state, 'completed'); assert.ok(readResult.result.text.includes(marker));
  const write = await call('start', { request_id: 'write-1', directory, mode: 'write', writable_paths: ['normalize.py', 'result.txt'], allowed_commands: ['python3 check.py'], timeout_seconds: 180,
    task: 'Fix normalize_tags in normalize.py: strip spaces, lowercase, drop empty strings and deduplicate while preserving first occurrence order. Read check.py but do not edit it. Run exactly python3 check.py. Write result.txt containing phase=1. Only normalize.py and result.txt may change. Do not delegate.' });
  const writeResult = await finish(write.task_id); evidence.checks.push({ name: 'write_and_shell', result: writeResult });
  assert.equal(writeResult.state, 'completed');
  assert.equal(await fs.readFile(path.join(directory, 'check.py'), 'utf8'), checks);
  assert.match(execFileSync('python3', ['check.py'], { cwd: directory, encoding: 'utf8' }), /WORKER_TEST_PASS/);
  const next = await call('followup', { task_id: write.task_id, request_id: 'write-2', task: 'Change result.txt to exactly phase=2 without a newline. Preserve normalize.py. Do not run shell or any other tools beyond reading and editing result.txt.' });
  assert.equal(next.session_id, writeResult.session_id);
  const nextResult = await finish(write.task_id); evidence.checks.push({ name: 'same_session_followup', result: nextResult });
  assert.equal(nextResult.state, 'completed'); assert.equal(await fs.readFile(path.join(directory, 'result.txt'), 'utf8'), 'phase=2');
  const denied = await call('followup', { task_id: write.task_id, request_id: 'write-3', task: 'Permission acceptance test: attempt exactly once to write denied.txt with text DENIED. The expected outcome is runtime rejection. Do not bypass the rejection or use shell. Report the exact result.' });
  const deniedResult = await finish(denied.task_id); evidence.checks.push({ name: 'denied_path', result: deniedResult });
  assert.equal(deniedResult.state, 'needs_attention');
  assert.equal(await fs.stat(path.join(directory, 'denied.txt')).then(() => true, () => false), false);
  const early = await call('start', { request_id: 'early-cancel', directory, task: 'Read input.txt and explain the contents. Do not edit anything.', timeout_seconds: 60 });
  await call('cancel', { task_id: early.task_id });
  const earlyResult = await finish(early.task_id); evidence.checks.push({ name: 'early_cancel', result: earlyResult });assert.equal(earlyResult.state, 'cancelled');
  const busy = await call('start', { request_id: 'busy-cancel', directory, task: 'Read normalize.py and input.txt, then explain their behavior in detail. Do not edit files or run shell.', timeout_seconds: 120 });
  for (let i = 0; i < 120; i++) {
    const s = await call('status', { task_id: busy.task_id });
    if (s.state === 'running') break;
    assert.equal(s.finished, false);
    await new Promise(r => setTimeout(r, 250));
  }
  await call('cancel', { task_id: busy.task_id });
  const busyResult = await finish(busy.task_id);evidence.checks.push({ name: 'busy_cancel', result: busyResult });assert.equal(busyResult.state, 'cancelled');
  evidence.outcome = 'passed';
  console.log('LIVE_ACCEPTANCE_PASS', root);
} catch (error) {
  evidence.outcome = 'failed'; evidence.error = String(error);
  const active = await call('status').catch(() => undefined);
  if (active?.active_task && !active.active_task.finished) { await call('cancel', { task_id: active.active_task.task_id }); await finish(active.active_task.task_id); }
  throw error;
} finally {
  await fs.writeFile(path.join(root, 'acceptance.json'), JSON.stringify(evidence, null, 2));
  await client.close();
}
