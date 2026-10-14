// Bridge to the Android host (window.ForgeNative, see NativeBridge.java).
// In a normal browser (npm run dev) everything falls back to web APIs.

interface NativeApi {
  info(): string;
  request(id: string, req: string): void;
  abort(id: string): void;
  secretGet(key: string): string;
  secretSet(key: string, value: string): void;
  secretRemove(key: string): void;
  openUrl(url: string): void;
  setBars(hex: string, light: boolean): void;
  share(title: string, text: string): void;
  saveFile(name: string, mime: string, base64: string): string;
  exitApp(): void;
}

declare global {
  interface Window {
    ForgeNative?: NativeApi;
    ForgeBridge?: BridgeCallbacks;
    ForgeBack?: () => boolean;
    ForgeOnPause?: () => void;
  }
}

interface BridgeCallbacks {
  _head(id: string, res: { status: number; headers: Record<string, string> }): void;
  _resolve(id: string, res: RawResponse): void;
  _reject(id: string, err: string): void;
  _chunk(id: string, text: string): void;
  _done(id: string, res: { status: number; headers: Record<string, string> }): void;
}

interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  url?: string;
}

export interface HttpRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  bodyBase64?: string;
  responseType?: 'text' | 'base64';
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface HttpResponse {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  text: string;
  /** Raw bytes when responseType = 'base64'. */
  bytes?: Uint8Array;
  json<T = any>(): T;
}

export const native: NativeApi | undefined = typeof window !== 'undefined' ? window.ForgeNative : undefined;
export const isNative = !!native;

// ------------------------------------------------------------------ callbacks

type Pending = {
  onHead?: (r: { status: number; headers: Record<string, string> }) => void;
  resolve: (r: RawResponse) => void;
  reject: (e: Error) => void;
  onChunk?: (t: string) => void;
  onDone?: (r: { status: number; headers: Record<string, string> }) => void;
};
const pending = new Map<string, Pending>();
let seq = 0;

if (typeof window !== 'undefined') {
  window.ForgeBridge = {
    _head(id, res) {
      pending.get(id)?.onHead?.(res);
    },
    _resolve(id, res) {
      const p = pending.get(id);
      pending.delete(id);
      p?.resolve(res);
    },
    _reject(id, err) {
      const p = pending.get(id);
      pending.delete(id);
      p?.reject(new Error(err || 'network error'));
    },
    _chunk(id, text) {
      pending.get(id)?.onChunk?.(text);
    },
    _done(id, res) {
      const p = pending.get(id);
      pending.delete(id);
      p?.onDone?.(res);
    },
  };
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + step)));
  }
  return btoa(s);
}

function wrap(raw: RawResponse, bytes?: Uint8Array): HttpResponse {
  return {
    status: raw.status,
    ok: raw.status >= 200 && raw.status < 300,
    headers: raw.headers || {},
    text: bytes ? '' : raw.body,
    bytes,
    json() {
      return JSON.parse(raw.body);
    },
  };
}

/** HTTP request that is not subject to CORS on Android. */
export async function http(req: HttpRequest): Promise<HttpResponse> {
  if (native) {
    const id = `r${++seq}`;
    const { signal, ...rest } = req;
    const raw = await new Promise<RawResponse>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      signal?.addEventListener('abort', () => {
        native!.abort(id);
        pending.delete(id);
        reject(new DOMException('Aborted', 'AbortError'));
      });
      native!.request(id, JSON.stringify(rest));
    });
    if (req.responseType === 'base64') return wrap(raw, b64ToBytes(raw.body || ''));
    return wrap(raw);
  }
  const r = await fetch(req.url, {
    method: req.method || 'GET',
    headers: req.headers,
    body: req.bodyBase64 ? (b64ToBytes(req.bodyBase64) as BodyInit) : req.body,
    signal: req.signal,
  });
  const headers: Record<string, string> = {};
  r.headers.forEach((v, k) => (headers[k] = v));
  if (req.responseType === 'base64') {
    const buf = new Uint8Array(await r.arrayBuffer());
    return wrap({ status: r.status, headers, body: '' }, buf);
  }
  return wrap({ status: r.status, headers, body: await r.text() });
}

/** Streaming request (SSE). Calls onText with each decoded chunk; resolves with the status. */
export async function httpStream(
  req: HttpRequest,
  onText: (t: string) => void,
): Promise<{ status: number; errorBody?: string }> {
  if (native) {
    const id = `s${++seq}`;
    const { signal, ...rest } = req;
    let collected = '';
    return new Promise((resolve, reject) => {
      pending.set(id, {
        resolve: () => {},
        reject,
        onChunk: (t) => {
          collected += t.length < 4000 ? t : '';
          onText(t);
        },
        onDone: (r) => resolve({ status: r.status, errorBody: r.status >= 400 ? collected : undefined }),
      });
      signal?.addEventListener('abort', () => {
        native!.abort(id);
        pending.delete(id);
        reject(new DOMException('Aborted', 'AbortError'));
      });
      native!.request(id, JSON.stringify({ ...rest, stream: true }));
    });
  }
  const r = await fetch(req.url, {
    method: req.method || 'POST',
    headers: req.headers,
    body: req.body,
    signal: req.signal,
  });
  if (!r.ok || !r.body) {
    return { status: r.status, errorBody: await r.text().catch(() => '') };
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onText(dec.decode(value, { stream: true }));
  }
  return { status: r.status };
}

