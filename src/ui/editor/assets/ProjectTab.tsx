import { Info, Link2, Paintbrush, Pencil, Play, Plus, Trash2, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { audio } from '../../../core/audio';
import { getEntity } from '../../../core/scene';
import { FOLDERS, FileEntry, assetKind, fileUrl, humanSize, readBlob, readText, removePath } from '../../../core/vfs';
import { inspectAsset } from '../../../ai/tools';
import { useT } from '../../../i18n';
import { execContext } from '../../../state/chat';
import { useEditor } from '../../../state/editor';
import { Confirm, Empty, Sheet, pickFiles, toast } from '../../common/ui';
import { useFiles } from '../useFiles';
import { addModel, applyTexture, attachAnimation, attachAudio, importFiles, kindIcon } from './actions';

function Thumb({ f }: { f: FileEntry }) {
  const project = useEditor((s) => s.project?.id || 'scratch');
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (assetKind(f.path) === 'texture') fileUrl(project, f.path).then(setUrl);
  }, [f.path, f.mtime]);
  if (url) return <img src={url} className="w-12 h-12 rounded-xl object-cover bg-s3" alt="" />;
  return <div className="w-12 h-12 rounded-xl bg-s3 flex items-center justify-center text-xl">{kindIcon(f.path)}</div>;
}

export function ProjectTab() {
  const t = useT();
  const ed = useEditor();
  const files = useFiles();
  const [folder, setFolder] = useState<string>('all');
  const [sel, setSel] = useState<FileEntry | null>(null);
  const [info, setInfo] = useState('');
  const [del, setDel] = useState<FileEntry | null>(null);
  const project = ed.project?.id || 'scratch';
  const selected = getEntity(ed.scene, ed.selected);

  // Hide companion files inside model folders (bin / textures of a glTF).
  const visible = files.filter((f) => {
    if (f.path.endsWith('.scene.json')) return false;
    if (f.path.startsWith('Models/') && !/\.(gltf|glb)$/i.test(f.path)) return false;
    return folder === 'all' || f.path.startsWith(folder + '/');
  });

  const doImport = async () => {
    const picked = await pickFiles('*/*', true);
    if (!picked.length) return;
    try {
      const paths = await importFiles(picked);
      toast(`${paths.length} ${t('files imported', 'dosya içe aktarıldı')}`, 'ok');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  const open = async (f: FileEntry) => {
    setSel(f);
    setInfo('…');
    try {
      setInfo(await inspectAsset(execContext(), f.path));
    } catch (e) {
      setInfo((e as Error).message);
    }
  };

  const kind = sel ? assetKind(sel.path) : 'other';

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 pb-2">
        {['all', ...FOLDERS].map((f) => (
          <button key={f} onClick={() => setFolder(f)} className={`chip shrink-0 ${folder === f ? '!bg-acc !text-white !border-acc' : ''}`}>
            {f === 'all' ? t('All', 'Tümü') : f}
          </button>
        ))}
      </div>
      <div className="px-3 pb-2">
        <button className="btn-acc w-full" onClick={doImport}>
          <Upload className="w-4 h-4" /> {t('Import from device', 'Cihazdan içe aktar')}
        </button>
        <div className="text-[0.7rem] text-mute mt-1.5 text-center">{t('glTF/GLB models (pick .gltf with its .bin and textures together), PNG/JPG, WAV/MP3/OGG, .rhai, .anim.json', 'glTF/GLB modeller (.gltf’i .bin ve dokularıyla birlikte seç), PNG/JPG, WAV/MP3/OGG, .rhai, .anim.json')}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        {visible.length === 0 && <Empty title={t('No assets yet', 'Henüz varlık yok')} body={t('Import from your phone, download free CC0 assets from the Store, or generate sounds.', 'Telefonundan içe aktar, Mağaza’dan ücretsiz CC0 varlık indir ya da ses üret.')} />}
        <div className="grid gap-1.5">
          {visible.map((f) => (
            <button key={f.path} className="card flex items-center gap-3 p-2 text-left active:opacity-70" onClick={() => open(f)}>
              <Thumb f={f} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[0.88rem] truncate">{f.path.split('/').pop()}</div>
                <div className="text-[0.7rem] text-mute truncate">
                  {f.path.split('/').slice(0, -1).join('/')} · {humanSize(f.size)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.path.split('/').pop()}>
        {sel && (
          <div className="grid gap-2 pb-2">
            <div className="text-[0.8rem] text-mute flex gap-2 items-start">
              <Info className="w-4 h-4 shrink-0 mt-0.5" /> <span className="font-mono">{sel.path}</span>
            </div>
            <div className="text-[0.82rem]">{info}</div>
            {kind === 'model' && (
              <button className="btn-acc" onClick={() => (addModel(sel.path), setSel(null))}>
                <Plus className="w-4 h-4" /> {t('Add to scene (real size)', 'Sahneye ekle (gerçek boyut)')}
              </button>
            )}
            {kind === 'texture' && (
              <button className="btn-acc" disabled={!selected} onClick={() => (applyTexture(sel.path), setSel(null))}>
                <Paintbrush className="w-4 h-4" /> {t('Apply to selected', 'Seçiliye uygula')} {selected ? `· ${selected.name}` : ''}
              </button>
            )}
            {kind === 'audio' && (
              <>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    const b = await audio.decode(`${project}:${sel.path}:${sel.mtime}`, async () => (await readBlob(project, sel.path))?.arrayBuffer() ?? null);
                    if (b) audio.playBuffer(b);
                    else toast(t('Cannot play this file', 'Bu dosya çalınamıyor'), 'err');
                  }}
                >
                  <Play className="w-4 h-4" /> {t('Play', 'Çal')}
                </button>
                <button className="btn-acc" disabled={!selected} onClick={() => (attachAudio(sel.path), setSel(null))}>
                  <Link2 className="w-4 h-4" /> {t('Attach to selected', 'Seçiliye ekle')}
                </button>
              </>
            )}
            {kind === 'animation' && (
              <button className="btn-acc" disabled={!selected} onClick={() => (attachAnimation(sel.path), setSel(null))}>
                <Link2 className="w-4 h-4" /> {t('Assign to selected', 'Seçiliye ata')}
              </button>
            )}
            {kind === 'script' && (
              <button
                className="btn-acc"
                disabled={!selected}
                onClick={async () => {
                  const code = await readText(project, sel.path);
                  ed.updateEntity(selected!.id, (x) => void (x.script = code));
                  toast(t('Script attached', 'Betik eklendi'), 'ok');
                  setSel(null);
                }}
              >
                <Pencil className="w-4 h-4" /> {t('Use as script of selected', 'Seçilinin betiği yap')}
              </button>
            )}
            <button className="btn-danger" onClick={() => (setDel(sel), setSel(null))}>
              <Trash2 className="w-4 h-4" /> {t('Delete', 'Sil')}
            </button>
          </div>
        )}
      </Sheet>
      <Confirm
        open={!!del}
        title={t('Delete file?', 'Dosya silinsin mi?')}
        body={del?.path}
        okText={t('Delete', 'Sil')}
        danger
        onOk={async () => {
          if (!del) return;
          const target = assetKind(del.path) === 'model' && del.path.split('/').length > 2 ? del.path.split('/').slice(0, 2).join('/') : del.path;
          await removePath(project, target);
          ed.filesChanged();
        }}
        onClose={() => setDel(null)}
      />
    </div>
  );
}
