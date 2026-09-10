import { profileFixture } from './profile-fixture.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startSchema, normalizeInput, permissionRules, type Task } from '../src/core.js';
import { checkTool } from '../src/guard-policy.js';
import { summarize, terminalState } from '../src/runner.js';
import { Store } from '../src/store.js';

async function fixture() {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'ocw-unit-')));
  await fs.writeFile(path.join(directory, 'owned.py'), 'original');
  const input = await normalizeInput(startSchema.parse({ request_id: 'r1', directory, task: 'test', mode: 'write', writable_paths: ['owned.py', 'module/'], allowed_commands: ['python3 check.py'] }));
  return { directory, task: { id: '12345678-1234-4234-8234-123456789abc', input } as Task };
}
test('read-only rejects shell and mutation scope at the API boundary', () => {
  assert.equal(startSchema.safeParse({ request_id: 'r', directory: '/tmp', task: 't', mode: 'read-only', allowed_commands: ['python3 check.py'] }).success, false);
  assert.equal(startSchema.safeParse({ request_id: '../escape', directory: '/tmp', task: 't' }).success, false);
});
test('owned path permissions are relative to actual worktree; no basename globs', async () => {
  const { task } = await fixture();
  const rootRules = permissionRules(task.input, '/').filter(r => r.permission === 'edit' && r.action === 'allow');
  assert.equal(rootRules[0].pattern, task.input.writable_paths[0].slice(1));
  const gitRules = permissionRules(task.input, task.input.directory).filter(r => r.permission === 'edit' && r.action === 'allow');
  assert.deepEqual(gitRules.map(r => r.pattern), ['owned.py', 'module/**']);
  await assert.rejects(normalizeInput({ ...task.input, writable_paths: ['../escape'] }), /escapes/);
  await assert.rejects(normalizeInput({ ...task.input, writable_paths: ['*.py'] }), /literal/);
});
test('tool guard allows owned files and exact commands; blocks aliases, traversal, config and delegation', async () => {
  const { directory, task } = await fixture();
  await checkTool(task, 'write', { filePath: path.join(directory, 'owned.py') });
  await checkTool(task, 'write', { filePath: path.join(directory, 'module/new.py') });
  await checkTool(task, 'bash', { command: 'python3 check.py' });
  await assert.rejects(checkTool(task, 'write', { filePath: path.join(directory, 'other.py') }), /outside writable/);
  await assert.rejects(checkTool(task, 'read', { filePath: '../outside.txt' }), /escapes/);
  await assert.rejects(checkTool(task, 'bash', { command: 'python3 check.py && touch other' }), /exact/);
  await assert.rejects(checkTool(task, 'delegate_task', {}), /outside this task/);
  await assert.rejects(checkTool(task, 'write', { filePath: 'module/AGENTS.md' }), /protected/);
  await assert.rejects(checkTool(task, 'read', { filePath: '.env.local' }), /not available/);
});
test('a symlink added after dispatch cannot escape the assigned directory', async () => {
  const { directory, task } = await fixture();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'ocw-outside-'));
  await fs.symlink(outside, path.join(directory, 'module'));
  await assert.rejects(checkTool(task, 'write', { filePath: 'module/escape.py' }), /escapes/);
});
const assistant = (finish = 'stop', parts: any[] = []) => ({ info: { id: 'a1', role: 'assistant', parentID: 'm1', agent: 'Sisyphus', providerID: 'opencode-go', modelID: 'muse-spark-1.3-contributor', time: { completed: 1 }, finish }, parts });
test('idle and step completion are not task completion; prior turns are ignored', () => {
  assert.equal(terminalState([], 'm1', 'idle'), undefined);
  assert.equal(terminalState([assistant('tool-calls')], 'm1', 'idle'), undefined);
  assert.equal(terminalState([assistant()], 'different-message', 'idle'), undefined);
  assert.equal(terminalState([assistant()], 'm1', 'busy'), undefined);
  assert.equal(terminalState([assistant()], 'm1', 'retry'), undefined);
  assert.equal(terminalState([assistant()], 'm1', 'idle'), 'completed');
});
test('tool errors and nonzero shell exits require attention even when assistant says done', () => {
  assert.equal(terminalState([assistant('stop', [{ type: 'tool', tool: 'write', state: { status: 'error', error: 'denied' } }])], 'm1', 'idle'), 'needs_attention');
  assert.equal(terminalState([assistant('stop', [{ type: 'tool', tool: 'bash', state: { status: 'completed', metadata: { exit: 1 } } }])], 'm1', 'idle'), 'needs_attention');
});
test('result collection excludes reasoning and preserves evidence', () => {
  const result = summarize([assistant('stop', [{ type: 'reasoning', text: 'PRIVATE_REASONING' }, { type: 'text', text: 'result' }])], 'm1');
  assert.equal(result.text, 'result');
  assert.equal(JSON.stringify(result).includes('PRIVATE_REASONING'), false);
  assert.equal(result.acceptance, 'pending');
});
test('same request ID deduplicates across Store instances and differing input is rejected', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ocw-store-'));
  const { task } = await fixture();
  let launches = 0;
  class FakeStore extends Store {
    override async reserve(t: Task, operation: 'start' | 'followup', input: unknown) {
      launches++;
      const { atomicJson, taskFile } = await import('../src/core.js');
      await atomicJson(taskFile(this.root, t.id), t);
      await atomicJson(path.join(this.root, 'active.json'), { id: t.id });
      await atomicJson(path.join(this.root, 'requests', t.request_id + '.json'), { task_id: t.id, turn: t.turn, operation, input });
      return { task_id: t.id } as any;
    }
  }
  process.env.OPENCODE_WORKER_OMO_CONFIG = await profileFixture(root);
  const a = new FakeStore(root), b = new FakeStore(root);
  const results = await Promise.all([a.start(task.input), b.start(task.input)]);
  assert.equal(launches, 1);
  assert.equal(results[0].task_id, results[1].task_id);
  await assert.rejects(b.start({ ...task.input, task: 'different task' }), /different request/);
  await assert.rejects(b.start({ ...task.input, request_id: 'new-request' }), /single worker slot/);
});

test('a missing file read resolved by a later write does not block completion', () => {
  const tool = (name: string, state: any) => ({ type: 'tool', tool: name, state });
  const parts = [
    tool('read', { status: 'error', input: { filePath: '/work/new.txt' }, error: 'File not found' }),
    tool('write', { status: 'completed', input: { filePath: '/work/new.txt' } }),
  ];
  assert.equal(terminalState([assistant('stop', parts)], 'm1', 'idle'), 'completed');
  assert.equal(summarize([assistant('stop', parts)], 'm1').tools[0].status, 'error');
  parts[0].state.error = 'permission denied';
  assert.equal(terminalState([assistant('stop', parts)], 'm1', 'idle'), 'needs_attention');
});
