import {
  Bot, Brain, ChevronLeft, ChevronRight, Cpu, Download, Github, Info, KeyRound, Loader2, Monitor, Palette, PenTool, RefreshCw,
  Settings as Cog, Trash2, Volume2,
} from 'lucide-react';
import React, { useState } from 'react';
import { checkOpenRouterKey, listLanModels } from '../../ai/client';
import { Memory, clearLocal } from '../../ai/memory';
import { CLOUD_MODELS, displayName, normalizeLanUrl } from '../../ai/models';
import { useT } from '../../i18n';
import { deviceInfo, http, openUrl } from '../../platform/native';
import { KeyName, importEnv, maskKey, syncForgeEnv, useKeys } from '../../state/keys';
import { useSettings } from '../../state/settings';
import { useUpdater } from '../../state/updater';
import { ACCENTS, AccentId, THEMES, ThemeId } from '../../theme';
import { Confirm, Logo, MadeBy, Row, Segmented, Sheet, Slider, Toggle, haptic, pickFiles, toast } from '../common/ui';

type Page = 'general' | 'appearance' | 'editor' | 'rendering' | 'audio' | 'ai' | 'models' | 'memory' | 'keys' | 'updates' | 'about';

export function SettingsSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Page }) {
  const t = useT();
  const [page, setPage] = useState<Page | null>(initial ?? null);
  const pages: { id: Page; icon: React.ReactNode; title: string; hint: string }[] = [
    { id: 'general', icon: <Cog className="w-5 h-5" />, title: t('General', 'Genel'), hint: t('Language, start screen, autosave', 'Dil, açılış ekranı, otomatik kayıt') },
    { id: 'appearance', icon: <Palette className="w-5 h-5" />, title: t('Appearance', 'Görünüm'), hint: t('Theme, accent colour, size', 'Tema, vurgu rengi, boyut') },
    { id: 'editor', icon: <PenTool className="w-5 h-5" />, title: t('Editor', 'Editör'), hint: t('Camera, gizmos, snapping', 'Kamera, gizmolar, yapışma') },
    { id: 'rendering', icon: <Monitor className="w-5 h-5" />, title: t('Rendering', 'Görüntü'), hint: t('Shadows, quality, stats', 'Gölgeler, kalite, istatistik') },
    { id: 'audio', icon: <Volume2 className="w-5 h-5" />, title: t('Audio', 'Ses'), hint: t('Volume, mute', 'Ses düzeyi, sessiz') },
    { id: 'ai', icon: <Bot className="w-5 h-5" />, title: t('Forge AI', 'Forge AI'), hint: t('On/off, permissions, modes, web', 'Aç/kapa, izinler, modlar, web') },
    { id: 'models', icon: <Cpu className="w-5 h-5" />, title: t('Agents & models', 'Ajanlar ve modeller'), hint: t('OpenRouter, local network, per-agent', 'OpenRouter, yerel ağ, ajan başına') },
    { id: 'memory', icon: <Brain className="w-5 h-5" />, title: t('Agent memory', 'Ajan hafızası'), hint: 'Built-in / TencentDB Agent Memory' },
    { id: 'keys', icon: <KeyRound className="w-5 h-5" />, title: t('API keys & Forge.env', 'API anahtarları ve Forge.env'), hint: 'OpenRouter, Hugging Face, GitHub' },
    { id: 'updates', icon: <RefreshCw className="w-5 h-5" />, title: t('Updates', 'Güncellemeler'), hint: t('Automatic updates from GitHub', 'GitHub’dan otomatik güncelleme') },
    { id: 'about', icon: <Info className="w-5 h-5" />, title: t('About', 'Hakkında'), hint: 'Forge Mobile' },
  ];
  const cur = pages.find((p) => p.id === page);
  return (
    <Sheet
      open={open}
      onClose={() => (page ? setPage(null) : onClose())}
      full
      title={
        cur ? (
          <button className="flex items-center gap-1 -ml-1" onClick={() => setPage(null)}>
            <ChevronLeft className="w-5 h-5" /> {cur.title}
          </button>
        ) : (
          t('Settings', 'Ayarlar')
        )
      }
    >
      {!page && (
        <div className="grid gap-2 pb-4">
          {pages.map((p) => (
            <button key={p.id} className="card flex items-center gap-3 px-4 py-3 text-left active:opacity-70" onClick={() => (haptic(), setPage(p.id))}>
              <span className="w-10 h-10 rounded-xl bg-s2 flex items-center justify-center text-acc">{p.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{p.title}</span>
                <span className="block text-[0.75rem] text-mute truncate">{p.hint}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-mute" />
            </button>
          ))}
          <MadeBy />
        </div>
      )}
      {page === 'general' && <General />}
      {page === 'appearance' && <Appearance />}
      {page === 'editor' && <EditorPrefs />}
      {page === 'rendering' && <Rendering />}
      {page === 'audio' && <AudioPrefs />}
      {page === 'ai' && <AiPrefs />}
      {page === 'models' && <ModelsPrefs />}
      {page === 'memory' && <MemoryPrefs />}
      {page === 'keys' && <KeysPrefs />}
      {page === 'updates' && <UpdatesPrefs />}
      {page === 'about' && <About />}
    </Sheet>
  );
}

function General() {
  const t = useT();
  const s = useSettings();
  return (
    <div className="card px-4 py-1 mb-4">
      <Row label={t('Language', 'Dil')}>
        <Segmented value={s.lang} onChange={(lang) => s.update({ lang })} options={[{ v: 'tr', label: 'Türkçe' }, { v: 'en', label: 'English' }]} small />
      </Row>
      <Row label={t('Show start screen', 'Açılış ekranını göster')} hint={t('Off: opens the last project directly', 'Kapalı: son projeyi doğrudan açar')}>
        <Toggle value={s.showStartScreen} onChange={(v) => s.update({ showStartScreen: v })} />
      </Row>
      <Row label={t('Autosave', 'Otomatik kayıt')} hint={t('Saves a moment after every change', 'Her değişiklikten kısa süre sonra kaydeder')}>
        <Toggle value={s.autosave} onChange={(v) => s.update({ autosave: v })} />
      </Row>
      <Row label={t('Haptic feedback', 'Titreşimli geri bildirim')}>
        <Toggle value={s.haptics} onChange={(v) => s.update({ haptics: v })} />
      </Row>
      <Row label={t('Your name', 'Adın')} hint={t('Used by the agent memory', 'Ajan hafızası kullanır')}>
        <input className="input w-40" value={s.profileName} onChange={(e) => s.update({ profileName: e.target.value })} />
      </Row>
      <Row label={t('Run setup wizard again', 'Kurulum sihirbazını yeniden çalıştır')}>
        <button className="btn-ghost h-9" onClick={() => (s.update({ wizardDone: false }), location.reload())}>
          {t('Open', 'Aç')}
        </button>
      </Row>
    </div>
  );
}

function Appearance() {
  const t = useT();
  const s = useSettings();
  return (
    <div className="pb-4">
      <div className="label mb-2">{t('Theme', 'Tema')}</div>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(THEMES) as ThemeId[]).map((id) => {
          const th = THEMES[id];
          return (
            <button
              key={id}
              onClick={() => (haptic(), s.update({ theme: id }))}
              className={`rounded-2xl p-3 border-2 text-left ${s.theme === id ? 'border-acc' : 'border-line/40'}`}
              style={{ background: th.bg }}
            >
              <div className="h-14 rounded-xl p-2 flex flex-col gap-1.5" style={{ background: th.s1, border: `1px solid ${th.line}` }}>
                <div className="h-2 w-2/3 rounded" style={{ background: th.ink, opacity: 0.8 }} />
                <div className="h-2 w-1/2 rounded" style={{ background: th.mute }} />
              </div>
              <div className="mt-2 text-[0.85rem] font-semibold" style={{ color: th.ink }}>
                {s.lang === 'tr' ? th.nameTr : th.name}
              </div>
            </button>
          );
        })}
      </div>
      <div className="label mt-5 mb-2">{t('Accent colour', 'Vurgu rengi')}</div>
      <div className="flex gap-3 flex-wrap">
        {(Object.keys(ACCENTS) as AccentId[]).map((a) => (
          <button
            key={a}
            onClick={() => (haptic(), s.update({ accent: a }))}
            className={`w-11 h-11 rounded-full border-4 ${s.accent === a ? 'border-ink' : 'border-transparent'}`}
            style={{ background: ACCENTS[a].hex }}
            aria-label={ACCENTS[a].name}
          />
        ))}
      </div>
      <div className="card px-4 py-1 mt-5">
        <Row label={t('Interface size', 'Arayüz boyutu')}>
          <Slider value={s.uiScale} min={0.85} max={1.3} step={0.05} onChange={(v) => s.update({ uiScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
        </Row>
      </div>
    </div>
  );
}

function EditorPrefs() {
  const t = useT();
  const s = useSettings();
  return (
    <div className="card px-4 py-1 mb-4">
      <Row label={t('Camera speed', 'Kamera hızı')}>
        <Slider value={s.cameraSpeed} min={0.3} max={3} step={0.1} onChange={(v) => s.update({ cameraSpeed: v })} format={(v) => `${v.toFixed(1)}×`} />
      </Row>
      <Row label={t('Gizmo size', 'Gizmo boyutu')}>
        <Slider value={s.gizmoSize} min={0.6} max={2} step={0.1} onChange={(v) => s.update({ gizmoSize: v })} format={(v) => `${v.toFixed(1)}×`} />
      </Row>
      <Row label={t('Grid', 'Izgara')}>
        <Toggle value={s.showGrid} onChange={(v) => s.update({ showGrid: v })} />
      </Row>
      <Row label={t('Light & camera icons', 'Işık ve kamera simgeleri')}>
        <Toggle value={s.showIcons} onChange={(v) => s.update({ showIcons: v })} />
      </Row>
      <Row label={t('Snap while moving', 'Taşırken yapış')}>
        <Toggle value={s.snap} onChange={(v) => s.update({ snap: v })} />
      </Row>
      <Row label={t('Snap step', 'Yapışma adımı')}>
        <Segmented value={String(s.snapStep)} onChange={(v) => s.update({ snapStep: Number(v) })} options={['0.25', '0.5', '1'].map((v) => ({ v, label: v }))} small />
      </Row>
    </div>
  );
}

function Rendering() {
  const t = useT();
  const s = useSettings();
  return (
    <div className="card px-4 py-1 mb-4">
      <Row label={t('Shadows', 'Gölgeler')}>
        <Toggle value={s.shadows} onChange={(v) => s.update({ shadows: v })} />
      </Row>
      <Row label={t('Anti-aliasing', 'Kenar yumuşatma')} hint={t('Applies after reopening the project', 'Projeyi yeniden açınca uygulanır')}>
        <Toggle value={s.antialias} onChange={(v) => s.update({ antialias: v })} />
      </Row>
      <Row label={t('Render resolution', 'Çizim çözünürlüğü')} hint={t('Lower = faster and cooler phone', 'Düşük = daha hızlı, telefon daha az ısınır')}>
        <Slider value={s.renderScale} min={0.5} max={1.5} step={0.25} onChange={(v) => s.update({ renderScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
      </Row>
      <Row label={t('Show FPS / stats', 'FPS / istatistik göster')}>
        <Toggle value={s.showStats} onChange={(v) => s.update({ showStats: v })} />
      </Row>
    </div>
  );
}

function AudioPrefs() {
  const t = useT();
  const s = useSettings();
  return (
    <div className="card px-4 py-1 mb-4">
      <Row label={t('Master volume', 'Ana ses')}>
        <Slider value={s.masterVolume} min={0} max={1} step={0.05} onChange={(v) => s.update({ masterVolume: v })} format={(v) => `${Math.round(v * 100)}%`} />
      </Row>
      <Row label={t('Mute', 'Sessiz')}>
        <Toggle value={s.muted} onChange={(v) => s.update({ muted: v })} />
      </Row>
    </div>
  );
}

function AiPrefs() {
  const t = useT();
  const s = useSettings();
  return (
    <div className="pb-4">
      <div className="card px-4 py-1">
        <Row label={<b>{t('Enable Forge AI', 'Forge AI’ı etkinleştir')}</b>} hint={t('Off hides the AI tab; nothing is sent to any model.', 'Kapalıyken AI sekmesi gizlenir; hiçbir modele veri gitmez.')}>
          <Toggle value={s.aiEnabled} onChange={(v) => s.update({ aiEnabled: v })} />
        </Row>
        <Row
          label={t('Permission mode', 'İzin modu')}
          hint={t('Manual: you Accept/Reject every change, download and install. Auto: accepted automatically.', 'Manuel: her değişikliği, indirmeyi ve kurulumu sen onaylarsın. Auto: otomatik kabul.')}
        >
          <Segmented value={s.permission} onChange={(permission) => s.update({ permission })} options={[{ v: 'manual', label: t('✋ Manual', '✋ Manuel') }, { v: 'auto', label: '⚡ Auto' }]} small />
        </Row>
        <Row label={t('Default mode', 'Varsayılan mod')}>
          <Segmented
            value={s.defaultMode}
            onChange={(defaultMode) => s.update({ defaultMode })}
            options={[{ v: 'planning', label: t('Plan', 'Plan') }, { v: 'fast', label: t('Fast', 'Hızlı') }, { v: 'ask', label: t('Ask', 'Sor') }]}
            small
          />
        </Row>
        <Row label={t('Web search from this phone', 'Bu telefondan web araması')}>
          <Toggle value={s.web} onChange={(v) => s.update({ web: v })} />
        </Row>
        <Row label={t('Results per search', 'Arama başına sonuç')}>
          <Slider value={s.webResults} min={2} max={10} step={1} onChange={(v) => s.update({ webResults: v })} format={(v) => String(v)} />
        </Row>
        <Row label={t('Context turns', 'Bağlam tur sayısı')} hint={t('Older turns are summarised', 'Eski turlar özetlenir')}>
          <Slider value={s.contextTurns} min={2} max={20} step={1} onChange={(v) => s.update({ contextTurns: v })} format={(v) => String(v)} />
        </Row>
        <Row label={t('Max builder steps', 'En fazla kurucu adımı')}>
          <Slider value={s.maxSteps} min={2} max={20} step={1} onChange={(v) => s.update({ maxSteps: v })} format={(v) => String(v)} />
        </Row>
        <Row label={t('Temperature', 'Sıcaklık')} hint={t('Low = precise, high = creative', 'Düşük = kesin, yüksek = yaratıcı')}>
          <Slider value={s.temperature} min={0} max={1.2} step={0.05} onChange={(v) => s.update({ temperature: v })} />
        </Row>
        <Row label={t('Planner agent', 'Planlayıcı ajan')}>
          <Toggle value={s.usePlanner} onChange={(v) => s.update({ usePlanner: v })} />
        </Row>
        <Row label={t('Reviewer agent', 'Denetçi ajan')}>
          <Toggle value={s.useReviewer} onChange={(v) => s.update({ useReviewer: v })} />
        </Row>
      </div>
    </div>
  );
}

function ModelsPrefs() {
  const t = useT();
  const s = useSettings();
  const [lanModels, setLanModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState('');
  const all = [...CLOUD_MODELS.map((m) => m.id), ...s.customModels, ...lanModels.map((m) => `lan:${m}`)];
  const opts = [{ v: '', label: t('Same as main', 'Ana modelle aynı') }, ...all.map((v) => ({ v, label: displayName(v) }))];
  const scan = async () => {
    setBusy(true);
    try {
      const ms = await listLanModels(normalizeLanUrl(s.lanUrl));
      setLanModels(ms);
      toast(`${ms.length} ${t('models found', 'model bulundu')}`, 'ok');
    } catch (e) {
      toast(`${t('Server not reachable', 'Sunucuya ulaşılamadı')}: ${(e as Error).message}`, 'err');
    }
    setBusy(false);
  };
  return (
    <div className="pb-4 space-y-4">
      <div className="card px-4 py-3 space-y-2">
        <div className="font-semibold">{t('Main model', 'Ana model')}</div>
        <select className="input" value={s.selectedModel} onChange={(e) => s.update({ selectedModel: e.target.value })}>
          {[...new Set([s.selectedModel, ...all])].map((v) => (
            <option key={v} value={v}>
              {displayName(v)}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input className="input font-mono" placeholder="vendor/model:free" value={custom} onChange={(e) => setCustom(e.target.value)} autoCapitalize="off" />
          <button
            className="btn-ghost"
            disabled={!custom.trim()}
            onClick={() => (s.update({ customModels: [...new Set([...s.customModels, custom.trim()])], selectedModel: custom.trim() }), setCustom(''))}
          >
            +
          </button>
        </div>
        <div className="text-[0.72rem] text-mute">{t('Any OpenRouter model id works.', 'Herhangi bir OpenRouter model kimliği olur.')}</div>
      </div>

      <div className="card px-4 py-3 space-y-2">
        <div className="font-semibold">{t('Local models on your network', 'Ağındaki yerel modeller')}</div>
        <div className="text-[0.75rem] text-mute">
          {t(
            'Phones are too small for big models, so run them on your PC (Forge desktop’s llama.cpp, Ollama or LM Studio) and use them from here over Wi-Fi.',
            'Telefonlar büyük modeller için küçük; modelleri bilgisayarında çalıştır (Forge masaüstü llama.cpp, Ollama veya LM Studio) ve buradan Wi-Fi üzerinden kullan.',
          )}
        </div>
        <input className="input font-mono" value={s.lanUrl} onChange={(e) => s.update({ lanUrl: e.target.value })} placeholder="http://192.168.1.20:11434/v1" autoCapitalize="off" />
        <button className="btn-ghost w-full" onClick={scan} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {t('Find models', 'Modelleri bul')}
        </button>
        {lanModels.map((m) => (
          <button key={m} className={`w-full text-left px-3 py-2 rounded-xl ${s.selectedModel === `lan:${m}` ? 'bg-acc/15 text-acc' : 'bg-s2'}`} onClick={() => s.update({ selectedModel: `lan:${m}` })}>
            💻 {m}
          </button>
        ))}
      </div>

      <div className="card px-4 py-3">
        <div className="font-semibold mb-1">{t('Per-agent models', 'Ajan başına modeller')}</div>
        {(
          [
            ['plannerModel', t('Planner', 'Planlayıcı')],
            ['builderModel', t('Builder', 'Kurucu')],
            ['coderModel', t('Coder', 'Kodlayıcı')],
            ['reviewerModel', t('Reviewer', 'Denetçi')],
            ['exploreModel', t('Explore', 'Kâşif')],
          ] as const
        ).map(([k, label]) => (
          <Row key={k} label={label}>
            <select className="input w-44" value={s[k]} onChange={(e) => s.update({ [k]: e.target.value } as any)}>
              {opts.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </Row>
        ))}
      </div>
    </div>
  );
}

function MemoryPrefs() {
  const t = useT();
  const s = useSettings();
  const m = s.memory;
  const set = (p: Partial<typeof m>) => s.update({ memory: { ...m, ...p } });
  const [status, setStatus] = useState('');
  const [confirm, setConfirm] = useState(false);
  const test = async () => {
    setStatus('…');
    try {
      setStatus(`✓ ${await new Memory(m).health()}`);
    } catch (e) {
      setStatus(`✖ ${(e as Error).message}`);
    }
  };
  return (
    <div className="pb-4 space-y-4">
      <div className="card px-4 py-1">
        <Row label={t('Memory', 'Hafıza')}>
          <Segmented value={m.backend} onChange={(backend) => set({ backend })} options={[{ v: 'builtin', label: t('Built-in', 'Yerleşik') }, { v: 'tencentdb', label: 'TencentDB' }, { v: 'off', label: t('Off', 'Kapalı') }]} small />
        </Row>
      </div>
      {m.backend === 'tencentdb' && (
        <div className="card px-4 py-3 space-y-2">
          <div className="text-[0.75rem] text-mute">
            {t('TencentDB Agent Memory (Memory Core) running on your PC, default port 8420.', 'Bilgisayarında çalışan TencentDB Agent Memory (Memory Core), varsayılan port 8420.')}
          </div>
          <input className="input font-mono" value={m.url} onChange={(e) => set({ url: e.target.value })} autoCapitalize="off" />
          <input className="input font-mono" type="password" placeholder="KERNEL_AUTH_TOKEN" value={m.token} onChange={(e) => set({ token: e.target.value })} />
          <input className="input font-mono" placeholder="user id" value={m.userId} onChange={(e) => set({ userId: e.target.value })} />
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={test}>
          {t('Test', 'Test et')}
        </button>
        <button className="btn-danger flex-1" onClick={() => setConfirm(true)}>
          <Trash2 className="w-4 h-4" /> {t('Clear local memory', 'Yerel hafızayı sil')}
        </button>
      </div>
      {status && <div className="text-[0.82rem] text-mute">{status}</div>}
      <Confirm open={confirm} title={t('Clear local memory?', 'Yerel hafıza silinsin mi?')} okText={t('Clear', 'Sil')} danger onOk={() => (clearLocal(), toast('✓'))} onClose={() => setConfirm(false)} />
    </div>
  );
}

function KeysPrefs() {
  const t = useT();
  const s = useSettings();
  const keys = useKeys();
  const [show, setShow] = useState<KeyName | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [token, setToken] = useState(keys.values.GITHUB_TOKEN);
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    setBusy(true);
    try {
      const got = await syncForgeEnv(s.forgeEnvRepo, s.forgeEnvPath, token);
      toast(`✓ Forge.env: ${got.join(', ')}`, 'ok');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
    setBusy(false);
  };
  const test = async (k: KeyName) => {
    const v = keys.values[k];
    if (!v) return;
    try {
      if (k === 'OPENROUTER_API_KEY') toast(await checkOpenRouterKey(v), 'ok');
      else if (k === 'HF_TOKEN') {
        const r = await http({ url: 'https://huggingface.co/api/whoami-v2', headers: { Authorization: `Bearer ${v}` } });
        toast(r.ok ? `OK · ${r.json().name}` : `HTTP ${r.status}`, r.ok ? 'ok' : 'err');
      } else {
        const r = await http({ url: 'https://api.github.com/user', headers: { Authorization: `Bearer ${v}` } });
        toast(r.ok ? `OK · ${r.json().login}` : `HTTP ${r.status}`, r.ok ? 'ok' : 'err');
      }
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };
  const fromFile = async () => {
    const [f] = await pickFiles('.env,text/plain,*/*', false);
    if (!f) return;
    const got = importEnv(await f.text());
    toast(got.length ? `✓ ${got.join(', ')}` : t('No known keys in that file', 'Dosyada tanınan anahtar yok'), got.length ? 'ok' : 'err');
  };
  return (
    <div className="pb-4 space-y-4">
      <div className="card px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <Github className="w-5 h-5" /> Forge.env
        </div>
        <div className="text-[0.75rem] text-mute">
          {t('Reads .env from your private repo with a read-only GitHub token. Nothing is uploaded.', 'Özel reponundaki .env dosyasını salt-okunur GitHub token ile okur. Hiçbir şey yüklenmez.')}
        </div>
        <div className="flex gap-2">
          <input className="input font-mono flex-[2]" value={s.forgeEnvRepo} onChange={(e) => s.update({ forgeEnvRepo: e.target.value })} autoCapitalize="off" />
          <input className="input font-mono flex-1" value={s.forgeEnvPath} onChange={(e) => s.update({ forgeEnvPath: e.target.value })} autoCapitalize="off" />
        </div>
        <input className="input font-mono" type="password" placeholder="github_pat_…" value={token} onChange={(e) => setToken(e.target.value)} autoCapitalize="off" />
        <div className="flex gap-2">
          <button className="btn-acc flex-1" disabled={busy || !token.trim()} onClick={connect}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {t('Sync now', 'Şimdi eşitle')}
          </button>
          <button className="btn-ghost flex-1" onClick={fromFile}>
            {t('.env file…', '.env dosyası…')}
          </button>
        </div>
      </div>
      {(['OPENROUTER_API_KEY', 'HF_TOKEN', 'GITHUB_TOKEN'] as KeyName[]).map((k) => (
        <div key={k} className="card px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[0.8rem] font-semibold">{k}</div>
            <div className="text-[0.75rem] text-mute font-mono">{keys.values[k] ? (show === k ? keys.values[k] : maskKey(keys.values[k])) : t('not set', 'yok')}</div>
          </div>
          <div className="flex gap-2">
            <input
              className="input font-mono"
              type="password"
              placeholder={t('paste to replace', 'değiştirmek için yapıştır')}
              value={drafts[k] || ''}
              onChange={(e) => setDrafts({ ...drafts, [k]: e.target.value })}
              autoCapitalize="off"
            />
            <button className="btn-ghost" disabled={!drafts[k]?.trim()} onClick={() => (keys.set(k, drafts[k]), setDrafts({ ...drafts, [k]: '' }), toast('✓', 'ok'))}>
              {t('Save', 'Kaydet')}
            </button>
          </div>
          {keys.values[k] && (
            <div className="flex gap-2">
              <button className="chip" onClick={() => setShow(show === k ? null : k)}>
                {show === k ? t('Hide', 'Gizle') : t('Show', 'Göster')}
              </button>
              <button className="chip" onClick={() => test(k)}>
                {t('Test', 'Test et')}
              </button>
              <button className="chip text-bad" onClick={() => keys.remove(k)}>
                {t('Remove', 'Kaldır')}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UpdatesPrefs() {
  const t = useT();
  const s = useSettings();
  const up = useUpdater();
  const info = deviceInfo();
  return (
    <div className="pb-4 space-y-4">
      <div className="card px-4 py-1">
        <Row label={t('Check for updates at launch', 'Açılışta güncellemeleri denetle')} hint={t('New GitHub releases are offered automatically', 'Yeni GitHub sürümleri otomatik önerilir')}>
          <Toggle value={s.autoUpdate} onChange={(v) => s.update({ autoUpdate: v })} />
        </Row>
        <Row label={t('Installed', 'Yüklü sürüm')}>
          <span className="text-[0.85rem] text-mute">
            {info.versionName} (build {info.versionCode})
          </span>
        </Row>
        <Row label={t('Latest on GitHub', 'GitHub’daki son sürüm')}>
          <span className="text-[0.85rem] text-mute">{up.latest ? `build ${up.latest.build}` : up.state === 'failed' ? up.error : '—'}</span>
        </Row>
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={() => up.check()} disabled={up.state === 'checking'}>
          {up.state === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {t('Check now', 'Şimdi denetle')}
        </button>
        {up.state === 'available' && (
          <button className="btn-acc flex-1" onClick={() => up.install()}>
            <Download className="w-4 h-4" /> {t('Update', 'Güncelle')}
          </button>
        )}
      </div>
    </div>
  );
}

function About() {
  const t = useT();
  const info = deviceInfo();
  return (
    <div className="pb-6 flex flex-col items-center text-center gap-2 pt-4">
      <Logo size={72} />
      <div className="text-[1.4rem] font-black tracking-[0.18em]">FORGE</div>
      <div className="text-[0.7rem] tracking-[0.35em] text-mute">SHAPED BY FIRE</div>
      <div className="text-[0.85rem] text-mute mt-3 max-w-xs">
        {t('The phone edition of Forge: the same scenes, scripts, assets and AI agents as the desktop editor.', 'Forge’un telefon sürümü: masaüstü editörle aynı sahneler, betikler, varlıklar ve yapay zekâ ajanları.')}
      </div>
      <div className="text-[0.75rem] text-mute">
        v{info.versionName} · build {info.versionCode} {info.device ? `· ${info.device}` : ''}
      </div>
      <div className="flex gap-2 mt-3">
        <button className="chip" onClick={() => openUrl('https://github.com/burkiuze/ForgeMobile')}>
          <Github className="w-4 h-4" /> ForgeMobile
        </button>
        <button className="chip" onClick={() => openUrl('https://github.com/burkiuze/Forge')}>
          <Github className="w-4 h-4" /> Forge (PC)
        </button>
      </div>
      <MadeBy />
    </div>
  );
}
