import { Diamond, FilePlus2, Link2, Pause, Play, Save, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import * as anim from '../../core/animation';
import { EntityId, getEntity } from '../../core/scene';
import { readText, writeFile } from '../../core/vfs';
import { useT } from '../../i18n';
import { useEditor } from '../../state/editor';
import { NumField, Row, Select, Sheet, Toggle, Vec3Field, haptic, toast } from '../common/ui';
import { useFiles } from './useFiles';

/** Live preview pose shown in the viewport while the animation editor is open. */
export const useAnimPreview = create<{ id: EntityId | null; pose: anim.Pose | null; set: (id: EntityId | null, pose: anim.Pose | null) => void }>((set) => ({
  id: null,
  pose: null,
  set: (id, pose) => set({ id, pose }),
}));

const PROP_COLORS: Record<anim.Property, string> = { position: '#3B82F6', rotation: '#4CB782', scale: '#F2B233', color: '#E5484D' };

export function AnimationEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const ed = useEditor();
  const sel = getEntity(ed.scene, ed.selected);
  const files = useFiles('Animations');
  const [ref, setRef] = useState('preset:bob');
  const [clip, setClip] = useState<anim.Clip>(anim.preset('bob')!);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [key, setKey] = useState<{ p: anim.Property; i: number } | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const project = ed.project?.id || 'scratch';

  // load the selected entity's clip when opening
  useEffect(() => {
    if (!open) {
      setPlaying(false);
      useAnimPreview.getState().set(null, null);
      return;
    }
    const c = sel?.animator?.clip;
    if (c) load(c);
  }, [open]);

  // preview pose
  useEffect(() => {
    if (!open) return;
    useAnimPreview.getState().set(sel?.id ?? null, anim.sample(clip, time));
  }, [open, clip, time, sel?.id]);

  // playback
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      setTime((tt) => {
        const n = tt + (now - last) / 1000;
        return clip.looping ? n % Math.max(clip.length, 0.01) : Math.min(n, clip.length);
      });
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, clip.length, clip.looping]);

  const load = async (r: string) => {
    setRef(r);
    setKey(null);
    setTime(0);
    if (r.startsWith('preset:')) {
      setClip(anim.preset(r) || anim.newClip());
      return;
    }
    try {
      setClip(anim.parseClip(await readText(project, r)));
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  const edit = (fn: (c: anim.Clip) => void) => {
    const c: anim.Clip = JSON.parse(JSON.stringify(clip));
    fn(c);
    setClip(c);
  };

  const save = async () => {
    const path = await writeFile(project, anim.clipFileName(clip.name), anim.clipJson(clip));
    ed.filesChanged();
    setRef(path);
    toast(`${t('Saved', 'Kaydedildi')}: ${path}`, 'ok');
    return path;
  };

  const assign = async () => {
    if (!sel) return;
    const path = ref.startsWith('preset:') && JSON.stringify(clip) === JSON.stringify(anim.preset(ref)) ? ref : await save();
    ed.updateEntity(sel.id, (x) => void (x.animator = { clip: path, speed: x.animator?.speed ?? 1, play_on_start: true }));
    toast(t('Assigned to', 'Atandı') + ` ${sel.name}`, 'ok');
  };

  const record = (p: anim.Property) => {
    haptic(10);
    const pose = anim.sample(clip, time);
    const v = (p === 'color' ? pose.color ?? [1, 1, 1] : pose[p]) as [number, number, number];
    edit((c) => anim.setKey(c, p, time, [...v] as [number, number, number]));
  };

  const scrub = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    setTime(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * clip.length);
  };

  const keyObj = key ? clip.tracks.find((tr) => tr.property === key.p)?.keys[key.i] : undefined;

  return (
    <Sheet open={open} onClose={onClose} title={t('Animation', 'Animasyon')}>
      <div className="flex gap-2 mb-2">
        <Select
          className="flex-1"
          value={ref}
          options={[
            ...anim.PRESETS.map((p) => ({ v: `preset:${p}`, label: `★ ${p}` })),
            ...files.map((f) => ({ v: f.path, label: f.path.replace(/^Animations\//, '').replace(/\.anim\.json$/, '') })),
          ]}
          onChange={load}
        />
        <button className="btn-ghost px-3" onClick={() => (setRef('new'), setClip(anim.newClip(t('New Clip', 'Yeni Klip'))), setTime(0), setKey(null))} aria-label="new">
          <FilePlus2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <input className="input" value={clip.name} onChange={(e) => edit((c) => void (c.name = e.target.value))} />
        <NumField value={clip.length} step={0.1} label="s" onChange={(v) => edit((c) => void (c.length = Math.max(0.05, v)))} />
      </div>
      <Row label={t('Loop', 'Döngü')}>
        <Toggle value={clip.looping} onChange={(v) => edit((c) => void (c.looping = v))} />
      </Row>

      {/* transport */}
      <div className="flex items-center gap-2 mt-1">
        <button className="w-11 h-11 rounded-xl bg-acc text-white flex items-center justify-center" onClick={() => setPlaying(!playing)}>
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <div className="text-[0.8rem] tabular-nums text-mute w-20">
          {time.toFixed(2)} / {clip.length.toFixed(2)}s
        </div>
        <div className="text-[0.72rem] text-mute flex-1 truncate">{sel ? `${t('Preview on', 'Önizleme')}: ${sel.name}` : t('Select an object to preview', 'Önizlemek için nesne seç')}</div>
      </div>

      {/* timeline */}
      <div
        ref={bar}
        className="relative mt-3 rounded-2xl bg-bg border border-line/70 touch-none"
        onPointerDown={(e) => ((e.target as HTMLElement).setPointerCapture(e.pointerId), setPlaying(false), scrub(e.clientX))}
        onPointerMove={(e) => e.buttons && scrub(e.clientX)}
      >
        {anim.PROPERTIES.map((p) => {
          const tr = clip.tracks.find((x) => x.property === p);
          return (
            <div key={p} className="relative h-10 border-b border-line/40 last:border-0">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[0.65rem] uppercase tracking-wide text-mute pointer-events-none">{p}</span>
              {tr?.keys.map((k, i) => (
                <button
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center"
                  style={{ left: `${(k.t / Math.max(clip.length, 0.01)) * 100}%` }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => (setKey({ p, i }), setTime(k.t), setPlaying(false))}
                >
                  <Diamond className="w-4 h-4" style={{ color: PROP_COLORS[p], fill: key?.p === p && key.i === i ? PROP_COLORS[p] : 'transparent' }} />
                </button>
              ))}
            </div>
          );
        })}
        <div className="absolute top-0 bottom-0 w-0.5 bg-acc pointer-events-none" style={{ left: `${(time / Math.max(clip.length, 0.01)) * 100}%` }} />
      </div>

      <div className="label mt-3 mb-1.5">{t('Add key at the playhead', 'Oynatma kafasına anahtar ekle')}</div>
      <div className="grid grid-cols-4 gap-1.5">
        {anim.PROPERTIES.map((p) => (
          <button key={p} className="h-10 rounded-xl bg-s2 border border-line/60 text-[0.75rem] font-semibold flex items-center justify-center gap-1" onClick={() => record(p)}>
            <Diamond className="w-3.5 h-3.5" style={{ color: PROP_COLORS[p] }} />
            {p}
          </button>
        ))}
      </div>

      {key && keyObj && (
        <div className="card p-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-[0.85rem]">
              {key.p} · {t('key', 'anahtar')}
            </div>
            <button
              className="icon-btn w-9 h-9 text-bad"
              onClick={() => {
                edit((c) => c.tracks.find((tr) => tr.property === key.p)!.keys.splice(key.i, 1));
                setKey(null);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2 items-center">
            <NumField label="t" value={keyObj.t} step={0.05} onChange={(v) => edit((c) => void (c.tracks.find((tr) => tr.property === key.p)!.keys[key.i].t = Math.min(c.length, Math.max(0, v))))} />
            <Vec3Field
              step={key.p === 'rotation' ? 5 : 0.05}
              value={keyObj.v}
              onChange={(v) => edit((c) => void (c.tracks.find((tr) => tr.property === key.p)!.keys[key.i].v = v))}
            />
          </div>
          <div className="text-[0.7rem] text-mute mt-1.5">
            {key.p === 'scale' ? t('Scale is a multiplier (1 = unchanged).', 'Ölçek çarpandır (1 = değişmez).') : key.p === 'color' ? t('Colour multiplies the object colour (RGB 0–1).', 'Renk nesne rengiyle çarpılır (RGB 0–1).') : t('Offset from the object’s own pose.', 'Nesnenin kendi duruşuna göre fark.')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4 pb-2">
        <button className="btn-ghost" onClick={save}>
          <Save className="w-4 h-4" /> {t('Save clip', 'Klibi kaydet')}
        </button>
        <button className="btn-acc" disabled={!sel} onClick={assign}>
          <Link2 className="w-4 h-4" /> {t('Assign to selected', 'Seçiliye ata')}
        </button>
      </div>
    </Sheet>
  );
}
