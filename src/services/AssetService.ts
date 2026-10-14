import { StoreAsset } from '../types';

export interface SoundEffectPreset {
  id: string;
  name: string;
  type: 'coin' | 'jump' | 'laser' | 'explosion' | 'hit' | 'powerup' | 'click' | 'blip';
  description: string;
}

export interface AnimationPreset {
  id: string;
  name: string;
  type: 'bob' | 'spin' | 'pulse' | 'walk' | 'swing' | 'door' | 'shake' | 'flash' | 'hover';
  description: string;
  duration: number;
}

export interface IAssetService {
  getStoreAssets(): StoreAsset[];
  searchStoreAssets(query: string, category?: string): StoreAsset[];
  downloadAsset(id: string): Promise<void>;
  getSoundEffects(): SoundEffectPreset[];
  playSoundEffect(type: string): void;
  getAnimationPresets(): AnimationPreset[];
}

const STORE_ASSETS: StoreAsset[] = [
  {
    id: 'ast_ancient_column',
    name: 'Ancient Stone Column',
    category: 'models',
    license: 'CC0',
    author: 'Poly Haven',
    size: '2.4 MB',
    tags: ['ruins', 'stone', 'pillar', 'environment'],
    downloaded: true,
  },
  {
    id: 'ast_chest_wooden',
    name: 'Medieval Wooden Chest',
    category: 'models',
    license: 'CC0',
    author: 'ambientCG',
    size: '3.1 MB',
    tags: ['prop', 'wood', 'chest', 'loot'],
    downloaded: false,
  },
  {
    id: 'ast_crystal_shard',
    name: 'Glowing Crystal Spire',
    category: 'models',
    license: 'CC0',
    author: 'Forge Commons',
    size: '1.2 MB',
    tags: ['crystal', 'magic', 'energy', 'scifi'],
    downloaded: false,
  },
  {
    id: 'ast_dungeon_torch',
    name: 'Iron Wall Torch',
    category: 'models',
    license: 'CC0',
    author: 'Poly Haven',
    size: '1.8 MB',
    tags: ['lighting', 'torch', 'fire', 'dungeon'],
    downloaded: true,
  },
  {
    id: 'ast_mossy_cobble',
    name: 'Mossy Cobblestone PBR',
    category: 'textures',
    license: 'CC0',
    author: 'ambientCG',
    size: '4.8 MB',
    tags: ['stone', 'moss', 'floor', 'pbr'],
    downloaded: false,
  },
  {
    id: 'ast_lava_crust',
    name: 'Magma Crust Flow',
    category: 'textures',
    license: 'CC0',
    author: 'Poly Haven',
    size: '5.2 MB',
    tags: ['fire', 'lava', 'volcano', 'terrain'],
    downloaded: true,
  },
  {
    id: 'ast_scifi_metal',
    name: 'Brushed Titanium Panel',
    category: 'textures',
    license: 'CC0',
    author: 'ambientCG',
    size: '3.9 MB',
    tags: ['metal', 'scifi', 'hull', 'clean'],
    downloaded: false,
  },
  {
    id: 'ast_nature_rock',
    name: 'Forest Moss Boulder',
    category: 'models',
    license: 'CC0',
    author: 'Poly Haven',
    size: '2.9 MB',
    tags: ['nature', 'rock', 'foliage'],
    downloaded: false,
  },
];

const SOUND_EFFECTS: SoundEffectPreset[] = [
  { id: 'sfx_coin', name: 'Coin Pickup', type: 'coin', description: 'Bright ascending 8-bit gold chiming bell' },
  { id: 'sfx_jump', name: 'Player Jump', type: 'jump', description: 'Crisp upward frequency sweep' },
  { id: 'sfx_laser', name: 'Plasma Laser', type: 'laser', description: 'Sharp fast-descending blaster burst' },
  { id: 'sfx_explosion', name: 'Blast Explosion', type: 'explosion', description: 'Deep low-pass filtered noise rumble' },
  { id: 'sfx_hit', name: 'Damage Impact', type: 'hit', description: 'Heavy body impact punch' },
  { id: 'sfx_powerup', name: 'Power Up Melody', type: 'powerup', description: 'Multi-harmonic rising triumph arpeggio' },
  { id: 'sfx_click', name: 'Mechanical Click', type: 'click', description: 'Tactile UI click toggle' },
  { id: 'sfx_blip', name: 'Radar Blip', type: 'blip', description: 'Short high-pitch acoustic sonar ping' },
];

