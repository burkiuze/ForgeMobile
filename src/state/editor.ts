import { create } from 'zustand';
import {
  Entity, EntityId, Scene, Template, clone, duplicateEntity, getEntity, normalizeScene, removeEntity, spawn, templateScene,
} from '../core/scene';
import { copyProjectFiles, readText, removeProjectFiles, writeFile } from '../core/vfs';

export interface ProjectMeta {
  id: string;
  name: string;
  template: Template;
  createdAt: number;
  updatedAt: number;
  entities: number;
}

export type Screen = 'wizard' | 'start' | 'editor';
export type Tab = 'scene' | 'hierarchy' | 'inspector' | 'assets' | 'ai';
export type Tool = 'move' | 'rotate' | 'scale';

export interface LogLine {
  t: number;
  level: 'info' | 'warn' | 'error';
  text: string;
}

const PROJECTS_KEY = 'forge.projects';
export const SCENE_FILE = 'main.scene.json';

function loadMetas(): ProjectMeta[] {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveMetas(m: ProjectMeta[]) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(m));
  } catch {
    /* quota */
  }
}

interface EditorStore {
  screen: Screen;
  tab: Tab;
  projects: ProjectMeta[];
  project: ProjectMeta | null;
  scene: Scene;
  selected: EntityId | null;
  tool: Tool;
  playing: boolean;
  dirty: boolean;
  undoStack: string[];
  redoStack: string[];
  logs: LogLine[];
  /** bumps whenever project files change (asset browser refresh) */
  filesRev: number;
  sheet: string | null;

  setScreen: (s: Screen) => void;
  setTab: (t: Tab) => void;
  setTool: (t: Tool) => void;
  select: (id: EntityId | null) => void;
  openSheet: (s: string | null) => void;
  log: (text: string, level?: LogLine['level']) => void;
  clearLogs: () => void;
  filesChanged: () => void;

  newProject: (name: string, template: Template) => Promise<ProjectMeta>;
  openProject: (id: string) => Promise<void>;
  importScene: (json: string, name?: string) => Promise<void>;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  save: () => Promise<void>;

