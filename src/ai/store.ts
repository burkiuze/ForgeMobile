// Free CC0 asset sources (port of desktop src/store.rs):
// * Poly Haven (api.polyhaven.com): textures and glTF models.
// * ambientCG (API v2): PBR materials (the colour map is imported).

import { unzipSync } from 'fflate';
import { http } from '../platform/native';
import { writeFile } from '../core/vfs';

export type Source = 'polyhaven' | 'ambientcg';
export type Kind = 'textures' | 'models';

export interface Item {
  source: Source;
  kind: Kind;
  id: string;
  name: string;
  thumb: string;
  tags: string[];
  popularity: number;
}

export interface Imported {
  path: string;
  kind: Kind;
  extents?: [number, number, number];
}

const PH = 'https://api.polyhaven.com';

export const parseSource = (s: string): Source => (s.toLowerCase().includes('ambient') ? 'ambientcg' : 'polyhaven');
export const parseKind = (s: string): Kind => (s.toLowerCase().startsWith('model') ? 'models' : 'textures');
export const sourceLabel = (s: Source) => (s === 'polyhaven' ? 'Poly Haven' : 'ambientCG');

async function getJson(url: string): Promise<any> {
  const r = await http({ url, timeoutMs: 30000 });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
  return r.json();
}

async function getBytes(url: string): Promise<Uint8Array> {
  const r = await http({ url, responseType: 'base64', timeoutMs: 120000 });
  if (!r.ok || !r.bytes) throw new Error(`HTTP ${r.status} downloading ${new URL(url).host}`);
  return r.bytes;
}

const phCache = new Map<Kind, Item[]>();

export async function polyhavenList(kind: Kind): Promise<Item[]> {
  const hit = phCache.get(kind);
  if (hit) return hit;
  const items = parsePolyhaven(kind, await getJson(`${PH}/assets?t=${kind === 'models' ? 'models' : 'textures'}`));
  phCache.set(kind, items);
  return items;
}

export function parsePolyhaven(kind: Kind, v: any): Item[] {
  if (!v || typeof v !== 'object') throw new Error('unexpected Poly Haven response');
  return Object.entries<any>(v)
    .map(([id, a]) => ({
      source: 'polyhaven' as const,
      kind,
      id,
      name: String(a?.name ?? id),
      thumb: a?.thumbnail_url || `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256`,
      tags: Array.isArray(a?.tags) ? a.tags.map(String) : [],
      popularity: Number(a?.download_count ?? 0),
    }))
    .sort((a, b) => b.popularity - a.popularity);
}

export async function ambientcgSearch(query: string, offset = 0): Promise<Item[]> {
  const q = encodeURIComponent(query);
  return parseAmbientcg(
    await getJson(`https://ambientcg.com/api/v2/full_json?type=Material&include=previewData,tagData&sort=Popular&limit=60&offset=${offset}&q=${q}`),
  );
}

export function parseAmbientcg(v: any): Item[] {
  const found: any[] = Array.isArray(v?.foundAssets) ? v.foundAssets : [];
  return found
    .filter((a) => typeof a.assetId === 'string')
    .map((a) => {
      const id = a.assetId as string;
      const prev = a.previewImage && typeof a.previewImage === 'object' ? Object.entries<any>(a.previewImage) : [];
      const pick = prev.find(([k]) => k.includes('256') && k.toUpperCase().includes('PNG')) || prev[0];
      return {
        source: 'ambientcg' as const,
        kind: 'textures' as const,
        id,
        name: String(a.displayName ?? id),
        thumb: typeof pick?.[1] === 'string' ? pick[1] : `https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/256-PNG/${id}.png`,
        tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
        popularity: Number(a.downloadCount ?? 0),
      };
    });
}

export function matches(i: Item, q: string): boolean {
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => i.name.toLowerCase().includes(w) || i.id.toLowerCase().includes(w) || i.tags.some((t) => t.toLowerCase().includes(w)));
}

export async function search(source: Source, kind: Kind, query: string, max = 60): Promise<Item[]> {
  let items = source === 'polyhaven' ? await polyhavenList(kind) : await ambientcgSearch(query);
  if (source === 'polyhaven' && query.trim()) items = items.filter((i) => matches(i, query));
  return items.slice(0, max);
}

