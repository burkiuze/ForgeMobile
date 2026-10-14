import React, { useState } from 'react';
import {
  Folder,
  Download,
  Play,
  Upload,
  Check,
  Search,
  Sparkles,
  Volume2,
  Film,
  Box,
  FileCode,
  Image,
} from 'lucide-react';
import { assetService, SoundEffectPreset, AnimationPreset } from '../../services/AssetService';
import { StoreAsset } from '../../types';
import { useTranslation } from '../../i18n';

export const AssetsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'project' | 'store' | 'sounds' | 'animations'>('project');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('Models');
  const [downloadedAssets, setDownloadedAssets] = useState<string[]>(['ast_ancient_column', 'ast_dungeon_torch']);

  const projectFolders = [
    { name: 'Models', icon: <Box className="w-4 h-4 text-forge-orange" />, count: 3 },
    { name: 'Textures', icon: <Image className="w-4 h-4 text-green-400" />, count: 4 },
    { name: 'Scripts', icon: <FileCode className="w-4 h-4 text-forge-gold" />, count: 2 },
    { name: 'Audio', icon: <Volume2 className="w-4 h-4 text-purple-400" />, count: 5 },
    { name: 'Animations', icon: <Film className="w-4 h-4 text-blue-400" />, count: 4 },
    { name: 'Prefabs', icon: <Folder className="w-4 h-4 text-forge-boneMuted" />, count: 1 },
  ];

  const storeAssets = assetService.searchStoreAssets(searchQuery);
  const soundEffects = assetService.getSoundEffects();
  const animationPresets = assetService.getAnimationPresets();

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      alert(t(`Imported: ${e.target.files[0].name} to Project > ${activeFolder}`, `${e.target.files[0].name} içe aktarıldı: ${activeFolder}`));
    }
  };

  const handleDownload = async (asset: StoreAsset) => {
    await assetService.downloadAsset(asset.id);
    setDownloadedAssets((prev) => [...prev, asset.id]);
  };

  return (
    <div className="flex flex-col h-full bg-forge-bg select-none pb-12">
      {/* Sub Tabs: Project / Store / SFX / Animations */}
      <div className="p-2 bg-forge-panel border-b border-forge-panelBorder flex space-x-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('project')}
          className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'project'
              ? 'bg-forge-orange text-white shadow-sm'
              : 'bg-forge-panelElevated text-forge-boneMuted hover:text-forge-bone'
          }`}
        >
          {t('Project Folders', 'Proje')}
        </button>

        <button
          onClick={() => setActiveSubTab('store')}
          className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
            activeSubTab === 'store'
              ? 'bg-forge-orange text-white shadow-sm'
              : 'bg-forge-panelElevated text-forge-boneMuted hover:text-forge-bone'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-forge-gold" />
          <span>CC0 Store</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sounds')}
          className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
            activeSubTab === 'sounds'
              ? 'bg-forge-orange text-white shadow-sm'
              : 'bg-forge-panelElevated text-forge-boneMuted hover:text-forge-bone'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          <span>{t('Sound FX', 'Ses Efektleri')}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('animations')}
          className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
            activeSubTab === 'animations'
              ? 'bg-forge-orange text-white shadow-sm'
              : 'bg-forge-panelElevated text-forge-boneMuted hover:text-forge-bone'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-blue-400" />
          <span>{t('Animations', 'Animasyonlar')}</span>
        </button>
      </div>

      {/* 1. Project Folders Tab */}
      {activeSubTab === 'project' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-forge-bone uppercase tracking-wider">
              {t('Project Explorer', 'Proje Gezgini')}
            </span>

            {/* Import from device file picker */}
            <label className="min-h-[44px] px-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle text-forge-bone hover:border-forge-orange flex items-center space-x-2 text-xs font-semibold cursor-pointer active:scale-95 shadow-sm">
              <Upload className="w-4 h-4 text-forge-orange" />
              <span>{t('Import from Device', 'Cihazdan Yükle')}</span>
              <input type="file" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {projectFolders.map((folder) => {
              const isSelected = activeFolder === folder.name;
              return (
                <button
                  key={folder.name}
                  onClick={() => setActiveFolder(folder.name)}
                  className={`min-h-[52px] p-3 rounded-xl flex items-center space-x-3 transition-all text-left ${
                    isSelected
                      ? 'bg-forge-panel border border-forge-orange shadow-md'
                      : 'bg-forge-panel border border-forge-borderSubtle hover:border-forge-panelBorder'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-forge-panelElevated flex items-center justify-center">
                    {folder.icon}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-forge-bone block truncate">{folder.name}</span>
                    <span className="text-[10px] text-forge-boneMuted">{folder.count} {t('items', 'öğe')}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-forge-panel rounded-xl border border-forge-panelBorder p-3 mt-3">
            <h5 className="text-[11px] font-bold text-forge-boneMuted uppercase tracking-wider mb-2">
              {activeFolder} ({t('Local Assets', 'Yerel Dosyalar')})
            </h5>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-forge-panelElevated">
                <span className="font-mono text-forge-bone">PlatformerGround.fbx</span>
                <span className="text-[10px] text-forge-boneMuted">1.4 MB</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-forge-panelElevated">
                <span className="font-mono text-forge-bone">PlayerCapsule.gltf</span>
                <span className="text-[10px] text-forge-boneMuted">820 KB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CC0 Store Tab (Poly Haven & ambientCG) */}
      {activeSubTab === 'store' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-forge-boneMuted" />
            <input
              type="text"
              placeholder={t('Search Poly Haven & ambientCG models...', 'CC0 Model ve Doku Ara...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-forge-panel border border-forge-borderSubtle rounded-xl pl-9 pr-3 py-2 text-xs text-forge-bone placeholder-forge-boneMuted focus:outline-none focus:border-forge-orange"
            />
          </div>

          {/* Asset Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {storeAssets.map((asset) => {
              const isDownloaded = downloadedAssets.includes(asset.id);
              return (
                <div
                  key={asset.id}
                  className="bg-forge-panel border border-forge-borderSubtle rounded-xl p-3 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="h-20 rounded-lg bg-forge-panelElevated flex items-center justify-center mb-2 border border-forge-borderSubtle/60 relative overflow-hidden">
                      <Box className="w-8 h-8 text-forge-orange/60" />
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-forge-panel px-1.5 py-0.5 rounded text-forge-gold">
                        {asset.license}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-forge-bone truncate">{asset.name}</h4>
                    <span className="text-[10px] text-forge-boneMuted block">{asset.author} • {asset.size}</span>
                  </div>

                  <button
                    onClick={() => handleDownload(asset)}
                    disabled={isDownloaded}
                    className={`mt-2.5 w-full min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                      isDownloaded
                        ? 'bg-forge-panelElevated text-forge-success border border-forge-success/30'
                        : 'bg-forge-orange text-white active:scale-95'
                    }`}
                  >
                    {isDownloaded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('Imported', 'Yüklendi')}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>{t('Download', 'İndir')}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Sound Effects Synthesizer Tab */}
      {activeSubTab === 'sounds' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
          <div className="p-3 bg-forge-panel rounded-xl border border-forge-panelBorder">
            <h4 className="text-xs font-bold text-forge-gold uppercase tracking-wider mb-1">
              {t('Web Audio Procedural SFX Synthesizer', 'Web Audio Prosedürel Ses Sentezleyici')}
            </h4>
            <p className="text-[11px] text-forge-boneMuted">
              {t('8-bit retro sound synthesizer. Tap Play to preview immediately.', 'Gerçek zamanlı 8-bit ses motoru. Önizlemek için dokunun.')}
            </p>
          </div>

          <div className="space-y-2">
            {soundEffects.map((sfx) => (
              <div
                key={sfx.id}
                className="min-h-[50px] p-3 rounded-xl bg-forge-panel border border-forge-borderSubtle flex items-center justify-between"
              >
                <div>
                  <h5 className="text-xs font-bold text-forge-bone">{sfx.name}</h5>
                  <p className="text-[10px] text-forge-boneMuted">{sfx.description}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => assetService.playSoundEffect(sfx.type)}
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-forge-orange text-white flex items-center justify-center active:scale-90 shadow-md"
                    title={t('Play Sound', 'Oynat')}
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Animation Presets Tab */}
      {activeSubTab === 'animations' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {animationPresets.map((anim) => (
            <div
              key={anim.id}
              className="p-3 rounded-xl bg-forge-panel border border-forge-borderSubtle flex items-center justify-between"
            >
              <div>
                <h5 className="text-xs font-bold text-forge-bone">{anim.name}</h5>
                <p className="text-[10px] text-forge-boneMuted">{anim.description} ({anim.duration}s)</p>
              </div>

              <button
                onClick={() => alert(t(`Attached animation preset "${anim.name}" to selected entity`, `"${anim.name}" animasyonu uygulandı`))}
                className="min-h-[40px] px-3 rounded-lg bg-forge-panelElevated border border-forge-borderSubtle text-forge-orange text-xs font-bold active:scale-95"
              >
                {t('Apply', 'Uygula')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
