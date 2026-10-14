// Model ids and endpoint resolution across providers.
// `vendor/model[:free]` → OpenRouter · `<provider>:<model>` → that provider ·
// `lan:<model>` → OpenAI-compatible server on the local network · `device:<catalog id>` → on the phone.

import { findMobileModel } from './mobileModels';
import { FORGE_PROXY, ProviderId, provider, splitModelId } from './providers';

export { AUTO_ID } from './providers';
export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export interface Endpoint {
  provider: ProviderId;
  base: string;
  key: string;
  model: string;
  /** Goes through the built-in Forge AI proxy (no key). */
  viaProxy?: boolean;
}

export interface ResolveOptions {
  lanUrl: string;
  customUrl: string;
  key: (name: string) => string;
}

export function resolve(id: string, o: ResolveOptions): Endpoint {
  const { provider: p, model } = splitModelId(id);
  const prov = provider(p);
  const key = prov.key ? o.key(prov.key) : '';
  if (p === 'lan') return { provider: p, base: normalizeLanUrl(o.lanUrl), key: '', model };
  if (prov.builtIn && !key.trim()) return { provider: p, base: FORGE_PROXY, key: '', model, viaProxy: true };
  if (p === 'custom') return { provider: p, base: o.customUrl.trim().replace(/\/+$/, ''), key, model };
  return { provider: p, base: prov.base, key, model };
}

/** "192.168.1.5:11434" → "http://192.168.1.5:11434/v1" */
export function normalizeLanUrl(u: string): string {
  let s = u.trim().replace(/\/+$/, '');
  if (!s) return 'http://192.168.1.2:11434/v1';
  if (!/^https?:\/\//.test(s)) s = 'http://' + s;
  if (!/\/v1$/.test(s)) s += '/v1';
  return s;
}

export function displayName(id: string): string {
  const { provider: p, model } = splitModelId(id);
  if (p === 'device') {
    const m = findMobileModel(model);
    return m ? `📱 ${m.name} ${m.quant}` : `📱 ${model}`;
  }
  if (p === 'lan') return `💻 ${model}`;
  const known = provider(p).models.find((m) => m.id === model);
  if (known) return known.name;
  const tail = model.split('/').pop() || model;
  return tail.replace(/:free$/, '');
}

/** Kept for older imports. */
export const CLOUD_MODELS = provider('openrouter').models.map((m) => ({ id: m.id, name: m.name, blurb: m.blurb || '', blurbTr: m.blurbTr || '' }));
