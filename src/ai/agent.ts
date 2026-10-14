// Multi-agent orchestrator (port of desktop src/ai/agent.rs).
//
//              ┌──────── Agent Memory (TencentDB Agent Memory / built-in) ───────┐
//              │ recall before the run                     store after the run │
// user ─► mode ─┬─ Ask ───────► Assistant ⇄ web_search / fetch_url / memory ─► answer
//               ├─ Fast ──────────────────► Builder ⇄ scene + web + memory tools
//               └─ Planning ─► Planner ─► Builder ⇄ tools ─► (ask_coder ─► Coder)
//                                               └──► Reviewer ─► fixes ─► Builder

import { checkScript } from '../core/rhai';
import { Msg, streamChat } from './client';
import { Memory } from './memory';
import { AUTO_ID, displayName, resolve } from './models';
import { search as assetSearch, importAsset, parseKind, parseSource, sourceLabel } from './store';
import { COMPACT_TOOL_DOCS, READ_ONLY_TOOLS, SCRIPT_DOCS, TOOL_DOCS, ToolCall, ToolOutcome, isMutation, parseToolCalls, stripToolBlocks } from './tools';
import { SearchHit, fetchText, search as webSearch } from './web';

export type Role = 'explore' | 'assistant' | 'planner' | 'builder' | 'coder' | 'reviewer';
export type Mode = 'planning' | 'fast' | 'ask';
export type Permission = 'manual' | 'auto';

export type AgentEvent =
  | { type: 'start'; role: Role; model: string }
  | { type: 'delta'; text: string }
  | { type: 'end'; model: string }
  | { type: 'tool'; id: string; call: ToolCall; status: 'running' | 'done' | 'error' | 'rejected'; result?: string }
  | { type: 'sources'; hits: SearchHit[] }
  | { type: 'todos'; todos: { content: string; status: string }[] }
  | { type: 'compacted'; summary: string }
  | { type: 'memories'; items: string[] }
  | { type: 'info'; text: string }
  | { type: 'error'; text: string };

export interface AgentSettings {
  selectedModel: string;
  plannerModel: string;
  builderModel: string;
  reviewerModel: string;
  coderModel: string;
  exploreModel: string;
  temperature: number;
  maxSteps: number;
  usePlanner: boolean;
  useReviewer: boolean;
  lanUrl: string;
  customUrl: string;
  webResults: number;
}

export interface Job {
  prompt: string;
  mode: Mode;
  permission: Permission;
  history: Msg[];
  summary: string;
  selected?: string;
  web: boolean;
  sessionId: string;
  /** Reads an API key by name (OPENROUTER_API_KEY, ANTHROPIC_API_KEY…). */
  key: (name: string) => string;
  settings: AgentSettings;
  memory: Memory;
  project: string;
}

export interface AgentEnv {
  emit(e: AgentEvent): void;
  /** Manual permission mode: resolves when the user accepts/rejects. */
  approve(call: ToolCall): Promise<boolean>;
  /** Runs a scene/project tool against the open scene (the editor commits the change). */
  runTool(call: ToolCall): Promise<ToolOutcome>;
  sceneSummary(): string;
  signal: AbortSignal;
}

export interface RunResult {
  summary: string;
  answer: string;
}

const PERSONA =
  'You are Forge AI, the built-in agent of the Forge game engine (an open-source, AI-native alternative to Unity / Unreal). ' +
  'You are running inside Forge Mobile on the user\'s phone. Always answer in the same language the user writes in (e.g. Turkish → Turkish). Be concise and practical.';

const ASK_TOOLS = `## Tools
You may call tools with fenced blocks (one JSON object per block), then STOP and wait for results:
\`\`\`tool
{"tool": "web_search", "args": {"query": "rust ecs tutorial"}}
\`\`\`
- web_search {query} → web results searched from the user's device. Use it for current facts, docs, assets, tutorials.
- fetch_url {url} → readable text of a page (read the best result before answering).
- memory_search {query} → the user's long-term memories.
- remember {fact} → save a durable preference/fact.
- get_scene {} · list_files {path} · read_file {path} · grep {pattern} · list_assets {} · inspect_asset {path} → inspect the scene and project files (read-only).
- task {agent: "explore", prompt} → delegate a research sub-task to the Explore subagent.
When you have enough information, answer WITHOUT tool blocks and cite sources as markdown links.
`;

