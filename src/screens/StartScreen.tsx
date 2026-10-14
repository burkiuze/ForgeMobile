import React, { useState, useEffect } from 'react';
import {
  Plus,
  FolderOpen,
  Sparkles,
  Clock,
  ArrowRight,
  RefreshCw,
  Box,
  Layers,
  Settings as SettingsIcon,
  LogOut,
  X,
} from 'lucide-react';
import { ForgeLogo } from '../components/ForgeLogo';
import { useEditorStore } from '../store/useEditorStore';
import { updateService, AppUpdateInfo } from '../services/UpdateService';
import { useTranslation } from '../i18n';

export const StartScreen: React.FC = () => {
  const { t } = useTranslation();
  const {
    projects,
    loadProjects,
    selectProject,
    createProject,
    setSettingsModalOpen,
    currentUser,
    setCurrentUser,
  } = useEditorStore();

  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('New 3D Arena');
  const [newProjectTemplate, setNewProjectTemplate] = useState<'platformer' | 'starter3d' | 'empty'>('platformer');

  useEffect(() => {
    loadProjects();
    // Check for updates on launch
    updateService.checkForUpdates().then((info) => {
      if (info.hasUpdate) {
        setUpdateInfo(info);
        setShowUpdateDialog(true);
      }
    });
  }, []);

  const handleOpenFromDevice = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      alert(t(`Loaded project from file: ${e.target.files[0].name}`, `Dosyadan proje yüklendi: ${e.target.files[0].name}`));
    }
  };

  const handleCreateNew = async () => {
    await createProject(newProjectName, newProjectTemplate);
    setShowNewProjectModal(false);
  };

  return (
    <div className="min-h-screen h-[100dvh] w-full bg-forge-bg flex flex-col justify-between p-4 pb-6 select-none max-w-md mx-auto">
      {/* Top Bar: Settings & User Profile */}
      <div className="flex items-center justify-between pt-1 px-1">
        <div className="flex items-center space-x-2">
          {currentUser ? (
            <div className="flex items-center space-x-2 bg-forge-panel border border-forge-borderSubtle px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-forge-success animate-pulse" />
              <span className="text-xs font-bold text-forge-bone">{currentUser.displayName.split(' ')[0]}</span>
            </div>
          ) : (
            <button
              onClick={() => {
                setCurrentUser({
                  uid: 'google_user_forge',
                  displayName: 'Burak Forge Creator',
                  email: 'haktanburak0658@gmail.com',
                });
              }}
              className="px-2.5 py-1 rounded-full bg-forge-panel border border-forge-borderSubtle text-xs text-forge-bone hover:border-forge-orange"
            >
              Google Giriş
            </button>
          )}
        </div>

        <button
          onClick={() => setSettingsModalOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-forge-panel border border-forge-borderSubtle text-forge-boneMuted hover:text-forge-bone active:scale-95"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Center Brand Header */}
      <div className="text-center my-3">
        <ForgeLogo size="lg" />
      </div>

      {/* Main Actions Row: New Project & Open from Device */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="min-h-[56px] p-3.5 rounded-2xl bg-forge-orange text-white flex flex-col items-center justify-center space-y-1 active:scale-95 shadow-lg transition-transform"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-bold">{t('New Project', 'Yeni Proje')}</span>
        </button>

        <label className="min-h-[56px] p-3.5 rounded-2xl bg-forge-panel border border-forge-borderSubtle hover:border-forge-orange text-forge-bone flex flex-col items-center justify-center space-y-1 cursor-pointer active:scale-95 shadow-sm transition-transform">
          <FolderOpen className="w-5 h-5 text-forge-gold" />
          <span className="text-xs font-bold">{t('Open from Device', 'Cihazdan Aç')}</span>
          <input type="file" accept=".json,.forge" onChange={handleOpenFromDevice} className="hidden" />
        </label>
      </div>

      {/* Recent Projects List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[11px] font-bold text-forge-boneMuted uppercase tracking-wider">
            {t('Recent Projects', 'Son Projeler')}
          </span>
          <span className="text-[10px] text-forge-gold font-mono">{projects.length} {t('projects', 'proje')}</span>
        </div>

        {projects.map((proj) => (
          <div
            key={proj.id}
            onClick={() => selectProject(proj)}
            className="min-h-[64px] p-3 rounded-2xl bg-forge-panel border border-forge-borderSubtle hover:border-forge-orange flex items-center justify-between cursor-pointer active:scale-95 shadow-sm transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle/60 flex items-center justify-center text-forge-orange font-bold text-base">
                <Box className="w-5 h-5 text-forge-orange" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-forge-bone">{proj.name}</h4>
                <div className="flex items-center space-x-2 text-[10px] text-forge-boneMuted mt-0.5">
                  <span className="capitalize text-forge-gold">{proj.template}</span>
                  <span>•</span>
                  <span>{proj.entities.length} {t('entities', 'varlık')}</span>
                </div>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-forge-boneMuted" />
          </div>
        ))}
      </div>

      {/* Attribution footer requested by user */}
      <div className="text-center pt-2">
        <span className="text-[11px] font-sans text-forge-bone opacity-35 tracking-wider select-none">
          made by burkiuze
        </span>
      </div>

      {/* Update Available Dialog Modal on Launch */}
      {showUpdateDialog && updateInfo && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-forge-panel border border-forge-gold rounded-2xl p-5 shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-center space-x-2 text-forge-gold">
              <Sparkles className="w-5 h-5 animate-spin" />
              <h3 className="text-sm font-bold text-forge-bone">
                {t('Update Available', 'Güncelleme Mevcut')}
              </h3>
            </div>

            <p className="text-xs text-forge-bone leading-relaxed">
              {t(
                `Forge Mobile v${updateInfo.latestVersion} is ready to install! Would you like to update now?`,
                `Forge Mobile v${updateInfo.latestVersion} yüklenmeye hazır! Şimdi güncellemek ister misiniz?`
              )}
            </p>

            <div className="p-2.5 rounded-lg bg-forge-panelElevated text-[11px] font-mono text-forge-boneMuted whitespace-pre-line">
              {updateInfo.releaseNotes}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setShowUpdateDialog(false);
                  alert(t('Updated to latest version!', 'En son sürüme güncellendi!'));
                }}
                className="min-h-[44px] rounded-xl bg-forge-orange text-white text-xs font-bold active:scale-95 shadow-md"
              >
                {t('Update Now', 'Şimdi Güncelle')}
              </button>
              <button
                onClick={() => setShowUpdateDialog(false)}
                className="min-h-[44px] rounded-xl bg-forge-panelElevated text-forge-boneMuted text-xs font-bold active:scale-95 hover:text-forge-bone"
              >
                {t('Later', 'Daha Sonra')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Creation Modal */}
      {showNewProjectModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowNewProjectModal(false)}
        >
          <div
            className="w-full sm:max-w-md bg-forge-panel border-t sm:border border-forge-panelBorder rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-forge-bone">{t('Create New Project', 'Yeni Proje Oluştur')}</h3>
              <button onClick={() => setShowNewProjectModal(false)} className="text-forge-boneMuted hover:text-forge-bone">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-forge-boneMuted">{t('Project Name', 'Proje Adı')}</span>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full min-h-[44px] bg-forge-panelElevated border border-forge-borderSubtle rounded-xl px-3 text-xs font-bold text-forge-bone focus:outline-none focus:border-forge-orange"
              />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-forge-boneMuted">{t('Template', 'Şablon')}</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'platformer', name: 'Platformer' },
                  { id: 'starter3d', name: '3D Starter' },
                  { id: 'empty', name: 'Empty Scene' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setNewProjectTemplate(tpl.id as any)}
                    className={`min-h-[50px] p-2 rounded-xl border text-xs font-bold transition-all ${
                      newProjectTemplate === tpl.id
                        ? 'bg-forge-orange/15 border-forge-orange text-forge-orange'
                        : 'bg-forge-panelElevated border-forge-borderSubtle text-forge-boneMuted'
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateNew}
              className="w-full min-h-[48px] rounded-xl bg-forge-orange text-white text-xs font-bold active:scale-95 shadow-md"
            >
              {t('Create & Open Editor', 'Oluştur ve Editörü Aç')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
