import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { profileFixture } from './profile-fixture.js';
const root = await fs.mkdtemp('/private/tmp/ocw-tree-integration-');
const directory = path.join(root, 'workspace'); await fs.mkdir(directory);
const env = { ...process.env, OPENCODE_WORKER_STATE_DIR: path.join(root, 'state'), OPENCODE_WORKER_BIN: path.resolve('tests/fake-opencode.mjs'), OPENCODE_WORKER_FAKE_DB: path.join(root, 'db'), OPENCODE_WORKER_OMO_CONFIG: await profileFixture(directory) } as Record<string, string>;
const client = new Client({ name: 'tree-integration', version: '1' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('dist/mcp.mjs')], env, stderr: 'inherit' }));
const call = async (name: string, args: any = {}) => { const r: any = await client.callTool({ name, arguments: args }); assert.equal(r.isError, undefined, JSON.stringify(r)); return JSON.parse(r.content[0].text); };
try {
  const running = await call('run', { request_id: 'tree', directory, task: 'FAKE_TREE', timeout_seconds: 30, wait_seconds: 1 });
  assert.equal(running.finished, false);
  const done = await call('wait', { task_id: running.task_id, timeout_seconds: 10 });
  assert.equal(done.state, 'completed');
  assert.equal(done.result.sessions.length, 2);
  assert.equal(done.result.sessions[0].modelID, 'deepseek-v4.1-flash');
  assert.equal(done.result.sessions[1].modelID, 'muse-spark-1.3-contributor');
  assert.equal(done.result.sessions[1].state, 'completed');
  const wrong = await call('run', { request_id: 'wrong-child', directory, task: 'FAKE_CHILD_WRONG_MODEL', timeout_seconds: 30, wait_seconds: 10 });
  assert.equal(wrong.state, 'failed'); assert.match(wrong.reason, /child identity/);
  const bad = await call('run', { request_id: 'child-error', directory, task: 'FAKE_CHILD_ERROR', timeout_seconds: 30, wait_seconds: 10 });
  assert.equal(bad.state, 'needs_attention');
  const pending = await call('run', { request_id: 'pending-child', directory, task: 'FAKE_CHILD_PENDING', timeout_seconds: 30, wait_seconds: 2 });
  assert.equal(pending.finished, false);
  await call('cancel', { task_id: pending.task_id });
  const cancelled = await call('wait', { task_id: pending.task_id, timeout_seconds: 10 }); assert.equal(cancelled.state, 'cancelled');
  const db = JSON.parse(await fs.readFile(path.join(root, 'db/sessions.json'), 'utf8'));
  assert.ok(Object.values(db).some((s: any) => s.parentID === pending.session_id));
  console.log('TREE_INTEGRATION_PASS', root);
} finally {
  const status = await call('status');
  if (status.active_task && !status.active_task.finished) { await call('cancel', { task_id: status.active_task.task_id }); await call('wait', { task_id: status.active_task.task_id, timeout_seconds: 10 }); }
  await client.close();
}
