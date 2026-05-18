/**
 * SnakeEyesEndingPanel — Snake Eyes M10 ending reveal.
 *
 * Renders the personalised epilogue from EpilogueComposer.composeEpilogue()
 * + a card-flip animation: three playing-card-styled frames flip
 * sequentially to reveal the M10 tableau frame underneath. The
 * polish move over Greenward's static reveal.
 *
 * Used by GameOverScreen when `archetypeId === 'final_void'` AND
 * `won === true`. Caller handles the conditional render.
 *
 * Card-flip animation:
 *   - 3 cards face-up at t=0 (back of card visible — playing-card
 *     diamond pattern)
 *   - Card 1 flips at 400ms (180° Y rotation, 300ms duration)
 *   - Card 2 flips at 900ms
 *   - Card 3 flips at 1400ms
 *   - After 1900ms the tableau-and-epilogue body fades in
 *
 * Pure CSS animations via inline keyframe styles — no Phaser tween
 * needed since this lives in the GameOver React tree.
 */

import { useEffect, useState } from 'react';
import { composeEpilogue } from '../../systems/voidc/EpilogueComposer';

const VOID_VIOLET = '#a288d0';
const VOID_GOLD = '#d4b04a';

/** Per-card reveal delays (ms). The third card lands at 1400ms;
 *  the tableau body fades in 500ms after. */
const CARD_DELAYS = [400, 900, 1400] as const;
const BODY_FADE_DELAY_MS = 1900;

interface Props {
  /** Optional override of the composed epilogue text. When omitted
   *  the panel reads the live SnakeEyesState via EpilogueComposer. */
  epilogue?: string;
}

export function SnakeEyesEndingPanel({ epilogue }: Props) {
  const text = epilogue ?? composeEpilogue();
  const [showBody, setShowBody] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowBody(true), BODY_FADE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      data-testid="snake-eyes-ending"
      style={{
        textAlign: 'center' as const,
        padding: '24px 16px 32px',
        background: 'rgba(16, 8, 24, 0.55)',
        border: `1px solid ${VOID_VIOLET}55`,
        borderRadius: '12px',
        margin: '16px auto',
        maxWidth: '640px',
      }}
    >
      <div
        style={{
          fontFamily: "'Silkscreen', monospace",
          color: VOID_VIOLET,
          fontSize: '20px',
          letterSpacing: '0.08em',
          marginBottom: '20px',
        }}
      >
        THE COUNTERFACTUAL'S MIRROR
      </div>

      {/* Three flipping cards — programmatic art for v1. Illustrated
          ending tableau lands in a follow-up PR. */}
      <div
        style={{
          display: 'flex' as const,
          justifyContent: 'center' as const,
          gap: '16px',
          marginBottom: '24px',
          perspective: '600px',
        }}
      >
        {CARD_DELAYS.map((delay, idx) => (
          <FlipCard key={idx} idx={idx} delayMs={delay} />
        ))}
      </div>

      <div
        style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          lineHeight: 1.7,
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
    </div>
  );
}

function FlipCard({ idx, delayMs }: { idx: number; delayMs: number }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  return (
    <div
      style={{
        width: '80px',
        height: '120px',
        position: 'relative' as const,
        transformStyle: 'preserve-3d' as const,
        transition: 'transform 0.35s ease-out',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* Card back (visible at t=0) */}
      <div
        style={{
          position: 'absolute' as const,
          inset: 0,
          backfaceVisibility: 'hidden' as const,
          background: 'linear-gradient(135deg, rgba(40, 24, 60, 0.95), rgba(20, 14, 32, 0.95))',
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
          background: 'rgba(8, 4, 16, 0.95)',
          border: `1px solid ${VOID_GOLD}`,
          borderRadius: '6px',
          color: VOID_GOLD,
          fontFamily: "'Silkscreen', monospace",
          fontSize: '32px',
          display: 'flex' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
        }}
      >
        {/* Three cards spell the moment: "ME", "vs", "HIM" */}
        {idx === 0 ? 'ME' : idx === 1 ? 'vs' : 'HIM'}
      </div>
    </div>
  );
}
