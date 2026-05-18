/**
 * PactbookPanel — pre-mission Wager draw + pick UI for the Snake
 * Eyes campaign.
 *
 * Phase 4 commit 19. Renders the 3 drawn Wagers as playing-card-
 * styled tiles + an "All three pass" decline button. Player picks
 * exactly one tile (accept) OR declines all (one-shot penalty).
 *
 * Lifecycle is driven by the caller (MissionRunner): construct a
 * Pactbook instance, call `draw(count, weights, excludeIds)`, then
 * render this panel with `{ pactbook, onResolved }`. `onResolved`
 * fires with the resolution shape so MissionRunner can record + boot
 * the mission with the accepted Wager's effect active.
 *
 * The component is intentionally pure presentation — all state
 * mutations (accept tally, decline penalty, etc.) happen inside
 * Pactbook.accept / Pactbook.declineAll. The component just dispatches.
 *
 * Card art lands in a follow-up PR (12 illustrated card faces);
 * commit 19 renders programmatic playing-card-styled tiles with
 * tier-coloured borders, the Wager name, and the flavour line.
 * Good enough to ship + iterate on.
 */

import React from 'react';
import type { Pactbook, Wager } from '../../systems/voidc/Pactbook';
import { getWagerEffect } from '../../systems/voidc/WagerEffects';
import { SNAKE_EYES_PALETTE, TIER_PALETTE } from '../../systems/voidc/SnakeEyesPalette';

interface PactbookPanelProps {
  pactbook: Pactbook;
  onResolved: (
    result:
      | { kind: 'accepted'; wager: Wager }
      | { kind: 'declined' }
  ) => void;
}

export function PactbookPanel({ pactbook, onResolved }: PactbookPanelProps) {
  const drawn = pactbook.getDrawn();
  if (drawn.length === 0) {
    return null;
  }
  // Already resolved → render the chosen card only.
  if (pactbook.isResolved()) {
    return null; // The mission UI takes over once accept/decline fired.
  }

  return (
    <div style={{
      maxWidth: '880px',
      margin: '0 auto',
      padding: '24px 18px',
      fontFamily: 'system-ui, sans-serif',
      color: 'var(--text-primary)',
    }}>
      <div style={{
        fontFamily: "'Silkscreen', monospace",
        color: SNAKE_EYES_PALETTE.violet,
        fontSize: '16px',
        letterSpacing: '0.08em',
        textAlign: 'center' as const,
        marginBottom: '4px',
      }}>
        THE DEALER DEALS
      </div>
      <div style={{
        textAlign: 'center' as const,
        fontSize: '13px',
        color: 'var(--text-dim)',
        marginBottom: '20px',
        fontStyle: 'italic' as const,
      }}>
        Pick one. Or pass all three — and pay the price.
      </div>

      <div style={{
        display: 'grid' as const,
        gridTemplateColumns: `repeat(${drawn.length}, 1fr)`,
        gap: '12px',
      }}>
        {drawn.map((wager, idx) => (
          <WagerCard
            key={`${wager.id}-${idx}`}
            wager={wager}
            onSelect={() => {
              const w = pactbook.accept(wager.id);
              onResolved({ kind: 'accepted', wager: w });
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center' as const, marginTop: '20px' }}>
        <button
          onClick={() => {
            pactbook.declineAll();
            onResolved({ kind: 'declined' });
          }}
          style={{
            padding: '10px 24px',
            background: SNAKE_EYES_PALETTE.surface.decline,
            border: `1px solid ${SNAKE_EYES_PALETTE.border.subtle}`,
            color: 'var(--text-dim)',
            fontFamily: "'Silkscreen', monospace",
            fontSize: '12px',
            letterSpacing: '0.06em',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ALL THREE PASS (+20g Debt)
        </button>
      </div>
    </div>
  );
}

function WagerCard({ wager, onSelect }: { wager: Wager; onSelect: () => void }) {
  const palette = TIER_PALETTE[wager.tier - 1];
  const effect = getWagerEffect(wager.effectId);
  const summary = effect?.meta.summary ?? '';

  return (
    <button
      onClick={onSelect}
      style={{
        textAlign: 'left' as const,
        padding: '14px 14px 16px',
        background: palette.bg,
        border: `2px solid ${palette.border}`,
        borderRadius: '6px',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'transform 0.12s ease-out',
        display: 'flex' as const,
        flexDirection: 'column' as const,
        gap: '8px',
        minHeight: '180px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        fontSize: '10px',
        letterSpacing: '0.08em',
        color: palette.border,
        fontFamily: "'Silkscreen', monospace",
      }}>
        {palette.label.toUpperCase()}
      </div>
      <div style={{
        fontSize: '17px',
        fontWeight: 600,
        lineHeight: 1.2,
      }}>
        {wager.name}
      </div>
      <div style={{
        fontSize: '12px',
        color: 'var(--text-dim)',
        fontStyle: 'italic' as const,
        flex: 1,
      }}>
        "{wager.flavor}"
      </div>
      {summary && (
        <div style={{
          fontSize: '11px',
          color: 'var(--text-primary)',
          opacity: 0.85,
          paddingTop: '6px',
          borderTop: `1px solid ${SNAKE_EYES_PALETTE.border.cardDivider}`,
        }}>
          {summary}
        </div>
      )}
    </button>
  );
}