  /** Apply a change with an undo point. */
  mutate: (fn: (s: Scene) => void, opts?: { keepRedo?: boolean }) => void;
  /** Replace the whole scene (agent results) with one undo point. */
  replaceScene: (s: Scene) => void;
  snapshot: () => string;
  restore: (snap: string) => void;
  undo: () => void;
  redo: () => void;
  updateEntity: (id: EntityId, fn: (e: Entity) => void) => void;
  addEntity: (name: string, mesh: Entity['mesh'], init?: (e: Entity) => void) => Entity;
  duplicate: (id: EntityId) => void;
  remove: (id: EntityId) => void;
  reparent: (id: EntityId, parent: EntityId | null) => void;
  setPlaying: (p: boolean) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastMutate = 0;

export const useEditor = create<EditorStore>((set, get) => ({
  screen: 'start',
  tab: 'scene',
  projects: loadMetas(),
  project: null,
  scene: templateScene('empty'),
  selected: null,
  tool: 'move',
  playing: false,
  dirty: false,
  undoStack: [],
  redoStack: [],
  logs: [],
  filesRev: 0,
  sheet: null,

  setScreen: (screen) => set({ screen }),
  setTab: (tab) => set({ tab }),
  setTool: (tool) => set({ tool }),
  select: (selected) => set({ selected }),
  openSheet: (sheet) => set({ sheet }),
  log: (text, level = 'info') => set((s) => ({ logs: [...s.logs.slice(-299), { t: Date.now(), level, text }] })),
  clearLogs: () => set({ logs: [] }),
  filesChanged: () => set((s) => ({ filesRev: s.filesRev + 1 })),

  newProject: async (name, template) => {
    const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const scene = templateScene(template);
    scene.name = name.trim() || 'New Game';
    const meta: ProjectMeta = { id, name: scene.name, template, createdAt: Date.now(), updatedAt: Date.now(), entities: scene.entities.length };
    await writeFile(id, SCENE_FILE, JSON.stringify(scene, null, 1));
    const projects = [meta, ...get().projects];
    saveMetas(projects);
    set({ projects, project: meta, scene, selected: null, undoStack: [], redoStack: [], dirty: false, screen: 'editor', tab: 'scene', playing: false });
    return meta;
  },

  openProject: async (id) => {
    const meta = get().projects.find((p) => p.id === id);
    if (!meta) return;
    let scene: Scene;
    try {
      scene = normalizeScene(JSON.parse(await readText(id, SCENE_FILE)));
    } catch {
      scene = templateScene(meta.template);
      scene.name = meta.name;
    }
    const projects = [{ ...meta, updatedAt: Date.now() }, ...get().projects.filter((p) => p.id !== id)];
    saveMetas(projects);
    set({ projects, project: projects[0], scene, selected: null, undoStack: [], redoStack: [], dirty: false, screen: 'editor', tab: 'scene', playing: false, logs: [] });
  },

  importScene: async (json, name) => {
    const scene = normalizeScene(JSON.parse(json));
    const meta = await get().newProject(name || scene.name || 'Imported', 'empty');
    scene.name = meta.name;
    set({ scene });
    await get().save();
  },

  renameProject: (id, name) => {
    const projects = get().projects.map((p) => (p.id === id ? { ...p, name } : p));
    saveMetas(projects);
    const project = get().project?.id === id ? { ...get().project!, name } : get().project;
    set({ projects, project });
    if (get().project?.id === id) get().mutate((s) => void (s.name = name));
  },

  duplicateProject: async (id) => {
    const meta = get().projects.find((p) => p.id === id);
    if (!meta) return;
    const nid = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await copyProjectFiles(id, nid);
    const copy: ProjectMeta = { ...meta, id: nid, name: `${meta.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
    const projects = [copy, ...get().projects];
    saveMetas(projects);
    set({ projects });
  },

  deleteProject: async (id) => {
    await removeProjectFiles(id);
    const projects = get().projects.filter((p) => p.id !== id);
    saveMetas(projects);
    set({ projects, ...(get().project?.id === id ? { project: null } : {}) });
  },

  save: async () => {
    const { project, scene } = get();
    if (!project) return;
    await writeFile(project.id, SCENE_FILE, JSON.stringify(scene, null, 1));
    const projects = get().projects.map((p) => (p.id === project.id ? { ...p, updatedAt: Date.now(), entities: scene.entities.length, name: p.name } : p));
    saveMetas(projects);
    set({ projects, dirty: false });
  },

  snapshot: () => JSON.stringify(get().scene),
  restore: (snap) => {
    set((s) => ({ undoStack: [...s.undoStack.slice(-79), JSON.stringify(s.scene)], redoStack: [], scene: JSON.parse(snap), dirty: true }));
    scheduleSave();
  },

  mutate: (fn, opts) => {
    if (get().playing) return;
    const before = JSON.stringify(get().scene);
    const next = clone(get().scene);
    fn(next);
    // Rapid edits (typing, slider drags) collapse into one undo step.
    const now = Date.now();
    const coalesce = now - lastMutate < 500 && get().undoStack.length > 0;
    lastMutate = now;
    set((s) => ({
      scene: next,
      undoStack: coalesce ? s.undoStack : [...s.undoStack.slice(-79), before],
      redoStack: opts?.keepRedo ? s.redoStack : [],
      dirty: true,
    }));
    scheduleSave();
  },

  replaceScene: (scene) => {
    lastMutate = 0;
    const before = JSON.stringify(get().scene);
    set((s) => ({ scene: clone(scene), undoStack: [...s.undoStack.slice(-79), before], redoStack: [], dirty: true }));
    scheduleSave();
  },

  undo: () => {
    const { undoStack, scene } = get();
    if (!undoStack.length || get().playing) return;
    const prev = undoStack[undoStack.length - 1];
    set({ scene: JSON.parse(prev), undoStack: undoStack.slice(0, -1), redoStack: [...get().redoStack, JSON.stringify(scene)], dirty: true });
    fixSelection();
    scheduleSave();
  },

  redo: () => {
    const { redoStack, scene } = get();
    if (!redoStack.length || get().playing) return;
    const next = redoStack[redoStack.length - 1];
    set({ scene: JSON.parse(next), redoStack: redoStack.slice(0, -1), undoStack: [...get().undoStack, JSON.stringify(scene)], dirty: true });
    fixSelection();
    scheduleSave();
  },

  updateEntity: (id, fn) =>
    get().mutate((s) => {
      const e = getEntity(s, id);
      if (e) fn(e);
    }),

  addEntity: (name, mesh, init) => {
    let created!: Entity;
    get().mutate((s) => {
      created = spawn(s, name, mesh);
      init?.(created);
    });
    set({ selected: created.id });
    return created;
  },

  duplicate: (id) => {
    let nid: EntityId | undefined;
    get().mutate((s) => {
      const c = duplicateEntity(s, id);
      if (c) {
        c.transform.position = [c.transform.position[0] + 1, c.transform.position[1], c.transform.position[2]];
        nid = c.id;
      }
    });
    if (nid != null) set({ selected: nid });
  },

  remove: (id) => {
    get().mutate((s) => removeEntity(s, id));
    fixSelection();
  },

  reparent: (id, parent) =>
    get().mutate((s) => {
      const e = getEntity(s, id);
      if (!e || id === parent) return;
      // refuse cycles
      let p = parent;
      while (p != null) {
        if (p === id) return;
        p = getEntity(s, p)?.parent ?? null;
      }
      e.parent = parent;
    }),

  setPlaying: (playing) => set({ playing }),
}));

function fixSelection() {
  const { selected, scene } = useEditor.getState();
  if (selected != null && !getEntity(scene, selected)) useEditor.setState({ selected: null });
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const st = useEditor.getState();
    const autosave = JSON.parse(localStorage.getItem('forge.settings') || '{}')?.state?.autosave !== false;
    if (autosave) st.save().catch((e) => st.log(`save failed: ${e.message}`, 'error'));
  }, 1200);
}

export const editor = () => useEditor.getState();
