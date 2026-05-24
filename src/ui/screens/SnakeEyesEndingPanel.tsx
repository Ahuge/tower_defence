/**
 * SnakeEyesEndingPanel — Snake Eyes M10 ending reveal.
 *
 * Renders the personalised epilogue from EpilogueComposer.composeEpilogue()
 * + a card-flip animation: three playing-card-styled frames flip
 * sequentially to reveal the campaign's titular dice (⚀ ⚀ ⚅).
 *
 * Used by GameOverScreen when `archetypeId === 'final_void'` AND
 * `won === true`. Caller handles the conditional render.
 *
 * Card-flip animation:
 *   - 3 cards face-up at t=0 (back of card visible — playing-card
 *     diamond pattern)
 *   - Card 0 flips at 400ms → ⚀
 *   - Card 1 flips at 900ms → ⚀
 *   - Card 2 flips at 1400ms → ⚅
 *   - After 1900ms the epilogue body fades in
 *
 * Polish 18: keyboard skip. Pressing Enter / Space / Escape / any
 * arrow key immediately reveals all three cards + the epilogue —
 * useful for replays + accessibility (users who don't want to wait
 * out the 1.9s reveal). The skip cancels the pending timers + sets
 * all flip states true synchronously.
 *
 * Pure CSS animations via inline keyframe styles — no Phaser tween
 * needed since this lives in the GameOver React tree.
 */

import { useEffect, useState, useCallback } from 'react';
import { composeEpilogue } from '../../systems/voidc/EpilogueComposer';
import { SNAKE_EYES_PALETTE } from '../../systems/voidc/SnakeEyesPalette';
import { UIScale } from '../../systems/UIScale';

const VOID_VIOLET = SNAKE_EYES_PALETTE.violet;
const VOID_GOLD = SNAKE_EYES_PALETTE.gold;

/** Per-card reveal delays (ms). The third card lands at 1400ms;
 *  the tableau body fades in 500ms after. */
const CARD_DELAYS = [400, 900, 1400] as const;
const BODY_FADE_DELAY_MS = 1900;

/** The three glyphs the cards reveal. Chosen via 3-versions blind-
 *  compare in Polish 17: snake eyes (Ardax's worst) vs six (the
 *  Counterfactual's safe play). */
const CARD_GLYPHS = ['⚀', '⚀', '⚅'] as const;
const CARD_GLYPH_LABELS = ['a one', 'a one', 'a six'] as const;

interface Props {
  /** Optional override of the composed epilogue text. When omitted
   *  the panel reads the live SnakeEyesState via EpilogueComposer. */
  epilogue?: string;
}

