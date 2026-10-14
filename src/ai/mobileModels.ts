// Quantized GGUF models small enough to run on a phone (single file < 2 GB, the WebAssembly limit).
// The exact file is resolved through the Hugging Face API at download time, so an entry only
// needs the repo + quantization (same scheme as the desktop catalog).

export type MobileCat = 'tiny' | 'chat' | 'code' | 'reasoning';

export interface MobileModel {
  id: string;
  name: string;
  repo: string;
  quant: string;
  /** billions of parameters */
  params: number;
  ctxK: number;
  cat: MobileCat;
  en: string;
  tr: string;
}

const BPW: Record<string, number> = { Q2_K: 3.0, Q3_K_M: 3.9, Q4_0: 4.55, Q4_K_M: 4.85, Q5_K_M: 5.7, Q6_K: 6.6, Q8_0: 8.5 };

/** Download size in MB (estimate until the real size comes from Hugging Face). */
export const sizeMb = (m: MobileModel) => Math.round((m.params * 1e9 * (BPW[m.quant] ?? 5)) / 8 / 1e6 + 20);
/** RAM needed while running (weights + 4K context + runtime). */
export const ramMb = (m: MobileModel) => Math.round(sizeMb(m) * 1.15 + 300 + m.params * 90);

type Row = [string, string, number, number, MobileCat, string[], string, string];

