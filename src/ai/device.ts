// On-device inference: GGUF models run inside the app with wllama (llama.cpp → WebAssembly,
// WebGPU when the phone supports it). Downloads are cached in the app's private storage.

import { LoggerWithoutDebug, ModelManager, Wllama } from '@wllama/wllama';
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url';
import { create } from 'zustand';
import { http } from '../platform/native';
import type { Msg, Reply } from './client';
import { MobileModel, findMobileModel, pickFiles } from './mobileModels';

const MAP_KEY = 'forge.device.models';

interface Installed {
  url: string;
  size: number;
}

function loadMap(): Record<string, Installed> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveMap(m: Record<string, Installed>) {
  localStorage.setItem(MAP_KEY, JSON.stringify(m));
}

export interface DeviceState {
  installed: Record<string, Installed>;
  progress: Record<string, number>;
  errors: Record<string, string>;
  loaded: string | null;
  loading: string | null;
}

export const useDevice = create<DeviceState>(() => ({ installed: loadMap(), progress: {}, errors: {}, loaded: null, loading: null }));

let manager: ModelManager | null = null;
const getManager = () => (manager ??= new ModelManager({ logger: LoggerWithoutDebug, parallelDownloads: 3 }));
let engine: Wllama | null = null;
const controllers = new Map<string, AbortController>();

/** Resolve the download URL of a catalog entry through the Hugging Face API. */
export async function resolveUrl(m: MobileModel, hfToken = ''): Promise<{ url: string; size: number }> {
  const headers: Record<string, string> = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};
  const r = await http({ url: `https://huggingface.co/api/models/${m.repo}/tree/main`, headers, timeoutMs: 20000 });
  if (!r.ok) throw new Error(`Hugging Face HTTP ${r.status}`);
  const list = (r.json() as any[])
    .filter((f) => f.type === 'file')
    .map((f) => ({ path: String(f.path), size: Number(f.lfs?.size ?? f.size ?? 0) }));
  const files = pickFiles(list, m.quant);
  if (!files.length) throw new Error(`no ${m.quant} file in ${m.repo}`);
  return {
    url: `https://huggingface.co/${m.repo}/resolve/main/${files[0].path}`,
    size: files.reduce((a, f) => a + f.size, 0),
  };
}

export async function download(id: string, hfToken = '') {
  const m = findMobileModel(id);
  if (!m) throw new Error(`unknown model ${id}`);
  const ctrl = new AbortController();
  controllers.set(id, ctrl);
  const set = (p: Partial<DeviceState>) => useDevice.setState(p);
  set({ progress: { ...useDevice.getState().progress, [id]: 0 }, errors: { ...useDevice.getState().errors, [id]: '' } });
  try {
    const { url, size } = await resolveUrl(m, hfToken);
    await getManager().downloadModel(url, {
      signal: ctrl.signal,
      headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : undefined,
      progressCallback: ({ loaded, total }) => {
        const p = total ? loaded / total : 0;
        useDevice.setState((s) => ({ progress: { ...s.progress, [id]: p } }));
      },
    });
    const map = { ...loadMap(), [id]: { url, size } };
    saveMap(map);
    set({ installed: map });
  } catch (e) {
    const msg = ctrl.signal.aborted ? 'cancelled' : (e as Error).message || String(e);
    useDevice.setState((s) => ({ errors: { ...s.errors, [id]: msg } }));
    throw e;
  } finally {
    controllers.delete(id);
    useDevice.setState((s) => {
      const progress = { ...s.progress };
      delete progress[id];
      return { progress };
    });
  }
}

export function cancelDownload(id: string) {
  controllers.get(id)?.abort();
}

export async function remove(id: string) {
  const map = loadMap();
  const inst = map[id];
  if (useDevice.getState().loaded === id) await unload();
  if (inst) {
    const models = await getManager().getModels({ includeInvalid: true });
    for (const mm of models) if (mm.url === inst.url) await mm.remove();
  }
  delete map[id];
  saveMap(map);
  useDevice.setState({ installed: map });
}

export async function unload() {
  if (engine) await engine.exit().catch(() => {});
  engine = null;
  useDevice.setState({ loaded: null });
}

async function ensureLoaded(id: string, nCtx: number) {
  if (engine && useDevice.getState().loaded === id) return engine;
  await unload();
  const inst = loadMap()[id];
  if (!inst) throw new Error('This model is not downloaded yet — download it in Settings › On-device models.');
  const models = await getManager().getModels();
  const model = models.find((mm) => mm.url === inst.url);
  if (!model) throw new Error('Model files are missing — download the model again.');
  useDevice.setState({ loading: id });
  try {
    const w = new Wllama({ default: wasmUrl }, { modelManager: getManager(), logger: LoggerWithoutDebug });
    await w.loadModel(model, { n_ctx: nCtx, n_batch: 512 });
    engine = w;
    useDevice.setState({ loaded: id });
    return w;
  } finally {
    useDevice.setState({ loading: null });
  }
}

export interface DeviceRuntimeInfo {
  multithread: boolean;
  threads: number;
  webgpu: boolean;
}

export function runtimeInfo(): DeviceRuntimeInfo | null {
  if (!engine) return null;
  return { multithread: engine.isMultithread(), threads: engine.getNumThreads(), webgpu: engine.isSupportWebGPU() };
}

export async function streamDevice(id: string, messages: Msg[], temperature: number, signal: AbortSignal | undefined, onDelta: (d: string) => void): Promise<Reply> {
  const m = findMobileModel(id);
  const w = await ensureLoaded(id, Math.min(8192, (m?.ctxK ?? 4) * 1024));
  let text = '';
  await w.createChatCompletion({
    messages: messages.map((x) => ({ role: x.role, content: x.content })),
    stream: true,
    temperature,
    max_tokens: 1536,
    abortSignal: signal,
    onData: (chunk) => {
      const d = chunk.choices?.[0]?.delta?.content;
      if (typeof d === 'string' && d) {
        text += d;
        onDelta(d);
      }
    },
  });
  if (!text.trim()) throw new Error('The on-device model returned nothing.');
  return { text, model: `device:${id}` };
}
