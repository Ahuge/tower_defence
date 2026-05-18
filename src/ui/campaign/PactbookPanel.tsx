/**
 * PactbookPanel — pre-mission Wager draw + pick UI for the Snake
 * Eyes campaign.
 *
 * Renders the 3 (or fewer, under Dealer pressure) drawn Wagers as
 * playing-card-styled tiles + a decline button. Player picks exactly
 * one tile (accept) OR declines all (one-shot penalty).
 *
 * Lifecycle is driven by the caller (MissionRunner): construct a
 * Pactbook instance, call `draw(count, weights, excludeIds)`, then
 * render this panel with `{ pactbook, onResolved }`. `onResolved`
 * fires with the resolution shape so MissionRunner can record + boot
 * the mission with the accepted Wager's effect active.
 *
 * Accessibility (Polish 4+5):
 * - Keyboard: 1/2/3 accept; D (or Esc) declines all; arrow keys
 *   move focus between cards; Enter / Space activate the focused
 *   element (browser default for <button>).
 * - ARIA: each card carries an aria-label composing tier + name +
 *   summary so screen readers announce the full bet, not just
 *   "button". The decline button spells out "20 gold" (not "20g").
 * - Visual feedback: hover / focus-visible / active states live in
 *   ui.css (`.snake-eyes-wager-card`), so inline mouseenter handlers
 *   are gone — touch users and screen readers now see the same
 *   feedback as mouse hover.
 *
 * Pure presentation — Pactbook.accept / Pactbook.declineAll do the
 * actual state mutation. Card art lands in a follow-up PR (12
 * illustrated card faces). Programmatic art good enough to ship.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Pactbook, Wager } from '../../systems/voidc/Pactbook';
import { getWagerEffect } from '../../systems/voidc/WagerEffects';
import { SNAKE_EYES_PALETTE, TIER_PALETTE } from '../../systems/voidc/SnakeEyesPalette';
import { PAYDOWN_BASE, PAYDOWN_PER_DIVERGENCE } from '../../systems/voidc/DebtTracker';

/** Duration of the per-card deal-in animation (ms). Mirrors the
 *  CSS animation length in ui.css `.snake-eyes-wager-card.is-dealing-in`. */
const DEAL_IN_DURATION_MS = 450 + 240; // last card delay + animation
/** How long the selected-card acknowledgment pulse plays before
 *  the panel unmounts (onResolved fires). Mirrors ui.css
 *  `.snake-eyes-wager-card.is-acknowledging`. */
const ACKNOWLEDGE_PULSE_MS = 500;

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
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const declineRef = useRef<HTMLButtonElement | null>(null);
  // Index of the card the player just selected (drives the
  // acknowledgment pulse + delays onResolved). null until accepted.
  const [acknowledgingIdx, setAcknowledgingIdx] = useState<number | null>(null);

  // Accept-by-id stays a single concern. The acknowledgment pulse
  // runs for ACKNOWLEDGE_PULSE_MS before onResolved fires, so the
  // player sees their pick selected before the panel unmounts.
  const accept = useCallback(
    (wager: Wager, idx: number) => {
      if (acknowledgingIdx !== null) return; // ignore re-entry mid-pulse
      const w = pactbook.accept(wager.id);
      setAcknowledgingIdx(idx);
      window.setTimeout(() => {
        onResolved({ kind: 'accepted', wager: w });
      }, ACKNOWLEDGE_PULSE_MS);
    },
    [pactbook, onResolved, acknowledgingIdx],
  );
  const declineAll = useCallback(() => {
    if (acknowledgingIdx !== null) return; // ignore mid-acknowledge
    pactbook.declineAll();
    onResolved({ kind: 'declined' });
  }, [pactbook, onResolved, acknowledgingIdx]);

  // Keyboard handler. Bound on the panel-level div so it catches
  // even when no card has focus yet (e.g. the player just opened
  // the modal and hits "1").
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (pactbook.isResolved()) return;
    if (acknowledgingIdx !== null) return; // ignore key input mid-pulse
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < drawn.length) {
        e.preventDefault();
        accept(drawn[idx], idx);
      }
      return;
    }
    if (e.key === 'd' || e.key === 'D' || e.key === 'Escape') {
      e.preventDefault();
      declineAll();
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const active = document.activeElement;
      const currentIdx = cardRefs.current.findIndex(r => r === active);
      if (currentIdx === -1) return;
      const delta = e.key === 'ArrowLeft' ? -1 : 1;
      const nextIdx = (currentIdx + delta + drawn.length) % drawn.length;
      e.preventDefault();
      cardRefs.current[nextIdx]?.focus();
    }
  }, [drawn, accept, declineAll, pactbook, acknowledgingIdx]);

  // Bind key handler on mount. useEffect not the JSX onKeyDown so it
  // fires regardless of where focus lives within the document.
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // Autofocus the first card on mount so keyboard users land somewhere.
  useEffect(() => {
    cardRefs.current[0]?.focus();
  }, []);

  if (drawn.length === 0) return null;
  // Stay mounted during the acknowledgment pulse so the player sees
  // their selection highlighted before onResolved fires. The mission
  // UI takes over only after the pulse + onResolved.
  if (pactbook.isResolved() && acknowledgingIdx === null) return null;

  return (
    <div
      role="dialog"
      aria-label="Pactbook — pick a Wager"
      style={{
        maxWidth: '880px',
        margin: '0 auto',
        padding: '24px 18px',
        fontFamily: 'system-ui, sans-serif',
        color: 'var(--text-primary)',
      }}
    >
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
        <span style={{ display: 'block', fontSize: '11px', marginTop: '2px', opacity: 0.7 }}>
          (1/2/3 to pick, D to decline)
        </span>
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
            idx={idx}
            isAcknowledging={acknowledgingIdx === idx}
            buttonRef={el => (cardRefs.current[idx] = el)}
            onSelect={() => accept(wager, idx)}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center' as const, marginTop: '20px' }}>
        <button
          ref={declineRef}
          class="snake-eyes-decline-btn"
          aria-label="Decline all three Wagers and add 20 gold to Debt"
          onClick={declineAll}
          style={{
            padding: '10px 24px',
            background: SNAKE_EYES_PALETTE.surface.decline,
            border: `1px solid ${SNAKE_EYES_PALETTE.border.subtle}`,
            color: 'var(--text-dim)',
            fontFamily: "'Silkscreen', monospace",
            fontSize: '12px',
            letterSpacing: '0.06em',
            borderRadius: '4px',
          }}
        >
          DECLINE ALL (+20g Debt)
        </button>
      </div>
    </div>
  );
}

