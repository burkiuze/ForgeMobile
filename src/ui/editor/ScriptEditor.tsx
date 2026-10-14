import { Check, FileCode2, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { checkScript } from '../../core/rhai';
import { SCRIPT_TEMPLATES, getEntity } from '../../core/scene';
import { useT } from '../../i18n';
import { useChat } from '../../state/chat';
import { useEditor } from '../../state/editor';
import { useSettings } from '../../state/settings';
import { Sheet, toast } from '../common/ui';

const SNIPPETS = ['this.x', 'this.y', 'this.z', 'this.ry', 'this.vy', 'key("SPACE")', 'key_pressed("SPACE")', 'touching(this.name, "Coin")', 'play_sound("Audio/coin.wav")', 'hud("")', 'dt', '{ }', ';'];

export function ScriptEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const ed = useEditor();
  const e = getEntity(ed.scene, ed.selected);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const aiEnabled = useSettings((s) => s.aiEnabled);
  const [ta, setTa] = useState<HTMLTextAreaElement | null>(null);
  const [goal, setGoal] = useState('');

  useEffect(() => {
    if (open) {
      setCode(e?.script || '');
      setErr(null);
    }
  }, [open, e?.id]);

  const save = () => {
    if (!e) return;
    const problem = code.trim() ? checkScript(code) : null;
    setErr(problem);
    if (problem) return toast(`${t('Syntax error', 'Sözdizimi hatası')}: ${problem}`, 'err');
    ed.updateEntity(e.id, (x) => void (x.script = code));
    toast(t('Script saved', 'Betik kaydedildi'), 'ok');
    onClose();
  };

  const insert = (s: string) => {
    if (!ta) return setCode(code + s);
    const a = ta.selectionStart;
    const b = ta.selectionEnd;
    const next = code.slice(0, a) + s + code.slice(b);
    setCode(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = a + s.length;
    });
  };

  return (
    <Sheet
      open={open && !!e}
      onClose={onClose}
      full
      title={
        <span className="flex items-center gap-2">
          <FileCode2 className="w-5 h-5 text-acc" /> {e?.name}
        </span>
      }
      right={
        <button className="btn-acc h-9 px-3" onClick={save}>
          <Check className="w-4 h-4" /> {t('Save', 'Kaydet')}
        </button>
      }
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
        {SCRIPT_TEMPLATES.map(([name, src]) => (
          <button key={name} className="chip shrink-0" onClick={() => setCode(src)}>
            {name}
          </button>
        ))}
      </div>
      <textarea
        ref={setTa}
        value={code}
        onChange={(ev) => setCode(ev.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={`w-full h-[52vh] font-mono text-[0.78rem] leading-relaxed bg-bg border rounded-2xl p-3 outline-none ${err ? 'border-bad' : 'border-line focus:border-acc'}`}
        placeholder={'fn start() { }\nfn update(dt) {\n    this.ry += 90.0 * dt;\n}'}
      />
      {err && <div className="text-[0.75rem] text-bad mt-1 font-mono">{err}</div>}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2">
        {SNIPPETS.map((s) => (
          <button key={s} className="h-9 px-2.5 rounded-lg bg-s2 border border-line/60 font-mono text-[0.72rem] shrink-0" onClick={() => insert(s)}>
            {s}
          </button>
        ))}
      </div>
      {aiEnabled && e && (
        <div className="flex gap-2">
          <input className="input" placeholder={t('Describe it — Forge AI writes it', 'Anlat — Forge AI yazsın')} value={goal} onChange={(ev) => setGoal(ev.target.value)} />
          <button
            className="btn-ghost shrink-0"
            disabled={!goal.trim()}
            onClick={() => {
              onClose();
              ed.setTab('ai');
              useChat.getState().send(`/script @${e.name.replace(/ /g, '_')} ${goal.trim()}`);
              setGoal('');
            }}
          >
            <Sparkles className="w-4 h-4 text-acc" />
          </button>
        </div>
      )}
      <p className="text-[0.72rem] text-mute mt-3 leading-relaxed">
        {t(
          'Scripts use the same Rhai syntax as Forge on PC. On the phone the joystick sends W/A/S/D, the big button SPACE and the small one E.',
          'Betikler PC’deki Forge ile aynı Rhai sözdizimini kullanır. Telefonda joystick W/A/S/D, büyük düğme SPACE, küçük düğme E gönderir.',
        )}
      </p>
    </Sheet>
  );
}
