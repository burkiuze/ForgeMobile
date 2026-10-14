// Play mode: scripts (Rhai syntax, run as JS) + lightweight AABB physics.
// Port of desktop src/runtime.rs — same script API, same physics rules.

import * as anim from './animation';
import { compileScript, CompiledScript } from './rhai';
import {
  Entity, EntityId, MeshKind, Scene, Vec3, clone, colorHex, findEntity, getEntity, isActive, parseColor,
  removeEntity, spawn,
} from './scene';

export interface SoundRequest {
  path: string;
  volume: number;
  loopOwner?: string;
}

interface Body {
  id: EntityId;
  tag: string;
  lo: Vec3;
  hi: Vec3;
  pos: Vec3;
}

interface ScriptInst {
  fns: CompiledScript;
  self: Record<string, any>;
  started: boolean;
}

interface AnimState {
  clip: anim.Clip;
  time: number;
  speed: number;
  prev: anim.Pose;
  baseColor: [number, number, number];
}

type Cmd =
  | { k: 'destroy'; name: string }
  | { k: 'spawn'; name: string; mesh: MeshKind; pos: Vec3; color: [number, number, number] | null }
  | { k: 'color'; name: string; color: [number, number, number] }
  | { k: 'sound'; path: string; volume: number }
  | { k: 'anim'; name: string; clip: string }
  | { k: 'stopanim'; name: string };

export function normalizeKey(k: string): string {
  const u = k.trim().toUpperCase().replace(/\s+/g, '');
  const map: Record<string, string> = {
    LEFT: 'ARROWLEFT', RIGHT: 'ARROWRIGHT', UP: 'ARROWUP', DOWN: 'ARROWDOWN', RETURN: 'ENTER', ESC: 'ESCAPE',
    ' ': 'SPACE', SPACEBAR: 'SPACE',
  };
  return map[u] ?? u;
}

// Rotation matrix helpers (XYZ Euler degrees, same as glam EulerRot::XYZ / three.js 'XYZ').
type M3 = number[];
function rotMatrix(r: Vec3): M3 {
  const [x, y, z] = r.map((d) => (d * Math.PI) / 180);
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  // three.js Matrix4.makeRotationFromEuler, order XYZ
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  return [c * e, -c * f, d, af + be * d, ae - bf * d, -b * c, bf - ae * d, be + af * d, a * c];
}

export class Runtime {
  scene: Scene;
  time = 0;
  paused = false;
  hud = '';
  logs: string[] = [];
  errors: string[] = [];
  readonly keysDown = new Set<string>();
  private keysPressed = new Set<string>();
  private pressedQueue = new Set<string>();
  private scripts = new Map<EntityId, ScriptInst>();
  private bodies = new Map<string, Body>();
  private touching = new Set<string>(); // "a\u0000b"
  private cmds: Cmd[] = [];
  private globals: Record<string, any> = {};
  private velocity = new Map<EntityId, Vec3>();
  private grounded = new Map<EntityId, boolean>();
  private camOffsets = new Map<EntityId, Vec3>();
  private anims = new Map<EntityId, AnimState>();
  private sounds: SoundRequest[] = [];
  private clipLoader: (path: string) => anim.Clip | null;
  private rngState = 0x9e3779b9;

  constructor(scene: Scene, clipLoader: (path: string) => anim.Clip | null = () => null) {
    this.scene = clone(scene);
    this.clipLoader = clipLoader;
    const api = this.api();
    for (const e of this.scene.entities) {
      if (!e.script.trim()) continue;
      try {
        const fns = compileScript(e.script, api);
        this.scripts.set(e.id, { fns, self: { name: e.name }, started: false });
      } catch (err) {
        this.errors.push(`${e.name}: ${(err as Error).message}`);
      }
    }
    for (const e of this.scene.entities) {
      if (e.rigidbody) this.velocity.set(e.id, [0, 0, 0]);
      if (e.camera?.follow) {
        const t = findEntity(this.scene, e.camera.follow);
        if (t) {
          const p = e.transform.position;
          const q = t.transform.position;
          this.camOffsets.set(e.id, [p[0] - q[0], p[1] - q[1], p[2] - q[2]]);
        }
      }
      if (e.animator?.play_on_start) this.startAnim(e.id, e.animator.clip, e.animator.speed);
      if (e.audio?.play_on_start && e.audio.clip) {
        this.sounds.push({
          path: e.audio.clip,
          volume: e.audio.volume,
          loopOwner: e.audio.looping ? String(e.id) : undefined,
        });
      }
    }
    this.refreshBodies();
  }

