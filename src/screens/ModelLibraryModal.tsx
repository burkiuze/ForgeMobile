import React, { useState } from 'react';
import { X, Search, Cpu, HardDrive, Download, Check, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { modelService } from '../services/ModelService';
import { useEditorStore } from '../store/useEditorStore';
import { useAIStore } from '../store/useAIStore';
import { LocalModel, OpenRouterModel } from '../types';
import { useTranslation } from '../i18n';

export const ModelLibraryModal: React.FC = () => {
  const { t } = useTranslation();
  const { isModelLibraryModalOpen, setModelLibraryModalOpen } = useEditorStore();
  const { selectedModel, setSelectedModel } = useAIStore();

  const [activeTab, setActiveTab] = useState<'openrouter' | 'local'>('openrouter');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('All');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  if (!isModelLibraryModalOpen) return null;

  const openRouterModels = modelService.getOpenRouterModels();
  const localModels = modelService.searchLocalModels(searchQuery, selectedFamily);

  const families = ['All', 'Llama 3.3', 'Qwen 2.5', 'Gemma 2', 'Phi 3.5', 'Mistral Nemo', 'DeepSeek R1', 'Granite 3.0'];

  const handleDownloadModel = async (model: LocalModel) => {
    setDownloadingId(model.id);
    await modelService.downloadLocalModel(model.id, (progress: number) => {
      setProgressMap((prev) => ({ ...prev, [model.id]: progress }));
    });
    setDownloadingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in">
      <div className="bg-forge-panel border border-forge-panelBorder w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col h-[85vh] max-h-[680px] shadow-2xl">
        {/* Header */}
        <div className="p-3.5 bg-forge-panelElevated border-b border-forge-panelBorder flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-forge-orange" />
            <h3 className="text-sm font-bold text-forge-bone">
              {t('Model Hub & Library', 'Model Kütüphanesi')}
            </h3>
          </div>

          <button
            onClick={() => setModelLibraryModalOpen(false)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-forge-boneMuted hover:text-forge-bone active:bg-forge-panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cloud (OpenRouter) vs Local Catalog Switcher */}
        <div className="p-2.5 bg-forge-panel border-b border-forge-panelBorder flex space-x-2">
          <button
            onClick={() => setActiveTab('openrouter')}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'openrouter'
                ? 'bg-forge-orange text-white shadow-md'
                : 'bg-forge-panelElevated text-forge-boneMuted hover:text-forge-bone'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>OpenRouter ({openRouterModels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'local'
                ? 'bg-forge-orange text-white shadow-md'
                : 'bg-forge-panelElevated text-forge-boneMuted hover:text-forge-bone'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t('Local GGUF (300+)', 'Yerel GGUF (300+)')}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* 1. OpenRouter Models Tab */}
          {activeTab === 'openrouter' && (
            <div className="space-y-2.5">
              {openRouterModels.map((m: OpenRouterModel) => {
                const isSelected = selectedModel === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      setModelLibraryModalOpen(false);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-forge-orange/15 border-forge-orange shadow-md'
                        : 'bg-forge-panelElevated border-forge-borderSubtle hover:border-forge-panelBorder'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-forge-bone">{m.name}</span>
                        {m.badge && (
                          <span className="text-[10px] bg-forge-orange text-white font-bold px-1.5 py-0.5 rounded">
                            {m.badge}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-forge-gold bg-forge-panel px-2 py-0.5 rounded">
                        {m.pricing}
                      </span>
                    </div>

                    <p className="text-[11px] text-forge-boneMuted mb-2">{m.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-forge-boneMuted/70 font-mono">
                      <span>Context: {m.contextLength}</span>
                      {isSelected && (
                        <span className="text-forge-orange font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('Active', 'Seçili')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Local Models Catalog (300+ entries) */}
          {activeTab === 'local' && (
            <div className="space-y-3">
              {/* Search & Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-forge-boneMuted" />
                  <input
                    type="text"
                    placeholder={t('Search 300+ models (Qwen, Llama, Gemma, DeepSeek)...', 'Model Ara (Qwen, Llama, Gemma)...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-forge-panelElevated border border-forge-borderSubtle rounded-xl pl-9 pr-3 py-2 text-xs text-forge-bone placeholder-forge-boneMuted focus:outline-none focus:border-forge-orange"
                  />
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  {families.map((fam) => (
                    <button
                      key={fam}
                      onClick={() => setSelectedFamily(fam)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border ${
                        selectedFamily === fam
                          ? 'bg-forge-orange border-forge-orange text-white'
                          : 'bg-forge-panelElevated border-forge-borderSubtle text-forge-boneMuted'
                      }`}
                    >
                      {fam}
                    </button>
                  ))}
                </div>
              </div>

              {/* Models List */}
              <div className="space-y-2">
                {localModels.slice(0, 40).map((m: LocalModel) => {
                  const isDownloading = downloadingId === m.id;
                  const progress = progressMap[m.id] || m.downloadProgress || 0;

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs font-bold text-forge-bone">{m.name}</h4>
                            {m.fitsDevice && (
                              <span className="text-[9px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                                {t('Fits device', 'Cihaza Uygun')}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-forge-boneMuted">
                            {m.diskSize} • {m.ramRequirement} • {m.quantization}
                          </span>
                        </div>

                        {/* Download or Select Button */}
                        {m.downloaded ? (
                          <button
                            onClick={() => {
                              setSelectedModel(m.id);
                              setModelLibraryModalOpen(false);
                            }}
                            className="h-[34px] px-3 rounded-lg bg-forge-panel border border-forge-orange text-forge-orange text-xs font-bold active:scale-95 flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('Use', 'Kullan')}</span>
                          </button>
                        ) : isDownloading ? (
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-forge-gold">{progress}%</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDownloadModel(m)}
                            className="min-h-[36px] px-3 rounded-lg bg-forge-orange text-white text-xs font-bold active:scale-95 flex items-center space-x-1 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t('Get', 'İndir')}</span>
                          </button>
                        )}
                      </div>

                      {/* Download Progress Bar */}
                      {isDownloading && (
                        <div className="w-full bg-forge-panel rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-forge-gold h-full transition-all duration-200"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
