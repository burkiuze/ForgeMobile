// AI providers. Every cloud provider here speaks the OpenAI chat-completions protocol,
// so one client handles them all; "device" runs GGUF models on the phone itself.

export const AUTO_ID = 'openrouter/free';

/** Built-in Forge AI: a small server that holds the owner's OpenRouter key (free models only),
 *  so OpenRouter works with no key at all. A user's own key, if set, goes straight to OpenRouter. */
/** What "Auto" really asks OpenRouter for: free chat models that follow tool instructions well,
 *  tried in order (OpenRouter falls through on rate limits / outages). openrouter/free alone can
 *  land on safety classifiers or tiny models that can't build anything. */
export const AUTO_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemma-4-31b-it:free',
];

export const FORGE_PROXY = 'https://forge-ai-proxy.vercel.app/api/v1';

export type ProviderId =
  | 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'mistral' | 'deepseek' | 'xai' | 'custom' | 'lan' | 'device';

export interface ProviderModel {
  id: string;
  name: string;
  blurb?: string;
  blurbTr?: string;
}

export interface Provider {
  id: ProviderId;
  name: string;
  /** Secret holding the API key (empty: no key needed). */
  key: string;
  base: string;
  keyUrl: string;
  free?: boolean;
  /** Works without a key through the Forge AI proxy. */
  builtIn?: boolean;
  models: ProviderModel[];
  en: string;
  tr: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: 'openrouter', name: 'Forge AI · OpenRouter', key: 'OPENROUTER_API_KEY', base: 'https://openrouter.ai/api/v1', keyUrl: 'https://openrouter.ai/keys', free: true, builtIn: true,
    en: 'Forge AI — free models, works out of the box (no key needed). Add your own key for paid models.', tr: 'Forge AI — ücretsiz modeller, anahtarsız hazır çalışır. Ücretli modeller için kendi anahtarını ekleyebilirsin.',
    models: [
      { id: AUTO_ID, name: 'Auto', blurb: 'Best free models, switches automatically when one is busy', blurbTr: 'En iyi ücretsiz modeller, biri meşgulse otomatik geçer' },
      { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B', blurb: 'Google DeepMind · 262K ctx · multimodal, tool use', blurbTr: 'Google DeepMind · 262K bağlam · çok kipli' },
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super', blurb: 'NVIDIA · 120B MoE · 262K ctx · strong agent', blurbTr: 'NVIDIA · 120B MoE · 262K bağlam · güçlü ajan' },
      { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra', blurb: 'NVIDIA · 550B MoE · 1M ctx', blurbTr: 'NVIDIA · 550B MoE · 1M bağlam' },
      { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1', blurb: 'Poolside · coding agent · 262K ctx', blurbTr: 'Poolside · kodlama ajanı · 262K bağlam' },
      { id: 'cohere/north-mini-code:free', name: 'North Mini Code', blurb: 'Cohere · agentic coding MoE · 256K ctx', blurbTr: 'Cohere · ajan kodlama · 256K bağlam' },
    ],
  },
  {
    id: 'anthropic', name: 'Anthropic (Claude)', key: 'ANTHROPIC_API_KEY', base: 'https://api.anthropic.com/v1', keyUrl: 'https://console.anthropic.com/settings/keys',
    en: 'Claude models — strong at agentic building.', tr: 'Claude modelleri — ajan işlerinde güçlü.',
    models: [
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
      { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
      { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5' },
    ],
  },
  {
    id: 'openai', name: 'OpenAI', key: 'OPENAI_API_KEY', base: 'https://api.openai.com/v1', keyUrl: 'https://platform.openai.com/api-keys',
    en: 'GPT models.', tr: 'GPT modelleri.',
    models: [
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
    ],
  },
  {
    id: 'gemini', name: 'Google Gemini', key: 'GEMINI_API_KEY', base: 'https://generativelanguage.googleapis.com/v1beta/openai', keyUrl: 'https://aistudio.google.com/apikey', free: true,
    en: 'Gemini via Google AI Studio (free tier).', tr: 'Google AI Studio üzerinden Gemini (ücretsiz katman).',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
    ],
  },
  {
    id: 'groq', name: 'Groq', key: 'GROQ_API_KEY', base: 'https://api.groq.com/openai/v1', keyUrl: 'https://console.groq.com/keys', free: true,
    en: 'Very fast open models (free tier).', tr: 'Çok hızlı açık modeller (ücretsiz katman).',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
      { id: 'openai/gpt-oss-120b', name: 'gpt-oss 120B' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    ],
  },
  {
    id: 'mistral', name: 'Mistral', key: 'MISTRAL_API_KEY', base: 'https://api.mistral.ai/v1', keyUrl: 'https://console.mistral.ai/api-keys',
    en: 'Mistral and Codestral.', tr: 'Mistral ve Codestral.',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large' },
      { id: 'mistral-small-latest', name: 'Mistral Small' },
      { id: 'codestral-latest', name: 'Codestral' },
    ],
  },
  {
    id: 'deepseek', name: 'DeepSeek', key: 'DEEPSEEK_API_KEY', base: 'https://api.deepseek.com/v1', keyUrl: 'https://platform.deepseek.com/api_keys',
    en: 'DeepSeek chat and reasoner, low prices.', tr: 'DeepSeek sohbet ve akıl yürütme, düşük fiyat.',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
    ],
  },
  {
    id: 'xai', name: 'xAI (Grok)', key: 'XAI_API_KEY', base: 'https://api.x.ai/v1', keyUrl: 'https://console.x.ai',
    en: 'Grok models.', tr: 'Grok modelleri.',
    models: [
      { id: 'grok-4', name: 'Grok 4' },
      { id: 'grok-3-mini', name: 'Grok 3 mini' },
    ],
  },
  {
    id: 'custom', name: 'Custom (OpenAI-compatible)', key: 'CUSTOM_API_KEY', base: '', keyUrl: '',
    en: 'Any OpenAI-compatible endpoint (Together, Fireworks, vLLM…).', tr: 'OpenAI uyumlu herhangi bir adres (Together, Fireworks, vLLM…).',
    models: [],
  },
  {
    id: 'lan', name: 'Local network (PC)', key: '', base: '', keyUrl: '',
    en: 'llama.cpp, Ollama or LM Studio running on your computer.', tr: 'Bilgisayarında çalışan llama.cpp, Ollama veya LM Studio.',
    models: [],
  },
  {
    id: 'device', name: 'On this phone', key: '', base: '', keyUrl: '', free: true,
    en: 'Small quantized models that run offline on the phone.', tr: 'Telefonda internetsiz çalışan küçük, sıkıştırılmış modeller.',
    models: [],
  },
];

export const provider = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!;
export const PREFIXED = PROVIDERS.filter((p) => p.id !== 'openrouter').map((p) => p.id);

/** Model ids are `<provider>:<model>`; ids without a known prefix belong to OpenRouter. */
export function splitModelId(id: string): { provider: ProviderId; model: string } {
  const i = id.indexOf(':');
  if (i > 0) {
    const p = id.slice(0, i) as ProviderId;
    if (PREFIXED.includes(p)) return { provider: p, model: id.slice(i + 1) };
  }
  return { provider: 'openrouter', model: id };
}

export const joinModelId = (p: ProviderId, model: string) => (p === 'openrouter' ? model : `${p}:${model}`);

/** Key names stored on the device (also read from Forge.env / .env files). */
export const ALL_KEY_NAMES = [...new Set([...PROVIDERS.map((p) => p.key).filter(Boolean), 'HF_TOKEN', 'GITHUB_TOKEN'])];
