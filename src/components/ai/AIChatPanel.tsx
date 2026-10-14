import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Globe,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  RotateCcw,
  Check,
  Cpu,
  Layers,
  Wrench,
} from 'lucide-react';
import { useAIStore } from '../../store/useAIStore';
import { useEditorStore } from '../../store/useEditorStore';
import { ForgeLogo } from '../ForgeLogo';
import { AIMode, AIPermission } from '../../types';
import { useTranslation } from '../../i18n';

export const AIChatPanel: React.FC = () => {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [showSlashPopup, setShowSlashPopup] = useState(false);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    mode,
    setMode,
    permission,
    setPermission,
    selectedModel,
    webSearchEnabled,
    setWebSearchEnabled,
    isStreaming,
    activeThoughts,
    activeDuration,
    activeToolCalls,
    activeTodos,
    pendingApproval,
    unreviewedChangesCount,
    sendMessage,
    stopStreaming,
    acceptApproval,
    rejectApproval,
    reviewChanges,
    undoChanges,
    setMessageFeedback,
  } = useAIStore();

  const { currentProject, setModelLibraryModalOpen } = useEditorStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, activeThoughts, activeToolCalls, pendingApproval]);

  const slashCommands = [
    { cmd: '/level', desc: t('Generate level layout & platforms', 'Bölüm tasarımı ve platformlar oluştur') },
    { cmd: '/game', desc: t('Create complete game loop', 'Tam oyun döngüsü kur') },
    { cmd: '/script', desc: t('Write or edit component script', 'Komut dosyası yaz') },
    { cmd: '/light', desc: t('Adjust scene lighting & atmosphere', 'Işık ve atmosferi ayarla') },
    { cmd: '/fix', desc: t('Diagnose & resolve scene issues', 'Sorunları teşhis et ve çöz') },
    { cmd: '/explain', desc: t('Explain entity setup & hierarchy', 'Varlık yapısını açıkla') },
    { cmd: '/search', desc: t('Search CC0 assets online', 'CC0 varlık ara') },
  ];

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (val.endsWith('/')) {
      setShowSlashPopup(true);
      setShowMentionPopup(false);
    } else if (val.endsWith('@')) {
      setShowMentionPopup(true);
      setShowSlashPopup(false);
    } else if (!val.includes('/') && !val.includes('@')) {
      setShowSlashPopup(false);
      setShowMentionPopup(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return;
    sendMessage(inputText);
    setInputText('');
    setShowSlashPopup(false);
    setShowMentionPopup(false);
  };

  const toggleThought = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isChatEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-forge-bg select-none relative pb-12">
      {/* Changes Review / Undo Bar */}
      {unreviewedChangesCount > 0 && (
        <div className="bg-forge-orange/15 border-b border-forge-orange/40 px-3 py-2 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-forge-orange animate-pulse" />
            <span className="text-xs font-bold text-forge-bone">
              {unreviewedChangesCount} {t('changes generated', 'değişiklik yapıldı')}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={reviewChanges}
              className="px-2.5 py-1 rounded-lg bg-forge-orange text-white text-[11px] font-bold active:scale-95"
            >
              {t('Review', 'İncele')}
            </button>
            <button
              onClick={undoChanges}
              className="px-2 py-1 rounded-lg bg-forge-panelElevated text-forge-boneMuted text-[11px] hover:text-forge-bone flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('Undo', 'Geri Al')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State vs Message Feed */}
      {isChatEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ForgeLogo size="lg" showTagline={false} />
          <h3 className="mt-3 text-sm font-bold text-forge-bone">
            {currentProject?.name || 'Platformer'} Co-Pilot
          </h3>
          <p className="text-xs text-forge-boneMuted max-w-[280px] mt-1">
            {t(
              'Ask to build levels, import CC0 assets, synthesize chiptune sounds, or write game logic scripts.',
              'Bölüm inşa etmesini, CC0 varlık aramasını, ses üretmesini veya komut yazmasını isteyin.'
            )}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5 justify-center max-w-xs">
            <button
              onClick={() => setInputText('/level Create 3 floating platforms with collectible coins')}
              className="px-2.5 py-1 rounded-full bg-forge-panel border border-forge-borderSubtle text-[11px] text-forge-boneMuted hover:border-forge-orange hover:text-forge-bone transition-all"
            >
              /level Floating islands & coins
            </button>
            <button
              onClick={() => setInputText('/light Add a golden sunset atmosphere')}
              className="px-2.5 py-1 rounded-full bg-forge-panel border border-forge-borderSubtle text-[11px] text-forge-boneMuted hover:border-forge-orange hover:text-forge-bone transition-all"
            >
              /light Sunset atmosphere
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* User Bubble */}
              {msg.sender === 'user' ? (
                <div className="max-w-[85%] bg-forge-orange text-white px-3.5 py-2.5 rounded-2xl rounded-br-none text-xs font-medium shadow-sm">
                  {msg.text}
                </div>
              ) : (
                <div className="max-w-[95%] space-y-2">
                  {/* Collapsible Thought Card */}
                  {msg.thoughts && msg.thoughts.length > 0 && (
                    <div className="bg-forge-panel border border-forge-borderSubtle rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => toggleThought(msg.id)}
                        className="w-full px-3 py-2 flex items-center justify-between text-left text-xs font-bold text-forge-boneMuted hover:text-forge-bone"
                      >
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-3.5 h-3.5 text-forge-gold" />
                          <span>
                            {t('Thought for', 'Düşündü')} {msg.thoughtDurationSeconds || '1.8'}s
                          </span>
                        </div>
                        {expandedThoughts[msg.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>

                      {expandedThoughts[msg.id] && (
                        <div className="px-3 pb-2.5 pt-1 border-t border-forge-borderSubtle/60 text-[11px] text-forge-boneMuted space-y-1">
                          {msg.thoughts.map((th, i) => (
                            <p key={i}>• {th}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool Call Rows */}
                  {msg.toolCalls && msg.toolCalls.map((tc) => (
                    <div
                      key={tc.id}
                      className="bg-forge-panelElevated border border-forge-borderSubtle rounded-xl px-3 py-2 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center space-x-2">
                        <Wrench className="w-3.5 h-3.5 text-forge-orange" />
                        <span className="text-forge-orange font-bold">{tc.tool}</span>
                        <span className="text-[10px] text-forge-boneMuted truncate max-w-[120px]">
                          {JSON.stringify(tc.params)}
                        </span>
                      </div>
                      <span className="text-[10px] text-forge-success font-bold flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Done</span>
                      </span>
                    </div>
                  ))}

                  {/* Todo Checklist Card */}
                  {msg.todos && (
                    <div className="bg-forge-panel border border-forge-borderSubtle rounded-xl p-3 space-y-1.5 shadow-sm">
                      <h5 className="text-[11px] font-bold text-forge-bone uppercase tracking-wider mb-1">
                        {t('Execution Checklist', 'Görev Kontrol Listesi')}
                      </h5>
                      {msg.todos.map((todo) => (
                        <div key={todo.id} className="flex items-center space-x-2 text-xs">
                          {todo.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-forge-success shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-forge-boneMuted shrink-0" />
                          )}
                          <span className={todo.completed ? 'text-forge-bone line-through opacity-70' : 'text-forge-bone'}>
                            {todo.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Explanation Text */}
                  <div className="bg-forge-panel border border-forge-panelBorder p-3 rounded-2xl rounded-tl-none text-xs text-forge-bone whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </div>

                  {/* Source Links */}
                  {msg.sources && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.sources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1 px-2 py-0.5 rounded bg-forge-panelElevated text-[10px] text-forge-gold hover:underline"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[150px]">{s.title}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Thumbs up / down Feedback */}
                  <div className="flex items-center space-x-1 pl-1">
                    <button
                      onClick={() => setMessageFeedback(msg.id, 'like')}
                      className={`p-1 rounded text-xs ${msg.feedback === 'like' ? 'text-forge-orange' : 'text-forge-boneMuted hover:text-forge-bone'}`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setMessageFeedback(msg.id, 'dislike')}
                      className={`p-1 rounded text-xs ${msg.feedback === 'dislike' ? 'text-forge-danger' : 'text-forge-boneMuted hover:text-forge-bone'}`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Active Streaming Thoughts & Tools */}
          {isStreaming && (
            <div className="space-y-2 animate-in fade-in">
              {activeThoughts.length > 0 && (
                <div className="bg-forge-panel border border-forge-orange/40 rounded-xl p-3 thought-shimmer">
                  <div className="flex items-center space-x-2 text-xs font-bold text-forge-orange mb-1">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('Thinking & Inspecting Scene...', 'Düşünüyor ve Sahne İnceleniyor...')}</span>
                  </div>
                  <p className="text-[11px] text-forge-bone font-mono">
                    {activeThoughts[activeThoughts.length - 1]}
                  </p>
                </div>
              )}

              {activeToolCalls.map((tc) => (
                <div key={tc.id} className="bg-forge-panelElevated border border-forge-borderSubtle rounded-xl p-2.5 text-xs font-mono flex items-center justify-between">
                  <span className="text-forge-orange">{tc.tool}</span>
                  <span className="text-[10px] text-forge-gold">executing...</span>
                </div>
              ))}
            </div>
          )}

          {/* Manual Approval Card */}
          {pendingApproval && (
            <div className="bg-forge-panelElevated border-2 border-forge-gold rounded-2xl p-3.5 shadow-xl space-y-2.5 animate-in slide-in-from-bottom">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-forge-gold" />
                <h4 className="text-xs font-bold text-forge-bone uppercase tracking-wider">
                  {t('Approval Required (Manual Mode)', 'Onay Gerekiyor (Manuel Mod)')}
                </h4>
              </div>

              <p className="text-xs text-forge-bone leading-relaxed">
                {pendingApproval.description}
              </p>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() => acceptApproval(false)}
                  className="min-h-[44px] rounded-xl bg-forge-orange text-white text-xs font-bold active:scale-95 shadow-sm"
                >
                  {t('Accept', 'Onayla')}
                </button>
                <button
                  onClick={() => acceptApproval(true)}
                  className="min-h-[44px] rounded-xl bg-forge-panel border border-forge-orange text-forge-orange text-xs font-bold active:scale-95"
                >
                  {t('Accept All', 'Hepsini')}
                </button>
                <button
                  onClick={rejectApproval}
                  className="min-h-[44px] rounded-xl bg-forge-panel border border-forge-borderSubtle text-forge-boneMuted text-xs font-bold active:scale-95 hover:text-forge-danger"
                >
                  {t('Reject', 'Reddet')}
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Autocomplete Popup for / Slash Commands */}
      {showSlashPopup && (
        <div className="absolute bottom-24 left-3 right-3 bg-forge-panel border border-forge-panelBorder rounded-xl shadow-2xl p-2 z-30 space-y-1">
          <span className="text-[10px] font-bold text-forge-boneMuted uppercase tracking-wider px-2 block">
            {t('Slash Commands', 'Komutlar')}
          </span>
          {slashCommands.map((item) => (
            <button
              key={item.cmd}
              onClick={() => {
                setInputText(`${item.cmd} `);
                setShowSlashPopup(false);
              }}
              className="w-full p-2 rounded-lg bg-forge-panelElevated flex items-center justify-between text-left text-xs active:bg-forge-orange active:text-white"
            >
              <span className="font-mono font-bold text-forge-orange">{item.cmd}</span>
              <span className="text-forge-boneMuted text-[11px] truncate">{item.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Autocomplete Popup for @ Entity Mentions */}
      {showMentionPopup && (
        <div className="absolute bottom-24 left-3 right-3 bg-forge-panel border border-forge-panelBorder rounded-xl shadow-2xl p-2 z-30 space-y-1">
          <span className="text-[10px] font-bold text-forge-boneMuted uppercase tracking-wider px-2 block">
            {t('Mention Entity', 'Varlık Etiketle')}
          </span>
          {currentProject?.entities.map((ent) => (
            <button
              key={ent.id}
              onClick={() => {
                setInputText(inputText.replace(/@$/, `@${ent.name} `));
                setShowMentionPopup(false);
              }}
              className="w-full p-2 rounded-lg bg-forge-panelElevated flex items-center justify-between text-left text-xs active:bg-forge-gold active:text-black"
            >
              <span className="font-bold text-forge-bone">@{ent.name}</span>
              <span className="text-forge-gold text-[10px] font-mono">{ent.tag || 'Entity'}</span>
            </button>
          ))}
        </div>
      )}

      {/* Antigravity Input Bar & Chips */}
      <div className="bg-forge-panel border-t border-forge-panelBorder p-2.5 space-y-2 z-20">
        {/* Chips Row: Mode, Model, Permission, Web Search */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5">
          {/* Mode Chip */}
          <button
            onClick={() => {
              const modes: AIMode[] = ['planning', 'fast', 'ask'];
              const next = modes[(modes.indexOf(mode) + 1) % modes.length];
              setMode(next);
            }}
            className="h-[32px] px-2.5 rounded-lg bg-forge-panelElevated border border-forge-borderSubtle text-[11px] font-bold text-forge-bone capitalize active:scale-95"
          >
            {mode}
          </button>

          {/* Model Picker */}
          <button
            onClick={() => setModelLibraryModalOpen(true)}
            className="h-[32px] px-2.5 rounded-lg bg-forge-panelElevated border border-forge-borderSubtle text-[11px] font-medium text-forge-bone flex items-center space-x-1 active:scale-95"
          >
            <Cpu className="w-3 h-3 text-forge-orange" />
            <span className="truncate max-w-[90px]">{selectedModel.split('/')[1] || selectedModel}</span>
          </button>

          {/* Permission Chip (Manual / Auto) */}
          <button
            onClick={() => setPermission(permission === 'manual' ? 'auto' : 'manual')}
            className={`h-[32px] px-2.5 rounded-lg text-[11px] font-bold flex items-center space-x-1 border active:scale-95 ${
              permission === 'auto'
                ? 'bg-forge-success/20 border-forge-success text-forge-success'
                : 'bg-forge-gold/20 border-forge-gold text-forge-gold'
            }`}
          >
            {permission === 'auto' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            <span className="capitalize">{permission}</span>
          </button>

          {/* Web Search Globe Toggle */}
          <button
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`min-w-[32px] h-[32px] px-2 rounded-lg flex items-center justify-center border active:scale-95 ${
              webSearchEnabled
                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                : 'bg-forge-panelElevated border-forge-borderSubtle text-forge-boneMuted'
            }`}
            title="Web Search"
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Input Row */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setInputText(inputText + '/')}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center justify-center text-forge-bone hover:border-forge-orange active:scale-95"
            title={t('Commands', 'Komutlar')}
          >
            <Plus className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder={t('Type @ for entity, / for command...', 'Varlık için @, komut için / yazın...')}
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 min-h-[44px] bg-forge-panelElevated border border-forge-borderSubtle rounded-xl px-3 text-xs text-forge-bone placeholder-forge-boneMuted focus:outline-none focus:border-forge-orange"
          />

          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-forge-danger text-white flex items-center justify-center active:scale-95 shadow-md"
              title="Stop"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="min-w-[44px] min-h-[44px] rounded-xl bg-forge-orange text-white flex items-center justify-center disabled:opacity-40 active:scale-95 shadow-md"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
