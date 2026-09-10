import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import { AGENTS, canonicalAgent, target, validateMaximum, type Routing } from './routing.js';
import { atomicJson, sleep, PROVIDER, type Identity } from './core.js';

export interface Connection { url: string; password: string; pid: number; directory: string }
export function opencodePath() { return process.env.OPENCODE_WORKER_BIN || path.join(os.homedir(), '.opencode/bin/opencode'); }
export function api<T = any>(connection: Connection, route: string, body?: unknown, timeout = 15000): Promise<T> {
  const url = new URL(route, connection.url);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new Error('Only the plugin-owned loopback OpenCode service is supported');
  url.searchParams.set('directory', connection.directory);
  const encoded = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const request = http.request(url, {
      method: body === undefined ? 'GET' : 'POST',
      agent: false,
      headers: { Authorization: `Basic ${Buffer.from(`opencode:${connection.password}`).toString('base64')}`, 'Content-Type': 'application/json' },
    }, response => {
      let content = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        content += chunk;
        if (content.length > 32_000_000) request.destroy(new Error('OpenCode response exceeds 32 MB; task status needs inspection'));
      });
      response.on('end', () => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`OpenCode ${route.split('?')[0]} returned HTTP ${response.statusCode}`));
          return;
        }
        try { resolve(content ? JSON.parse(content) : undefined); } catch { reject(new Error('OpenCode returned invalid JSON')); }
      });
      response.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(timeout, () => request.destroy(new Error(`OpenCode ${route.split('?')[0]} timed out; submission is not retried`)));
    request.end(encoded);
  });
}
export async function unusedPort() {
  const socket = net.createServer();
  await new Promise<void>((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve); });
  const port = (socket.address() as net.AddressInfo).port;
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
  return port;
}
export class Runtime {
  constructor(public connection: Connection, private child?: ChildProcess) {}
  static async start(directory: string, artifactDir: string, taskFile: string, routing: Routing): Promise<Runtime> {
    await fs.mkdir(artifactDir, { recursive: true, mode: 0o700 });
    const port = await unusedPort();
    const logPath = path.join(artifactDir, 'server.log');
    const log = await fs.open(logPath, 'a', 0o600);
    const password = randomBytes(32).toString('hex');
    const guard = pathToFileURL(fileURLToPath(new URL('./guard.mjs', import.meta.url))).href;
    const config = {
      model: target(routing.agents.sisyphus), small_model: target(routing.auxiliary), autoupdate: false, share: 'disabled', enabled_providers: ['opencode-go'],
      plugin: [guard],
      agent: Object.fromEntries(['title', 'summary', 'compaction'].map(name => [name, { model: target(routing.auxiliary), variant: routing.auxiliary.reasoning, reasoningEffort: routing.auxiliary.reasoning }])),
    };
    const testProxy = process.env.OPENCODE_WORKER_TEST_GO_PROXY;
    if (testProxy) {
      const url = new URL(testProxy);
      if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new Error('Test observer must be a loopback endpoint');
      Object.assign(config, { provider: { 'opencode-go': { options: { baseURL: testProxy } } } });
    }
    const child = spawn(opencodePath(), ['serve', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: directory, detached: true, stdio: ['ignore', log.fd, log.fd],
      env: { ...process.env, OPENCODE_CONFIG_CONTENT: JSON.stringify(config), OMO_PROFILE: routing.profile, OPENCODE_SERVER_PASSWORD: password,
        OPENCODE_SERVER_USERNAME: 'opencode', OPENCODE_WORKER_TASK_FILE: taskFile },
    });
    await log.close();
    let spawnError: Error | undefined;
    child.on('error', error => { spawnError = error; });
    const runtime = new Runtime({ url: '', password, pid: child.pid || 0, directory }, child);
    try {
      if (child.pid) await atomicJson(path.join(artifactDir, 'connection.json'), runtime.connection);
      const deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        if (spawnError) throw new Error(`Cannot start OpenCode at ${opencodePath()}: ${(spawnError as NodeJS.ErrnoException).code || spawnError.message}`);
        if (child.exitCode !== null) throw new Error(`OpenCode exited during startup; inspect ${logPath}`);
        const logText = await fs.readFile(logPath, 'utf8');
        const match = logText.match(/opencode server listening on (http:\/\/127\.0\.0\.1:\d+)/);
        if (match) {
          if (new URL(match[1]).port !== String(port)) throw new Error('OpenCode did not bind the assigned temporary port');
          runtime.connection.url = match[1];
          await api(runtime.connection, '/global/health');
          await atomicJson(path.join(artifactDir, 'connection.json'), runtime.connection);
          await atomicJson(path.join(artifactDir, 'network.json'), { inherited_names: ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'].filter(key => Boolean(process.env[key])) });
          return runtime;
        }
        await sleep(100);
      }
      throw new Error(`OpenCode startup timeout; inspect ${logPath}`);
    } catch (error) { await runtime.stop(); throw error; }
  }
  async inspect(routing: Routing): Promise<{ identity: Identity; worktree: string; plugins: string[] }> {
    const [health, config, agents, providers, paths] = await Promise.all([
      api(this.connection, '/global/health'), api(this.connection, '/config', undefined, 45000),
      api(this.connection, '/agent', undefined, 45000), api(this.connection, '/provider', undefined, 45000), api(this.connection, '/path'),
    ]);
    const chosen = process.env.OPENCODE_WORKER_AGENT;
    const candidates = agents.filter((a: any) => !a.hidden && a.mode === 'primary' && (chosen ? a.name === chosen : /^sisyphus(?:\s|$)/i.test(a.name)));
    if (candidates.length !== 1) throw new Error('Configured OMO primary agent is missing or ambiguous; no default-agent fallback was performed');
    const agent = candidates[0];
    const entry = routing.agents.sisyphus;
    if (canonicalAgent(agent.name) !== 'sisyphus' || agent.model?.providerID !== entry.providerID || agent.model?.modelID !== entry.modelID) throw new Error('OMO primary identity differs from the selected profile');
    if (config.small_model !== target(routing.auxiliary)) throw new Error('Auxiliary model differs from the profile');
    const provider = providers.all.find((p: any) => p.id === PROVIDER);
    if (!providers.connected.includes(PROVIDER) || !provider?.models) throw new Error('OpenCode Go connection is unavailable');
    for (const route of [...Object.values(routing.agents), ...Object.values(routing.categories), routing.auxiliary]) validateMaximum(route, provider.models);
    for (const name of AGENTS) {
      const resolved = agents.find((a: any) => canonicalAgent(a.name) === name);
      const expected = routing.agents[name];
      if (!resolved || resolved.model?.providerID !== expected.providerID || resolved.model?.modelID !== expected.modelID) throw new Error(`Effective OMO role ${name} differs from the selected profile`);
    }
    const plugins = (config.plugin || []).map((p: unknown) => typeof p === 'string' ? p : JSON.stringify(p));
    if (!plugins.some((p: string) => p.includes('guard.mjs'))) throw new Error('OpenCode task guard was not loaded');
    return { identity: { agent: agent.name, providerID: entry.providerID, modelID: entry.modelID, opencode_version: health.version }, worktree: paths.worktree, plugins };
  }
  async stop() {
    if (!this.child || this.child.exitCode !== null || this.child.signalCode !== null || !this.child.pid) return;
    const pid = this.child.pid;
    try { process.kill(-pid, 'SIGTERM'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e; }
    const deadline = Date.now() + 2500;
    while (this.child.exitCode === null && this.child.signalCode === null && Date.now() < deadline) await sleep(50);
    if (this.child.exitCode === null && this.child.signalCode === null) {
      try { process.kill(-pid, 'SIGKILL'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e; }
      const killDeadline = Date.now() + 2000;
      while (this.child.exitCode === null && this.child.signalCode === null && Date.now() < killDeadline) await sleep(50);
      if (this.child.exitCode === null && this.child.signalCode === null) throw new Error('Private OpenCode process exit is unconfirmed');
    }
  }
}
