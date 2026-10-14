import { Check, ExternalLink, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { listClaudeModels } from '../../ai/anthropic';
import { listLanModels, listModels } from '../../ai/client';
import { useDevice } from '../../ai/device';
import { MOBILE_MODELS } from '../../ai/mobileModels';
import { displayName, normalizeLanUrl, resolve } from '../../ai/models';
import { PROVIDERS, ProviderId, joinModelId, provider, splitModelId } from '../../ai/providers';
import { useT } from '../../i18n';
import { openUrl } from '../../platform/native';
import { getKey, maskKey, useKeys } from '../../state/keys';
import { useSettings } from '../../state/settings';
import { haptic, toast } from './ui';

/** Provider chips + that provider's models + inline key entry. Used by the agent panel, settings and wizard. */
export function ModelPicker({ onPicked, onOpenDevice }: { onPicked?: () => void; onOpenDevice?: () => void }) {
  const t = useT();
  const s = useSettings();
  const keys = useKeys((k) => k.values);
  const installed = useDevice((d) => d.installed);
  const current = splitModelId(s.selectedModel);
  const [prov, setProv] = useState<ProviderId>(current.provider);
  const [draftKey, setDraftKey] = useState('');
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [ownKey, setOwnKey] = useState(false);
  const p = provider(prov);
  const hasKey = !p.key || !!keys[p.key] || !!p.builtIn;
  const builtInOnly = !!p.builtIn && !keys[p.key];

  const models = useMemo(() => {
    if (prov === 'device') return MOBILE_MODELS.filter((m) => installed[m.id]).map((m) => ({ id: m.id, name: `${m.name} · ${m.quant}`, blurb: s.lang === 'tr' ? m.tr : m.en }));
    const fetched = (s.providerModels[prov] || []).map((id) => ({ id, name: id, blurb: '' }));
    const builtIn = p.models.map((m) => ({ id: m.id, name: m.name, blurb: (s.lang === 'tr' ? m.blurbTr : m.blurb) || '' }));
    const customs = s.customModels.filter((id) => splitModelId(id).provider === prov).map((id) => ({ id: splitModelId(id).model, name: splitModelId(id).model, blurb: '' }));
    const seen = new Set<string>();
    return [...builtIn, ...customs, ...fetched].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [prov, installed, s.providerModels, s.customModels, s.lang]);

  const pick = (model: string) => {
    haptic();
    s.update({ selectedModel: joinModelId(prov, model) });
    onPicked?.();
  };

  const refresh = async () => {
    setBusy(true);
    try {
      let ids: string[];
      if (prov === 'lan') ids = await listLanModels(normalizeLanUrl(s.lanUrl));
      else if (prov === 'anthropic') ids = (await listClaudeModels(getKey(p.key))).map((m) => m.id);
      else ids = await listModels(resolve(joinModelId(prov, 'x'), { lanUrl: s.lanUrl, customUrl: s.customUrl, key: getKey }));
      s.update({ providerModels: { ...s.providerModels, [prov]: ids } });
      toast(`${ids.length} ${t('models', 'model')}`, 'ok');
    } catch (e) {
      toast(`${p.name}: ${(e as Error).message}`, 'err');
    }
    setBusy(false);
  };

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {PROVIDERS.map((x) => (
          <button
            key={x.id}
            onClick={() => (haptic(4), setProv(x.id))}
            className={`chip shrink-0 ${prov === x.id ? '!bg-acc !text-white !border-acc' : ''}`}
          >
            {x.id === 'device' && <Smartphone className="w-3.5 h-3.5" />}
            {x.id === 'lan' ? t('Local network', 'Yerel ağ') : x.id === 'device' ? t('On phone', 'Telefonda') : x.id === 'custom' ? t('Custom', 'Özel') : x.name}
            {current.provider === x.id && <Check className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>
      <div className="text-[0.75rem] text-mute mb-2">
        {s.lang === 'tr' ? p.tr : p.en} {p.free && <span className="text-ok">· {t('free tier', 'ücretsiz katman')}</span>}
      </div>

      {p.key && builtInOnly && !ownKey && (
        <div className="card px-3 py-2.5 mb-2 flex items-center gap-2">
          <Check className="w-4 h-4 text-ok shrink-0" />
          <span className="text-[0.8rem] flex-1">{t('Forge AI is built in — no key needed.', 'Forge AI hazır — anahtar gerekmez.')}</span>
          <button className="text-[0.72rem] text-acc shrink-0" onClick={() => setOwnKey(true)}>
            {t('Use my own key', 'Kendi anahtarım')}
          </button>
        </div>
      )}
      {p.key && (!builtInOnly || ownKey) && (
        <div className="card px-3 py-2.5 mb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[0.72rem] font-semibold">{p.key}</span>
            <span className={`text-[0.72rem] font-mono ${keys[p.key] ? 'text-ok' : 'text-gold'}`}>{keys[p.key] ? `✓ ${maskKey(keys[p.key])}` : t('not set', 'yok')}</span>
          </div>
          {(!keys[p.key] || draftKey) && (
            <div className="flex gap-2 mt-2">
              <input className="input font-mono h-10 min-w-0" type="password" placeholder={t('paste API key', 'API anahtarını yapıştır')} value={draftKey} onChange={(e) => setDraftKey(e.target.value)} autoCapitalize="off" />
              <button className="btn-acc h-10 shrink-0" disabled={!draftKey.trim()} onClick={() => (useKeys.getState().set(p.key, draftKey), setDraftKey(''), toast('✓', 'ok'))}>
                {t('Save', 'Kaydet')}
              </button>
            </div>
          )}
          {p.keyUrl && !keys[p.key] && (
            <button className="text-[0.72rem] text-acc mt-1.5 flex items-center gap-1" onClick={() => openUrl(p.keyUrl)}>
              <ExternalLink className="w-3 h-3" /> {t('Get a key', 'Anahtar al')}
            </button>
          )}
        </div>
      )}

      {prov === 'lan' && (
        <div className="flex gap-2 mb-2">
          <input className="input font-mono" value={s.lanUrl} onChange={(e) => s.update({ lanUrl: e.target.value })} placeholder="http://192.168.1.20:11434/v1" autoCapitalize="off" />
        </div>
      )}
      {prov === 'custom' && (
        <input className="input font-mono mb-2" value={s.customUrl} onChange={(e) => s.update({ customUrl: e.target.value })} placeholder="https://api.example.com/v1" autoCapitalize="off" />
      )}

      {prov === 'device' && models.length === 0 && (
        <div className="card p-3 mb-2 text-[0.82rem]">
          {t('No model downloaded yet. Pick one that fits your phone and download it once — it then works offline.', 'Henüz indirilmiş model yok. Telefonuna uygun birini seç ve bir kez indir — sonra internetsiz çalışır.')}
        </div>
      )}

      <div className="grid gap-1.5">
        {models.map((m) => {
          const on = s.selectedModel === joinModelId(prov, m.id);
          return (
            <button key={m.id} className={`card px-3 py-2.5 text-left flex items-center gap-3 ${on ? 'border-acc' : ''}`} onClick={() => pick(m.id)}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[0.88rem] truncate">{m.name}</div>
                {m.blurb && <div className="text-[0.72rem] text-mute truncate">{m.blurb}</div>}
              </div>
              {on && <Check className="w-5 h-5 text-acc shrink-0" />}
            </button>
          );
        })}
      </div>

      {prov === 'device' ? (
        <button className="btn-acc w-full mt-2" onClick={onOpenDevice}>
          <Smartphone className="w-4 h-4" /> {t('Browse & download phone models', 'Telefon modellerine göz at ve indir')} ({MOBILE_MODELS.length})
        </button>
      ) : (
        <div className="flex gap-2 mt-2">
          <input className="input font-mono" placeholder={t('other model id', 'başka model kimliği')} value={custom} onChange={(e) => setCustom(e.target.value)} autoCapitalize="off" />
          <button
            className="btn-ghost shrink-0"
            disabled={!custom.trim()}
            onClick={() => {
              const id = joinModelId(prov, custom.trim());
              s.update({ customModels: [...new Set([...s.customModels, id])] });
              pick(custom.trim());
              setCustom('');
            }}
          >
            +
          </button>
          {(hasKey || prov === 'lan') && (
            <button className="btn-ghost shrink-0" onClick={refresh} disabled={busy} aria-label="refresh">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}
      <div className="text-[0.7rem] text-mute mt-2">
        {t('Selected', 'Seçili')}: <span className="font-semibold text-ink">{displayName(s.selectedModel)}</span>
      </div>
    </div>
  );
}
