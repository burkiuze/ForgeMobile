// Scene tools exposed to agents, the model-agnostic text tool-call protocol, and the executor.
// Same tool names/arguments as desktop Forge (src/ai/tools.rs).

import * as THREE from 'three';
import * as anim from '../core/animation';
import { defaultSeed, encodeWav, parsePreset, synth, wavDuration } from '../core/audio';
import { checkScript } from '../core/rhai';
import {
  Entity, EntityId, MeshKind, Scene, Vec3, defaultAnimator, defaultAudio, defaultCamera, defaultLight, defaultRigidbody,
  duplicateEntity, findEntity, getEntity, parseColor, parseMesh, pointLight, removeEntity, spawn, summary, uniqueName,
} from '../core/scene';
import { FOLDERS, assetKind, cleanPath, humanSize, listFiles, readBlob, readText, removePath, writeFile } from '../core/vfs';

export const TOOL_DOCS = `## Tools
Call tools by writing fenced blocks exactly like this (one JSON object per block, you may emit several blocks):
\`\`\`tool
{"tool": "create_entity", "args": {"name": "Player", "mesh": "capsule", "position": [0, 1, 0], "color": "#f05a1e"}}
\`\`\`
After your tool blocks STOP and wait: the engine runs them and replies with results. When the work is complete, reply with a short summary and NO tool blocks.

Available tools:
- get_scene {} -> current scene as JSON.
- create_entity {name, mesh: "cube|sphere|plane|cylinder|cone|capsule|none", position:[x,y,z], rotation:[x,y,z] (degrees), scale:[x,y,z], color:"#rrggbb", parent:"name", tag:"str", layer:"Default|Environment|Player|Enemy|Pickup|UI", rigidbody:{mass, gravity:bool, static:bool, bounciness}, collider:bool, trigger:bool, light:"directional|point" (+ light_color, intensity, range), material:{metallic:0..1, roughness:0..1, emission:"#hex", emission_strength:0..5, pattern:"none|checker|grid", tiling, texture:"Textures/file.png", unlit:bool}, script:"rhai code"}
- create_many {entities:[ ...create_entity args... ]}  ← prefer this for levels.
- update_entity {target:"name or id", ...any create_entity field, new_name}
- delete_entity {target}
- duplicate_entity {target, count:int, offset:[x,y,z]} -> copies spaced by offset.
- set_script {target, code} -> attach a Rhai script (or {target, file:"Scripts/x.rhai"}).
- setup_camera {style:"third_person|top_down|side|fixed", target:"Player", distance, height, fov} -> creates/aims the Main Camera correctly and makes it follow the target. ALWAYS use this for cameras (never guess camera rotations).
- add_camera {name, position, fov, follow:"entity name"} -> manual camera; it is aimed at the follow target automatically.
- generate_sound {preset:"coin|jump|laser|explosion|hit|powerup|click|blip", name} -> creates Audio/<name>.wav (CC0, generated on the device).
- create_animation {name, preset?:"bob|spin|pulse|walk|swing|swing_alt|door|shake|flash|hover", length, loop, tracks:[{property:"position|rotation|scale|color", keys:[{t, v:[x,y,z]}]}], target?} -> Animations/<name>.anim.json (position/rotation are offsets, scale is a multiplier).
- Components on create/update_entity: audio:{clip:"Audio/x.wav", volume, loop, play_on_start} · animator:{clip:"preset:spin" or "Animations/x.anim.json", speed, play_on_start} (false removes).
- set_environment {sky_top:"#hex", sky_bottom:"#hex", ambient:0..1, gravity:-18}
- clear_scene {keep:["names to keep"]}
- select {target}
- web_search {query} -> top web results (title, url, snippet), searched from this device.
- fetch_url {url} -> readable text of a web page.
- memory_search {query} -> relevant long-term memories (user preferences, past projects).
- remember {fact} -> store a durable fact/preference for future sessions.
- todo_write {todos:[{content, status:"pending|in_progress|completed"}]} -> keep a visible task list for multi-step work (update it as you go).
- list_files {path:"Scripts"} · read_file {path} · write_file {path, content} · delete_file {path} · grep {pattern} -> project files.
- list_assets {} -> every asset already in the project (models, textures, audio, animations, scripts, prefabs).
- inspect_asset {path} -> details of one asset: model size (extents) and triangle count, texture size, audio length, animation tracks.
- asset_search {source:"polyhaven|ambientcg", kind:"textures|models", query} -> free CC0 assets (Poly Haven has textures + 3D models, ambientCG has PBR materials).
- apply_texture {target:"name" or targets:["a","b"], query:"grass|wood|bricks|stone|metal|sand|tiles…", tiling} -> finds a free CC0 texture, imports it and puts it on the objects in ONE step. Use it for ground, platforms, walls.
- asset_import {source, kind, id} -> downloads into the project; returns {path, extents}. Then use the texture with update_entity {material:{texture: path}} (set color "#ffffff"), or place a model with create_entity {mesh:"model", model: path} (its real size is applied automatically).

World: +Y is up, +X is right, -Z is forward (away from the default camera). Units ≈ meters. A unit cube is 1×1×1 centered on its position, so a cube resting on the ground at y=0 has position.y = scale.y/2. Planes are 1×1 (scale them, e.g. [30,1,30]).
`;

