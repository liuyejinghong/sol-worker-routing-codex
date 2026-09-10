import test from 'node:test';
import assert from 'node:assert/strict';
import { awaitTask } from '../src/await-task.js';

test('returns completed and failed tasks immediately instead of waiting out the window', async () => {
  for (const state of ['completed', 'failed', 'cancelled', 'needs_attention']) {
    const result = await awaitTask(async () => ({ finished: true, state }), 300);
    assert.equal(result.state, state); assert.equal(result.wait_expired, false);
  }
});
test('window expiry retains unfinished state; unknown returns for recovery', async () => {
  assert.deepEqual(await awaitTask(async () => ({ finished: false, state: 'running' }), 0), { finished: false, state: 'running', wait_expired: true });
  assert.deepEqual(await awaitTask(async () => ({ finished: false, state: 'unknown' }), 300), { finished: false, state: 'unknown', wait_expired: false });
});
test('RPC cancellation stops the waiting loop without inventing worker completion', async () => {
  const controller = new AbortController();
  let calls = 0;
  const waiting = awaitTask(async () => { calls++; return { finished: false, state: 'running' }; }, 300, controller.signal);
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(waiting, { name: 'AbortError' });
  assert.equal(calls, 1);
});
test('state inspection stays inside one call until the task ends', async () => {
  let calls = 0;
  const result = await awaitTask(async () => ({ finished: ++calls === 2, state: calls === 2 ? 'completed' : 'running' }), 2);
  assert.equal(result.state, 'completed'); assert.equal(result.wait_expired, false); assert.equal(calls, 2);
});
