import { Check, Cpu, Download, HardDrive, Loader2, Play, Search, Trash2, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { cancelDownload, download, remove, useDevice } from '../../ai/device';
import { MOBILE_MODELS, MobileCat, MobileModel, ramMb, sizeMb } from '../../ai/mobileModels';
import { useT } from '../../i18n';
import { deviceInfo } from '../../platform/native';
import { getKey } from '../../state/keys';
import { useSettings } from '../../state/settings';
import { Confirm, Segmented, haptic, toast } from '../common/ui';

type Filter = 'all' | MobileCat | 'installed';

const gb = (mb: number) => (mb >= 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

/** Library of quantized models that run offline on the phone. */
export function DeviceModels() {
  const t = useT();
  const s = useSettings();
  const dev = useDevice();
  const info = deviceInfo();
  const ram = info.ramMb || 0;
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [del, setDel] = useState<MobileModel | null>(null);

  const list = useMemo(
    () =>
      MOBILE_MODELS.filter((m) => (filter === 'all' ? true : filter === 'installed' ? !!dev.installed[m.id] : m.cat === filter)).filter(
        (m) => !q.trim() || `${m.name} ${m.quant} ${m.repo}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [filter, q, dev.installed],
  );

  const fit = (m: MobileModel): 'ok' | 'tight' | 'no' | 'unknown' => {
    if (!ram) return 'unknown';
    const need = ramMb(m);
    // Android keeps roughly half the RAM for the system and other apps.
    if (need <= ram * 0.45) return 'ok';
    if (need <= ram * 0.65) return 'tight';
    return 'no';
  };

  const start = async (m: MobileModel) => {
    haptic(10);
    try {
      await download(m.id, getKey('HF_TOKEN'));
      toast(`${m.name} ${m.quant} ${t('ready', 'hazır')}`, 'ok');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(`${t('Download failed', 'İndirme başarısız')}: ${(e as Error).message}`, 'err');
    }
  };

  const use = (m: MobileModel) => {
    s.update({ selectedModel: `device:${m.id}` });
    toast(`${t('Using', 'Kullanılıyor')}: ${m.name} ${m.quant}`, 'ok');
  };

  return (
    <div className="pb-6">
      <div className="card px-3 py-2.5 mb-3 flex items-center gap-4 text-[0.78rem]">
        <span className="flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-acc" /> RAM: <b>{ram ? gb(ram) : '?'}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <HardDrive className="w-4 h-4 text-acc" /> {t('Free', 'Boş')}: <b>{info.freeStorageMb ? gb(info.freeStorageMb) : '?'}</b>
        </span>
        <span className="ml-auto text-mute">{MOBILE_MODELS.length} {t('models', 'model')}</span>
      </div>
      <p className="text-[0.75rem] text-mute mb-3 leading-snug">
        {t(
          'These run fully offline on your phone (llama.cpp, quantized GGUF). Smaller = faster. Q4_K_M is the best balance; Q8_0 is higher quality but bigger. Cloud models are much smarter for building whole games — phone models are great for quick help, scripts and offline use.',
          'Bunlar tamamen internetsiz, telefonunda çalışır (llama.cpp, sıkıştırılmış GGUF). Küçük = hızlı. Q4_K_M en iyi denge; Q8_0 daha kaliteli ama büyük. Bütün oyun kurmak için bulut modeller çok daha akıllı — telefon modelleri hızlı yardım, betik ve internetsiz kullanım için ideal.',
        )}
      </p>
      <div className="relative mb-2">
        <Search className="w-4 h-4 absolute left-3 top-3.5 text-mute" />
        <input className="input pl-9" placeholder={t('Search models', 'Model ara')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto no-scrollbar mb-3">
        <Segmented
          small
          value={filter}
          onChange={setFilter}
          options={[
            { v: 'all', label: t('All', 'Tümü') },
            { v: 'installed', label: t('Downloaded', 'İndirilen') },
            { v: 'tiny', label: t('Tiny', 'Küçük') },
            { v: 'chat', label: t('Chat', 'Sohbet') },
            { v: 'code', label: t('Code', 'Kod') },
            { v: 'reasoning', label: t('Reasoning', 'Akıl') },
          ]}
        />
      </div>

      <div className="grid gap-2">
        {list.map((m) => {
          const inst = dev.installed[m.id];
          const prog = dev.progress[m.id];
          const err = dev.errors[m.id];
          const f = fit(m);
          const active = s.selectedModel === `device:${m.id}`;
          return (
            <div key={m.id} className={`card p-3 ${active ? 'border-acc' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[0.9rem]">{m.name}</span>
                    <span className="text-[0.65rem] font-mono px-1.5 py-0.5 rounded bg-s3 text-mute">{m.quant}</span>
                    {active && <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-acc text-white">{t('in use', 'kullanılıyor')}</span>}
                  </div>
                  <div className="text-[0.72rem] text-mute mt-0.5">{s.lang === 'tr' ? m.tr : m.en}</div>
                  <div className="flex items-center gap-2 mt-1.5 text-[0.7rem] flex-wrap">
                    <span className="text-mute">⬇ {gb(inst ? Math.round(inst.size / 1e6) || sizeMb(m) : sizeMb(m))}</span>
                    <span className="text-mute">RAM {gb(ramMb(m))}</span>
                    <span className="text-mute">{m.params}B · {m.ctxK}K ctx</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold ${
                        f === 'ok' ? 'bg-ok/15 text-ok' : f === 'tight' ? 'bg-gold/15 text-gold' : f === 'no' ? 'bg-bad/15 text-bad' : 'bg-s3 text-mute'
                      }`}
                    >
                      {f === 'ok' ? t('fits your phone', 'telefonuna uygun') : f === 'tight' ? t('may be slow', 'yavaş olabilir') : f === 'no' ? t('too big', 'çok büyük') : '?'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {inst ? (
                    <>
                      <button className={`h-9 px-3 rounded-xl text-[0.78rem] font-semibold flex items-center gap-1 ${active ? 'bg-s3 text-mute' : 'bg-acc text-white'}`} onClick={() => use(m)}>
                        {active ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4" />} {active ? t('Active', 'Aktif') : t('Use', 'Kullan')}
                      </button>
                      <button className="h-9 px-3 rounded-xl text-[0.78rem] bg-s2 text-bad flex items-center gap-1" onClick={() => setDel(m)}>
                        <Trash2 className="w-4 h-4" /> {t('Delete', 'Sil')}
                      </button>
                    </>
                  ) : prog != null ? (
                    <button className="h-9 px-3 rounded-xl text-[0.78rem] bg-s2 flex items-center gap-1" onClick={() => cancelDownload(m.id)}>
                      <X className="w-4 h-4" /> {t('Cancel', 'İptal')}
                    </button>
                  ) : (
                    <button className="h-9 px-3 rounded-xl text-[0.78rem] font-semibold bg-acc text-white flex items-center gap-1 disabled:opacity-40" disabled={f === 'no'} onClick={() => start(m)}>
                      <Download className="w-4 h-4" /> {t('Download', 'İndir')}
                    </button>
                  )}
                </div>
              </div>
              {prog != null && (
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-s3 overflow-hidden">
                    <div className="h-full bg-acc transition-all" style={{ width: `${Math.round(prog * 100)}%` }} />
                  </div>
                  <div className="text-[0.68rem] text-mute mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> {Math.round(prog * 100)}% · {gb(Math.round(sizeMb(m) * prog))} / {gb(sizeMb(m))}
                  </div>
                </div>
              )}
              {err && err !== 'cancelled' && <div className="text-[0.7rem] text-bad mt-1.5">{err}</div>}
              {dev.loading === m.id && (
                <div className="text-[0.7rem] text-acc mt-1.5 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> {t('loading into memory…', 'belleğe yükleniyor…')}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[0.7rem] text-mute mt-3">
        {t('Downloaded from Hugging Face. Gated repos need HF_TOKEN in Settings › API keys.', 'Hugging Face’ten indirilir. Erişim kısıtlı depolar için Ayarlar › API anahtarları’na HF_TOKEN ekle.')}
      </p>
      <Confirm
        open={!!del}
        title={t('Delete model?', 'Model silinsin mi?')}
        body={del ? `${del.name} ${del.quant}` : ''}
        okText={t('Delete', 'Sil')}
        danger
        onOk={() => del && remove(del.id).then(() => del && s.selectedModel === `device:${del.id}` && s.update({ selectedModel: 'openrouter/free' }))}
        onClose={() => setDel(null)}
      />
    </div>
  );
}