/** Short tool sheet for small on-device models (their context and speed are limited). */
export const COMPACT_TOOL_DOCS = `## Tools
Write one fenced block per call, then STOP and wait for results:
\`\`\`tool
{"tool": "create_entity", "args": {"name": "Wall", "mesh": "cube", "position": [0, 1, -4], "scale": [6, 2, 0.5], "color": "#888888"}}
\`\`\`
- get_scene {}
- create_entity {name, mesh:"cube|sphere|plane|cylinder|cone|capsule|none", position, rotation, scale, color, rigidbody:true, trigger:true, light:"point|directional"}
- create_many {entities:[...]}
- update_entity {target, ...fields}   - delete_entity {target}
- set_script {target, code}  (Rhai: fn update(dt) { this.ry += 90.0 * dt; }  key("SPACE"), hud("text"), play_sound(path))
- generate_sound {preset:"coin|jump|laser|explosion|hit|powerup|click|blip", name}
- setup_camera {style:"third_person|top_down|side", target}   - set_environment {sky_top, sky_bottom, ambient}
- apply_texture {targets:["Ground"], query:"grass", tiling}
+Y is up, units are meters, a cube on the ground has y = height/2. When done, answer briefly with NO tool blocks.
`;

export const SCRIPT_DOCS = `## Scripting (Rhai)
Each entity may have a Rhai script. The engine calls \`fn start()\` once and \`fn update(dt)\` every frame. Inside them \`this\` is the entity:
  this.x this.y this.z  (position)   this.rx this.ry this.rz (rotation, degrees)   this.sx this.sy this.sz (scale)
  this.vx this.vy this.vz (velocity, needs rigidbody)   this.grounded (bool)   this.name   this.color ("#hex")   this.active   this.time
  Custom fields persist: \`this.speed = 5.0;\`
Built-in functions:
  key("W") / key("SPACE") / key("LEFT")  -> held;   key_pressed("SPACE") -> pressed this frame
  (On phones the on-screen joystick sends W/A/S/D + arrow keys, the jump button sends SPACE and the action button sends E.)
  touching(this.name, "Coin")  -> overlapping an entity whose name starts with / tag equals "Coin"
  destroy_touching(this.name, "Coin") -> destroys those, returns count
  destroy("Name")   spawn("Name", "cube", x, y, z, "#ff0000")   set_color("Name", "#00ff00")
  pos_of("Name") -> [x,y,z]   distance("A", "B")   exists("Name")   random(lo, hi)
  play_sound("Audio/coin.wav") / play_sound(path, volume)   play_animation("Name", "preset:spin")   stop_animation("Name")
  get_global("score") / set_global("score", v)   hud("text shown on screen")   log("debug")
Rules: use floats (1.0 not 1) for math with positions; \`let\` for locals; no semicolon after fn blocks needed.
Example player:
fn start() { this.speed = 6.0; this.jump = 8.0; }
fn update(dt) {
    if key("A") || key("LEFT")  { this.x -= this.speed * dt; }
    if key("D") || key("RIGHT") { this.x += this.speed * dt; }
    if key("W") || key("UP")    { this.z -= this.speed * dt; }
    if key("S") || key("DOWN")  { this.z += this.speed * dt; }
    if key_pressed("SPACE") && this.grounded { this.vy = this.jump; }
    let n = destroy_touching(this.name, "Coin");
    if n > 0 { set_global("score", get_global("score") + n); }
    hud("Score: " + get_global("score"));
    if this.y < -10.0 { this.x = 0.0; this.y = 2.0; this.z = 0.0; this.vy = 0.0; }
}
`;

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