const BUILDER_GUIDE = `## How to work
You can build complete games from an empty scene, extend them, or fix one specific part the user points at.
1. Understand: call get_scene and list_assets first. For a fix, change only what the user asked about (inspect with get_scene / grep / read_file) and keep everything else intact.
2. Plan with todo_write for anything bigger than a single change, and keep it updated.
3. ASSETS FIRST — never model characters, props or vehicles out of primitive shapes:
   - Reuse what is in the project (list_assets, inspect_asset to learn a model's size).
   - Otherwise find real assets: asset_search {source:"polyhaven", kind:"models"} for 3D models, kind:"textures" or source:"ambientcg" for surfaces, then asset_import and place models with create_entity {mesh:"model", model: path} (real size is applied automatically).
   - If no suitable model exists (e.g. a specific character), use the closest real asset, a simple stand-in object clearly named "<Thing> (placeholder)", and tell the user they can import their own model (Assets › Import from device, glTF/GLB) — never build a figure out of spheres and cylinders.
   - Primitives are only for level geometry: ground, walls, platforms, ramps, triggers, pickups.
4. Gameplay: give the player a rigidbody + controller script (set_script or ask_coder), add goals (collectibles, enemies, timers), a HUD via hud(), win/lose conditions, and a Main Camera that follows the player. On phones the joystick drives W/A/S/D and the jump button is SPACE.
5. Feel: generate_sound for coins/jumps/hits and trigger them with play_sound in scripts; animator presets (bob, spin, pulse, hover, door…) or create_animation for life; materials, textures and lights for looks.
6. Batch with create_many, give every entity a clear unique name, keep things on the ground (y = height/2).
7. Finish with a short summary of what you built and how to play, plus anything the user should import or decide.`;

const EXPLORE_PROMPT =
  'You are the EXPLORE subagent of the Forge engine: a search specialist. Your role is EXCLUSIVELY to search and analyze ' +
  '(scene, project files, the web, memory). You MUST NOT modify anything. Return a concise report with the facts, names and links the caller needs.';

const WORKER_TOOLS = new Set(['web_search', 'fetch_url', 'memory_search', 'remember', 'ask_coder', 'task', 'todo_write', 'asset_search', 'asset_import']);

const truncate = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n) + '…');
let toolSeq = 0;

export class Orchestrator {
  private memories = '';
  private lastAnswer = '';
  private summaryText: string;
  private history: Msg[];

  constructor(private job: Job, private env: AgentEnv) {
    this.summaryText = job.summary;
    this.history = [...job.history];
  }

  private modelFor(role: Role): string {
    const s = this.job.settings;
    const o = { planner: s.plannerModel, builder: s.builderModel, reviewer: s.reviewerModel, coder: s.coderModel, explore: s.exploreModel, assistant: '' }[role];
    return o?.trim() ? o : s.selectedModel;
  }

  private endpoint(role: Role) {
    return resolve(this.modelFor(role), { lanUrl: this.job.settings.lanUrl, customUrl: this.job.settings.customUrl, key: this.job.key });
  }

  /** Small on-device models get short prompts and skip the planner/reviewer round-trips. */
  private get small() {
    return this.endpoint('builder').provider === 'device';
  }

  private check() {
    if (this.env.signal.aborted) throw new Error('Cancelled');
  }

  /** One streamed LLM turn; falls back to Auto once if the chosen cloud model fails. */
  private async call(role: Role, messages: Msg[]): Promise<string> {
    this.check();
    const ep = this.endpoint(role);
    this.env.emit({ type: 'start', role, model: displayName(ep.model) });
    const emit = (d: string) => this.env.emit({ type: 'delta', text: d });
    const t = this.job.settings.temperature;
    let r;
    try {
      r = await streamChat(ep, messages, t, this.env.signal, emit);
    } catch (e) {
      const msg = (e as Error).message;
      if (this.env.signal.aborted || ep.model === AUTO_ID || ep.provider !== 'openrouter' || /key missing/.test(msg)) {
        this.env.emit({ type: 'end', model: '' });
        throw e;
      }
      this.env.emit({ type: 'info', text: `${displayName(ep.model)} → Auto (${msg})` });
      try {
        r = await streamChat({ ...ep, model: AUTO_ID }, messages, t, this.env.signal, emit);
      } catch (e2) {
        this.env.emit({ type: 'end', model: '' });
        throw e2;
      }
    }
    this.env.emit({ type: 'end', model: r.model });
    this.lastAnswer = stripToolBlocks(r.text);
    return r.text;
  }

  private async approve(call: ToolCall): Promise<boolean> {
    if (this.job.permission === 'auto') return true;
    return this.env.approve(call);
  }

