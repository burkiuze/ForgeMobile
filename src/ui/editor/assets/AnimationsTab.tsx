import { Film, Link2, Pencil, Save } from 'lucide-react';
import React from 'react';
import * as anim from '../../../core/animation';
import { getEntity } from '../../../core/scene';
import { writeFile } from '../../../core/vfs';
import { useT } from '../../../i18n';
import { useEditor } from '../../../state/editor';
import { toast } from '../../common/ui';
import { attachAnimation } from './actions';

export function AnimationsTab() {
  const t = useT();
  const ed = useEditor();
  const project = ed.project?.id || 'scratch';
  const selected = getEntity(ed.scene, ed.selected);
  return (
    <div className="h-full overflow-y-auto px-3 pb-24">
      <div className="text-[0.75rem] text-mute mb-2">{t('Ready-made keyframe clips. Assign directly or save a copy to edit.', 'Hazır anahtar kareli klipler. Doğrudan ata ya da düzenlemek için kopyasını kaydet.')}</div>
      <div className="grid gap-2">
        {anim.PRESETS.map((p) => {
          const c = anim.preset(p)!;
          return (
            <div key={p} className="card flex items-center gap-2 p-2">
              <div className="w-12 h-12 rounded-xl bg-s3 flex items-center justify-center">
                <Film className="w-5 h-5 text-acc" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{c.name}</div>
                <div className="text-[0.7rem] text-mute truncate">
                  {c.length}s · {c.looping ? 'loop' : 'once'} · {c.tracks.map((x) => x.property).join(', ')}
                </div>
              </div>
              <button
                className="icon-btn"
                onClick={async () => {
                  const path = await writeFile(project, anim.clipFileName(c.name), anim.clipJson(c));
                  ed.filesChanged();
                  toast(`${t('Saved', 'Kaydedildi')}: ${path}`, 'ok');
                }}
                aria-label="save"
              >
                <Save className="w-5 h-5" />
              </button>
              <button
                className="icon-btn"
                disabled={!selected}
                onClick={() => {
                  attachAnimation(`preset:${p}`);
                  ed.openSheet('animation');
                }}
                aria-label="edit"
              >
                <Pencil className={`w-5 h-5 ${selected ? '' : 'opacity-30'}`} />
              </button>
              <button className="icon-btn" disabled={!selected} onClick={() => attachAnimation(`preset:${p}`)} aria-label="assign">
                <Link2 className={`w-5 h-5 ${selected ? 'text-acc' : 'opacity-30'}`} />
              </button>
            </div>
          );
        })}
      </div>
      <button className="btn-ghost w-full mt-3" onClick={() => ed.openSheet('animation')}>
        <Pencil className="w-4 h-4" /> {t('Open animation editor', 'Animasyon editörünü aç')}
      </button>
    </div>
  );
}
