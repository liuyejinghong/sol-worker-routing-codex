import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'jsonc-parser';
import { parseRouting, validateMaximum, sameRouting } from '../src/routing.js';
import { atomicJson, normalizeInput, startSchema, type Task } from '../src/core.js';
import { TreeGuard } from '../src/tree-guard.js';
const source = () => fs.readFile('config/omo-profile.jsonc', 'utf8');

test('profile is explicit, fully routed, and uses each model maximum; no missing-profile fallback', async () => {
  const text = await source();
  const r = parseRouting(text, 'codex-worker', 'fixture');
  assert.equal(r.agents.sisyphus.modelID, 'deepseek-v4.1-flash');
  assert.equal(r.agents.sisyphus.reasoning, 'max');
  const catalog = { 'deepseek-v4.1-flash': { family: 'deepseek-flash', variants: { low: {}, high: {}, max: {} } } };
  validateMaximum(r.agents.sisyphus, catalog);
  assert.throws(() => validateMaximum({ ...r.agents.sisyphus, modelID: 'deepseek-flash' }, catalog), /Model unavailable/);
  assert.equal(r.categories.quick.modelID, 'muse-spark-1.3-contributor');
  assert.equal(r.categories.quick.reasoning, 'xhigh');
  assert.equal(r.auxiliary.reasoning, 'xhigh');
  assert.throws(() => parseRouting(text, 'absent', 'fixture'), /missing/);
  const d = parse(text); d.profiles['codex-worker']['[opencode]'].model_fallback = true;
  assert.throws(() => parseRouting(JSON.stringify(d), 'codex-worker', 'fixture'), /disable/);
  assert.throws(() => validateMaximum({ ...r.agents.sisyphus, reasoning: 'high' }, { 'deepseek-v4.1-flash': { variants: { high: {}, max: {} } } }), /maximum/);
  const changed = structuredClone(r); changed.categories.quick.modelID = 'another'; assert.equal(sameRouting(r, changed), false);
  const single = parseRouting(text, 'codex-worker', 'fixture', 'single');
  assert.equal(single.auxiliary.modelID, 'deepseek-v4.1-flash');
});
async function fixture() {
  const directory = await fs.realpath(await fs.mkdtemp('/private/tmp/ocw-tree-unit-'));
  const routing = parseRouting(await source(), 'codex-worker', 'fixture');
  const task = { id: 'test', turn: 1, session_id: 'ses_root', message_id: 'msg_root', routing,
    input: await normalizeInput(startSchema.parse({ request_id: 'r', directory, task: 'test', mode: 'write', writable_paths: ['owned.txt'], allowed_commands: ['python3 check.py'] })) } as Task;
  const file = path.join(directory, 'task.json'); await atomicJson(file, task);
  const sessions: Record<string, any> = { ses_root: { id: 'ses_root', directory } };
  const messages: Record<string, any[]> = {};
  const client = { session: { get: async ({ path: p }: any) => ({ data: sessions[p.id] }), messages: async ({ path: p }: any) => ({ data: messages[p.id] || [] }) } };
  const guard = new TreeGuard(file, client);
  await guard.parameters({ sessionID: 'ses_root', agent: 'Sisyphus - ultraworker', model: { id: 'deepseek-v4.1-flash', providerID: 'opencode-go' }, message: { id: 'msg_root' } }, { options: {} });
  return { task, file, directory, guard, sessions, messages };
}
test('named Muse reader cannot write or delegate; an unexpected model is rejected before execution', async () => {
  const f = await fixture();
  await f.guard.before({ sessionID: 'ses_root', callID: 'c1', tool: 'task' }, { subagent_type: 'explore', run_in_background: true });
  f.sessions.ses_reader = { id: 'ses_reader', parentID: 'ses_root', directory: f.directory, permission: [] };
  const input = { sessionID: 'ses_reader', agent: 'explore', model: { id: 'muse-spark-1.3-contributor', providerID: 'opencode-go' }, message: { id: 'm_read' } };
  const output = { options: { reasoningEffort: 'low' } };
  await f.guard.parameters(input, output); assert.equal(output.options.reasoningEffort, 'xhigh');
  await assert.rejects(f.guard.before({ sessionID: 'ses_reader', tool: 'write' }, { filePath: 'owned.txt' }), /read-only/);
  await assert.rejects(f.guard.before({ sessionID: 'ses_reader', tool: 'task' }, { category: 'deep' }), /disabled/);
  await assert.rejects(f.guard.parameters({ ...input, model: { id: 'deepseek-v4.1-flash', providerID: 'opencode-go' } }, { options: {} }), /differs/);
  await assert.rejects(f.guard.before({ sessionID: 'ses_root', tool: 'background_output' }, { task_id: 'bg_unrelated' }), /not owned/);
});
test('category selects DeepSeek despite Junior default Muse; writer reservations are exclusive', async () => {
  const f = await fixture();
  const results = await Promise.allSettled(['c1', 'c2'].map(callID => f.guard.locked(() => f.guard.before({ sessionID: 'ses_root', callID, tool: 'task' }, { category: 'deep' }))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  await assert.rejects(f.guard.before({ sessionID: 'ses_root', tool: 'edit' }, { filePath: 'owned.txt' }), /still owns/);
  f.sessions.ses_writer = { id: 'ses_writer', parentID: 'ses_root', directory: f.directory };
  await f.guard.parameters({ sessionID: 'ses_writer', agent: 'Sisyphus-Junior', model: { id: 'deepseek-v4.1-flash', providerID: 'opencode-go' }, message: { id: 'm_write' } }, { options: {} });
  await f.guard.before({ sessionID: 'ses_writer', tool: 'write' }, { filePath: 'owned.txt' });
  await assert.rejects(f.guard.before({ sessionID: 'ses_writer', tool: 'write' }, { filePath: 'forbidden.txt' }), /outside writable/);
  f.messages.ses_writer = [{ info: { role: 'assistant', parentID: 'm_write', finish: 'stop', time: { completed: 1 } }, parts: [] }];
  await f.guard.before({ sessionID: 'ses_root', callID: 'root-write', tool: 'write' }, { filePath: 'owned.txt' });
  await assert.rejects(f.guard.before({ sessionID: 'ses_root', callID: 'c3', tool: 'task' }, { category: 'quick' }), /another writer/);
  await f.guard.after({ sessionID: 'ses_root', callID: 'root-write', tool: 'write' }, {});
});
test('foreign sessions, nested sessions, ambiguous dispatch and background writers are refused', async () => {
  const f = await fixture();
  await assert.rejects(f.guard.before({ sessionID: 'ses_root', callID: 'x', tool: 'task' }, { category: 'deep', subagent_type: 'oracle' }), /mutually/);
  await assert.rejects(f.guard.before({ sessionID: 'ses_root', callID: 'x', tool: 'task' }, { category: 'quick', run_in_background: true }), /foreground/);
  await assert.rejects(f.guard.before({ sessionID: 'ses_root', callID: 'x', tool: 'task' }, { task_id: 'ses_foreign' }), /outside/);
  f.sessions.ses_nested = { parentID: 'ses_other', directory: f.directory };
  await assert.rejects(f.guard.bind('ses_nested', 'explore'), /direct child/);
});
test('auxiliary requests use bulk maximum and remain inside owned sessions', async () => {
  const f = await fixture();
  const output = { options: {} as any };
  await f.guard.parameters({ sessionID: 'ses_root', agent: 'title', model: { providerID: 'opencode-go', id: 'muse-spark-1.3-contributor' }, message: { id: 'title' } }, output);
  assert.equal(output.options.reasoningEffort, 'xhigh');
  await assert.rejects(f.guard.parameters({ sessionID: 'ses_foreign', agent: 'title' }, output), /outside/);
});

test('native agent permissions hide unrelated tools and retain literal write scope', async () => {
  const f = await fixture();
  const { default: factory } = await import('../src/guard.js');
  const previous = process.env.OPENCODE_WORKER_TASK_FILE;
  process.env.OPENCODE_WORKER_TASK_FILE = f.file;
  try {
    const hooks = await factory({ client: {}, worktree: f.directory });
    const cfg: any = { mcp: { inherited: { type: 'remote', url: 'https://example.invalid/mcp' } }, agent: Object.fromEntries(Object.entries(f.task.routing!.agents).map(([name, route]) => [name, { model: `${route.providerID}/${route.modelID}`, permission: { '*': 'allow' } }])) };
    await hooks.config(cfg);
    assert.deepEqual(cfg.mcp, { inherited: { enabled: false } });
    assert.equal(cfg.agent.explore.permission['*'], 'deny');
    assert.deepEqual(cfg.agent.explore.permission.read, { '*': 'allow', '*.env*': 'deny', 'mcp:*': 'deny' });
    assert.equal(cfg.agent.explore.permission.bash, 'deny');
    assert.equal(cfg.agent.sisyphus.permission.question, 'ask');
    assert.equal(cfg.agent.sisyphus.permission.todowrite, 'allow');
    assert.deepEqual(cfg.agent.sisyphus.permission.edit, { '*': 'deny', 'owned.txt': 'allow' });
    assert.equal(cfg.agent.explore.reasoningEffort, 'xhigh');
  } finally {
    if (previous === undefined) delete process.env.OPENCODE_WORKER_TASK_FILE; else process.env.OPENCODE_WORKER_TASK_FILE = previous;
  }
});

test('two child reservations are the limit, and .omo configuration cannot be written', async () => {
  const f = await fixture();
  for (const callID of ['r1', 'r2']) await f.guard.locked(() => f.guard.before({ sessionID: 'ses_root', callID, tool: 'task' }, { subagent_type: 'explore', run_in_background: true }));
  await assert.rejects(f.guard.locked(() => f.guard.before({ sessionID: 'ses_root', callID: 'r3', tool: 'task' }, { subagent_type: 'librarian' })), /two child/);
  await assert.rejects(normalizeInput({ ...f.task.input, writable_paths: ['.omo/omo.json'] }), /configuration/);
});

test('parallel identical reader routes can bind in reverse start order', async () => {
  const f = await fixture();
  for (const callID of ['first', 'second']) await f.guard.locked(() => f.guard.before({ sessionID: 'ses_root', callID, tool: 'task' }, { subagent_type: 'explore', run_in_background: true }));
  for (const id of ['ses_second', 'ses_first']) {
    f.sessions[id] = { id, parentID: 'ses_root', directory: f.directory };
    await f.guard.parameters({ sessionID: id, agent: 'explore', model: { providerID: 'opencode-go', id: 'muse-spark-1.3-contributor' }, message: { id: 'msg_' + id } }, { options: {} });
  }
  for (const callID of ['first', 'second']) await f.guard.after({ callID, tool: 'task', args: { run_in_background: true } }, { metadata: { sessionId: 'ses_' + callID, backgroundTaskId: 'bg_' + callID } });
  assert.equal(f.guard.control.dispatches.first.childID, 'ses_first');
  assert.equal(f.guard.control.dispatches.second.childID, 'ses_second');
});
