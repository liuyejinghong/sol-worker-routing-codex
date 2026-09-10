import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parse, type ParseError } from 'jsonc-parser';

export interface Route { providerID: string; modelID: string; reasoning: string }
export interface Routing {
  version: 1; profile: string; source: string; mode: 'omo' | 'single';
  agents: Record<string, Route>; categories: Record<string, Route>; auxiliary: Route;
}
export const AGENTS = ['sisyphus', 'atlas', 'prometheus', 'oracle', 'metis', 'momus', 'explore', 'librarian', 'multimodal-looker', 'sisyphus-junior'] as const;
export const SPECIALISTS = new Set(['oracle', 'metis', 'momus', 'explore', 'librarian', 'multimodal-looker']);
export const CATEGORIES = ['deep', 'ultrabrain', 'unspecified-high', 'visual-engineering', 'artistry', 'quick', 'unspecified-low', 'writing'] as const;
export const AUXILIARY = new Set(['title', 'summary', 'compaction']);
export const target = (r: Route) => `${r.providerID}/${r.modelID}`;
export function canonicalAgent(name: string) {
  const clean = name.replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase();
  return [...AGENTS].sort((a, b) => b.length - a.length).find(a => clean === a || clean.startsWith(`${a} - `)) ?? clean;
}
const object = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export function parseRouting(text: string, profile: string, source: string, mode: Routing['mode'] = 'omo'): Routing {
  const errors: ParseError[] = [];
  const doc = parse(text, errors, { allowTrailingComma: true });
  if (errors.length || !object(doc)) throw new Error('OMO configuration is not valid JSONC');
  const selected = doc.profiles?.[profile];
  if (!object(selected) || !object(selected['[opencode]'])) throw new Error(`OMO profile ${profile} is missing; refusing base-model fallback`);
  const block = selected['[opencode]'];
  if (block.model_fallback !== false || block.runtime_fallback !== false || block.team_mode?.enabled !== false || block.background_task?.maxDepth !== 1) {
    throw new Error('Worker profile must disable model/runtime fallback and Team Mode, and set background_task.maxDepth=1');
  }
  const catalog = { ...doc.models, ...selected.models };
  const resolve = (entry: any, label: string): Route => {
    if (!object(entry) || typeof entry.model !== 'string' || entry.models !== undefined || (entry.fallback_models && entry.fallback_models.length)) throw new Error(`${label} needs one explicit model, without fallback chains`);
    const preset = catalog[entry.model];
    const id = preset?.model ?? entry.model;
    const reasoning = entry.reasoning ?? preset?.reasoning;
    const pieces = typeof id === 'string' ? id.split('/') : [];
    if (pieces.length !== 2 || pieces[0] !== 'opencode-go' || !pieces[1]) throw new Error(`${label} must select an explicit OpenCode Go model`);
    if (typeof reasoning !== 'string' || !reasoning) throw new Error(`${label} needs explicit maximum reasoning`);
    return { providerID: pieces[0], modelID: pieces[1], reasoning };
  };
  const agents = Object.fromEntries(AGENTS.map(name => [name, resolve(block.agents?.[name], `agents.${name}`)]));
  const categories = Object.fromEntries(CATEGORIES.map(name => [name, resolve(block.categories?.[name], `categories.${name}`)]));
  const auxiliary = resolve({ model: 'bulk' }, 'models.bulk');
  const routing: Routing = { version: 1, profile, source, mode, agents, categories, auxiliary };
  if (mode === 'single') {
    const entry = agents.sisyphus;
    routing.agents = Object.fromEntries(AGENTS.map(n => [n, { ...entry }]));
    routing.categories = Object.fromEntries(CATEGORIES.map(n => [n, { ...entry }]));
    routing.auxiliary = { ...entry };
  }
  return routing;
}
export async function loadRouting(profile: string, mode: Routing['mode']) {
  const source = process.env.OPENCODE_WORKER_OMO_CONFIG || path.join(os.homedir(), '.omo/omo.jsonc');
  return parseRouting(await fs.readFile(source, 'utf8'), profile, source, mode);
}
export function sameRouting(a: Routing, b: Routing) {
  return JSON.stringify({ profile: a.profile, mode: a.mode, agents: a.agents, categories: a.categories, auxiliary: a.auxiliary }) ===
    JSON.stringify({ profile: b.profile, mode: b.mode, agents: b.agents, categories: b.categories, auxiliary: b.auxiliary });
}
export function validateMaximum(route: Route, models: Record<string, any>) {
  const model = models[route.modelID];
  if (!model) throw new Error(`Model unavailable: ${target(route)}`);
  const order = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
  const levels = Object.keys(model.variants || {});
  if (!levels.length || levels.some(x => !order.includes(x))) throw new Error(`Cannot establish maximum reasoning for ${target(route)}`);
  const highest = levels.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
  if (route.reasoning !== highest) throw new Error(`${target(route)} requires maximum reasoning ${highest}, got ${route.reasoning}`);
}
