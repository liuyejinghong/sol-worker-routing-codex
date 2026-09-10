import path from 'node:path';
import fs from 'node:fs/promises';
import { atomicJson, maybeJson, readJson, type Task } from './core.js';
import { AUXILIARY, canonicalAgent, SPECIALISTS, target, type Route } from './routing.js';
import { checkTool } from './guard-policy.js';

export interface Binding { sessionID: string; parentID?: string; role: string; category?: string; route: Route; writer: boolean; turn: number; messageID?: string; startMessageID?: string; nativePermission?: unknown }
export interface Dispatch { callID: string; role: string; category?: string; route: Route; writer: boolean; childID?: string; backgroundID?: string; done: boolean; error?: string }
export interface TreeControl { turn: number; bindings: Record<string, Binding>; dispatches: Record<string, Dispatch>; violations: string[]; rootWrites?: string[]; requests: { sessionID: string; role: string; model: string; reasoning: string }[] }
const denied = (message: string): never => { throw new Error(`OPENCODE_WORKER_SCOPE: ${message}`); };
export class TreeGuard {
  control: TreeControl;
  private access: Promise<unknown> = Promise.resolve();
  async locked(fn: () => Promise<void>) { const next = this.access.then(fn); this.access = next.catch(() => {}); return next; }
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: string, private client: any, control?: TreeControl) {
    this.control = control ?? { turn: 0, bindings: {}, dispatches: {}, violations: [], requests: [] };
  }
  get stateFile() { return path.join(path.dirname(this.file), 'tree.json'); }
  async persist() { this.queue = this.queue.then(() => atomicJson(this.stateFile, this.control)); await this.queue; }
  async task() {
    const task = await readJson<Task>(this.file);
    if (!task.routing) throw new Error('Profile routing is required by this guard');
    if (this.control.turn !== task.turn) { this.control.turn = task.turn; this.control.dispatches = {}; this.control.violations = []; this.control.requests = []; this.control.rootWrites = []; }
    return task;
  }
  async inspect(sessionID: string) {
    const task = await this.task();
    const response = await this.client.session.get({ path: { id: sessionID }, query: { directory: task.input.directory } });
    if (response.error || !response.data) denied('session ownership cannot be verified');
    return response.data;
  }
  async bind(sessionID: string, name: string): Promise<Binding> {
    const task = await this.task();
    if (!task.session_id) denied('root session has not been reserved');
    const role = canonicalAgent(name);
    if (sessionID === task.session_id) {
      if (role !== 'sisyphus') denied(`unexpected root role ${role}`);
      const binding: Binding = { sessionID, role, route: task.routing!.agents.sisyphus, writer: task.input.mode === 'write', turn: task.turn, messageID: task.message_id };
      this.control.bindings[sessionID] = binding; return binding;
    }
    const session = await this.inspect(sessionID);
    if (session.parentID !== task.session_id || path.resolve(session.directory || '') !== task.input.directory) denied('only direct child sessions in the assigned directory are allowed');
    const existing = this.control.bindings[sessionID];
    if (existing?.turn === task.turn) {
      if (existing.role !== role) denied('child role changed');
      return existing;
    }
    const candidates = Object.values(this.control.dispatches).filter(d => !d.done && d.role === role && (!d.childID || d.childID === sessionID));
    const dispatch = candidates.find(d => d.childID === sessionID) ?? candidates[0];
    if (!dispatch) denied(`unregistered child role ${role}`);
    dispatch.childID = sessionID;
    const binding: Binding = { sessionID, parentID: session.parentID, role, category: dispatch.category, route: dispatch.route, writer: dispatch.writer, turn: task.turn, nativePermission: session.permission };
    this.control.bindings[sessionID] = binding;
    await this.persist(); return binding;
  }
  async parameters(input: any, output: any) {
    const task = await this.task();
    const role = canonicalAgent(input.agent);
    let route: Route;
    if (AUXILIARY.has(role)) {
      if (input.sessionID !== task.session_id && !this.control.bindings[input.sessionID]) denied('auxiliary request outside the owned task');
      route = task.routing!.auxiliary;
    } else {
      const binding = await this.bind(input.sessionID, input.agent);
      binding.messageID = input.message.id;
      binding.startMessageID ||= input.message.id;
      binding.turn = task.turn;
      route = binding.route;
    }
    if (input.model.providerID !== route.providerID || input.model.id !== route.modelID) denied(`actual model ${input.model.providerID}/${input.model.id} differs from ${role}: ${target(route)}`);
    output.options.reasoningEffort = route.reasoning;
    this.control.requests.push({ sessionID: input.sessionID, role, model: target(route), reasoning: route.reasoning });
    await this.persist();
  }
  async activeWriter() {
    let active: Dispatch | undefined;
    for (const dispatch of Object.values(this.control.dispatches)) {
      if (dispatch.done) continue;
      if (dispatch.childID) {
        const binding = this.control.bindings[dispatch.childID];
        const response = await this.client.session.messages({ path: { id: dispatch.childID } });
        const assistants = (response.data || []).filter((m: any) => m.info?.role === 'assistant' && m.info?.parentID === binding?.messageID);
        const last = assistants.at(-1);
        if (binding?.messageID && last?.info.time?.completed && last.info.finish && !['tool-calls', 'unknown'].includes(last.info.finish) && !assistants.some((m: any) => m.parts?.some((p: any) => p.type === 'tool' && ['pending', 'running'].includes(p.state?.status)))) {
          dispatch.done = true; continue;
        }
      }
      if (dispatch.writer) active ||= dispatch;
    }
    return active;
  }
  async before(input: any, args: Record<string, any>) {
    const task = await this.task();
    const root = input.sessionID === task.session_id;
    const binding = this.control.bindings[input.sessionID];
    if (!root && (!binding || binding.turn !== task.turn)) denied('tool request from an unregistered session');
    if (input.tool === 'task') {
      if (!root || task.routing!.mode === 'single') denied('child delegation is disabled for this actor or mode');
      if (args.load_skills?.length || args.command) denied('delegation cannot load skills or commands');
      const priorID = args.task_id ?? args.session_id;
      const prior = priorID ? this.control.bindings[priorID] : undefined;
      if (priorID && (!prior || prior.parentID !== task.session_id)) denied('cannot continue a session outside this task');
      const category = args.category || prior?.category;
      const role = category ? 'sisyphus-junior' : canonicalAgent(args.subagent_type || prior?.role || '');
      if (category && args.subagent_type && canonicalAgent(args.subagent_type) !== 'sisyphus-junior') denied('category and specialist are mutually exclusive');
      if (!category && !SPECIALISTS.has(role)) denied('only named read-only specialists may be delegated directly');
      const route = category ? task.routing!.categories[category] : task.routing!.agents[role];
      if (!route) denied('unknown delegation route');
      if (prior && (prior.role !== role || prior.category !== category || JSON.stringify(prior.route) !== JSON.stringify(route))) denied('continuation route differs from the owned child');
      if (category && args.run_in_background === true) denied('category tasks must run in the foreground');
      await this.activeWriter();
      if (Object.values(this.control.dispatches).filter(d => !d.done).length >= 2) denied('at most two child tasks may run at once');
      // Serialize category calls even in read-only mode: they all use Junior.
      const writer = Boolean(category);
      if (writer && (this.control.rootWrites?.length || await this.activeWriter())) denied('another writer still owns this task');
      const dispatch: Dispatch = { callID: input.callID, role, category, route, writer, childID: priorID, done: false };
      this.control.dispatches[input.callID] = dispatch;
      if (prior) { prior.turn = task.turn; prior.messageID = undefined; prior.startMessageID = undefined; }
      await this.persist(); return;
    }
    if (input.tool === 'background_output' || input.tool === 'background_cancel') {
      if (!root || args.all) denied('background operations require one owned task ID');
      const id = args.task_id ?? args.taskId;
      if (!id || !Object.values(this.control.dispatches).some(d => d.backgroundID === id)) denied('background task is not owned by this invocation');
      return;
    }
    if (input.tool === 'todowrite') return;
    if (['write', 'edit', 'bash'].includes(input.tool)) {
      if (!root && !binding?.writer) denied('specialist is read-only');
      const writer = await this.activeWriter();
      if (writer && (root || writer.childID !== input.sessionID)) denied('a child writer still owns this task');
    }
    await checkTool(task, input.tool, args);
    if (root && ['write', 'edit', 'bash'].includes(input.tool)) { (this.control.rootWrites ||= []).push(input.callID); await this.persist(); }
  }
  async after(input: any, output: any) {
    this.control.rootWrites = this.control.rootWrites?.filter(id => id !== input.callID);
    if (input.tool !== 'task') { await this.persist(); return; }
    const dispatch = this.control.dispatches[input.callID];
    if (!dispatch) return;
    const childID = output.metadata?.sessionId || output.metadata?.taskId || output.output?.match(/(?:session_id|task_id):\s*(ses_[A-Za-z0-9]+)/)?.[1];
    if (typeof childID === 'string' && childID.startsWith('ses_')) {
      if (dispatch.childID && dispatch.childID !== childID) {
        const other = Object.values(this.control.dispatches).find(d => d.childID === childID);
        if (!other || other.role !== dispatch.role || other.category !== dispatch.category || JSON.stringify(other.route) !== JSON.stringify(dispatch.route)) denied('task result names a different child');
        other!.childID = dispatch.childID;
      }
      dispatch.childID = childID;
      await this.bind(childID, dispatch.role);
    }
    const backgroundID = output.metadata?.backgroundTaskId;
    if (typeof backgroundID === 'string') dispatch.backgroundID = backgroundID;
    if (!dispatch.childID) { dispatch.done = true; dispatch.error = 'Delegation did not return an owned child session'; }
    else if (input.args?.run_in_background !== true) await this.activeWriter();
    await this.persist();
  }
  async event(event: any) {
    const part = event.properties?.part;
    if (part?.type === 'tool' && ['completed', 'error'].includes(part.state?.status)) this.control.rootWrites = this.control.rootWrites?.filter(id => id !== part.callID);
    if (event.type === 'message.part.updated' && part?.type === 'tool' && part.tool === 'task' && part.state?.status === 'error') {
      const dispatch = this.control.dispatches[part.callID];
      if (dispatch) { dispatch.done = true; dispatch.error = String(part.state.error || 'delegation failed'); await this.persist(); }
    }
  }
  async checked(fn: () => Promise<void>) {
    try { await fn(); } catch (e) {
      this.control.violations.push(e instanceof Error ? e.message : String(e));
      await this.persist(); throw e;
    }
  }
}
export async function loadTreeGuard(file: string, client: any) {
  const state = await maybeJson<TreeControl>(path.join(path.dirname(file), 'tree.json'));
  return new TreeGuard(file, client, state);
}