  private async tool(call: ToolCall): Promise<string> {
    const id = `t${++toolSeq}`;
    const a = call.args || {};
    const arg = (k: string) => (typeof a[k] === 'string' ? (a[k] as string) : '');
    const needsApproval = isMutation(call.name) && call.name !== 'ask_coder' && call.name !== 'task';
    if (needsApproval && !(await this.approve(call))) {
      this.env.emit({ type: 'tool', id, call, status: 'rejected' });
      throw new Error('The user rejected this action.');
    }
    this.env.emit({ type: 'tool', id, call, status: 'running' });
    try {
      let result: string;
      if (!WORKER_TOOLS.has(call.name)) {
        result = (await this.env.runTool(call)).result;
      } else {
        const webOff = () => {
          throw new Error('web access is disabled in the Agent panel (🌐)');
        };
        switch (call.name) {
          case 'web_search': {
            if (!this.job.web) webOff();
            const hits = await webSearch(arg('query'), this.job.settings.webResults);
            this.env.emit({ type: 'sources', hits });
            result = JSON.stringify(hits, null, 1);
            break;
          }
          case 'fetch_url':
            if (!this.job.web) webOff();
            result = await fetchText(arg('url'), 6000);
            break;
          case 'memory_search': {
            const items = await this.job.memory.recall(arg('query'));
            result = items.length ? items.map((m) => `- [${m.kind}] ${m.text}`).join('\n') : 'no memories found';
            break;
          }
          case 'remember':
            await this.job.memory.remember(this.job.sessionId, arg('fact'));
            result = 'stored';
            break;
          case 'ask_coder':
            result = await this.coder(arg('target'), arg('goal'));
            break;
          case 'task':
            result = await this.subagent(arg('agent'), arg('prompt'));
            break;
          case 'asset_search': {
            if (!this.job.web) webOff();
            const items = await assetSearch(parseSource(arg('source')), parseKind(arg('kind')), arg('query'), 12);
            result = items.length
              ? items.map((i) => `- id=${i.id} name="${i.name}" source=${sourceLabel(i.source)} kind=${i.kind} tags=${i.tags.join(',')}`).join('\n')
              : 'no matching assets';
            break;
          }
          case 'asset_import': {
            if (!this.job.web) webOff();
            const imp = await importAsset(this.job.project, parseSource(arg('source')), parseKind(arg('kind')), arg('id'));
            let extents: number[] | undefined;
            if (imp.kind === 'models') {
              const info = await this.env.runTool({ name: 'inspect_asset', args: { path: imp.path } }).catch(() => null);
              const m = info && /size ([\d.]+) x ([\d.]+) x ([\d.]+)/.exec(info.result);
              if (m) extents = [Number(m[1]), Number(m[2]), Number(m[3])];
            }
            await this.env.runTool({ name: 'list_files', args: { path: '' } }).catch(() => null); // refresh assets
            result = JSON.stringify({ path: imp.path, kind: imp.kind, extents });
            break;
          }
          case 'todo_write': {
            const todos = (Array.isArray(a.todos) ? a.todos : []).map((t: any) => ({
              content: String(t?.content ?? t?.text ?? ''),
              status: String(t?.status ?? 'pending'),
            }));
            this.env.emit({ type: 'todos', todos });
            result = `${todos.length} todos tracked`;
            break;
          }
          default:
            throw new Error(`unknown tool '${call.name}'`);
        }
      }
      this.env.emit({ type: 'tool', id, call, status: 'done', result: truncate(result, 400) });
      return result;
    } catch (e) {
      const msg = (e as Error).message;
      this.env.emit({ type: 'tool', id, call, status: 'error', result: msg });
      throw e;
    }
  }

  private async runCalls(calls: ToolCall[]): Promise<string> {
    let out = '';
    for (const c of calls) {
      this.check();
      try {
        out += `✔ ${c.name}: ${truncate(await this.tool(c), 4000)}\n`;
      } catch (e) {
        if (this.env.signal.aborted) throw e;
        out += `✖ ${c.name}: ERROR ${(e as Error).message}\n`;
      }
    }
    return out;
  }

  private contextBlock(): string {
    let s = '';
    if (this.job.mode !== 'ask') s += `Current scene: ${this.env.sceneSummary()}`;
    if (this.job.selected) s += `\nSelected entity: ${this.job.selected}`;
    if (this.summaryText) s += `\n\nSummary of the earlier conversation:\n${this.summaryText}`;
    if (this.memories) s += `\n\nRelevant long-term memories about this user/project (use them, don't repeat them verbatim):\n${this.memories}`;
    if (!this.job.web) s += '\n\nWeb access is OFF: do not call web_search, fetch_url, asset_search or asset_import.';
    return s;
  }

