import { Code2, Copy, ImagePlus, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import * as anim from '../../core/animation';
import { audio } from '../../core/audio';
import {
  Entity, LAYERS, MESH_KINDS, defaultAnimator, defaultAudio, defaultCamera, defaultLight, defaultRigidbody, getEntity, meshLabel, pointLight,
} from '../../core/scene';
import { readBlob } from '../../core/vfs';
import { useT } from '../../i18n';
import { useEditor } from '../../state/editor';
import { ColorField, Confirm, Empty, NumField, Row, Section, Segmented, Select, Sheet, Slider, Toggle, Vec3Field, haptic, pickFiles, toast } from '../common/ui';
import { importFiles } from './assets/actions';
import { useFiles } from './useFiles';

export function Inspector() {
  const t = useT();
  const ed = useEditor();
  const e = getEntity(ed.scene, ed.selected);
  const [addOpen, setAddOpen] = useState(false);
  const [del, setDel] = useState(false);
  const models = useFiles('Models').filter((f) => /\.(gltf|glb)$/i.test(f.path));
  const textures = useFiles('Textures');
  const sounds = useFiles('Audio');
  const clips = useFiles('Animations');

  if (!e) {
    return (
      <Empty
        title={t('Nothing selected', 'Seçili nesne yok')}
        body={t('Tap an object in the scene or in Objects to inspect it.', 'İncelemek için sahnede ya da Nesneler’de bir nesneye dokun.')}
      />
    );
  }
  const up = (fn: (x: Entity) => void) => ed.updateEntity(e.id, fn);
  const remove = (k: 'rigidbody' | 'light' | 'camera' | 'audio' | 'animator') => (
    <button className="icon-btn w-9 h-9" onClick={() => up((x) => void ((x as any)[k] = null))} aria-label="remove">
      <X className="w-4 h-4" />
    </button>
  );
  const project = ed.project?.id || 'scratch';

  return (
    <div className="h-full overflow-y-auto p-3 pb-24">
      <div className="card p-3 mb-3">
        <div className="flex items-center gap-2">
          <Toggle value={e.active} onChange={(v) => up((x) => void (x.active = v))} />
          <input className="input flex-1 font-semibold" value={e.name} onChange={(ev) => up((x) => void (x.name = ev.target.value))} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input className="input" placeholder="Tag" value={e.tag} onChange={(ev) => up((x) => void (x.tag = ev.target.value))} />
          <Select value={e.layer} options={LAYERS.map((l) => ({ v: l, label: l }))} onChange={(v) => up((x) => void (x.layer = v))} />
        </div>
      </div>

      <Section title={t('Transform', 'Dönüşüm')}>
        <div className="label mb-1">{t('Position', 'Konum')}</div>
        <Vec3Field value={e.transform.position} onChange={(v) => up((x) => void (x.transform.position = v))} />
        <div className="label mb-1 mt-3">{t('Rotation (°)', 'Döndürme (°)')}</div>
        <Vec3Field step={5} value={e.transform.rotation} onChange={(v) => up((x) => void (x.transform.rotation = v))} />
        <div className="label mb-1 mt-3">{t('Scale', 'Ölçek')}</div>
        <Vec3Field value={e.transform.scale} onChange={(v) => up((x) => void (x.transform.scale = v))} />
      </Section>

      <Section title={e.mesh === 'model' ? t('Model', 'Model') : t('Mesh & material', 'Mesh ve malzeme')}>
        <Row label={t('Shape', 'Şekil')}>
          <Select
            className="w-40"
            value={e.mesh}
            options={[...MESH_KINDS.map((m) => ({ v: m, label: meshLabel(m) })), { v: 'model' as const, label: 'Model (glTF)' }]}
            onChange={(v) => up((x) => void (x.mesh = v))}
          />
        </Row>
        {e.mesh === 'model' && (
          <Row label={t('Model file', 'Model dosyası')}>
            <Select
              className="w-48"
              value={e.model}
              options={[{ v: '', label: '—' }, ...models.map((m) => ({ v: m.path, label: m.path.replace(/^Models\//, '') }))]}
              onChange={(v) => up((x) => void (x.model = v))}
            />
          </Row>
        )}
        {e.mesh !== 'none' && e.mesh !== 'model' && (
          <>
            <Row label={t('Colour', 'Renk')}>
              <ColorField value={e.color} onChange={(c) => up((x) => void (x.color = c))} />
            </Row>
            <Row label={t('Texture', 'Doku')}>
              <div className="flex items-center gap-1.5">
                <Select
                  className="w-40"
                  value={e.material.texture}
                  options={[{ v: '', label: t('None', 'Yok') }, ...textures.map((f) => ({ v: f.path, label: f.path.replace(/^Textures\//, '') }))]}
                  onChange={(v) => up((x) => void ((x.material.texture = v), v && (x.color = [1, 1, 1])))}
                />
                <button
                  className="icon-btn w-10 h-10 bg-s2 shrink-0"
                  aria-label="upload texture"
                  onClick={async () => {
                    const [f] = await pickFiles('image/*', false);
                    if (!f) return;
                    try {
                      const name = /\.(png|jpe?g|webp)$/i.test(f.name) ? f.name : `${f.name || 'texture'}.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`;
                      const [path] = await importFiles([new File([f], name, { type: f.type })]);
                      up((x) => void ((x.material.texture = path), (x.color = [1, 1, 1]), x.material.tiling < 1 && (x.material.tiling = 1)));
                      toast(t('Texture applied', 'Doku uygulandı'), 'ok');
                    } catch (err) {
                      toast((err as Error).message, 'err');
                    }
                  }}
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
              </div>
            </Row>
            {e.material.texture && (
              <Row label={t('Tiling', 'Döşeme')}>
                <Slider value={e.material.tiling} min={0.25} max={20} step={0.25} onChange={(v) => up((x) => void (x.material.tiling = v))} />
              </Row>
            )}
            <Row label={t('Pattern', 'Desen')}>
              <Segmented
                small
                value={e.material.pattern}
                onChange={(v) => up((x) => void (x.material.pattern = v))}
                options={[{ v: 'none', label: t('None', 'Yok') }, { v: 'checker', label: t('Checker', 'Dama') }, { v: 'grid', label: t('Grid', 'Izgara') }]}
              />
            </Row>
            <Row label={t('Metallic', 'Metalik')}>
              <Slider value={e.material.metallic} min={0} max={1} onChange={(v) => up((x) => void (x.material.metallic = v))} />
            </Row>
            <Row label={t('Roughness', 'Pürüzlülük')}>
              <Slider value={e.material.roughness} min={0} max={1} onChange={(v) => up((x) => void (x.material.roughness = v))} />
            </Row>
            <Row label={t('Glow', 'Işıma')}>
              <div className="flex items-center gap-2">
                <ColorField value={e.material.emission} onChange={(c) => up((x) => void (x.material.emission = c))} />
              </div>
            </Row>
            <Row label={t('Glow strength', 'Işıma gücü')}>
              <Slider value={e.material.emission_strength} min={0} max={5} step={0.1} onChange={(v) => up((x) => void (x.material.emission_strength = v))} />
            </Row>
            <Row label={t('Unlit', 'Işıksız')}>
              <Toggle value={e.material.unlit} onChange={(v) => up((x) => void (x.material.unlit = v))} />
            </Row>
          </>
        )}
      </Section>

      {e.mesh !== 'none' && (
        <Section title={t('Collider', 'Çarpıştırıcı')} defaultOpen={false}>
          <Row label={t('Solid', 'Katı')}>
            <Toggle value={e.collider} onChange={(v) => up((x) => void (x.collider = v))} />
          </Row>
          <Row label={t('Trigger (overlap only)', 'Tetikleyici (sadece temas)')}>
            <Toggle value={e.trigger} onChange={(v) => up((x) => void (x.trigger = v))} />
          </Row>
          <Row label={t('Static', 'Statik')}>
            <Toggle value={e.is_static} onChange={(v) => up((x) => void (x.is_static = v))} />
          </Row>
        </Section>
      )}

      {e.rigidbody && (
        <Section title="Rigidbody" right={remove('rigidbody')}>
          <Row label={t('Mass', 'Kütle')}>
            <NumField className="w-28" value={e.rigidbody.mass} onChange={(v) => up((x) => void (x.rigidbody!.mass = v))} />
          </Row>
          <Row label={t('Use gravity', 'Yerçekimi')}>
            <Toggle value={e.rigidbody.use_gravity} onChange={(v) => up((x) => void (x.rigidbody!.use_gravity = v))} />
          </Row>
          <Row label={t('Static / kinematic', 'Statik / kinematik')}>
            <Toggle value={e.rigidbody.is_static} onChange={(v) => up((x) => void (x.rigidbody!.is_static = v))} />
          </Row>
          <Row label={t('Bounciness', 'Sekme')}>
            <Slider value={e.rigidbody.bounciness} min={0} max={1} onChange={(v) => up((x) => void (x.rigidbody!.bounciness = v))} />
          </Row>
        </Section>
      )}

      {e.light && (
        <Section title={t('Light', 'Işık')} right={remove('light')}>
          <Row label={t('Type', 'Tür')}>
            <Segmented
              small
              value={e.light.kind}
              onChange={(v) => up((x) => void (x.light = v === 'point' ? { ...pointLight(), color: x.light!.color } : { ...defaultLight(), color: x.light!.color }))}
              options={[{ v: 'directional', label: t('Sun', 'Güneş') }, { v: 'point', label: t('Point', 'Nokta') }]}
            />
          </Row>
          <Row label={t('Colour', 'Renk')}>
            <ColorField value={e.light.color} onChange={(c) => up((x) => void (x.light!.color = c))} />
          </Row>
          <Row label={t('Intensity', 'Yoğunluk')}>
            <Slider value={e.light.intensity} min={0} max={8} step={0.1} onChange={(v) => up((x) => void (x.light!.intensity = v))} />
          </Row>
          {e.light.kind === 'point' ? (
            <Row label={t('Range', 'Menzil')}>
              <Slider value={e.light.range} min={1} max={50} step={0.5} onChange={(v) => up((x) => void (x.light!.range = v))} />
            </Row>
          ) : (
            <Row label={t('Shadows', 'Gölgeler')}>
              <Toggle value={e.light.shadows} onChange={(v) => up((x) => void (x.light!.shadows = v))} />
            </Row>
          )}
        </Section>
      )}

      {e.camera && (
        <Section title={t('Camera', 'Kamera')} right={remove('camera')}>
          <Row label="FOV">
            <Slider value={e.camera.fov} min={20} max={110} step={1} onChange={(v) => up((x) => void (x.camera!.fov = v))} format={(v) => `${v}°`} />
          </Row>
          <Row label={t('Follow', 'Takip et')} hint={t('Keeps its offset to this object in play', 'Oyunda bu nesneye olan mesafesini korur')}>
            <Select
              className="w-40"
              value={e.camera.follow}
              options={[{ v: '', label: '—' }, ...ed.scene.entities.filter((x) => x.id !== e.id).map((x) => ({ v: x.name, label: x.name }))]}
              onChange={(v) => up((x) => void (x.camera!.follow = v))}
            />
          </Row>
        </Section>
      )}

      {e.audio && (
        <Section title={t('Audio source', 'Ses kaynağı')} right={remove('audio')}>
          <Row label={t('Clip', 'Klip')}>
            <div className="flex items-center gap-1">
              <Select
                className="w-40"
                value={e.audio.clip}
                options={[{ v: '', label: '—' }, ...sounds.map((f) => ({ v: f.path, label: f.path.replace(/^Audio\//, '') }))]}
                onChange={(v) => up((x) => void (x.audio!.clip = v))}
              />
              <button
                className="icon-btn w-10 h-10"
                disabled={!e.audio.clip}
                onClick={async () => {
                  const b = await audio.decode(`${project}:${e.audio!.clip}`, async () => (await readBlob(project, e.audio!.clip))?.arrayBuffer() ?? null);
                  if (b) audio.playBuffer(b, e.audio!.volume);
                }}
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          </Row>
          <Row label={t('Volume', 'Ses düzeyi')}>
            <Slider value={e.audio.volume} min={0} max={2} step={0.05} onChange={(v) => up((x) => void (x.audio!.volume = v))} />
          </Row>
          <Row label={t('Loop', 'Döngü')}>
            <Toggle value={e.audio.looping} onChange={(v) => up((x) => void (x.audio!.looping = v))} />
          </Row>
          <Row label={t('Play on start', 'Başlangıçta çal')}>
            <Toggle value={e.audio.play_on_start} onChange={(v) => up((x) => void (x.audio!.play_on_start = v))} />
          </Row>
        </Section>
      )}

      {e.animator && (
        <Section title={t('Animator', 'Animatör')} right={remove('animator')}>
          <Row label={t('Clip', 'Klip')}>
            <Select
              className="w-44"
              value={e.animator.clip}
              options={[
                ...anim.PRESETS.map((p) => ({ v: `preset:${p}`, label: `★ ${p}` })),
                ...clips.map((f) => ({ v: f.path, label: f.path.replace(/^Animations\//, '').replace(/\.anim\.json$/, '') })),
              ]}
              onChange={(v) => up((x) => void (x.animator!.clip = v))}
            />
          </Row>
          <Row label={t('Speed', 'Hız')}>
            <Slider value={e.animator.speed} min={0.1} max={4} step={0.1} onChange={(v) => up((x) => void (x.animator!.speed = v))} format={(v) => `${v.toFixed(1)}×`} />
          </Row>
          <Row label={t('Play on start', 'Başlangıçta oynat')}>
            <Toggle value={e.animator.play_on_start} onChange={(v) => up((x) => void (x.animator!.play_on_start = v))} />
          </Row>
          <button className="btn-ghost w-full mt-1" onClick={() => ed.openSheet('animation')}>
            <Pencil className="w-4 h-4" /> {t('Edit clip', 'Klibi düzenle')}
          </button>
        </Section>
      )}

      <Section title={t('Script', 'Betik')} right={e.script ? <span className="text-[0.72rem] text-gold mr-2">{e.script.split('\n').length} {t('lines', 'satır')}</span> : undefined}>
        {e.script ? (
          <pre className="text-[0.7rem] font-mono bg-bg rounded-xl p-2 max-h-28 overflow-hidden text-mute whitespace-pre-wrap">{e.script.slice(0, 400)}</pre>
        ) : (
          <div className="text-[0.8rem] text-mute">{t('No script yet.', 'Henüz betik yok.')}</div>
        )}
        <button className="btn-ghost w-full mt-2" onClick={() => ed.openSheet('script')}>
          <Code2 className="w-4 h-4" /> {e.script ? t('Edit script', 'Betiği düzenle') : t('Add script', 'Betik ekle')}
        </button>
      </Section>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button className="btn-acc" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> {t('Add component', 'Bileşen ekle')}
        </button>
        <button className="btn-ghost" onClick={() => ed.duplicate(e.id)}>
          <Copy className="w-4 h-4" /> {t('Duplicate', 'Çoğalt')}
        </button>
        <button className="btn-danger col-span-2" onClick={() => setDel(true)}>
          <Trash2 className="w-4 h-4" /> {t('Delete object', 'Nesneyi sil')}
        </button>
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t('Add component', 'Bileşen ekle')}>
        <div className="grid grid-cols-2 gap-2 pb-3">
          {(
            [
              ['Rigidbody', !e.rigidbody, () => up((x) => void (x.rigidbody = defaultRigidbody()))],
              [t('Sun light', 'Güneş ışığı'), !e.light, () => up((x) => void (x.light = defaultLight()))],
              [t('Point light', 'Nokta ışık'), !e.light, () => up((x) => void (x.light = pointLight()))],
              [t('Camera', 'Kamera'), !e.camera, () => up((x) => void (x.camera = defaultCamera()))],
              [t('Audio source', 'Ses kaynağı'), !e.audio, () => up((x) => void (x.audio = defaultAudio()))],
              [t('Animator', 'Animatör'), !e.animator, () => up((x) => void (x.animator = defaultAnimator()))],
              [t('Trigger', 'Tetikleyici'), !e.trigger, () => up((x) => void (x.trigger = true))],
              [t('Script', 'Betik'), true, () => ed.openSheet('script')],
            ] as [string, boolean, () => void][]
          ).map(([label, enabled, fn]) => (
            <button key={label} disabled={!enabled} className="btn-ghost justify-start disabled:opacity-30" onClick={() => (haptic(), fn(), setAddOpen(false))}>
              <Plus className="w-4 h-4 text-acc" /> {label}
            </button>
          ))}
        </div>
      </Sheet>
      <Confirm open={del} title={t('Delete object?', 'Nesne silinsin mi?')} body={e.name} okText={t('Delete', 'Sil')} danger onOk={() => ed.remove(e.id)} onClose={() => setDel(false)} />
    </div>
  );
}
