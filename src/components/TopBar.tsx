import React from 'react';
import { Play, Square, Settings as SettingsIcon, Cpu, ChevronLeft, RotateCcw, RotateCw, User } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { useAIStore } from '../store/useAIStore';
import { useTranslation } from '../i18n';

export const TopBar: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentProject,
    isPlaying,
    togglePlay,
    setScreen,
    setSettingsModalOpen,
    setModelLibraryModalOpen,
    currentUser,
    undo,
    redo,
  } = useEditorStore();

  const { selectedModel } = useAIStore();

  return (
    <header className="h-14 bg-forge-panel border-b border-forge-panelBorder px-3 flex items-center justify-between z-30 select-none">
      {/* Left: Back to Start + Project Title */}
      <div className="flex items-center space-x-1.5 min-w-0">
        <button
          onClick={() => setScreen('start')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-forge-boneMuted hover:text-forge-bone active:bg-forge-panelElevated transition-colors"
          title={t('Projects Hub', 'Projeler')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="truncate">
          <h2 className="text-xs font-bold text-forge-bone truncate">
            {currentProject?.name || 'Untitled Scene'}
          </h2>
          <span className="text-[10px] text-forge-gold block truncate">
            {currentProject?.entities.length ?? 0} {t('Entities', 'Varlık')}
          </span>
        </div>
      </div>

      {/* Center: Play/Stop & Undo/Redo */}
      <div className="flex items-center space-x-1">
        <button
          onClick={undo}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-forge-boneMuted hover:text-forge-bone active:bg-forge-panelElevated transition-colors"
          title={t('Undo', 'Geri Al')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={redo}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-forge-boneMuted hover:text-forge-bone active:bg-forge-panelElevated transition-colors"
          title={t('Redo', 'İleri Al')}
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className={`min-w-[44px] h-[36px] px-3.5 flex items-center justify-center space-x-1.5 rounded-full font-semibold text-xs transition-all shadow-md active:scale-95 ${
            isPlaying
              ? 'bg-forge-danger text-white animate-pulse'
              : 'bg-forge-orange hover:bg-forge-orangeHover text-white'
          }`}
          title={isPlaying ? t('Stop Simulation', 'Durdur') : t('Play Simulation', 'Oynat')}
        >
          {isPlaying ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="text-[11px] font-bold">{t('STOP', 'DURDUR')}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="text-[11px] font-bold">{t('PLAY', 'OYNAT')}</span>
            </>
          )}
        </button>
      </div>

      {/* Right: Model Chip, Google Profile & Settings */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => setModelLibraryModalOpen(true)}
          className="h-[34px] px-2.5 rounded-lg bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-1.5 text-forge-bone hover:border-forge-orange transition-colors active:scale-95"
          title={t('Change Model', 'Model Seç')}
        >
          <Cpu className="w-3.5 h-3.5 text-forge-orange" />
          <span className="text-[11px] font-medium hidden sm:inline max-w-[80px] truncate">
            {selectedModel.split('/')[1] || selectedModel}
          </span>
        </button>

        <button
          onClick={() => setSettingsModalOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-forge-boneMuted hover:text-forge-bone active:bg-forge-panelElevated transition-colors"
          title={t('Settings', 'Ayarlar')}
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