  // ---------------------------------------------------------------- input

  keyDown(k: string) {
    const n = normalizeKey(k);
    if (!this.keysDown.has(n)) this.pressedQueue.add(n);
    this.keysDown.add(n);
  }

  keyUp(k: string) {
    this.keysDown.delete(normalizeKey(k));
  }

  /** Sounds requested since the last call. */
  takeSounds(): SoundRequest[] {
    const s = this.sounds;
    this.sounds = [];
    return s;
  }

  takeLogs(): string[] {
    const l = [...this.errors, ...this.logs];
    this.errors = [];
    this.logs = [];
    return l;
  }

  // ---------------------------------------------------------------- script API

  private rand() {
    this.rngState ^= this.rngState << 13;
    this.rngState ^= this.rngState >>> 17;
    this.rngState ^= this.rngState << 5;
    return ((this.rngState >>> 0) % 1_000_000) / 1_000_000;
  }

  private touchingNames(a: string, b: string): string[] {
    const out: string[] = [];
    for (const pair of this.touching) {
      const [x, y] = pair.split('\u0000');
      const other = x === a ? y : y === a ? x : null;
      if (!other) continue;
      const tagMatch = (this.bodies.get(other)?.tag || '').toLowerCase() === b.toLowerCase();
      if (other.startsWith(b) || tagMatch) out.push(other);
    }
    return out;
  }

  private api(): Record<string, unknown> {
    const self = this;
    const pos = (n: string): Vec3 | null => {
      const b = self.bodies.get(n);
      if (b) return [...b.pos] as Vec3;
      const e = findEntity(self.scene, n);
      return e ? ([...e.transform.position] as Vec3) : null;
    };
    return {
      key: (k: string) => self.keysDown.has(normalizeKey(k)),
      key_pressed: (k: string) => self.keysPressed.has(normalizeKey(k)),
      touching: (a: string, b: string) => self.touchingNames(a, b).length > 0,
      destroy_touching: (a: string, b: string) => {
        const names = self.touchingNames(a, b);
        names.forEach((n) => self.cmds.push({ k: 'destroy', name: n }));
        names.forEach((n) => {
          self.bodies.delete(n);
          for (const p of [...self.touching]) if (p.split('\u0000').includes(n)) self.touching.delete(p);
        });
        return names.length;
      },
      destroy: (n: string) => self.cmds.push({ k: 'destroy', name: String(n) }),
      spawn: (n: string, mesh: string, x: number, y: number, z: number, color?: string) =>
        self.cmds.push({ k: 'spawn', name: String(n), mesh: (String(mesh).toLowerCase() as MeshKind) || 'cube', pos: [x, y, z], color: color ? parseColor(color) : null }),
      set_color: (n: string, c: string) => {
        const col = parseColor(c);
        if (col) self.cmds.push({ k: 'color', name: String(n), color: col });
      },
      pos_of: (n: string) => pos(String(n)) ?? [0, 0, 0],
      distance: (a: string, b: string) => {
        const p = pos(String(a));
        const q = pos(String(b));
        if (!p || !q) return 1e9;
        return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      },
      exists: (n: string) => !!findEntity(self.scene, String(n)),
      random: (lo: number, hi: number) => lo + self.rand() * (hi - lo),
      play_sound: (p: string, v?: number) => self.cmds.push({ k: 'sound', path: String(p), volume: typeof v === 'number' ? v : 1 }),
      play_animation: (n: string, clip: string) => self.cmds.push({ k: 'anim', name: String(n), clip: String(clip) }),
      stop_animation: (n: string) => self.cmds.push({ k: 'stopanim', name: String(n) }),
      get_global: (k: string) => self.globals[k] ?? 0,
      set_global: (k: string, v: unknown) => {
        self.globals[k] = v;
      },
      hud: (t: unknown) => {
        self.hud = String(t);
      },
      log: (t: unknown) => {
        if (self.logs.length < 200) self.logs.push(String(t));
      },
      print: (t: unknown) => {
        if (self.logs.length < 200) self.logs.push(String(t));
      },
      Math,
    };
  }