export function SnakeEyesEndingPanel({ epilogue }: Props) {
  const text = epilogue ?? composeEpilogue();
  // Lifted-up state: a single boolean array tracks each card's flip.
  // Lets the skip handler force all three true at once.
  const [flipped, setFlipped] = useState<boolean[]>([false, false, false]);
  const [showBody, setShowBody] = useState(false);

  const skip = useCallback(() => {
    setFlipped([true, true, true]);
    setShowBody(true);
  }, []);

  // Schedule the per-card flips + the body fade. Each timer is
  // cancellable; skip() clears them by forcing terminal state
  // immediately (any subsequent setFlipped is a no-op).
  useEffect(() => {
    const timers: number[] = [];
    CARD_DELAYS.forEach((delay, idx) => {
      timers.push(window.setTimeout(() => {
        setFlipped(prev => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
      }, delay));
    });
    timers.push(window.setTimeout(() => setShowBody(true), BODY_FADE_DELAY_MS));
    return () => { timers.forEach(t => window.clearTimeout(t)); };
  }, []);

  // Skip on Enter / Space / Escape / arrow keys. Bound on window so
  // it fires regardless of where focus lives (the M10 reveal often
  // mounts inside a focus-trapping modal).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showBody) return; // already fully revealed
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape'
          || e.key.startsWith('Arrow')) {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showBody, skip]);

  return (
    <div
      data-testid="snake-eyes-ending"
      style={{
        textAlign: 'center' as const,
        padding: `${UIScale.space(24)}px ${UIScale.space(16)}px ${UIScale.space(32)}px`,
        background: SNAKE_EYES_PALETTE.surface.ending,
        border: `1px solid ${SNAKE_EYES_PALETTE.border.endingViolet}`,
        borderRadius: '12px',
        margin: `${UIScale.space(16)}px auto`,
        maxWidth: '640px',
      }}
    >
      <div
        style={{
          fontFamily: "'Silkscreen', monospace",
          color: VOID_VIOLET,
          // Cinema-scale title for the M10 reveal. `font(20)` was
          // 50px on phone (2.5× upscale) which would dominate a
          // 360px viewport beyond cinematic intent — capped to 28px
          // so it stays the largest text on the panel without
          // breaking layout. Desktop still gets 20px.
          fontSize: UIScale.fontCapped(20, 28),
          letterSpacing: '0.08em',
          marginBottom: `${UIScale.space(20)}px`,
        }}
      >
        THE COUNTERFACTUAL'S MIRROR
      </div>

      <div
        style={{
          display: 'flex' as const,
          justifyContent: 'center' as const,
          gap: `${UIScale.space(16)}px`,
          marginBottom: `${UIScale.space(24)}px`,
          perspective: '600px',
        }}
        // Allow the parent itself to be focused for click-anywhere-to-skip
        onClick={() => { if (!showBody) skip(); }}
        role="button"
        aria-label="Reveal animation — press Enter, Space, or Escape to skip"
      >
        {CARD_GLYPHS.map((glyph, idx) => (
          <FlipCard
            key={idx}
            idx={idx}
            glyph={glyph}
            glyphLabel={CARD_GLYPH_LABELS[idx]}
            isFlipped={flipped[idx]}
          />
        ))}
      </div>

      <div
        data-testid="snake-eyes-epilogue-body"
        data-shown={showBody ? 'true' : 'false'}
        style={{
          // Serif stack for the noir-voiceover register. Georgia
          // ships everywhere; Crimson Text + Lora are graceful
          // fallbacks for systems that have web fonts.
          fontFamily: "'Crimson Text', 'Lora', Georgia, 'Times New Roman', serif",
          fontSize: UIScale.fontCapped(15, 32),
          lineHeight: 1.75,
          color: 'var(--text-primary)',
          textAlign: 'left' as const,
          maxWidth: '520px',
          margin: '0 auto',
          opacity: showBody ? 1 : 0,
          transform: showBody ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }}
      >
        {text}
      </div>

      {!showBody && (
        <div style={{
          marginTop: `${UIScale.space(12)}px`,
          fontSize: UIScale.fontCapped(10, 20),
          color: 'var(--text-dim)',
          opacity: 0.6,
          letterSpacing: '0.05em',
        }}>
          press any key to reveal
        </div>
      )}
    </div>
  );
}

function FlipCard({ idx, glyph, glyphLabel, isFlipped }:
  { idx: number; glyph: string; glyphLabel: string; isFlipped: boolean }) {
  return (
    <div
      data-testid={`flip-card-${idx}`}
      data-flipped={isFlipped ? 'true' : 'false'}
      style={{
        width: `${UIScale.space(80)}px`,
        height: `${UIScale.space(120)}px`,
        position: 'relative' as const,
        transformStyle: 'preserve-3d' as const,
        transition: 'transform 0.35s ease-out',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* Card back (visible at t=0) */}
      <div
        style={{
          position: 'absolute' as const,
          inset: 0,
          backfaceVisibility: 'hidden' as const,
          background: `linear-gradient(135deg, ${SNAKE_EYES_PALETTE.cardBack.from}, ${SNAKE_EYES_PALETTE.cardBack.to})`,
          border: `1px solid ${VOID_VIOLET}`,
          borderRadius: '6px',
          backgroundImage: `repeating-linear-gradient(45deg, transparent 0 6px, ${VOID_VIOLET}22 6px 7px)`,
        }}
      />
      {/* Card face (visible after flip) */}
      <div
        style={{
          position: 'absolute' as const,
          inset: 0,
          backfaceVisibility: 'hidden' as const,
          transform: 'rotateY(180deg)',
          background: SNAKE_EYES_PALETTE.cardFace,
          border: `1px solid ${VOID_GOLD}`,
          borderRadius: '6px',
          color: VOID_GOLD,
          fontFamily: "'Silkscreen', monospace",
          // Tarot-glyph face — large by design, but `font(46)` was
          // 115px on phone, which can overflow the card's own
          // dimensions when the card isn't scaled up the same 2.5×.
          // Capped at 56px on phone — still glyph-as-hero scale,
          // bounded to the card face.
          fontSize: UIScale.fontCapped(46, 56),
          display: 'flex' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          lineHeight: 1,
        }}
        aria-label={glyphLabel}
      >
        {glyph}
      </div>
    </div>
  );
}
