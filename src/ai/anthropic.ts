// Claude via the official Anthropic SDK. On Android the SDK's requests go through the native
// bridge (nativeFetch), so streaming works without browser CORS restrictions.

import Anthropic from '@anthropic-ai/sdk';
import { nativeFetch } from '../platform/native';
import type { Msg, Reply } from './client';

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-1', 'claude-opus-5']);

export async function streamClaude(
  model: string,
  apiKey: string,
  messages: Msg[],
  signal: AbortSignal | undefined,
  onDelta: (d: string) => void,
  baseURL?: string,
): Promise<Reply> {
  if (!apiKey.trim()) throw new Error('Anthropic API key missing — add ANTHROPIC_API_KEY in Settings › Providers (or Forge.env).');
  const client = new Anthropic({
    apiKey: apiKey.trim(),
    fetch: nativeFetch,
    // The key belongs to the phone's owner and never leaves the device except to Anthropic.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
    ...(baseURL ? { baseURL } : {}),
  });
  // Claude takes the system prompt as a top-level field; consecutive same-role turns are merged.
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const turns: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) last.content = `${last.content as string}\n\n${m.content}`;
    else turns.push({ role: m.role, content: m.content });
  }
  if (!turns.length || turns[0].role !== 'user') turns.unshift({ role: 'user', content: '(start)' });

  const fallback = FALLBACK_MODELS.has(model);
  const stream = client.beta.messages.stream(
    {
      model,
      max_tokens: 32000,
      system: system || undefined,
      messages: turns,
      ...(fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    },
    { signal },
  );
  let text = '';
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text;
      onDelta(event.delta.text);
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') {
    throw new Error(`Claude declined this request${final.stop_details?.category ? ` (${final.stop_details.category})` : ''}.`);
  }
  if (!text.trim()) throw new Error('Claude returned an empty reply.');
  return { text, model: final.model };
}

/** Key check: lists models (cheap, no tokens used). */
export async function checkAnthropicKey(apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey: apiKey.trim(), fetch: nativeFetch, dangerouslyAllowBrowser: true, maxRetries: 0 });
  const page = await client.models.list({ limit: 20 });
  return `OK · ${page.data.length} models`;
}

export async function listClaudeModels(apiKey: string): Promise<{ id: string; name: string }[]> {
  const client = new Anthropic({ apiKey: apiKey.trim(), fetch: nativeFetch, dangerouslyAllowBrowser: true, maxRetries: 0 });
  const out: { id: string; name: string }[] = [];
  for await (const m of client.models.list({ limit: 50 })) out.push({ id: m.id, name: m.display_name });
  return out;
}
