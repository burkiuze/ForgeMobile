// Theme tokens are CSS variables ("r g b") consumed by Tailwind (see tailwind.config.js).

import { setSystemBars } from './platform/native';

export type ThemeId = 'ember' | 'obsidian' | 'midnight' | 'bone';
export type AccentId = 'forge' | 'ember' | 'gold' | 'teal' | 'violet' | 'blue';

interface Palette {
  bg: string;
  s1: string;
  s2: string;
  s3: string;
  line: string;
  ink: string;
  mute: string;
  gold: string;
  ok: string;
  bad: string;
  light: boolean;
  /** 3D viewport clear colour */
  view: string;
  grid: [string, string];
}

export const THEMES: Record<ThemeId, Palette & { name: string; nameTr: string }> = {
  ember: {
    name: 'Ember', nameTr: 'Kor',
    bg: '#120F0D', s1: '#1A1613', s2: '#231D19', s3: '#2E2621', line: '#3A302A',
    ink: '#F3EBDD', mute: '#A39888', gold: '#F2B233', ok: '#4CB782', bad: '#E5484D', light: false,
    view: '#16120F', grid: ['#4A3B31', '#2A221D'],
  },
  obsidian: {
    name: 'Obsidian', nameTr: 'Obsidyen',
    bg: '#141414', s1: '#1C1C1C', s2: '#262626', s3: '#2F2F2F', line: '#363636',
    ink: '#EDE6D8', mute: '#9E988D', gold: '#F2B233', ok: '#38A169', bad: '#E53E3E', light: false,
    view: '#161616', grid: ['#444444', '#2A2A2A'],
  },
  midnight: {
    name: 'Midnight', nameTr: 'Gece',
    bg: '#0D1117', s1: '#141A22', s2: '#1C242E', s3: '#253040', line: '#2D3846',
    ink: '#E6EDF3', mute: '#8B98A8', gold: '#F2B233', ok: '#3FB950', bad: '#F85149', light: false,
    view: '#0F141B', grid: ['#34404F', '#1B232D'],
  },
  bone: {
    name: 'Bone', nameTr: 'Kemik (açık)',
    bg: '#F4EFE6', s1: '#FFFFFF', s2: '#EDE6DA', s3: '#E2D9CB', line: '#D6CCBC',
    ink: '#1E1915', mute: '#6F655A', gold: '#B7820F', ok: '#2F8F5B', bad: '#C93B3B', light: true,
    view: '#E9E3D8', grid: ['#B8AB98', '#D7CEC0'],
  },
};

export const ACCENTS: Record<AccentId, { hex: string; name: string; nameTr: string }> = {
  forge: { hex: '#F05A22', name: 'Forge orange', nameTr: 'Forge turuncusu' },
  ember: { hex: '#E5484D', name: 'Ember red', nameTr: 'Kor kırmızısı' },
  gold: { hex: '#E8A317', name: 'Molten gold', nameTr: 'Erimiş altın' },
  teal: { hex: '#14B8A6', name: 'Teal', nameTr: 'Turkuaz' },
  violet: { hex: '#8B5CF6', name: 'Violet', nameTr: 'Mor' },
  blue: { hex: '#3B82F6', name: 'Blue', nameTr: 'Mavi' },
};

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

export function palette(theme: ThemeId): Palette {
  return THEMES[theme] ?? THEMES.ember;
}

export function applyTheme(theme: ThemeId, accent: AccentId, uiScale: number) {
  const p = palette(theme);
  const acc = (ACCENTS[accent] ?? ACCENTS.forge).hex;
  const r = document.documentElement.style;
  const set = (k: string, v: string) => r.setProperty(`--${k}`, rgb(v));
  set('bg', p.bg);
  set('s1', p.s1);
  set('s2', p.s2);
  set('s3', p.s3);
  set('line', p.line);
  set('ink', p.ink);
  set('mute', p.mute);
  set('acc', acc);
  set('gold', p.gold);
  set('ok', p.ok);
  set('bad', p.bad);
  r.setProperty('color-scheme', p.light ? 'light' : 'dark');
  r.fontSize = `${Math.round(16 * uiScale)}px`;
  document.body.style.background = p.bg;
  setSystemBars(p.bg, p.light);
}

export const accentHex = (a: AccentId) => (ACCENTS[a] ?? ACCENTS.forge).hex;
