export const config = { runtime: 'edge' };
export default function handler() {
  return new Response(JSON.stringify({ ok: true, configured: !!process.env.OPENROUTER_API_KEY }), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
}
