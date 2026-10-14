import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { streamClaude } from './anthropic';
import { MOBILE_MODELS, pickFiles, ramMb, sizeMb } from './mobileModels';
import { displayName, resolve } from './models';
import { ALL_KEY_NAMES, FORGE_PROXY, PROVIDERS, joinModelId, splitModelId } from './providers';
import { importEnv, getKey } from '../state/keys';

describe('providers', () => {
  it('uses the built-in Forge AI proxy when no OpenRouter key is set', () => {
    const o = { lanUrl: '', customUrl: '' };
    const viaProxy = resolve('openrouter/free', { ...o, key: () => '' });
    expect(viaProxy.base).toBe(FORGE_PROXY);
    expect(viaProxy.viaProxy).toBe(true);
    expect(viaProxy.key).toBe('');
    const own = resolve('openrouter/free', { ...o, key: () => 'sk-own' });
    expect(own.base).toBe('https://openrouter.ai/api/v1');
    expect(own.viaProxy).toBeUndefined();
    expect(resolve('anthropic:claude-sonnet-5-5', { ...o, key: () => '' }).viaProxy).toBeUndefined();
  });

  it('splits and resolves model ids', () => {
    expect(splitModelId('openrouter/free')).toEqual({ provider: 'openrouter', model: 'openrouter/free' });
    expect(splitModelId('google/gemma-4-31b-it:free').provider).toBe('openrouter');
    expect(splitModelId('anthropic:claude-sonnet-5-5')).toEqual({ provider: 'anthropic', model: 'claude-sonnet-5-5' });
    expect(splitModelId('device:qwen2.5-0.5b-instruct-q4_k_m').provider).toBe('device');
    expect(joinModelId('groq', 'llama-3.3-70b-versatile')).toBe('groq:llama-3.3-70b-versatile');
    const keys: Record<string, string> = { GROQ_API_KEY: 'g', CUSTOM_API_KEY: 'c' };
    const o = { lanUrl: '192.168.1.9:11434', customUrl: 'https://x.ai/api/v1/', key: (k: string) => keys[k] || '' };
    expect(resolve('groq:llama-3.3-70b-versatile', o)).toEqual({ provider: 'groq', base: 'https://api.groq.com/openai/v1', key: 'g', model: 'llama-3.3-70b-versatile' });
    expect(resolve('lan:qwen3', o).base).toBe('http://192.168.1.9:11434/v1');
    expect(resolve('custom:my-model', o)).toMatchObject({ base: 'https://x.ai/api/v1', key: 'c' });
    expect(displayName('anthropic:claude-opus-5-5')).toBe('Claude Opus 5.5');
    expect(displayName('device:qwen2.5-0.5b-instruct-q4_k_m')).toContain('Qwen2.5 0.5B');
    expect(PROVIDERS.length).toBeGreaterThanOrEqual(10);
    expect(ALL_KEY_NAMES).toContain('ANTHROPIC_API_KEY');
  });

  it('imports provider keys from a .env', () => {
    const mem = new Map<string, string>();
    (globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) };
    const got = importEnv('OPENROUTER_API_KEY=sk-or-1\nANTHROPIC_API_KEY="sk-ant-2"\nGEMINI_API_KEY=g # comment\nUNRELATED=1\n');
    expect(got.sort()).toEqual(['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY']);
    expect(getKey('ANTHROPIC_API_KEY')).toBe('sk-ant-2');
    expect(getKey('GEMINI_API_KEY')).toBe('g');
  });
});

describe('mobile catalog', () => {
  it('has 35-40 phone-sized models with unique ids', () => {
    expect(MOBILE_MODELS.length).toBeGreaterThanOrEqual(35);
    expect(MOBILE_MODELS.length).toBeLessThanOrEqual(40);
    expect(new Set(MOBILE_MODELS.map((m) => m.id)).size).toBe(MOBILE_MODELS.length);
    for (const m of MOBILE_MODELS) {
      expect(sizeMb(m), m.id).toBeLessThan(2048);
      expect(ramMb(m)).toBeGreaterThan(sizeMb(m));
    }
  });
  it('picks the right GGUF file', () => {
    const files = [
      { path: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf', size: 1 },
      { path: 'Llama-3.2-1B-Instruct-Q4_K_L.gguf', size: 2 },
      { path: 'Llama-3.2-1B-Instruct-Q8_0.gguf', size: 3 },
      { path: 'README.md', size: 4 },
    ];
    expect(pickFiles(files, 'Q4_K_M')).toEqual([files[0]]);
    expect(pickFiles([{ path: 'qwen2.5-0.5b-instruct-q4_k_m.gguf', size: 1 }], 'Q4_K_M').length).toBe(1);
    expect(pickFiles(files, 'Q6_K')).toEqual([]);
  });
});

describe('claude', () => {
  it('streams text through the Anthropic SDK', async () => {
    let seen: any = null;
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        seen = { url: req.url, headers: req.headers, body: JSON.parse(body) };
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        const ev = (type: string, data: object) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
        ev('message_start', { message: { id: 'm1', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 5, output_tokens: 0 } } });
        ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
        ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Merhaba ' } });
        ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'Forge!' } });
        ev('content_block_stop', { index: 0 });
        ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 3 } });
        ev('message_stop', {});
        res.end();
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const deltas: string[] = [];
    const r = await streamClaude(
      'claude-sonnet-5-5',
      'sk-ant-test',
      [
        { role: 'system', content: 'You are Forge AI.' },
        { role: 'user', content: 'selam' },
      ],
      undefined,
      (d) => deltas.push(d),
      base,
    );
    server.close();
    expect(r.text).toBe('Merhaba Forge!');
    expect(deltas).toEqual(['Merhaba ', 'Forge!']);
    expect(seen.url).toContain('/v1/messages');
    expect(seen.headers['x-api-key']).toBe('sk-ant-test');
    expect(seen.headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
    expect(seen.body.system).toBe('You are Forge AI.');
    expect(seen.body.fallbacks).toBe('default');
    expect(seen.body.messages).toEqual([{ role: 'user', content: 'selam' }]);
    expect(seen.body.temperature).toBeUndefined();
  });
});
