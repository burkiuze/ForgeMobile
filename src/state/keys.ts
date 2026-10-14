// API keys: stored with the Android host's private storage (never in the app bundle or repo).
// Sources: paste, a `.env` file from the device, or the user's private Forge.env GitHub repo.

import { create } from 'zustand';
import { ALL_KEY_NAMES } from '../ai/providers';
import { http, secretStore } from '../platform/native';

export const KEY_NAMES: string[] = ALL_KEY_NAMES;
export type KeyName = string;

interface KeysStore {
  values: Record<KeyName, string>;
  set: (k: KeyName, v: string) => void;
  remove: (k: KeyName) => void;
  reload: () => void;
}

const read = () => Object.fromEntries(KEY_NAMES.map((k) => [k, secretStore.get(k)])) as Record<KeyName, string>;

export const useKeys = create<KeysStore>((set) => ({
  values: read(),
  set: (k, v) => {
    secretStore.set(k, v.trim());
    set({ values: read() });
  },
  remove: (k) => {
    secretStore.remove(k);
    set({ values: read() });
  },
  reload: () => set({ values: read() }),
}));

export const getKey = (k: KeyName) => useKeys.getState().values[k] || '';

export function maskKey(v: string): string {
  if (!v) return '';
  return v.length <= 4 ? '••••' : `••••••••${v.slice(-4)}`;
}

/** KEY=VALUE lines (comments, blanks, `export` and quotes handled). */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^export\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    out[k] = v;
  }
  return out;
}

/** Store the recognised keys from a .env text. Returns the names imported. */
export function importEnv(text: string): KeyName[] {
  const env = parseEnv(text);
  const got: KeyName[] = [];
  for (const k of KEY_NAMES) {
    if (env[k] && !/\.\.\.$/.test(env[k])) {
      useKeys.getState().set(k, env[k]);
      got.push(k);
    }
  }
  return got;
}

/** Read `.env` from the user's private Forge.env repo with a GitHub token (read-only is enough). */
export async function fetchForgeEnv(repo: string, path: string, token: string): Promise<string> {
  const r = await http({
    url: `https://api.github.com/repos/${repo.trim()}/contents/${path.trim().replace(/^\/+/, '')}`,
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github.raw+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    timeoutMs: 20000,
  });
  if (r.status === 401) throw new Error('GitHub token rejected (401)');
  if (r.status === 404) throw new Error(`${repo}/${path} not found — check the repo name and that the token can read it`);
  if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`);
  return r.text;
}

/** Connect to Forge.env: fetch, import and remember the token. */
export async function syncForgeEnv(repo: string, path: string, token: string): Promise<KeyName[]> {
  const text = await fetchForgeEnv(repo, path, token);
  const got = importEnv(text).filter((k) => k !== 'GITHUB_TOKEN');
  useKeys.getState().set('GITHUB_TOKEN', token);
  if (!got.length) throw new Error('no API keys (OPENROUTER_API_KEY, ANTHROPIC_API_KEY…) found in that .env');
  return got;
}
