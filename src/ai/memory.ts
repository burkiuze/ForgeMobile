// Agent memory (port of desktop src/ai/memory.rs).
// * TencentDB Agent Memory (Memory Core, e.g. running on your PC on port 8420):
//   turns go to /v3/conversation/add, recall uses /v3/atomic/search then /v3/conversation/search.
// * Built-in: offline store on the phone (L0 turns + L1 facts) with BM25 retrieval.

import { http } from '../platform/native';

export type MemoryBackend = 'off' | 'builtin' | 'tencentdb';

export interface MemoryConfig {
  backend: MemoryBackend;
  url: string;
  token: string;
  serviceId: string;
  userId: string;
  recallLimit: number;
}

export const defaultMemoryConfig = (): MemoryConfig => ({
  backend: 'builtin',
  url: 'http://192.168.1.2:8420',
  token: '',
  serviceId: 'default',
  userId: 'mobile',
  recallLimit: 6,
});

export interface MemoryItem {
  kind: string;
  text: string;
  score: number;
}

interface Record_ {
  kind: 'turn' | 'fact';
  text: string;
  session: string;
  ts: number;
}

const KEY = 'forge.memory.v1';

function load(): Record_[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function append(r: Record_) {
  const all = load();
  all.push(r);
  // keep the store bounded on a phone
  const trimmed = all.length > 2000 ? all.slice(all.length - 2000) : all;
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
}

export function localCount() {
  return load().length;
}

export function clearLocal() {
  localStorage.removeItem(KEY);
}

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => [...w].length > 1);
}

/** Okapi BM25 → [doc index, score], best first, zero scores dropped. */
export function bm25(docs: string[], query: string): [number, number][] {
  const k1 = 1.4;
  const b = 0.75;
  const toks = docs.map(tokenize);
  const n = docs.length;
  if (!n) return [];
  const avg = toks.reduce((a, t) => a + t.length, 0) / n;
  const df = new Map<string, number>();
  for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1);
  const q = tokenize(query);
  return toks
    .map((t, i): [number, number] => {
      const len = t.length;
      let s = 0;
      for (const w of q) {
        const tf = t.filter((x) => x === w).length;
        if (!tf) continue;
        const d = df.get(w) || 0;
        const idf = Math.log((n - d + 0.5) / (d + 0.5) + 1);
        s += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * len) / Math.max(avg, 1)));
      }
      return [i, s];
    })
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
}

const CUES = [
  'always', 'never', 'prefer', 'i like', 'i want', 'my name', 'i am', 'remember', "don't", 'do not', 'use ',
  'hep', 'asla', 'tercih', 'seviyorum', 'istiyorum', 'benim', 'adım', 'hatırla', 'kullan', 'olsun', 'yapma',
];

export function extractFacts(text: string): string[] {
  return text
    .split(/[.!\n?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && s.length < 300)
    .filter((s) => CUES.some((c) => s.toLowerCase().includes(c)));
}

export class Memory {
  constructor(public cfg: MemoryConfig) {}

  private async post(path: string, body: unknown): Promise<any> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tdai-service-id': this.cfg.serviceId,
      'x-tdai-team-id': 'default',
      'x-tdai-user-id': this.cfg.userId,
      'x-tdai-agent-id': 'forge',
    };
    if (this.cfg.token) h.Authorization = `Bearer ${this.cfg.token}`;
    const r = await http({ url: `${this.cfg.url.replace(/\/+$/, '')}${path}`, method: 'POST', headers: h, body: JSON.stringify(body), timeoutMs: 15000 });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.text.slice(0, 200)}`);
    const v = r.json();
    if ((v.code ?? 0) !== 0) throw new Error(v.message || 'memory error');
    return v.data;
  }

  async health(): Promise<string> {
    if (this.cfg.backend === 'off') return 'off';
    if (this.cfg.backend === 'builtin') return `built-in · ${localCount()} records`;
    const r = await http({ url: `${this.cfg.url.replace(/\/+$/, '')}/health`, timeoutMs: 8000 });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const v = r.json();
    return `TencentDB Agent Memory ${v.version || ''} · ${v.status || 'ok'}`;
  }

  async recall(query: string): Promise<MemoryItem[]> {
    const limit = Math.max(1, this.cfg.recallLimit);
    if (this.cfg.backend === 'off') return [];
    if (this.cfg.backend === 'builtin') {
      const recs = load();
      return bm25(recs.map((r) => r.text), query)
        .slice(0, limit)
        .map(([i, score]) => ({ kind: recs[i].kind === 'fact' ? 'L1 fact' : 'L0 turn', text: recs[i].text, score }));
    }
    const q = query.slice(0, 2000);
    const out: MemoryItem[] = [];
    try {
      const d = await this.post('/v3/atomic/search', { query: q, limit });
      for (const it of d?.items || []) out.push({ kind: it.type || 'atom', text: String(it.content || ''), score: Number(it.score || 0) });
    } catch {
      /* fall through */
    }
    if (out.length < limit) {
      try {
        const d = await this.post('/v3/conversation/search', { query: q, limit: limit - out.length });
        for (const it of d?.messages || [])
          out.push({ kind: `L0 ${it.role || ''}`, text: String(it.content || '').slice(0, 600), score: Number(it.score || 0) });
      } catch {
        /* memory core unreachable */
      }
    }
    return out;
  }

  async storeTurn(session: string, user: string, assistant: string) {
    if (this.cfg.backend === 'off') return;
    if (this.cfg.backend === 'builtin') {
      append({ kind: 'turn', text: `User: ${user}\nForge: ${assistant}`, session, ts: Date.now() });
      for (const f of extractFacts(user)) append({ kind: 'fact', text: f, session, ts: Date.now() });
      return;
    }
    const messages: { role: string; content: string }[] = [{ role: 'user', content: user.slice(0, 8000) }];
    if (assistant.trim()) messages.push({ role: 'assistant', content: assistant.slice(0, 8000) });
    await this.post('/v3/conversation/add', { session_id: session, messages });
  }

  async remember(session: string, fact: string) {
    if (this.cfg.backend === 'off') throw new Error('memory is off');
    if (this.cfg.backend === 'builtin') return append({ kind: 'fact', text: fact, session, ts: Date.now() });
    await this.post('/v3/conversation/add', { session_id: session, messages: [{ role: 'user', content: `Please remember: ${fact}` }] });
  }
}
