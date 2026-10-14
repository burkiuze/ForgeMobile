import { Copy, Download, FolderOpen, MoreVertical, Pencil, Play, Plus, Settings as Cog, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { Template } from '../../core/scene';
import { readText } from '../../core/vfs';
import { useT } from '../../i18n';
import { saveFile } from '../../platform/native';
import { ProjectMeta, SCENE_FILE, useEditor } from '../../state/editor';
import { useSettings } from '../../state/settings';
import { useUpdater } from '../../state/updater';
import { Confirm, MadeBy, Sheet, Wordmark, haptic, pickFiles, toast } from '../common/ui';
import { SettingsSheet } from './Settings';

function ago(ts: number, tr: boolean) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return tr ? 'şimdi' : 'just now';
  if (m < 60) return tr ? `${m} dk önce` : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return tr ? `${h} sa önce` : `${h} h ago`;
  return new Date(ts).toLocaleDateString();
}

export function Start() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const update = useSettings((s) => s.update);
  const { projects, newProject, openProject, importScene, renameProject, duplicateProject, deleteProject } = useEditor();
  const up = useUpdater();
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<Template>('platformer');
  const [menu, setMenu] = useState<ProjectMeta | null>(null);
  const [rename, setRename] = useState('');
  const [del, setDel] = useState<ProjectMeta | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const create = () => {
    haptic();
    newProject(name || t('New Game', 'Yeni Oyun'), template);
  };

  const openFromDevice = async () => {
    const [f] = await pickFiles('.json,application/json', false);
    if (!f) return;
    try {
      await importScene(await f.text(), f.name.replace(/\.scene\.json$|\.json$/, ''));
      toast(t('Scene imported', 'Sahne içe aktarıldı'), 'ok');
    } catch (e) {
      toast(`${t('Not a Forge scene', 'Forge sahnesi değil')}: ${(e as Error).message}`, 'err');
    }
  };

  const exportProject = async (p: ProjectMeta) => {
    try {
      const where = saveFile(`${p.name.replace(/[^\p{L}\p{N} _-]/gu, '_')}.scene.json`, 'application/json', await readText(p.id, SCENE_FILE));
      toast(`${t('Saved to', 'Kaydedildi')}: ${where}`, 'ok');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  const templates: { id: Template; title: string; hint: string; emoji: string }[] = [
    { id: 'platformer', title: t('Platformer', 'Platform'), hint: t('Playable sample', 'Oynanabilir örnek'), emoji: '🪙' },
    { id: 'starter', title: t('3D Starter', '3D Başlangıç'), hint: t('Ground, light, camera', 'Zemin, ışık, kamera'), emoji: '🧊' },
    { id: 'empty', title: t('Empty', 'Boş'), hint: t('Blank — or ask AI', 'Boş — ya da AI’a sor'), emoji: '✨' },
  ];

  return (
    <div className="h-full flex flex-col ember-glow">
      <header className="flex items-center gap-2 px-4 pt-4 pb-2">
        <Wordmark className="flex-1" />
        <button className="chip" onClick={() => update({ lang: lang === 'tr' ? 'en' : 'tr' })}>
          {lang === 'tr' ? 'TR' : 'EN'}
        </button>
        <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="settings">
          <Cog className="w-5 h-5" />
        </button>
      </header>

      <div className="px-4 text-[0.75rem] text-mute h-5">
        {up.state === 'checking' && t('Checking for updates…', 'Güncellemeler denetleniyor…')}
        {up.state === 'uptodate' && <span className="text-ok">✓ {t('Forge is up to date', 'Forge güncel')}</span>}
        {up.state === 'available' && (
          <button className="text-gold font-semibold" onClick={() => useUpdater.setState({ dismissed: false })}>
            ⬆ {t('Update available', 'Güncelleme var')} · build {up.latest?.build}
          </button>
        )}
        {up.state === 'failed' && <span>{t('Update check failed', 'Güncelleme denetlenemedi')}</span>}
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-4 max-w-2xl w-full mx-auto">
        <section className="card p-4 mt-2">
          <div className="font-bold text-[1.05rem] mb-3">{t('New project', 'Yeni proje')}</div>
          <input className="input" placeholder={t('Project name', 'Proje adı')} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {templates.map((tp) => (
              <button
                key={tp.id}
                onClick={() => (haptic(), setTemplate(tp.id))}
                className={`rounded-2xl p-3 text-left border-2 bg-s2 transition active:scale-[0.97] ${template === tp.id ? 'border-acc' : 'border-transparent'}`}
              >
                <div className="text-2xl">{tp.emoji}</div>
                <div className="font-semibold text-[0.85rem] mt-1">{tp.title}</div>
                <div className="text-[0.68rem] text-mute leading-tight">{tp.hint}</div>
              </button>
            ))}
          </div>
          <button className="btn-acc w-full mt-3" onClick={create}>
            <Plus className="w-4 h-4" />
            {t('Create project', 'Proje oluştur')}
          </button>
        </section>

        <div className="flex items-center justify-between mt-6 mb-2">
          <div className="font-bold text-[1.05rem]">{t('Recent projects', 'Son projeler')}</div>
          <button className="chip" onClick={openFromDevice}>
            <FolderOpen className="w-4 h-4" />
            {t('Open from device', 'Cihazdan aç')}
          </button>
        </div>

        {projects.length === 0 && <div className="card p-6 text-center text-mute text-[0.85rem]">{t('No projects yet.', 'Henüz proje yok.')}</div>}
        <div className="grid gap-2">
          {projects.map((p) => (
            <div key={p.id} className="card flex items-center">
              <button className="flex-1 flex items-center gap-3 p-3 text-left min-w-0 active:opacity-70" onClick={() => openProject(p.id)}>
                <div className="w-12 h-12 rounded-xl bg-s3 flex items-center justify-center text-xl shrink-0">
                  {p.template === 'platformer' ? '🪙' : p.template === 'starter' ? '🧊' : '✨'}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-[0.72rem] text-mute">
                    {p.entities} {t('objects', 'nesne')} · {ago(p.updatedAt, lang === 'tr')}
                  </div>
                </div>
              </button>
              <button className="icon-btn" onClick={() => openProject(p.id)} aria-label="open">
                <Play className="w-5 h-5 text-acc" />
              </button>
              <button className="icon-btn mr-1" onClick={() => (setMenu(p), setRename(p.name))} aria-label="more">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </main>
      <MadeBy />

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name}>
        {menu && (
          <div className="space-y-2 pb-2">
            <div className="flex gap-2">
              <input className="input" value={rename} onChange={(e) => setRename(e.target.value)} />
              <button className="btn-ghost" onClick={() => (renameProject(menu.id, rename.trim() || menu.name), setMenu(null))}>
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <button className="btn-ghost w-full justify-start" onClick={() => (duplicateProject(menu.id), setMenu(null))}>
              <Copy className="w-4 h-4" /> {t('Duplicate', 'Çoğalt')}
            </button>
            <button className="btn-ghost w-full justify-start" onClick={() => (exportProject(menu), setMenu(null))}>
              <Download className="w-4 h-4" /> {t('Export scene (.scene.json)', 'Sahneyi dışa aktar (.scene.json)')}
            </button>
            <button className="btn-danger w-full justify-start" onClick={() => (setDel(menu), setMenu(null))}>
              <Trash2 className="w-4 h-4" /> {t('Delete project', 'Projeyi sil')}
            </button>
          </div>
        )}
      </Sheet>
      <Confirm
        open={!!del}
        title={t('Delete project?', 'Proje silinsin mi?')}
        body={del?.name}
        okText={t('Delete', 'Sil')}
        danger
        onOk={() => del && deleteProject(del.id)}
        onClose={() => setDel(null)}
      />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
