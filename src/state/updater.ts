// Self-update: GitHub Releases of burkiuze/ForgeMobile (tags `build-N`, asset Forge-Mobile.apk).
// "Update" downloads the new APK through Android's download manager / package installer.

import { create } from 'zustand';
import { deviceInfo, http, openUrl } from '../platform/native';

export const RELEASES_API = 'https://api.github.com/repos/burkiuze/ForgeMobile/releases?per_page=10';

export interface Release {
  build: number;
  tag: string;
  name: string;
  notes: string;
  apkUrl: string;
  aabUrl?: string;
  htmlUrl: string;
  publishedAt: string;
}

type State = 'idle' | 'checking' | 'uptodate' | 'available' | 'failed';

interface UpdaterStore {
  state: State;
  error: string;
  latest: Release | null;
  current: number;
  dismissed: boolean;
  check: () => Promise<void>;
  install: () => void;
  dismiss: () => void;
}

export function parseReleases(list: any[]): Release[] {
  return (Array.isArray(list) ? list : [])
    .filter((r) => !r.draft && !r.prerelease && /^build-\d+$/.test(r.tag_name || ''))
    .map((r) => {
      const asset = (n: RegExp) => (r.assets || []).find((a: any) => n.test(a.name))?.browser_download_url as string | undefined;
      return {
        build: Number(String(r.tag_name).slice(6)),
        tag: r.tag_name,
        name: r.name || r.tag_name,
        notes: r.body || '',
        apkUrl: asset(/^Forge-Mobile\.apk$/) || '',
        aabUrl: asset(/\.aab$/),
        htmlUrl: r.html_url,
        publishedAt: r.published_at,
      };
    })
    .filter((r) => r.apkUrl)
    .sort((a, b) => b.build - a.build);
}

export const useUpdater = create<UpdaterStore>((set, get) => ({
  state: 'idle',
  error: '',
  latest: null,
  current: deviceInfo().versionCode,
  dismissed: false,

  check: async () => {
    if (get().state === 'checking') return;
    set({ state: 'checking', error: '' });
    try {
      const r = await http({ url: RELEASES_API, headers: { Accept: 'application/vnd.github+json' }, timeoutMs: 15000 });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const latest = parseReleases(r.json())[0] || null;
      const current = get().current;
      // Web builds (versionCode 0) never offer an APK update.
      if (latest && current > 0 && latest.build > current) set({ state: 'available', latest });
      else set({ state: 'uptodate', latest });
    } catch (e) {
      set({ state: 'failed', error: (e as Error).message });
    }
  },

  install: () => {
    const l = get().latest;
    if (l) openUrl(l.apkUrl);
    set({ dismissed: true });
  },

  dismiss: () => set({ dismissed: true }),
}));