// ---------------------------------------------------------------- protocol

/** Extract tool calls from model text: ```tool blocks, ```json blocks with "tool", or bare JSON lines. */
export function parseToolCalls(text: string): ToolCall[] {
  const out: ToolCall[] = [];
  let rest = text;
  for (;;) {
    const start = rest.indexOf('```');
    if (start < 0) break;
    const after = rest.slice(start + 3);
    const end = after.indexOf('```');
    if (end < 0) break;
    const block = after.slice(0, end);
    const nl = block.indexOf('\n');
    const lang = (nl >= 0 ? block.slice(0, nl) : '').trim().toLowerCase();
    const body = nl >= 0 ? block.slice(nl + 1) : block;
    if (['tool', 'json', '', 'tool_call'].includes(lang)) collect(body.trim(), out);
    rest = after.slice(end + 3);
  }
  if (!out.length) {
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (l.startsWith('{') && l.includes('"tool"')) collect(l, out);
    }
  }
  return out;
}

function collect(body: string, out: ToolCall[]) {
  const push = (v: any) => {
    if (!v || typeof v !== 'object') return;
    const name = v.tool ?? v.name;
    if (typeof name !== 'string') return;
    let args = v.args ?? v.arguments ?? {};
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch {
        args = {};
      }
    }
    out.push({ name, args: args && typeof args === 'object' ? args : {} });
  };
  try {
    const v = JSON.parse(body);
    if (Array.isArray(v)) v.forEach(push);
    else push(v);
  } catch {
    for (const l of body.split('\n')) {
      try {
        push(JSON.parse(l.trim()));
      } catch {
        /* not json */
      }
    }
  }
}

export function stripToolBlocks(text: string): string {
  let out = '';
  let rest = text;
  for (;;) {
    const s = rest.indexOf('```tool');
    if (s < 0) break;
    out += rest.slice(0, s);
    const after = rest.slice(s + 7);
    const e = after.indexOf('```');
    if (e < 0) {
      rest = '';
      break;
    }
    rest = after.slice(e + 3);
  }
  return (out + rest).trim();
}

/** Tools that change nothing (counted neither as changes nor asked for in Manual mode). */
const READ_ONLY = new Set([
  'get_scene', 'select', 'list_files', 'read_file', 'grep', 'web_search', 'fetch_url', 'memory_search', 'remember',
  'task', 'todo_write', 'asset_search', 'list_assets', 'inspect_asset',
]);
export const isMutation = (name: string) => !READ_ONLY.has(name);
export const READ_ONLY_TOOLS = [...READ_ONLY];

// ---------------------------------------------------------------- executor

export interface ExecContext {
  scene: Scene;
  project: string;
  /** Real size of a model (browser: three.js loader). */
  modelInfo?: (path: string) => Promise<{ extents: [number, number, number]; triangles: number; textured: boolean }>;
  /** Image size of a texture. */
  imageInfo?: (path: string) => Promise<{ width: number; height: number }>;
}

