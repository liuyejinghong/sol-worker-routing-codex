import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { alive, atomicJson, errorText, maybeJson, now, permissionRules, PROVIDER, readJson, sleep, taskDir, taskFile, type Result, type State, type Task, type SessionResult } from './core.js';
import { abortTree, currentMessages, descendants, treeControl, verifyIdentities } from './tree.js';
import { canonicalAgent, target } from './routing.js';
import { api, Runtime, type Connection } from './runtime.js';

export function summarize(messages: any[], messageId: string): Result {
  const assistants = messages.filter(m => m.info?.role === 'assistant' && m.info?.parentID === messageId);
  return {
    text: assistants.flatMap(m => (m.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text)).join('\n\n'),
    identity: assistants.map(m => ({ agent: m.info.agent, providerID: m.info.providerID, modelID: m.info.modelID })),
    errors: assistants.flatMap(m => m.info.error ? [m.info.error] : []),
    tools: assistants.flatMap(m => (m.parts || []).filter((p: any) => p.type === 'tool').map((p: any) => ({
      tool: p.tool, status: p.state?.status, input: p.state?.input, output: p.state?.output,
      error: p.state?.error, exit_code: p.state?.metadata?.exit,
    }))),
    finish_reasons: assistants.map(m => m.info.finish).filter((finish): finish is string => typeof finish === 'string'),
    tokens: assistants.map(m => m.info.tokens ?? null),
    observed_states: [], acceptance: 'pending',
  };
}
export function terminalState(messages: any[], messageId: string, runtimeState: string): State | undefined {
  if (runtimeState !== 'idle') return;
  const assistants = messages.filter(m => m.info?.role === 'assistant' && m.info?.parentID === messageId);
  const last = assistants.at(-1);
  if (!last?.info?.time?.completed) return;
  if (last.info.error) return 'failed';
  if (!last.info.finish || ['tool-calls', 'unknown'].includes(last.info.finish)) return;
  const result = summarize(messages, messageId);
  if (result.tools.some(t => ['pending', 'running'].includes(t.status))) return;
  const unresolved = result.tools.some((tool, index) => {
    if (tool.status !== 'error' && (tool.exit_code === undefined || tool.exit_code === 0)) return false;
    if (/OPENCODE_WORKER_SCOPE|prevents you|permission|denied/i.test(tool.error || '')) return true;
    const input = tool.input as Record<string, unknown> | undefined;
    return !result.tools.slice(index + 1).some(later => {
      if (later.status !== 'completed' || (later.exit_code !== undefined && later.exit_code !== 0)) return false;
      const next = later.input as Record<string, unknown> | undefined;
      if (tool.tool === 'bash') return later.tool === 'bash' && input?.command === next?.command && input?.workdir === next?.workdir;
      if (!input?.filePath || input.filePath !== next?.filePath) return false;
      return tool.tool === 'read' ? ['read', 'edit', 'write'].includes(later.tool) : ['edit', 'write'].includes(later.tool);
    });
  });
  if (unresolved || last.info.finish === 'length' || (!result.text.trim() && !result.tools.length)) return 'needs_attention';
  return 'completed';
}
async function snapshot(task: Task, target: string): Promise<string[]> {
  const files: string[] = [];
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true, mode: 0o700 });
  const visit = async (file: string) => {
    let st;
    try { st = await fs.lstat(file); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return; throw e; }
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      for (const item of await fs.readdir(file)) await visit(path.join(file, item));
    } else if (st.isFile()) {
      if (st.size > 20_000_000) throw new Error('Owned file exceeds the 20 MB snapshot limit');
      const relative = path.relative(task.input.directory, file);
      const dest = path.join(target, relative);
      await fs.mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
      await fs.copyFile(file, dest); files.push(relative);
    }
  };
  for (const scope of task.input.writable_paths) await visit(scope);
  return [...new Set(files)];
}
async function runCommand(command: string, args: string[], cwd: string) {
  return new Promise<{ code: number | null; stdout: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.resume();
    child.once('error', reject);
    child.once('exit', code => resolve({ code, stdout }));
  });
}
async function saveChanges(task: Task, folder: string, before: string[]) {
  const after = await snapshot(task, path.join(folder, 'after'));
  const changed: string[] = [];
  for (const file of new Set([...before, ...after])) {
    const read = (side: string) => fs.readFile(path.join(folder, side, file)).catch(e => { if (e.code === 'ENOENT') return; throw e; });
    const [a, b] = await Promise.all([read('before'), read('after')]);
    if (!a || !b || !a.equals(b)) changed.push(file);
  }
  const diff = await runCommand('git', ['diff', '--no-index', '--no-ext-diff', '--binary', '--', 'before', 'after'], folder);
  if (![0, 1].includes(diff.code ?? -1)) throw new Error('Could not produce the owned-path diff');
  await fs.writeFile(path.join(folder, 'diff.patch'), diff.stdout, { mode: 0o600 });
  task.result = { ...(task.result || { text: '', tools: [], errors: [], identity: [], observed_states: [], acceptance: 'pending' }), changed_files: changed, diff_path: path.join(folder, 'diff.patch') };
}
async function stopOrphan(connection: Connection, sessionId?: string) {
  // Authenticate before signalling any persisted PID: it must still be our private server.
  try { await api(connection, '/global/health'); } catch (e) {
    if (!alive(connection.pid)) return;
    throw e;
  }
  if (sessionId) await abortTree(connection, sessionId);
  process.kill(-connection.pid, 'SIGTERM');
  for (let i = 0; i < 40; i++) {
    await sleep(100);
    try { await api(connection, '/global/health', undefined, 1000); } catch { return; }
  }
  throw new Error('Private OpenCode service did not stop; retain unknown state');
}
async function execute(root: string, id: string, recovery: boolean) {
  const file = taskFile(root, id);
  let task = await readJson<Task>(file);
  for (let i = 0; task.runner_pid !== process.pid && i < 100; i++) { await sleep(50); task = await readJson<Task>(file); }
  if (task.runner_pid !== process.pid) throw new Error('Runner reservation was not acknowledged');
  const folder = path.join(taskDir(root, id), `turn-${task.turn}`);
  const cancelFile = path.join(folder, 'cancel.json');
  const save = async () => { task.updated_at = now(); await atomicJson(file, task); };
  if (recovery) {
    const connection = await maybeJson<Connection>(path.join(folder, 'connection.json'));
    if (connection && !connection.url) {
      const log = await fs.readFile(path.join(folder, 'server.log'), 'utf8').catch(() => '');
      connection.url = log.match(/opencode server listening on (http:\/\/127\.0\.0\.1:\d+)/)?.[1] || '';
    }
    if (!connection) {
      const log = await fs.readFile(path.join(folder, 'runner.log'), 'utf8').catch(() => '');
      const missingEntry = /^Error: Cannot find module '[^'\r\n]*\/runner\.mjs'$/m.test(log);
      if (task.submission === 'not_sent' && !task.session_id && missingEntry) {
        task.state = 'failed'; task.reason = 'Runner entry was missing; prompt was not sent'; task.finished_at = now();
        await save();
        await atomicJson(path.join(folder, 'result.json'), task);
        return;
      }
      task.state = 'unknown'; task.reason = 'No service receipt: cannot prove orphaned execution stopped. Inspect runner.log before manual recovery.';
      await save(); return;
    }
    try {
      await stopOrphan(connection, task.session_id);
      task.state = 'cancelled'; task.reason = 'Orphaned private service stopped; review existing changes before any retry'; task.finished_at = now();
      task.result ||= { text: '', tools: [], errors: [], identity: [], observed_states: [], acceptance: 'pending' };
      task.result.errors.push({ recovery: 'Runner was interrupted; verify owned files before accepting or retrying' });
      const beforeFiles: string[] = [];
      const list = async (base: string, rel = '') => {
        for (const item of await fs.readdir(path.join(base, rel), { withFileTypes: true }).catch(() => [])) {
          const name = path.join(rel, item.name);
          if (item.isDirectory()) await list(base, name); else if (item.isFile()) beforeFiles.push(name);
        }
      };
      await list(path.join(folder, 'before'));
      await saveChanges(task, folder, beforeFiles);
    } catch (e) { task.state = 'unknown'; task.reason = errorText(e); }
    await save();
    await atomicJson(path.join(folder, 'result.json'), task);
    return;
  }
  let runtime: Runtime | undefined;
  let before: string[] = [];
  let snapshotReady = false;
  let final: State = 'unknown';
  let shouldCancel = false;
  let signalReceived = false;
  const onSignal = () => { signalReceived = true; };
  process.on('SIGTERM', onSignal); process.on('SIGINT', onSignal);
  try {
    before = await snapshot(task, path.join(folder, 'before')); snapshotReady = true;
    if (await maybeJson(cancelFile)) { final = 'cancelled'; return; }
    if (!task.routing) throw new Error('New execution requires reserved OMO routing');
    runtime = await Runtime.start(task.input.directory, folder, file, task.routing);
    const metadata = await runtime.inspect(task.routing);
    task.identity = metadata.identity;
    await atomicJson(path.join(folder, 'runtime.json'), { ...metadata, target: target(task.routing.agents.sisyphus), routing: task.routing });
    const permissions = permissionRules(task.input, metadata.worktree);
    if (!task.session_id) {
      const session = await api(runtime.connection, '/session', { title: `Codex worker ${id.slice(0, 8)}`, permission: permissions });
      task.session_id = session.id;
    }
    // Sessions retain their original permission rules across followup turns.
    const session = await api(runtime.connection, `/session/${task.session_id}`);
    if (JSON.stringify(session.permission) !== JSON.stringify(permissions)) throw new Error('Session permission receipt differs from the task contract');
    await save();
    if (await maybeJson(cancelFile) || signalReceived) { final = 'cancelled'; return; }
    task.submission = 'attempted'; await save();
    const prompt = [
      'You are an external worker for Codex. Complete only the assigned bounded task. You may delegate one level through task to configured categories or read-only specialists. Category tasks must be foreground and serial; named read-only tasks may be background. Do not use call_omo_agent, skills, Team Mode or external tools, change configuration, commit, push, or publish. Use one owned task ID for background_output/background_cancel, never all=true. All descendants must finish before you declare completion. Do not delegate in single-model mode. Preserve other edits. Return actual changes, verification and unresolved issues. If blocked, report the reason; never bypass a tool denial.',
      `Working directory: ${task.input.directory}\nMode: ${task.input.mode}\nWritable paths: ${JSON.stringify(task.input.writable_paths)}\nExact allowed shell commands: ${JSON.stringify(task.input.allowed_commands)}`,
      'Task:', task.prompt,
    ].join('\n\n');
    await api(runtime.connection, `/session/${task.session_id}/prompt_async`, {
      agent: task.identity.agent, model: { providerID: task.identity.providerID, modelID: task.identity.modelID }, variant: task.routing.agents.sisyphus.reasoning, messageID: task.message_id,
      parts: [{ type: 'text', text: prompt }],
    });
    task.submission = 'acknowledged'; await save();
    const deadline = Date.now() + task.input.timeout_seconds * 1000;
    const states: string[] = [];
    while (true) {
      const cancelled = Boolean(await maybeJson(cancelFile)) || signalReceived;
      if (cancelled || Date.now() >= deadline) {
        task.cancelling = true; task.reason = cancelled ? 'Cancellation requested' : 'Task time budget reached';
        shouldCancel = true; await save();
        // Terminating the private service below also stops prompts that have not entered busy yet.
        await abortTree(runtime.connection, task.session_id!);
        final = cancelled ? 'cancelled' : 'failed'; break;
      }
      const [statuses, rawMessages, children, control] = await Promise.all([
        api(runtime.connection, '/session/status'), api<any[]>(runtime.connection, `/session/${task.session_id}/message`),
        descendants(runtime.connection, task.session_id!), treeControl(file),
      ]);
      const messages = currentMessages(rawMessages, task.message_id);
      const runtimeState = statuses[task.session_id!]?.type || 'idle';
      if (states.at(-1) !== runtimeState) states.push(runtimeState);
      task.result = summarize(messages, task.message_id); task.result.observed_states = states.slice(-50);
      const rootRoute = task.routing.agents.sisyphus;
      const rows: SessionResult[] = [{ session_id: task.session_id!, role: 'sisyphus', ...rootRoute, state: runtimeState, message_id: task.message_id, errors: task.result.errors, tools: task.result.tools, text: task.result.text, tokens: task.result.tokens, finish_reasons: task.result.finish_reasons }];
      if (!verifyIdentities(rows[0], task.result.identity)) throw new Error('Actual assistant identity differs from the requested worker');
      let pendingChildren = false, childErrors = false, latestChildCompletion = 0;
      for (const child of children) {
        if (child.parentID !== task.session_id) throw new Error('Nested child delegation is outside this task');
        const binding = control?.bindings[child.id];
        const childState = statuses[child.id]?.type || 'idle';
        if (!binding || binding.turn !== task.turn || !binding.startMessageID) {
          if (childState !== 'idle' || !binding) pendingChildren = true;
          continue;
        }
        const childMessages = currentMessages(await api<any[]>(runtime.connection, `/session/${child.id}/message`), binding.startMessageID);
        const result = summarize(childMessages, binding.startMessageID);
        const terminal = terminalState(childMessages, binding.startMessageID, childState);
        const row: SessionResult = { session_id: child.id, parent_id: child.parentID, role: binding.role, category: binding.category, ...binding.route, state: terminal ?? childState, message_id: binding.startMessageID, errors: result.errors, tools: result.tools, text: result.text, tokens: result.tokens, finish_reasons: result.finish_reasons };
        if (!verifyIdentities(row, result.identity)) throw new Error('Actual child identity differs from the dispatched route');
        rows.push(row);
        latestChildCompletion = Math.max(latestChildCompletion, ...childMessages.filter(m => m.info?.role === 'assistant').map(m => m.info.time?.completed || 0));
        if (!terminal) pendingChildren = true;
        if (terminal && terminal !== 'completed') childErrors = true;
      }
      task.result.sessions = rows;
      task.state = runtimeState === 'idle' && task.result.identity.length === 0 ? 'submitted' : 'running';
      task.reason = runtimeState === 'retry' ? String(statuses[task.session_id!]?.message || 'OpenCode is retrying') : undefined;
      const dispatches = Object.values(control?.turn === task.turn ? control.dispatches : {});
      if (dispatches.some(d => !d.done && !d.childID)) pendingChildren = true;
      if (dispatches.some(d => d.error)) childErrors = true;
      if (control?.turn === task.turn && control.violations.length) {
        final = 'needs_attention'; task.reason = control.violations[0]; shouldCancel = true; break;
      }
      const pendingQuestion = messages.some(m => (m.parts || []).some((p: any) => p.type === 'tool' && p.tool === 'question' && ['pending', 'running'].includes(p.state?.status)));
      if (pendingQuestion) { final = 'needs_attention'; task.reason = 'Worker requested input; relay it through Codex'; shouldCancel = true; break; }
      const terminal = terminalState(messages, task.message_id, runtimeState);
      rows[0].state = terminal ?? runtimeState;
      const rootCompletion = messages.filter(m => m.info?.role === 'assistant').at(-1)?.info.time?.completed || 0;
      const waitingForSynthesis = !childErrors && latestChildCompletion > rootCompletion;
      if (terminal && !pendingChildren && !waitingForSynthesis) {
        final = childErrors ? 'needs_attention' : terminal;
        if (final === 'needs_attention') task.reason = 'Root or child errors, truncated or empty output require inspection';
        break;
      }
      if (terminal && pendingChildren) task.reason = 'Root replied; owned children are still unfinished';
      else if (terminal && waitingForSynthesis) task.reason = 'Children finished; waiting for OMO notification and root synthesis';
      await save();
      await sleep(750);
    }
  } catch (e) {
    task.reason = errorText(e);
    final = task.submission === 'attempted' ? 'unknown' : 'failed';
    shouldCancel = true;
  } finally {
    let stopped = true;
    if (runtime) {
      if (shouldCancel && task.session_id) await abortTree(runtime.connection, task.session_id).catch(() => {});
      // A per-turn private service bounds cancellation even during the async-submit race.
      await runtime.stop().catch(e => { stopped = false; final = 'unknown'; task.reason = `Service shutdown unconfirmed: ${errorText(e)}`; });
    }
    if (snapshotReady) {
      try { await saveChanges(task, folder, before); } catch (e) { if (stopped) final = 'needs_attention'; task.reason = `Result collection failed: ${errorText(e)}`; }
    }
    task.state = final; task.cancelling = false;
    if (stopped) task.finished_at = now();
    await save();
    await atomicJson(path.join(folder, 'result.json'), task);
    if (task.result?.identity.length && task.result.identity.every(i => i.providerID === task.identity?.providerID && i.modelID === task.identity?.modelID) && final === 'completed') {
      await atomicJson(path.join(root, 'last-verified.json'), { checked_at: now(), task_id: task.id, identity: task.identity, routing: task.routing, sessions: task.result.sessions });
    }
    process.off('SIGTERM', onSignal); process.off('SIGINT', onSignal);
  }
}
if (process.argv[1]?.endsWith('runner.mjs')) {
  execute(process.argv[2], process.argv[3], process.argv.includes('--recover')).catch(error => { console.error(errorText(error)); process.exitCode = 1; });
}
