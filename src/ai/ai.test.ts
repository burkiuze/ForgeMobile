import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { platformerScene, starterScene, findEntity, summary, Scene } from '../core/scene';
import { listFiles } from '../core/vfs';
import { AgentEvent, Orchestrator } from './agent';
import { Memory, bm25, extractFacts } from './memory';
import { parseAmbientcg, parsePolyhaven, phDiffuseUrl } from './store';
import { aimAt, executeTool, isMutation, parseToolCalls, stripToolBlocks } from './tools';
import { parseDdg } from './web';
import { SseParser, dedupeTail, isLooping } from './client';

describe('tool protocol', () => {
  it('parses tool blocks, json blocks and bare lines', () => {
    const t = 'Plan:\n```tool\n{"tool":"create_entity","args":{"name":"A"}}\n```\n```json\n[{"tool":"delete_entity","args":{"target":"B"}}]\n```';
    expect(parseToolCalls(t).map((c) => c.name)).toEqual(['create_entity', 'delete_entity']);
    expect(parseToolCalls('{"tool": "get_scene", "args": {}}')[0].name).toBe('get_scene');
    expect(stripToolBlocks('hi\n```tool\n{}\n```\nbye')).toBe('hi\n\nbye');
    expect(isMutation('create_entity')).toBe(true);
    expect(isMutation('list_assets')).toBe(false);
  });

  it('executes scene + project tools', async () => {
    const scene = starterScene();
    const ctx = { scene, project: 'test-tools' };
    await executeTool(ctx, {
      name: 'create_many',
      args: { entities: [{ name: 'Wall', mesh: 'cube', position: [0, 1, -5], scale: [10, 2, 0.5], color: '#888' }, { name: 'Lamp', mesh: 'none', light: 'point', intensity: 3 }] },
    });
    expect(findEntity(scene, 'Wall')!.transform.scale).toEqual([10, 2, 0.5]);
    expect(findEntity(scene, 'Lamp')!.light!.kind).toBe('point');
    await executeTool(ctx, { name: 'update_entity', args: { target: 'Wall', material: { texture: 'Textures/brick.jpg', metallic: 0.3 }, animator: 'spin', audio: { clip: 'Audio/hum.wav', loop: true } } });
    const w = findEntity(scene, 'Wall')!;
    expect(w.material.texture).toBe('Textures/brick.jpg');
    expect(w.animator!.clip).toBe('preset:spin');
    expect(w.audio!.looping).toBe(true);
    await expect(executeTool(ctx, { name: 'set_script', args: { target: 'Wall', code: 'fn update(dt) { if { }' } })).rejects.toThrow(/compile/);
    await executeTool(ctx, { name: 'set_script', args: { target: 'Wall', code: 'fn update(dt) { this.ry += 1.0; }' } });
    const snd = await executeTool(ctx, { name: 'generate_sound', args: { preset: 'coin', name: 'pickup' } });
    expect(snd.result).toContain('Audio/pickup.wav');
    await executeTool(ctx, { name: 'create_animation', args: { name: 'float', preset: 'bob', target: 'Wall' } });
    expect(findEntity(scene, 'Wall')!.animator!.clip).toBe('Animations/float.anim.json');
    const assets = (await executeTool(ctx, { name: 'list_assets', args: {} })).result;
    expect(assets).toContain('Audio/pickup.wav');
    expect(assets).toContain('Animations/float.anim.json');
    expect((await executeTool(ctx, { name: 'inspect_asset', args: { path: 'Audio/pickup.wav' } })).result).toMatch(/audio clip · 0\.\d+ s/);
    expect((await executeTool(ctx, { name: 'grep', args: { pattern: 'this.ry' } })).result).toContain('<scene:Wall>');
    await executeTool(ctx, { name: 'duplicate_entity', args: { target: 'Wall', count: 2, offset: [0, 0, -3] } });
    expect(findEntity(scene, 'Wall (2)')!.transform.position[2]).toBe(-11);
    await expect(executeTool(ctx, { name: 'read_file', args: { path: '../x' } })).rejects.toThrow(/inside/);
    await executeTool(ctx, { name: 'clear_scene', args: { keep: ['Sun'] } });
    expect(scene.entities.map((e) => e.name)).toEqual(['Sun']);
  });
});

describe('parsers', () => {
  it('reads search results and catalogs', () => {
    const html = '<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa&amp;rut=x">Example <b>A</b></a><a class="result__snippet" href="#">Snip &amp; more</a>';
    expect(parseDdg(html)).toEqual([{ title: 'Example A', url: 'https://example.com/a', snippet: 'Snip & more' }]);
    const ph = parsePolyhaven('models', { chair: { name: 'Chair', tags: ['wood'], download_count: 5 }, crate: { name: 'Crate', download_count: 9 } });
    expect(ph.map((i) => i.id)).toEqual(['crate', 'chair']);
    expect(parseAmbientcg({ foundAssets: [{ assetId: 'Bricks001', displayName: 'Bricks 001', previewImage: { '256-PNG': 'u' } }] })[0].thumb).toBe('u');
    expect(phDiffuseUrl({ Diffuse: { '1k': { jpg: { url: 'd.jpg' } } } })).toBe('d.jpg');
    const p = new SseParser();
    const got: string[] = [];
    p.push('data: {"a":1}\n\nda', (d) => got.push(d));
    p.push('ta: [DONE]\n', (d) => got.push(d));
    expect(got).toEqual(['{"a":1}', '[DONE]']);
  });

  it('ranks memories', () => {
    expect(bm25(['red car fast', 'blue boat', 'red apple'], 'red car')[0][0]).toBe(0);
    expect(extractFacts('Benim adım Burak. Hava güzel.')).toEqual(['Benim adım Burak']);
  });
});