  private async recall() {
    try {
      const items = await this.job.memory.recall(this.job.prompt);
      if (items.length) {
        this.memories = items.map((m) => `- ${m.text.replace(/\n/g, ' ')}`).join('\n');
        this.env.emit({ type: 'memories', items: items.map((m) => m.text) });
      }
    } catch {
      /* memory unavailable */
    }
  }

  /** opencode-style compaction: fold old turns into a short summary once the history grows. */
  private async compact() {
    const chars = this.history.reduce((a, m) => a + m.content.length, 0);
    if (this.history.length <= 8 && chars < 12000) return;
    const keep = Math.min(4, this.history.length);
    const old = this.history.splice(0, this.history.length - keep);
    const transcript = old.map((m) => `${m.role}: ${m.content.slice(0, 2000)}\n`).join('');
    const saved = this.lastAnswer;
    try {
      const sum = await this.call('assistant', [
        { role: 'system', content: 'Summarize what was done in this conversation, like a pull request description. 3-6 sentences. Keep names of entities, files, decisions and open questions. Same language as the conversation.' },
        { role: 'user', content: `${this.summaryText}\n\n${transcript}` },
      ]);
      this.summaryText = sum;
      this.env.emit({ type: 'compacted', summary: sum });
    } catch {
      /* keep going without compaction */
    }
    this.lastAnswer = saved;
  }

  async run(): Promise<RunResult> {
    await this.recall();
    await this.compact();
    try {
      if (this.job.mode === 'ask') await this.ask();
      else await this.buildFlow();
    } finally {
      if (this.lastAnswer.trim() || this.job.prompt) {
        this.job.memory.storeTurn(this.job.sessionId, this.job.prompt, this.lastAnswer).catch((e) => this.env.emit({ type: 'info', text: `memory: ${e.message}` }));
      }
    }
    return { summary: this.summaryText, answer: this.lastAnswer };
  }

  private async buildFlow() {
    let plan: string | null = null;
    if (this.job.mode === 'planning' && this.job.settings.usePlanner && !this.small) {
      plan = await this.call('planner', [
        {
          role: 'system',
          content: `${PERSONA}\nYou are the PLANNER agent. Turn the user's request into a short numbered build plan (3-8 steps) for the Builder agent who edits the scene with tools (entities, transforms, materials, lights, rigidbodies, cameras, Rhai scripts, sounds, animations, CC0 assets from Poly Haven / ambientCG, web research). Include concrete positions/sizes/colors where useful, which real assets to look for, and which entities need scripts. Do not write code or tool calls.\n${this.contextBlock()}`,
        },
        { role: 'user', content: this.job.prompt },
      ]);
    }
    const review = this.job.mode === 'planning' && this.job.settings.useReviewer && !this.small;
    const rounds = review ? 2 : 1;
    let feedback: string | null = null;
    for (let round = 0; round < rounds; round++) {
      await this.build(plan, feedback);
      if (!review || round + 1 === rounds) break;
      const verdict = await this.call('reviewer', [
        {
          role: 'system',
          content: `${PERSONA}\nYou are the REVIEWER agent. Check whether the scene satisfies the user's request. If it does, reply with the single word APPROVED followed by a one-paragraph summary for the user. Otherwise list the concrete fixes needed (max 5 bullets).`,
        },
        { role: 'user', content: `Request: ${this.job.prompt}\n\nScene now: ${this.env.sceneSummary()}` },
      ]);
      if (verdict.trimStart().toUpperCase().startsWith('APPROVED')) break;
      feedback = verdict;
    }
  }

  private async ask() {
    const msgs: Msg[] = [
      {
        role: 'system',
        content: this.small
          ? `${PERSONA}\nYou can explain Forge features, game design, and Rhai scripting.\n${this.contextBlock()}`
          : `${PERSONA}\nYou can explain Forge features, game design, and Rhai scripting.\n${SCRIPT_DOCS}\n${ASK_TOOLS}\n${this.contextBlock()}`,
      },
      ...this.history,
      { role: 'user', content: this.job.prompt },
    ];
    for (let i = 0; i < 5; i++) {
      const reply = await this.call('assistant', msgs);
      const calls = parseToolCalls(reply).filter((c) => READ_ONLY_TOOLS.includes(c.name));
      if (!calls.length) return;
      const results = await this.runCalls(calls);
      msgs.push({ role: 'assistant', content: reply }, { role: 'user', content: `Tool results:\n${results}` });
    }
  }

