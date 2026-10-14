// Shared asset actions (project browser, store, sounds, animations).

import { loadModel } from '../../../core/model';
import { getEntity } from '../../../core/scene';
import { assetKind, cleanPath, folderFor, writeFile } from '../../../core/vfs';
import { t } from '../../../i18n';
import { useEditor } from '../../../state/editor';
import { toast } from '../../common/ui';

const project = () => useEditor.getState().project?.id || 'scratch';

/** Place a glTF model in front of the camera at its real size. */
export async function addModel(path: string, name?: string) {
  const ed = useEditor.getState();
  let extents: [number, number, number] = [1, 1, 1];
  try {
    extents = (await loadModel(project(), path)).extents;
  } catch (e) {
    toast(`${t('Model failed to load', 'Model yüklenemedi')}: ${(e as Error).message}`, 'err');
  }
  const base = name || path.split('/').pop()!.replace(/\.(gltf|glb)$/i, '').replace(/[_-]+/g, ' ');
  ed.addEntity(base, 'model', (e) => {
    e.model = path;
    e.transform.scale = extents;
    e.transform.position = [0, extents[1] / 2, 0];
    e.color = [1, 1, 1];
  });
  ed.setTab('scene');
  toast(`${base} ${t('added', 'eklendi')}`, 'ok');
}

export function applyTexture(path: string) {
  const ed = useEditor.getState();
  const e = getEntity(ed.scene, ed.selected);
  if (!e || e.mesh === 'none' || e.mesh === 'model') return toast(t('Select an object with a shape first', 'Önce şekli olan bir nesne seç'), 'err');
  ed.updateEntity(e.id, (x) => {
    x.material.texture = path;
    x.color = [1, 1, 1];
  });
  toast(`${t('Texture applied to', 'Doku uygulandı')} ${e.name}`, 'ok');
}

export function attachAudio(path: string) {
  const ed = useEditor.getState();
  const e = getEntity(ed.scene, ed.selected);
  if (!e) return toast(t('Select an object first', 'Önce bir nesne seç'), 'err');
  ed.updateEntity(e.id, (x) => void (x.audio = { clip: path, volume: x.audio?.volume ?? 1, looping: x.audio?.looping ?? false, play_on_start: x.audio?.play_on_start ?? true }));
  toast(`${t('Audio attached to', 'Ses eklendi')} ${e.name}`, 'ok');
}

export function attachAnimation(ref: string) {
  const ed = useEditor.getState();
  const e = getEntity(ed.scene, ed.selected);
  if (!e) return toast(t('Select an object first', 'Önce bir nesne seç'), 'err');
  ed.updateEntity(e.id, (x) => void (x.animator = { clip: ref, speed: x.animator?.speed ?? 1, play_on_start: true }));
  toast(`${t('Animation assigned to', 'Animasyon atandı')} ${e.name}`, 'ok');
}

/** Import device files into the project. A .gltf keeps its companion files (.bin, textures) together. */
export async function importFiles(files: File[]): Promise<string[]> {
  const p = project();
  const out: string[] = [];
  const gltf = files.find((f) => /\.gltf$/i.test(f.name));
  const modelDir = gltf ? `Models/${gltf.name.replace(/\.gltf$/i, '').replace(/[^\p{L}\p{N}_-]/gu, '_')}` : '';
  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    let path: string;
    if (gltf && f !== gltf && /\.(bin|png|jpe?g|webp|ktx2)$/i.test(f.name)) path = `${modelDir}/${f.name}`;
    else if (gltf && f === gltf) path = `${modelDir}/${f.name}`;
    else if (/\.(scene\.json)$/i.test(f.name)) path = f.name;
    else path = `${folderFor(f.name)}/${f.name}`;
    out.push(await writeFile(p, cleanPath(path), bytes));
  }
  useEditor.getState().filesChanged();
  return out;
}

export const kindIcon = (path: string) =>
  ({ model: '🧊', texture: '🖼️', audio: '🔊', animation: '🎞️', script: '📜', prefab: '📦', scene: '🎬', other: '📄' })[assetKind(path)];
