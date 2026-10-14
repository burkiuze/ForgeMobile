import { ToolCall } from '../../../ai/tools';
import { t } from '../../../i18n';

/** Human label for a tool call: [verb, detail]. */
export function describe(call: ToolCall): [string, string] {
  const a = call.args || {};
  const tgt = String(a.target ?? a.name ?? '');
  const v = (en: string, tr: string) => t(en, tr);
  switch (call.name) {
    case 'get_scene':
      return [v('Read scene', 'Sahne okundu'), ''];
    case 'create_entity':
      return [v('Create', 'Oluştur'), `${a.name ?? ''}${a.model ? ` · ${String(a.model).split('/').pop()}` : a.mesh ? ` · ${a.mesh}` : ''}`];
    case 'create_many':
      return [v('Create', 'Oluştur'), `${Array.isArray(a.entities) ? a.entities.length : 0} ${v('objects', 'nesne')}: ${(a.entities || []).slice(0, 4).map((e: any) => e.name).join(', ')}`];
    case 'update_entity':
      return [v('Edit', 'Düzenle'), `${tgt} · ${Object.keys(a).filter((k) => k !== 'target').join(', ')}`];
    case 'delete_entity':
      return [v('Delete', 'Sil'), tgt];
    case 'duplicate_entity':
      return [v('Duplicate', 'Çoğalt'), `${tgt} ×${a.count ?? 1}`];
    case 'set_script':
      return [v('Script', 'Betik'), tgt];
    case 'ask_coder':
      return [v('Coder writes script', 'Kodlayıcı betik yazıyor'), tgt];
    case 'add_camera':
      return [v('Camera', 'Kamera'), `${a.name ?? 'Main Camera'}${a.follow ? ` → ${a.follow}` : ''}`];
    case 'set_environment':
      return [v('Environment', 'Ortam'), Object.keys(a).join(', ')];
    case 'clear_scene':
      return [v('Clear scene', 'Sahneyi temizle'), a.keep ? `keep ${a.keep}` : ''];
    case 'select':
      return [v('Select', 'Seç'), tgt];
    case 'web_search':
      return [v('Web search', 'Web araması'), String(a.query ?? '')];
    case 'fetch_url':
      return [v('Read page', 'Sayfa okundu'), String(a.url ?? '').replace(/^https?:\/\//, '')];
    case 'memory_search':
      return [v('Memory', 'Hafıza'), String(a.query ?? '')];
    case 'remember':
      return [v('Remember', 'Hatırla'), String(a.fact ?? '')];
    case 'todo_write':
      return [v('Plan', 'Plan'), `${(a.todos || []).length} ${v('tasks', 'görev')}`];
    case 'task':
      return [v('Subagent', 'Alt ajan'), `${a.agent ?? 'explore'}: ${String(a.prompt ?? '').slice(0, 60)}`];
    case 'list_files':
      return [v('List files', 'Dosyaları listele'), String(a.path ?? '')];
    case 'read_file':
      return [v('Read file', 'Dosya oku'), String(a.path ?? '')];
    case 'write_file':
      return [v('Write file', 'Dosya yaz'), String(a.path ?? '')];
    case 'delete_file':
      return [v('Delete file', 'Dosya sil'), String(a.path ?? '')];
    case 'grep':
      return [v('Search code', 'Kodda ara'), String(a.pattern ?? '')];
    case 'list_assets':
      return [v('List assets', 'Varlıkları listele'), ''];
    case 'inspect_asset':
      return [v('Inspect asset', 'Varlığı incele'), String(a.path ?? '')];
    case 'asset_search':
      return [v('Search assets', 'Varlık ara'), `${a.source ?? 'polyhaven'} · ${a.kind ?? ''} · ${a.query ?? ''}`];
    case 'asset_import':
      return [v('Download asset', 'Varlık indir'), `${a.source ?? 'polyhaven'} · ${a.id ?? ''}`];
    case 'generate_sound':
      return [v('Generate sound', 'Ses üret'), `${a.preset ?? ''} → ${a.name ?? a.preset ?? ''}`];
    case 'create_animation':
      return [v('Animation', 'Animasyon'), `${a.name ?? a.preset ?? ''}${a.target ? ` → ${a.target}` : ''}`];
    default:
      return [call.name, JSON.stringify(a).slice(0, 80)];
  }
}

export const roleLabel = (r: string) =>
  ({
    planner: t('Planner', 'Planlayıcı'),
    builder: t('Builder', 'Kurucu'),
    reviewer: t('Reviewer', 'Denetçi'),
    coder: t('Coder', 'Kodlayıcı'),
    explore: t('Explore', 'Kâşif'),
    assistant: t('Assistant', 'Asistan'),
  })[r] || r;
