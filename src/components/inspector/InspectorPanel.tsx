import React, { useState } from 'react';
import {
  Sliders,
  Move,
  Palette,
  Sun,
  Camera,
  Shield,
  Activity,
  Music,
  Film,
  Code,
  Plus,
  Trash2,
  Play,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { Vector3D } from '../../types';
import { assetService } from '../../services/AssetService';
import { useTranslation } from '../../i18n';

export const InspectorPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentProject,
    selectedEntityId,
    updateEntity,
    updateCurrentProjectName,
    setAnimationModalOpen,
  } = useEditorStore();

  const [showAddComponentSheet, setShowAddComponentSheet] = useState(false);
  const selectedEntity = currentProject?.entities.find((e) => e.id === selectedEntityId);

  if (!selectedEntity) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-forge-boneMuted">
        <Sliders className="w-10 h-10 mb-2 opacity-30 text-forge-orange" />
        <p className="text-sm font-medium">{t('No entity selected', 'Varlık seçilmedi')}</p>
        <p className="text-xs text-forge-boneMuted/60 mt-1">
          {t('Tap an object in the 3D scene or select from Hierarchy', '3D sahnede bir nesneye dokunun veya hiyerarşiden seçin')}
        </p>
      </div>
    );
  }

  const updateTransform = (field: 'position' | 'rotation' | 'scale', axis: 0 | 1 | 2, value: number) => {
    updateEntity(selectedEntity.id, (ent) => {
      const copy: Vector3D = [...ent.transform[field]];
      copy[axis] = Number(value) || 0;
      return {
        ...ent,
        transform: {
          ...ent.transform,
          [field]: copy,
        },
      };
    });
  };

  const addComponentToEntity = (comp: string) => {
    updateEntity(selectedEntity.id, (ent) => {
      switch (comp) {
        case 'light':
          return { ...ent, light: { type: 'point', color: '#F2B233', intensity: 2.0, castShadow: true } };
        case 'camera':
          return { ...ent, camera: { fov: 60, near: 0.1, far: 500, isMain: false } };
        case 'collider':
          return { ...ent, collider: { type: 'box', isTrigger: false, size: [1, 1, 1] } };
        case 'rigidbody':
          return { ...ent, rigidbody: { mass: 1.0, drag: 0.1, useGravity: true, isKinematic: false } };
        case 'audio':
          return { ...ent, audioSource: { clip: 'sfx_coin', volume: 0.8, loop: false, playOnStart: false } };
        case 'animator':
          return { ...ent, animator: { clip: 'Spin', speed: 1.0, playOnStart: true } };
        case 'script':
          return {
            ...ent,
            script: {
              name: 'CustomScript.ts',
              code: '// Forge Script\nexport function update(dt: number) {\n  // Code executed every frame\n}',
              enabled: true,
            },
          };
        default:
          return ent;
      }
    });
    setShowAddComponentSheet(false);
  };

  return (
    <div className="flex flex-col h-full bg-forge-bg select-none overflow-y-auto pb-12">
      {/* Header: Entity Name & Tag */}
      <div className="p-3 bg-forge-panel border-b border-forge-panelBorder space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={selectedEntity.name}
            onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({ ...ent, name: e.target.value }))}
            className="flex-1 bg-forge-panelElevated border border-forge-borderSubtle px-2.5 py-1.5 rounded-lg text-sm font-bold text-forge-bone focus:outline-none focus:border-forge-orange"
          />
          <input
            type="text"
            placeholder={t('Tag', 'Etiket')}
            value={selectedEntity.tag || ''}
            onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({ ...ent, tag: e.target.value }))}
            className="w-24 bg-forge-panelElevated border border-forge-borderSubtle px-2 py-1.5 rounded-lg text-xs font-mono text-forge-gold placeholder-forge-boneMuted/40 focus:outline-none focus:border-forge-gold"
          />
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Transform Component */}
        <div className="bg-forge-panel rounded-xl border border-forge-panelBorder p-3 shadow-sm">
          <div className="flex items-center space-x-2 mb-2.5">
            <Move className="w-4 h-4 text-forge-orange" />
            <h4 className="text-xs font-bold text-forge-bone uppercase tracking-wider">{t('Transform', 'Dönüşüm')}</h4>
          </div>

          {/* Position */}
          <div className="mb-2">
            <span className="text-[11px] text-forge-boneMuted block mb-1">{t('Position', 'Konum')}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                <div key={axis} className="flex items-center bg-forge-panelElevated rounded-lg px-2 py-1 border border-forge-borderSubtle">
                  <span className="text-[10px] font-bold text-forge-orange mr-1">{axis}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedEntity.transform.position[i]}
                    onChange={(e) => updateTransform('position', i as any, parseFloat(e.target.value))}
                    className="w-full bg-transparent text-xs text-forge-bone focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rotation */}
          <div className="mb-2">
            <span className="text-[11px] text-forge-boneMuted block mb-1">{t('Rotation', 'Döndürme')}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                <div key={axis} className="flex items-center bg-forge-panelElevated rounded-lg px-2 py-1 border border-forge-borderSubtle">
                  <span className="text-[10px] font-bold text-forge-gold mr-1">{axis}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedEntity.transform.rotation[i]}
                    onChange={(e) => updateTransform('rotation', i as any, parseFloat(e.target.value))}
                    className="w-full bg-transparent text-xs text-forge-bone focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scale */}
          <div>
            <span className="text-[11px] text-forge-boneMuted block mb-1">{t('Scale', 'Ölçek')}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['X', 'Y', 'Z'] as const).map((axis, i) => (
                <div key={axis} className="flex items-center bg-forge-panelElevated rounded-lg px-2 py-1 border border-forge-borderSubtle">
                  <span className="text-[10px] font-bold text-blue-400 mr-1">{axis}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedEntity.transform.scale[i]}
                    onChange={(e) => updateTransform('scale', i as any, parseFloat(e.target.value))}
                    className="w-full bg-transparent text-xs text-forge-bone focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mesh Renderer Component */}
        {selectedEntity.meshRenderer && (
          <div className="bg-forge-panel rounded-xl border border-forge-panelBorder p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-forge-gold" />
                <h4 className="text-xs font-bold text-forge-bone uppercase tracking-wider">{t('Mesh Renderer', 'Model Kaplama')}</h4>
              </div>
              <span className="text-[10px] font-mono text-forge-boneMuted uppercase bg-forge-panelElevated px-1.5 py-0.5 rounded">
                {selectedEntity.meshRenderer.geometry}
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Color swatch & input */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-forge-boneMuted">{t('Base Color', 'Renk')}</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={selectedEntity.meshRenderer.color}
                    onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                      ...ent,
                      meshRenderer: { ...ent.meshRenderer!, color: e.target.value },
                    }))}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-forge-bone uppercase">{selectedEntity.meshRenderer.color}</span>
                </div>
              </div>

              {/* Metallic Slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-forge-boneMuted">{t('Metallic', 'Metalik')}</span>
                  <span className="font-mono text-forge-bone">{selectedEntity.meshRenderer.metallic.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedEntity.meshRenderer.metallic}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    meshRenderer: { ...ent.meshRenderer!, metallic: parseFloat(e.target.value) },
                  }))}
                  className="w-full accent-forge-orange"
                />
              </div>

              {/* Roughness Slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-forge-boneMuted">{t('Roughness', 'Pürüzlülük')}</span>
                  <span className="font-mono text-forge-bone">{selectedEntity.meshRenderer.roughness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedEntity.meshRenderer.roughness}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    meshRenderer: { ...ent.meshRenderer!, roughness: parseFloat(e.target.value) },
                  }))}
                  className="w-full accent-forge-orange"
                />
              </div>

              {/* Wireframe Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-forge-boneMuted">{t('Wireframe', 'Tel Kafes')}</span>
                <input
                  type="checkbox"
                  checked={selectedEntity.meshRenderer.wireframe}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    meshRenderer: { ...ent.meshRenderer!, wireframe: e.target.checked },
                  }))}
                  className="accent-forge-orange w-4 h-4 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Light Component */}
        {selectedEntity.light && (
          <div className="bg-forge-panel rounded-xl border border-forge-panelBorder p-3 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              <h4 className="text-xs font-bold text-forge-bone uppercase tracking-wider">{t('Light Source', 'Işık Kaynağı')}</h4>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-forge-boneMuted">{t('Intensity', 'Yoğunluk')}</span>
                <input
                  type="number"
                  step="0.2"
                  value={selectedEntity.light.intensity}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    light: { ...ent.light!, intensity: parseFloat(e.target.value) || 1 },
                  }))}
                  className="w-20 bg-forge-panelElevated border border-forge-borderSubtle px-2 py-1 rounded text-xs text-forge-bone"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-forge-boneMuted">{t('Cast Shadows', 'Gölge Oluştur')}</span>
                <input
                  type="checkbox"
                  checked={selectedEntity.light.castShadow}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    light: { ...ent.light!, castShadow: e.target.checked },
                  }))}
                  className="accent-forge-orange w-4 h-4 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Rigidbody Component */}
        {selectedEntity.rigidbody && (
          <div className="bg-forge-panel rounded-xl border border-forge-panelBorder p-3 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-4 h-4 text-green-400" />
              <h4 className="text-xs font-bold text-forge-bone uppercase tracking-wider">{t('Rigidbody (Physics)', 'Fizik Gövdesi')}</h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-forge-boneMuted">{t('Mass (kg)', 'Kütle (kg)')}</span>
                <input
                  type="number"
                  value={selectedEntity.rigidbody.mass}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    rigidbody: { ...ent.rigidbody!, mass: parseFloat(e.target.value) || 1 },
                  }))}
                  className="w-20 bg-forge-panelElevated border border-forge-borderSubtle px-2 py-1 rounded text-xs text-forge-bone"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-forge-boneMuted">{t('Use Gravity', 'Yerçekimi')}</span>
                <input
                  type="checkbox"
                  checked={selectedEntity.rigidbody.useGravity}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    rigidbody: { ...ent.rigidbody!, useGravity: e.target.checked },
                  }))}
                  className="accent-forge-orange w-4 h-4 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Audio Source Component */}
        {selectedEntity.audioSource && (
          <div className="bg-forge-panel rounded-xl border border-forge-panelBorder p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Music className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-forge-bone uppercase tracking-wider">{t('Audio Source', 'Ses Kaynağı')}</h4>
              </div>
              <button
                onClick={() => assetService.playSoundEffect(selectedEntity.audioSource?.clip || 'coin')}
                className="px-2 py-1 bg-forge-panelElevated border border-forge-borderSubtle rounded text-[11px] text-forge-gold flex items-center space-x-1 active:scale-95"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{t('Test', 'Çal')}</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-forge-boneMuted">{t('Clip', 'Klip')}</span>
                <select
                  value={selectedEntity.audioSource.clip}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    audioSource: { ...ent.audioSource!, clip: e.target.value },
                  }))}
                  className="bg-forge-panelElevated border border-forge-borderSubtle px-2 py-1 rounded text-xs text-forge-bone"
                >
                  <option value="coin">Coin Pickup</option>
                  <option value="jump">Player Jump</option>
                  <option value="laser">Plasma Laser</option>
                  <option value="explosion">Explosion</option>
                  <option value="hit">Damage Impact</option>
                  <option value="powerup">Power Up</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-forge-boneMuted">{t('Volume', 'Ses Düzeyi')}</span>
                  <span className="font-mono text-forge-bone">{Math.round(selectedEntity.audioSource.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedEntity.audioSource.volume}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    audioSource: { ...ent.audioSource!, volume: parseFloat(e.target.value) },
                  }))}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Animator Component */}
        {selectedEntity.animator && (
          <div className="bg-forge-panel rounded-xl border border-forge-panelBorder p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Film className="w-4 h-4 text-forge-orange" />
                <h4 className="text-xs font-bold text-forge-bone uppercase tracking-wider">{t('Animator', 'Animasyon')}</h4>
              </div>
              <button
                onClick={() => setAnimationModalOpen(true)}
                className="px-2 py-1 bg-forge-orange/15 border border-forge-orange/40 rounded text-[11px] text-forge-orange font-bold active:scale-95"
              >
                {t('Open Timeline', 'Zaman Çizelgesi')}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-forge-boneMuted">{t('Active Clip', 'Aktif Klip')}</span>
                <select
                  value={selectedEntity.animator.clip}
                  onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                    ...ent,
                    animator: { ...ent.animator!, clip: e.target.value },
                  }))}
                  className="bg-forge-panelElevated border border-forge-borderSubtle px-2 py-1 rounded text-xs text-forge-bone"
                >
                  <option value="Spin">Continuous Spin (360°)</option>
                  <option value="Bob">Gentle Levitation Bob</option>
                  <option value="Pulse">Energy Pulse</option>
                  <option value="Walk">Character Walk</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Script Component (In-app Code Editor) */}
        {selectedEntity.script && (
          <div className="bg-forge-panel rounded-xl border border-forge-panelBorder p-3 shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Code className="w-4 h-4 text-forge-gold" />
              <h4 className="text-xs font-bold text-forge-bone uppercase tracking-wider">{t('Script Component', 'Komut Dosyası')}</h4>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={selectedEntity.script.name}
                onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                  ...ent,
                  script: { ...ent.script!, name: e.target.value },
                }))}
                className="w-full bg-forge-panelElevated border border-forge-borderSubtle px-2.5 py-1 rounded text-xs font-mono text-forge-gold"
              />

              <textarea
                rows={6}
                value={selectedEntity.script.code}
                onChange={(e) => updateEntity(selectedEntity.id, (ent) => ({
                  ...ent,
                  script: { ...ent.script!, code: e.target.value },
                }))}
                className="w-full bg-forge-bg border border-forge-borderSubtle p-2.5 rounded-lg font-mono text-[11px] text-forge-bone leading-relaxed focus:outline-none focus:border-forge-orange"
              />
            </div>
          </div>
        )}

        {/* Add Component Button */}
        <button
          onClick={() => setShowAddComponentSheet(true)}
          className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-forge-borderSubtle hover:border-forge-orange flex items-center justify-center space-x-2 text-xs font-bold text-forge-boneMuted hover:text-forge-orange active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('Add Component', 'Bileşen Ekle')}</span>
        </button>
      </div>

      {/* Add Component Bottom Sheet */}
      {showAddComponentSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setShowAddComponentSheet(false)}
        >
          <div
            className="w-full max-w-md bg-forge-panel border-t border-forge-panelBorder rounded-t-2xl p-5 shadow-2xl animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-forge-panelBorder rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-forge-bone mb-3">
              {t('Select Component to Add', 'Eklenecek Bileşeni Seçin')}
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              {!selectedEntity.rigidbody && (
                <button
                  onClick={() => addComponentToEntity('rigidbody')}
                  className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-green-400"
                >
                  <Activity className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-semibold">{t('Rigidbody', 'Fizik')}</span>
                </button>
              )}

              {!selectedEntity.collider && (
                <button
                  onClick={() => addComponentToEntity('collider')}
                  className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-forge-orange"
                >
                  <Shield className="w-4 h-4 text-forge-orange" />
                  <span className="text-xs font-semibold">{t('Collider', 'Çarpıştırıcı')}</span>
                </button>
              )}

              {!selectedEntity.audioSource && (
                <button
                  onClick={() => addComponentToEntity('audio')}
                  className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-purple-400"
                >
                  <Music className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold">{t('Audio Source', 'Ses')}</span>
                </button>
              )}

              {!selectedEntity.animator && (
                <button
                  onClick={() => addComponentToEntity('animator')}
                  className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-forge-orange"
                >
                  <Film className="w-4 h-4 text-forge-orange" />
                  <span className="text-xs font-semibold">{t('Animator', 'Animatör')}</span>
                </button>
              )}

              {!selectedEntity.script && (
                <button
                  onClick={() => addComponentToEntity('script')}
                  className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-forge-gold"
                >
                  <Code className="w-4 h-4 text-forge-gold" />
                  <span className="text-xs font-semibold">{t('Script', 'Komut')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