  // ---------------------------------------------------------------- geometry

  worldMatrix(e: Entity): { r: M3; t: Vec3; s: Vec3 } {
    // Parent chain: compose rotation/scale/translation (non-uniform scale under rotation is approximated).
    const chain: Entity[] = [];
    let cur: Entity | undefined = e;
    let guard = 0;
    while (cur && guard++ < 32) {
      chain.unshift(cur);
      cur = cur.parent != null ? getEntity(this.scene, cur.parent) : undefined;
    }
    let R: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    let T: Vec3 = [0, 0, 0];
    let S: Vec3 = [1, 1, 1];
    for (const n of chain) {
      const p = n.transform.position;
      const sp: Vec3 = [p[0] * S[0], p[1] * S[1], p[2] * S[2]];
      T = [
        T[0] + R[0] * sp[0] + R[1] * sp[1] + R[2] * sp[2],
        T[1] + R[3] * sp[0] + R[4] * sp[1] + R[5] * sp[2],
        T[2] + R[6] * sp[0] + R[7] * sp[1] + R[8] * sp[2],
      ];
      R = mul3(R, rotMatrix(n.transform.rotation));
      S = [S[0] * n.transform.scale[0], S[1] * n.transform.scale[1], S[2] * n.transform.scale[2]];
    }
    return { r: R, t: T, s: S };
  }

