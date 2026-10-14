import React, { useState } from 'react';
import {
  Globe,
  Key,
  Cpu,
  Layers,
  ArrowRight,
  Upload,
  Check,
  Sparkles,
  ChevronRight,
  Box,
  Compass,
} from 'lucide-react';
import { ForgeLogo } from '../components/ForgeLogo';
import { useTranslation } from '../i18n';
import { useEditorStore } from '../store/useEditorStore';
import { secretsService } from '../services/SecretsService';

export const SetupWizard: React.FC = () => {
  const { t, lang, setLanguage } = useTranslation();
  const { setScreen, createProject, currentUser, setCurrentUser } = useEditorStore();

  const [step, setStep] = useState<number>(1);
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('openrouter/free');
  const [projectName, setProjectName] = useState('My First Platformer');
  const [selectedTemplate, setSelectedTemplate] = useState<'platformer' | 'starter3d' | 'empty'>('platformer');

  // Username & Password Auth state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleImportEnv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const content = await file.text();
      const res = await secretsService.importFromEnv(content);
      const key = await secretsService.getKey('OPENROUTER_API_KEY');
      if (key) setOpenRouterKey(key);
      alert(t(`Imported ${res.count} keys from .env file!`, `.env dosyasından ${res.count} anahtar yüklendi!`));
    }
  };

  const handleFinish = async () => {
    if (openRouterKey.trim()) {
      await secretsService.setKey('OPENROUTER_API_KEY', openRouterKey.trim());
    }
    await createProject(projectName, selectedTemplate);
    setScreen('editor');
  };

  return (
    <div className="min-h-screen h-[100dvh] w-full bg-forge-bg flex flex-col justify-between p-4 pb-6 select-none max-w-md mx-auto">
      {/* Top Progress Indicator */}
      <div className="w-full flex items-center justify-between pt-2 px-2">
        <span className="text-[11px] font-mono text-forge-gold">STEP {step} OF 5</span>
        <div className="flex space-x-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-6 bg-forge-orange'
                  : s < step
                  ? 'w-3 bg-forge-gold'
                  : 'w-2 bg-forge-panelBorder'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Step Body */}
      <div className="flex-1 flex flex-col justify-center my-auto py-4">
        {/* Step 1: Language */}
        {step === 1 && (
          <div className="space-y-6 text-center animate-in fade-in">
            <ForgeLogo size="lg" />
            <div>
              <h2 className="text-xl font-bold text-forge-bone mb-1">Select Language / Dil Seçin</h2>
              <p className="text-xs text-forge-boneMuted">Choose your preferred experience</p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <button
                onClick={() => setLanguage('en')}
                className={`min-h-[56px] p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  lang === 'en'
                    ? 'bg-forge-orange/15 border-forge-orange text-forge-bone shadow-md'
                    : 'bg-forge-panel border-forge-borderSubtle text-forge-boneMuted hover:border-forge-panelBorder'
                }`}
              >
                <span className="text-sm font-bold">English</span>
                <span className="text-[10px] text-forge-gold">Global Default</span>
              </button>

              <button
                onClick={() => setLanguage('tr')}
                className={`min-h-[56px] p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
                  lang === 'tr'
                    ? 'bg-forge-orange/15 border-forge-orange text-forge-bone shadow-md'
                    : 'bg-forge-panel border-forge-borderSubtle text-forge-boneMuted hover:border-forge-panelBorder'
                }`}
              >
                <span className="text-sm font-bold">Türkçe</span>
                <span className="text-[10px] text-forge-gold">Yerel Arayüz</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Welcome & Account (Username/Password or Google) */}
        {step === 2 && (
          <div className="space-y-4 text-center animate-in fade-in">
            <ForgeLogo size="md" />
            <div>
              <h2 className="text-lg font-black text-forge-bone tracking-wide">
                {t('Create Your Creator Account', 'Yaratıcı Hesabınızı Oluşturun')}
              </h2>
              <p className="text-xs text-forge-boneMuted mt-0.5 max-w-xs mx-auto leading-relaxed">
                {t(
                  'Sign in with username & password or continue with Google',
                  'Kullanıcı adı ve şifre ile giriş yapın veya Google ile devam edin'
                )}
              </p>
            </div>

            {/* Account Card */}
            <div className="bg-forge-panel border border-forge-panelBorder rounded-2xl p-4 text-left max-w-sm mx-auto shadow-sm space-y-3">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-forge-bone uppercase tracking-wider">
                      {t('Active Account', 'Aktif Hesap')}
                    </span>
                    <span className="text-[10px] text-forge-success font-bold bg-green-500/10 px-2 py-0.5 rounded">
                      Giriş Yapıldı
                    </span>
                  </div>

                  <div className="flex items-center space-x-2.5 pt-1">
                    <div className="w-8 h-8 rounded-full bg-forge-orange text-white font-bold flex items-center justify-center text-xs">
                      {currentUser.displayName.charAt(0)}
                    </div>
                    <div className="truncate flex-1">
                      <span className="text-xs font-bold text-forge-bone block truncate">{currentUser.displayName}</span>
                      <span className="text-[10px] text-forge-boneMuted truncate block">{currentUser.email}</span>
                    </div>
                    <button
                      onClick={() => setCurrentUser(null)}
                      className="text-xs text-forge-danger hover:underline"
                    >
                      {t('Switch', 'Değiştir')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Tabs: Giriş Yap / Kayıt Ol */}
                  <div className="flex bg-forge-panelElevated p-1 rounded-xl">
                    <button
                      onClick={() => { setAuthTab('login'); setAuthError(null); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        authTab === 'login' ? 'bg-forge-orange text-white' : 'text-forge-boneMuted'
                      }`}
                    >
                      {t('Sign In', 'Giriş Yap')}
                    </button>
                    <button
                      onClick={() => { setAuthTab('register'); setAuthError(null); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        authTab === 'register' ? 'bg-forge-orange text-white' : 'text-forge-boneMuted'
                      }`}
                    >
                      {t('Sign Up', 'Kayıt Ol')}
                    </button>
                  </div>

                  {authTab === 'login' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder={t('Username or Email', 'Kullanıcı Adı veya E-posta')}
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        className="w-full bg-forge-bg border border-forge-borderSubtle rounded-xl px-3 py-2 text-xs text-forge-bone placeholder-forge-boneMuted focus:outline-none focus:border-forge-orange"
                      />
                      <input
                        type="password"
                        placeholder={t('Password', 'Şifre')}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-forge-bg border border-forge-borderSubtle rounded-xl px-3 py-2 text-xs text-forge-bone placeholder-forge-boneMuted focus:outline-none focus:border-forge-orange"
                      />
                      <button
                        onClick={() => {
                          if (!authUsername.trim() || !authPassword.trim()) {
                            setAuthError(t('Please fill in username and password', 'Kullanıcı adı ve şifre giriniz'));
                            return;
                          }
                          setCurrentUser({
                            uid: `user_${Date.now()}`,
                            displayName: authUsername.trim(),
                            email: authUsername.includes('@') ? authUsername.trim() : `${authUsername.trim()}@forge.dev`,
                          });
                        }}
                        className="w-full min-h-[42px] rounded-xl bg-forge-orange text-white text-xs font-bold active:scale-95 shadow-md"
                      >
                        {t('Sign In', 'Giriş Yap')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder={t('Username', 'Kullanıcı Adı')}
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        className="w-full bg-forge-bg border border-forge-borderSubtle rounded-xl px-3 py-2 text-xs text-forge-bone placeholder-forge-boneMuted focus:outline-none focus:border-forge-orange"
                      />
                      <input
                        type="email"
                        placeholder={t('Email Address', 'E-posta Adresi')}
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-forge-bg border border-forge-borderSubtle rounded-xl px-3 py-2 text-xs text-forge-bone placeholder-forge-boneMuted focus:outline-none focus:border-forge-orange"
                      />
                      <input
                        type="password"
                        placeholder={t('Password (min 6 chars)', 'Şifre (en az 6 karakter)')}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-forge-bg border border-forge-borderSubtle rounded-xl px-3 py-2 text-xs text-forge-bone placeholder-forge-boneMuted focus:outline-none focus:border-forge-orange"
                      />
                      <input
                        type="password"
                        placeholder={t('Confirm Password', 'Şifre Tekrar')}
                        value={authConfirmPassword}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                        className="w-full bg-forge-bg border border-forge-borderSubtle rounded-xl px-3 py-2 text-xs text-forge-bone placeholder-forge-boneMuted focus:outline-none focus:border-forge-orange"
                      />
                      <button
                        onClick={() => {
                          if (!authUsername.trim() || !authPassword.trim()) {
                            setAuthError(t('Please fill in required fields', 'Lütfen gerekli alanları doldurunuz'));
                            return;
                          }
                          if (authPassword.length < 6) {
                            setAuthError(t('Password must be at least 6 characters', 'Şifre en az 6 karakter olmalıdır'));
                            return;
                          }
                          if (authPassword !== authConfirmPassword) {
                            setAuthError(t('Passwords do not match', 'Şifreler eşleşmiyor'));
                            return;
                          }
                          setCurrentUser({
                            uid: `user_${Date.now()}`,
                            displayName: authUsername.trim(),
                            email: authEmail.trim() || `${authUsername.trim()}@forge.dev`,
                          });
                        }}
                        className="w-full min-h-[42px] rounded-xl bg-forge-orange text-white text-xs font-bold active:scale-95 shadow-md"
                      >
                        {t('Register & Continue', 'Kayıt Ol ve Devam Et')}
                      </button>
                    </div>
                  )}

                  {authError && (
                    <p className="text-[11px] text-forge-danger text-center">{authError}</p>
                  )}

                  {/* OR Google Sign-In */}
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-forge-borderSubtle"></div>
                    <span className="flex-shrink mx-2 text-[10px] text-forge-boneMuted/70 uppercase">
                      {t('OR', 'VEYA')}
                    </span>
                    <div className="flex-grow border-t border-forge-borderSubtle"></div>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentUser({
                        uid: 'google_user_forge',
                        displayName: 'Burak Forge Creator',
                        email: 'haktanburak0658@gmail.com',
                      });
                    }}
                    className="w-full min-h-[40px] rounded-xl bg-forge-panelElevated border border-forge-borderSubtle hover:border-forge-orange text-forge-bone text-xs font-semibold flex items-center justify-center space-x-2 active:scale-95"
                  >
                    <span className="font-bold text-forge-gold">G</span>
                    <span>{t('Continue with Google', 'Google ile Devam Et')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: AI Setup (.env Import & Key) */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-center">
              <h2 className="text-lg font-bold text-forge-bone mb-1">{t('AI Engine & Secrets', 'Yapay Zeka ve Anahtarlar')}</h2>
              <p className="text-xs text-forge-boneMuted">
                {t('Import your keys securely from your Forge.env file or paste below.', '.env dosyanızı yükleyin veya anahtarınızı girin.')}
              </p>
            </div>

            <div className="space-y-3">
              {/* Import .env File Button */}
              <label className="w-full min-h-[50px] px-4 rounded-xl bg-forge-orange text-white flex items-center justify-center space-x-2 text-xs font-bold cursor-pointer active:scale-95 shadow-md">
                <Upload className="w-4 h-4" />
                <span>{t('Import from .env file', '.env Dosyasından İçe Aktar')}</span>
                <input type="file" accept=".env,text/plain" onChange={handleImportEnv} className="hidden" />
              </label>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-forge-borderSubtle"></div>
                <span className="flex-shrink mx-3 text-[10px] font-mono text-forge-boneMuted/60 uppercase">OR</span>
                <div className="flex-grow border-t border-forge-borderSubtle"></div>
              </div>

              {/* Paste Manual Field */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-forge-boneMuted">OPENROUTER_API_KEY</span>
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  className="w-full min-h-[44px] bg-forge-panel border border-forge-borderSubtle rounded-xl px-3 text-xs font-mono text-forge-bone focus:outline-none focus:border-forge-orange"
                />
              </div>

              <p className="text-[10px] text-forge-boneMuted/70 text-center">
                {t('You can skip this step and add keys later in Settings.', 'Bu adımı atlayıp daha sonra Ayarlar\'dan ekleyebilirsiniz.')}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Local Model Choice */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-center">
              <h2 className="text-lg font-bold text-forge-bone mb-1">{t('Select AI Copilot Model', 'AI Modelini Seçin')}</h2>
              <p className="text-xs text-forge-boneMuted">{t('Choose high-speed cloud or lightweight on-device model', 'Bulut veya yerel model seçimi')}</p>
            </div>

            <div className="space-y-2">
              {[
                { id: 'openrouter/free', title: 'Auto (openrouter/free)', desc: 'Intelligent free tier cloud router', badge: 'Recommended' },
                { id: 'google/gemma-4-31b', title: 'Gemma 4 31B', desc: 'Deep game design reasoning', badge: 'Cloud' },
                { id: 'gguf_qwen_2.5_3b', title: 'Qwen 2.5 3B (Local GGUF)', desc: 'On-device, zero latency offline execution', badge: 'Fits device' },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedModel === m.id
                      ? 'bg-forge-orange/15 border-forge-orange shadow-md'
                      : 'bg-forge-panel border-forge-borderSubtle hover:border-forge-panelBorder'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-forge-bone">{m.title}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-forge-panelElevated text-forge-gold">
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-forge-boneMuted">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Create First Project */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-center">
              <h2 className="text-lg font-bold text-forge-bone mb-1">{t('Create First Project', 'İlk Projenizi Oluşturun')}</h2>
              <p className="text-xs text-forge-boneMuted">{t('Start with a preloaded seed template', 'Hazır bir şablonla başlayın')}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-forge-boneMuted">{t('Project Name', 'Proje Adı')}</span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full min-h-[44px] bg-forge-panel border border-forge-borderSubtle rounded-xl px-3 text-xs font-bold text-forge-bone focus:outline-none focus:border-forge-orange"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-forge-boneMuted">{t('Template', 'Şablon')}</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'platformer', name: 'Platformer', badge: 'Recommended' },
                    { id: 'starter3d', name: '3D Starter', badge: 'Basic' },
                    { id: 'empty', name: 'Empty Scene', badge: 'Clean' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id as any)}
                      className={`min-h-[56px] p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        selectedTemplate === tpl.id
                          ? 'bg-forge-orange/15 border-forge-orange text-forge-bone shadow-md'
                          : 'bg-forge-panel border-forge-borderSubtle text-forge-boneMuted'
                      }`}
                    >
                      <span className="text-xs font-bold">{tpl.name}</span>
                      <span className="text-[9px] text-forge-gold">{tpl.badge}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons Row */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 min-h-[48px] rounded-xl bg-forge-panel border border-forge-borderSubtle text-xs font-bold text-forge-bone active:scale-95"
            >
              {t('Back', 'Geri')}
            </button>
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 min-h-[48px] rounded-xl bg-forge-orange text-white text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 shadow-md"
            >
              <span>{t('Continue', 'Devam')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex-1 min-h-[48px] rounded-xl bg-forge-orange text-white text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 shadow-md"
            >
              <span>{t('Launch Forge Engine', "Forge Motoru'nu Başlat")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Small attribution text requested by user */}
        <div className="text-center">
          <span className="text-[11px] font-sans text-forge-bone opacity-35 tracking-wider select-none">
            made by burkiuze
          </span>
        </div>
      </div>
    </div>
  );
};
