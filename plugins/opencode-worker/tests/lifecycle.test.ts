import { profileFixture } from './profile-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const enabled = process.env.OPENCODE_WORKER_LIFECYCLE_TEST === '1';
test('MCP lifecycle: async idle, followup, cancellation, model error, timeout and orphan recovery', { skip: !enabled, timeout: 120000 }, async () => {
  const root = await fs.mkdtemp('/private/tmp/ocw-lifecycle-');
  const directory = path.join(root, 'workspace'); await fs.mkdir(directory);
  const env = Object.fromEntries(Object.entries(process.env).filter((e): e is [string,string] => e[1] !== undefined));
  env.OPENCODE_WORKER_OMO_CONFIG = await profileFixture(directory);
env.OPENCODE_WORKER_STATE_DIR = path.join(root, 'state');
  env.OPENCODE_WORKER_BIN = path.resolve('tests/fake-opencode.mjs');
  env.OPENCODE_WORKER_FAKE_DB = path.join(root, 'db');
  const client = new Client({ name: 'lifecycle-test', version: '1' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('dist/mcp.mjs')], env, stderr: 'inherit' }));
  const call = async (name: string, args: any = {}) => {
    const response: any = await client.callTool({ name, arguments: args });
    const body = JSON.parse(response.content[0].text); assert.equal(response.isError, undefined, JSON.stringify(body)); return body;
  };
  const finish = async (id: string, attempts = 20) => {
    for (let i = 0; i < attempts; i++) {
      const current = await call('wait', { task_id: id, timeout_seconds: 3 });
      if (current.finished) return current;
    }
    throw new Error(`Task did not finish: ${id}`);
  };
  const start = (id: string, text: string) => call('start', { request_id: id, directory, task: text, timeout_seconds: 30 });
  try {
    const first = await start('normal', 'FAKE_NORMAL');
    assert.equal(first.finished, false);
    const normal = await finish(first.task_id); assert.equal(normal.state, 'completed');
    const next = await call('followup', { task_id: first.task_id, request_id: 'follow', task: 'FAKE_NORMAL' });
    const duplicate = await call('followup', { task_id: first.task_id, request_id: 'follow', task: 'FAKE_NORMAL' });
    assert.equal(next.turn, 2); assert.equal(duplicate.deduplicated, true);
    const followed = await finish(first.task_id); assert.equal(followed.session_id, normal.session_id);
    const early = await start('cancel', 'FAKE_SLOW');
    await call('cancel', { task_id: early.task_id }); assert.equal((await finish(early.task_id)).state, 'cancelled');
    const failed = await start('error', 'FAKE_MODEL_ERROR'); assert.equal((await finish(failed.task_id)).state, 'failed');
    const wrong = await start('wrong', 'FAKE_WRONG_MODEL'); assert.match((await finish(wrong.task_id)).reason, /identity/);
    const timeout = await start('timeout', 'FAKE_STALL'); const timed = await finish(timeout.task_id); assert.equal(timed.state, 'failed'); assert.match(timed.reason, /budget/);
    const orphan = await start('orphan', 'FAKE_STALL');
    const file = path.join(root, 'state/tasks', orphan.task_id, 'task.json');
    let task;
    for (let i = 0; i < 100; i++) {
      task = JSON.parse(await fs.readFile(file, 'utf8'));
      if (task.state === 'running') break;
      await new Promise(r => setTimeout(r, 100));
    }
    assert.equal(task.state, 'running');
    process.kill(task.runner_pid, 'SIGKILL');
    await new Promise(r => setTimeout(r, 10500));
    assert.equal((await call('status', { task_id: orphan.task_id })).state, 'unknown');
    await call('cancel', { task_id: orphan.task_id });
    const recovered = await finish(orphan.task_id); assert.equal(recovered.state, 'cancelled');
    const after = await start('after-recovery', 'FAKE_NORMAL'); assert.equal((await finish(after.task_id)).state, 'completed');
    console.log('LIFECYCLE_PASS', root);
  } finally {
    const status = await call('status');
    if (status.active_task && !status.active_task.finished) { await call('cancel', { task_id: status.active_task.task_id }); await finish(status.active_task.task_id).catch(() => {}); }
    await client.close();
  }
});
