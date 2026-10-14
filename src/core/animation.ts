// Keyframe clips (`Animations/*.anim.json`), same format as desktop src/animation.rs.
// Position/rotation tracks are offsets from the entity's pose, scale is a multiplier.

export type Property = 'position' | 'rotation' | 'scale' | 'color';
export const PROPERTIES: Property[] = ['position', 'rotation', 'scale', 'color'];

export interface Key {
  t: number;
  v: [number, number, number];
}

export interface Track {
  property: Property;
  keys: Key[];
}

export interface Clip {
  name: string;
  length: number;
  looping: boolean;
  tracks: Track[];
}

export interface Pose {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: [number, number, number] | null;
}

export const newClip = (name = 'New Clip'): Clip => ({ name, length: 1, looping: true, tracks: [] });

export function parseClip(text: string): Clip {
  const v = JSON.parse(text);
  return {
    name: String(v.name ?? 'Clip'),
    length: Number(v.length ?? 1),
    looping: v.looping !== false,
    tracks: Array.isArray(v.tracks)
      ? v.tracks
          .filter((t: any) => PROPERTIES.includes(String(t.property).toLowerCase() as Property))
          .map((t: any) => ({
            property: String(t.property).toLowerCase() as Property,
            keys: (t.keys || []).map((k: any) => ({ t: Number(k.t) || 0, v: [k.v[0], k.v[1], k.v[2]] })),
          }))
      : [],
  };
}

export const clipJson = (c: Clip) => JSON.stringify(c, null, 2);

export function setKey(c: Clip, p: Property, t: number, v: [number, number, number]) {
  let tr = c.tracks.find((x) => x.property === p);
  if (!tr) {
    tr = { property: p, keys: [] };
    c.tracks.push(tr);
  }
  const tt = Math.min(Math.max(t, 0), c.length);
  const k = tr.keys.find((k) => Math.abs(k.t - tt) < 1e-3);
  if (k) k.v = v;
  else tr.keys.push({ t: tt, v });
  tr.keys.sort((a, b) => a.t - b.t);
}

function sampleTrack(keys: Key[], t: number): [number, number, number] | null {
  if (!keys.length) return null;
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const f = (t - a.t) / Math.max(b.t - a.t, 1e-5);
      return [0, 1, 2].map((j) => a.v[j] + (b.v[j] - a.v[j]) * f) as [number, number, number];
    }
  }
  return keys[keys.length - 1].v;
}

export function sample(c: Clip, time: number): Pose {
  const t = c.looping && c.length > 0 ? ((time % c.length) + c.length) % c.length : Math.min(time, c.length);
  const pose: Pose = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: null };
  for (const tr of c.tracks) {
    const v = sampleTrack(tr.keys, t);
    if (!v) continue;
    if (tr.property === 'color') pose.color = v;
    else pose[tr.property] = v;
  }
  return pose;
}

export const finished = (c: Clip, time: number) => !c.looping && time >= c.length;

const k = (t: number, v: [number, number, number]): Key => ({ t, v });
const Z: [number, number, number] = [0, 0, 0];

export function preset(name: string): Clip | null {
  switch (name.toLowerCase().replace(/^preset:/, '')) {
    case 'bob':
    case 'idle':
    case 'float':
      return { name: 'Bob', length: 2, looping: true, tracks: [{ property: 'position', keys: [k(0, Z), k(1, [0, 0.25, 0]), k(2, Z)] }] };
    case 'spin':
    case 'rotate':
      return { name: 'Spin', length: 2, looping: true, tracks: [{ property: 'rotation', keys: [k(0, Z), k(2, [0, 360, 0])] }] };
    case 'pulse':
    case 'breathe':
      return { name: 'Pulse', length: 1, looping: true, tracks: [{ property: 'scale', keys: [k(0, [1, 1, 1]), k(0.5, [1.15, 1.15, 1.15]), k(1, [1, 1, 1])] }] };
    case 'walk':
    case 'walk_bounce':
      return {
        name: 'Walk',
        length: 0.5,
        looping: true,
        tracks: [
          { property: 'position', keys: [k(0, Z), k(0.125, [0, 0.08, 0]), k(0.25, Z), k(0.375, [0, 0.08, 0]), k(0.5, Z)] },
          { property: 'rotation', keys: [k(0, [0, 0, -4]), k(0.25, [0, 0, 4]), k(0.5, [0, 0, -4])] },
        ],
      };
    case 'swing':
    case 'arm_swing':
    case 'leg_swing':
      return { name: 'Swing', length: 0.6, looping: true, tracks: [{ property: 'rotation', keys: [k(0, [30, 0, 0]), k(0.3, [-30, 0, 0]), k(0.6, [30, 0, 0])] }] };
    case 'swing_alt':
    case 'swing2':
      return { name: 'Swing Alt', length: 0.6, looping: true, tracks: [{ property: 'rotation', keys: [k(0, [-30, 0, 0]), k(0.3, [30, 0, 0]), k(0.6, [-30, 0, 0])] }] };
    case 'door':
    case 'door_open':
      return { name: 'Door Open', length: 1, looping: false, tracks: [{ property: 'rotation', keys: [k(0, Z), k(1, [0, -100, 0])] }] };
    case 'shake':
      return {
        name: 'Shake',
        length: 0.4,
        looping: true,
        tracks: [{ property: 'position', keys: [k(0, Z), k(0.1, [0.08, 0, 0]), k(0.2, [-0.08, 0, 0]), k(0.3, [0.05, 0, 0]), k(0.4, Z)] }],
      };
    case 'blink':
    case 'flash':
      return { name: 'Flash', length: 0.6, looping: true, tracks: [{ property: 'color', keys: [k(0, [1, 1, 1]), k(0.3, [1, 0.3, 0.2]), k(0.6, [1, 1, 1])] }] };
    case 'hover':
      return {
        name: 'Hover',
        length: 3,
        looping: true,
        tracks: [{ property: 'position', keys: [k(0, Z), k(0.75, [0.3, 0.2, 0]), k(1.5, [0, 0.4, 0]), k(2.25, [-0.3, 0.2, 0]), k(3, Z)] }],
      };
    default:
      return null;
  }
}

export const PRESETS = ['bob', 'spin', 'pulse', 'walk', 'swing', 'swing_alt', 'door', 'shake', 'flash', 'hover'];

/** "spin" → "preset:spin"; paths are kept as-is. */
export function normalizeClip(c: string): string {
  if (c.includes('/') || c.includes('.') || c.startsWith('preset:')) return c;
  return `preset:${c.toLowerCase()}`;
}

export const clipFileName = (name: string) => `Animations/${name.replace(/[^\p{L}\p{N}]/gu, '_')}.anim.json`;
