// Web access straight from the phone: search (DuckDuckGo HTML, Bing fallback) and page fetch.
// No API key — requests go out from the device like a browser would (native bridge, no CORS).

import { http } from '../platform/native';

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

async function get(url: string): Promise<string> {
  const r = await http({ url, headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.8,tr;q=0.7' }, timeoutMs: 20000 });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text.slice(0, 3_000_000);
}

export async function search(query: string, max = 6): Promise<SearchHit[]> {
  const q = encodeURIComponent(query);
  let hits: SearchHit[] = [];
  try {
    hits = parseDdg(await get(`https://html.duckduckgo.com/html/?q=${q}`));
  } catch {
    /* fall back to bing */
  }
  if (!hits.length) hits = parseBing(await get(`https://www.bing.com/search?q=${q}&setlang=en`));
  hits = hits.slice(0, Math.max(1, max));
  if (!hits.length) throw new Error('no results (search engines unreachable?)');
  return hits;
}

export async function fetchText(url: string, maxChars = 6000): Promise<string> {
  if (!/^https?:\/\//.test(url)) throw new Error('only http(s) URLs are allowed');
  const html = await get(url);
  const t = between(html, '<title', '</title>');
  const title = t ? decodeEntities((t.split('>')[1] ?? t).trim()) : '';
  let out = `# ${title}\n${url}\n\n${htmlToText(html)}`;
  if (out.length > maxChars) out = out.slice(0, maxChars) + '…';
  return out;
}

function attr(s: string, name: string): string | null {
  const i = s.indexOf(`${name}="`);
  if (i < 0) return null;
  const rest = s.slice(i + name.length + 2);
  const end = rest.indexOf('"');
  return end < 0 ? null : rest.slice(0, end);
}

function between(s: string, a: string, b: string): string | null {
  const i = s.indexOf(a);
  if (i < 0) return null;
  const rest = s.slice(i + a.length);
  const j = rest.indexOf(b);
  return j < 0 ? null : rest.slice(0, j);
}

export function parseDdg(html: string): SearchHit[] {
  const out: SearchHit[] = [];
  for (const block of html.split('class="result__a"').slice(1)) {
    const href = attr(block, 'href');
    if (!href) continue;
    let url: string;
    const u = href.indexOf('uddg=');
    if (u >= 0) url = safeDecode(href.slice(u + 5).split('&')[0]);
    else if (href.startsWith('//')) url = 'https:' + href;
    else url = href;
    url = decodeEntities(url);
    const title = stripTags((block.split('>').slice(1).join('>').split('</a>')[0]) || '');
    const sn = block.split('class="result__snippet"')[1];
    const snippet = sn ? stripTags(sn.split('>').slice(1).join('>').split('</a>')[0]) : '';
    if (url.startsWith('http') && !url.includes('duckduckgo.com/y.js')) out.push({ title, url, snippet });
  }
  return out;
}

export function parseBing(html: string): SearchHit[] {
  const out: SearchHit[] = [];
  for (const block of html.split('<li class="b_algo"').slice(1)) {
    const h2 = between(block, '<h2', '</h2>');
    if (!h2) continue;
    const url = attr(h2, 'href');
    if (!url) continue;
    const title = stripTags(h2.includes('">') ? h2.split('">').slice(1).join('">') : h2.split('>').slice(1).join('>'));
    const p = between(block, '<p', '</p>');
    const snippet = p ? stripTags(p.split('>').slice(1).join('>')) : '';
    if (url.startsWith('http')) out.push({ title, url: decodeEntities(url), snippet });
  }
  return out;
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
}

export function htmlToText(html: string): string {
  let s = html;
  for (const tag of ['script', 'style', 'noscript', 'svg', 'head', 'nav', 'footer']) {
    s = s.replace(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi'), ' ');
  }
  s = s.replace(/<(\/p|br|\/li|\/h[1-6]|\/div|\/tr)[^>]*>/gi, '\n');
  return s
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((l) => decodeEntities(l.replace(/\s+/g, ' ').trim()))
    .filter((l) => l.length > 2)
    .join('\n');
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