export interface ToolOutcome {
  result: string;
  select?: EntityId;
  /** Project files changed (asset browser refresh). */
  files?: boolean;
}

/** Euler angles (degrees, XYZ like the renderer) that point a camera at `to`. */
export function aimAt(from: Vec3, to: Vec3): Vec3 {
  const o = new THREE.Object3D();
  o.position.set(...from);
  // Object3D.lookAt points +Z at the target; cameras look down -Z, so aim a camera instead.
  const c = new THREE.PerspectiveCamera();
  c.position.copy(o.position);
  c.lookAt(new THREE.Vector3(...to));
  c.rotation.reorder('XYZ');
  const r = 180 / Math.PI;
  return [c.rotation.x * r, c.rotation.y * r, c.rotation.z * r].map((v) => Math.round(v * 100) / 100) as Vec3;
}

function vec3(v: any): Vec3 | null {
  if (Array.isArray(v)) {
    const f = v.filter((x) => typeof x === 'number');
    return f.length >= 3 ? [f[0], f[1], f[2]] : null;
  }
  if (v && typeof v === 'object') return [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0];
  if (typeof v === 'number') return [v, v, v];
  return null;
}

function target(scene: Scene, a: Record<string, any>): Entity {
  const key = a.target ?? a.name ?? a.id;
  if (key == null) throw new Error("missing 'target'");
  const e = findEntity(scene, typeof key === 'number' ? key : String(key));
  if (!e) throw new Error(`no entity named '${key}'`);
  return e;
}

const num = (v: any): number | undefined => (typeof v === 'number' && isFinite(v) ? v : undefined);

