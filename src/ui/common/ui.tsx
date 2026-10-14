import { ChevronDown, ChevronRight, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RGB, Vec3, colorHex, parseColor } from '../../core/scene';
import { onBack } from '../../platform/native';
import { useSettings } from '../../state/settings';

export function haptic(ms = 8) {
  if (useSettings.getState().haptics) navigator.vibrate?.(ms);
}

/** Close on the Android back button while mounted. */
export function useBack(active: boolean, fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    return onBack(() => {
      ref.current();
      return true;
    });
  }, [active]);
}

// ------------------------------------------------------------------ logo

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} className={className} aria-label="Forge">
      <path d="M50 62 H196 L184 88 H50 Z" fill="rgb(var(--acc))" />
      <path d="M50 112 H78 V196 H50 Z" fill="rgb(var(--ink))" />
      <path d="M90 112 H162 L149 140 H90 Z" fill="rgb(var(--ink))" />
      <path className="spark" d="M212 38 L219 45 L212 52 L205 45 Z" fill="#F2B233" />
      <path className="spark" style={{ animationDelay: '.6s' }} d="M227 63 L232 68 L227 73 L222 68 Z" fill="#F2B233" />
      <path className="spark" style={{ animationDelay: '1.2s' }} d="M206 79 L210 83 L206 87 L202 83 Z" fill="#F2B233" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={44} />
      <div className="leading-none">
        <div className="text-[1.6rem] font-black tracking-[0.18em]">FORGE</div>
        <div className="text-[0.62rem] tracking-[0.35em] text-mute mt-1">SHAPED BY FIRE</div>
      </div>
    </div>
  );
}

export function MadeBy() {
  return (
    <div className="pointer-events-none select-none text-center text-[0.68rem] tracking-wide text-ink/30 py-2">made by burkiuze</div>
  );
}

// ------------------------------------------------------------------ sheets & dialogs

