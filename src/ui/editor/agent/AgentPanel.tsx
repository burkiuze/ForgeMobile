import {
  ArrowUp, Brain, Check, ChevronDown, ChevronRight, CircleDashed, Cpu, Globe, Hand, Loader2, MessageSquarePlus, Plus, RotateCcw, Square,
  ThumbsDown, ThumbsUp, Wrench, X, Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mode } from '../../../ai/agent';
import { CLOUD_MODELS, displayName } from '../../../ai/models';
import { stripToolBlocks } from '../../../ai/tools';
import { useT } from '../../../i18n';
import { openUrl } from '../../../platform/native';
import { LlmStep, ToolStep, Turn, useChat } from '../../../state/chat';
import { useEditor } from '../../../state/editor';
import { getKey, useKeys } from '../../../state/keys';
import { useSettings } from '../../../state/settings';
import { Logo, Sheet, haptic } from '../../common/ui';
import { describe, roleLabel } from './describe';
import { Markdown } from './markdown';

const COMMANDS: { cmd: string; en: string; tr: string; expand: string }[] = [
  { cmd: '/game', en: 'Make a small complete game', tr: 'Küçük ama tam bir oyun yap', expand: 'Make a small but complete game in this scene: player controller, goal, hazards or enemies, HUD, sounds and a win/lose condition. Use real assets for characters and props.' },
  { cmd: '/level', en: 'Build a playable level', tr: 'Oynanabilir bir bölüm kur', expand: 'Build a playable level: ground, platforms or obstacles, collectibles, a goal and good lighting. Use real assets where they make sense.' },
  { cmd: '/assets', en: 'Find & import real assets', tr: 'Gerçek varlık bul ve içe aktar', expand: 'Find and import real CC0 assets (Poly Haven / ambientCG) for:' },
  { cmd: '/script', en: 'Write a script', tr: 'Betik yaz', expand: 'Write a script for' },
  { cmd: '/light', en: 'Improve lighting & mood', tr: 'Işığı ve atmosferi güzelleştir', expand: 'Improve the lighting and atmosphere of this scene:' },
  { cmd: '/fix', en: 'Find and fix problems', tr: 'Sorunları bul ve düzelt', expand: 'Find and fix problems in this scene (scripts, physics, missing assets):' },
  { cmd: '/explain', en: 'Explain this scene', tr: 'Bu sahneyi açıkla', expand: 'Explain how this scene works:' },
  { cmd: '/search', en: 'Search the web', tr: 'Web’de ara', expand: 'Search the web and summarise:' },
];

function expand(text: string): string {
  const m = /^(\/\w+)\s*(.*)$/s.exec(text.trim());
  if (!m) return text;
  const c = COMMANDS.find((x) => x.cmd === m[1]);
  return c ? `${c.expand} ${m[2]}`.trim() : text;
}

