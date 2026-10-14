import React, { useState } from 'react';
import { useT } from '../../../i18n';
import { Segmented } from '../../common/ui';
import { AnimationsTab } from './AnimationsTab';
import { ProjectTab } from './ProjectTab';
import { SoundsTab } from './SoundsTab';
import { StoreTab } from './StoreTab';

type Section = 'project' | 'store' | 'sounds' | 'anims';

export function AssetsPanel() {
  const t = useT();
  const [sec, setSec] = useState<Section>('project');
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 overflow-x-auto no-scrollbar">
        <Segmented
          value={sec}
          onChange={setSec}
          options={[
            { v: 'project', label: t('Project', 'Proje') },
            { v: 'store', label: t('Store', 'Mağaza') },
            { v: 'sounds', label: t('Sounds', 'Sesler') },
            { v: 'anims', label: t('Animations', 'Animasyonlar') },
          ]}
        />
      </div>
      <div className="flex-1 min-h-0">
        {sec === 'project' && <ProjectTab />}
        {sec === 'store' && <StoreTab />}
        {sec === 'sounds' && <SoundsTab />}
        {sec === 'anims' && <AnimationsTab />}
      </div>
    </div>
  );
}
