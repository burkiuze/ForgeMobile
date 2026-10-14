import { create } from 'zustand';

export type Language = 'en' | 'tr';

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

// Detect initial language based on browser/device
const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined' && window.navigator) {
    const lang = (window.navigator.language || '').toLowerCase();
    if (lang.startsWith('tr')) {
      return 'tr';
    }
  }
  return 'en';
};

export const useI18nStore = create<I18nStore>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (language: Language) => set({ language }),
  toggleLanguage: () => set((state) => ({ language: state.language === 'en' ? 'tr' : 'en' })),
}));

/**
 * Universal bilingual translation helper: t(enText, trText)
 */
export function t(en: string, tr: string): string {
  const currentLang = useI18nStore.getState().language;
  return currentLang === 'tr' ? tr : en;
}

/**
 * Hook variant for reactivity in React components
 */
export function useTranslation() {
  const { language, setLanguage, toggleLanguage } = useI18nStore();
  const translate = (en: string, tr: string) => (language === 'tr' ? tr : en);

  return {
    lang: language,
    setLanguage,
    toggleLanguage,
    t: translate,
  };
}