/** Apply the shared create/update fields onto an entity. */
export function applyFields(scene: Scene, e: Entity, a: Record<string, any>) {
  let parent: EntityId | null | undefined;
  if (typeof a.parent === 'string' && a.parent) {
    const p = findEntity(scene, a.parent);
    if (!p) throw new Error(`parent '${a.parent}' not found`);
    parent = p.id;
  }
  if (typeof a.mesh === 'string') e.mesh = parseMesh(a.mesh);
  const pos = vec3(a.position ?? a.pos);
  if (pos) e.transform.position = pos;
  const rot = vec3(a.rotation ?? a.rot);
  if (rot) e.transform.rotation = rot;
  const sc = vec3(a.scale);
  if (sc) e.transform.scale = sc;
  const col = a.color != null ? parseColor(a.color) : null;
  if (col) e.color = col;
  if (typeof a.tag === 'string') e.tag = a.tag;
  if (typeof a.active === 'boolean') e.active = a.active;
  if (typeof a.collider === 'boolean') e.collider = a.collider;
  if (typeof a.trigger === 'boolean') e.trigger = a.trigger;
  if (typeof a.model === 'string') {
    e.model = a.model;
    e.mesh = 'model';
  }
  if (typeof a.script === 'string') e.script = a.script;
  if (parent != null) e.parent = parent;

  const rb = a.rigidbody;
  if (rb === false || rb === null) e.rigidbody = null;
  else if (rb === true) e.rigidbody = defaultRigidbody();
  else if (rb && typeof rb === 'object') {
    const r = e.rigidbody ?? defaultRigidbody();
    if (num(rb.mass) != null) r.mass = rb.mass;
    const g = rb.gravity ?? rb.use_gravity;
    if (typeof g === 'boolean') r.use_gravity = g;
    const st = rb.static ?? rb.is_static;
    if (typeof st === 'boolean') r.is_static = st;
    if (num(rb.bounciness) != null) r.bounciness = rb.bounciness;
    e.rigidbody = r;
  }

  const l = a.light;
  if (l === true) e.light = defaultLight();
  else if (l === false || l === null) e.light = null;
  else if (typeof l === 'string') e.light = l.toLowerCase() === 'point' ? pointLight() : defaultLight();
  if (e.light) {
    const lc = a.light_color != null ? parseColor(a.light_color) : null;
    if (lc) e.light.color = lc;
    if (num(a.intensity) != null) e.light.intensity = a.intensity;
    if (num(a.range) != null) e.light.range = a.range;
  }
  if (typeof a.layer === 'string') e.layer = a.layer;
  if (typeof a.static === 'boolean') e.is_static = a.static;

  const au = a.audio;
  if (au === false || au === null) e.audio = null;
  else if (typeof au === 'string') e.audio = { ...defaultAudio(), clip: au };
  else if (au && typeof au === 'object') {
    const x = e.audio ?? defaultAudio();
    if (typeof au.clip === 'string') x.clip = au.clip;
    if (num(au.volume) != null) x.volume = au.volume;
    const lp = au.loop ?? au.looping;
    if (typeof lp === 'boolean') x.looping = lp;
    if (typeof au.play_on_start === 'boolean') x.play_on_start = au.play_on_start;
    e.audio = x;
  }

  const an = a.animator ?? a.animation;
  if (an === false || an === null) e.animator = null;
  else if (typeof an === 'string') e.animator = { ...defaultAnimator(), clip: anim.normalizeClip(an) };
  else if (an && typeof an === 'object') {
    const x = e.animator ?? defaultAnimator();
    const c = an.clip ?? an.preset;
    if (typeof c === 'string') x.clip = anim.normalizeClip(c);
    if (num(an.speed) != null) x.speed = an.speed;
    if (typeof an.play_on_start === 'boolean') x.play_on_start = an.play_on_start;
    e.animator = x;
  }

  const m = a.material && typeof a.material === 'object' ? a.material : {};
  const mat = (k: string) => m[k] ?? a[k];
  const mt = e.material;
  if (num(mat('metallic')) != null) mt.metallic = Math.min(1, Math.max(0, mat('metallic')));
  if (num(mat('roughness')) != null) mt.roughness = Math.min(1, Math.max(0, mat('roughness')));
  const em = mat('emission') != null ? parseColor(mat('emission')) : null;
  if (em) {
    mt.emission = em;
    if (mt.emission_strength === 0) mt.emission_strength = 1;
  }
  if (num(mat('emission_strength')) != null) mt.emission_strength = mat('emission_strength');
  if (num(mat('tiling')) != null) mt.tiling = mat('tiling');
  if (typeof mat('texture') === 'string') mt.texture = mat('texture');
  if (typeof mat('unlit') === 'boolean') mt.unlit = mat('unlit');
  if (typeof mat('pattern') === 'string') {
    const p = String(mat('pattern')).toLowerCase();
    mt.pattern = p === 'checker' ? 'checker' : p === 'grid' ? 'grid' : 'none';
  }
}

function create(scene: Scene, a: Record<string, any>): Entity {
  const e = spawn(scene, String(a.name ?? 'Entity'), parseMesh(String(a.mesh ?? (a.model ? 'model' : 'cube'))) as MeshKind);
  try {
    applyFields(scene, e, a);
  } catch (err) {
    removeEntity(scene, e.id);
    throw err;
  }
  return e;
}

async function withModelSize(ctx: ExecContext, a: Record<string, any>) {
  if (typeof a.model === 'string' && a.scale == null && ctx.modelInfo) {
    try {
      const info = await ctx.modelInfo(cleanPath(a.model));
      a.scale = info.extents;
      if (a.mesh == null) a.mesh = 'model';
    } catch {
      /* unknown size: keep 1×1×1 */
    }
  }
}

