import { loadTreeGuard } from './tree-guard.js';
import { readJson, permissionRules, type Task } from './core.js';
import { AGENTS, AUXILIARY, canonicalAgent, SPECIALISTS, target } from './routing.js';
export default async function OpenCodeWorkerGuard(ctx: any) {
  const file = process.env.OPENCODE_WORKER_TASK_FILE;
  if (!file) throw new Error('OPENCODE_WORKER_TASK_FILE is required');
  const guard = await loadTreeGuard(file, ctx.client);
  return {
    config: async (config: any) => {
      const task = await readJson<Task>(file);
      if (!task.routing) throw new Error('Worker routing was not reserved');
      for (const [name, agent] of Object.entries(config.agent || {}) as [string, any][]) {
        const role = canonicalAgent(name);
        const route = AUXILIARY.has(role) ? task.routing.auxiliary : task.routing.agents[role];
        if (!route) continue;
        if (task.routing.mode === 'single') agent.model = target(route);
        if (agent.model !== target(route)) throw new Error(`OMO effective role ${name} differs from the reserved profile`);
        agent.reasoningEffort = route.reasoning;
        agent.variant = route.reasoning;
        const rules = permissionRules(task.input, ctx.worktree || task.input.directory);
        const permissions: Record<string, any> = {};
        for (const rule of rules) {
          if (rule.pattern === '*') permissions[rule.permission] = rule.action;
          else {
            const prior = permissions[rule.permission];
            const patterns = typeof prior === 'object' ? prior : { '*': prior || 'deny' };
            permissions[rule.permission] = { ...patterns, [rule.pattern]: rule.action };
          }
        }
        agent.permission = { ...permissions, call_omo_agent: 'deny', skill: 'deny' };
        if (role !== 'sisyphus') Object.assign(agent.permission, { task: 'deny', background_output: 'deny', background_cancel: 'deny' });
        if (SPECIALISTS.has(role)) Object.assign(agent.permission, { bash: 'deny', write: 'deny', edit: 'deny', apply_patch: 'deny' });
      }
    },
    'chat.params': async (input: any, output: any) => guard.checked(() => guard.parameters(input, output)),
    'tool.execute.before': async (input: any, output: any) => guard.checked(() => guard.locked(() => guard.before(input, output.args))),
    'tool.execute.after': async (input: any, output: any) => guard.checked(() => guard.locked(() => guard.after(input, output))),
    event: async ({ event }: any) => guard.event(event),
  };
}
