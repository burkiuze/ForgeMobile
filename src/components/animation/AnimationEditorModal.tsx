import React, { useState } from 'react';
import { Play, Square, Repeat, X, Diamond, CircleDot, Clock } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { useTranslation } from '../../i18n';

export const AnimationEditorModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    isAnimationModalOpen,
    setAnimationModalOpen,
    activeAnimationClip,
    selectedEntityId,
    currentProject,
  } = useEditorStore();

  const [currentTime, setCurrentTime] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [duration, setDuration] = useState(2.0);

  if (!isAnimationModalOpen) return null;

  const tracks = [
    { name: 'Position.Y', keyframes: [0, 1.0, 2.0] },
    { name: 'Rotation.Y', keyframes: [0, 0.5, 1.0, 1.5, 2.0] },
    { name: 'Scale.Uniform', keyframes: [0, 1.0, 2.0] },
    { name: 'Mesh.Color', keyframes: [0, 2.0] },
  ];

  const handleRecordKey = (property: string) => {
    alert(t(`Keyframe recorded at ${currentTime.toFixed(2)}s for ${property}`, `${property} için ${currentTime.toFixed(2)}s zamanında anahtar kare kaydedildi`));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end select-none animate-in slide-in-from-bottom">
      <div className="bg-forge-panel border-t border-forge-panelBorder rounded-t-2xl flex flex-col h-[65vh] max-h-[500px]">
        {/* Top Control Bar */}
        <div className="p-3 bg-forge-panelElevated border-b border-forge-panelBorder flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-forge-bone">
              {t('Animation Timeline', 'Animasyon Zaman Çizelgesi')}
            </span>
            <span className="text-[10px] text-forge-gold bg-forge-panel px-2 py-0.5 rounded font-mono">
              {activeAnimationClip?.name || 'Clip_Default'}
            </span>
          </div>

          <button
            onClick={() => setAnimationModalOpen(false)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-forge-boneMuted hover:text-forge-bone active:bg-forge-panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Header Controls (Play, Loop, Scrubber, Record) */}
        <div className="p-3 border-b border-forge-borderSubtle flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`min-w-[40px] h-[36px] px-3 rounded-lg flex items-center space-x-1 font-bold text-xs active:scale-95 ${
                isPlaying ? 'bg-forge-danger text-white' : 'bg-forge-orange text-white'
              }`}
            >
              {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`min-w-[40px] h-[36px] px-2.5 rounded-lg flex items-center justify-center border text-xs active:scale-95 ${
                isLooping ? 'bg-forge-orange/15 border-forge-orange text-forge-orange' : 'border-forge-borderSubtle text-forge-boneMuted'
              }`}
              title="Loop"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center space-x-1.5 bg-forge-panelElevated px-2.5 py-1 rounded-lg border border-forge-borderSubtle">
              <Clock className="w-3.5 h-3.5 text-forge-gold" />
              <span className="text-xs font-mono text-forge-bone">{currentTime.toFixed(2)}s / {duration.toFixed(1)}s</span>
            </div>
          </div>

          {/* Quick Record Key Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleRecordKey('Position')}
              className="h-[34px] px-2 rounded bg-forge-panelElevated border border-forge-borderSubtle text-[10px] font-bold text-forge-bone hover:border-forge-orange active:scale-95"
            >
              + Pos
            </button>
            <button
              onClick={() => handleRecordKey('Rotation')}
              className="h-[34px] px-2 rounded bg-forge-panelElevated border border-forge-borderSubtle text-[10px] font-bold text-forge-gold hover:border-forge-gold active:scale-95"
            >
              + Rot
            </button>
            <button
              onClick={() => handleRecordKey('Scale')}
              className="h-[34px] px-2 rounded bg-forge-panelElevated border border-forge-borderSubtle text-[10px] font-bold text-blue-400 hover:border-blue-400 active:scale-95"
            >
              + Scale
            </button>
          </div>
        </div>

        {/* Timeline Tracks & Keyframe Diamonds Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Timeline Time Ruler */}
          <div className="flex items-center pl-28 pr-4 py-1 text-[10px] font-mono text-forge-boneMuted/70 border-b border-forge-borderSubtle">
            <span className="w-1/4">0.0s</span>
            <span className="w-1/4">0.5s</span>
            <span className="w-1/4">1.0s</span>
            <span className="w-1/4">1.5s</span>
            <span>2.0s</span>
          </div>

          {/* Tracks */}
          {tracks.map((track) => (
            <div key={track.name} className="flex items-center min-h-[44px] bg-forge-panelElevated rounded-xl px-3 border border-forge-borderSubtle">
              {/* Track Label */}
              <div className="w-28 text-xs font-bold text-forge-bone truncate">
                {track.name}
              </div>

              {/* Track Lane with diamonds */}
              <div className="flex-1 relative h-6 bg-forge-panel/70 rounded flex items-center">
                {track.keyframes.map((kf, i) => {
                  const leftPercent = (kf / duration) * 92 + 4;
                  return (
                    <div
                      key={i}
                      style={{ left: `${leftPercent}%` }}
                      className="absolute -ml-2 w-4 h-4 rounded cursor-pointer flex items-center justify-center text-forge-gold active:scale-125 transition-transform"
                      title={`Keyframe: ${kf}s`}
                    >
                      <Diamond className="w-3.5 h-3.5 fill-forge-gold stroke-none" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Timeline Scrubber */}
        <div className="p-3 bg-forge-panelElevated border-t border-forge-panelBorder">
          <input
            type="range"
            min="0"
            max={duration}
            step="0.05"
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="w-full accent-forge-orange h-2 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
