// Forge AI proxy: lets the Forge Mobile app use the owner's OpenRouter key
// without shipping it. The key lives only in the OPENROUTER_API_KEY env var.
export const config = { runtime: 'edge' };

const UPSTREAM = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_BODY = 600_000; // bytes
const MAX_TOKENS = 8000;
const WINDOW_MS = 60_000;
const PER_MINUTE = 20; // per IP, best effort (per edge instance)
const hits = new Map();

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization, x-forge-client',
};

const err = (status, message) =>
  new Response(JSON.stringify({ error: { message, code: status } }), { status, headers: { ...cors, 'content-type': 'application/json' } });

// Only free models, so the owner's key can't be billed.
export const allowed = (m) => typeof m === 'string' && (m === 'openrouter/free' || m.endsWith(':free'));

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > PER_MINUTE;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return err(405, 'POST only');
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return err(503, 'Forge AI is not configured (OPENROUTER_API_KEY missing).');
  if (!(req.headers.get('x-forge-client') || '').startsWith('forge')) return err(403, 'Forge app only.');
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon';
  if (limited(ip)) return err(429, 'Too many requests — wait a minute.');

  const raw = await req.text();
  if (raw.length > MAX_BODY) return err(413, 'Request too large.');
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return err(400, 'Bad JSON.');
  }
  if (!allowed(body.model)) return err(403, 'Forge AI only serves free models (…:free or openrouter/free).');
  if (!Array.isArray(body.messages)) return err(400, 'messages required.');
  body.max_tokens = Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS);
  delete body.tools;

  const up = await fetch(UPSTREAM, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      'http-referer': 'https://github.com/burkiuze/ForgeMobile',
      'x-title': 'Forge Mobile',
    },
    body: JSON.stringify(body),
  });
  const headers = { ...cors, 'content-type': up.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' };
  return new Response(up.body, { status: up.status, headers });
}
