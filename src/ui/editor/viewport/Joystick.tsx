import React, { useRef, useState } from 'react';
import { haptic } from '../../common/ui';

/**
 * On-screen controls for play mode. The joystick maps to W/A/S/D + arrow keys,
 * the round buttons to SPACE (jump) and E (action) — the keys desktop scripts use.
 */
export function Joystick({ onKeys }: { onKeys: (key: string, down: boolean) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const held = useRef(new Set<string>());
  const pid = useRef<number | null>(null);

  const setDir = (x: number, y: number) => {
    const want = new Set<string>();
    const th = 0.35;
    if (x < -th) want.add('A').add('LEFT');
    if (x > th) want.add('D').add('RIGHT');
    if (y < -th) want.add('W').add('UP');
    if (y > th) want.add('S').add('DOWN');
    for (const k of held.current) if (!want.has(k)) onKeys(k, false);
    for (const k of want) if (!held.current.has(k)) onKeys(k, true);
    held.current = want;
  };

  const move = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    setKnob({ x: dx, y: dy });
    setDir(dx, dy);
  };

  const end = () => {
    pid.current = null;
    setKnob({ x: 0, y: 0 });
    setDir(0, 0);
  };

  const Btn = ({ k, label, big }: { k: string; label: string; big?: boolean }) => (
    <button
      className={`${big ? 'w-[4.6rem] h-[4.6rem] text-[0.9rem]' : 'w-14 h-14 text-[0.8rem]'} rounded-full bg-white/15 border border-white/30 text-white font-bold backdrop-blur active:bg-acc/70 touch-none select-none`}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        haptic(10);
        onKeys(k, true);
      }}
      onPointerUp={() => onKeys(k, false)}
      onPointerCancel={() => onKeys(k, false)}
    >
      {label}
    </button>
  );

  return (
    <>
      <div
        ref={base}
        className="absolute left-5 bottom-6 w-[8.5rem] h-[8.5rem] rounded-full bg-white/10 border border-white/25 backdrop-blur touch-none"
        onPointerDown={(e) => {
          pid.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => pid.current === e.pointerId && move(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div
          className="absolute w-14 h-14 rounded-full bg-white/70 shadow-lift pointer-events-none"
          style={{ left: `calc(50% - 1.75rem + ${knob.x * 2.6}rem)`, top: `calc(50% - 1.75rem + ${knob.y * 2.6}rem)` }}
        />
      </div>
      <div className="absolute right-5 bottom-6 flex items-end gap-3">
        <Btn k="E" label="E" />
        <Btn k="SPACE" label="⤒" big />
      </div>
    </>
  );
}
