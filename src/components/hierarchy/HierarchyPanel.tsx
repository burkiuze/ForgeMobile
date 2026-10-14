import React, { useState } from 'react';
import {
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Box,
  Sun,
  Camera,
  Music,
  MoreVertical,
  Circle,
  FolderTree,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { Entity } from '../../types';
import { useTranslation } from '../../i18n';

export const HierarchyPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentProject,
    selectedEntityId,
    setSelectedEntityId,
    updateEntity,
    addEntity,
    duplicateEntity,
    deleteEntity,
  } = useEditorStore();

  const [activeMenuEntityId, setActiveMenuEntityId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const getEntityIcon = (entity: Entity) => {
    if (entity.light) return <Sun className="w-4 h-4 text-forge-gold" />;
    if (entity.camera) return <Camera className="w-4 h-4 text-blue-400" />;
    if (entity.audioSource) return <Music className="w-4 h-4 text-purple-400" />;
    if (entity.meshRenderer?.geometry === 'sphere') return <Circle className="w-4 h-4 text-forge-orange" />;
    return <Box className="w-4 h-4 text-forge-orange" />;
  };

  const handleCreateNewEntity = (type: 'cube' | 'sphere' | 'capsule' | 'light' | 'camera' | 'audio') => {
    const id = `ent_${Date.now()}`;
    let newEntity: Entity;

    switch (type) {
      case 'cube':
        newEntity = {
          id,
          name: 'Cube Prop',
          visible: true,
          transform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          meshRenderer: { geometry: 'box', color: '#F05A22', metallic: 0.2, roughness: 0.5, wireframe: false },
          collider: { type: 'box', isTrigger: false, size: [1, 1, 1] },
        };
        break;
      case 'sphere':
        newEntity = {
          id,
          name: 'Sphere Orb',
          visible: true,
          transform: { position: [0, 1.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          meshRenderer: { geometry: 'sphere', color: '#F2B233', metallic: 0.8, roughness: 0.2, wireframe: false },
          collider: { type: 'sphere', isTrigger: false, size: [1, 1, 1] },
        };
        break;
      case 'capsule':
        newEntity = {
          id,
          name: 'Capsule Hero',
          visible: true,
          transform: { position: [0, 1.2, 0], rotation: [0, 0, 0], scale: [0.8, 1.6, 0.8] },
          meshRenderer: { geometry: 'capsule', color: '#EDE6D8', metallic: 0.1, roughness: 0.4, wireframe: false },
          collider: { type: 'capsule', isTrigger: false, size: [0.8, 1.6, 0.8] },
          rigidbody: { mass: 1, drag: 0.1, useGravity: true, isKinematic: false },
        };
        break;
      case 'light':
        newEntity = {
          id,
          name: 'Point Light',
          visible: true,
          transform: { position: [0, 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          light: { type: 'point', color: '#F2B233', intensity: 2.0, castShadow: true },
        };
        break;
      case 'camera':
        newEntity = {
          id,
          name: 'Cinematic Camera',
          visible: true,
          transform: { position: [0, 5, 10], rotation: [-0.3, 0, 0], scale: [1, 1, 1] },
          camera: { fov: 60, near: 0.1, far: 500, isMain: false },
        };
        break;
      case 'audio':
        newEntity = {
          id,
          name: 'Audio Emitter',
          visible: true,
          transform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          audioSource: { clip: 'sfx_coin', volume: 0.8, loop: true, playOnStart: true },
        };
        break;
    }

    addEntity(newEntity);
    setShowAddSheet(false);
  };

  return (
    <div className="flex flex-col h-full bg-forge-bg select-none">
      {/* Hierarchy Header */}
      <div className="p-3 bg-forge-panel border-b border-forge-panelBorder flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FolderTree className="w-4 h-4 text-forge-orange" />
          <span className="text-xs font-bold text-forge-bone uppercase tracking-wider">
            {t('Scene Hierarchy', 'Sahne Hiyerarşisi')}
          </span>
          <span className="text-[10px] bg-forge-panelElevated text-forge-gold px-2 py-0.5 rounded-full font-mono">
            {currentProject?.entities.length ?? 0}
          </span>
        </div>

        <button
          onClick={() => setShowAddSheet(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-forge-orange text-white active:scale-95 shadow-md"
          title={t('Add Entity', 'Varlık Ekle')}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Entity Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {currentProject?.entities.map((entity) => {
          const isSelected = selectedEntityId === entity.id;

          return (
            <div
              key={entity.id}
              onClick={() => setSelectedEntityId(entity.id)}
              className={`min-h-[48px] px-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                isSelected
                  ? 'bg-forge-orange/15 border border-forge-orange shadow-sm'
                  : 'bg-forge-panel border border-transparent hover:border-forge-borderSubtle'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <div className="p-1.5 rounded-lg bg-forge-panelElevated flex items-center justify-center">
                  {getEntityIcon(entity)}
                </div>

                <div className="truncate">
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-xs font-medium truncate ${isSelected ? 'text-forge-orange font-bold' : 'text-forge-bone'}`}>
                      {entity.name}
                    </span>
                    {entity.tag && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-forge-panelElevated text-forge-boneMuted">
                        {entity.tag}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Visibility & Context Menu */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateEntity(entity.id, (ent) => ({ ...ent, visible: !ent.visible }));
                  }}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-forge-boneMuted hover:text-forge-bone active:bg-forge-panelElevated"
                  title={entity.visible ? t('Hide', 'Gizle') : t('Show', 'Göster')}
                >
                  {entity.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-forge-danger" />}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuEntityId(activeMenuEntityId === entity.id ? null : entity.id);
                  }}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-forge-boneMuted hover:text-forge-bone active:bg-forge-panelElevated"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu Bottom Sheet */}
      {activeMenuEntityId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setActiveMenuEntityId(null)}
        >
          <div
            className="w-full max-w-md bg-forge-panel border-t border-forge-panelBorder rounded-t-2xl p-4 shadow-2xl animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-forge-panelBorder rounded-full mx-auto mb-3" />
            <h3 className="text-xs font-bold text-forge-boneMuted uppercase tracking-wider mb-2">
              {currentProject?.entities.find((e) => e.id === activeMenuEntityId)?.name}
            </h3>

            <div className="space-y-1">
              <button
                onClick={() => {
                  duplicateEntity(activeMenuEntityId);
                  setActiveMenuEntityId(null);
                }}
                className="w-full min-h-[48px] px-3 rounded-xl bg-forge-panelElevated flex items-center space-x-3 text-forge-bone hover:text-forge-orange active:bg-forge-panelBorder"
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm font-medium">{t('Duplicate Entity', 'Çoğalt')}</span>
              </button>

              <button
                onClick={() => {
                  deleteEntity(activeMenuEntityId);
                  setActiveMenuEntityId(null);
                }}
                className="w-full min-h-[48px] px-3 rounded-xl bg-forge-panelElevated flex items-center space-x-3 text-forge-danger hover:bg-forge-danger/10"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">{t('Delete Entity', 'Sil')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entity Modal / Bottom Sheet */}
      {showAddSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setShowAddSheet(false)}
        >
          <div
            className="w-full max-w-md bg-forge-panel border-t border-forge-panelBorder rounded-t-2xl p-5 shadow-2xl animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-forge-panelBorder rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-forge-bone mb-3">
              {t('Add New Game Entity', 'Yeni Varlık Ekle')}
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleCreateNewEntity('cube')}
                className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-forge-orange"
              >
                <Box className="w-5 h-5 text-forge-orange" />
                <span className="text-xs font-semibold">{t('Cube Prop', 'Küp')}</span>
              </button>

              <button
                onClick={() => handleCreateNewEntity('sphere')}
                className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-forge-orange"
              >
                <Circle className="w-5 h-5 text-forge-gold" />
                <span className="text-xs font-semibold">{t('Sphere Orb', 'Küre')}</span>
              </button>

              <button
                onClick={() => handleCreateNewEntity('capsule')}
                className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-forge-orange"
              >
                <Box className="w-5 h-5 text-green-400" />
                <span className="text-xs font-semibold">{t('Capsule Character', 'Kapsül')}</span>
              </button>

              <button
                onClick={() => handleCreateNewEntity('light')}
                className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-forge-orange"
              >
                <Sun className="w-5 h-5 text-yellow-400" />
                <span className="text-xs font-semibold">{t('Point Light', 'Işık')}</span>
              </button>

              <button
                onClick={() => handleCreateNewEntity('camera')}
                className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-forge-orange"
              >
                <Camera className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-semibold">{t('Camera', 'Kamera')}</span>
              </button>

              <button
                onClick={() => handleCreateNewEntity('audio')}
                className="min-h-[48px] p-3 rounded-xl bg-forge-panelElevated border border-forge-borderSubtle flex items-center space-x-3 text-forge-bone active:border-forge-orange"
              >
                <Music className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-semibold">{t('Audio Source', 'Ses')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
