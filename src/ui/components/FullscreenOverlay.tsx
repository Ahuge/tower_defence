/**
 * FullscreenOverlay — shared shell for take-over modals (LevelUpModal,
 * FactionUnlockSplash, AnnouncementModal). Centralises the fixed-
 * position scaffolding, backdrop scrim, click-out + ESC dismissal,
 * and fade-in animation that every consumer used to roll inline.
 *
 * Visual identity (card border, hero art, body copy, animations) is
 * still owned by the consumer's children — this component only
 * provides the container + the dismiss plumbing. That keeps each
 * modal free to evolve its look without colliding with the others.
 */
import { useEffect } from 'preact/hooks';
import type { JSX } from 'preact';

export interface FullscreenOverlayProps {
  onClose: () => void;
  /** Stack order. LevelUpModal historically used 9000, FactionUnlock
   *  Splash used 800 (sits BELOW level-up so a same-frame double
   *  unlock surfaces level-up first). Defaults to 9000 — most
   *  consumers want to be on top of any in-game HUD. */
  zIndex?: number;
  /** Backdrop style.
   *  - `scrim` (default): flat dark overlay, ~85% black. Works for
   *    centred-card content where the focus is the card border.
   *  - `gradient`: radial dark vignette. Works for full-bleed
   *    content (hero art, large emblems) where the centre stays
   *    legible and the edges fall to deep black. */
  backdrop?: 'scrim' | 'gradient';
  /** Suppress dismiss on backdrop click + ESC. Default false. Set to
   *  true for modals that require an explicit user choice (none
   *  today, but the prop is here for future "are you sure?" CTAs). */
  modal?: boolean;
  /** Optional inline style override for the backdrop layer. Consumers
   *  with bespoke colours (e.g. faction-tinted scrim) can pass a
   *  partial style here without re-implementing the layout. */
  backdropStyle?: JSX.CSSProperties;
  children: preact.ComponentChildren;
}

const SCRIM_BG = 'rgba(8, 6, 14, 0.85)';
const GRADIENT_BG = 'radial-gradient(ellipse at center, rgba(20,12,30,0.96) 0%, rgba(8,5,12,0.99) 100%)';

export function FullscreenOverlay({
  onClose,
  zIndex = 9000,
  backdrop = 'scrim',
  modal = false,
  backdropStyle,
  children,
}: FullscreenOverlayProps) {
  // ESC closes — same affordance as the backdrop click. Bound at the
  // document level since the overlay isn't always focusable.
  useEffect(() => {
    if (modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, onClose]);

  const onBackdropClick = modal ? undefined : onClose;
  const bg = backdrop === 'gradient' ? GRADIENT_BG : SCRIM_BG;

  return (
    <div
      onClick={onBackdropClick}
      style={{
        position: 'fixed', inset: 0,
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex,
        animation: 'fadeIn 200ms ease-out',
        overflow: 'hidden',
        ...backdropStyle,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'contents' }}>
        {children}
      </div>
    </div>
  );
}
