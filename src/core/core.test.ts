import { describe, expect, it } from 'vitest';
import { checkScript, rhaiToJs } from './rhai';
import { Runtime } from './runtime';
import { COIN_SCRIPT, PLAYER_SCRIPT, SCRIPT_TEMPLATES, findEntity, normalizeScene, platformerScene, starterScene, summary } from './scene';
import * as anim from './animation';
import { encodeWav, synth, wavDuration, PRESETS } from './audio';

describe('rhai → js', () => {
  it('translates control flow and fn', () => {
    const js = rhaiToJs('fn update(dt) { if key("A") || key("LEFT") { this.x -= 1.0 * dt; } else if a > 1 { b(); } }');
    expect(js).toContain('function update(dt)');
    expect(js).toContain('if (key("A") || key("LEFT"))');
    expect(js).toContain('else if (a > 1)');
  });
  it('translates for ranges, loop and maps', () => {
    const js = rhaiToJs('fn start() { for i in 0..3 { log(i); } let m = #{a: 1}; for x in [1,2] { log(x); } }');
    expect(js).toContain('for (let i = 0; i < 3; i++)');
    expect(js).toContain('let m = {a: 1}');
    expect(js).toContain('for (const x of [1,2])');
  });
  it('leaves strings and comments alone', () => {
    const js = rhaiToJs('fn start() { log("if x { fn }"); // if y {\n}');
    expect(js).toContain('"if x { fn }"');
    expect(js).toContain('// if y {');
  });
  it('compiles every built-in template', () => {
    for (const [name, code] of SCRIPT_TEMPLATES) expect(checkScript(code), name).toBeNull();
    expect(checkScript(PLAYER_SCRIPT)).toBeNull();
    expect(checkScript('fn update(dt) { if { }')).not.toBeNull();
  });
});

describe('runtime', () => {
  it('runs the platformer: gravity, ground, coins, hud', () => {
    const rt = new Runtime(platformerScene());
    expect(rt.errors).toEqual([]);
    for (let i = 0; i < 90; i++) rt.step(1 / 30);
    const p = findEntity(rt.scene, 'Player')!;
    expect(p.transform.position[1]).toBeGreaterThan(0.5);
    expect(p.transform.position[1]).toBeLessThan(1.2);
    expect(rt.hud).toContain('Coins: 0');
    // walk right: D key
    rt.keyDown('D');
    for (let i = 0; i < 30; i++) rt.step(1 / 30);
    expect(findEntity(rt.scene, 'Player')!.transform.position[0]).toBeGreaterThan(2);
    rt.keyUp('D');
    // coin script spins
    const coin = findEntity(rt.scene, 'Coin 1')!;
    expect(coin.transform.rotation[1]).not.toBe(0);
  });
  it('collects a coin by touching it', () => {
    const s = platformerScene();
    const p = findEntity(s, 'Player')!;
    const c = findEntity(s, 'Coin 1')!;
    c.script = '';
    c.transform.position = [p.transform.position[0], 1, p.transform.position[2]];
    const rt = new Runtime(s);
    for (let i = 0; i < 5; i++) rt.step(1 / 30);
    expect(findEntity(rt.scene, 'Coin 1')).toBeUndefined();
    expect(rt.hud).toContain('Coins: 1');
  });
  it('plays animator presets and sounds', () => {
    const s = starterScene();
    const cube = findEntity(s, 'Cube')!;
    cube.animator = { clip: 'preset:spin', speed: 1, play_on_start: true };
    cube.script = 'fn start() { play_sound("Audio/coin.wav", 0.5); }';
    const rt = new Runtime(s);
    for (let i = 0; i < 10; i++) rt.step(1 / 30);
    expect(findEntity(rt.scene, 'Cube')!.transform.rotation[1]).toBeGreaterThan(10);
    expect(rt.takeSounds()).toEqual([{ path: 'Audio/coin.wav', volume: 0.5 }]);
  });
  it('reports script errors without crashing', () => {
    const s = starterScene();
    findEntity(s, 'Cube')!.script = 'fn update(dt) { nope(); }';
    const rt = new Runtime(s);
    rt.step(0.016);
    rt.step(0.016);
    expect(rt.takeLogs().join()).toContain('nope');
  });
});

describe('scene + assets', () => {
  it('round-trips desktop-style JSON', () => {
    const s = platformerScene();
    const back = normalizeScene(JSON.parse(JSON.stringify(s)));
    expect(back.entities.length).toBe(s.entities.length);
    expect(summary(back)).toContain('"Player"');
    expect(back.next_id).toBeGreaterThan(Math.max(...s.entities.map((e) => e.id)));
    expect(COIN_SCRIPT).toContain('sin');
  });
  it('samples animation presets', () => {
    for (const p of anim.PRESETS) expect(anim.preset(p), p).not.toBeNull();
    const spin = anim.preset('spin')!;
    expect(anim.sample(spin, 1).rotation[1]).toBeCloseTo(180);
    expect(anim.sample(anim.preset('door')!, 5).rotation[1]).toBeCloseTo(-100);
  });
  it('synthesizes every preset into a valid wav', () => {
    for (const p of PRESETS) {
      const s = synth(p, 42);
      expect(s.length).toBeGreaterThan(100);
      const w = encodeWav(s);
      expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF');
      expect(wavDuration(w)).toBeCloseTo(s.length / 44100, 3);
    }
  });
});