interface WagerCardProps {
  wager: Wager;
  idx: number;
  isAcknowledging: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onSelect: () => void;
}

function WagerCard({ wager, idx, isAcknowledging, buttonRef, onSelect }: WagerCardProps) {
  const palette = TIER_PALETTE[wager.tier - 1];
  const effect = getWagerEffect(wager.effectId);
  const summary = effect?.meta.summary ?? '';
  const classes = [
    'snake-eyes-wager-card',
    'is-dealing-in',
    `deal-${idx}`,
    isAcknowledging ? 'is-acknowledging' : '',
  ].filter(Boolean).join(' ');
  // Predicted base paydown if this Wager is the only one accepted
  // this mission (the campaign rule — single Wager per mission).
  // Divergence after-accept = wager.tier (resets per mission, +tier
  // on accept). Outcome multipliers (Inverted Stakes 2×, Mirror Wager
  // 3×) are NOT factored — those are surprise upside.
  const previewPaydown = PAYDOWN_BASE + PAYDOWN_PER_DIVERGENCE * wager.tier;
  const accessibleLabel =
    `${palette.label} Wager: ${wager.name}. ${summary || wager.flavor}. ` +
    `Adds ${wager.tier} Divergence; pays down approximately ${previewPaydown} gold of Debt on win. ` +
    `Press ${idx + 1} or click to accept.`;

  return (
    <button
      ref={buttonRef}
      class={classes}
      aria-label={accessibleLabel}
      aria-keyshortcuts={String(idx + 1)}
      onClick={onSelect}
      style={{
        padding: '12px 14px 14px',
        background: palette.bg,
        border: `2px solid ${palette.border}`,
        borderRadius: '6px',
        color: 'var(--text-primary)',
        display: 'flex' as const,
        flexDirection: 'column' as const,
        gap: '8px',
        minHeight: '220px',
        position: 'relative' as const,
      }}
    >
      {/* Tier badge — circular, colour-coded. Top-left so it
          scans first. Carries the tier digit so colourblind users
          have a redundant non-colour signal. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute' as const,
          top: '10px',
          left: '10px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: palette.border,
          color: '#0a050f',
          fontFamily: "'Silkscreen', monospace",
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.35)',
        }}
      >
        {wager.tier}
      </div>

      {/* Tier label header — pads left of the badge */}
      <div style={{
        fontSize: '10px',
        letterSpacing: '0.08em',
        color: palette.border,
        fontFamily: "'Silkscreen', monospace",
        marginLeft: '32px',
        lineHeight: '22px',
      }}>
        {palette.label.toUpperCase()}
      </div>

      {/* Wager name */}
      <div style={{
        fontSize: '17px',
        fontWeight: 600,
        lineHeight: 1.2,
        marginTop: '4px',
      }}>
        {wager.name}
      </div>

      {/* Summary — actually-actionable effect description, now the
          PRIMARY readable element (was visually equal to flavor). */}
      {summary && (
        <div style={{
          fontSize: '13px',
          color: 'var(--text-primary)',
          lineHeight: 1.35,
          paddingTop: '4px',
        }}>
          {summary}
        </div>
      )}

      {/* Flavor — atmospheric/quote, now visually subordinate. */}
      <div style={{
        fontSize: '11px',
        color: 'var(--text-dim)',
        fontStyle: 'italic' as const,
        lineHeight: 1.4,
        flex: 1,
      }}>
        "{wager.flavor}"
      </div>

      {/* Footer — Divergence delta + base paydown preview. The
          two numbers actually-different readers across the 3-card
          draw scan against. */}
      <div style={{
        display: 'flex' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        fontFamily: "'Silkscreen', monospace",
        fontSize: '11px',
        paddingTop: '6px',
        borderTop: `1px solid ${SNAKE_EYES_PALETTE.border.cardDivider}`,
        color: 'var(--text-primary)',
        opacity: 0.95,
      }}>
        <span style={{ color: palette.border }}>+{wager.tier} DIV</span>
        <span style={{ color: SNAKE_EYES_PALETTE.gold }}>≈ −{previewPaydown}g</span>
      </div>
    </button>
  );
}
