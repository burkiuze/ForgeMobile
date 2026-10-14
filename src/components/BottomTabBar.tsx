import React from 'react';
import { Eye, Layers, Sliders, FolderOpen, Sparkles } from 'lucide-react';
import { useEditorStore, EditorTab } from '../store/useEditorStore';
import { useAIStore } from '../store/useAIStore';
import { useTranslation } from '../i18n';

export const BottomTabBar: React.FC = () => {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useEditorStore();
  const { unreviewedChangesCount } = useAIStore();

  const tabs: { id: EditorTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'scene',
      label: t('Scene', 'Sahne'),
      icon: <Eye className="w-5 h-5" />,
    },
    {
      id: 'hierarchy',
      label: t('Hierarchy', 'Hiyerarşi'),
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'inspector',
      label: t('Inspector', 'Özellikler'),
      icon: <Sliders className="w-5 h-5" />,
    },
    {
      id: 'assets',
      label: t('Assets', 'Varlıklar'),
      icon: <FolderOpen className="w-5 h-5" />,
    },
    {
      id: 'ai',
      label: t('AI', 'Yapay Zeka'),
      icon: <Sparkles className="w-5 h-5" />,
      badge: unreviewedChangesCount,
    },
  ];

  return (
    <nav className="h-16 bg-forge-panel border-t border-forge-panelBorder px-2 flex items-center justify-around z-30 select-none pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative min-w-[56px] min-h-[48px] px-2 flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 ${
              isActive
                ? 'text-forge-orange font-bold'
                : 'text-forge-boneMuted hover:text-forge-bone'
            }`}
          >
            {/* Active Pill Indicator */}
            {isActive && (
              <span className="absolute -top-1 w-7 h-1 bg-forge-orange rounded-full shadow-[0_0_8px_#F05A22]" />
            )}

            <div className="relative">
              {tab.icon}
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 min-w-[16px] text-[9px] font-bold bg-forge-orange text-white rounded-full flex items-center justify-center animate-pulse">
                  {tab.badge}
                </span>
              ) : null}
            </div>

            <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'text-forge-orange font-semibold' : 'text-forge-boneMuted'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
