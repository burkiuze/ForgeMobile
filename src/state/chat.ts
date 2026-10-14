import { create } from 'zustand';
import { AgentEvent, Mode, Orchestrator } from '../ai/agent';
import { Msg } from '../ai/client';
import { Memory } from '../ai/memory';
import { ExecContext, ToolCall, executeTool, isMutation, stripToolBlocks } from '../ai/tools';
import { SearchHit } from '../ai/web';
import { loadModel } from '../core/model';
import { clone, getEntity, summary } from '../core/scene';
import { fileUrl } from '../core/vfs';
import { t } from '../i18n';
import { useEditor } from './editor';
import { getKey } from './keys';
import { settings } from './settings';

export interface LlmStep {
  kind: 'llm';
  role: string;
  model: string;
  text: string;
  ms: number;
  start: number;
}

export interface ToolStep {
  kind: 'tool';
  id: string;
  call: ToolCall;
  status: 'running' | 'done' | 'error' | 'rejected';
  result?: string;
}

export type Step = LlmStep | ToolStep;

export interface Turn {
  id: string;
  user: string;
  steps: Step[];
  answer: string;
  todos: { content: string; status: string }[];
  sources: SearchHit[];
  memories: string[];
  infos: string[];
  error?: string;
  done: boolean;
  startedAt: number;
  ms: number;
  changes: number;
  undo?: string;
  undone?: boolean;
  feedback?: 'up' | 'down';
  mode: Mode;
}

export interface PendingApproval {
  call: ToolCall;
  resolve: (ok: boolean) => void;
}

interface ChatStore {
  turns: Turn[];
  busy: boolean;
  mode: Mode;
  permission: 'manual' | 'auto';
  web: boolean;
  summary: string;
  sessionId: string;
  approval: PendingApproval | null;
  acceptAllTurn: boolean;
  setMode: (m: Mode) => void;
  setPermission: (p: 'manual' | 'auto') => void;
  setWeb: (w: boolean) => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  answerApproval: (ok: boolean, all?: boolean) => void;
  undoTurn: (id: string) => void;
  feedback: (id: string, f: 'up' | 'down') => void;
  newChat: () => void;
}

let abort: AbortController | null = null;

export function execContext(): ExecContext {
  const ed = useEditor.getState();
  const project = ed.project?.id || 'scratch';
  return {
    scene: ed.scene,
    project,
    modelInfo: async (path) => {
      const m = await loadModel(project, path);
      return { extents: m.extents, triangles: m.triangles, textured: m.textured };
    },
    imageInfo: async (path) => {
      const url = await fileUrl(project, path);
      if (!url) throw new Error(`${path}: not found`);
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('not an image'));
        img.src = url;
      });
    },
  };
}

