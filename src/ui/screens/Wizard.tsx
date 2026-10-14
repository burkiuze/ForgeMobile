import { Check, ChevronLeft, FileKey, Github, KeyRound, Loader2, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { checkOpenRouterKey } from '../../ai/client';
import { CLOUD_MODELS } from '../../ai/models';
import { Template } from '../../core/scene';
import { useT } from '../../i18n';
import { useEditor } from '../../state/editor';
import { importEnv, maskKey, syncForgeEnv, useKeys } from '../../state/keys';
import { useSettings } from '../../state/settings';
import { ACCENTS, AccentId, THEMES, ThemeId } from '../../theme';
import { MadeBy, Wordmark, haptic, pickFiles, toast, useBack } from '../common/ui';

const STEPS = 5;

export function Wizard() {
  const t = useT();
  const s = useSettings();
  const keys = useKeys((k) => k.values);
  const [step, setStep] = useState(0);
  const [keyTab, setKeyTab] = useState<'forgeenv' | 'file' | 'paste'>('forgeenv');
  const [token, setToken] = useState(keys.GITHUB_TOKEN);
  const [repo, setRepo] = useState(s.forgeEnvRepo);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState(t('My First Game', 'İlk Oyunum'));
  const [template, setTemplate] = useState<Template>('platformer');

  useBack(step > 0, () => setStep(step - 1));

  const next = () => (haptic(), setStep(Math.min(STEPS - 1, step + 1)));

  const connect = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const got = await syncForgeEnv(repo, s.forgeEnvPath, token);
      s.update({ forgeEnvRepo: repo });
      setStatus({ ok: true, text: `${t('Imported', 'Alındı')}: ${got.join(', ')}` });
    } catch (e) {
      setStatus({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  const fromFile = async () => {
    const [f] = await pickFiles('.env,text/plain,*/*', false);
    if (!f) return;
    const got = importEnv(await f.text());
    setStatus(got.length ? { ok: true, text: `${t('Imported', 'Alındı')}: ${got.join(', ')}` } : { ok: false, text: t('No known keys in that file', 'Dosyada tanınan anahtar yok') });
  };

  const savePaste = async () => {
    if (!paste.trim()) return;
    useKeys.getState().set('OPENROUTER_API_KEY', paste.trim());
    setPaste('');
    setBusy(true);
    try {
      setStatus({ ok: true, text: await checkOpenRouterKey(paste.trim()) });
    } catch (e) {
      setStatus({ ok: false, text: `${t('Saved, but the check failed', 'Kaydedildi ama doğrulanamadı')}: ${(e as Error).message}` });
    }
    setBusy(false);
  };

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
            <h1 className="text-[1.5rem] font-bold">{t('Connect Forge AI', 'Forge AI’ı bağla')}</h1>
            <p className="text-mute mt-1 text-[0.9rem]">
              {t(
                'Keys are stored only on this phone. Easiest: connect your private Forge.env repo — the same keys as the PC app.',
                'Anahtarlar yalnızca bu telefonda saklanır. En kolayı: özel Forge.env reponu bağla — bilgisayardaki uygulamayla aynı anahtarlar.',
              )}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-5">
              {(
                [
                  ['forgeenv', <Github key="g" className="w-5 h-5" />, 'Forge.env'],
                  ['file', <FileKey key="f" className="w-5 h-5" />, t('.env file', '.env dosyası')],
                  ['paste', <KeyRound key="k" className="w-5 h-5" />, t('Paste key', 'Yapıştır')],
                ] as const
              ).map(([id, icon, label]) => (
                <button
                  key={id}
                  onClick={() => (setKeyTab(id), setStatus(null))}
                  className={`card h-20 flex flex-col items-center justify-center gap-1.5 text-[0.8rem] font-semibold ${keyTab === id ? 'border-acc text-acc' : 'text-mute'}`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {keyTab === 'forgeenv' && (
              <div className="card p-4 mt-4 space-y-3">
                <div>
                  <div className="label mb-1.5">{t('Repository', 'Depo')}</div>
                  <input className="input font-mono" value={repo} onChange={(e) => setRepo(e.target.value)} autoCapitalize="off" />
                </div>
                <div>
                  <div className="label mb-1.5">{t('GitHub token (read access)', 'GitHub token (okuma yetkisi)')}</div>
                  <input className="input font-mono" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" autoCapitalize="off" />
                  <p className="text-[0.72rem] text-mute mt-1.5 leading-snug">
                    {t(
                      'GitHub › Settings › Developer settings › Fine-grained token › only Forge.env › Contents: Read.',
                      'GitHub › Settings › Developer settings › Fine-grained token › sadece Forge.env › Contents: Read.',
                    )}
                  </p>
                </div>
                <button className="btn-acc w-full" disabled={busy || !token.trim() || !repo.trim()} onClick={connect}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                  {t('Connect Forge.env', 'Forge.env’e bağlan')}
                </button>
              </div>
            )}
            {keyTab === 'file' && (
              <div className="card p-4 mt-4 space-y-3">
                <p className="text-[0.85rem] text-mute">{t('Pick a .env file that contains OPENROUTER_API_KEY=…', 'İçinde OPENROUTER_API_KEY=… olan bir .env dosyası seç')}</p>
                <button className="btn-acc w-full" onClick={fromFile}>
                  <FileKey className="w-4 h-4" />
                  {t('Choose .env file', '.env dosyası seç')}
                </button>
              </div>
            )}
            {keyTab === 'paste' && (
              <div className="card p-4 mt-4 space-y-3">
                <input className="input font-mono" type="password" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="sk-or-v1-…" autoCapitalize="off" />
                <button className="btn-acc w-full" disabled={busy || !paste.trim()} onClick={savePaste}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {t('Save key', 'Anahtarı kaydet')}
                </button>
              </div>
            )}
            {status && <div className={`mt-3 text-[0.82rem] ${status.ok ? 'text-ok' : 'text-bad'}`}>{status.text}</div>}
            {keys.OPENROUTER_API_KEY && (
              <div className="mt-3 text-[0.8rem] text-mute flex items-center gap-2">
                <Check className="w-4 h-4 text-ok" /> OpenRouter: <span className="font-mono">{maskKey(keys.OPENROUTER_API_KEY)}</span>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <h1 className="text-[1.5rem] font-bold">{t('Choose a model', 'Model seç')}</h1>
            <p className="text-mute mt-1 text-[0.9rem]">{t('All of these are free on OpenRouter. Auto picks the best available one.', 'Hepsi OpenRouter’da ücretsiz. Auto en uygun olanı seçer.')}</p>
            <div className="grid gap-2 mt-5">
              {CLOUD_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => (haptic(), s.update({ selectedModel: m.id }))}
                  className={`card px-4 py-3 text-left flex items-center gap-3 ${s.selectedModel === m.id ? 'border-acc' : ''}`}
                >
                  <Sparkles className={`w-5 h-5 shrink-0 ${s.selectedModel === m.id ? 'text-acc' : 'text-mute'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-[0.75rem] text-mute truncate">{s.lang === 'tr' ? m.blurbTr : m.blurb}</div>
                  </div>
                  {s.selectedModel === m.id && <Check className="w-5 h-5 text-acc" />}
                </button>
              ))}
            </div>
            <p className="text-[0.75rem] text-mute mt-4">
              {t('Have a PC running Ollama or llama.cpp? Add it later in Settings › Models (local network).', 'Bilgisayarında Ollama veya llama.cpp mi var? Sonra Ayarlar › Modeller’den yerel ağdan ekleyebilirsin.')}
            </p>
          </div>
        )}

        {step === 4 && (
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
            {step === 2 && (
              <button className="btn-ghost flex-1" onClick={next}>
                {t('Skip', 'Atla')}
              </button>
            )}
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
    </div>
  );
}
