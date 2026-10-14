// Retro sound-effect generator (port of desktop src/audio.rs, CC0 output) + Web Audio playback.

export type Preset = 'coin' | 'jump' | 'laser' | 'explosion' | 'hit' | 'powerup' | 'click' | 'blip';
export const PRESETS: Preset[] = ['coin', 'jump', 'laser', 'explosion', 'hit', 'powerup', 'click', 'blip'];

export function parsePreset(s: string): Preset | null {
  const l = s.toLowerCase();
  return PRESETS.find((p) => l.includes(p) || (p === 'powerup' && l.includes('power'))) ?? null;
}

type Wave = 'square' | 'saw' | 'sine' | 'noise';
interface Params {
  wave: Wave;
  freq: number;
  slide: number;
  attack: number;
  sustain: number;
  decay: number;
  arpAt: number;
  arpMul: number;
  vibrato: number;
}

function params(p: Preset, rnd: () => number): Params {
  const r = (a: number, b: number) => a + rnd() * (b - a);
  const base = { attack: 0, arpAt: 1, arpMul: 1, vibrato: 0, slide: 0 };
  switch (p) {
    case 'coin':
      return { ...base, wave: 'square', freq: r(700, 1100), sustain: 0.05, decay: r(0.15, 0.3), arpAt: 0.06, arpMul: r(1.3, 1.6) };
    case 'jump':
      return { ...base, wave: 'square', freq: r(250, 400), slide: r(1.5, 3), sustain: 0.08, decay: 0.18 };
    case 'laser':
      return { ...base, wave: 'saw', freq: r(900, 1500), slide: r(-3.5, -2), sustain: 0.05, decay: 0.15 };
    case 'explosion':
      return { ...base, wave: 'noise', freq: r(80, 200), slide: -0.4, sustain: 0.12, decay: r(0.4, 0.7) };
    case 'hit':
      return { ...base, wave: 'noise', freq: r(300, 600), slide: -1.5, sustain: 0.02, decay: 0.12 };
    case 'powerup':
      return { ...base, wave: 'square', freq: r(300, 450), slide: 1.2, sustain: 0.2, decay: 0.25, vibrato: r(6, 12) };
    case 'click':
      return { ...base, wave: 'square', freq: r(1200, 1800), sustain: 0.005, decay: 0.03 };
    case 'blip':
      return { ...base, wave: 'sine', freq: r(500, 900), attack: 0.005, sustain: 0.04, decay: 0.08 };
  }
}

/** xorshift PRNG seeded like the desktop generator (so seeds give similar character). */
function rng(seed: number) {
  let s = (BigInt(Math.floor(seed)) * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
  s |= 1n;
  return () => {
    s ^= (s << 13n) & 0xffffffffffffffffn;
    s ^= s >> 7n;
    s ^= (s << 17n) & 0xffffffffffffffffn;
    return Number(s >> 40n) / 2 ** 24;
  };
}

export const SAMPLE_RATE = 44100;

/** Mono float samples in -1..1. */
export function synth(p: Preset, seed: number): Float32Array {
  const rnd = rng(seed);
  const pr = params(p, rnd);
  const total = pr.attack + pr.sustain + pr.decay;
  const n = Math.floor(total * SAMPLE_RATE);
  const out = new Float32Array(n);
  let phase = 0;
  let noise = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env =
      t < pr.attack
        ? t / Math.max(pr.attack, 1e-4)
        : t < pr.attack + pr.sustain
          ? 1
          : Math.pow(Math.max(1 - (t - pr.attack - pr.sustain) / Math.max(pr.decay, 1e-4), 0), 1.6);
    let f = pr.freq * Math.pow(2, pr.slide * t);
    if (t >= pr.arpAt) f *= pr.arpMul;
    if (pr.vibrato > 0) f *= 1 + Math.sin(t * pr.vibrato * Math.PI * 2) * 0.04;
    const prev = phase;
    phase = (phase + f / SAMPLE_RATE) % 1;
    let s: number;
    switch (pr.wave) {
      case 'square':
        s = phase < 0.5 ? 0.6 : -0.6;
        break;
      case 'saw':
        s = phase * 1.2 - 0.6;
        break;
      case 'sine':
        s = Math.sin(phase * Math.PI * 2) * 0.8;
        break;
      default:
        if (phase < prev) noise = rnd() * 2 - 1;
        s = noise * 0.7;
    }
    out[i] = s * env * 0.8;
  }
  return out;
}

/** 16-bit PCM mono WAV. */
export function encodeWav(samples: Float32Array, rate = SAMPLE_RATE): Uint8Array {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, dataLen, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return new Uint8Array(buf);
}

export const defaultSeed = (name: string) => [...name].reduce((a, c) => a + c.charCodeAt(0), 0) + 7;

/** Duration in seconds from a WAV header (null for other formats). */
export function wavDuration(bytes: Uint8Array): number | null {
  if (bytes.length < 44 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF') return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byteRate = v.getUint32(28, true);
  let off = 12;
  while (off + 8 <= bytes.length) {
    const id = String.fromCharCode(...bytes.slice(off, off + 4));
    const len = v.getUint32(off + 4, true);
    if (id === 'data') return byteRate ? len / byteRate : null;
    off += 8 + len + (len & 1);
  }
  return null;
}

// ------------------------------------------------------------------ playback

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private playing = new Set<AudioBufferSourceNode>();
  private loops = new Map<string, AudioBufferSourceNode>();
  volume = 0.8;
  muted = false;

  private context(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.master!.gain.value = this.muted ? 0 : this.volume;
    return this.ctx;
  }

  setVolume(v: number, muted: boolean) {
    this.volume = v;
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : v;
  }

  async decode(key: string, data: () => Promise<ArrayBuffer | null>): Promise<AudioBuffer | null> {
    const hit = this.buffers.get(key);
    if (hit) return hit;
    const ctx = this.context();
    const ab = await data();
    if (!ctx || !ab) return null;
    try {
      const b = await ctx.decodeAudioData(ab.slice(0));
      this.buffers.set(key, b);
      return b;
    } catch {
      return null;
    }
  }

  playBuffer(buf: AudioBuffer, volume = 1, loopOwner?: string) {
    const ctx = this.context();
    if (!ctx || !this.master) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = Math.max(0, Math.min(4, volume));
    src.connect(g).connect(this.master);
    if (loopOwner) {
      src.loop = true;
      this.loops.get(loopOwner)?.stop();
      this.loops.set(loopOwner, src);
    } else {
      this.playing.add(src);
      src.onended = () => this.playing.delete(src);
    }
    src.start();
  }

  playSamples(samples: Float32Array, volume = 1) {
    const ctx = this.context();
    if (!ctx) return;
    const b = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    b.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    this.playBuffer(b, volume);
  }

  forget(key: string) {
    this.buffers.delete(key);
  }

  stopAll() {
    for (const s of this.playing) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.playing.clear();
    for (const s of this.loops.values()) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.loops.clear();
  }
}

export const audio = new AudioEngine();