// ------------------------------------------------------------------ end-to-end with a mock LLM

let base = '';
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const j = JSON.parse(body || '{}');
    const sys: string = j.messages?.[0]?.content || '';
    const last: string = j.messages?.[j.messages.length - 1]?.content || '';
    let text: string;
    if (sys.includes('PLANNER')) text = '1. Build a tower\n2. Light it';
    else if (sys.includes('REVIEWER')) text = 'APPROVED The tower is built.';
    else if (last.startsWith('Tool results')) text = 'Done: built a tower with a light.';
    else if (body.includes('STALL') && !last.includes('act now')) text = 'Harika fikir! Hemen başlıyorum, önce kuleyi kurayım.';
    else
      text =
        'Building.\n```tool\n{"tool":"todo_write","args":{"todos":[{"content":"Tower","status":"in_progress"}]}}\n```\n```tool\n{"tool":"create_many","args":{"entities":[{"name":"Tower","mesh":"cylinder","position":[0,3,0],"scale":[2,6,2]},{"name":"Beacon","mesh":"sphere","position":[0,6.5,0],"light":"point"}]}}\n```';
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    for (const part of text.match(/[\s\S]{1,25}/g) || []) {
      res.write(`data: ${JSON.stringify({ model: 'mock', choices: [{ delta: { content: part } }] })}\n\n`);
    }
    res.end('data: [DONE]\n\n');
  });
});

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
afterAll(() => server.close());

function makeJob(mode: 'planning' | 'fast', permission: 'manual' | 'auto', scene: Scene, prompt = 'Bir kule yap') {
  const events: AgentEvent[] = [];
  const ctrl = new AbortController();
  const approvals: string[] = [];
  const orch = new Orchestrator(
    {
      prompt,
      mode,
      permission,
      history: [],
      summary: '',
      web: false,
      sessionId: 's',
      key: () => '',
      project: 'agent-test',
      memory: new Memory({ backend: 'off', url: '', token: '', serviceId: '', userId: '', recallLimit: 3 }),
      settings: {
        selectedModel: 'lan:mock', plannerModel: '', builderModel: '', reviewerModel: '', coderModel: '', exploreModel: '',
        temperature: 0.4, maxSteps: 6, usePlanner: true, useReviewer: true, lanUrl: base, customUrl: '', webResults: 5,
      },
    },
    {
      emit: (e) => events.push(e),
      approve: async (c) => {
        approvals.push(c.name);
        return permission === 'manual' ? c.name !== 'create_many' : true;
      },
      runTool: (c) => executeTool({ scene, project: 'agent-test' }, c),
      sceneSummary: () => summary(scene),
      signal: ctrl.signal,
    },
  );
  return { orch, events, approvals };
}

describe('agent end-to-end', () => {
  it('plans, builds with tools and gets approved', async () => {
    const scene = platformerScene();
    const { orch, events } = makeJob('planning', 'auto', scene);
    const r = await orch.run();
    const roles = events.filter((e) => e.type === 'start').map((e: any) => e.role);
    expect(roles).toEqual(['planner', 'builder', 'builder', 'reviewer']);
    expect(findEntity(scene, 'Tower')).toBeTruthy();
    expect(findEntity(scene, 'Beacon')!.light!.kind).toBe('point');
    expect(events.some((e) => e.type === 'todos')).toBe(true);
    expect(r.answer).toContain('APPROVED');
  });

  it('pushes a model that only announces work into actually doing it', async () => {
    const scene = starterScene();
    const { orch, events } = makeJob('fast', 'auto', scene, 'STALL bir kule yap');
    await orch.run();
    expect(findEntity(scene, 'Tower')).toBeTruthy();
    expect(events.filter((e) => e.type === 'start').length).toBe(3);
  });

  it('asks before changes in manual mode and respects a rejection', async () => {
    const scene = starterScene();
    const { orch, events, approvals } = makeJob('fast', 'manual', scene);
    await orch.run();
    expect(approvals).toEqual(['create_many']);
    expect(findEntity(scene, 'Tower')).toBeUndefined();
    expect(events.some((e) => e.type === 'tool' && e.status === 'rejected')).toBe(true);
    expect(await listFiles('agent-test')).toEqual([]);
  });
});

describe('camera + loop guard', () => {
  it('aims cameras at their target', async () => {
    const scene = platformerScene();
    const r = await executeTool({ scene, project: 'cam-test' }, { name: 'setup_camera', args: { style: 'third_person', target: 'Player' } });
    expect(r.result).toContain('looking at Player');
    const cam = scene.entities.find((e) => e.camera && e.active)!;
    const p = findEntity(scene, 'Player')!.transform.position;
    expect(cam.camera!.follow).toBe('Player');
    expect(cam.transform.position[2]).toBeGreaterThan(p[2]); // behind (+Z), looking toward -Z
    expect(cam.transform.rotation[0]).toBeLessThan(0); // tilted down
    expect(Math.abs(cam.transform.rotation[1])).toBeLessThan(1);
    expect(aimAt([0, 10, 0.01], [0, 0, 0])[0]).toBeLessThan(-80); // top-down looks straight down
  });

  it('detects and trims repeated lines', () => {
    const t = 'Plan ok.\nLet us wait.\n\nLet us wait.\nLet us wait.\nLet us wait.\n';
    expect(isLooping(t)).toBe(true);
    expect(dedupeTail(t)).toBe('Plan ok.\nLet us wait.');
    expect(isLooping('a\nb\nc\nd\n')).toBe(false);
  });
});
