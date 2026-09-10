#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
if (process.argv.includes('--version')) { console.log('fixture-1.18.29'); process.exit(0); }
const cfg = JSON.parse(process.env.OPENCODE_CONFIG_CONTENT);
const directory = process.cwd();
const dbFile = path.join(process.env.OPENCODE_WORKER_FAKE_DB, 'sessions.json');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const sessions = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile)) : {};
const save = () => fs.writeFileSync(dbFile, JSON.stringify(sessions));
const state = {};
const profile = JSON.parse(fs.readFileSync(process.env.OPENCODE_WORKER_OMO_CONFIG, 'utf8')).profiles[cfg ? process.env.OMO_PROFILE : 'codex-worker'];
const [providerID, modelID] = cfg.model.split('/');
const model = { providerID, modelID };
const routes = profile['[opencode]'];
const resolve = name => { const [providerID, modelID] = profile.models[routes.agents[name].model].model.split('/'); return { providerID, modelID }; };
const agent = 'Sisyphus - fixture';
const server = http.createServer(async (req, res) => {
  if (req.headers.authorization !== `Basic ${Buffer.from(`opencode:${process.env.OPENCODE_SERVER_PASSWORD}`).toString('base64')}`) { res.writeHead(401).end(); return; }
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname;
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : undefined;
  const send = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
  if (route === '/global/health') return send({ healthy: true, version: 'fixture-1.18.29' });
  if (route === '/config') return send(cfg);
  if (route === '/agent') return send(Object.keys(routes.agents).map(n => ({ name: n === 'sisyphus' ? agent : n, mode: ['sisyphus','atlas','prometheus'].includes(n) ? 'primary' : 'subagent', model: resolve(n) })));
  if (route === '/provider') return send({ connected: ['opencode-go'], all: [{ id: 'opencode-go', models: { 'deepseek-flash': { variants: { low: {}, high: {}, max: {} } }, 'muse-spark-1.3-contributor': { variants: { low: {}, high: {}, xhigh: {} } } } }] });
  if (route === '/path') return send({ directory, worktree: directory });
  if (route === '/session/status') return send(state);
  if (route === '/session' && req.method === 'POST') {
    const id = `ses_${Date.now()}_${Object.keys(sessions).length}`;
    sessions[id] = { id, directory, permission: body.permission, messages: [] }; save(); return send(sessions[id]);
  }
  const [, , id, action] = route.split('/');
  const session = sessions[id];
  if (!session) { res.writeHead(404).end(); return; }
  if (!action) return send(session);
  if (action === 'children') return send(Object.values(sessions).filter(s => s.parentID === id).map(({ messages, ...info }) => info));
  if (action === 'message') return send(session.messages);
  if (action === 'abort') { delete state[id]; return send(true); }
  if (action === 'prompt_async') {
    res.writeHead(204).end();
    const text = body.parts[0].text;
    setTimeout(() => {
      state[id] = { type: 'busy' };
      session.messages.push({ info: { id: body.messageID, role: 'user' }, parts: [] });
      save();
      if (/FAKE_TREE|FAKE_CHILD/.test(text)) {
        const childID = `ses_child_${Date.now()}`;
        const childMessage = 'msg_child_' + Date.now();
        const route = { ...resolve('sisyphus-junior'), reasoning: 'xhigh' };
        sessions[childID] = { id: childID, parentID: id, directory, permission: body.permission || [], messages: [{ info: { id: childMessage, role: 'user' }, parts: [] }] };
        state[childID] = { type: 'busy' };
        const task = JSON.parse(fs.readFileSync(process.env.OPENCODE_WORKER_TASK_FILE, 'utf8'));
        const tree = { turn: task.turn, bindings: { [childID]: { sessionID: childID, parentID: id, role: 'sisyphus-junior', category: 'quick', route, writer: false, turn: task.turn, messageID: childMessage, startMessageID: childMessage } }, dispatches: { child: { callID: 'child', role: 'sisyphus-junior', category: 'quick', route, writer: false, childID, done: false } }, violations: [], requests: [] };
        fs.writeFileSync(path.join(path.dirname(process.env.OPENCODE_WORKER_TASK_FILE), 'tree.json'), JSON.stringify(tree));
        if (!text.includes('FAKE_CHILD_PENDING')) setTimeout(() => {
          const info = { id: 'child_result', role: 'assistant', parentID: childMessage, agent: 'Sisyphus-Junior', ...route, time: { completed: Date.now() }, finish: 'stop' };
          if (text.includes('FAKE_CHILD_WRONG_MODEL')) info.modelID = 'wrong-child-model';
          if (text.includes('FAKE_CHILD_ERROR')) info.error = { name: 'APIError' };
          sessions[childID].messages.push({ info, parts: [{ type: 'text', text: 'child result' }] });
          delete state[childID]; save();
          const notification = 'msg_notify_' + Date.now();
          session.messages.push({ info: { id: notification, role: 'user' }, parts: [] }); state[id] = { type: 'busy' };
          setTimeout(() => { session.messages.push({ info: { id: 'synthesized', role: 'assistant', parentID: notification, ...model, agent, time: { completed: Date.now() }, finish: 'stop' }, parts: [{ type: 'text', text: 'collected child result' }] }); delete state[id]; save(); }, 100);
        }, 2000);
      }
      const finish = () => {
        const info = { id: `a_${Date.now()}`, parentID: body.messageID, role: 'assistant', ...model, agent, time: { completed: Date.now() }, finish: 'stop' };
        if (text.includes('FAKE_MODEL_ERROR')) info.error = { name: 'APIError', data: { message: 'fixture rate limit exhausted', statusCode: 429 } };
        if (text.includes('FAKE_WRONG_MODEL')) info.modelID = 'unexpected-model';
        session.messages.push({ info, parts: [{ type: 'text', text: 'fixture result' }] });
        delete state[id]; save();
      };
      if (text.includes('FAKE_STALL')) return;
      setTimeout(finish, text.includes('FAKE_SLOW') ? 60000 : 100);
    }, 200);
    return;
  }
  res.writeHead(404).end();
});
const portIndex=process.argv.indexOf('--port');
server.listen(portIndex>=0?Number(process.argv[portIndex+1]):0, '127.0.0.1', () => console.log(`opencode server listening on http://127.0.0.1:${server.address().port}`));