export const useChat = create<ChatStore>((set, get) => ({
  turns: [],
  busy: false,
  mode: settings().defaultMode,
  permission: settings().permission,
  web: settings().web,
  summary: '',
  sessionId: `s${Date.now().toString(36)}`,
  approval: null,
  acceptAllTurn: false,

  setMode: (mode) => set({ mode }),
  setPermission: (permission) => {
    set({ permission });
    settings().update({ permission });
  },
  setWeb: (web) => set({ web }),

  newChat: () => {
    if (get().busy) return;
    set({ turns: [], summary: '', sessionId: `s${Date.now().toString(36)}` });
  },

  stop: () => {
    abort?.abort();
    const ap = get().approval;
    if (ap) ap.resolve(false);
    set({ approval: null });
  },

  answerApproval: (ok, all) => {
    const ap = get().approval;
    if (!ap) return;
    set({ approval: null, acceptAllTurn: !!(ok && all) });
    ap.resolve(ok);
  },

  undoTurn: (id) => {
    const turn = get().turns.find((x) => x.id === id);
    if (!turn?.undo || turn.undone) return;
    useEditor.getState().restore(turn.undo);
    patchTurn(id, { undone: true });
  },

  feedback: (id, f) => patchTurn(id, { feedback: f }),

  send: async (text) => {
    const prompt = text.trim();
    if (!prompt || get().busy) return;
    const ed = useEditor.getState();
    const s = settings();
    const id = `t${Date.now().toString(36)}`;
    const turn: Turn = {
      id, user: prompt, steps: [], answer: '', todos: [], sources: [], memories: [], infos: [], done: false,
      startedAt: Date.now(), ms: 0, changes: 0, undo: ed.snapshot(), mode: get().mode,
    };
    set((st) => ({ turns: [...st.turns, turn], busy: true, acceptAllTurn: false }));
    abort = new AbortController();

    // history: the last N finished turns
    const history: Msg[] = [];
    for (const old of get().turns.filter((x) => x.done && !x.error).slice(-s.contextTurns)) {
      history.push({ role: 'user', content: old.user });
      if (old.answer) history.push({ role: 'assistant', content: old.answer });
    }
    const sel = getEntity(ed.scene, ed.selected);
    const orch = new Orchestrator(
      {
        prompt,
        mode: get().mode,
        permission: get().permission,
        history,
        summary: get().summary,
        selected: sel ? `${sel.name} (id ${sel.id})` : undefined,
        web: get().web,
        sessionId: get().sessionId,
        openrouterKey: getKey('OPENROUTER_API_KEY'),
        project: ed.project?.id || 'scratch',
        memory: new Memory(s.memory),
        settings: {
          selectedModel: s.selectedModel, plannerModel: s.plannerModel, builderModel: s.builderModel, reviewerModel: s.reviewerModel,
          coderModel: s.coderModel, exploreModel: s.exploreModel, temperature: s.temperature, maxSteps: s.maxSteps,
          usePlanner: s.usePlanner, useReviewer: s.useReviewer, lanUrl: s.lanUrl, webResults: s.webResults,
        },
      },
      {
        signal: abort.signal,
        emit: (e) => onEvent(id, e),
        approve: (call) =>
          new Promise<boolean>((resolve) => {
            if (get().acceptAllTurn) return resolve(true);
            set({ approval: { call, resolve } });
          }),
        runTool: async (call) => {
          const ctx = execContext();
          // Work on a copy, commit once the tool succeeded (one undo step per change).
          const draft = clone(useEditor.getState().scene);
          ctx.scene = draft;
          const out = await executeTool(ctx, call);
          if (isMutation(call.name) && !['write_file', 'delete_file', 'generate_sound'].includes(call.name)) {
            useEditor.getState().replaceScene(draft);
          }
          if (out.files || call.name === 'list_files') useEditor.getState().filesChanged();
          if (out.select != null) useEditor.getState().select(out.select);
          if (isMutation(call.name)) {
            const tt = get().turns.find((x) => x.id === id);
            if (tt) patchTurn(id, { changes: tt.changes + 1 });
          }
          return out;
        },
        sceneSummary: () => summary(useEditor.getState().scene),
      },
    );
    try {
      const r = await orch.run();
      set({ summary: r.summary });
      const tt = get().turns.find((x) => x.id === id)!;
      const lastLlm = [...tt.steps].reverse().find((x) => x.kind === 'llm') as LlmStep | undefined;
      patchTurn(id, { answer: stripToolBlocks(lastLlm?.text || r.answer).replace(/^APPROVED\s*/i, '') });
    } catch (e) {
      const msg = (e as Error).message;
      patchTurn(id, { error: msg === 'Cancelled' || abort?.signal.aborted ? t('Stopped.', 'Durduruldu.') : msg });
    } finally {
      const tt = get().turns.find((x) => x.id === id);
      patchTurn(id, { done: true, ms: Date.now() - (tt?.startedAt || Date.now()) });
      set({ busy: false, approval: null, acceptAllTurn: false });
      abort = null;
    }
  },
}));

function patchTurn(id: string, p: Partial<Turn>) {
  useChat.setState((s) => ({ turns: s.turns.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
}

function onEvent(id: string, e: AgentEvent) {
  const turn = useChat.getState().turns.find((x) => x.id === id);
  if (!turn) return;
  switch (e.type) {
    case 'start':
      patchTurn(id, { steps: [...turn.steps, { kind: 'llm', role: e.role, model: e.model, text: '', ms: 0, start: Date.now() }] });
      break;
    case 'delta': {
      const steps = [...turn.steps];
      for (let i = steps.length - 1; i >= 0; i--) {
        const st = steps[i];
        if (st.kind === 'llm') {
          steps[i] = { ...st, text: st.text + e.text };
          break;
        }
      }
      patchTurn(id, { steps });
      break;
    }
    case 'end': {
      const steps = [...turn.steps];
      for (let i = steps.length - 1; i >= 0; i--) {
        const st = steps[i];
        if (st.kind === 'llm') {
          steps[i] = { ...st, ms: Date.now() - st.start, model: e.model || st.model };
          break;
        }
      }
      patchTurn(id, { steps });
      break;
    }
    case 'tool': {
      const idx = turn.steps.findIndex((x) => x.kind === 'tool' && x.id === e.id);
      const step: ToolStep = { kind: 'tool', id: e.id, call: e.call, status: e.status, result: e.result };
      const steps = [...turn.steps];
      if (idx >= 0) steps[idx] = step;
      else steps.push(step);
      patchTurn(id, { steps });
      break;
    }
    case 'todos':
      patchTurn(id, { todos: e.todos });
      break;
    case 'sources':
      patchTurn(id, { sources: [...turn.sources, ...e.hits].slice(0, 12) });
      break;
    case 'memories':
      patchTurn(id, { memories: e.items });
      break;
    case 'compacted':
      useChat.setState({ summary: e.summary });
      break;
    case 'info':
      patchTurn(id, { infos: [...turn.infos, e.text] });
      break;
    case 'error':
      patchTurn(id, { error: e.text });
      break;
  }
}
