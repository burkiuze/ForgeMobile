// Lists the free OpenRouter models the proxy will serve.
export const config = { runtime: 'edge' };

export default async function handler() {
  const r = await fetch('https://openrouter.ai/api/v1/models');
  const j = await r.json().catch(() => ({ data: [] }));
  const data = (j.data || []).filter((m) => m.id && m.id.endsWith(':free') && !/safety|guard|decide|inkling|lfm/i.test(m.id)).map((m) => ({ id: m.id, name: m.name, context_length: m.context_length }));
  data.unshift({ id: 'openrouter/free', name: 'Auto (free)', context_length: 0 });
  return new Response(JSON.stringify({ data }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 's-maxage=3600' },
  });
}
