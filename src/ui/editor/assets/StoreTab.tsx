import { Download, ExternalLink, Loader2, Paintbrush, Plus, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Item, Kind, LINKS, Source, importAsset, search, sourceLabel } from '../../../ai/store';
import { getEntity } from '../../../core/scene';
import { exists } from '../../../core/vfs';
import { useT } from '../../../i18n';
import { openUrl } from '../../../platform/native';
import { useEditor } from '../../../state/editor';
import { useSettings } from '../../../state/settings';
import { Empty, Segmented, Sheet, toast } from '../../common/ui';
import { addModel, applyTexture } from './actions';

export function StoreTab() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const ed = useEditor();
  const [source, setSource] = useState<Source>('polyhaven');
  const [kind, setKind] = useState<Kind>('models');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<Item | null>(null);
  const [busy, setBusy] = useState('');
  const [importedPath, setImportedPath] = useState('');
  const project = ed.project?.id || 'scratch';
  const selected = getEntity(ed.scene, ed.selected);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setErr('');
    search(source, source === 'ambientcg' ? 'textures' : kind, query, 90)
      .then((r) => live && setItems(r))
      .catch((e) => live && (setErr(e.message), setItems([])))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [source, kind, query]);

  const effKind: Kind = source === 'ambientcg' ? 'textures' : kind;

  const doImport = async (it: Item) => {
    setBusy('…');
    setImportedPath('');
    try {
      const imp = await importAsset(project, it.source, effKind, it.id, (s) => setBusy(s));
      ed.filesChanged();
      setImportedPath(imp.path);
      toast(`${t('Downloaded', 'İndirildi')}: ${imp.path}`, 'ok');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
    setBusy('');
  };

  const openItem = async (it: Item) => {
    setSel(it);
    setImportedPath('');
    // already downloaded?
    const guess = it.source === 'ambientcg' || effKind === 'textures' ? [`Textures/${it.id}.jpg`, `Textures/${it.id}.png`] : [`Models/${it.id}/${it.id}_1k.gltf`];
    for (const g of guess) if (await exists(project, g)) setImportedPath(g);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 space-y-2 pb-2">
        <div className="flex gap-2 flex-wrap">
          <Segmented small value={source} onChange={setSource} options={[{ v: 'polyhaven', label: 'Poly Haven' }, { v: 'ambientcg', label: 'ambientCG' }]} />
          {source === 'polyhaven' && (
            <Segmented small value={kind} onChange={setKind} options={[{ v: 'models', label: t('3D models', '3D modeller') }, { v: 'textures', label: t('Textures', 'Dokular') }]} />
          )}
        </div>
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q);
          }}
        >
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-mute" />
          <input className="input pl-9" placeholder={t('Search (e.g. wood, rock, chair)', 'Ara (örn. wood, rock, chair)')} value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div className="text-[0.68rem] text-mute">
          CC0 · {t('free for any use', 'her türlü kullanım için ücretsiz')} · {items.length} {t('assets', 'varlık')}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-acc" />
          </div>
        )}
        {!loading && err && <Empty title={t('Store unreachable', 'Mağazaya ulaşılamadı')} body={err} />}
        <div className="grid grid-cols-3 gap-2">
          {items.map((it) => (
            <button key={it.id} className="rounded-2xl overflow-hidden bg-s1 border border-line/60 text-left active:scale-[0.97] transition" onClick={() => openItem(it)}>
              <img src={it.thumb} loading="lazy" className="w-full aspect-square object-cover bg-s3" alt="" />
              <div className="px-2 py-1.5 text-[0.7rem] font-medium truncate">{it.name}</div>
            </button>
          ))}
        </div>
        <div className="label mt-6 mb-2">{t('More free assets', 'Daha fazla ücretsiz varlık')}</div>
        <div className="grid gap-1.5">
          {LINKS.map((l) => (
            <button key={l.name} className="card flex items-center gap-3 px-3 py-2.5 text-left" onClick={() => openUrl(l.url)}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[0.88rem]">{l.name}</div>
                <div className="text-[0.72rem] text-mute truncate">{lang === 'tr' ? l.tr : l.en}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-mute" />
            </button>
          ))}
          <div className="text-[0.7rem] text-mute mt-1">{t('Download a pack there, then Project › Import from device.', 'Orada paketi indir, sonra Proje › Cihazdan içe aktar.')}</div>
        </div>
      </div>

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name}>
        {sel && (
          <div className="pb-2">
            <img src={sel.thumb} className="w-full max-h-64 object-contain rounded-2xl bg-s3" alt="" />
            <div className="text-[0.75rem] text-mute mt-2">
              {sourceLabel(sel.source)} · CC0 · {sel.tags.slice(0, 6).join(', ')}
            </div>
            <div className="grid gap-2 mt-3">
              {!importedPath && (
                <button className="btn-acc" disabled={!!busy} onClick={() => doImport(sel)}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {busy ? `${t('Downloading', 'İndiriliyor')} ${busy}` : t('Download to project', 'Projeye indir')}
                </button>
              )}
              {importedPath && effKind === 'models' && (
                <button className="btn-acc" onClick={() => (addModel(importedPath, sel.name), setSel(null))}>
                  <Plus className="w-4 h-4" /> {t('Add to scene', 'Sahneye ekle')}
                </button>
              )}
              {importedPath && effKind === 'textures' && (
                <button className="btn-acc" disabled={!selected} onClick={() => (applyTexture(importedPath), setSel(null))}>
                  <Paintbrush className="w-4 h-4" /> {t('Apply to selected', 'Seçiliye uygula')} {selected ? `· ${selected.name}` : ''}
                </button>
              )}
              {importedPath && <div className="text-[0.72rem] text-ok font-mono">✓ {importedPath}</div>}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
