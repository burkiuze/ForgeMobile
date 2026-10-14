import { Trash2 } from 'lucide-react';
import React from 'react';
import { useT } from '../../i18n';
import { useEditor } from '../../state/editor';
import { Empty, Sheet } from '../common/ui';

export function ConsoleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { logs, clearLogs } = useEditor();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Console', 'Konsol')}
      right={
        <button className="icon-btn" onClick={clearLogs} aria-label="clear">
          <Trash2 className="w-5 h-5" />
        </button>
      }
    >
      {logs.length === 0 ? (
        <Empty title={t('No messages', 'Mesaj yok')} body={t('Script logs and errors from play mode appear here.', 'Oyun modundaki betik çıktıları ve hatalar burada görünür.')} />
      ) : (
        <div className="font-mono text-[0.72rem] space-y-1 pb-4 selectable">
          {[...logs].reverse().map((l, i) => (
            <div key={i} className={`px-2 py-1.5 rounded-lg ${l.level === 'error' ? 'bg-bad/10 text-bad' : l.level === 'warn' ? 'bg-gold/10 text-gold' : 'bg-s2 text-ink'}`}>
              <span className="text-mute mr-2">{new Date(l.t).toLocaleTimeString()}</span>
              {l.text}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
