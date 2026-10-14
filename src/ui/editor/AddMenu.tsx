import { Box, Camera, Circle, Cone, Cylinder, Lightbulb, Package, Pill, Square, Sun, Volume2 } from 'lucide-react';
import React from 'react';
import { MeshKind, defaultAudio, defaultCamera, defaultLight, pointLight } from '../../core/scene';
import { useT } from '../../i18n';
import { useEditor } from '../../state/editor';
import { Sheet, haptic } from '../common/ui';

/** "+" menu: primitives for level geometry, lights, cameras, audio and asset shortcuts. */
export function AddMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const add = useEditor((s) => s.addEntity);
  const setTab = useEditor((s) => s.setTab);

  const shape = (name: string, mesh: MeshKind, y = 0.5) => () => {
    haptic();
    add(name, mesh, (e) => {
      e.transform.position = [0, mesh === 'plane' ? 0 : y, 0];
      if (mesh === 'plane') e.transform.scale = [10, 1, 10];
      e.color = [0.85, 0.83, 0.8];
    });
    onClose();
  };

  const items: { icon: React.ReactNode; label: string; on: () => void }[] = [
    { icon: <Box />, label: t('Cube', 'Küp'), on: shape('Cube', 'cube') },
    { icon: <Circle />, label: t('Sphere', 'Küre'), on: shape('Sphere', 'sphere') },
    { icon: <Square />, label: t('Plane', 'Düzlem'), on: shape('Plane', 'plane') },
    { icon: <Cylinder />, label: t('Cylinder', 'Silindir'), on: shape('Cylinder', 'cylinder') },
    { icon: <Cone />, label: t('Cone', 'Koni'), on: shape('Cone', 'cone') },
    { icon: <Pill />, label: t('Capsule', 'Kapsül'), on: shape('Capsule', 'capsule', 1) },
    {
      icon: <Sun />,
      label: t('Sun', 'Güneş'),
      on: () => {
        add('Sun', 'none', (e) => {
          e.light = defaultLight();
          e.transform.position = [0, 10, 0];
          e.transform.rotation = [-50, 30, 0];
        });
        onClose();
      },
    },
    {
      icon: <Lightbulb />,
      label: t('Point light', 'Nokta ışık'),
      on: () => {
        add('Point Light', 'none', (e) => {
          e.light = pointLight();
          e.transform.position = [0, 3, 0];
        });
        onClose();
      },
    },
    {
      icon: <Camera />,
      label: t('Camera', 'Kamera'),
      on: () => {
        add('Camera', 'none', (e) => {
          e.camera = defaultCamera();
          e.transform.position = [0, 4, 8];
          e.transform.rotation = [-20, 0, 0];
        });
        onClose();
      },
    },
    {
      icon: <Volume2 />,
      label: t('Audio source', 'Ses kaynağı'),
      on: () => {
        add('Audio Source', 'none', (e) => (e.audio = defaultAudio()));
        onClose();
      },
    },
    {
      icon: <Package />,
      label: t('Model / asset…', 'Model / varlık…'),
      on: () => {
        setTab('assets');
        onClose();
      },
    },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t('Add to scene', 'Sahneye ekle')}>
      <div className="grid grid-cols-4 gap-2 pb-3">
        {items.map((it) => (
          <button key={it.label} onClick={it.on} className="aspect-square rounded-2xl bg-s2 border border-line/60 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition text-ink">
            <span className="text-acc [&>svg]:w-6 [&>svg]:h-6">{it.icon}</span>
            <span className="text-[0.7rem] font-semibold text-center leading-tight px-1">{it.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[0.75rem] text-mute pb-3">
        {t(
          'Tip: shapes are for level geometry. For characters and props use real models from Assets › Store, or ask Forge AI.',
          'İpucu: şekiller bölüm geometrisi içindir. Karakter ve objeler için Varlıklar › Mağaza’dan gerçek modeller kullan ya da Forge AI’a sor.',
        )}
      </p>
    </Sheet>
  );
}
