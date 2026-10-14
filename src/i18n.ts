import { create } from 'zustand';

export type Lang = 'en' | 'tr';

export const deviceLang = (): Lang =>
  typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';

export const useLang = create<{ lang: Lang; set: (l: Lang) => void }>((set) => ({
  lang: deviceLang(),
  set: (lang) => set({ lang }),
}));

/** Non-reactive helper (event handlers, services). */
export function t(en: string, tr: string): string {
  return useLang.getState().lang === 'tr' ? tr : en;
}

/** Reactive helper for components. */
export function useT() {
  const lang = useLang((s) => s.lang);
  return (en: string, tr: string) => (lang === 'tr' ? tr : en);
}
