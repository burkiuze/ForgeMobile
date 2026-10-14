import { Dices, Link2, Play, Save } from 'lucide-react';
import React, { useState } from 'react';
import { PRESETS, Preset, audio, defaultSeed, encodeWav, synth } from '../../../core/audio';
import { getEntity } from '../../../core/scene';
import { writeFile } from '../../../core/vfs';
import { useT } from '../../../i18n';
import { useEditor } from '../../../state/editor';
import { haptic, toast } from '../../common/ui';
import { attachAudio } from './actions';

const EMOJI: Record<Preset, string> = { coin: '🪙', jump: '🦘', laser: '🔫', explosion: '💥', hit: '👊', powerup: '⭐', click: '🖱️', blip: '🔹' };

export function SoundsTab() {
  const t = useT();
  const ed = useEditor();
  const [variation, setVariation] = useState(0);
  const project = ed.project?.id || 'scratch';
  const selected = getEntity(ed.scene, ed.selected);
  const seed = (p: Preset) => defaultSeed(p) + variation * 7919;

  const save = async (p: Preset) => {
    const name = variation ? `${p}_${variation}` : p;
    const path = await writeFile(project, `Audio/${name}.wav`, encodeWav(synth(p, seed(p))));
    ed.filesChanged();
    return path;
  };

  return (
    <div className="h-full overflow-y-auto px-3 pb-24">
      <div className="text-[0.75rem] text-mute mb-2">{t('Retro sound effects generated on your phone — CC0, use them anywhere.', 'Telefonunda üretilen retro ses efektleri — CC0, her yerde kullan.')}</div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[0.85rem]">{t('Variation', 'Varyasyon')}</span>
        <span className="font-mono text-acc w-8 text-center">{variation}</span>
        <button className="chip" onClick={() => (haptic(), setVariation(variation + 1))}>
          <Dices className="w-4 h-4" /> {t('New variation', 'Yeni varyasyon')}
        </button>
      </div>
      <div className="grid gap-2">
        {PRESETS.map((p) => (
          <div key={p} className="card flex items-center gap-2 p-2">
            <button className="w-12 h-12 rounded-xl bg-acc/15 text-2xl flex items-center justify-center active:scale-95" onClick={() => audio.playSamples(synth(p, seed(p)))}>
              {EMOJI[p]}
            </button>
            <div className="flex-1 font-semibold capitalize">{p}</div>
            <button className="icon-btn" onClick={() => audio.playSamples(synth(p, seed(p)))} aria-label="play">
              <Play className="w-5 h-5" />
            </button>
            <button className="icon-btn" onClick={async () => toast(`${t('Saved', 'Kaydedildi')}: ${await save(p)}`, 'ok')} aria-label="save">
              <Save className="w-5 h-5" />
            </button>
            <button className="icon-btn" disabled={!selected} onClick={async () => attachAudio(await save(p))} aria-label="attach">
              <Link2 className={`w-5 h-5 ${selected ? 'text-acc' : 'opacity-30'}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="text-[0.72rem] text-mute mt-3">
        {t('Save → Audio/<name>.wav. Use it in scripts with play_sound("Audio/coin.wav").', 'Kaydet → Audio/<ad>.wav. Betiklerde play_sound("Audio/coin.wav") ile kullan.')}
      </div>
    </div>
  );
}