// name, repo, params(B), ctx(K), category, quants, en, tr
const ROWS: Row[] = [
  ['SmolLM2 135M', 'bartowski/SmolLM2-135M-Instruct-GGUF', 0.135, 8, 'tiny', ['Q8_0'], 'Fastest; for quick tests.', 'En hızlı; hızlı denemeler için.'],
  ['SmolLM2 360M', 'bartowski/SmolLM2-360M-Instruct-GGUF', 0.36, 8, 'tiny', ['Q4_K_M', 'Q8_0'], 'Tiny and quick, simple answers.', 'Küçük ve hızlı, basit cevaplar.'],
  ['Qwen2.5 0.5B Instruct', 'bartowski/Qwen2.5-0.5B-Instruct-GGUF', 0.49, 32, 'tiny', ['Q4_K_M', 'Q8_0'], 'Best quality at half a billion params, multilingual.', 'Yarım milyarda en iyi kalite, çok dilli.'],
  ['Qwen2.5 Coder 0.5B', 'bartowski/Qwen2.5-Coder-0.5B-Instruct-GGUF', 0.49, 32, 'code', ['Q4_K_M', 'Q8_0'], 'Small code model, good for script snippets.', 'Küçük kod modeli, betik parçaları için iyi.'],
  ['Qwen3 0.6B', 'bartowski/Qwen_Qwen3-0.6B-GGUF', 0.6, 32, 'tiny', ['Q4_K_M', 'Q8_0'], 'Newest tiny Qwen with thinking mode.', 'Düşünme modlu en yeni küçük Qwen.'],
  ['Gemma 3 1B', 'bartowski/google_gemma-3-1b-it-GGUF', 1.0, 32, 'tiny', ['Q4_K_M', 'Q6_K', 'Q8_0'], 'Google’s phone-sized model, good Turkish.', 'Google’ın telefon boyutlu modeli, Türkçesi iyi.'],
  ['Llama 3.2 1B Instruct', 'bartowski/Llama-3.2-1B-Instruct-GGUF', 1.24, 128, 'tiny', ['Q4_K_M', 'Q6_K', 'Q8_0'], 'Meta’s mobile model, long context.', 'Meta’nın mobil modeli, uzun bağlam.'],
  ['TinyLlama 1.1B Chat', 'TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF', 1.1, 2, 'tiny', ['Q4_K_M'], 'Classic small chat model.', 'Klasik küçük sohbet modeli.'],
  ['Falcon3 1B Instruct', 'bartowski/Falcon3-1B-Instruct-GGUF', 1.7, 8, 'tiny', ['Q4_K_M'], 'TII Falcon, compact and capable.', 'TII Falcon, kompakt ve yetenekli.'],
  ['DeepSeek Coder 1.3B', 'TheBloke/deepseek-coder-1.3b-instruct-GGUF', 1.35, 16, 'code', ['Q4_K_M'], 'Code-focused, writes small scripts.', 'Kod odaklı, küçük betikler yazar.'],
  ['Qwen2.5 1.5B Instruct', 'bartowski/Qwen2.5-1.5B-Instruct-GGUF', 1.54, 32, 'chat', ['Q4_K_M', 'Q6_K'], 'Sweet spot for most phones.', 'Çoğu telefon için ideal.'],
  ['Qwen2.5 Coder 1.5B', 'bartowski/Qwen2.5-Coder-1.5B-Instruct-GGUF', 1.54, 32, 'code', ['Q4_K_M', 'Q6_K'], 'Best small coder for game scripts.', 'Oyun betikleri için en iyi küçük kodlayıcı.'],
  ['Qwen3 1.7B', 'bartowski/Qwen_Qwen3-1.7B-GGUF', 1.7, 32, 'reasoning', ['Q4_K_M', 'Q6_K', 'Q8_0'], 'Thinks before answering; strong for its size.', 'Cevaptan önce düşünür; boyutuna göre güçlü.'],
  ['SmolLM2 1.7B Instruct', 'bartowski/SmolLM2-1.7B-Instruct-GGUF', 1.7, 8, 'chat', ['Q4_K_M'], 'Hugging Face’s small all-rounder.', 'Hugging Face’in küçük çok yönlüsü.'],
  ['DeepSeek R1 Distill Qwen 1.5B', 'bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF', 1.78, 128, 'reasoning', ['Q4_K_M'], 'Step-by-step reasoning, math and logic.', 'Adım adım akıl yürütme, matematik ve mantık.'],
  ['Gemma 2 2B', 'bartowski/gemma-2-2b-it-GGUF', 2.6, 8, 'chat', ['Q4_K_M'], 'Fluent writer, good multilingual.', 'Akıcı yazar, çok dilli.'],
  ['Granite 3.3 2B', 'unsloth/granite-3.3-2b-instruct-GGUF', 2.5, 128, 'chat', ['Q4_K_M'], 'IBM, reliable instruction following.', 'IBM, talimatlara sadık.'],
  ['Granite 3.1 2B', 'bartowski/granite-3.1-2b-instruct-GGUF', 2.5, 128, 'chat', ['Q4_K_M'], 'IBM, long context.', 'IBM, uzun bağlam.'],
  ['EXAONE 3.5 2.4B', 'bartowski/EXAONE-3.5-2.4B-Instruct-GGUF', 2.4, 32, 'chat', ['Q4_K_M'], 'LG AI, strong small model.', 'LG AI, güçlü küçük model.'],
  ['Llama 3.2 3B Instruct', 'bartowski/Llama-3.2-3B-Instruct-GGUF', 3.21, 128, 'chat', ['Q3_K_M', 'Q4_K_M'], 'Best Meta model for phones with 8 GB+.', '8 GB+ telefonlar için en iyi Meta modeli.'],
  ['Qwen2.5 3B Instruct', 'bartowski/Qwen2.5-3B-Instruct-GGUF', 3.09, 32, 'chat', ['Q4_K_M'], 'Strong general model, multilingual.', 'Güçlü genel model, çok dilli.'],
  ['Qwen2.5 Coder 3B', 'bartowski/Qwen2.5-Coder-3B-Instruct-GGUF', 3.09, 32, 'code', ['Q4_K_M'], 'Best on-phone coder in the list.', 'Listedeki en iyi telefon kodlayıcısı.'],
  ['SmolLM3 3B', 'unsloth/SmolLM3-3B-GGUF', 3.1, 64, 'reasoning', ['Q4_K_M'], 'Reasoning + multilingual, 64K context.', 'Akıl yürütme + çok dilli, 64K bağlam.'],
  ['Falcon3 3B Instruct', 'bartowski/Falcon3-3B-Instruct-GGUF', 3.2, 32, 'chat', ['Q4_K_M'], 'TII Falcon, solid all-rounder.', 'TII Falcon, sağlam çok yönlü.'],
  ['Qwen3 4B', 'bartowski/Qwen_Qwen3-4B-GGUF', 4.0, 32, 'reasoning', ['Q3_K_M'], 'Strongest in the list; needs a flagship phone.', 'Listedeki en güçlüsü; amiral gemisi telefon ister.'],
];

export const MOBILE_MODELS: MobileModel[] = ROWS.flatMap(([name, repo, params, ctxK, cat, quants, en, tr]) =>
  quants.map((quant) => ({
    id: `${repo.split('/')[1].replace(/-GGUF$/i, '').toLowerCase()}-${quant.toLowerCase()}`,
    name,
    repo,
    quant,
    params,
    ctxK,
    cat,
    en,
    tr,
  })),
);

export const findMobileModel = (id: string) => MOBILE_MODELS.find((m) => m.id === id);

/** Pick the GGUF file(s) for a quantization from a repo listing (desktop catalog::pick_files). */
export function pickFiles(files: { path: string; size: number }[], quant: string): { path: string; size: number }[] {
  const q = quant.toLowerCase();
  const matches = files
    .filter(({ path }) => {
      const l = path.toLowerCase();
      return (
        l.endsWith('.gguf') &&
        !l.includes('mmproj') &&
        (l.includes(`-${q}`) || l.includes(`.${q}`) || l.includes(`_${q}`)) &&
        !l.includes(`${q}_l`) &&
        !l.includes(`${q}_xl`)
      );
    })
    .sort((a, b) => a.path.localeCompare(b.path));
  const single = matches.find((f) => !f.path.includes('-of-'));
  return single ? [single] : matches;
}
