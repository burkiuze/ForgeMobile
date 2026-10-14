import {
  Box, ChevronLeft, Download, FolderOpen, Layers, MoreVertical, Play, Plus, Redo2, Save, Settings as Cog, SlidersHorizontal, Sparkles,
  Square, Terminal, Undo2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useT } from '../../i18n';
import { saveFile } from '../../platform/native';
import { Tab, useEditor } from '../../state/editor';
import { useChat } from '../../state/chat';
import { useSettings } from '../../state/settings';
import { Sheet, haptic, toast, useBack } from '../common/ui';
import { SettingsSheet } from '../screens/Settings';
import { AddMenu } from './AddMenu';
import { AgentPanel } from './agent/AgentPanel';
import { AnimationEditor } from './AnimationEditor';
import { AssetsPanel } from './assets/AssetsPanel';
import { ConsoleSheet } from './ConsoleSheet';
import { Hierarchy } from './Hierarchy';
import { Inspector } from './Inspector';
import { ScriptEditor } from './ScriptEditor';
import { Viewport } from './viewport/Viewport';

function useWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 820);
  useEffect(() => {
    const f = () => setWide(window.innerWidth >= 820);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return wide;
}

export function Editor() {
  const t = useT();
  const tab = useEditor((s) => s.tab);
  const setTab = useEditor((s) => s.setTab);
  const sheet = useEditor((s) => s.sheet);
  const openSheet = useEditor((s) => s.openSheet);
  const playing = useEditor((s) => s.playing);
  const aiEnabled = useSettings((s) => s.aiEnabled);
  const wide = useWide();
  const effTab: Tab = !aiEnabled && tab === 'ai' ? 'scene' : tab;

  // Back button: close panels first, then stop play, then return to projects.
  useBack(effTab !== 'scene' && !wide, () => setTab('scene'));
  useBack(playing, () => useEditor.getState().setPlaying(false));

  const panel = (which: Tab) => {
    switch (which) {
      case 'hierarchy':
        return <Hierarchy />;
      case 'inspector':
        return <Inspector />;
      case 'assets':
        return <AssetsPanel />;
      case 'ai':
        return <AgentPanel />;
      default:
        return null;
    }
  };

  const sideTab: Tab = effTab === 'scene' ? 'hierarchy' : effTab;

  return (
    <div className="h-full flex flex-col">
      <TopBar />
      <div className="flex-1 flex min-h-0 relative">
        <div className="relative flex-1 min-w-0">
          <Viewport />
          {!wide && effTab !== 'scene' && <div className="absolute inset-0 bg-bg z-10 flex flex-col fade-in">{panel(effTab)}</div>}
          {effTab === 'scene' && !playing && (
            <button
              className="absolute right-4 bottom-4 w-14 h-14 rounded-2xl bg-acc text-white shadow-lift flex items-center justify-center active:scale-95 z-[5]"
              onClick={() => (haptic(), openSheet('add'))}
              aria-label="add"
            >
              <Plus className="w-7 h-7" />
            </button>
          )}
        </div>
        {wide && !playing && <div className="w-[24rem] shrink-0 min-h-0 border-l border-line/70 bg-bg flex flex-col">{panel(sideTab)}</div>}
      </div>
      {!playing && <TabBar tab={wide ? sideTab : effTab} wide={wide} />}

      <AddMenu open={sheet === 'add'} onClose={() => openSheet(null)} />
      <ConsoleSheet open={sheet === 'console'} onClose={() => openSheet(null)} />
      <ScriptEditor open={sheet === 'script'} onClose={() => openSheet(null)} />
      <AnimationEditor open={sheet === 'animation'} onClose={() => openSheet(null)} />
      <SettingsSheet open={sheet === 'settings'} onClose={() => openSheet(null)} />
      <SettingsSheet open={sheet === 'models'} onClose={() => openSheet(null)} initial="models" />
      <SettingsSheet open={sheet === 'device'} onClose={() => openSheet(null)} initial="device" />
    </div>
  );
}

function TopBar() {
  const t = useT();
  const { project, playing, setPlaying, undo, redo, undoStack, redoStack, dirty, save, setScreen, openSheet, logs, scene } = useEditor();
  const [menu, setMenu] = useState(false);
  const errors = logs.filter((l) => l.level === 'error').length;
  const back = async () => {
    if (playing) setPlaying(false);
    await save();
    setScreen('start');
  };
  return (
    <header className="h-14 flex items-center gap-1 px-1.5 bg-s1 border-b border-line/70 z-20">
      <button className="icon-btn" onClick={back} aria-label="projects">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-[0.92rem] truncate">{project?.name || 'Forge'}</div>
        <div className="text-[0.68rem] text-mute truncate">
          {scene.entities.length} {t('objects', 'nesne')}
          {dirty ? ' · •' : ''}
          {errors ? <span className="text-bad"> · {errors} ⚠</span> : null}
        </div>
      </div>
      {!playing && (
        <>
          <button className="icon-btn" onClick={undo} disabled={!undoStack.length} aria-label="undo">
            <Undo2 className={`w-5 h-5 ${undoStack.length ? '' : 'opacity-30'}`} />
          </button>
          <button className="icon-btn" onClick={redo} disabled={!redoStack.length} aria-label="redo">
            <Redo2 className={`w-5 h-5 ${redoStack.length ? '' : 'opacity-30'}`} />
          </button>
        </>
      )}
      <button
        onClick={() => (haptic(12), setPlaying(!playing))}
        className={`h-10 px-4 rounded-full font-bold text-[0.8rem] flex items-center gap-1.5 shadow-lift active:scale-95 transition ${
          playing ? 'bg-bad text-white' : 'bg-acc text-white'
        }`}
      >
        {playing ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        {playing ? t('Stop', 'Durdur') : t('Play', 'Oynat')}
      </button>
      <button className="icon-btn" onClick={() => setMenu(true)} aria-label="menu">
        <MoreVertical className="w-5 h-5" />
      </button>
      <Sheet open={menu} onClose={() => setMenu(false)} title={project?.name}>
        <div className="grid gap-2 pb-2">
          <button className="btn-ghost justify-start" onClick={() => (save().then(() => toast(t('Saved', 'Kaydedildi'), 'ok')), setMenu(false))}>
            <Save className="w-4 h-4" /> {t('Save', 'Kaydet')}
          </button>
          <button
            className="btn-ghost justify-start"
            onClick={() => {
              const where = saveFile(`${(project?.name || 'scene').replace(/[^\p{L}\p{N} _-]/gu, '_')}.scene.json`, 'application/json', JSON.stringify(scene, null, 1));
              toast(`${t('Saved to', 'Kaydedildi')}: ${where}`, 'ok');
              setMenu(false);
            }}
          >
            <Download className="w-4 h-4" /> {t('Export scene (open it in Forge on PC)', 'Sahneyi dışa aktar (PC’deki Forge’da aç)')}
          </button>
          <button className="btn-ghost justify-start" onClick={() => (openSheet('console'), setMenu(false))}>
            <Terminal className="w-4 h-4" /> {t('Console', 'Konsol')} {logs.length ? `(${logs.length})` : ''}
          </button>
          <button className="btn-ghost justify-start" onClick={() => (openSheet('animation'), setMenu(false))}>
            <Layers className="w-4 h-4" /> {t('Animation editor', 'Animasyon editörü')}
          </button>
          <button className="btn-ghost justify-start" onClick={() => (openSheet('settings'), setMenu(false))}>
            <Cog className="w-4 h-4" /> {t('Settings', 'Ayarlar')}
          </button>
          <button className="btn-ghost justify-start" onClick={() => (back(), setMenu(false))}>
            <FolderOpen className="w-4 h-4" /> {t('Projects', 'Projeler')}
          </button>
        </div>
      </Sheet>
    </header>
  );
}

function TabBar({ tab, wide }: { tab: Tab; wide: boolean }) {
  const t = useT();
  const setTab = useEditor((s) => s.setTab);
  const aiEnabled = useSettings((s) => s.aiEnabled);
  const busy = useChat((s) => s.busy);
  const approval = useChat((s) => !!s.approval);
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    ...(wide ? [] : [{ id: 'scene' as Tab, label: t('Scene', 'Sahne'), icon: <Box className="w-[1.3rem] h-[1.3rem]" /> }]),
    { id: 'hierarchy', label: t('Objects', 'Nesneler'), icon: <Layers className="w-[1.3rem] h-[1.3rem]" /> },
    { id: 'inspector', label: t('Inspector', 'Özellikler'), icon: <SlidersHorizontal className="w-[1.3rem] h-[1.3rem]" /> },
    { id: 'assets', label: t('Assets', 'Varlıklar'), icon: <FolderOpen className="w-[1.3rem] h-[1.3rem]" /> },
    ...(aiEnabled ? [{ id: 'ai' as Tab, label: 'AI', icon: <Sparkles className="w-[1.3rem] h-[1.3rem]" /> }] : []),
  ];
  return (
    <nav className="flex items-stretch bg-s1 border-t border-line/70 z-20 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((x) => {
        const on = tab === x.id;
        return (
          <button
            key={x.id}
            onClick={() => (haptic(4), setTab(on && !wide && x.id !== 'scene' ? 'scene' : x.id))}
            className={`relative flex-1 h-16 flex flex-col items-center justify-center gap-1 transition ${on ? 'text-acc' : 'text-mute'}`}
          >
            {on && <span className="absolute top-0 w-8 h-1 rounded-b-full bg-acc" />}
            <span className="relative">
              {x.icon}
              {x.id === 'ai' && (busy || approval) && (
                <span className={`absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full ${approval ? 'bg-gold' : 'bg-acc'} animate-pulse`} />
              )}
            </span>
            <span className="text-[0.68rem] font-semibold">{x.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
