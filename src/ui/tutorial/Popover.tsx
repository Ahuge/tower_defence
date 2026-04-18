/**
 * Popover — the titled card next to the spotlight with Next / Skip buttons.
 *
 * Placement: the track author suggests a side; we try it first, but if that
 * would overflow the viewport we flip. When there's no target rect, we
 * center the card.
 */
import { ResolvedRect } from '../../systems/Tutorial/TutorialTargets';
import { Placement } from '../../systems/Tutorial/TutorialTracks';

interface Props {
  title: string;
  body: string;
  rect: ResolvedRect | null;
  placement?: Placement;
  stepIndex: number;
  totalSteps: number;
  showNext: boolean;
  onNext: () => void;
  onSkip: () => void;
  /** Optional call-to-action button (terminal steps only). When provided,
   *  clicking it runs the action AND advances the tutorial (completing the
   *  track on a terminal step). Replaces the Next button if present. */
  cta?: { label: string; action: () => void };
}

const CARD_WIDTH = 320;
const CARD_MARGIN = 16;
const GAP = 14;

type Anchor = { left: number; top: number; transform?: string };

function pickAnchor(rect: ResolvedRect | null, placement: Placement): Anchor {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 'top-banner' ignores the target rect and pins the popover to the
  // top of the viewport, overlapping whatever sits there (WAVES /
  // ECONOMY panels on mobile). Used when the step wants to keep the
  // game area clear for tapping.
  if (placement === 'top-banner') {
    return {
      left: Math.max(CARD_MARGIN, vw / 2 - CARD_WIDTH / 2),
      top: CARD_MARGIN,
    };
  }

  if (!rect || placement === 'center') {
    return {
      left: Math.max(CARD_MARGIN, vw / 2 - CARD_WIDTH / 2),
      top: Math.max(CARD_MARGIN, vh / 3),
    };
  }

  const tryPlacements: Placement[] = placement === 'auto'
    ? ['bottom', 'top', 'right', 'left']
    : [placement, 'bottom', 'top', 'right', 'left'];

  for (const p of tryPlacements) {
    const a = anchorFor(rect, p);
    if (fitsInViewport(a, vw, vh)) return a;
  }
  // Last resort — center on the rect, clamped.
  return clamp({ left: rect.x + rect.width / 2 - CARD_WIDTH / 2, top: rect.y + rect.height + GAP }, vw, vh);
}

function anchorFor(rect: ResolvedRect, p: Placement): Anchor {
  switch (p) {
    case 'top':
      return clampTop({ left: rect.x + rect.width / 2 - CARD_WIDTH / 2, top: rect.y - GAP - 180 });
    case 'bottom':
      return clampTop({ left: rect.x + rect.width / 2 - CARD_WIDTH / 2, top: rect.y + rect.height + GAP });
    case 'left':
      return clampTop({ left: rect.x - GAP - CARD_WIDTH, top: rect.y });
    case 'right':
      return clampTop({ left: rect.x + rect.width + GAP, top: rect.y });
    case 'center':
    case 'auto':
    default:
      return { left: rect.x + rect.width / 2 - CARD_WIDTH / 2, top: rect.y + rect.height + GAP };
  }
}

function clampTop(a: Anchor): Anchor {
  return { left: Math.max(CARD_MARGIN, a.left), top: Math.max(CARD_MARGIN, a.top) };
}

function clamp(a: Anchor, vw: number, vh: number): Anchor {
  const left = Math.max(CARD_MARGIN, Math.min(a.left, vw - CARD_WIDTH - CARD_MARGIN));
  const top = Math.max(CARD_MARGIN, Math.min(a.top, vh - 180));
  return { left, top };
}

function fitsInViewport(a: Anchor, vw: number, vh: number): boolean {
  return a.left >= CARD_MARGIN
    && a.left + CARD_WIDTH <= vw - CARD_MARGIN
    && a.top >= CARD_MARGIN
    && a.top + 180 <= vh - CARD_MARGIN;
}

export function Popover({ title, body, rect, placement = 'auto', stepIndex, totalSteps, showNext, onNext, onSkip, cta }: Props) {
  const anchor = pickAnchor(rect, placement);
  const isTerminal = stepIndex + 1 === totalSteps;

  return (
    <div
      class="tutorial-popover"
      style={{
        position: 'fixed', zIndex: 410,
        left: `${anchor.left}px`, top: `${anchor.top}px`,
        width: `${CARD_WIDTH}px`,
        maxWidth: `calc(100vw - ${CARD_MARGIN * 2}px)`,
        background: 'var(--bg-surface, #1a1322)',
        border: '1px solid var(--border-default, rgba(232,183,109,0.35))',
        borderRadius: '10px',
        padding: '16px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
        color: 'var(--text-primary, #f2e6d0)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        pointerEvents: 'auto',
        transition: 'left 180ms ease, top 180ms ease',
      }}
    >
      <div style={{
        fontFamily: "'Silkscreen', ui-sans-serif, sans-serif",
        fontSize: '15px',
        color: 'var(--gold, #e8b76d)',
        marginBottom: '8px',
        letterSpacing: '1px',
      }}>{title}</div>

      <div style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '14px', color: 'rgba(255,255,255,0.85)' }}>
        {body}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '1px' }}>
          {stepIndex + 1} / {totalSteps}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            class="btn"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={onSkip}
          >Skip</button>
          {cta && isTerminal ? (
            <button
              class="btn btn-gold"
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={() => { cta.action(); onNext(); }}
            >{cta.label}</button>
          ) : (showNext && (
            <button
              class="btn btn-gold"
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={onNext}
            >{isTerminal ? 'Done' : 'Next'}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
