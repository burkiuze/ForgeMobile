// Scene model — the same JSON layout as desktop Forge (src/scene.rs), so `.scene.json`
// files move freely between the PC editor and the phone.

export type Vec3 = [number, number, number];
export type RGB = [number, number, number];
export type EntityId = number;

export type MeshKind = 'none' | 'cube' | 'sphere' | 'plane' | 'cylinder' | 'cone' | 'capsule' | 'model';
export const MESH_KINDS: MeshKind[] = ['none', 'cube', 'sphere', 'plane', 'cylinder', 'cone', 'capsule'];
export const LAYERS = ['Default', 'Environment', 'Player', 'Enemy', 'Pickup', 'UI'];

export interface Transform {
  position: Vec3;
  /** Euler degrees, XYZ order. */
  rotation: Vec3;
  scale: Vec3;
}

export interface Rigidbody {
  mass: number;
  use_gravity: boolean;
  is_static: boolean;
  bounciness: number;
}

export type LightKind = 'directional' | 'point';
export interface Light {
  kind: LightKind;
  color: RGB;
  intensity: number;
  range: number;
  shadows: boolean;
}

export type Pattern = 'none' | 'checker' | 'grid';
export interface Material {
  metallic: number;
  roughness: number;
  emission: RGB;
  emission_strength: number;
  texture: string;
  tiling: number;
  pattern: Pattern;
  unlit: boolean;
}

export interface AudioSource {
  clip: string;
  volume: number;
  looping: boolean;
  play_on_start: boolean;
}

export interface Animator {
  clip: string;
  speed: number;
  play_on_start: boolean;
}

export interface CameraComp {
  fov: number;
  follow: string;
}

export interface Entity {
  id: EntityId;
  name: string;
  active: boolean;
  parent: EntityId | null;
  tag: string;
  transform: Transform;
  mesh: MeshKind;
  color: RGB;
  material: Material;
  model: string;
  layer: string;
  is_static: boolean;
  collider: boolean;
  collider_size: Vec3 | null;
  trigger: boolean;
  rigidbody: Rigidbody | null;
  light: Light | null;
  camera: CameraComp | null;
  audio: AudioSource | null;
  animator: Animator | null;
  script: string;
}

export interface Environment {
  sky_top: RGB;
  sky_bottom: RGB;
  ambient: number;
  gravity: number;
  sun_dir: Vec3;
  fog_start: number;
  fog_end: number;
  shadows: boolean;
  shadow_softness: number;
  exposure: number;
}

export interface Scene {
  name: string;
  next_id: number;
  entities: Entity[];
  environment: Environment;
}

// ------------------------------------------------------------------ defaults

export const defaultMaterial = (): Material => ({
  metallic: 0,
  roughness: 0.5,
  emission: [1, 0.6, 0.2],
  emission_strength: 0,
  texture: '',
  tiling: 1,
  pattern: 'none',
  unlit: false,
});

export const defaultRigidbody = (): Rigidbody => ({ mass: 1, use_gravity: true, is_static: false, bounciness: 0 });
export const defaultLight = (): Light => ({ kind: 'directional', color: [1, 0.96, 0.9], intensity: 1, range: 10, shadows: true });
export const pointLight = (): Light => ({ kind: 'point', color: [1, 0.78, 0.45], intensity: 2, range: 8, shadows: false });
export const defaultAudio = (): AudioSource => ({ clip: '', volume: 1, looping: false, play_on_start: true });
export const defaultAnimator = (): Animator => ({ clip: 'preset:bob', speed: 1, play_on_start: true });
export const defaultCamera = (): CameraComp => ({ fov: 60, follow: '' });

export const defaultEnvironment = (): Environment => ({
  sky_top: [0.2, 0.27, 0.38],
  sky_bottom: [0.55, 0.5, 0.46],
  ambient: 0.35,
  gravity: -18,
  sun_dir: [-0.4, -1, -0.3],
  fog_start: 60,
  fog_end: 300,
  shadows: true,
  shadow_softness: 1,
  exposure: 1,
});

export function defaultEntity(id: EntityId, name: string, mesh: MeshKind): Entity {
  return {
    id,
    name,
    active: true,
    parent: null,
    tag: '',
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    mesh,
    color: [0.8, 0.8, 0.8],
    material: defaultMaterial(),
    model: '',
    layer: 'Default',
    is_static: false,
    collider: true,
    collider_size: null,
    trigger: false,
    rigidbody: null,
    light: null,
    camera: null,
    audio: null,
    animator: null,
    script: '',
  };
}

export function emptyScene(name = 'Main'): Scene {
  return { name, next_id: 1, entities: [], environment: defaultEnvironment() };
}