// ------------------------------------------------------------------ device

export interface DeviceInfo {
  versionName: string;
  versionCode: number;
  sdk?: number;
  device?: string;
  ramMb?: number;
  freeStorageMb?: number;
}

export function deviceInfo(): DeviceInfo {
  if (native) {
    try {
      return JSON.parse(native.info());
    } catch {
      /* fall through */
    }
  }
  const mem = (navigator as any).deviceMemory as number | undefined;
  return { versionName: 'web', versionCode: 0, device: navigator.userAgent, ramMb: mem ? mem * 1024 : undefined };
}

export function openUrl(url: string) {
  if (native) native.openUrl(url);
  else window.open(url, '_blank', 'noopener');
}

export function setSystemBars(hex: string, light: boolean) {
  native?.setBars(hex, light);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', hex);
}

export function shareText(title: string, text: string) {
  if (native) return native.share(title, text);
  if (navigator.share) navigator.share({ title, text }).catch(() => {});
  else navigator.clipboard?.writeText(text);
}

/** Save bytes to Downloads/Forge (Android) or trigger a browser download. Returns a location label. */
export function saveFile(name: string, mime: string, data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  if (native) return native.saveFile(name, mime, bytesToB64(bytes));
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return name;
}

// ------------------------------------------------------------------ secrets

const SECRET_PREFIX = 'forge.secret.';

export const secretStore = {
  get(key: string): string {
    if (native) return native.secretGet(key) || '';
    try {
      return localStorage.getItem(SECRET_PREFIX + key) || '';
    } catch {
      return '';
    }
  },
  set(key: string, value: string) {
    if (native) return native.secretSet(key, value);
    try {
      localStorage.setItem(SECRET_PREFIX + key, value);
    } catch {
      /* storage unavailable */
    }
  },
  remove(key: string) {
    if (native) return native.secretRemove(key);
    try {
      localStorage.removeItem(SECRET_PREFIX + key);
    } catch {
      /* storage unavailable */
    }
  },
};

// ------------------------------------------------------------------ back button

const backHandlers: (() => boolean)[] = [];

/** Register a handler for the Android back button; return true when it consumed the press. */
export function onBack(fn: () => boolean): () => void {
  backHandlers.push(fn);
  return () => {
    const i = backHandlers.lastIndexOf(fn);
    if (i >= 0) backHandlers.splice(i, 1);
  };
}

if (typeof window !== 'undefined') {
  window.ForgeBack = () => {
    for (let i = backHandlers.length - 1; i >= 0; i--) {
      if (backHandlers[i]()) return true;
    }
    return false;
  };
}

/**
 * A `fetch` that streams through the native bridge on Android (no CORS), so SDKs that take a
 * custom fetch (e.g. the Anthropic SDK) work in the WebView. Falls back to window.fetch.
 */
export const nativeFetch: typeof fetch = async (input, init) => {
  if (!native) return fetch(input as RequestInfo, init);
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  const headers: Record<string, string> = {};
  new Headers(init?.headers || (input instanceof Request ? input.headers : undefined)).forEach((v, k) => (headers[k] = v));
  let body: string | undefined;
  if (typeof init?.body === 'string') body = init.body;
  else if (init?.body) body = await new Response(init.body as BodyInit).text();
  const id = `f${++seq}`;
  const enc = new TextEncoder();
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
    },
    cancel() {
      native!.abort(id);
      pending.delete(id);
    },
  });
  return new Promise<Response>((resolve, reject) => {
    let headed = false;
    pending.set(id, {
      onHead: (h) => {
        headed = true;
        resolve(new Response(stream, { status: h.status, headers: h.headers }));
      },
      resolve: () => {},
      reject: (e) => (headed ? ctrl.error(e) : reject(e)),
      onChunk: (t) => ctrl.enqueue(enc.encode(t)),
      onDone: () => {
        try {
          ctrl.close();
        } catch {
          /* already closed */
        }
      },
    });
    init?.signal?.addEventListener('abort', () => {
      native!.abort(id);
      pending.delete(id);
      const err = new DOMException('Aborted', 'AbortError');
      if (headed) ctrl.error(err);
      else reject(err);
    });
    native!.request(id, JSON.stringify({ url, method: init?.method || 'GET', headers, body, stream: true, timeoutMs: 300000 }));
  });
};
