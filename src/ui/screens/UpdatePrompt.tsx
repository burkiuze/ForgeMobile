import { Download } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../../i18n';
import { useEditor } from '../../state/editor';
import { useUpdater } from '../../state/updater';
import { Logo, useBack } from '../common/ui';

/** "A new version is ready — update now?" shown at launch when GitHub has a newer build. */
export function UpdatePrompt() {
  const t = useT();
  const { state, latest, current, dismissed, install, dismiss } = useUpdater();
  const playing = useEditor((s) => s.playing);
  const open = state === 'available' && !dismissed && !playing && !!latest;
  useBack(open, dismiss);
  if (!open || !latest) return null;
  const notes = latest.notes.split('\n').filter((l) => l.trim().startsWith('-') || l.trim().startsWith('•')).slice(0, 5);
  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-6 fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={dismiss} />
      <div className="relative card p-5 w-full max-w-sm shadow-lift slide-up">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <div className="font-bold text-[1.05rem]">{t('Update available', 'Güncelleme mevcut')}</div>
            <div className="text-[0.78rem] text-mute">
              Build {current} → Build {latest.build}
            </div>
          </div>
        </div>
        {notes.length > 0 && (
          <ul className="mt-3 text-[0.82rem] text-mute space-y-1">
            {notes.map((n, i) => (
              <li key={i}>{n.replace(/^[-•]\s*/, '• ')}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 text-[0.9rem]">{t('Update now?', 'Şimdi güncellensin mi?')}</div>
        <div className="flex gap-2 mt-4">
          <button className="btn-ghost flex-1" onClick={dismiss}>
            {t('Later', 'Daha sonra')}
          </button>
          <button className="btn-acc flex-[1.4]" onClick={install}>
            <Download className="w-4 h-4" />
            {t('Update', 'Güncelle')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
