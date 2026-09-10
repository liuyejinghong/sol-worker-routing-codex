import path from 'node:path';
import { maybeJson, type Task, type SessionResult } from './core.js';
import { api, type Connection } from './runtime.js';
import type { TreeControl } from './tree-guard.js';
import { canonicalAgent } from './routing.js';

export function currentMessages(messages: any[], firstMessageID: string) {
  const index = messages.findIndex(m => m.info?.id === firstMessageID);
  if (index < 0) return [];
  return messages.slice(index).map(m => m.info?.role === 'assistant' ? { ...m, info: { ...m.info, parentID: firstMessageID } } : m);
}
export async function descendants(connection: Connection, root: string) {
  const out: any[] = [], queue = [root], seen = new Set([root]);
  while (queue.length) {
    const parent = queue.shift()!;
    const children = await api<any[]>(connection, `/session/${parent}/children`);
    for (const child of children) {
      if (child.parentID !== parent || seen.has(child.id)) throw new Error('Unexpected session lineage in owned task');
      if (out.length >= 64) throw new Error('Owned session tree exceeds the supported size');
      seen.add(child.id); out.push(child); queue.push(child.id);
    }
  }
  return out;
}
export async function abortTree(connection: Connection, root: string) {
  const nodes = await descendants(connection, root);
  await Promise.all(nodes.map(n => api(connection, `/session/${n.id}/abort`, {}).catch(() => {})));
  await api(connection, `/session/${root}/abort`, {});
}
export function verifyIdentities(row: SessionResult, identities: { agent?: string; providerID?: string; modelID?: string }[]) {
  return identities.every(i => canonicalAgent(i.agent || '') === row.role && i.providerID === row.providerID && i.modelID === row.modelID);
}
export async function treeControl(file: string) { return maybeJson<TreeControl>(path.join(path.dirname(file), 'tree.json')); }
