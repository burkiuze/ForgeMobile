import React, { useEffect } from 'react';
import { audio } from '../core/audio';
import { useEditor } from '../state/editor';
import { useSettings } from '../state/settings';
import { useUpdater } from '../state/updater';
import { applyTheme } from '../theme';
import { ToastHost } from './common/ui';
import { UpdatePrompt } from './screens/UpdatePrompt';
import { Editor } from './editor/Editor';
import { Start } from './screens/Start';
import { Wizard } from './screens/Wizard';

export default function App() {
  const theme = useSettings((s) => s.theme);
  const accent = useSettings((s) => s.accent);
  const uiScale = useSettings((s) => s.uiScale);
  const volume = useSettings((s) => s.masterVolume);
  const muted = useSettings((s) => s.muted);
  const screen = useEditor((s) => s.screen);

  useEffect(() => applyTheme(theme, accent, uiScale), [theme, accent, uiScale]);
  useEffect(() => audio.setVolume(volume, muted), [volume, muted]);

  useEffect(() => {
    const s = useSettings.getState();
    const ed = useEditor.getState();
    if (!s.wizardDone) ed.setScreen('wizard');
    else if (!s.showStartScreen && ed.projects.length) ed.openProject(ed.projects[0].id);
    else ed.setScreen('start');
    if (s.autoUpdate) useUpdater.getState().check();
    window.ForgeOnPause = () => {
      const st = useEditor.getState();
      if (st.dirty) st.save();
    };
  }, []);

  return (
    <div className="h-full w-full bg-bg text-ink">
      {screen === 'wizard' && <Wizard />}
      {screen === 'start' && <Start />}
      {screen === 'editor' && <Editor />}
      <UpdatePrompt />
      <ToastHost />
    </div>
  );
}
