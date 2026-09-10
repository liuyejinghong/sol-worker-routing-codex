import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Routing } from './routing.js';

export const PROVIDER = 'opencode-go';
export const VERSION = '0.3.0';
export const requestId = z.string().regex(/^[A-Za-z0-9._-]{1,100}$/);
export const taskId = z.string().uuid();
export const startSchema = z.object({
  request_id: requestId,
  profile: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).default('codex-worker'),
  model_mode: z.enum(['omo', 'single']).default('omo'),
  directory: z.string().min(1),
  task: z.string().min(1).max(60000),
  mode: z.enum(['read-only', 'write']).default('read-only'),
  writable_paths: z.array(z.string().min(1)).max(200).default([]),
  allowed_commands: z.array(z.string().min(1).max(2000)).max(30).default([]),
  timeout_seconds: z.number().int().min(30).max(7200).default(900),
}).strict().refine(a => a.mode === 'write' || (a.writable_paths.length === 0 && a.allowed_commands.length === 0),
  'Read-only mode does not accept writable paths or shell commands');
export type Start = z.infer<typeof startSchema>;
export type State = 'submitted' | 'running' | 'needs_attention' | 'completed' | 'failed' | 'cancelled' | 'unknown';
export interface Identity { agent: string; providerID: string; modelID: string; opencode_version: string }
export interface ToolResult { tool: string; status: string; input?: unknown; output?: string; error?: string; exit_code?: number }
export interface Result {
  text: string; tools: ToolResult[]; errors: unknown[]; identity: Partial<Identity>[];
  sessions?: SessionResult[];
  observed_states: string[]; acceptance: 'pending'; changed_files?: string[]; diff_path?: string;
}
export interface SessionResult { text?: string; session_id: string; parent_id?: string; role: string; category?: string; providerID: string; modelID: string; reasoning: string; state: string; message_id?: string; tokens?: unknown; errors: unknown[]; tools: ToolResult[] }
export interface Task {
  routing?: Routing;
  id: string; input: Start; state: State; created_at: string; updated_at: string;
  turn: number; request_id: string; prompt: string; message_id: string;
  session_id?: string; identity?: Identity; runner_pid?: number;
  finished_at?: string; reason?: string; cancelling?: boolean;
  result?: Result; submission?: 'not_sent' | 'attempted' | 'acknowledged';
}
export interface Receipt { task_id: string; turn: number; operation: 'start' | 'followup'; input: unknown }
export interface Rule { permission: string; pattern: string; action: 'allow' | 'deny' | 'ask' }
export const now = () => new Date().toISOString();
export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export const stateRoot = () => process.env.OPENCODE_WORKER_STATE_DIR || path.join(os.homedir(), '.local/share/codex-opencode-worker');
export const errorText = (e: unknown) => e instanceof Error ? e.message : String(e);
export const alive = (pid?: number) => {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; }
};
export async function atomicJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  await fs.rename(temp, file);
}
export async function readJson<T>(file: string): Promise<T> { return JSON.parse(await fs.readFile(file, 'utf8')); }
export async function maybeJson<T>(file: string): Promise<T | undefined> {
  try { return await readJson<T>(file); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return; throw e; }
}
export const taskDir = (root: string, id: string) => path.join(root, 'tasks', taskId.parse(id));
export const taskFile = (root: string, id: string) => path.join(taskDir(root, id), 'task.json');
export const messageId = () => `msg_${Date.now().toString(16)}${randomUUID().replaceAll('-', '').slice(0, 16)}`;
export function inside(root: string, file: string) {
  const rel = path.relative(root, file);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
export async function canonicalTarget(file: string): Promise<string> {
  try { return await fs.realpath(file); } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    const parent = path.dirname(file);
    if (parent === file) throw e;
    return path.join(await canonicalTarget(parent), path.basename(file));
  }
}
export async function normalizeInput(raw: Start): Promise<Start> {
  if (!path.isAbsolute(raw.directory)) throw new Error('directory must be absolute');
  const directory = await fs.realpath(raw.directory);
  if (!(await fs.stat(directory)).isDirectory() || directory === path.parse(directory).root) throw new Error('Choose a specific working directory');
  const writable_paths: string[] = [];
  for (const entry of raw.writable_paths) {
    if (/[*?\[\]\n\r]/.test(entry)) throw new Error('writable_paths are literal paths, not glob patterns');
    const dirScope = entry.endsWith('/');
    const file = path.resolve(directory, entry);
    if (!inside(directory, file) || !inside(directory, await canonicalTarget(file))) throw new Error(`Writable path escapes directory: ${entry}`);
    if (file === directory) throw new Error('List owned files or subdirectories instead of the entire project');
    if (path.relative(directory, file).split(path.sep).some(p => ['.git', '.opencode', '.codex', '.agents', '.omo'].includes(p)) || ['AGENTS.md', 'opencode.json', 'opencode.jsonc'].includes(path.basename(file))) {
      throw new Error('Worker may not change execution configuration or repository instructions');
    }
    writable_paths.push(file + (dirScope ? '/' : ''));
  }
  if (raw.mode === 'write' && writable_paths.length === 0) throw new Error('Write mode requires explicit writable_paths');
  for (const command of raw.allowed_commands) {
    if (/[\n\r\0]/.test(command) || command !== command.trim()) throw new Error('Commands must be exact, single-line strings');
  }
  return { ...raw, directory, writable_paths };
}
export function permissionRules(input: Start, worktree: string): Rule[] {
  const rules: Rule[] = [
    { permission: '*', pattern: '*', action: 'deny' },
    { permission: 'read', pattern: '*', action: 'allow' },
    { permission: 'glob', pattern: '*', action: 'allow' },
    { permission: 'grep', pattern: '*', action: 'allow' },
    { permission: 'external_directory', pattern: '*', action: 'deny' },
    { permission: 'read', pattern: '*.env*', action: 'deny' },
    { permission: 'read', pattern: 'mcp:*', action: 'deny' },
    { permission: 'edit', pattern: '*', action: 'deny' },
    { permission: 'bash', pattern: '*', action: 'deny' },
    { permission: 'question', pattern: '*', action: 'ask' },
    { permission: 'task', pattern: '*', action: 'allow' },
    { permission: 'background_output', pattern: '*', action: 'allow' },
    { permission: 'background_cancel', pattern: '*', action: 'allow' },
    { permission: 'todowrite', pattern: '*', action: 'allow' },
  ];
  for (const file of input.writable_paths) {
    const directoryScope = file.endsWith('/');
    const rel = path.relative(worktree, file).split(path.sep).join('/');
    rules.push({ permission: 'edit', pattern: directoryScope ? `${rel}/**` : rel, action: 'allow' });
  }
  // The OpenCode hook checks the complete command; these native patterns also gate shell execution.
  for (const cmd of input.allowed_commands) rules.push({ permission: 'bash', pattern: cmd, action: 'allow' });
  return rules;
}
function compactTools(tools: ToolResult[]) {
  return tools.slice(-20).map(t => ({ tool: t.tool, status: t.status, exit_code: t.exit_code, error: t.error,
    path: (t.input as Record<string, unknown> | undefined)?.filePath,
    command: (t.input as Record<string, unknown> | undefined)?.command,
    output: t.output?.slice(-2000) }));
}
export function publicTask(task: Task) {
  return {
    task_id: task.id, request_id: task.request_id, turn: task.turn, state: task.state,
    finished: Boolean(task.finished_at), cancelling: task.cancelling ?? false,
    directory: task.input.directory, session_id: task.session_id, identity: task.identity,
    reason: task.reason, created_at: task.created_at, updated_at: task.updated_at, finished_at: task.finished_at,
    result: task.result && { ...task.result, text: task.result.text.slice(-12000), tools: compactTools(task.result.tools),
      sessions: task.result.sessions?.map(s => ({ ...s, text: s.text?.slice(-6000), tools: compactTools(s.tools) })) },
    cost: 'unavailable', acceptance: 'pending',
  };
}
