import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AUTO_ID } from '../ai/models';
import { MemoryConfig, defaultMemoryConfig } from '../ai/memory';
import { Lang, deviceLang, useLang } from '../i18n';
import { AccentId, ThemeId } from '../theme';

export interface Settings {
  // General
  lang: Lang;
  theme: ThemeId;
  accent: AccentId;
  uiScale: number;
  showStartScreen: boolean;
  autosave: boolean;
  haptics: boolean;
  profileName: string;
  // Editor
  cameraSpeed: number;
  gizmoSize: number;
  showGrid: boolean;
  showIcons: boolean;
  snap: boolean;
  snapStep: number;
  // Rendering
  shadows: boolean;
  antialias: boolean;
  renderScale: number;
  showStats: boolean;
  // Audio
  masterVolume: number;
  muted: boolean;
  // AI
  aiEnabled: boolean;
  permission: 'manual' | 'auto';
  defaultMode: 'planning' | 'fast' | 'ask';
  web: boolean;
  webResults: number;
  contextTurns: number;
  maxSteps: number;
  temperature: number;
  usePlanner: boolean;
  useReviewer: boolean;
  // Agents & models
  selectedModel: string;
  plannerModel: string;
  builderModel: string;
  reviewerModel: string;
  coderModel: string;
  exploreModel: string;
  lanUrl: string;
  customUrl: string;
  customModels: string[];
  /** model lists fetched from providers (`GET /models`) */
  providerModels: Record<string, string[]>;
  // Memory
  memory: MemoryConfig;
  // Keys
  forgeEnvRepo: string;
  forgeEnvPath: string;
  // Updates
  autoUpdate: boolean;
  // Setup
  wizardDone: boolean;
}

export const defaultSettings = (): Settings => ({
  lang: deviceLang(),
  theme: 'ember',
  accent: 'forge',
  uiScale: 1,
  showStartScreen: true,
  autosave: true,
  haptics: true,
  profileName: '',
  cameraSpeed: 1,
  gizmoSize: 1,
  showGrid: true,
  showIcons: true,
  snap: false,
  snapStep: 0.5,
  shadows: true,
  antialias: true,
  renderScale: 1,
  showStats: false,
  masterVolume: 0.8,
  muted: false,
  aiEnabled: true,
  permission: 'manual',
  defaultMode: 'planning',
  web: true,
  webResults: 6,
  contextTurns: 8,
  maxSteps: 8,
  temperature: 0.4,
  usePlanner: true,
  useReviewer: false,
  selectedModel: AUTO_ID,
  plannerModel: '',
  builderModel: '',
  reviewerModel: '',
  coderModel: '',
  exploreModel: '',
  lanUrl: 'http://192.168.1.2:11434/v1',
  customUrl: '',
  customModels: [],
  providerModels: {},
  memory: defaultMemoryConfig(),
  forgeEnvRepo: 'burkiuze/Forge.env',
  forgeEnvPath: '.env',
  autoUpdate: true,
  wizardDone: false,
});

interface SettingsStore extends Settings {
  update: (p: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings(),
      update: (p) => {
        if (p.lang) useLang.getState().set(p.lang);
        set(p);
      },
      reset: () => set({ ...defaultSettings(), wizardDone: true }),
    }),
    {
      name: 'forge.settings',
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<Settings>;
        return { ...current, ...p, memory: { ...defaultMemoryConfig(), ...(p.memory || {}) } };
      },
      onRehydrateStorage: () => (s) => {
        if (s?.lang) useLang.getState().set(s.lang);
      },
    },
  ),
);

export const settings = () => useSettings.getState();
