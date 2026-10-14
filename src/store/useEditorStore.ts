import { create } from 'zustand';
import { Entity, SceneProject, AnimationClip } from '../types';
import { sceneService } from '../services/SceneService';

export type EditorTab = 'scene' | 'hierarchy' | 'inspector' | 'assets' | 'ai';
export type AppScreen = 'setup' | 'start' | 'editor';
export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface UserAuthProfile {
  uid: string;
  displayName: string;
  email: string;
  photoUrl?: string;
}

interface EditorState {
  currentScreen: AppScreen;
  activeTab: EditorTab;
  currentProject: SceneProject | null;
  projects: SceneProject[];
  selectedEntityId: string | null;
  transformMode: TransformMode;
  isPlaying: boolean;
  isAnimationModalOpen: boolean;
  isModelLibraryModalOpen: boolean;
  isSettingsModalOpen: boolean;
  activeAnimationClip: AnimationClip | null;
  currentUser: UserAuthProfile | null;
  historyStack: SceneProject[];
  historyIndex: number;

  // Actions
  setScreen: (screen: AppScreen) => void;
  setActiveTab: (tab: EditorTab) => void;
  setSelectedEntityId: (id: string | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setAnimationModalOpen: (open: boolean) => void;
  setModelLibraryModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setActiveAnimationClip: (clip: AnimationClip | null) => void;
  setCurrentUser: (user: UserAuthProfile | null) => void;

  // Project & Entity actions
  loadProjects: () => Promise<void>;
  selectProject: (project: SceneProject) => void;
  createProject: (name: string, template: 'platformer' | 'starter3d' | 'empty') => Promise<SceneProject>;
  updateCurrentProjectName: (name: string) => void;
  updateEntity: (entityId: string, updater: (entity: Entity) => Entity) => void;
  addEntity: (entity: Entity) => void;
  duplicateEntity: (entityId: string) => void;
  deleteEntity: (entityId: string) => void;
  reparentEntity: (entityId: string, newParentId: string | null) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentScreen: 'setup', // First-launch starts at setup wizard as confirmed!
  activeTab: 'scene',
  currentProject: null,
  projects: [],
  selectedEntityId: 'entity_player',
  transformMode: 'translate',
  isPlaying: false,
  isAnimationModalOpen: false,
  isModelLibraryModalOpen: false,
  isSettingsModalOpen: false,
  activeAnimationClip: {
    id: 'clip_spin_gold',
    name: 'Coin Spin & Bob',
    duration: 2.0,
    loop: true,
    tracks: [
      { property: 'rotation.y', keyframes: [{ time: 0, value: 0 }, { time: 1.0, value: Math.PI }, { time: 2.0, value: Math.PI * 2 }] },
      { property: 'position.y', keyframes: [{ time: 0, value: 2.6 }, { time: 1.0, value: 3.1 }, { time: 2.0, value: 2.6 }] },
    ],
  },
  currentUser: {
    uid: 'google_user_forge',
    displayName: 'Burak Forge Creator',
    email: 'haktanburak0658@gmail.com',
  },
  historyStack: [],
  historyIndex: -1,

  setScreen: (currentScreen) => set({ currentScreen }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedEntityId: (selectedEntityId) => set({ selectedEntityId }),
  setTransformMode: (transformMode) => set({ transformMode }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setAnimationModalOpen: (isAnimationModalOpen) => set({ isAnimationModalOpen }),
  setModelLibraryModalOpen: (isModelLibraryModalOpen) => set({ isModelLibraryModalOpen }),
  setSettingsModalOpen: (isSettingsModalOpen) => set({ isSettingsModalOpen }),
  setActiveAnimationClip: (activeAnimationClip) => set({ activeAnimationClip }),
  setCurrentUser: (currentUser) => set({ currentUser }),

  loadProjects: async () => {
    const projects = await sceneService.getProjects();
    const current = get().currentProject || projects[0] || sceneService.createDefaultPlatformerProject();
    set({ projects, currentProject: current });
  },

  selectProject: (project) => {
    set({
      currentProject: project,
      selectedEntityId: project.entities[0]?.id || null,
      isPlaying: false,
      currentScreen: 'editor',
    });
  },

  createProject: async (name, template) => {
    const newProj = await sceneService.createProject(name, template);
    set((state) => ({
      projects: [newProj, ...state.projects],
      currentProject: newProj,
      selectedEntityId: newProj.entities[0]?.id || null,
      currentScreen: 'editor',
    }));
    return newProj;
  },

  updateCurrentProjectName: (name) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const updated = { ...currentProject, name };
    set({ currentProject: updated });
    sceneService.saveProject(updated);
  },

  updateEntity: (entityId, updater) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const newEntities = currentProject.entities.map((e) => (e.id === entityId ? updater(e) : e));
    const updated = { ...currentProject, entities: newEntities };
    set({ currentProject: updated });
    sceneService.saveProject(updated);
  },

  addEntity: (entity) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      entities: [...currentProject.entities, entity],
    };
    set({ currentProject: updated, selectedEntityId: entity.id });
    sceneService.saveProject(updated);
  },

  duplicateEntity: (entityId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const entity = currentProject.entities.find((e) => e.id === entityId);
    if (!entity) return;

    const cloned: Entity = JSON.parse(JSON.stringify(entity));
    cloned.id = `ent_${Date.now()}`;
    cloned.name = `${entity.name} (Copy)`;
    cloned.transform.position[0] += 0.8;
    cloned.transform.position[2] += 0.8;

    const updated = {
      ...currentProject,
      entities: [...currentProject.entities, cloned],
    };
    set({ currentProject: updated, selectedEntityId: cloned.id });
    sceneService.saveProject(updated);
  },

  deleteEntity: (entityId) => {
    const { currentProject, selectedEntityId } = get();
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      entities: currentProject.entities.filter((e) => e.id !== entityId),
    };
    const nextSelected = selectedEntityId === entityId ? (updated.entities[0]?.id ?? null) : selectedEntityId;
    set({ currentProject: updated, selectedEntityId: nextSelected });
    sceneService.saveProject(updated);
  },

  reparentEntity: (entityId, newParentId) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      entities: currentProject.entities.map((e) => (e.id === entityId ? { ...e, parentId: newParentId } : e)),
    };
    set({ currentProject: updated });
    sceneService.saveProject(updated);
  },

  undo: () => {
    // In-memory undo step placeholder
  },

  redo: () => {
    // In-memory redo step placeholder
  },
}));
