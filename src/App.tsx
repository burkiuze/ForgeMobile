import React, { useEffect } from 'react';
import { useEditorStore } from './store/useEditorStore';
import { SetupWizard } from './screens/SetupWizard';
import { StartScreen } from './screens/StartScreen';
import { EditorScreen } from './screens/EditorScreen';

export const App: React.FC = () => {
  const { currentScreen, loadProjects } = useEditorStore();

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className="w-full h-full bg-forge-bg text-forge-bone font-sans select-none overflow-hidden">
      {currentScreen === 'setup' && <SetupWizard />}
      {currentScreen === 'start' && <StartScreen />}
      {currentScreen === 'editor' && <EditorScreen />}
    </div>
  );
};

export default App;
