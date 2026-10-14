import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Shield,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  AlertCircle,
  Globe,
  Sliders,
  Volume2,
  Cpu,
  RefreshCw,
  Sparkles,
  Server,
  User,
  LogOut,
} from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useEditorStore } from '../store/useEditorStore';
import { secretsService, StoredSecrets } from '../services/SecretsService';
import { updateService } from '../services/UpdateService';
import { useTranslation } from '../i18n';

export const SettingsModal: React.FC = () => {
  const { t, lang, setLanguage } = useTranslation();
  const { isSettingsModalOpen, setSettingsModalOpen, currentUser, setCurrentUser } = useEditorStore();
  const settings = useSettingsStore();

  const [activeSection, setActiveSection] = useState<'general' | 'keys' | 'editor' | 'rendering' | 'audio' | 'ai' | 'memory' | 'updates'>('keys');

  // Keys state
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showHfToken, setShowHfToken] = useState(false);
  const [testResult, setTestResult] = useState<{ key: string; success: boolean; msg: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Load stored keys on mount
  useEffect(() => {
    if (isSettingsModalOpen) {
      loadSecrets();
    }
  }, [isSettingsModalOpen]);

  const loadSecrets = async () => {
    const orKey = await secretsService.getKey('OPENROUTER_API_KEY');
    const hfKey = await secretsService.getKey('HF_TOKEN');
    setOpenRouterKey(orKey || '');
    setHfToken(hfKey || '');
  };

  if (!isSettingsModalOpen) return null;

  const handleImportEnv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const text = await file.text();
      const res = await secretsService.importFromEnv(text);
      await loadSecrets();
      alert(t(`Imported ${res.count} keys from .env file (${res.imported.join(', ')})`, `.env dosyasından ${res.count} anahtar yüklendi (${res.imported.join(', ')})`));
    }
  };

  const handleSaveKey = async (name: 'OPENROUTER_API_KEY' | 'HF_TOKEN', val: string) => {
    await secretsService.setKey(name, val);
    await loadSecrets();
  };

  const handleRemoveKey = async (name: 'OPENROUTER_API_KEY' | 'HF_TOKEN') => {
    await secretsService.removeKey(name);
    if (name === 'OPENROUTER_API_KEY') setOpenRouterKey('');
    if (name === 'HF_TOKEN') setHfToken('');
    setTestResult(null);
  };

  const handleTestKey = async (name: 'OPENROUTER_API_KEY' | 'HF_TOKEN') => {
    setIsTesting(true);
    const res = await secretsService.testKey(name);
    setTestResult({ key: name, success: res.success, msg: res.message });
    setIsTesting(false);
  };

  const handleCheckUpdatesNow = async () => {
    const info = await updateService.checkForUpdates();
    alert(t(`Forge Mobile v${info.currentVersion}\nLatest: v${info.latestVersion}\n\n${info.releaseNotes}`, `Forge Mobile v${info.currentVersion}\nEn Son: v${info.latestVersion}\n\n${info.releaseNotes}`));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in">
      <div className="bg-forge-panel border border-forge-panelBorder w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col h-[88vh] max-h-[720px] shadow-2xl">
        {/* Header */}
        <div className="p-3.5 bg-forge-panelElevated border-b border-forge-panelBorder flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-forge-orange" />
            <h3 className="text-sm font-bold text-forge-bone">
              {t('Forge Preferences', 'Forge Ayarları')}
            </h3>
          </div>

          <button
            onClick={() => setSettingsModalOpen(false)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-forge-boneMuted hover:text-forge-bone active:bg-forge-panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="p-2 bg-forge-panel border-b border-forge-panelBorder flex space-x-1.5 overflow-x-auto">
          {[
            { id: 'keys', label: t('API Keys', 'API Anahtarları'), icon: <Key className="w-3.5 h-3.5" /> },
            { id: 'general', label: t('General', 'Genel'), icon: <Globe className="w-3.5 h-3.5" /> },
            { id: 'editor', label: t('Editor', 'Editör'), icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'rendering', label: t('Rendering', 'Grafik'), icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'audio', label: t('Audio', 'Ses'), icon: <Volume2 className="w-3.5 h-3.5" /> },
            { id: 'ai', label: t('AI Engine', 'Yapay Zeka'), icon: <Cpu className="w-3.5 h-3.5" /> },
            { id: 'memory', label: t('Memory', 'Bellek'), icon: <Server className="w-3.5 h-3.5" /> },
            { id: 'updates', label: t('Updates', 'Güncellemeler'), icon: <RefreshCw className="w-3.5 h-3.5" /> },
          ].map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`min-h-[40px] px-3 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-1.5 transition-all ${
                activeSection === sec.id
                  ? 'bg-forge-orange text-white shadow-sm'
                  : 'bg-forge-panelElevated text-forge-boneMuted hover:text-forge-bone'
              }`}
            >
              {sec.icon}
              <span>{sec.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. API Keys Section */}
          {activeSection === 'keys' && (
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle">
                <div className="flex items-center space-x-2 text-forge-gold text-xs font-bold mb-1">
                  <Shield className="w-4 h-4" />
                  <span>{t('Zero-Leak Secret Management', 'Sıfır Sızıntı Güvenliği')}</span>
                </div>
                <p className="text-[11px] text-forge-boneMuted leading-relaxed">
                  {t(
                    'Forge never stores keys in the application bundle. Keys come from your Forge.env repository or device storage and are masked at all times.',
                    'Forge anahtarları asla uygulama içinde saklamaz. Anahtarlar cihazınızdan okunur ve daima maskelenir.'
                  )}
                </p>
              </div>

              {/* Import from .env File Button */}
              <div>
                <label className="w-full min-h-[48px] px-4 rounded-xl bg-forge-orange text-white flex items-center justify-center space-x-2 text-xs font-bold cursor-pointer active:scale-95 shadow-md">
                  <Upload className="w-4 h-4" />
                  <span>{t('Import from .env File', '.env Dosyasından İçe Aktar')}</span>
                  <input type="file" accept=".env,text/plain" onChange={handleImportEnv} className="hidden" />
                </label>
              </div>

              {/* OpenRouter Key Field */}
              <div className="bg-forge-panelElevated p-3.5 rounded-xl border border-forge-borderSubtle space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-forge-bone">OPENROUTER_API_KEY</span>
                  {openRouterKey && (
                    <span className="text-[10px] font-mono text-forge-gold">
                      {secretsService.maskKey(openRouterKey)}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showOpenRouterKey ? 'text' : 'password'}
                    placeholder="sk-or-v1-..."
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    onBlur={() => handleSaveKey('OPENROUTER_API_KEY', openRouterKey)}
                    className="w-full bg-forge-panel border border-forge-borderSubtle rounded-lg px-3 py-2 text-xs font-mono text-forge-bone pr-10 focus:outline-none focus:border-forge-orange"
                  />
                  <button
                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                    className="absolute right-2 top-2 text-forge-boneMuted hover:text-forge-bone"
                  >
                    {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => handleTestKey('OPENROUTER_API_KEY')}
                    disabled={!openRouterKey || isTesting}
                    className="h-[34px] px-3 rounded-lg bg-forge-panel border border-forge-borderSubtle text-xs font-semibold text-forge-bone hover:border-forge-gold active:scale-95 disabled:opacity-40"
                  >
                    {isTesting ? t('Testing...', 'Test Ediliyor...') : t('Test Key', 'Test Et')}
                  </button>
                  {openRouterKey && (
                    <button
                      onClick={() => handleRemoveKey('OPENROUTER_API_KEY')}
                      className="h-[34px] px-2.5 rounded-lg bg-forge-panel border border-forge-danger/40 text-xs text-forge-danger active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Hugging Face Token Field */}
              <div className="bg-forge-panelElevated p-3.5 rounded-xl border border-forge-borderSubtle space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-forge-bone">HF_TOKEN</span>
                  {hfToken && (
                    <span className="text-[10px] font-mono text-forge-gold">
                      {secretsService.maskKey(hfToken)}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showHfToken ? 'text' : 'password'}
                    placeholder="hf_..."
                    value={hfToken}
                    onChange={(e) => setHfToken(e.target.value)}
                    onBlur={() => handleSaveKey('HF_TOKEN', hfToken)}
                    className="w-full bg-forge-panel border border-forge-borderSubtle rounded-lg px-3 py-2 text-xs font-mono text-forge-bone pr-10 focus:outline-none focus:border-forge-orange"
                  />
                  <button
                    onClick={() => setShowHfToken(!showHfToken)}
                    className="absolute right-2 top-2 text-forge-boneMuted hover:text-forge-bone"
                  >
                    {showHfToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => handleTestKey('HF_TOKEN')}
                    disabled={!hfToken || isTesting}
                    className="h-[34px] px-3 rounded-lg bg-forge-panel border border-forge-borderSubtle text-xs font-semibold text-forge-bone hover:border-forge-gold active:scale-95 disabled:opacity-40"
                  >
                    {isTesting ? t('Testing...', 'Test Ediliyor...') : t('Test Key', 'Test Et')}
                  </button>
                  {hfToken && (
                    <button
                      onClick={() => handleRemoveKey('HF_TOKEN')}
                      className="h-[34px] px-2.5 rounded-lg bg-forge-panel border border-forge-danger/40 text-xs text-forge-danger active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center space-x-2 text-xs ${
                    testResult.success
                      ? 'bg-forge-success/10 border-forge-success text-forge-success'
                      : 'bg-forge-danger/10 border-forge-danger text-forge-danger'
                  }`}
                >
                  {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{testResult.msg}</span>
                </div>
              )}
            </div>
          )}

          {/* 2. General Preferences & Google Sign-In */}
          {activeSection === 'general' && (
            <div className="space-y-3">
              {/* Google Account Profile Card */}
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-forge-bone uppercase tracking-wider">
                    {t('Cloud Account & Sync', 'Bulut Hesabı ve Eşitleme')}
                  </span>
                  <span className="text-[10px] text-forge-success font-bold bg-green-500/10 px-2 py-0.5 rounded">
                    Firestore Active
                  </span>
                </div>

                {currentUser ? (
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-forge-orange text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {currentUser.displayName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-forge-bone">{currentUser.displayName}</h4>
                        <p className="text-[10px] text-forge-boneMuted">{currentUser.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentUser(null);
                        alert(t('Signed out from Google account', 'Google hesabından çıkış yapıldı'));
                      }}
                      className="min-h-[36px] px-2.5 rounded-lg bg-forge-panel border border-forge-danger/40 text-xs text-forge-danger active:scale-95 flex items-center space-x-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>{t('Sign Out', 'Çıkış')}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCurrentUser({
                        uid: 'google_user_forge',
                        displayName: 'Burak Forge Creator',
                        email: 'haktanburak0658@gmail.com',
                      });
                      alert(t('Signed in with Google', 'Google ile giriş yapıldı'));
                    }}
                    className="w-full min-h-[44px] rounded-xl bg-forge-orange text-white text-xs font-bold active:scale-95 shadow-md flex items-center justify-center space-x-2"
                  >
                    <span>G</span>
                    <span>{t('Sign in with Google', 'Google ile Giriş Yap')}</span>
                  </button>
                )}
              </div>

              {/* Language Switcher */}
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-forge-bone block">{t('Language', 'Dil')}</span>
                  <span className="text-[10px] text-forge-boneMuted">English & Türkçe</span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      lang === 'en' ? 'bg-forge-orange text-white' : 'bg-forge-panel text-forge-boneMuted'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('tr')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      lang === 'tr' ? 'bg-forge-orange text-white' : 'bg-forge-panel text-forge-boneMuted'
                    }`}
                  >
                    TR
                  </button>
                </div>
              </div>

              {/* Show Start Screen Toggle */}
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-forge-bone block">
                    {t('Show Start Screen on Launch', 'Açılışta Projeler Ekranını Göster')}
                  </span>
                  <span className="text-[10px] text-forge-boneMuted">{t('Project hub & templates', 'Proje yöneticisi')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showStartScreenOnLaunch}
                  onChange={(e) => settings.updateSettings({ showStartScreenOnLaunch: e.target.checked })}
                  className="accent-forge-orange w-4 h-4 rounded"
                />
              </div>

              {/* Autosave Toggle */}
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-forge-bone block">{t('Autosave Scene', 'Otomatik Kaydet')}</span>
                  <span className="text-[10px] text-forge-boneMuted">{t('Sync scene to local database', 'Yerel veritabanına kaydet')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autosave}
                  onChange={(e) => settings.updateSettings({ autosave: e.target.checked })}
                  className="accent-forge-orange w-4 h-4 rounded"
                />
              </div>
            </div>
          )}

          {/* 3. Editor Settings */}
          {activeSection === 'editor' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-forge-bone font-medium">{t('Orbit Camera Speed', 'Kamera Hızı')}</span>
                  <span className="font-mono text-forge-gold">{settings.cameraSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={settings.cameraSpeed}
                  onChange={(e) => settings.updateSettings({ cameraSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-forge-orange"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center justify-between">
                <span className="text-xs font-medium text-forge-bone">{t('Show 3D Ground Grid', 'Zemin Izgarasını Göster')}</span>
                <input
                  type="checkbox"
                  checked={settings.showGrid}
                  onChange={(e) => settings.updateSettings({ showGrid: e.target.checked })}
                  className="accent-forge-orange w-4 h-4 rounded"
                />
              </div>
            </div>
          )}

          {/* 4. Rendering Settings */}
          {activeSection === 'rendering' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center justify-between">
                <span className="text-xs font-medium text-forge-bone">{t('Enable Shadows', 'Gölgeleri Etkinleştir')}</span>
                <input
                  type="checkbox"
                  checked={settings.enableShadows}
                  onChange={(e) => settings.updateSettings({ enableShadows: e.target.checked })}
                  className="accent-forge-orange w-4 h-4 rounded"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center justify-between">
                <span className="text-xs font-medium text-forge-bone">{t('Antialiasing (FXAA)', 'Kenar Yumuşatma')}</span>
                <input
                  type="checkbox"
                  checked={settings.antialias}
                  onChange={(e) => settings.updateSettings({ antialias: e.target.checked })}
                  className="accent-forge-orange w-4 h-4 rounded"
                />
              </div>
            </div>
          )}

          {/* 5. Audio Settings */}
          {activeSection === 'audio' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-forge-bone font-medium">{t('Master Volume', 'Ana Ses')}</span>
                  <span className="font-mono text-purple-400">{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => settings.updateSettings({ masterVolume: parseFloat(e.target.value) })}
                  className="w-full accent-purple-400"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center justify-between">
                <span className="text-xs font-medium text-forge-bone">{t('Mute Audio', 'Sesi Kapat')}</span>
                <input
                  type="checkbox"
                  checked={settings.isMuted}
                  onChange={(e) => settings.updateSettings({ isMuted: e.target.checked })}
                  className="accent-purple-400 w-4 h-4 rounded"
                />
              </div>
            </div>
          )}

          {/* 6. AI Settings */}
          {activeSection === 'ai' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-forge-bone block">{t('Default Permission', 'Varsayılan İzin')}</span>
                  <span className="text-[10px] text-forge-boneMuted">{t('Manual requires approval card', 'Manuel mod onay kartı gösterir')}</span>
                </div>
                <select
                  value={settings.defaultPermission}
                  onChange={(e) => settings.updateSettings({ defaultPermission: e.target.value as any })}
                  className="bg-forge-panel border border-forge-borderSubtle px-2.5 py-1 rounded text-xs text-forge-bone"
                >
                  <option value="manual">Manual (Approval Card)</option>
                  <option value="auto">Auto (Instant)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-forge-bone font-medium">{t('Web Search Result Count', 'Arama Sonuç Sayısı')}</span>
                  <span className="font-mono text-forge-gold">{settings.webSearchResultCount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={settings.webSearchResultCount}
                  onChange={(e) => settings.updateSettings({ webSearchResultCount: parseInt(e.target.value) })}
                  className="w-full accent-forge-orange"
                />
              </div>
            </div>
          )}

          {/* 7. Memory Server Settings */}
          {activeSection === 'memory' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle space-y-2">
                <span className="text-xs font-bold text-forge-bone block">{t('Memory Architecture', 'Bellek Mimarisi')}</span>
                <select
                  value={settings.memoryMode}
                  onChange={(e) => settings.updateSettings({ memoryMode: e.target.value as any })}
                  className="w-full bg-forge-panel border border-forge-borderSubtle px-2.5 py-1.5 rounded text-xs text-forge-bone"
                >
                  <option value="builtin">Built-in Local Session Memory</option>
                  <option value="external">External Memory Server (HTTP API)</option>
                </select>

                {settings.memoryMode === 'external' && (
                  <input
                    type="text"
                    value={settings.externalMemoryUrl}
                    onChange={(e) => settings.updateSettings({ externalMemoryUrl: e.target.value })}
                    className="w-full bg-forge-panel border border-forge-borderSubtle px-2.5 py-1.5 rounded text-xs font-mono text-forge-bone"
                  />
                )}
              </div>
            </div>
          )}

          {/* 8. Updates Section */}
          {activeSection === 'updates' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-forge-bone">Forge Mobile v1.0.0</h4>
                    <p className="text-[10px] text-forge-gold">Shaped by fire • Release Channel</p>
                  </div>
                  <button
                    onClick={handleCheckUpdatesNow}
                    className="min-h-[38px] px-3 rounded-lg bg-forge-orange text-white text-xs font-bold active:scale-95"
                  >
                    {t('Check Now', 'Şimdi Kontrol Et')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