/** Find the diffuse/albedo map in a Poly Haven `files` response. */
export function phDiffuseUrl(files: any): string | null {
  if (!files || typeof files !== 'object') return null;
  const key = Object.keys(files).find((k) => {
    const l = k.toLowerCase();
    return l === 'diffuse' || l === 'diff' || l.includes('albedo') || l === 'color';
  });
  if (!key) return null;
  for (const size of ['1k', '2k', '4k']) for (const fmt of ['jpg', 'png']) {
    const u = files[key]?.[size]?.[fmt]?.url;
    if (typeof u === 'string') return u;
  }
  return null;
}

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '');

/** Download an asset into the project. Model extents are filled in by the caller (needs WebGL). */
export async function importAsset(project: string, source: Source, kind: Kind, id: string, onProgress?: (s: string) => void): Promise<Imported> {
  const safe = safeId(id);
  if (!safe) throw new Error('invalid asset id');
  if (source === 'polyhaven' && kind === 'textures') {
    const files = await getJson(`${PH}/files/${safe}`);
    const url = phDiffuseUrl(files);
    if (!url) throw new Error('no diffuse map found for this texture');
    const ext = url.endsWith('.png') ? 'png' : 'jpg';
    onProgress?.('texture');
    const path = await writeFile(project, `Textures/${safe}.${ext}`, await getBytes(url));
    return { path, kind };
  }
  if (source === 'polyhaven' && kind === 'models') {
    const files = await getJson(`${PH}/files/${safe}`);
    const g = ['1k', '2k', '4k'].map((s) => files?.gltf?.[s]?.gltf).find((g) => typeof g?.url === 'string');
    if (!g) throw new Error('no glTF download for this model');
    const dir = `Models/${safe}`;
    const mainName = String(g.url).split('/').pop()!.split('?')[0] || 'model.gltf';
    onProgress?.(mainName);
    const path = await writeFile(project, `${dir}/${mainName}`, await getBytes(g.url));
    const inc = g.include && typeof g.include === 'object' ? Object.entries<any>(g.include) : [];
    let n = 0;
    for (const [sub, f] of inc) {
      if (sub.includes('..') || typeof f?.url !== 'string') continue;
      onProgress?.(`${++n}/${inc.length} ${sub}`);
      await writeFile(project, `${dir}/${sub}`, await getBytes(f.url));
    }
    return { path, kind };
  }
  // ambientCG
  onProgress?.('zip');
  const zip = await getBytes(`https://ambientcg.com/get?file=${safe}_1K-JPG.zip`);
  const entries = unzipSync(zip);
  const name = Object.keys(entries).find((n) => /_(Color|Albedo|Diffuse)\./.test(n));
  if (!name) throw new Error('no color map in the ambientCG download');
  const path = await writeFile(project, `Textures/${safe}.jpg`, entries[name]);
  return { path, kind: 'textures' };
}

/** Other free asset sites (no API: download there, then import the files). */
export const LINKS: { name: string; url: string; en: string; tr: string }[] = [
  { name: 'Kenney', url: 'https://kenney.nl/assets', en: 'Game kits: characters, vehicles, UI (CC0)', tr: 'Oyun paketleri: karakter, araç, arayüz (CC0)' },
  { name: 'Quaternius', url: 'https://quaternius.com', en: 'Animated low-poly characters & props (CC0)', tr: 'Animasyonlu low-poly karakterler ve objeler (CC0)' },
  { name: 'Poly Pizza', url: 'https://poly.pizza', en: 'Thousands of free low-poly models', tr: 'Binlerce ücretsiz low-poly model' },
  { name: 'OpenGameArt', url: 'https://opengameart.org', en: 'Sprites, music, sounds, models', tr: 'Sprite, müzik, ses, model' },
  { name: 'itch.io', url: 'https://itch.io/game-assets/free', en: 'Free asset packs from indie creators', tr: 'Bağımsız yapımcılardan ücretsiz paketler' },
  { name: 'Freesound', url: 'https://freesound.org', en: 'Sound effects (check each license)', tr: 'Ses efektleri (lisansı kontrol et)' },
];
