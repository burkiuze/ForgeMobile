import { Box, Camera, ChevronDown, ChevronRight, Copy, CornerDownRight, Eye, EyeOff, Lightbulb, MoreHorizontal, Package, Pencil, Search, Sun, Trash2, Volume2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Entity, EntityId } from '../../core/scene';
import { useT } from '../../i18n';
import { useEditor } from '../../state/editor';
import { Confirm, Empty, Sheet, haptic } from '../common/ui';

function iconFor(e: Entity) {
  const c = 'w-4 h-4';
  if (e.camera) return <Camera className={c} />;
  if (e.light) return e.light.kind === 'point' ? <Lightbulb className={c} /> : <Sun className={c} />;
  if (e.mesh === 'model') return <Package className={c} />;
  if (e.audio && e.mesh === 'none') return <Volume2 className={c} />;
  return <Box className={c} />;
}

export function Hierarchy() {
  const t = useT();
  const { scene, selected, select, setTab, updateEntity, duplicate, remove, reparent } = useEditor();
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState<Set<EntityId>>(new Set());
  const [menu, setMenu] = useState<Entity | null>(null);
  const [name, setName] = useState('');
  const [parentPick, setParentPick] = useState<Entity | null>(null);
  const [del, setDel] = useState<Entity | null>(null);

  const rows = useMemo(() => {
    const out: { e: Entity; depth: number; kids: number }[] = [];
    const kids = (pid: EntityId | null) => scene.entities.filter((e) => e.parent === pid || (pid === null && e.parent != null && !scene.entities.some((p) => p.id === e.parent)));
    const walk = (pid: EntityId | null, depth: number) => {
      for (const e of kids(pid)) {
        const k = scene.entities.filter((c) => c.parent === e.id).length;
        out.push({ e, depth, kids: k });
        if (!collapsed.has(e.id)) walk(e.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [scene, collapsed]);

  const filtered = q.trim() ? scene.entities.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) || e.tag.toLowerCase().includes(q.toLowerCase())).map((e) => ({ e, depth: 0, kids: 0 })) : rows;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-mute" />
          <input className="input pl-9" placeholder={t('Search objects', 'Nesne ara')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-24">
        {filtered.length === 0 && <Empty title={t('Empty scene', 'Boş sahne')} body={t('Tap + on the Scene tab or ask Forge AI to build something.', 'Sahne sekmesinde + simgesine dokun ya da Forge AI’dan bir şey kurmasını iste.')} />}
        {filtered.map(({ e, depth, kids }) => {
          const on = e.id === selected;
          return (
            <div
              key={e.id}
              className={`flex items-center h-12 rounded-xl mb-0.5 pr-1 ${on ? 'bg-acc/15 text-ink' : 'active:bg-s2'} ${e.active ? '' : 'opacity-50'}`}
              style={{ paddingLeft: `${0.4 + depth * 1.1}rem` }}
            >
              <button
                className="w-7 h-10 flex items-center justify-center text-mute"
                onClick={() => {
                  const n = new Set(collapsed);
                  if (n.has(e.id)) n.delete(e.id);
                  else n.add(e.id);
                  setCollapsed(n);
                }}
              >
                {kids > 0 ? collapsed.has(e.id) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" /> : null}
              </button>
              <button
                className="flex-1 flex items-center gap-2.5 h-full min-w-0 text-left"
                onClick={() => {
                  haptic(4);
                  if (on) setTab('inspector');
                  else select(e.id);
                }}
                onContextMenu={(ev) => (ev.preventDefault(), setMenu(e), setName(e.name))}
              >
                <span className={on ? 'text-acc' : 'text-mute'}>{iconFor(e)}</span>
                <span className="truncate text-[0.9rem] font-medium">{e.name}</span>
                {e.tag && <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-s3 text-mute shrink-0">{e.tag}</span>}
                {e.script && <span className="text-[0.65rem] text-gold shrink-0">{'{ }'}</span>}
              </button>
              <button className="w-10 h-10 flex items-center justify-center text-mute" onClick={() => updateEntity(e.id, (x) => void (x.active = !x.active))}>
                {e.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button className="w-10 h-10 flex items-center justify-center text-mute" onClick={() => (setMenu(e), setName(e.name))}>
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name}>
        {menu && (
          <div className="grid gap-2 pb-2">
            <div className="flex gap-2">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn-ghost" onClick={() => (updateEntity(menu.id, (x) => void (x.name = name.trim() || x.name)), setMenu(null))}>
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <button className="btn-ghost justify-start" onClick={() => (duplicate(menu.id), setMenu(null))}>
              <Copy className="w-4 h-4" /> {t('Duplicate', 'Çoğalt')}
            </button>
            <button className="btn-ghost justify-start" onClick={() => (setParentPick(menu), setMenu(null))}>
              <CornerDownRight className="w-4 h-4" /> {t('Move under…', 'Şunun altına taşı…')}
            </button>
            {menu.parent != null && (
              <button className="btn-ghost justify-start" onClick={() => (reparent(menu.id, null), setMenu(null))}>
                <CornerDownRight className="w-4 h-4 rotate-180" /> {t('Move to top level', 'En üste taşı')}
              </button>
            )}
            <button className="btn-danger justify-start" onClick={() => (setDel(menu), setMenu(null))}>
              <Trash2 className="w-4 h-4" /> {t('Delete', 'Sil')}
            </button>
          </div>
        )}
      </Sheet>
      <Sheet open={!!parentPick} onClose={() => setParentPick(null)} title={t('Choose a parent', 'Ebeveyn seç')}>
        <div className="grid gap-1 pb-2">
          {scene.entities
            .filter((x) => x.id !== parentPick?.id)
            .map((x) => (
              <button key={x.id} className="h-11 px-3 rounded-xl bg-s2 text-left flex items-center gap-2" onClick={() => (reparent(parentPick!.id, x.id), setParentPick(null))}>
                <span className="text-mute">{iconFor(x)}</span>
                {x.name}
              </button>
            ))}
        </div>
      </Sheet>
      <Confirm open={!!del} title={t('Delete object?', 'Nesne silinsin mi?')} body={del?.name} okText={t('Delete', 'Sil')} danger onOk={() => del && remove(del.id)} onClose={() => setDel(null)} />
    </div>
  );
}