/** Fill in fields missing from older/foreign scene files (desktop uses serde defaults). */
export function normalizeScene(raw: any): Scene {
  const s = emptyScene(typeof raw?.name === 'string' ? raw.name : 'Main');
  s.environment = { ...defaultEnvironment(), ...(raw?.environment || {}) };
  const ents: any[] = Array.isArray(raw?.entities) ? raw.entities : [];
  let maxId = 0;
  s.entities = ents.map((r, i) => {
    const id = typeof r.id === 'number' ? r.id : i + 1;
    maxId = Math.max(maxId, id);
    const e = defaultEntity(id, String(r.name ?? `Entity ${id}`), parseMesh(String(r.mesh ?? 'none')));
    const t = r.transform || {};
    e.transform = {
      position: vec3Or(t.position, [0, 0, 0]),
      rotation: vec3Or(t.rotation, [0, 0, 0]),
      scale: vec3Or(t.scale, [1, 1, 1]),
    };
    e.active = r.active !== false;
    e.parent = typeof r.parent === 'number' ? r.parent : null;
    e.tag = String(r.tag ?? '');
    e.color = vec3Or(r.color, e.color) as RGB;
    e.material = { ...defaultMaterial(), ...(r.material || {}) };
    e.model = String(r.model ?? '');
    e.layer = String(r.layer ?? 'Default');
    e.is_static = !!r.is_static;
    e.collider = r.collider !== false;
    e.collider_size = Array.isArray(r.collider_size) ? (vec3Or(r.collider_size, [1, 1, 1]) as Vec3) : null;
    e.trigger = !!r.trigger;
    e.rigidbody = r.rigidbody ? { ...defaultRigidbody(), ...r.rigidbody } : null;
    e.light = r.light ? { ...defaultLight(), ...r.light } : null;
    e.camera = r.camera ? { ...defaultCamera(), ...r.camera } : null;
    e.audio = r.audio ? { ...defaultAudio(), ...r.audio } : null;
    e.animator = r.animator ? { ...defaultAnimator(), ...r.animator } : null;
    e.script = String(r.script ?? '');
    return e;
  });
  s.next_id = Math.max(Number(raw?.next_id) || 1, maxId + 1);
  return s;
}

function vec3Or(v: any, d: number[]): Vec3 {
  if (Array.isArray(v) && v.length >= 3 && v.every((x) => typeof x === 'number')) return [v[0], v[1], v[2]];
  return [d[0], d[1], d[2]];
}

export function parseMesh(s: string): MeshKind {
  switch (s.toLowerCase()) {
    case 'cube':
    case 'box':
      return 'cube';
    case 'sphere':
    case 'ball':
      return 'sphere';
    case 'plane':
    case 'ground':
    case 'floor':
    case 'quad':
      return 'plane';
    case 'cylinder':
      return 'cylinder';
    case 'cone':
      return 'cone';
    case 'capsule':
      return 'capsule';
    case 'model':
    case 'gltf':
    case 'glb':
      return 'model';
    default:
      return 'none';
  }
}

export const meshLabel = (m: MeshKind) =>
  ({ none: 'Empty', cube: 'Cube', sphere: 'Sphere', plane: 'Plane', cylinder: 'Cylinder', cone: 'Cone', capsule: 'Capsule', model: 'Model' })[m];

// ------------------------------------------------------------------ colors

