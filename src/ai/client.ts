// OpenAI-compatible chat client with SSE streaming (OpenRouter or a LAN server).

import { http, httpStream } from '../platform/native';
import { streamClaude } from './anthropic';
import { streamDevice } from './device';
import { Endpoint, OPENROUTER_BASE } from './models';
import { provider } from './providers';

export interface Msg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Reply {
  text: string;
  /** Concrete model that answered (useful with `openrouter/free`). */
  model: string;
}

/** Incremental SSE parser: feed raw chunks, get `data:` payloads. */
export class SseParser {
  private buf = '';
  push(chunk: string, onData: (data: string) => void) {
    this.buf += chunk;
    let nl: number;
    while ((nl = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, nl).replace(/\r$/, '');
      this.buf = this.buf.slice(nl + 1);
      if (line.startsWith('data:')) onData(line.slice(5).trim());
    }
  }
}

function headers(ep: Endpoint): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/burkiuze/ForgeMobile',
    'X-Title': 'Forge Mobile',
  };
  if (ep.key.trim()) h.Authorization = `Bearer ${ep.key.trim()}`;
  if (ep.viaProxy) h['X-Forge-Client'] = 'forge-mobile';
  return h;
}

export async function streamChat(
  ep: Endpoint,
  messages: Msg[],
  temperature: number,
  signal: AbortSignal | undefined,
  onDelta: (d: string) => void,
): Promise<Reply> {
  if (ep.provider === 'device') return streamDevice(ep.model, messages, temperature, signal, onDelta);
  const prov = provider(ep.provider);
  if (prov.key && !ep.key.trim() && !ep.viaProxy && ep.provider !== 'custom') {
    throw new Error(`${prov.name} API key missing — add ${prov.key} in Settings › Providers (or connect Forge.env).`);
  }
  if (ep.provider === 'anthropic') return streamClaude(ep.model, ep.key, messages, signal, onDelta);
  if (!ep.base) throw new Error(`${prov.name}: base URL is not set (Settings › Providers).`);
  let text = '';
  let model = ep.model;
  let providerError = '';
  const parser = new SseParser();
  const res = await httpStream(
    {
      url: `${ep.base}/chat/completions`,
      method: 'POST',
      headers: headers(ep),
      body: JSON.stringify({ model: ep.model, messages, stream: true, temperature }),
      timeoutMs: 180000,
      signal,
    },
    (chunk) =>
      parser.push(chunk, (data) => {
        if (data === '[DONE]') return;
        let v: any;
        try {
          v = JSON.parse(data);
        } catch {
          return;
        }
        if (v.error) {
          providerError = v.error.message || 'provider error';
          return;
        }
        if (typeof v.model === 'string') model = v.model;
        const d = v.choices?.[0]?.delta?.content;
        if (typeof d === 'string' && d) {
          text += d;
          onDelta(d);
        }
      }),
  );
  if (res.status >= 400) {
    let msg = res.errorBody || '';
    try {
      msg = JSON.parse(msg).error?.message || msg;
    } catch {
      /* not json */
    }
    throw new Error(`HTTP ${res.status}: ${msg.slice(0, 300)}`);
  }
  if (providerError) throw new Error(providerError);
  if (!text.trim()) throw new Error('Model returned an empty reply (it may be rate-limited — try another model).');
  return { text, model };
}

/** Quick key check against OpenRouter. */
export async function checkOpenRouterKey(key: string): Promise<string> {
  const r = await http({ url: `${OPENROUTER_BASE}/key`, headers: { Authorization: `Bearer ${key.trim()}` }, timeoutMs: 15000 });
  if (!r.ok) throw new Error(`Rejected (HTTP ${r.status})`);
  const v = r.json();
  const label = v?.data?.label || 'key';
  return `OK · ${label}${v?.data?.is_free_tier ? ' · free tier' : ''}`;
}

/** Models offered by a LAN server (OpenAI `/v1/models`, falls back to Ollama `/api/tags`). */
export async function listLanModels(base: string): Promise<string[]> {
  try {
    const r = await http({ url: `${base}/models`, timeoutMs: 8000 });
    if (r.ok) {
      const ids = (r.json().data || []).map((m: any) => String(m.id));
      if (ids.length) return ids;
    }
  } catch {
    /* try ollama */
  }
  const root = base.replace(/\/v1$/, '');
  const r = await http({ url: `${root}/api/tags`, timeoutMs: 8000 });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (r.json().models || []).map((m: any) => String(m.name));
}

/** Model ids offered by an OpenAI-compatible provider (`GET /models`). */
export async function listModels(ep: Endpoint): Promise<string[]> {
  const h: Record<string, string> = {};
  if (ep.key.trim()) h.Authorization = `Bearer ${ep.key.trim()}`;
  const r = await http({ url: `${ep.base}/models`, headers: h, timeoutMs: 15000 });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const v = r.json();
  const list: any[] = Array.isArray(v?.data) ? v.data : Array.isArray(v?.models) ? v.models : [];
  return list.map((m) => String(m.id ?? m.name ?? '')).filter(Boolean).map((id) => id.replace(/^models\//, '')).sort();
}
