// 16-slot wrapping linear chromatic rail (A# B | C..B | C C#) with 48px voice pucks,
// 2-tier semitone collision stagger, ghost octave echoes, and pointer drag with detents.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { BLACK_PCS, pcName } from '../engine/chords';
import { applyMove, ruleForbiddenPc, ruleMaxStep } from '../engine/graph';
import type { Rejection } from '../game/gameState';
import type { DailyRule, NoteSpellingMode, PitchClass, StepDelta } from '../types/stepwise';

const TIER_TOPS = [12, 56, 34];
const slotLeft = (slot: number) => `${(((slot + 2 + 0.5) / 16) * 100).toFixed(3)}%`;

interface Drag {
  voice: number;
  pointerId: number;
  startX: number;
  slotW: number;
  dx: number;
  offset: number;
  moved: boolean;
}

export interface RailProps {
  pcs: readonly PitchClass[];
  targetPcs: readonly PitchClass[];
  rule: DailyRule;
  spelling: NoteSpellingMode;
  /** Target notes keep the target chord's spelling (Bb, not A#, when heading to Bb Maj). */
  targetSpelling?: NoteSpellingMode;
  selectedVoice: number;
  activeLabel: string;
  rejection: Rejection | null;
  disabled: boolean;
  onSelect(voice: number): void;
  onMove(voice: number, delta: StepDelta): void;
}

/** Circular semitone distance: B and C are neighbours through the ghost-echo edges. */
const pcDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
};

export function staggerTiers(pcs: readonly number[]): number[] {
  const placed: { pc: number; tier: number }[] = [];
  return pcs.map((pc) => {
    let tier = 0;
    for (const p of placed) if (pcDist(p.pc, pc) <= 2 && p.tier === tier) tier = (tier + 1) % 2;
    for (const p of placed) if (pcDist(p.pc, pc) <= 1 && p.tier === tier) tier = 2;
    placed.push({ pc, tier });
    return tier;
  });
}

