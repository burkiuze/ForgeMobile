// Model registry: OpenRouter cloud models + models served on the local network
// (llama.cpp llama-server, Ollama, LM Studio… anything OpenAI-compatible).

export const AUTO_ID = 'openrouter/free';
export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export interface ModelInfo {
  id: string;
  name: string;
  blurb: string;
  blurbTr: string;
}

export const CLOUD_MODELS: ModelInfo[] = [
  { id: AUTO_ID, name: 'Auto', blurb: 'Best available free model, picked automatically', blurbTr: 'En iyi ücretsiz model otomatik seçilir' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B', blurb: 'Google DeepMind · 262K ctx · multimodal, tool use', blurbTr: 'Google DeepMind · 262K bağlam · çok kipli, araç kullanımı' },
  { id: 'inception/mercury-decide:free', name: 'Mercury Decide', blurb: 'Inception · structured decisions', blurbTr: 'Inception · yapılandırılmış kararlar' },
  { id: 'cohere/north-mini-code:free', name: 'North Mini Code', blurb: 'Cohere · agentic coding MoE · 256K ctx', blurbTr: 'Cohere · ajan kodlama MoE · 256K bağlam' },
  { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small', blurb: 'Thinking Machines · MoE · 1.05M ctx', blurbTr: 'Thinking Machines · MoE · 1.05M bağlam' },
];

export type Backend = 'openrouter' | 'lan';

export interface Endpoint {
  backend: Backend;
  base: string;
  key: string;
  model: string;
}

/** `vendor/model[:free]` → OpenRouter, `lan:<model>` → OpenAI-compatible server on the LAN. */
export function resolve(id: string, lanUrl: string, openrouterKey: string): Endpoint {
  if (id.startsWith('lan:')) {
    return { backend: 'lan', base: normalizeLanUrl(lanUrl), key: '', model: id.slice(4) };
  }
  return { backend: 'openrouter', base: OPENROUTER_BASE, key: openrouterKey, model: id };
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
  const m = CLOUD_MODELS.find((m) => m.id === id);
  if (m) return m.name;
  if (id.startsWith('lan:')) return `💻 ${id.slice(4)}`;
  const tail = id.split('/').pop() || id;
  return tail.replace(/:free$/, '');
}