export function colorHex(c: RGB): string {
  const h = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

/** "#rgb", "#rrggbb", [r,g,b] (0..1 or 0..255) or a few names → RGB 0..1. */
export function parseColor(v: unknown): RGB | null {
  if (Array.isArray(v) && v.length >= 3 && v.every((x) => typeof x === 'number')) {
    const big = v.some((x) => x > 1);
    return [v[0], v[1], v[2]].map((x) => (big ? x / 255 : x)) as RGB;
  }
  if (typeof v !== 'string') return null;
  const named: Record<string, string> = {
    red: '#e53935', green: '#43a047', blue: '#1e88e5', yellow: '#fdd835', orange: '#f05a22', white: '#ffffff',
    black: '#111111', gray: '#888888', grey: '#888888', purple: '#8e24aa', pink: '#ec407a', brown: '#795548',
    gold: '#f2b233', cyan: '#00bcd4',
  };
  let s = v.trim().toLowerCase();
  if (named[s]) s = named[s];
  if (!s.startsWith('#')) s = '#' + s;
  if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  if (!/^#[0-9a-f]{6}$/.test(s)) return null;
  return [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
}

// ------------------------------------------------------------------ helpers

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function uniqueName(s: Scene, base: string): string {
  const b = base.trim() || 'Entity';
  if (!s.entities.some((e) => e.name === b)) return b;
  for (let i = 1; ; i++) {
    const n = `${b} (${i})`;
    if (!s.entities.some((e) => e.name === n)) return n;
  }
}

export function spawn(s: Scene, name: string, mesh: MeshKind): Entity {
  const e = defaultEntity(s.next_id++, uniqueName(s, name), mesh);
  s.entities.push(e);
  return e;
}

/** Find by exact id, exact name, then case-insensitive name. */
export function findEntity(s: Scene, key: string | number): Entity | undefined {
  if (typeof key === 'number') return s.entities.find((e) => e.id === key);
  const k = String(key).trim();
  if (/^\d+$/.test(k)) {
    const byId = s.entities.find((e) => e.id === Number(k));
    if (byId) return byId;
  }
  return s.entities.find((e) => e.name === k) || s.entities.find((e) => e.name.toLowerCase() === k.toLowerCase());
}

export function getEntity(s: Scene, id: EntityId | null | undefined): Entity | undefined {
  return id == null ? undefined : s.entities.find((e) => e.id === id);
}

/** Remove an entity and its descendants. */
export function removeEntity(s: Scene, id: EntityId) {
  const doomed = new Set<EntityId>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of s.entities) {
      if (e.parent != null && doomed.has(e.parent) && !doomed.has(e.id)) {
        doomed.add(e.id);
        grew = true;
      }
    }
  }
  s.entities = s.entities.filter((e) => !doomed.has(e.id));
}

/** Copy an entity (and children) with fresh ids; returns the new root. */
export function duplicateEntity(s: Scene, id: EntityId): Entity | undefined {
  const src = getEntity(s, id);
  if (!src) return;
  const map = new Map<EntityId, EntityId>();
  const subtree = [src, ...descendants(s, id)];
  const copies = subtree.map((e) => {
    const c = clone(e);
    c.id = s.next_id++;
    map.set(e.id, c.id);
    return c;
  });
  for (const c of copies) {
    if (c.parent != null && map.has(c.parent)) c.parent = map.get(c.parent)!;
  }
  copies[0].name = uniqueName(s, src.name);
  s.entities.push(...copies);
  return copies[0];
}

export function descendants(s: Scene, id: EntityId): Entity[] {
  const out: Entity[] = [];
  const walk = (pid: EntityId) => {
    for (const e of s.entities) {
      if (e.parent === pid) {
        out.push(e);
        walk(e.id);
      }
    }
  };
  walk(id);
  return out;
}

export function isActive(s: Scene, id: EntityId): boolean {
  let e = getEntity(s, id);
  let guard = 0;
  while (e && guard++ < 64) {
    if (!e.active) return false;
    if (e.parent == null) return true;
    e = getEntity(s, e.parent);
  }
  return true;
}

const r3 = (v: number[]) => v.map((x) => Math.round(x * 1000) / 1000);

/** Compact JSON for the agent (same shape as desktop Scene::summary). */
export function summary(s: Scene): string {
  const ents = s.entities.map((e) => {
    const o: Record<string, unknown> = {
      id: e.id,
      name: e.name,
      mesh: e.mesh,
      pos: r3(e.transform.position),
      rot: r3(e.transform.rotation),
      scale: r3(e.transform.scale),
      color: colorHex(e.color),
    };
    if (!e.active) o.active = false;
    if (e.parent != null) o.parent = e.parent;
    if (e.tag) o.tag = e.tag;
    if (e.rigidbody) o.rigidbody = { mass: e.rigidbody.mass, gravity: e.rigidbody.use_gravity, static: e.rigidbody.is_static };
    if (e.trigger) o.trigger = true;
    if (!e.collider) o.collider = false;
    if (e.light) o.light = { kind: e.light.kind, intensity: e.light.intensity };
    if (e.material.metallic > 0 || e.material.emission_strength > 0 || e.material.texture)
      o.material = { metallic: e.material.metallic, roughness: e.material.roughness, emission: e.material.emission_strength, texture: e.material.texture };
    if (e.layer !== 'Default') o.layer = e.layer;
    if (e.model) o.model = e.model;
    if (e.camera) o.camera = { fov: e.camera.fov, follow: e.camera.follow };
    if (e.audio) o.audio = { clip: e.audio.clip, loop: e.audio.looping };
    if (e.animator) o.animator = { clip: e.animator.clip };
    if (e.script) o.script_lines = e.script.split('\n').length;
    return o;
  });
  return JSON.stringify({ scene: s.name, gravity: s.environment.gravity, entities: ents });
}

// ------------------------------------------------------------------ templates

export const PLAYER_SCRIPT = `fn start() { this.speed = 7.0; this.jump = 9.0; set_global("score", 0); }
fn update(dt) {
    if key("A") || key("LEFT")  { this.x -= this.speed * dt; }
    if key("D") || key("RIGHT") { this.x += this.speed * dt; }
    if key("W") || key("UP")    { this.z -= this.speed * dt; }
    if key("S") || key("DOWN")  { this.z += this.speed * dt; }
    if key_pressed("SPACE") && this.grounded { this.vy = this.jump; }
    let n = destroy_touching(this.name, "Coin");
    if n > 0 { set_global("score", get_global("score") + n); }
    let s = get_global("score");
    if s >= 5 { hud("You win! Score: " + s); } else { hud("Coins: " + s + " / 5"); }
    if this.y < -10.0 { this.x = 0.0; this.y = 2.0; this.z = 0.0; this.vy = 0.0; }
}
`;

export const COIN_SCRIPT = `fn update(dt) { this.ry += 120.0 * dt; this.y = 1.2 + (this.time * 3.0).sin() * 0.15; }`;

export const SCRIPT_TEMPLATES: [string, string][] = [
  ['Player Controller', PLAYER_SCRIPT],
  ['Rotator', 'fn update(dt) {\n    this.ry += 90.0 * dt;\n}\n'],
  ['Bobbing', 'fn start() { this.base_y = this.y; }\nfn update(dt) {\n    this.y = this.base_y + (this.time * 2.5).sin() * 0.25;\n}\n'],
  ['Collectible', COIN_SCRIPT],
  [
    'Enemy Patrol',
    'fn start() { this.origin = this.x; this.dir = 1.0; this.speed = 3.0; }\nfn update(dt) {\n    this.x += this.dir * this.speed * dt;\n    if this.x > this.origin + 4.0 { this.dir = -1.0; }\n    if this.x < this.origin - 4.0 { this.dir = 1.0; }\n    if touching(this.name, "Player") { hud("Game Over!"); }\n}\n',
  ],
  [
    'Chase Player',
    'fn start() { this.speed = 2.5; }\nfn update(dt) {\n    if !exists("Player") { return; }\n    let p = pos_of("Player");\n    let dx = p[0] - this.x; let dz = p[2] - this.z;\n    let d = (dx * dx + dz * dz).sqrt();\n    if d > 0.5 { this.x += dx / d * this.speed * dt; this.z += dz / d * this.speed * dt; }\n}\n',
  ],
  ['Flicker Light', 'fn update(dt) {\n    this.sy = 1.0 + random(-0.05, 0.05);\n}\n'],
];

export type Template = 'starter' | 'platformer' | 'empty';

export function starterScene(): Scene {
  const s = emptyScene('Main');
  const g = spawn(s, 'Ground', 'plane');
  g.transform.scale = [20, 1, 20];
  g.color = [0.32, 0.34, 0.36];
  const sun = spawn(s, 'Sun', 'none');
  sun.light = defaultLight();
  sun.transform.position = [0, 10, 0];
  sun.transform.rotation = [-50, 30, 0];
  const cam = spawn(s, 'Main Camera', 'none');
  cam.camera = defaultCamera();
  cam.transform.position = [0, 6, 12];
  cam.transform.rotation = [-20, 0, 0];
  const cube = spawn(s, 'Cube', 'cube');
  cube.transform.position = [0, 0.5, 0];
  cube.color = [0.94, 0.35, 0.12];
  return s;
}

export function platformerScene(): Scene {
  const s = starterScene();
  s.name = 'Platformer';
  const c = findEntity(s, 'Cube');
  if (c) removeEntity(s, c.id);
  const p = spawn(s, 'Player', 'capsule');
  p.transform.position = [0, 1, 0];
  p.transform.scale = [1, 1.6, 1];
  p.color = [0.94, 0.35, 0.12];
  p.rigidbody = defaultRigidbody();
  p.script = PLAYER_SCRIPT;
  const plats: Vec3[] = [
    [4, 1, -3],
    [8, 2, -6],
    [3, 3, -10],
    [-3, 2, -7],
    [-7, 1, -3],
  ];
  plats.forEach(([x, y, z], i) => {
    const pl = spawn(s, `Platform ${i + 1}`, 'cube');
    pl.transform.position = [x, y - 0.25, z];
    pl.transform.scale = [3, 0.5, 3];
    pl.color = [0.89, 0.88, 0.86];
    const coin = spawn(s, `Coin ${i + 1}`, 'cylinder');
    coin.transform.position = [x, y + 1.2, z];
    coin.transform.scale = [0.6, 0.12, 0.6];
    coin.transform.rotation = [90, 0, 0];
    coin.color = [0.96, 0.66, 0.13];
    coin.trigger = true;
    coin.tag = 'Coin';
    coin.script = COIN_SCRIPT;
  });
  const cam = findEntity(s, 'Main Camera')!;
  cam.transform.position = [0, 7, 11];
  cam.transform.rotation = [-25, 0, 0];
  cam.camera = { fov: 60, follow: 'Player' };
  return s;
}

export function templateScene(t: Template): Scene {
  if (t === 'platformer') return platformerScene();
  if (t === 'starter') return starterScene();
  return emptyScene('Main');
}