export function Sheet({
  open,
  onClose,
  title,
  children,
  full = false,
  right,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  full?: boolean;
  right?: React.ReactNode;
}) {
  useBack(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end fade-in">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div
        className={`relative slide-up bg-s1 border-t border-line/70 rounded-t-[1.6rem] shadow-lift flex flex-col ${
          full ? 'h-[92%]' : 'max-h-[85%]'
        } sm:mx-auto sm:w-[34rem] sm:mb-4 sm:rounded-[1.6rem] sm:border`}
      >
        <div className="pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-line" />
        </div>
        {(title || right) && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <div className="flex-1 text-[1.05rem] font-bold truncate">{title}</div>
            {right}
            <button className="icon-btn -mr-2" onClick={onClose} aria-label="close">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({
  open, title, body, okText, danger, onOk, onClose,
}: { open: boolean; title: string; body?: React.ReactNode; okText: string; danger?: boolean; onOk: () => void; onClose: () => void }) {
  useBack(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative card p-5 w-full max-w-sm shadow-lift slide-up">
        <div className="text-[1.05rem] font-bold">{title}</div>
        {body && <div className="text-[0.88rem] text-mute mt-2">{body}</div>}
        <div className="flex gap-2 mt-5">
          <button className="btn-ghost flex-1" onClick={onClose}>
            ✕
          </button>
          <button className={`${danger ? 'btn-danger' : 'btn-acc'} flex-[2]`} onClick={() => (onOk(), onClose())}>
            {okText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

let toastSet: ((m: { text: string; kind: 'ok' | 'err' | 'info' } | null) => void) | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function toast(text: string, kind: 'ok' | 'err' | 'info' = 'info') {
  toastSet?.({ text, kind });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastSet?.(null), kind === 'err' ? 5000 : 2600);
}

export function ToastHost() {
  const [m, setM] = useState<{ text: string; kind: 'ok' | 'err' | 'info' } | null>(null);
  useEffect(() => {
    toastSet = setM;
    return () => {
      toastSet = null;
    };
  }, []);
  if (!m) return null;
  return (
    <div className="fixed left-0 right-0 bottom-24 z-[70] flex justify-center px-4 pointer-events-none fade-in">
      <div
        className={`max-w-md px-4 py-2.5 rounded-2xl shadow-lift text-[0.85rem] font-medium border ${
          m.kind === 'err' ? 'bg-bad text-white border-bad' : m.kind === 'ok' ? 'bg-s3 text-ink border-ok/50' : 'bg-s3 text-ink border-line'
        }`}
      >
        {m.text}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ fields

export function Section({ title, children, defaultOpen = true, right }: { title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; right?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-3 overflow-hidden">
      <div className="flex items-center">
        <button className="flex-1 flex items-center gap-2 px-4 h-12 text-left font-semibold text-[0.92rem]" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="w-4 h-4 text-mute" /> : <ChevronRight className="w-4 h-4 text-mute" />}
          {title}
        </button>
        {right && <div className="pr-2">{right}</div>}
      </div>
      {open && <div className="px-4 pb-3 border-t border-line/50 pt-2">{children}</div>}
    </div>
  );
}

export function Row({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="row">
      <div className="min-w-0">
        <div className="text-[0.88rem]">{label}</div>
        {hint && <div className="text-[0.72rem] text-mute leading-snug mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0 flex items-center">{children}</div>
    </div>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => (haptic(), onChange(!value))}
      className={`relative w-[3.1rem] h-[1.85rem] rounded-full transition ${value ? 'bg-acc' : 'bg-s3 border border-line'}`}
    >
      <span className={`absolute top-[0.2rem] w-[1.45rem] h-[1.45rem] rounded-full bg-white shadow transition-all ${value ? 'left-[1.45rem]' : 'left-[0.2rem]'}`} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, small }: { value: T; options: { v: T; label: React.ReactNode }[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-s2 border border-line/70 gap-1 flex-wrap">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => (haptic(), onChange(o.v))}
          className={`${small ? 'h-8 px-2.5 text-[0.75rem]' : 'h-9 px-3 text-[0.8rem]'} rounded-lg font-semibold transition ${
            value === o.v ? 'bg-acc text-white shadow' : 'text-mute'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ value, min, max, step = 0.01, onChange, format }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="flex items-center gap-2 w-[12rem]">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[rgb(var(--acc))] h-8"
      />
      <span className="w-12 text-right text-[0.78rem] text-mute tabular-nums">{format ? format(value) : value.toFixed(2)}</span>
    </div>
  );
}

/** Number field with drag-to-scrub on the label. */
export function NumField({ value, onChange, step = 0.1, label, color, className = '' }: { value: number; onChange: (v: number) => void; step?: number; label?: string; color?: string; className?: string }) {
  const [text, setText] = useState(fmt(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setText(fmt(value));
  }, [value, focus]);
  const drag = useRef<{ x: number; v: number } | null>(null);
  return (
    <div className={`flex items-center h-10 rounded-xl bg-s2 border border-line/70 overflow-hidden ${className}`}>
      {label && (
        <span
          className="px-2 h-full flex items-center text-[0.75rem] font-bold touch-none"
          style={{ color: color || 'rgb(var(--mute))' }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, v: value };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const d = (e.clientX - drag.current.x) / 8;
            onChange(round(drag.current.v + Math.round(d) * step));
          }}
          onPointerUp={() => (drag.current = null)}
        >
          {label}
        </span>
      )}
      <input
        inputMode="decimal"
        className="w-full min-w-0 h-full bg-transparent px-1.5 text-[0.85rem] tabular-nums outline-none"
        value={text}
        onFocus={(e) => (setFocus(true), e.target.select())}
        onBlur={() => {
          setFocus(false);
          const v = Number(text.replace(',', '.'));
          if (isFinite(v)) onChange(v);
          else setText(fmt(value));
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
}

const round = (v: number) => Math.round(v * 1000) / 1000;
const fmt = (v: number) => String(round(v));

export function Vec3Field({ value, onChange, step = 0.1 }: { value: Vec3; onChange: (v: Vec3) => void; step?: number }) {
  const cols = ['#E5484D', '#4CB782', '#3B82F6'];
  return (
    <div className="grid grid-cols-3 gap-1.5 w-full">
      {(['X', 'Y', 'Z'] as const).map((l, i) => (
        <NumField
          key={l}
          label={l}
          color={cols[i]}
          step={step}
          value={value[i]}
          onChange={(v) => {
            const n = [...value] as Vec3;
            n[i] = v;
            onChange(n);
          }}
        />
      ))}
    </div>
  );
}

export function ColorField({ value, onChange }: { value: RGB; onChange: (c: RGB) => void }) {
  const hex = colorHex(value);
  return (
    <label className="flex items-center gap-2 h-10 pl-1 pr-3 rounded-xl bg-s2 border border-line/70">
      <input type="color" value={hex} onChange={(e) => onChange(parseColor(e.target.value)!)} className="w-8 h-8 rounded-lg bg-transparent border-0 p-0" />
      <span className="text-[0.8rem] font-mono text-mute">{hex}</span>
    </label>
  );
}

export function Select<T extends string>({ value, options, onChange, className = '' }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={`input pr-8 ${className}`}>
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Empty({ icon, title, body, children }: { icon?: React.ReactNode; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6 gap-2">
      {icon && <div className="text-mute mb-1">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {body && <div className="text-[0.82rem] text-mute max-w-xs">{body}</div>}
      {children}
    </div>
  );
}

/** Hidden file input helper. */
export function pickFiles(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.multiple = multiple;
    inp.onchange = () => resolve(inp.files ? [...inp.files] : []);
    inp.click();
  });
}
