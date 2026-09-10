import path from 'node:path';
import { canonicalTarget, inside, type Task } from './core.js';

const readTools = new Set(['read', 'glob', 'grep']);
const writeTools = new Set(['write', 'edit']);
export async function checkTool(task: Task, tool: string, args: Record<string, unknown>) {
  if (tool === 'question') return;
  if (tool === 'bash') {
    if (typeof args.command !== 'string' || !task.input.allowed_commands.includes(args.command)) throw new Error('OPENCODE_WORKER_SCOPE: command is not in the exact allowed_commands list');
    if (args.workdir && await canonicalTarget(path.resolve(task.input.directory, String(args.workdir))) !== task.input.directory) throw new Error('OPENCODE_WORKER_SCOPE: shell workdir must be the assigned directory');
    return;
  }
  if (!readTools.has(tool) && !writeTools.has(tool)) throw new Error(`OPENCODE_WORKER_SCOPE: tool ${tool} is outside this task`);
  const raw = args.filePath ?? args.path ?? task.input.directory;
  if (typeof raw !== 'string') throw new Error('OPENCODE_WORKER_SCOPE: invalid path');
  const lexical = path.resolve(task.input.directory, raw);
  const target = await canonicalTarget(lexical);
  if (!inside(task.input.directory, lexical) || !inside(task.input.directory, target)) throw new Error('OPENCODE_WORKER_SCOPE: path escapes assigned directory');
  const components = path.relative(task.input.directory, target).split(path.sep);
  if (components.some(p => p === '.git' || p === '.env' || p.startsWith('.env.'))) throw new Error('OPENCODE_WORKER_SCOPE: repository internals and .env files are not available');
  if (writeTools.has(tool)) {
    if (task.input.mode !== 'write' || !task.input.writable_paths.some(scope => scope.endsWith('/') ? inside(scope, target) : scope === target)) throw new Error('OPENCODE_WORKER_SCOPE: file is outside writable_paths');
    if (components.some(p => ['.opencode', '.codex', '.agents', '.omo'].includes(p)) || ['AGENTS.md', 'opencode.json', 'opencode.jsonc'].includes(path.basename(target))) throw new Error('OPENCODE_WORKER_SCOPE: execution configuration is protected');
    // Re-read symlinks at execution time, including targets created after task submission.
    if (await canonicalTarget(lexical) !== target) throw new Error('OPENCODE_WORKER_SCOPE: path changed during validation');
  }
}
