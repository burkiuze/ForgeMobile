import { create } from 'zustand';

interface SettingsState {
  // General
  showStartScreenOnLaunch: boolean;
  autosave: boolean;
  uiScale: number;

  // Editor
  cameraSpeed: number;
  gizmoSize: number;
  showGrid: boolean;

  // Rendering
  enableShadows: boolean;
  antialias: boolean;
  fpsCap: number;

  // Audio
  masterVolume: number;
  isMuted: boolean;

  // AI
  enableAI: boolean;
  defaultPermission: 'manual' | 'auto';
  defaultMode: 'planning' | 'fast' | 'ask';
  webSearchResultCount: number;
  contextTurns: number;
  maxSteps: number;
  temperature: number;
  enablePlanner: boolean;
  enableReviewer: boolean;

  // Memory
  memoryMode: 'builtin' | 'external';
  externalMemoryUrl: string;

  // Updates
  autoCheckUpdates: boolean;

  // Actions
  updateSettings: (partial: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  showStartScreenOnLaunch: true,
  autosave: true,
  uiScale: 100,

  cameraSpeed: 1.0,
  gizmoSize: 1.0,
  showGrid: true,

  enableShadows: true,
  antialias: true,
  fpsCap: 60,

  masterVolume: 0.8,
  isMuted: false,

  enableAI: true,
  defaultPermission: 'manual',
  defaultMode: 'planning',
  webSearchResultCount: 4,
  contextTurns: 10,
  maxSteps: 8,
  temperature: 0.7,
  enablePlanner: true,
  enableReviewer: true,

  memoryMode: 'builtin',
  externalMemoryUrl: 'http://localhost:8080/memory',

  autoCheckUpdates: true,

  updateSettings: (partial) => set((state) => ({ ...state, ...partial })),
}));