export function Rail(props: RailProps) {
  const { pcs, targetPcs, rule, spelling, targetSpelling, selectedVoice, activeLabel, rejection, disabled, onSelect, onMove } = props;
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const lavaPc = ruleForbiddenPc(rule);
  const target = new Set<number>(targetPcs);
  const tiers = staggerTiers(pcs);
  const maxStep = ruleMaxStep(rule);

  // Spring bounce-back + lava slot pulse on rejected moves.
  // Only animate rejections that happen while mounted (not an old one replayed on a view switch).
  const handledNonce = useRef(rejection?.nonce ?? 0);
  useEffect(() => {
    if (!rejection || !trackRef.current || rejection.nonce === handledNonce.current) return;
    handledNonce.current = rejection.nonce;
    const root = trackRef.current;
    const puck = root.querySelector<HTMLElement>(`.sw-rail-puck[data-voice="${rejection.voiceIndex}"]:not(.is-ghost-echo)`);
    if (puck) {
      puck.classList.remove('is-bouncing');
      void puck.offsetWidth;
      puck.classList.add('is-bouncing');
    }
    if (rejection.reason === 'lava-blocked') {
      const slots = root.querySelectorAll<HTMLElement>(`.sw-rail-slot[data-pc="${rejection.toPc}"]`);
      slots.forEach((s) => {
        s.classList.remove('is-lava-pulse');
        void s.offsetWidth;
        s.classList.add('is-lava-pulse');
      });
    }
  }, [rejection]);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, voice: number) => {
    if (disabled || !trackRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const slotW = trackRef.current.getBoundingClientRect().width / 16;
    setDrag({ voice, pointerId: e.pointerId, startX: e.clientX, slotW, dx: 0, offset: 0, moved: false });
    onSelect(voice);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    const offset = Math.max(-maxStep, Math.min(maxStep, Math.round(dx / drag.slotW)));
    if (offset !== drag.offset && 'vibrate' in navigator) {
      try {
        navigator.vibrate(6); // magnetic detent tick
      } catch {
        /* unsupported */
      }
    }
    setDrag({ ...drag, dx, offset, moved: drag.moved || Math.abs(dx) > 6 });
  };

  const endDrag = (e: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { voice, offset, moved } = drag;
    setDrag(null);
    if (!cancelled && moved && offset !== 0) onMove(voice, offset as StepDelta);
  };

  const preview = drag && drag.offset !== 0 ? applyMove(pcs, drag.voice, drag.offset as StepDelta, rule, spelling) : null;

  const slots: ReactNode[] = [];
  for (let slot = -2; slot <= 13; slot++) {
    const pc = ((slot % 12) + 12) % 12;
    const cls = ['sw-rail-slot'];
    if (BLACK_PCS.has(pc)) cls.push('is-black');
    if (slot < 0 || slot > 11) cls.push('is-ghost');
    if (lavaPc === pc) cls.push('is-lava');
    if (target.has(pc)) cls.push('is-target-pc');
    if (drag && drag.offset !== 0 && slot === pcs[drag.voice] + drag.offset) cls.push(preview?.ok ? 'is-drop-valid' : 'is-drop-invalid');
    slots.push(
      <div key={slot} className={cls.join(' ')} data-pc={pc}>
        <span className="sw-rail-slot-label">{pcName(pc, target.has(pc) && targetSpelling ? targetSpelling : spelling)}</span>
      </div>,
    );
  }

  const pucks: ReactNode[] = [];
  pcs.forEach((pc, v) => {
    const top = TIER_TOPS[tiers[v]];
    const isDragging = drag?.voice === v && drag.moved;
    const slot = isDragging ? pc + drag.offset : pc;
    const residual = isDragging ? (drag.dx - drag.offset * drag.slotW) * 0.22 : 0;
    const cls = ['sw-rail-puck'];
    if (selectedVoice === v) cls.push('is-selected');
    if (target.has(pc) && !isDragging) cls.push('is-target-match');
    if (isDragging) cls.push('is-dragging', drag.offset === 0 ? '' : preview?.ok ? 'is-drop-valid' : 'is-drop-invalid');
    pucks.push(
      <button
        key={`p${v}`}
        type="button"
        className={cls.filter(Boolean).join(' ')}
        data-voice={v}
        style={{ left: slotLeft(slot), top, ...(residual ? { marginLeft: `${residual.toFixed(1)}px` } : {}) }}
        aria-label={`Voice ${v + 1}, note ${pcName(pc, spelling)}`}
        aria-pressed={selectedVoice === v}
        onPointerDown={(e) => onPointerDown(e, v)}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
        onClick={() => onSelect(v)}
      >
        <span className="sw-puck-note">{pcName(isDragging ? (((slot % 12) + 12) % 12) : pc, spelling)}</span>
        <span className="sw-puck-idx">V{v + 1}</span>
      </button>,
    );
    const echo = pc >= 10 ? pc - 12 : pc <= 1 ? pc + 12 : null;
    if (echo !== null && !isDragging) {
      pucks.push(
        <div key={`e${v}`} className="sw-rail-puck is-ghost-echo" data-voice={v} style={{ left: slotLeft(echo), top }} aria-hidden="true">
          <span className="sw-puck-note">{pcName(pc, spelling)}</span>
          <span className="sw-puck-idx">V{v + 1}</span>
        </div>,
      );
    }
  });

  return (
    <div className="sw-rail-view">
      <div className="sw-rail-header-labels">
        <span className="sw-rail-edge-tag">← Wrap</span>
        <span className="sw-rail-current-tag">
          Active: <strong>{activeLabel}</strong>
        </span>
        <span className="sw-rail-edge-tag">Wrap →</span>
      </div>
      <div className={`sw-rail-track${drag?.moved ? ' is-dragging' : ''}`} ref={trackRef} role="application" aria-label="Wrapping 16-slot chromatic rail">
        <div className="sw-rail-slots">{slots}</div>
        <div className="sw-rail-pucks">{pucks}</div>
      </div>
    </div>
  );
}
