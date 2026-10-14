import { Check, ChevronLeft } from 'lucide-react';
import React, { useState } from 'react';
import { Template } from '../../core/scene';
import { useT } from '../../i18n';
import { useEditor } from '../../state/editor';
import { useSettings } from '../../state/settings';
import { ACCENTS, AccentId, THEMES, ThemeId } from '../../theme';
import { ModelPicker } from '../common/ModelPicker';
import { MadeBy, Sheet, Wordmark, haptic, toast, useBack } from '../common/ui';
import { DeviceModels } from './DeviceModels';

const STEPS = 4;

export function Wizard() {
  const t = useT();
  const s = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(t('My First Game', 'İlk Oyunum'));
  const [template, setTemplate] = useState<Template>('platformer');
  const [deviceOpen, setDeviceOpen] = useState(false);

  useBack(step > 0, () => setStep(step - 1));

  const next = () => (haptic(), setStep(Math.min(STEPS - 1, step + 1)));

  const finish = async () => {
    s.update({ wizardDone: true });
    await useEditor.getState().newProject(name, template);
    toast(t('Project created — have fun!', 'Proje oluşturuldu — iyi eğlenceler!'), 'ok');
  };

  return (
    <div className="h-full flex flex-col ember-glow">
      {/* progress */}
      <div className="flex items-center gap-2 px-4 pt-4">
        {step > 0 ? (
          <button className="icon-btn -ml-2" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-11" />
        )}
        <div className="flex-1 flex gap-1.5">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? 'bg-acc' : 'bg-s3'}`} />
          ))}
        </div>
        <div className="w-11 text-right text-[0.75rem] text-mute">
          {step + 1}/{STEPS}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4 max-w-lg w-full mx-auto">
        {step === 0 && (
          <div className="fade-in">
            <Wordmark className="mb-8" />
            <h1 className="text-[1.6rem] font-bold leading-tight">Welcome · Hoş geldin</h1>
            <p className="text-mute mt-2 text-[0.92rem]">Choose your language · Dilini seç</p>
            <div className="grid gap-3 mt-6">
              {(
                [
                  ['tr', 'Türkçe', '🇹🇷'],
                  ['en', 'English', '🇬🇧'],
                ] as const
              ).map(([l, label, flag]) => (
                <button
                  key={l}
                  onClick={() => (s.update({ lang: l }), next())}
                  className={`card h-16 px-5 flex items-center gap-4 text-left active:scale-[0.98] transition ${s.lang === l ? 'border-acc' : ''}`}
                >
                  <span className="text-2xl">{flag}</span>
                  <span className="flex-1 font-semibold text-[1.05rem]">{label}</span>
                  {s.lang === l && <Check className="w-5 h-5 text-acc" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="fade-in">
            <h1 className="text-[1.5rem] font-bold">{t('Make it yours', 'Sana göre olsun')}</h1>
            <p className="text-mute mt-1 text-[0.9rem]">{t('Pick a theme and accent. You can change them any time in Settings.', 'Bir tema ve vurgu rengi seç. Ayarlardan istediğin zaman değiştirebilirsin.')}</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                const th = THEMES[id];
                return (
                  <button
                    key={id}
                    onClick={() => (haptic(), s.update({ theme: id }))}
                    className={`rounded-2xl p-3 border-2 text-left transition active:scale-[0.97] ${s.theme === id ? 'border-acc' : 'border-transparent'}`}
                    style={{ background: th.bg }}
                  >
                    <div className="h-16 rounded-xl p-2 flex flex-col gap-1.5" style={{ background: th.s1, border: `1px solid ${th.line}` }}>
                      <div className="h-2 w-2/3 rounded" style={{ background: th.ink, opacity: 0.8 }} />
                      <div className="h-2 w-1/2 rounded" style={{ background: th.mute }} />
                      <div className="mt-auto h-3 w-10 rounded" style={{ background: 'rgb(var(--acc))' }} />
                    </div>
                    <div className="mt-2 text-[0.85rem] font-semibold" style={{ color: th.ink }}>
                      {s.lang === 'tr' ? th.nameTr : th.name}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="label mt-6 mb-2">{t('Accent', 'Vurgu rengi')}</div>
            <div className="flex gap-3 flex-wrap">
              {(Object.keys(ACCENTS) as AccentId[]).map((a) => (
                <button
                  key={a}
                  onClick={() => (haptic(), s.update({ accent: a }))}
                  className={`w-11 h-11 rounded-full border-4 transition ${s.accent === a ? 'border-ink' : 'border-transparent'}`}
                  style={{ background: ACCENTS[a].hex }}
                  aria-label={ACCENTS[a].name}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <h1 className="text-[1.5rem] font-bold">{t('Choose a provider & model', 'Sağlayıcı ve model seç')}</h1>
            <p className="text-mute mt-1 mb-4 text-[0.9rem]">
              {t('Forge AI works right away — free, no key needed. Auto is a good default. You can also use your own Claude, OpenAI, Gemini, Groq… key, or download a model that runs offline on this phone.', 'Forge AI hemen çalışır — ücretsiz, anahtar gerekmez. Auto iyi bir varsayılan. İstersen kendi Claude, OpenAI, Gemini, Groq… anahtarını kullanabilir ya da bu telefonda internetsiz çalışan bir model indirebilirsin.')}
            </p>
            <ModelPicker onOpenDevice={() => setDeviceOpen(true)} />
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <h1 className="text-[1.5rem] font-bold">{t('Your first project', 'İlk projen')}</h1>
            <div className="label mt-5 mb-1.5">{t('Project name', 'Proje adı')}</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="label mt-5 mb-2">{t('Template', 'Şablon')}</div>
            <div className="grid gap-2">
              {(
                [
                  ['platformer', t('Platformer (playable)', 'Platform oyunu (oynanabilir)'), t('Player, platforms, coins, follow camera', 'Oyuncu, platformlar, altınlar, takip kamerası')],
                  ['starter', t('3D Starter', '3D Başlangıç'), t('Ground, sun, camera and a cube', 'Zemin, güneş, kamera ve bir küp')],
                  ['empty', t('Empty', 'Boş'), t('Start from nothing — or ask the AI', 'Sıfırdan başla — ya da yapay zekâya yaptır')],
                ] as const
              ).map(([id, label, hint]) => (
                <button key={id} onClick={() => setTemplate(id)} className={`card px-4 py-3 text-left flex items-center gap-3 ${template === id ? 'border-acc' : ''}`}>
                  <div className="flex-1">
                    <div className="font-semibold">{label}</div>
                    <div className="text-[0.75rem] text-mute">{hint}</div>
                  </div>
                  {template === id && <Check className="w-5 h-5 text-acc" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-2 max-w-lg w-full mx-auto">
        {step === 0 ? null : step < STEPS - 1 ? (
          <div className="flex gap-2">
            <button className="btn-acc flex-[2]" onClick={next}>
              {t('Continue', 'Devam')}
            </button>
          </div>
        ) : (
          <button className="btn-acc w-full" onClick={finish}>
            {t('Create & open editor', 'Oluştur ve editörü aç')}
          </button>
        )}
      </div>
      <MadeBy />
      <Sheet open={deviceOpen} onClose={() => setDeviceOpen(false)} title={t('On-device models', 'Telefondaki modeller')} full>
        <DeviceModels />
      </Sheet>
    </div>
  );
}
