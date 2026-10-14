import { Crosshair, Focus, Grid3x3, Maximize2, Move, Pause, Play, RotateCw, SkipForward } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import * as anim from '../../../core/animation';
import { audio } from '../../../core/audio';
import { Runtime } from '../../../core/runtime';
import { Entity, EntityId, Scene, getEntity } from '../../../core/scene';
import { listFiles, readBlob, readText } from '../../../core/vfs';
import { useT } from '../../../i18n';
import { useEditor } from '../../../state/editor';
import { useSettings } from '../../../state/settings';
import { palette } from '../../../theme';
import { haptic } from '../../common/ui';
import { Joystick } from './Joystick';
import { useAnimPreview } from '../AnimationEditor';
import { EntityObject, aimSuns, applyTransform, buildSig, createEntityObject, mainCamera, skyTexture, srgb } from './scene3d';

const D2R = Math.PI / 180;

export function Viewport() {
  const t = useT();
  const host = useRef<HTMLDivElement>(null);
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const playing = useEditor((s) => s.playing);
  const selected = useEditor((s) => s.selected);
  const showGrid = useSettings((s) => s.showGrid);
  const showStats = useSettings((s) => s.showStats);
  const [hud, setHud] = useState('');
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState('');
  const api = useRef<{
    focus: () => void;
    runtime: Runtime | null;
    step: () => void;
    setGrid: (v: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const el = host.current!;
    const st = useSettings.getState();
    const renderer = new THREE.WebGLRenderer({ antialias: st.antialias, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * st.renderScale);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';

    const scene3 = new THREE.Scene();
    const world = new THREE.Group();
    scene3.add(world);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene3.add(hemi);
    const cam = new THREE.PerspectiveCamera(55, 1, 0.05, 2000);
    const playCam = new THREE.PerspectiveCamera(60, 1, 0.05, 2000);

    const pal = palette(st.theme);
    let grid = new THREE.GridHelper(40, 40, pal.grid[0], pal.grid[1]);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    scene3.add(grid);

    // ---- orbit camera state
    const orbit = { target: new THREE.Vector3(0, 1, 0), dist: 16, yaw: 0.6, pitch: 0.55 };
    const placeCam = () => {
      const { target, dist, yaw, pitch } = orbit;
      cam.position.set(target.x + dist * Math.cos(pitch) * Math.sin(yaw), target.y + dist * Math.sin(pitch), target.z + dist * Math.cos(pitch) * Math.cos(yaw));
      cam.lookAt(target);
    };
    placeCam();

    // ---- gizmo
    const gizmo = new TransformControls(cam, renderer.domElement);
    gizmo.setSize(1.15 * st.gizmoSize);
    scene3.add(gizmo);
    let gizmoDragging = false;
    gizmo.addEventListener('dragging-changed', (e: any) => {
      gizmoDragging = e.value;
      if (!e.value) commitGizmo();
      else haptic(6);
    });
    gizmo.addEventListener('objectChange', () => (dirty = true));

    // ---- sync
    const objs = new Map<EntityId, EntityObject>();
    let dirty = true;
    let sceneRef: Scene | null = null;
    let skyKey = '';
    const invalidate = () => (dirty = true);

    const sync = (s: Scene, editing: boolean) => {
      const stg = useSettings.getState();
      const project = useEditor.getState().project?.id || 'scratch';
      const opts = { icons: editing && stg.showIcons, shadows: stg.shadows };
      const seen = new Set<EntityId>();
      for (const e of s.entities) {
        seen.add(e.id);
        let o = objs.get(e.id);
        const sig = buildSig(e, opts);
        if (o && o.sig !== sig) {
          o.group.parent?.remove(o.group);
          objs.delete(e.id);
          o = undefined;
        }
        if (!o) {
          o = createEntityObject(e, project, opts, invalidate);
          objs.set(e.id, o);
        }
        applyTransform(o.group, e);
        o.group.visible = e.active;
        if (!editing && o.material && 'color' in o.material) (o.material as THREE.MeshStandardMaterial).color.copy(srgb(e.color));
      }
      for (const [id, o] of objs) {
        if (!seen.has(id)) {
          o.group.parent?.remove(o.group);
          objs.delete(id);
        }
      }
      // parenting
      for (const e of s.entities) {
        const o = objs.get(e.id)!;
        const parent = e.parent != null ? objs.get(e.parent)?.group : world;
        const want = parent || world;
        if (o.group.parent !== want) want.add(o.group);
      }
      const env = s.environment;
      const k = JSON.stringify([env.sky_top, env.sky_bottom]);
      if (k !== skyKey) {
        skyKey = k;
        scene3.background = skyTexture(env.sky_top, env.sky_bottom);
        scene3.fog = new THREE.Fog(srgb(env.sky_bottom), env.fog_start, env.fog_end);
      }
      hemi.color.copy(srgb(env.sky_top));
      hemi.groundColor.copy(srgb(env.sky_bottom));
      hemi.intensity = env.ambient * 2.4;
      renderer.toneMappingExposure = env.exposure;
      renderer.shadowMap.enabled = stg.shadows && env.shadows;
      sceneRef = s;
      dirty = true;
    };

    const attachGizmo = () => {
      const { selected: sel, playing: pl } = useEditor.getState();
      const o = sel != null ? objs.get(sel) : undefined;
      if (o && !pl) {
        gizmo.attach(o.group);
        gizmo.visible = true;
      } else {
        gizmo.detach();
      }
      dirty = true;
    };

    const commitGizmo = () => {
      const obj = gizmo.object;
      const id = obj?.userData.entityId as EntityId | undefined;
      if (obj == null || id == null) return;
      const r = (v: number) => Math.round(v * 1000) / 1000;
      const snap = useSettings.getState().snap;
      useEditor.getState().updateEntity(id, (e) => {
        e.transform.position = [r(obj.position.x), r(obj.position.y), r(obj.position.z)];
        e.transform.rotation = [r(obj.rotation.x / D2R), r(obj.rotation.y / D2R), r(obj.rotation.z / D2R)];
        e.transform.scale = [r(obj.scale.x), r(obj.scale.y), r(obj.scale.z)];
      });
      if (snap) haptic(4);
    };

    const applyToolSettings = () => {
      const s2 = useSettings.getState();
      const mode = useEditor.getState().tool;
      gizmo.setMode(mode === 'move' ? 'translate' : mode === 'rotate' ? 'rotate' : 'scale');
      gizmo.setTranslationSnap(s2.snap ? s2.snapStep : null);
      gizmo.setRotationSnap(s2.snap ? 15 * D2R : null);
      gizmo.setScaleSnap(s2.snap ? 0.1 : null);
      gizmo.setSize(1.15 * s2.gizmoSize);
      dirty = true;
    };

    // ---- play mode
    let runtime: Runtime | null = null;
    let lastT = performance.now();
    let lastHud = '';

    const startPlay = async () => {
      const ed = useEditor.getState();
      const project = ed.project?.id || 'scratch';
      const clips = new Map<string, anim.Clip>();
      for (const f of await listFiles(project, 'Animations').catch(() => [])) {
        try {
          clips.set(f.path, anim.parseClip(await readText(project, f.path)));
        } catch {
          /* skip broken clip */
        }
      }
      runtime = new Runtime(ed.scene, (p) => clips.get(p) || null);
      for (const l of runtime.takeLogs()) ed.log(l, 'error');
      api.current!.runtime = runtime;
      gizmo.detach();
      sync(runtime.scene, false);
      lastT = performance.now();
      setPaused(false);
    };

    const stopPlay = () => {
      runtime = null;
      if (api.current) api.current.runtime = null;
      audio.stopAll();
      setHud('');
      lastHud = '';
      sync(useEditor.getState().scene, true);
      attachGizmo();
    };

    const playSounds = async (rt: Runtime) => {
      const project = useEditor.getState().project?.id || 'scratch';
      for (const s of rt.takeSounds()) {
        const buf = await audio.decode(`${project}:${s.path}`, async () => {
          const b = await readBlob(project, s.path).catch(() => null);
          return b ? b.arrayBuffer() : null;
        });
        if (buf) audio.playBuffer(buf, s.volume, s.loopOwner);
        else useEditor.getState().log(`sound not found: ${s.path}`, 'warn');
      }
    };

    // ---- input: orbit / pan / pinch / tap-select
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>();
    let pinch = 0;
    let lastTap = 0;
    const ray = new THREE.Raycaster();
    const pick = (cx: number, cy: number): EntityId | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, runtime ? playCam : cam);
      const hits = ray.intersectObjects(world.children, true).filter((h) => h.object.visible && (h.object as any).userData.entityId != null);
      for (const h of hits) {
        if ((h.object as any).isLine) continue;
        return h.object.userData.entityId as EntityId;
      }
      return null;
    };

    const onDown = (e: PointerEvent) => {
      if (gizmo.dragging || (gizmo as any).axis) return;
      renderer.domElement.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p || gizmoDragging || runtime) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      const speed = useSettings.getState().cameraSpeed;
      if (pointers.size === 1 && e.pointerType !== 'mouse' ? true : pointers.size === 1 && e.buttons === 1) {
        orbit.yaw -= dx * 0.008 * speed;
        orbit.pitch = Math.min(1.5, Math.max(-0.2, orbit.pitch + dy * 0.008 * speed));
      } else if (pointers.size >= 2 || e.buttons === 2 || e.buttons === 4) {
        if (pointers.size >= 2) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch > 0) orbit.dist = Math.min(400, Math.max(1.5, orbit.dist * (pinch / Math.max(d, 1))));
          pinch = d;
        }
        const k = (orbit.dist * 0.0016 * speed) / Math.max(1, pointers.size >= 2 ? 2 : 1);
        const right = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1);
        orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      }
      placeCam();
      dirty = true;
    };
    const onUp = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (!p || gizmoDragging) return;
      const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
      const quick = performance.now() - p.t < 350;
      if (moved < 8 && quick && pointers.size === 0 && !runtime) {
        const now = performance.now();
        const id = pick(e.clientX, e.clientY);
        if (now - lastTap < 300 && id != null) {
          useEditor.getState().select(id);
          focusSel();
        } else {
          useEditor.getState().select(id);
        }
        lastTap = now;
        haptic(5);
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.dist = Math.min(400, Math.max(1.5, orbit.dist * (1 + Math.sign(e.deltaY) * 0.1)));
      placeCam();
      dirty = true;
    };
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());

    const keyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (runtime) {
        runtime.keyDown(e.key === ' ' ? 'SPACE' : e.key);
        e.preventDefault();
      } else if (e.key === 'w') useEditor.getState().setTool('move');
      else if (e.key === 'e') useEditor.getState().setTool('rotate');
      else if (e.key === 'r') useEditor.getState().setTool('scale');
      else if (e.key === 'f') focusSel();
    };
    const keyUp = (e: KeyboardEvent) => runtime?.keyUp(e.key === ' ' ? 'SPACE' : e.key);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    const focusSel = () => {
      const ed = useEditor.getState();
      const o = ed.selected != null ? objs.get(ed.selected) : undefined;
      if (o) {
        const box = new THREE.Box3().setFromObject(o.group);
        const c = box.isEmpty() ? o.group.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
        const size = box.isEmpty() ? 2 : box.getSize(new THREE.Vector3()).length();
        orbit.target.copy(c);
        orbit.dist = Math.max(3, size * 1.8);
      } else {
        orbit.target.set(0, 1, 0);
        orbit.dist = 16;
      }
      placeCam();
      dirty = true;
    };

    // ---- resize
    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      cam.aspect = playCam.aspect = w / h;
      cam.updateProjectionMatrix();
      playCam.updateProjectionMatrix();
      dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // ---- frame loop
    let raf = 0;
    let frames = 0;
    let fpsT = performance.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = (now - lastT) / 1000;
      lastT = now;
      if (runtime) {
        if (!runtime.paused) {
          runtime.step(dt);
          sync(runtime.scene, false);
          playSounds(runtime);
          const logs = runtime.takeLogs();
          if (logs.length) logs.forEach((l) => useEditor.getState().log(l, /error|not/.test(l) ? 'error' : 'info'));
        }
        if (runtime.hud !== lastHud) {
          lastHud = runtime.hud;
          setHud(runtime.hud);
        }
        const mc = mainCamera(runtime.scene);
        if (mc) {
          const o = objs.get(mc.id);
          if (o) {
            o.group.updateWorldMatrix(true, false);
            o.group.getWorldPosition(playCam.position);
            o.group.getWorldQuaternion(playCam.quaternion);
          }
          if (playCam.fov !== mc.camera!.fov) {
            playCam.fov = mc.camera!.fov;
            playCam.updateProjectionMatrix();
          }
        } else {
          playCam.position.copy(cam.position);
          playCam.quaternion.copy(cam.quaternion);
        }
        const p = runtime.scene.entities.find((e) => e.rigidbody && !e.rigidbody.is_static);
        aimSuns(world, p ? new THREE.Vector3(...p.transform.position) : playCam.position);
        grid.visible = false;
        renderer.render(scene3, playCam);
      } else if (dirty) {
        dirty = false;
        aimSuns(world, orbit.target);
        grid.visible = useSettings.getState().showGrid;
        renderer.render(scene3, cam);
      } else {
        frames--;
      }
      frames++;
      if (now - fpsT > 1000) {
        if (useSettings.getState().showStats) {
          const info = renderer.info.render;
          setStats(`${runtime ? Math.round((frames * 1000) / (now - fpsT)) + ' fps · ' : ''}${info.calls} draws · ${Math.round(info.triangles / 100) / 10}k tris`);
        }
        frames = 0;
        fpsT = now;
      }
    };
    frame();

    // ---- subscriptions
    sync(useEditor.getState().scene, true);
    attachGizmo();
    applyToolSettings();
    const unsubEd = useEditor.subscribe((s, prev) => {
      if (s.playing !== prev.playing) {
        if (s.playing) startPlay();
        else stopPlay();
        return;
      }
      if (!runtime && s.scene !== prev.scene) {
        sync(s.scene, true);
        attachGizmo();
      }
      if (s.selected !== prev.selected) attachGizmo();
      if (s.tool !== prev.tool) applyToolSettings();
      if (s.filesRev !== prev.filesRev && !runtime) {
        // assets changed: rebuild everything that references files
        for (const o of objs.values()) o.group.parent?.remove(o.group);
        objs.clear();
        sync(s.scene, true);
        attachGizmo();
      }
    });
    const unsubSet = useSettings.subscribe((s, prev) => {
      if (s.theme !== prev.theme) {
        const p = palette(s.theme);
        scene3.remove(grid);
        grid = new THREE.GridHelper(40, 40, p.grid[0], p.grid[1]);
        (grid.material as THREE.Material).transparent = true;
        (grid.material as THREE.Material).opacity = 0.6;
        scene3.add(grid);
      }
      if (s.renderScale !== prev.renderScale) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * s.renderScale);
        resize();
      }
      if (s.shadows !== prev.shadows || s.showIcons !== prev.showIcons) {
        if (!runtime) sync(useEditor.getState().scene, true);
      }
      applyToolSettings();
      dirty = true;
    });

    const unsubPrev = useAnimPreview.subscribe((p, prev) => {
      if (runtime) return;
      const sc = useEditor.getState().scene;
      if (prev.id != null) {
        const e = getEntity(sc, prev.id);
        const o = objs.get(prev.id);
        if (e && o) applyTransform(o.group, e);
      }
      if (p.id != null && p.pose) {
        const e = getEntity(sc, p.id);
        const o = objs.get(p.id);
        if (e && o) {
          applyTransform(o.group, e);
          const ps = p.pose;
          o.group.position.add(new THREE.Vector3(...ps.position));
          o.group.rotation.set(
            o.group.rotation.x + ps.rotation[0] * D2R,
            o.group.rotation.y + ps.rotation[1] * D2R,
            o.group.rotation.z + ps.rotation[2] * D2R,
          );
          o.group.scale.multiply(new THREE.Vector3(...ps.scale));
        }
      }
      dirty = true;
    });

    api.current = {
      focus: focusSel,
      runtime: null,
      step: () => {
        if (runtime) {
          runtime.paused = false;
          runtime.step(1 / 60);
          runtime.paused = true;
          sync(runtime.scene, false);
        }
      },
      setGrid: () => (dirty = true),
    };
    if (useEditor.getState().playing) startPlay();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsubEd();
      unsubSet();
      unsubPrev();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      gizmo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.removeChild(renderer.domElement);
      audio.stopAll();
    };
  }, []);

  const press = (k: string, down: boolean) => {
    const rt = api.current?.runtime;
    if (!rt) return;
    if (down) rt.keyDown(k);
    else rt.keyUp(k);
  };

  const sel = useEditor((s) => (s.selected != null ? getEntity(s.scene, s.selected) : undefined));

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={host} className="absolute inset-0" />

      {!playing && (
        <>
          <div className="absolute top-3 left-3 flex flex-col gap-1 p-1 rounded-2xl bg-s1/85 backdrop-blur border border-line/60 shadow-lift">
            {(
              [
                ['move', <Move key="m" className="w-[1.15rem] h-[1.15rem]" />],
                ['rotate', <RotateCw key="r" className="w-[1.15rem] h-[1.15rem]" />],
                ['scale', <Maximize2 key="s" className="w-[1.15rem] h-[1.15rem]" />],
              ] as const
            ).map(([id, icon]) => (
              <button
                key={id}
                onClick={() => (haptic(), setTool(id))}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition ${tool === id ? 'bg-acc text-white' : 'text-mute active:bg-s2'}`}
                aria-label={id}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="absolute top-3 right-3 flex flex-col gap-1 p-1 rounded-2xl bg-s1/85 backdrop-blur border border-line/60 shadow-lift">
            <button className="w-11 h-11 rounded-xl flex items-center justify-center text-mute active:bg-s2" onClick={() => api.current?.focus()} aria-label="focus">
              {sel ? <Focus className="w-[1.15rem] h-[1.15rem]" /> : <Crosshair className="w-[1.15rem] h-[1.15rem]" />}
            </button>
            <button
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${showGrid ? 'text-acc' : 'text-mute'} active:bg-s2`}
              onClick={() => useSettings.getState().update({ showGrid: !showGrid })}
              aria-label="grid"
            >
              <Grid3x3 className="w-[1.15rem] h-[1.15rem]" />
            </button>
          </div>
          {sel && (
            <button
              className="absolute bottom-3 left-3 max-w-[60%] flex items-center gap-2 h-10 px-3.5 rounded-full bg-s1/90 backdrop-blur border border-line/60 shadow-lift text-[0.82rem]"
              onClick={() => useEditor.getState().setTab('inspector')}
            >
              <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
              <span className="font-semibold truncate">{sel.name}</span>
              <span className="text-mute text-[0.7rem] uppercase">{t({ move: 'Move', rotate: 'Rotate', scale: 'Scale' }[tool], { move: 'Taşı', rotate: 'Döndür', scale: 'Ölçek' }[tool])}</span>
            </button>
          )}
        </>
      )}

      {showStats && stats && <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[0.65rem] text-mute bg-s1/70 px-2 py-0.5 rounded-full">{stats}</div>}

      {playing && (
        <>
          {hud && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 max-w-[80%] text-center px-4 py-2 rounded-2xl bg-black/45 text-white font-bold text-[0.95rem] backdrop-blur">
              {hud}
            </div>
          )}
          <div className="absolute top-3 right-3 flex gap-1">
            <button
              className="w-11 h-11 rounded-xl bg-black/40 text-white flex items-center justify-center"
              onClick={() => {
                const rt = api.current?.runtime;
                if (rt) {
                  rt.paused = !rt.paused;
                  setPaused(rt.paused);
                }
              }}
            >
              {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            {paused && (
              <button className="w-11 h-11 rounded-xl bg-black/40 text-white flex items-center justify-center" onClick={() => api.current?.step()}>
                <SkipForward className="w-5 h-5" />
              </button>
            )}
          </div>
          <Joystick onKeys={press} />
        </>
      )}
    </div>
  );
}

export type { Entity };