export async function inspectAsset(ctx: ExecContext, path: string): Promise<string> {
  const p = cleanPath(path);
  const blob = await readBlob(ctx.project, p);
  if (!blob) throw new Error(`${p}: not found`);
  const kb = Math.round(blob.size / 1024);
  const kind = assetKind(p);
  if (kind === 'model') {
    if (!ctx.modelInfo) return `3D model · ${kb} KB`;
    const m = await ctx.modelInfo(p);
    const e = m.extents;
    return `3D model · size ${e[0].toFixed(2)} x ${e[1].toFixed(2)} x ${e[2].toFixed(2)} m (use as scale) · ${m.triangles} triangles · texture: ${m.textured ? 'yes' : 'no'} · ${kb} KB`;
  }
  if (kind === 'texture') {
    if (ctx.imageInfo) {
      const i = await ctx.imageInfo(p);
      return `texture · ${i.width}x${i.height} px · ${kb} KB`;
    }
    return `texture · ${kb} KB`;
  }
  if (kind === 'audio') {
    const d = wavDuration(new Uint8Array(await blob.arrayBuffer()));
    return `audio clip · ${d != null ? d.toFixed(2) + ' s' : 'unknown length'} · ${kb} KB`;
  }
  if (kind === 'animation') {
    const c = anim.parseClip(await blob.text());
    return `animation '${c.name}' · ${c.length.toFixed(2)} s · loop=${c.looping} · tracks: ${c.tracks.map((t) => `${t.property} (${t.keys.length} keys)`).join(', ') || '-'}`;
  }
  return `file · ${kb} KB`;
}