export function AgentPanel() {
  const t = useT();
  const chat = useChat();
  const project = useEditor((s) => s.project);
  const keys = useKeys((k) => k.values);
  const model = useSettings((s) => s.selectedModel);
  const [input, setInput] = useState('');
  const [modelSheet, setModelSheet] = useState(false);
  const [cmdSheet, setCmdSheet] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const empty = chat.turns.length === 0;
  const needsKey = !model.startsWith('lan:') && !keys.OPENROUTER_API_KEY;

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [chat.turns, chat.approval]);

  const send = (text = input) => {
    if (!text.trim() || chat.busy) return;
    haptic(10);
    const mode: Mode | null = text.trim().startsWith('/explain') ? 'ask' : null;
    if (mode) chat.setMode(mode);
    chat.send(expand(text));
    setInput('');
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* header */}
      <div className="flex items-center gap-2 px-3 h-12 border-b border-line/50">
        <Logo size={24} />
        <div className="font-bold flex-1">Forge AI</div>
        <button className="icon-btn w-10 h-10" disabled={chat.busy} onClick={chat.newChat} aria-label="new chat">
          <MessageSquarePlus className="w-5 h-5" />
        </button>
      </div>

      {needsKey && (
        <button
          className="mx-3 mt-3 card px-3 py-2.5 text-left text-[0.8rem] border-gold/60 bg-gold/10"
          onClick={() => useEditor.getState().openSheet('settings')}
        >
          🔑 {t('Add your OpenRouter key or connect Forge.env (Settings › API keys) to use cloud models.', 'Bulut modelleri için OpenRouter anahtarını ekle ya da Forge.env’i bağla (Ayarlar › API anahtarları).')}
        </button>
      )}

      {empty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center ember-glow">
          <Logo size={64} />
          <div className="text-[1.25rem] font-bold mt-3">{project?.name || 'Forge'}</div>
          <div className="text-[0.85rem] text-mute mt-1 max-w-xs">
            {t('Ask Forge AI to build, fix or explain anything in your game.', 'Oyununda her şeyi kurmasını, düzeltmesini veya açıklamasını Forge AI’dan iste.')}
          </div>
          <div className="w-full max-w-md mt-5">
            <InputBox value={input} setValue={setInput} onSend={send} onModel={() => setModelSheet(true)} onCmd={() => setCmdSheet(true)} big />
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-md">
            {COMMANDS.slice(0, 5).map((c) => (
              <button key={c.cmd} className="chip" onClick={() => setInput(`${c.cmd} `)}>
                <span className="font-mono text-acc">{c.cmd}</span> {t(c.en, c.tr)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div ref={list} className="flex-1 overflow-y-auto px-3 pt-3 pb-4 space-y-5">
            {chat.turns.map((turn) => (
              <TurnView key={turn.id} turn={turn} live={chat.busy && turn === chat.turns[chat.turns.length - 1]} />
            ))}
          </div>
          {chat.approval && <ApprovalCard />}
          <div className="px-3 pb-3 pt-1">
            <InputBox value={input} setValue={setInput} onSend={send} onModel={() => setModelSheet(true)} onCmd={() => setCmdSheet(true)} />
          </div>
        </>
      )}
      {empty && chat.approval && <ApprovalCard />}

      <ModelSheet open={modelSheet} onClose={() => setModelSheet(false)} />
      <Sheet open={cmdSheet} onClose={() => setCmdSheet(false)} title={t('Workflows', 'İş akışları')}>
        <div className="grid gap-1.5 pb-3">
          {COMMANDS.map((c) => (
            <button key={c.cmd} className="card px-3 py-2.5 text-left flex items-center gap-3" onClick={() => (setInput(`${c.cmd} `), setCmdSheet(false))}>
              <span className="font-mono text-acc w-16">{c.cmd}</span>
              <span className="text-[0.85rem]">{t(c.en, c.tr)}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function InputBox({ value, setValue, onSend, onModel, onCmd, big }: { value: string; setValue: (v: string) => void; onSend: (t?: string) => void; onModel: () => void; onCmd: () => void; big?: boolean }) {
  const t = useT();
  const chat = useChat();
  const model = useSettings((s) => s.selectedModel);
  const scene = useEditor((s) => s.scene);
  const ta = useRef<HTMLTextAreaElement>(null);
  const mention = /@(\w*)$/.exec(value);
  const slash = /^\/\w*$/.test(value.trim()) ? value.trim() : null;

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const modes: { v: Mode; label: string }[] = [
    { v: 'planning', label: t('Planning', 'Planlama') },
    { v: 'fast', label: t('Fast', 'Hızlı') },
    { v: 'ask', label: t('Ask', 'Sor') },
  ];

  return (
    <div className={`relative rounded-[1.4rem] bg-s1 border border-line/80 shadow-lift ${big ? 'p-3' : 'p-2.5'}`}>
      {mention && (
        <div className="absolute bottom-full left-0 right-0 mb-2 card p-1.5 max-h-48 overflow-y-auto shadow-lift z-10">
          {scene.entities
            .filter((e) => e.name.toLowerCase().replace(/ /g, '_').includes(mention[1].toLowerCase()))
            .slice(0, 8)
            .map((e) => (
              <button key={e.id} className="w-full text-left px-3 h-10 rounded-lg active:bg-s2 text-[0.85rem]" onClick={() => setValue(value.replace(/@\w*$/, `@${e.name.replace(/ /g, '_')} `))}>
                @{e.name}
              </button>
            ))}
        </div>
      )}
      {slash && (
        <div className="absolute bottom-full left-0 right-0 mb-2 card p-1.5 shadow-lift z-10">
          {COMMANDS.filter((c) => c.cmd.startsWith(slash)).map((c) => (
            <button key={c.cmd} className="w-full text-left px-3 h-10 rounded-lg active:bg-s2 text-[0.85rem] flex gap-3" onClick={() => setValue(`${c.cmd} `)}>
              <span className="font-mono text-acc w-16">{c.cmd}</span>
              <span className="text-mute truncate">{t(c.en, c.tr)}</span>
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={ta}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={t('Ask anything — @ to mention, / for workflows', 'Bir şey sor — @ ile nesne an, / iş akışları')}
        className="w-full resize-none bg-transparent outline-none text-[0.92rem] px-1.5 py-1 placeholder:text-mute/70 max-h-40"
      />
      <div className="flex items-center gap-1.5 mt-1.5">
        <button className="w-9 h-9 rounded-full bg-s2 flex items-center justify-center text-mute shrink-0" onClick={onCmd} aria-label="workflows">
          <Plus className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            className="h-8 px-2.5 rounded-full bg-s2 text-[0.75rem] font-semibold flex items-center gap-1 shrink-0"
            onClick={() => {
              const i = modes.findIndex((m) => m.v === chat.mode);
              chat.setMode(modes[(i + 1) % modes.length].v);
              haptic(4);
            }}
          >
            <ChevronDown className="w-3.5 h-3.5 text-mute" />
            {modes.find((m) => m.v === chat.mode)?.label}
          </button>
          <button
            className={`h-8 px-2.5 rounded-full text-[0.75rem] font-semibold flex items-center gap-1 shrink-0 ${chat.permission === 'auto' ? 'bg-ok/15 text-ok' : 'bg-gold/15 text-gold'}`}
            onClick={() => (haptic(6), chat.setPermission(chat.permission === 'manual' ? 'auto' : 'manual'))}
          >
            {chat.permission === 'auto' ? <Zap className="w-3.5 h-3.5" /> : <Hand className="w-3.5 h-3.5" />}
            {chat.permission === 'auto' ? 'Auto' : t('Manual', 'Manuel')}
          </button>
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${chat.web ? 'bg-acc/15 text-acc' : 'bg-s2 text-mute'}`}
            onClick={() => chat.setWeb(!chat.web)}
            aria-label="web"
          >
            <Globe className="w-4 h-4" />
          </button>
          <button className="h-8 px-2.5 rounded-full bg-s2 text-[0.75rem] font-semibold flex items-center gap-1 shrink-0 max-w-[8.5rem]" onClick={onModel}>
            <Cpu className="w-3.5 h-3.5 text-acc shrink-0" />
            <span className="truncate">{displayName(model)}</span>
          </button>
        </div>
        {chat.busy ? (
          <button className="w-10 h-10 rounded-full bg-ink text-bg flex items-center justify-center shrink-0" onClick={chat.stop} aria-label="stop">
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button className="w-10 h-10 rounded-full bg-acc text-white flex items-center justify-center shrink-0 disabled:opacity-30" disabled={!value.trim()} onClick={() => onSend()} aria-label="send">
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

function TurnView({ turn, live }: { turn: Turn; live: boolean }) {
  const t = useT();
  const chat = useChat();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const llms = turn.steps.filter((s) => s.kind === 'llm') as LlmStep[];
  const lastLlm = llms[llms.length - 1];
  const streaming = live && lastLlm && !lastLlm.ms ? stripToolBlocks(lastLlm.text) : '';
  const answer = turn.answer || (!live ? stripToolBlocks(lastLlm?.text || '') : '');

  return (
    <div className="fade-in">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[1.2rem] rounded-br-md bg-s2 border border-line/60 px-3.5 py-2.5 text-[0.9rem] whitespace-pre-wrap selectable">{turn.user}</div>
      </div>
      <div className="mt-3 space-y-1.5">
        {turn.memories.length > 0 && (
          <Collapsible open={!!open.mem} onToggle={() => toggle('mem')} icon={<Brain className="w-3.5 h-3.5" />} label={`${turn.memories.length} ${t('memories recalled', 'anı hatırlandı')}`}>
            {turn.memories.map((m, i) => (
              <div key={i} className="text-[0.75rem] text-mute">
                • {m.slice(0, 200)}
              </div>
            ))}
          </Collapsible>
        )}
        {turn.steps.map((s, i) => {
          if (s.kind === 'llm') {
            if (s === lastLlm && (live || !turn.error)) return null; // final answer rendered below
            const body = stripToolBlocks(s.text);
            if (!body.trim() && s.ms) return null;
            return (
              <Collapsible
                key={i}
                open={!!open[`s${i}`]}
                onToggle={() => toggle(`s${i}`)}
                icon={s.ms ? <Check className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                label={`${roleLabel(s.role)} · ${s.ms ? `${t('thought for', 'düşündü')} ${(s.ms / 1000).toFixed(1)}s` : t('thinking…', 'düşünüyor…')}`}
              >
                <div className="text-[0.78rem] text-mute whitespace-pre-wrap selectable">{body || '…'}</div>
              </Collapsible>
            );
          }
          return <ToolRow key={i} step={s} open={!!open[s.id]} onToggle={() => toggle(s.id)} />;
        })}
        {turn.todos.length > 0 && (
          <div className="card p-3 my-2">
            <div className="label mb-2">{t('Tasks', 'Görevler')}</div>
            {turn.todos.map((td, i) => (
              <div key={i} className="flex items-start gap-2 text-[0.84rem] py-0.5">
                {td.status === 'completed' ? (
                  <Check className="w-4 h-4 text-ok shrink-0 mt-0.5" />
                ) : td.status === 'in_progress' ? (
                  <Loader2 className="w-4 h-4 text-acc animate-spin shrink-0 mt-0.5" />
                ) : (
                  <CircleDashed className="w-4 h-4 text-mute shrink-0 mt-0.5" />
                )}
                <span className={td.status === 'completed' ? 'text-mute line-through' : ''}>{td.content}</span>
              </div>
            ))}
          </div>
        )}
        {live && (streaming ? <Markdown text={streaming} /> : <div className="h-1.5 w-24 rounded-full shimmer" />)}
        {!live && answer && <Markdown text={answer} />}
        {turn.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {turn.sources.slice(0, 6).map((s, i) => (
              <button key={i} className="chip h-7 text-[0.7rem] max-w-[12rem]" onClick={() => openUrl(s.url)}>
                <Globe className="w-3 h-3 shrink-0" />
                <span className="truncate">{s.title || s.url}</span>
              </button>
            ))}
          </div>
        )}
        {turn.infos.map((x, i) => (
          <div key={i} className="text-[0.72rem] text-mute">
            ℹ {x}
          </div>
        ))}
        {turn.error && <div className="text-[0.84rem] text-bad bg-bad/10 border border-bad/30 rounded-xl px-3 py-2 selectable">{turn.error}</div>}
        {turn.done && (
          <div className="flex items-center gap-1 pt-1">
            <span className="text-[0.7rem] text-mute flex-1 truncate">
              {lastLlm?.model ? `${displayName(lastLlm.model)} · ` : ''}
              {(turn.ms / 1000).toFixed(1)}s
            </span>
            {turn.changes > 0 && !turn.undone && (
              <button className="chip h-8 text-[0.72rem]" onClick={() => chat.undoTurn(turn.id)}>
                <RotateCcw className="w-3.5 h-3.5" /> {turn.changes} {t('changes · Undo', 'değişiklik · Geri al')}
              </button>
            )}
            {turn.undone && <span className="text-[0.72rem] text-mute">{t('undone', 'geri alındı')}</span>}
            <button className={`icon-btn w-9 h-9 ${turn.feedback === 'up' ? 'text-ok' : ''}`} onClick={() => chat.feedback(turn.id, 'up')} aria-label="good">
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button className={`icon-btn w-9 h-9 ${turn.feedback === 'down' ? 'text-bad' : ''}`} onClick={() => chat.feedback(turn.id, 'down')} aria-label="bad">
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Collapsible({ open, onToggle, icon, label, children }: { open: boolean; onToggle: () => void; icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <button className="flex items-center gap-1.5 text-[0.78rem] text-mute h-7" onClick={onToggle}>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {icon}
        <span className="truncate">{label}</span>
      </button>
      {open && <div className="pl-5 pb-1">{children}</div>}
    </div>
  );
}

function ToolRow({ step, open, onToggle }: { step: ToolStep; open: boolean; onToggle: () => void }) {
  const [verb, detail] = describe(step.call);
  const icon =
    step.status === 'running' ? (
      <Loader2 className="w-3.5 h-3.5 animate-spin text-acc" />
    ) : step.status === 'done' ? (
      <Check className="w-3.5 h-3.5 text-ok" />
    ) : step.status === 'rejected' ? (
      <X className="w-3.5 h-3.5 text-gold" />
    ) : (
      <X className="w-3.5 h-3.5 text-bad" />
    );
  return (
    <div>
      <button className="flex items-center gap-1.5 text-[0.8rem] h-7 w-full text-left" onClick={onToggle}>
        {icon}
        <Wrench className="w-3.5 h-3.5 text-mute shrink-0" />
        <span className="font-semibold shrink-0">{verb}</span>
        <span className="text-mute truncate">{detail}</span>
      </button>
      {open && step.result && <div className="ml-5 mb-1 text-[0.72rem] font-mono text-mute bg-bg rounded-lg p-2 whitespace-pre-wrap break-all selectable max-h-48 overflow-y-auto">{step.result}</div>}
    </div>
  );
}

function ApprovalCard() {
  const t = useT();
  const { approval, answerApproval } = useChat();
  const [details, setDetails] = useState(false);
  const info = useMemo(() => (approval ? describe(approval.call) : ['', '']), [approval]);
  if (!approval) return null;
  return (
    <div className="mx-3 mb-2 rounded-2xl border-2 border-gold/70 bg-s1 shadow-lift p-3 slide-up">
      <div className="flex items-center gap-2">
        <Hand className="w-4 h-4 text-gold" />
        <div className="font-bold text-[0.9rem] flex-1">{t('Approve this change?', 'Bu değişikliği onaylıyor musun?')}</div>
        <span className="text-[0.68rem] text-mute">{t('Manual mode', 'Manuel mod')}</span>
      </div>
      <div className="mt-1.5 text-[0.85rem]">
        <b>{info[0]}</b> <span className="text-mute">{info[1]}</span>
      </div>
      <button className="text-[0.72rem] text-mute mt-1 flex items-center gap-1" onClick={() => setDetails(!details)}>
        {details ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} {t('Details', 'Ayrıntılar')}
      </button>
      {details && <pre className="text-[0.68rem] font-mono bg-bg rounded-lg p-2 mt-1 max-h-40 overflow-auto whitespace-pre-wrap selectable">{JSON.stringify(approval.call.args, null, 1)}</pre>}
      <div className="grid grid-cols-3 gap-1.5 mt-2.5">
        <button className="btn-acc h-11 text-[0.82rem]" onClick={() => (haptic(10), answerApproval(true))}>
          <Check className="w-4 h-4" /> {t('Accept', 'Kabul et')}
        </button>
        <button className="btn-ghost h-11 text-[0.78rem]" onClick={() => (haptic(10), answerApproval(true, true))}>
          {t('Accept all', 'Tümünü kabul')}
        </button>
        <button className="btn-ghost h-11 text-[0.82rem] text-bad" onClick={() => (haptic(10), answerApproval(false))}>
          <X className="w-4 h-4" /> {t('Reject', 'Reddet')}
        </button>
      </div>
    </div>
  );
}

function ModelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const s = useSettings();
  const lang = s.lang;
  const pick = (id: string) => (haptic(), s.update({ selectedModel: id }), onClose());
  return (
    <Sheet open={open} onClose={onClose} title={t('Model', 'Model')}>
      <div className="grid gap-1.5 pb-2">
        {CLOUD_MODELS.map((m) => (
          <button key={m.id} className={`card px-3 py-2.5 text-left flex items-center gap-3 ${s.selectedModel === m.id ? 'border-acc' : ''}`} onClick={() => pick(m.id)}>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{m.name}</div>
              <div className="text-[0.72rem] text-mute truncate">{lang === 'tr' ? m.blurbTr : m.blurb}</div>
            </div>
            {s.selectedModel === m.id && <Check className="w-5 h-5 text-acc" />}
          </button>
        ))}
        {s.customModels.map((id) => (
          <button key={id} className={`card px-3 py-2.5 text-left flex items-center gap-3 ${s.selectedModel === id ? 'border-acc' : ''}`} onClick={() => pick(id)}>
            <div className="flex-1 font-mono text-[0.8rem] truncate">{id}</div>
            {s.selectedModel === id && <Check className="w-5 h-5 text-acc" />}
          </button>
        ))}
        {s.selectedModel.startsWith('lan:') && (
          <div className="card px-3 py-2.5 border-acc flex items-center gap-3">
            <div className="flex-1">💻 {s.selectedModel.slice(4)}</div>
            <Check className="w-5 h-5 text-acc" />
          </div>
        )}
        <button className="btn-ghost mt-1" onClick={() => (onClose(), useEditor.getState().openSheet('models'))}>
          <Cpu className="w-4 h-4" /> {t('Local network models & more…', 'Yerel ağ modelleri ve fazlası…')}
        </button>
        {!getKey('OPENROUTER_API_KEY') && <div className="text-[0.72rem] text-gold">{t('Cloud models need an OpenRouter key.', 'Bulut modelleri için OpenRouter anahtarı gerekir.')}</div>}
      </div>
    </Sheet>
  );
}
