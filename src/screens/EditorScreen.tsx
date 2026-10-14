import React from 'react';
import { TopBar } from '../components/TopBar';
import { BottomTabBar } from '../components/BottomTabBar';
import { SceneViewport } from '../components/viewport/SceneViewport';
import { HierarchyPanel } from '../components/hierarchy/HierarchyPanel';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { AssetsPanel } from '../components/assets/AssetsPanel';
import { AIChatPanel } from '../components/ai/AIChatPanel';
import { AnimationEditorModal } from '../components/animation/AnimationEditorModal';
import { ModelLibraryModal } from './ModelLibraryModal';
import { SettingsModal } from './SettingsModal';
import { useEditorStore } from '../store/useEditorStore';

export const EditorScreen: React.FC = () => {
  const { activeTab } = useEditorStore();

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-forge-bg overflow-hidden relative">
      {/* Top Bar */}
      <TopBar />

      {/* Main Body (Responsive Landscape Split or Portrait Tab Switcher) */}
      <main className="flex-1 relative overflow-hidden flex flex-col md:flex-row">
        {/* 3D Viewport - Always mounted to maintain WebGL context */}
        <div
          className={`w-full h-full relative transition-all duration-200 ${
            activeTab === 'scene'
              ? 'flex-1'
              : 'hidden md:flex md:flex-1'
          }`}
        >
          <SceneViewport />
        </div>

        {/* Secondary Panels (Hierarchy, Inspector, Assets, AI) */}
        {activeTab !== 'scene' && (
          <div className="w-full h-full md:w-[380px] lg:w-[420px] md:border-l md:border-forge-panelBorder bg-forge-bg z-10 overflow-hidden flex flex-col">
            {activeTab === 'hierarchy' && <HierarchyPanel />}
            {activeTab === 'inspector' && <InspectorPanel />}
            {activeTab === 'assets' && <AssetsPanel />}
            {activeTab === 'ai' && <AIChatPanel />}
          </div>
        )}
      </main>

      {/* Bottom 5-Tab Bar */}
      <BottomTabBar />

      {/* Modals & Sub-Editors */}
      <AnimationEditorModal />
      <ModelLibraryModal />
      <SettingsModal />
    </div>
  );
};
