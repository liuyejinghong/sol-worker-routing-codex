import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import lockfile from 'proper-lockfile';
import { alive, atomicJson, errorText, maybeJson, messageId, normalizeInput, now, publicTask, readJson, requestId, startSchema, taskDir, taskFile, type Receipt, type Task } from './core.js';

import { loadRouting, sameRouting } from './routing.js';

export class Store {
  constructor(public root: string) {}
  async init() { await fs.mkdir(this.root, { recursive: true, mode: 0o700 }); }
  async locked<T>(fn: () => Promise<T>): Promise<T> {
    await this.init();
    const release = await lockfile.lock(this.root, { stale: 30000, retries: { retries: 10, minTimeout: 30, maxTimeout: 300 } });
    try { return await fn(); } finally { await release(); }
  }
  async get(id: string) { return readJson<Task>(taskFile(this.root, id)); }
  async active(): Promise<Task | undefined> {
    const ref = await maybeJson<{ id: string }>(path.join(this.root, 'active.json'));
    return ref ? this.get(ref.id) : undefined;
  }
  async reconcile(task: Task) {
    if (task.finished_at || alive(task.runner_pid) || Date.now() - Date.parse(task.updated_at) < 10000) return task;
    return { ...task, state: 'unknown' as const, reason: 'Runner is no longer alive. Execution state is unconfirmed; use cancel to reconcile before another task.' };
  }
  async receipt(id: string, operation: string, input: unknown) {
    const receipt = await maybeJson<Receipt>(path.join(this.root, 'requests', requestId.parse(id) + '.json'));
    if (!receipt) return;
    if (receipt.operation !== operation || JSON.stringify(receipt.input) !== JSON.stringify(input)) throw new Error('request_id already belongs to a different request');
    return { ...publicTask(await this.reconcile(await this.get(receipt.task_id))), requested_turn: receipt.turn, deduplicated: true };
  }
  async reserve(task: Task, operation: 'start' | 'followup', input: unknown) {
    await atomicJson(taskFile(this.root, task.id), task);
    await atomicJson(path.join(this.root, 'active.json'), { id: task.id });
    await atomicJson(path.join(this.root, 'requests', task.request_id + '.json'), { task_id: task.id, turn: task.turn, operation, input } satisfies Receipt);
    const folder = path.join(taskDir(this.root, task.id), `turn-${task.turn}`);
    await fs.mkdir(folder, { recursive: true, mode: 0o700 });
    const log = await fs.open(path.join(folder, 'runner.log'), 'a', 0o600);
    const child = spawn(process.execPath, [fileURLToPath(new URL('./runner.mjs', import.meta.url)), this.root, task.id], {
      detached: true, stdio: ['ignore', log.fd, log.fd], env: process.env,
    });
    const spawned = new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    await log.close();
    await spawned.catch(async e => {
      task.state = 'failed'; task.reason = errorText(e); task.finished_at = now();
      await atomicJson(taskFile(this.root, task.id), task); throw e;
    });
    task.runner_pid = child.pid;
    await atomicJson(taskFile(this.root, task.id), task);
    child.unref();
    return publicTask(task);
  }
  async start(raw: unknown) {
    const input = await normalizeInput(startSchema.parse(raw));
    return this.locked(async () => {
      const existing = await this.receipt(input.request_id, 'start', input);
      if (existing) return existing;
      const active = await this.active();
      if (active && !active.finished_at) throw new Error(`Task ${active.id} still owns the single worker slot; inspect or cancel it first`);
      const routing = await loadRouting(input.profile, input.model_mode);
      const task: Task = { routing, id: randomUUID(), input, state: 'submitted', created_at: now(), updated_at: now(),
        turn: 1, request_id: input.request_id, prompt: input.task, message_id: messageId(), submission: 'not_sent' };
      return this.reserve(task, 'start', input);
    });
  }
  async followup(id: string, rid: string, prompt: string) {
    requestId.parse(rid);
    if (!prompt || prompt.length > 60000) throw new Error('Followup task must contain 1–60000 characters');
    return this.locked(async () => {
      const request = { task_id: id, request_id: rid, task: prompt };
      const prior = await this.receipt(rid, 'followup', request);
      if (prior) return prior;
      const task = await this.get(id);
      const active = await this.active();
      if (!task.finished_at || (active && !active.finished_at)) throw new Error('Previous execution is not confirmed stopped');
      if (!task.routing) throw new Error('Legacy tasks may be inspected or cancelled; start a new profile task for further work');
      if (!sameRouting(task.routing, await loadRouting(task.input.profile, task.input.model_mode))) throw new Error('OMO routing changed; finish with the original profile or start a new task after reviewing existing edits');
      if (!task.session_id) throw new Error('No OpenCode session to resume; start a new task after resolving the failure');
      task.turn += 1; task.request_id = rid; task.prompt = prompt; task.message_id = messageId();
      task.updated_at = now(); task.state = 'submitted'; task.submission = 'not_sent';
      delete task.finished_at; delete task.reason; delete task.cancelling; delete task.result; delete task.runner_pid;
      return this.reserve(task, 'followup', request);
    });
  }
  async cancel(id: string) {
    return this.locked(async () => {
      const task = await this.get(id);
      if (task.finished_at) return publicTask(task);
      await atomicJson(path.join(taskDir(this.root, id), `turn-${task.turn}`, 'cancel.json'), { requested_at: now() });
      if (!alive(task.runner_pid) && Date.now() - Date.parse(task.updated_at) >= 10000) {
        const log = await fs.open(path.join(taskDir(this.root, id), `turn-${task.turn}`, 'recovery.log'), 'a', 0o600);
        const recovery = spawn(process.execPath, [fileURLToPath(new URL('./runner.mjs', import.meta.url)), this.root, id, '--recover'], { detached: true, stdio: ['ignore', log.fd, log.fd], env: process.env });
        const spawned = new Promise<void>((resolve, reject) => { recovery.once('spawn', resolve); recovery.once('error', reject); });
        await log.close();
        await spawned;
        task.runner_pid = recovery.pid;
        task.updated_at = now();
        await atomicJson(taskFile(this.root, id), task);
        recovery.unref();
      }
      return { ...publicTask(task), cancelling: true };
    });
  }
}