/** Executes scene and project-file tools. Orchestrator tools (web, memory, task…) are handled by the agent. */
export async function executeTool(ctx: ExecContext, call: ToolCall): Promise<ToolOutcome> {
  const { scene } = ctx;
  const a = call.args || {};
  const arg = (k: string) => (typeof a[k] === 'string' ? (a[k] as string) : '');
  const ok = (result: string, extra: Partial<ToolOutcome> = {}): ToolOutcome => ({ result, ...extra });

  switch (call.name) {
    case 'get_scene':
      return ok(summary(scene));
    case 'create_entity': {
      await withModelSize(ctx, a);
      const e = create(scene, a);
      return ok(`created '${e.name}' (id ${e.id})`, { select: e.id });
    }
    case 'create_many': {
      const list = Array.isArray(a.entities) ? a.entities : null;
      if (!list) throw new Error("missing 'entities' array");
      const names: string[] = [];
      const errs: string[] = [];
      for (const item of list) {
        try {
          await withModelSize(ctx, item);
          names.push(create(scene, item).name);
        } catch (e) {
          errs.push((e as Error).message);
        }
      }
      return ok(`created ${names.length} entities: ${names.join(', ')}${errs.length ? ` | errors: ${errs.join('; ')}` : ''}`);
    }
    case 'update_entity':
    case 'set_transform':
    case 'add_component': {
      const e = target(scene, a);
      await withModelSize(ctx, a);
      if (typeof a.new_name === 'string') e.name = uniqueName(scene, a.new_name);
      const { name: _ignored, ...rest } = a;
      applyFields(scene, e, rest);
      return ok(`updated '${e.name}'`);
    }
    case 'delete_entity': {
      const e = target(scene, a);
      removeEntity(scene, e.id);
      return ok(`deleted '${e.name}'`);
    }
    case 'duplicate_entity': {
      const e = target(scene, a);
      const count = Math.min(Math.max(Number(a.count) || 1, 1), 200);
      const off = vec3(a.offset) ?? [2, 0, 0];
      const base = [...e.transform.position];
      const names: string[] = [];
      for (let i = 1; i <= count; i++) {
        const c = duplicateEntity(scene, e.id);
        if (!c) throw new Error('duplicate failed');
        c.transform.position = [base[0] + off[0] * i, base[1] + off[1] * i, base[2] + off[2] * i];
        names.push(c.name);
      }
      return ok(`created ${names.join(', ')}`);
    }
    case 'set_script': {
      const e = target(scene, a);
      let code = typeof a.code === 'string' ? a.code : typeof a.script === 'string' ? a.script : null;
      if (code == null && typeof a.file === 'string') code = await readText(ctx.project, a.file);
      if (code == null) throw new Error("missing 'code'");
      const err = checkScript(code);
      if (err) throw new Error(`script does not compile: ${err}`);
      e.script = code;
      return ok(`script attached to '${e.name}'`);
    }
    case 'setup_camera': {
      const style = (arg('style') || 'third_person').toLowerCase();
      const tgtName = arg('target') || arg('follow');
      const tgt = tgtName ? findEntity(scene, tgtName) : scene.entities.find((x) => /player/i.test(x.name));
      const dist = num(a.distance) ?? (style.startsWith('top') ? 14 : style.startsWith('side') ? 12 : 8);
      const h = num(a.height) ?? (style.startsWith('top') ? dist : style.startsWith('side') ? 3 : 4);
      const base: Vec3 = tgt ? [...tgt.transform.position] as Vec3 : [0, 0, 0];
      const off: Vec3 = style.startsWith('top') ? [0, h, 0.01] : style.startsWith('side') ? [0, h, dist] : style.startsWith('fixed') ? [dist * 0.7, h + 2, dist * 0.7] : [0, h, dist];
      let e = scene.entities.find((x) => x.camera && x.active) || findEntity(scene, 'Main Camera');
      if (!e) e = spawn(scene, 'Main Camera', 'none');
      for (const x of scene.entities) if (x.camera && x !== e) x.active = false;
      e.transform.position = [base[0] + off[0], base[1] + off[1], base[2] + off[2]];
      e.transform.rotation = aimAt(e.transform.position, [base[0], base[1] + (style.startsWith('top') ? 0 : 1), base[2]]);
      e.camera = { ...(e.camera ?? defaultCamera()), follow: tgt && !style.startsWith('fixed') ? tgt.name : '' };
      if (num(a.fov) != null) e.camera.fov = a.fov;
      e.active = true;
      return ok(`camera '${e.name}' (${style}) at ${e.transform.position.map((v) => v.toFixed(1)).join(', ')} looking at ${tgt ? tgt.name : 'origin'}${e.camera.follow ? ', follows it in play' : ''}`);
    }
    case 'add_camera': {
      const name = arg('name') || 'Main Camera';
      let e = findEntity(scene, name);
      if (!e || !e.camera) {
        for (const x of scene.entities) if (x.camera) x.active = false;
        e = spawn(scene, name, 'none');
      }
      applyFields(scene, e, a);
      const cam = e.camera ?? defaultCamera();
      if (num(a.fov) != null) cam.fov = a.fov;
      if (typeof a.follow === 'string') cam.follow = a.follow;
      e.camera = cam;
      e.active = true;
      const ft = cam.follow ? findEntity(scene, cam.follow) : undefined;
      if (ft && a.keep_rotation !== true) {
        const q = ft.transform.position;
        e.transform.rotation = aimAt(e.transform.position, [q[0], q[1] + 1, q[2]]);
      }
      return ok(`camera '${e.name}' ready`);
    }
    case 'set_environment': {
      const env = scene.environment;
      const top = a.sky_top != null ? parseColor(a.sky_top) : null;
      if (top) env.sky_top = top;
      const bot = a.sky_bottom != null ? parseColor(a.sky_bottom) : null;
      if (bot) env.sky_bottom = bot;
      if (num(a.ambient) != null) env.ambient = a.ambient;
      if (num(a.gravity) != null) env.gravity = a.gravity;
      return ok('environment updated');
    }
    case 'clear_scene': {
      const keep: string[] = Array.isArray(a.keep) ? a.keep.map(String) : [];
      scene.entities = scene.entities.filter((e) => keep.some((k) => k.toLowerCase() === e.name.toLowerCase()));
      return ok(`scene cleared (${scene.entities.length} kept)`);
    }
    case 'select': {
      const e = target(scene, a);
      return ok('selected', { select: e.id });
    }
    case 'list_files': {
      const files = await listFiles(ctx.project, arg('path') ? cleanPath(arg('path')) : '');
      return ok(files.length ? files.slice(0, 400).map((f) => f.path).join('\n') : '(empty)');
    }
    case 'read_file': {
      const s = await readText(ctx.project, arg('path'));
      return ok(s.slice(0, 20000));
    }
    case 'write_file': {
      const p = await writeFile(ctx.project, arg('path'), arg('content'));
      return ok(`wrote ${p} (${arg('content').length} bytes)`, { files: true });
    }
    case 'delete_file': {
      await removePath(ctx.project, arg('path'));
      return ok(`deleted ${arg('path')}`, { files: true });
    }
    case 'grep': {
      const pat = arg('pattern').toLowerCase();
      if (!pat) throw new Error("missing 'pattern'");
      const hits: string[] = [];
      for (const f of await listFiles(ctx.project)) {
        if (!/\.(rhai|js|json|md|txt)$/.test(f.path)) continue;
        const s = await readText(ctx.project, f.path).catch(() => '');
        s.split('\n').forEach((l, i) => {
          if (l.toLowerCase().includes(pat)) hits.push(`${f.path}:${i + 1}: ${l.trim().slice(0, 160)}`);
        });
      }
      for (const e of scene.entities)
        e.script.split('\n').forEach((l, i) => {
          if (l.toLowerCase().includes(pat)) hits.push(`<scene:${e.name}>:${i + 1}: ${l.trim()}`);
        });
      return ok(hits.length ? hits.slice(0, 80).join('\n') : 'no matches');
    }
    case 'list_assets': {
      const all = await listFiles(ctx.project);
      const lines = FOLDERS.map((folder) => {
        const files = all.filter((f) => f.path.startsWith(folder + '/'));
        return `${folder}/ (${files.length}): ${files.length ? files.map((f) => `${f.path} (${humanSize(f.size)})`).join(', ') : '-'}`;
      });
      return ok(lines.join('\n'));
    }
    case 'inspect_asset':
      return ok(await inspectAsset(ctx, arg('path')));
    case 'generate_sound': {
      const preset = parsePreset(arg('preset'));
      if (!preset) throw new Error('preset must be one of coin, jump, laser, explosion, hit, powerup, click, blip');
      const name = (arg('name') || preset).replace(/[^\p{L}\p{N}_-]/gu, '_');
      const seed = num(a.seed) ?? defaultSeed(name);
      const p = await writeFile(ctx.project, `Audio/${name}.wav`, encodeWav(synth(preset, seed)));
      return ok(`sound saved: ${p} (use it with audio:{clip} or play_sound("${p}") in scripts)`, { files: true });
    }
    case 'create_animation': {
      let clip = anim.newClip();
      if (typeof a.preset === 'string') {
        const p = anim.preset(a.preset);
        if (!p) throw new Error(`unknown preset '${a.preset}' (use ${anim.PRESETS.join(', ')})`);
        clip = p;
      }
      if (typeof a.name === 'string') clip.name = a.name;
      if (num(a.length) != null) clip.length = a.length;
      if (typeof a.loop === 'boolean') clip.looping = a.loop;
      if (Array.isArray(a.tracks)) {
        for (const tr of a.tracks) {
          const prop = String(tr?.property || '').toLowerCase() as anim.Property;
          if (!anim.PROPERTIES.includes(prop)) throw new Error(`track property: unknown '${tr?.property}'`);
          for (const k of tr.keys || []) {
            const v = vec3(k.v ?? k.value);
            if (!v) throw new Error('each key needs t and v:[x,y,z]');
            anim.setKey(clip, prop, Number(k.t) || 0, v);
          }
        }
      }
      const path = await writeFile(ctx.project, anim.clipFileName(clip.name), anim.clipJson(clip));
      let msg = `animation saved: ${path}`;
      if (arg('target')) {
        const e = target(scene, a);
        e.animator = { ...defaultAnimator(), clip: path };
        msg += ` and assigned to '${e.name}'`;
      }
      return ok(msg, { files: true });
    }
    default:
      throw new Error(`unknown tool '${call.name}'`);
  }
}

export function getSelected(scene: Scene, id: EntityId | null): string | undefined {
  const e = getEntity(scene, id);
  return e ? `${e.name} (id ${e.id})` : undefined;
}
