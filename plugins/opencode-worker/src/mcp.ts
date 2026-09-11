import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { errorText, maybeJson, PROVIDER, publicTask, requestId, sleep, startSchema, stateRoot, taskDir, taskId, VERSION, type Task } from './core.js';
import { opencodePath } from './runtime.js';
import { Store } from './store.js';
import { loadRouting } from './routing.js';
import { awaitTask } from './await-task.js';

// Keep executable bytes before a plugin update can remove this connection's cache directory.
const store = new Store(stateRoot());
await store.loadRuntime();
const server = new McpServer({ name: 'opencode-worker', version: VERSION }, {
  instructions: 'Delegate bounded authorized work to local OpenCode using its selected OMO profile on OpenCode Go. All roles use their model maximum reasoning. The default profile delegates one level; single mode disables delegation. Contributor permits training on submitted prompts/completions. Keep Codex in charge of judgment and acceptance. Use stable request_id values; wait timeouts are not failures. completed means execution ended, not accepted. Never silently switch provider or overlap file ownership. Prefer run for foreground work; do not poll status during its pending request. Background start does not register a wakeup. run/start/followup spend the user\'s Go quota.',
});
const result = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] });
const handle = (fn: (args: any, signal?: AbortSignal) => Promise<unknown>) => async (args: any, extra: { signal: AbortSignal }) => {
  try { return result(await fn(args, extra.signal)); } catch (error) { return { ...result({ error: errorText(error) }), isError: true }; }
};
const lookup = async (id: string, turn?: number) => {
  let task = await store.reconcile(await store.get(id));
  if (turn !== undefined && task.turn !== turn) {
    const archived = await maybeJson<Task>(path.join(taskDir(store.root, id), `turn-${turn}`, 'result.json'));
    if (!archived) throw new Error('Requested turn archive is unavailable; current turn is not its result');
    task = archived;
  }
  return { ...publicTask(task), artifacts: path.join(taskDir(store.root, task.id), `turn-${task.turn}`) };
};
server.registerTool('status', {
  description: 'Read local dependency availability or task status. No model probe or quota spend. A past verification does not guarantee current quota or authentication. Use task_id from start; no ID returns the current slot and latest verification.',
  inputSchema: { task_id: taskId.optional() }, annotations: { readOnlyHint: true },
}, handle(async ({ task_id }) => {
  if (task_id) return lookup(task_id);
  let availability;
  try {
    const { stdout } = await promisify(execFile)(opencodePath(), ['--version'], { timeout: 5000 });
    availability = { available: true, opencode_version: stdout.trim(), readiness: 'local_dependencies_only' };
  } catch (e) { availability = { available: false, reason: errorText(e) }; }
  const active = await store.active();
  let routing, routing_error;
  try { routing = await loadRouting('codex-worker', 'omo'); } catch (error) { routing_error = errorText(error); }
  return { plugin_version: VERSION, routing, routing_error, provider: PROVIDER, ...availability,
    active_task: active ? await lookup(active.id) : null,
    last_verified: await maybeJson(path.join(store.root, 'last-verified.json')) || null,
    quota: 'unavailable', data_directory: store.root,
    network_env_present: ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'].filter(key => Boolean(process.env[key])) };
}));
server.registerTool('run', {
  description: 'Dispatch one authorized OpenCode Go OMO task and await its result inside this tool. Prefer this for foreground work: no separate status/start/wait loop is required. Use a stable request_id; repeating identical arguments resumes waiting on the same task, never starts a duplicate. wait_seconds is a bounded foreground window. If wait_expired=true and finished=false, retain ownership and continue with the same request or an explicit followup arrangement. Cancelling the tool call stops waiting, not the worker; use cancel to stop the worker. In Code Mode, set the surrounding exec yield_time_ms to cover wait_seconds.',
  inputSchema: startSchema.innerType().extend({ wait_seconds: z.number().int().min(1).max(300).default(300) }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
}, handle(async ({ wait_seconds, ...input }, signal) => {
  const task = await store.start(input);
  const turn = "requested_turn" in task ? Number(task.requested_turn) : task.turn;
  return awaitTask(() => lookup(task.task_id, turn), wait_seconds, signal);
}));
server.registerTool('start', {
  description: 'Start one bounded external OpenCode worker task through the user\'s OpenCode Go subscription. This sends task context and files read by the agent to that provider. Reuse request_id on uncertain retries. directory must be an explicitly assigned local directory; writable_paths are literal owned paths (trailing / means directory). allowed_commands are exact trusted commands; shell is not a filesystem sandbox. Returns immediately with task_id and does not register completion wakeup. Prefer run unless background/manual followup is explicitly intended.',
  inputSchema: startSchema, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
}, handle(args => store.start(args)));
server.registerTool('wait', {
  description: 'Wait up to 300 seconds for execution to finish or require attention. Retain file ownership while finished=false, including unknown/cancelling states. Inspect tool errors and artifacts before acceptance.',
  inputSchema: { task_id: taskId, timeout_seconds: z.number().min(0).max(300).default(300) }, annotations: { readOnlyHint: true },
}, handle(({ task_id, timeout_seconds }, signal) => awaitTask(() => lookup(task_id), timeout_seconds, signal)));
server.registerTool('followup', {
  description: 'Send a correction or continuation to a finished task using the same OpenCode session and original permissions. Reuse request_id when retrying. Does not expand write or shell scope. Prior task must be confirmed stopped. Set wait_seconds to await the correction within this call; zero preserves immediate-return behavior.',
  inputSchema: { task_id: taskId, request_id: requestId, task: z.string().min(1).max(60000), wait_seconds: z.number().int().min(0).max(300).default(0) },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
}, handle(async ({ task_id, request_id, task, wait_seconds }, signal) => {
  const started = await store.followup(task_id, request_id, task);
  const turn = "requested_turn" in started ? Number(started.requested_turn) : started.turn;
  return wait_seconds ? awaitTask(() => lookup(task_id, turn), wait_seconds, signal) : started;
}));
server.registerTool('cancel', {
  description: 'Request cancellation of a worker task. Retains existing edits. Poll wait/status until finished=true before reassigning its files. If a runner crashed, attempts reconciliation of only its recorded private service; never stops the user\'s normal OpenCode service.',
  inputSchema: { task_id: taskId }, annotations: { readOnlyHint: false, destructiveHint: false },
}, handle(({ task_id }) => store.cancel(task_id)));
await server.connect(new StdioServerTransport());