const ANIMATION_PRESETS: AnimationPreset[] = [
  { id: 'anim_bob', name: 'Gentle Bob', type: 'bob', description: 'Smooth vertical sine-wave levitation', duration: 2.0 },
  { id: 'anim_spin', name: 'Continuous Spin', type: 'spin', description: 'Constant Y-axis 360 degree rotation', duration: 3.0 },
  { id: 'anim_pulse', name: 'Energy Pulse', type: 'pulse', description: 'Subtle rhythmic scale bounce', duration: 1.5 },
  { id: 'anim_walk', name: 'Character Walk Bob', type: 'walk', description: 'Footstep oscillation with tilt', duration: 0.8 },
  { id: 'anim_swing', name: 'Pendulum Swing', type: 'swing', description: 'Natural gravitational angle swing', duration: 2.5 },
  { id: 'anim_door', name: 'Pivot Open Door', type: 'door', description: '90-degree smooth hinge rotation', duration: 1.2 },
  { id: 'anim_shake', name: 'Camera Shake', type: 'shake', description: 'High-frequency trauma jitter', duration: 0.4 },
  { id: 'anim_flash', name: 'Warning Flash', type: 'flash', description: 'Alpha/emissive alert strobe', duration: 0.6 },
  { id: 'anim_hover', name: 'Floating Hover', type: 'hover', description: 'Combined organic drift on 3 axes', duration: 4.0 },
];

class AssetService implements IAssetService {
  private assets: StoreAsset[] = STORE_ASSETS;
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  getStoreAssets(): StoreAsset[] {
    return this.assets;
  }

  searchStoreAssets(query: string, category?: string): StoreAsset[] {
    const q = query.trim().toLowerCase();
    return this.assets.filter((a) => {
      const matchesCategory = !category || category === 'all' || a.category === category;
      const matchesQuery = !q || a.name.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)) || a.author.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }

  async downloadAsset(id: string): Promise<void> {
    const asset = this.assets.find((a) => a.id === id);
    if (asset) {
      asset.downloaded = true;
    }
  }

  getSoundEffects(): SoundEffectPreset[] {
    return SOUND_EFFECTS;
  }

  getAnimationPresets(): AnimationPreset[] {
    return ANIMATION_PRESETS;
  }

  /**
   * Real-time procedural audio synthesis using Web Audio API
   */
  playSoundEffect(type: string): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      switch (type) {
        case 'coin': {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(987.77, now); // B5
          osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

          osc2.frequency.setValueAtTime(1318.51, now);
          osc2.frequency.setValueAtTime(1975.53, now + 0.08); // B6

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.5);
          osc2.stop(now + 0.5);
          break;
        }

        case 'jump': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.16);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.22);
          break;
        }

        case 'laser': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);

          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.22);
          break;
        }

        case 'explosion': {
          // White noise buffer with lowpass sweep
          const bufferSize = ctx.sampleRate * 0.4;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now);
          filter.frequency.linearRampToValueAtTime(80, now + 0.35);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(now);
          break;
        }

        case 'hit': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.16);
          break;
        }

        case 'powerup': {
          const freqs = [330, 392, 493, 587, 659];
          freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0, now + idx * 0.06);
            gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.14);
          });
          break;
        }

        case 'click': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);

          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case 'blip': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1760, now); // A6

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.09);
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.warn('Audio playback not supported or interaction needed:', e);
    }
  }
}

export const assetService = new AssetService();