  private async build(plan: string | null, feedback: string | null) {
    const msgs: Msg[] = [
      {
        role: 'system',
        content: this.small
          ? `${PERSONA}\nYou are the BUILDER agent. You edit the open scene ONLY through tools.\n${COMPACT_TOOL_DOCS}\n${this.contextBlock()}`
          : `${PERSONA}\nYou are the BUILDER agent. You edit the open scene ONLY through tools.\n${TOOL_DOCS}\n${SCRIPT_DOCS}\n${BUILDER_GUIDE}\n${this.contextBlock()}`,
      },
      ...this.history,
    ];
    let task = `User request: ${this.job.prompt}`;
    if (plan) task += `\n\nPlan from the Planner:\n${plan}`;
    if (feedback) task += `\n\nReviewer feedback — fix these now:\n${feedback}`;
    msgs.push({ role: 'user', content: task });
    const max = Math.max(1, this.job.settings.maxSteps);
    for (let step = 0; step < max; step++) {
      const reply = await this.call('builder', msgs);
      const calls = parseToolCalls(reply);
      if (!calls.length) return;
      const results = await this.runCalls(calls);
      msgs.push({ role: 'assistant', content: reply });
      const nudge = step + 2 >= max ? '\nYou are almost out of steps: finish now and summarize.' : '';
      msgs.push({ role: 'user', content: `Tool results:\n${results}${nudge}` });
    }
  }

  /** Generic subagent loop (opencode `task` tool): explore is read-only, coder may write scripts. */
  private async subagent(agent: string, prompt: string): Promise<string> {
    const coder = agent === 'coder' || agent === 'code';
    const role: Role = coder ? 'coder' : 'explore';
    const system = coder
      ? `You are the CODER subagent of the Forge engine. Write and fix Rhai gameplay scripts.\n${SCRIPT_DOCS}\n${TOOL_DOCS}\nOnly use: get_scene, read_file, list_files, grep, write_file, set_script. Finish with a short report.`
      : `${EXPLORE_PROMPT}\n${ASK_TOOLS}`;
    const allowed = coder
      ? ['get_scene', 'read_file', 'list_files', 'grep', 'write_file', 'set_script']
      : READ_ONLY_TOOLS.filter((t) => t !== 'task');
    const saved = this.lastAnswer;
    const msgs: Msg[] = [
      { role: 'system', content: `${system}\nScene: ${this.env.sceneSummary()}` },
      { role: 'user', content: prompt },
    ];
    let report = '';
    for (let i = 0; i < 6; i++) {
      const reply = await this.call(role, msgs);
      const calls = parseToolCalls(reply).filter((c) => allowed.includes(c.name));
      if (!calls.length) {
        report = stripToolBlocks(reply);
        break;
      }
      const results = await this.runCalls(calls);
      msgs.push({ role: 'assistant', content: reply }, { role: 'user', content: `Tool results:\n${results}` });
    }
    this.lastAnswer = saved;
    return report || 'subagent finished without a report';
  }

  /** Coder agent: writes a script for one entity, validates it, retries once on syntax errors. */
  private async coder(target: string, goal: string): Promise<string> {
    const msgs: Msg[] = [
      { role: 'system', content: `You are the CODER agent of the Forge engine. Write a Rhai script for one entity.\n${SCRIPT_DOCS}\nReply with ONLY the code inside one \`\`\`rhai block.` },
      { role: 'user', content: `Entity: ${target}\nGoal: ${goal}\nScene: ${this.env.sceneSummary()}` },
    ];
    const saved = this.lastAnswer;
    try {
      for (let i = 0; i < 2; i++) {
        const reply = await this.call('coder', msgs);
        const code = extractCode(reply);
        const err = checkScript(code);
        if (!err) {
          if (this.job.permission === 'manual' && !(await this.env.approve({ name: 'set_script', args: { target, code } }))) {
            throw new Error('The user rejected this action.');
          }
          return (await this.env.runTool({ name: 'set_script', args: { target, code } })).result;
        }
        msgs.push({ role: 'assistant', content: reply }, { role: 'user', content: `Compile error: ${err}. Fix it and reply with the full corrected script.` });
      }
      throw new Error('coder could not produce a compiling script');
    } finally {
      this.lastAnswer = saved;
    }
  }
}

export function extractCode(reply: string): string {
  const s = reply.indexOf('```');
  if (s >= 0) {
    let after = reply.slice(s + 3);
    const nl = after.indexOf('\n');
    if (nl >= 0) after = after.slice(nl + 1);
    const e = after.indexOf('```');
    if (e >= 0) return after.slice(0, e).trim();
  }
  return reply.trim();
}
