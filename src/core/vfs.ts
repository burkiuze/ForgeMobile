// Project file system on top of IndexedDB. Paths mirror the desktop project layout
// (Models/…, Textures/…, Audio/…, Animations/…, Scripts/…, Prefabs/…).

export const FOLDERS = ['Scripts', 'Textures', 'Prefabs', 'Models', 'Audio', 'Animations'] as const;

export interface FileEntry {
  project: string;
  path: string;
  size: number;
  mtime: number;
  mime: string;
}

interface Row extends FileEntry {
  key: string;
  data: Blob;
}

const DB_NAME = 'forge';
const STORE = 'files';

let dbp: Promise<IDBDatabase> | null = null;
const memory = new Map<string, Row>(); // fallback when IndexedDB is unavailable (tests, private mode)

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      const st = db.createObjectStore(STORE, { keyPath: 'key' });
      st.createIndex('project', 'project');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx<T>(mode: IDBTransactionMode, fn: (st: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  let db: IDBDatabase;
  try {
    db = await open();
  } catch {
    return undefined as any; // caller uses the memory fallback
  }
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r ? (r as IDBRequest<T>).result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const hasIdb = () => typeof indexedDB !== 'undefined';

/** Normalise a project-relative path and refuse anything that escapes the project. */
export function cleanPath(p: string): string {
  const parts = p.replace(/\\/g, '/').trim().replace(/^\/+/, '').split('/');
  const out: string[] = [];
  for (const seg of parts) {
    if (!seg || seg === '.') continue;
    if (seg === '..') throw new Error('path must stay inside the project folder');
    out.push(seg);
  }
  if (!out.length) throw new Error('empty path');
  return out.join('/');
}

export function mimeFor(path: string): string {
  const ext = path.toLowerCase().split('.').pop() || '';
  return (
    {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
      wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4',
      gltf: 'model/gltf+json', glb: 'model/gltf-binary', bin: 'application/octet-stream',
      json: 'application/json', rhai: 'text/plain', js: 'text/plain', txt: 'text/plain', md: 'text/markdown',
    } as Record<string, string>
  )[ext] || 'application/octet-stream';
}

export async function writeFile(project: string, path: string, data: Blob | string | Uint8Array): Promise<string> {
  const p = cleanPath(path);
  const blob =
    data instanceof Blob ? data : new Blob([typeof data === 'string' ? data : (data as BlobPart)], { type: mimeFor(p) });
  const row: Row = { key: `${project}:${p}`, project, path: p, size: blob.size, mtime: Date.now(), mime: mimeFor(p), data: blob };
  if (hasIdb()) await tx('readwrite', (st) => st.put(row));
  else memory.set(row.key, row);
  return p;
}

async function getRow(project: string, path: string): Promise<Row | undefined> {
  const key = `${project}:${cleanPath(path)}`;
  if (!hasIdb()) return memory.get(key);
  return (await tx<Row>('readonly', (st) => st.get(key))) as Row | undefined;
}

export async function readBlob(project: string, path: string): Promise<Blob | null> {
  return (await getRow(project, path))?.data ?? null;
}

export async function readText(project: string, path: string): Promise<string> {
  const b = await readBlob(project, path);
  if (!b) throw new Error(`${path}: not found`);
  return b.text();
}

export async function exists(project: string, path: string): Promise<boolean> {
  try {
    return !!(await getRow(project, path));
  } catch {
    return false;
  }
}

export async function removeFile(project: string, path: string) {
  const key = `${project}:${cleanPath(path)}`;
  if (hasIdb()) await tx('readwrite', (st) => st.delete(key));
  else memory.delete(key);
}

/** Delete a file or every file under a folder prefix. */
export async function removePath(project: string, path: string) {
  const p = cleanPath(path);
  const all = await listFiles(project);
  for (const f of all) if (f.path === p || f.path.startsWith(p + '/')) await removeFile(project, f.path);
}

export async function listFiles(project: string, prefix = ''): Promise<FileEntry[]> {
  let rows: Row[];
  if (hasIdb()) {
    rows =
      ((await tx<Row[]>('readonly', (st) => st.index('project').getAll(IDBKeyRange.only(project)))) as Row[]) || [];
  } else {
    rows = [...memory.values()].filter((r) => r.project === project);
  }
  const pre = prefix ? cleanPath(prefix) + '/' : '';
  return rows
    .filter((r) => !pre || r.path.startsWith(pre))
    .map(({ project, path, size, mtime, mime }) => ({ project, path, size, mtime, mime }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function removeProjectFiles(project: string) {
  for (const f of await listFiles(project)) await removeFile(project, f.path);
}

export async function copyProjectFiles(from: string, to: string) {
  for (const f of await listFiles(from)) {
    const b = await readBlob(from, f.path);
    if (b) await writeFile(to, f.path, b);
  }
}

// Object URLs for rendering (textures, models, audio). Cached per project+path+mtime.
const urlCache = new Map<string, { url: string; mtime: number }>();

export async function fileUrl(project: string, path: string): Promise<string | null> {
  const row = await getRow(project, path).catch(() => undefined);
  if (!row) return null;
  const k = row.key;
  const hit = urlCache.get(k);
  if (hit && hit.mtime === row.mtime) return hit.url;
  if (hit) URL.revokeObjectURL(hit.url);
  const url = URL.createObjectURL(row.data);
  urlCache.set(k, { url, mtime: row.mtime });
  return url;
}

/** Folder an imported file belongs in (desktop assets::folder_for). */
export function folderFor(name: string): string {
  const n = name.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)$/.test(n)) return 'Textures';
  if (/\.(wav|mp3|ogg|flac|m4a)$/.test(n)) return 'Audio';
  if (/\.(gltf|glb|bin)$/.test(n)) return 'Models';
  if (n.endsWith('.anim.json')) return 'Animations';
  if (n.endsWith('.prefab.json')) return 'Prefabs';
  if (/\.(rhai|js|txt)$/.test(n)) return 'Scripts';
  return 'Imported';
}

export type AssetKind = 'model' | 'texture' | 'audio' | 'animation' | 'script' | 'prefab' | 'scene' | 'other';

export function assetKind(path: string): AssetKind {
  const n = path.toLowerCase();
  if (/\.(gltf|glb)$/.test(n)) return 'model';
  if (/\.(png|jpe?g|webp|gif)$/.test(n)) return 'texture';
  if (/\.(wav|mp3|ogg|flac|m4a)$/.test(n)) return 'audio';
  if (n.endsWith('.anim.json')) return 'animation';
  if (n.endsWith('.prefab.json')) return 'prefab';
  if (n.endsWith('.scene.json')) return 'scene';
  if (/\.(rhai|js)$/.test(n)) return 'script';
  return 'other';
}

export function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