  worldAabb(e: Entity): [Vec3, Vec3] {
    const { r, t, s } = this.worldMatrix(e);
    const lo: Vec3 = [Infinity, Infinity, Infinity];
    const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
    const cs = e.collider_size;
    for (let i = 0; i < 8; i++) {
      let p: Vec3 = [i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5];
      if (e.mesh === 'plane') p[1] = 0;
      if (cs) p = [p[0] * cs[0], p[1] * cs[1], p[2] * cs[2]];
      p = [p[0] * s[0], p[1] * s[1], p[2] * s[2]];
      const w: Vec3 = [
        t[0] + r[0] * p[0] + r[1] * p[1] + r[2] * p[2],
        t[1] + r[3] * p[0] + r[4] * p[1] + r[5] * p[2],
        t[2] + r[6] * p[0] + r[7] * p[1] + r[8] * p[2],
      ];
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], w[k]);
        hi[k] = Math.max(hi[k], w[k]);
      }
    }
    if (e.mesh === 'plane') lo[1] -= 0.25;
    return [lo, hi];
  }

  private hasCollider(e: Entity) {
    return e.mesh !== 'none' || e.collider_size != null;
  }

  private refreshBodies() {
    this.bodies.clear();
    for (const e of this.scene.entities) {
      if (!isActive(this.scene, e.id)) continue;
      const [lo, hi] = this.hasCollider(e) ? this.worldAabb(e) : [e.transform.position, e.transform.position];
      this.bodies.set(e.name, { id: e.id, tag: e.tag, lo, hi, pos: [...e.transform.position] as Vec3 });
    }
    this.touching.clear();
    const list = [...this.bodies.entries()].filter(([, b]) => {
      const e = getEntity(this.scene, b.id)!;
      return this.hasCollider(e) && (e.collider || e.trigger);
    });
    const eps = 0.02;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i][1];
        const b = list[j][1];
        if (
          a.lo[0] <= b.hi[0] + eps && a.hi[0] + eps >= b.lo[0] &&
          a.lo[1] <= b.hi[1] + eps && a.hi[1] + eps >= b.lo[1] &&
          a.lo[2] <= b.hi[2] + eps && a.hi[2] + eps >= b.lo[2]
        ) {
          this.touching.add(`${list[i][0]}\u0000${list[j][0]}`);
        }
      }
    }
  }

  // ---------------------------------------------------------------- frame

  step(dt: number) {
    if (this.paused) return;
    dt = Math.min(dt, 1 / 20);
    this.time += dt;
    this.keysPressed = this.pressedQueue;
    this.pressedQueue = new Set();
    this.physics(dt);
    this.refreshBodies();
    for (const [id, inst] of this.scripts) {
      const e = getEntity(this.scene, id);
      if (!e || !isActive(this.scene, id)) continue;
      this.writeThis(e, inst);
      try {
        if (!inst.started) {
          inst.started = true;
          inst.fns.start?.call(inst.self);
        }
        inst.fns.update?.call(inst.self, dt);
      } catch (err) {
        this.errors.push(`${e.name}.update(): ${(err as Error).message}`);
        inst.fns = { ...inst.fns, update: undefined }; // don't spam
      }
      this.readThis(e, inst);
    }
    this.applyCommands();
    this.animate(dt);
    this.followCameras(dt);
  }

  private writeThis(e: Entity, inst: ScriptInst) {
    const t = e.transform;
    const v = this.velocity.get(e.id) || [0, 0, 0];
    Object.assign(inst.self, {
      x: t.position[0], y: t.position[1], z: t.position[2],
      rx: t.rotation[0], ry: t.rotation[1], rz: t.rotation[2],
      sx: t.scale[0], sy: t.scale[1], sz: t.scale[2],
      vx: v[0], vy: v[1], vz: v[2],
      grounded: this.grounded.get(e.id) || false,
      color: colorHex(e.color),
      time: this.time,
      active: e.active,
      name: e.name,
    });
  }

  private readThis(e: Entity, inst: ScriptInst) {
    const m = inst.self;
    const num = (k: string, d: number) => (typeof m[k] === 'number' && isFinite(m[k]) ? m[k] : d);
    const t = e.transform;
    t.position = [num('x', t.position[0]), num('y', t.position[1]), num('z', t.position[2])];
    t.rotation = [num('rx', t.rotation[0]), num('ry', t.rotation[1]), num('rz', t.rotation[2])];
    t.scale = [num('sx', t.scale[0]), num('sy', t.scale[1]), num('sz', t.scale[2])];
    if (e.rigidbody) this.velocity.set(e.id, [num('vx', 0), num('vy', 0), num('vz', 0)]);
    if (typeof m.color === 'string') {
      const c = parseColor(m.color);
      if (c) e.color = c;
    }
    if (typeof m.active === 'boolean') e.active = m.active;
  }

  private applyCommands() {
    const cmds = this.cmds;
    this.cmds = [];
    for (const c of cmds) {
      if (c.k === 'destroy') {
        const e = findEntity(this.scene, c.name);
        if (e) {
          removeEntity(this.scene, e.id);
          this.scripts.delete(e.id);
          this.anims.delete(e.id);
        }
      } else if (c.k === 'spawn') {
        const e = spawn(this.scene, c.name, c.mesh);
        e.transform.position = c.pos;
        if (c.color) e.color = c.color;
      } else if (c.k === 'color') {
        const e = findEntity(this.scene, c.name);
        if (e) e.color = c.color;
      } else if (c.k === 'sound') {
        this.sounds.push({ path: c.path, volume: c.volume });
      } else if (c.k === 'anim') {
        const e = findEntity(this.scene, c.name);
        if (e) this.startAnim(e.id, c.clip, 1);
      } else if (c.k === 'stopanim') {
        const e = findEntity(this.scene, c.name);
        if (e) this.anims.delete(e.id);
      }
    }
  }

  private startAnim(id: EntityId, clipRef: string, speed: number) {
    const clip = clipRef.startsWith('preset:') || !clipRef.includes('/') ? anim.preset(clipRef) : this.clipLoader(clipRef);
    if (!clip) {
      this.logs.push(`animation not found: ${clipRef}`);
      return;
    }
    const e = getEntity(this.scene, id);
    this.anims.set(id, {
      clip,
      time: 0,
      speed: speed || 1,
      prev: anim.sample(clip, 0),
      baseColor: e ? [...e.color] as [number, number, number] : [1, 1, 1],
    });
  }

  private animate(dt: number) {
    for (const [id, st] of [...this.anims]) {
      const e = getEntity(this.scene, id);
      if (!e) {
        this.anims.delete(id);
        continue;
      }
      st.time += dt * st.speed;
      const pose = anim.sample(st.clip, st.time);
      const t = e.transform;
      for (let i = 0; i < 3; i++) {
        t.position[i] += pose.position[i] - st.prev.position[i];
        t.rotation[i] += pose.rotation[i] - st.prev.rotation[i];
        const prev = st.prev.scale[i] || 1;
        t.scale[i] *= pose.scale[i] / prev;
      }
      if (pose.color) e.color = [st.baseColor[0] * pose.color[0], st.baseColor[1] * pose.color[1], st.baseColor[2] * pose.color[2]];
      st.prev = pose;
      if (anim.finished(st.clip, st.time)) this.anims.delete(id);
    }
  }

  private followCameras(dt: number) {
    for (const [cam, off] of this.camOffsets) {
      const c = getEntity(this.scene, cam);
      const follow = c?.camera?.follow;
      if (!c || !follow) continue;
      const t = findEntity(this.scene, follow);
      if (!t) continue;
      const goal = t.transform.position.map((v, i) => v + off[i]);
      const k = 1 - Math.exp(-8 * dt);
      c.transform.position = c.transform.position.map((v, i) => v + (goal[i] - v) * k) as Vec3;
    }
  }

  private physics(dt: number) {
    const g = this.scene.environment.gravity;
    const statics: [EntityId, Vec3, Vec3][] = [];
    for (const e of this.scene.entities) {
      if (e.collider && !e.trigger && this.hasCollider(e) && isActive(this.scene, e.id) && (!e.rigidbody || e.rigidbody.is_static)) {
        const [lo, hi] = this.worldAabb(e);
        statics.push([e.id, lo, hi]);
      }
    }
    for (const e of this.scene.entities) {
      const rb = e.rigidbody;
      if (!rb || rb.is_static || !isActive(this.scene, e.id)) continue;
      const [lo0, hi0] = this.worldAabb(e);
      const v = this.velocity.get(e.id) || [0, 0, 0];
      if (rb.use_gravity) v[1] += g * dt;
      v[1] = Math.max(v[1], -60);
      const delta: Vec3 = [v[0] * dt, v[1] * dt, v[2] * dt];
      for (let i = 0; i < 3; i++) e.transform.position[i] += delta[i];
      const lo: Vec3 = [lo0[0] + delta[0], lo0[1] + delta[1], lo0[2] + delta[2]];
      const hi: Vec3 = [hi0[0] + delta[0], hi0[1] + delta[1], hi0[2] + delta[2]];
      let grounded = false;
      if (e.collider && !e.trigger) {
        for (const [sid, slo, shi] of statics) {
          if (sid === e.id) continue;
          const ox = Math.min(hi[0], shi[0]) - Math.max(lo[0], slo[0]);
          const oy = Math.min(hi[1], shi[1]) - Math.max(lo[1], slo[1]);
          const oz = Math.min(hi[2], shi[2]) - Math.max(lo[2], slo[2]);
          if (ox <= 0 || oy <= 0 || oz <= 0) continue;
          const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
          const sc = [(slo[0] + shi[0]) / 2, (slo[1] + shi[1]) / 2, (slo[2] + shi[2]) / 2];
          const push: Vec3 = [0, 0, 0];
          if (oy <= ox && oy <= oz) push[1] = c[1] > sc[1] ? oy : -oy;
          else if (ox <= oz) push[0] = c[0] > sc[0] ? ox : -ox;
          else push[2] = c[2] > sc[2] ? oz : -oz;
          for (let i = 0; i < 3; i++) {
            e.transform.position[i] += push[i];
            lo[i] += push[i];
            hi[i] += push[i];
          }
          const b = rb.bounciness;
          if (push[1] > 0) {
            grounded = true;
            if (v[1] < 0) v[1] = -v[1] * b;
            const damp = 1 - Math.min(8 * dt, 1) * 0.15;
            v[0] *= damp;
            v[2] *= damp;
          } else if (push[1] < 0 && v[1] > 0) v[1] = 0;
          if (push[0] !== 0) v[0] = -v[0] * b;
          if (push[2] !== 0) v[2] = -v[2] * b;
        }
      }
      this.velocity.set(e.id, v);
      this.grounded.set(e.id, grounded);
    }
  }
}

function mul3(a: M3, b: M3): M3 {
  const o = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return o;
}
