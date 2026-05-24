/**
 * VoidStatePanel — Snake Eyes campaign's lobby state readout.
 *
 * Rendered in the campaign lobby's per-extension `ui.panels` slot
 * (between header and mission list). The Snake Eyes extension wires
 * this component via `SNAKE_EYES_EXTENSION.ui.panels` in
 * `snake-eyes.ts`. Shows:
 *
 *   - **Debt meter** — current Debt vs threshold lines (1000 /
 *     1300 / 1600 / 2000). The Dealer's pressure escalates each
 *     time the player crosses a threshold; the visual makes
 *     "how close am I to the next Dealer action" legible at a
 *     glance.
 *   - **Pactbook tally** — accepted T1/T2/T3 chips + declined +
 *     succeeded/failed. Hidden until at least one Wager has been
 *     drawn (avoids cluttering the lobby on fresh install).
 *   - **Last-mission Divergence** — small chip showing the prior
 *     mission's risk posture. Hidden if no mission completed yet.
 *   - **Theris status** — italic one-line "with you" / "cashed out."
 */

import {
  getSnakeEyesState,
  INITIAL_DEBT,
} from '../../systems/voidc/DebtTracker';
import { DEALER_THRESHOLDS, computeDealerActions } from '../../systems/voidc/DealerActions';
import { SNAKE_EYES_PALETTE } from '../../systems/voidc/SnakeEyesPalette';
import { UIScale } from '../../systems/UIScale';

const VOID_VIOLET = SNAKE_EYES_PALETTE.violet;
const VOID_GOLD = SNAKE_EYES_PALETTE.gold;
const DIM_TEXT = 'var(--text-dim)';
const PRIMARY_TEXT = 'var(--text-primary)';

interface Props {
  factionId: string;
}

/** Furthest-right Debt the meter visualises. Beyond this the bar
 *  caps; the actual Debt readout continues to render numerically. */
const DEBT_METER_MAX = DEALER_THRESHOLDS.EXTRA_BOUNTY_AND_VOID + 200; // 2200

/** Compute the next threshold the player will cross from their
 *  current Debt position. Returns null if they're already past all
 *  thresholds OR negative (settled). The matching tick gets pulsed
 *  via the `.is-next` CSS class so the imminent Dealer action stays
 *  visually present. */
function nextThreshold(debt: number): number | null {
  if (debt < 0) return null;
  for (const t of [
    DEALER_THRESHOLDS.BOUNTY_WAVE,
    DEALER_THRESHOLDS.REPOSSESS,
    DEALER_THRESHOLDS.VOID_SLOT,
    DEALER_THRESHOLDS.EXTRA_BOUNTY_AND_VOID,
  ]) {
    if (debt < t) return t;
  }
  return null;
}

export function VoidStatePanel(_props: Props) {
  const state = getSnakeEyesState();
  const actions = computeDealerActions(state.debt);
  const hasAnyTally =
    state.pactbookTally.acceptedT1 + state.pactbookTally.acceptedT2 +
    state.pactbookTally.acceptedT3 + state.pactbookTally.declined > 0;

  // Debt visualised on a 0..DEBT_METER_MAX bar. Negative Debt
  // (settled / over-paid with the House) renders as a "0" fill with
  // a green glow caption.
  const debtClamped = Math.max(0, Math.min(DEBT_METER_MAX, state.debt));
  const debtPct = (debtClamped / DEBT_METER_MAX) * 100;
  const settled = state.debt < 0;
  const upcomingThreshold = nextThreshold(state.debt);

  return (
    <div style={{
      background: SNAKE_EYES_PALETTE.surface.statePanel,
      border: `1px solid ${SNAKE_EYES_PALETTE.border.statePanel}`,
      borderRadius: '8px',
      padding: `${UIScale.space(12)}px ${UIScale.space(16)}px`,
      fontFamily: 'system-ui, sans-serif',
      fontSize: UIScale.fontCapped(12, 13),
      color: PRIMARY_TEXT,
    }}>
      <div style={{
        fontFamily: "'Silkscreen', monospace",
        color: VOID_VIOLET,
        fontSize: UIScale.fontCapped(13, 14),
        marginBottom: `${UIScale.space(8)}px`,
        letterSpacing: '0.05em',
      }}>
        THE HOUSE LEDGER
      </div>

      {/* Debt-meter with threshold tick marks. The bar carries
          role="meter" + aria-value* so screen readers announce
          "Debt: 800 of 2200" with the threshold context. */}
      <div
        role="meter"
        aria-label="House Debt"
        aria-valuenow={Math.max(0, state.debt)}
        aria-valuemin={0}
        aria-valuemax={DEBT_METER_MAX}
        aria-valuetext={
          settled
            ? `Settled with the House (overpaid by ${Math.abs(state.debt)} gold)`
            : `${state.debt} gold of Debt out of ${DEBT_METER_MAX}`
        }
        style={{ position: 'relative', height: `${UIScale.space(14)}px`, background: SNAKE_EYES_PALETTE.meterTrack, borderRadius: '3px', overflow: 'hidden' }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          width: `${debtPct}%`,
          background: settled
            ? 'rgba(60, 200, 90, 0.4)'
            : `linear-gradient(90deg, ${VOID_VIOLET}, ${VOID_GOLD})`,
          transition: 'width 0.3s ease-out',
        }} />
        {/* Threshold tick marks. The next-threshold tick gets the
            .is-next class for a gentle pulse — "this is what the
            Dealer's waiting for." */}
        <ThresholdTick pct={(DEALER_THRESHOLDS.BOUNTY_WAVE / DEBT_METER_MAX) * 100} isNext={upcomingThreshold === DEALER_THRESHOLDS.BOUNTY_WAVE} />
        <ThresholdTick pct={(DEALER_THRESHOLDS.REPOSSESS / DEBT_METER_MAX) * 100} isNext={upcomingThreshold === DEALER_THRESHOLDS.REPOSSESS} />
        <ThresholdTick pct={(DEALER_THRESHOLDS.VOID_SLOT / DEBT_METER_MAX) * 100} isNext={upcomingThreshold === DEALER_THRESHOLDS.VOID_SLOT} />
        <ThresholdTick pct={(DEALER_THRESHOLDS.EXTRA_BOUNTY_AND_VOID / DEBT_METER_MAX) * 100} isNext={upcomingThreshold === DEALER_THRESHOLDS.EXTRA_BOUNTY_AND_VOID} />
      </div>
      {/* Threshold-label strip — sits under the bar, aligns with
          each tick. Teaches the Dealer mechanic at a glance: the
          player sees their Debt growing toward the next labelled
          number. */}
      <div style={{ position: 'relative', height: `${UIScale.space(14)}px`, marginTop: `${UIScale.space(2)}px` }}>
        <ThresholdLabel pct={(DEALER_THRESHOLDS.BOUNTY_WAVE / DEBT_METER_MAX) * 100} value={DEALER_THRESHOLDS.BOUNTY_WAVE} />
        <ThresholdLabel pct={(DEALER_THRESHOLDS.REPOSSESS / DEBT_METER_MAX) * 100} value={DEALER_THRESHOLDS.REPOSSESS} />
        <ThresholdLabel pct={(DEALER_THRESHOLDS.VOID_SLOT / DEBT_METER_MAX) * 100} value={DEALER_THRESHOLDS.VOID_SLOT} />
        <ThresholdLabel pct={(DEALER_THRESHOLDS.EXTRA_BOUNTY_AND_VOID / DEBT_METER_MAX) * 100} value={DEALER_THRESHOLDS.EXTRA_BOUNTY_AND_VOID} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: `${UIScale.space(4)}px`, fontSize: UIScale.fontCapped(11, 12), color: DIM_TEXT }}>
        <span>{settled
          ? <span style={{ color: SNAKE_EYES_PALETTE.settledGreen }}>
              settled — overpaid by {Math.abs(state.debt)}g
            </span>
          : `Debt ${state.debt}g`
        }</span>
        <span>start {INITIAL_DEBT}g</span>
      </div>

      {(actions.bountyWaves + actions.repossesses + actions.wagerSlotsVoided) > 0 && (
        <div class="snake-eyes-dealer-caption" style={{ marginTop: `${UIScale.space(8)}px`, fontSize: UIScale.fontCapped(11, 12), color: VOID_GOLD, fontStyle: 'italic' }}>
          {dealerCaption(actions)}
        </div>
      )}

      {hasAnyTally && (
        <div style={{ marginTop: `${UIScale.space(12)}px` }}>
          <div style={{
            fontFamily: "'Silkscreen', monospace",
            color: VOID_VIOLET,
            fontSize: UIScale.fontCapped(13, 14),
            marginBottom: `${UIScale.space(6)}px`,
            letterSpacing: '0.05em',
          }}>
            PACTBOOK TALLY
          </div>
          {/* Two grouped rows: accepted-by-tier on row 1, outcome
              on row 2. Outcome labels chosen via 3-versions blind-
              compare — winner: gambler-verb set ("passed / cashed /
              bust") for tonal fit + scan-density over plain English
              ("won / lost") and casino-POV ("paid out / burned"). */}
          <div role="list" aria-label="Accepted Wagers by tier" style={{ display: 'flex', gap: `${UIScale.space(8)}px`, flexWrap: 'wrap' as const, marginBottom: `${UIScale.space(6)}px` }}>
            <TallyChip label="T1" srLabel="Tier 1 (small) Wagers accepted" value={state.pactbookTally.acceptedT1} accent={VOID_VIOLET} />
            <TallyChip label="T2" srLabel="Tier 2 (medium) Wagers accepted" value={state.pactbookTally.acceptedT2} accent={VOID_VIOLET} />
            <TallyChip label="T3" srLabel="Tier 3 (high-risk) Wagers accepted" value={state.pactbookTally.acceptedT3} accent={VOID_GOLD} />
          </div>
          <div role="list" aria-label="Pactbook outcomes" style={{ display: 'flex', gap: `${UIScale.space(8)}px`, flexWrap: 'wrap' as const }}>
            <TallyChip label="passed" srLabel="Wagers declined (passed)" value={state.pactbookTally.declined} accent={DIM_TEXT} />
            <TallyChip label="cashed" srLabel="Accepted Wagers that paid out (cashed)" value={state.pactbookTally.succeeded} accent={SNAKE_EYES_PALETTE.settledGreen} />
            <TallyChip label="bust" srLabel="Accepted Wagers that failed (bust)" value={state.pactbookTally.failed} accent={SNAKE_EYES_PALETTE.lossRed} />
          </div>
        </div>
      )}

      {state.lastMissionDivergence > 0 && (
        <div style={{ marginTop: `${UIScale.space(10)}px`, fontSize: UIScale.fontCapped(11, 12), color: DIM_TEXT }}>
          last mission ran at <span style={{ color: VOID_GOLD }}>{state.lastMissionDivergence}/10</span> Divergence
        </div>
      )}

      <div style={{ marginTop: `${UIScale.space(10)}px`, fontSize: UIScale.fontCapped(11, 12), color: DIM_TEXT, fontStyle: 'italic' }}>
        {state.theresStatus === 'with_ardax'
          ? 'Theris rides with you.'
          : 'Theris cashed out.'}
      </div>
    </div>
  );
}

function ThresholdTick({ pct, isNext = false }: { pct: number; isNext?: boolean }) {
  return (
    <div
      class={isNext ? 'snake-eyes-debt-tick is-next' : 'snake-eyes-debt-tick'}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${pct}%`,
        width: isNext ? '2px' : '1px',
        background: SNAKE_EYES_PALETTE.meterTick,
      }}
    />
  );
}

function ThresholdLabel({ pct, value }: { pct: number; value: number }) {
  // Anchor each label horizontally-centered above its tick. Using
  // translateX(-50%) so the digit width doesn't drift the alignment.
  //
  // Tick positions on a 280px-wide phone meter sit at ~127/165/204/255px
  // — gaps of 38–51px between ticks. A 4-digit "1000" label at the
  // previous 18px phone font width comfortably exceeded those gaps,
  // so adjacent labels overlapped into "1 0 0 1 3 0 0" mush. Two
  // changes: (1) compact format ("1k" / "1.3k" / "1.6k" / "2k") cuts
  // worst-case width from 4 chars to 3; (2) the phone cap drops from
  // 18px to 12px — still legible, fits the tick-gap budget.
  return (
    <div aria-hidden="true" style={{
      position: 'absolute' as const,
      top: '0',
      left: `${pct}%`,
      transform: 'translateX(-50%)',
      fontSize: UIScale.fontCapped(9, 12),
      fontFamily: "'Silkscreen', monospace",
      color: 'var(--text-dim)',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap' as const,
    }}>
      {compactDebtLabel(value)}
    </div>
  );
}

/** Compact a Debt threshold value for the bar's tick label.
 *  1000 → "1k", 1300 → "1.3k", etc. Keeps the threshold's order of
 *  magnitude legible without spending screen on trailing zeros. */
function compactDebtLabel(value: number): string {
  const k = value / 1000;
  return k === Math.floor(k) ? `${k}k` : `${k.toFixed(1)}k`;
}

function TallyChip({ label, srLabel, value, accent }: { label: string; srLabel: string; value: number; accent: string }) {
  return (
    <div role="listitem" aria-label={`${srLabel}: ${value}`} style={{
      padding: `${UIScale.space(4)}px ${UIScale.space(8)}px`,
      borderRadius: '3px',
      background: 'rgba(0,0,0,0.25)',
      border: `1px solid ${accent === DIM_TEXT ? SNAKE_EYES_PALETTE.border.fainter : accent}`,
      minWidth: `${UIScale.space(40)}px`,
      textAlign: 'center' as const,
    }}>
      <div style={{ fontSize: UIScale.fontCapped(10, 11), color: DIM_TEXT, letterSpacing: '0.05em' }}>{label}</div>
      <div style={{
        fontFamily: "'Silkscreen', monospace",
        fontSize: UIScale.fontCapped(14, 15),
        color: accent,
        marginTop: '1px',
      }}>{value}</div>
    </div>
  );
}

function dealerCaption(actions: ReturnType<typeof computeDealerActions>): string {
  // Phrasing chosen via 3-versions blind-compare. Winner: diegetic
  // "Note on the table:" — the caption reads as a note Ardax is
  // looking at, not UI chrome. Scales cleanly across short + long
  // action lists (the colon frames any payload size).
  const parts: string[] = [];
  if (actions.bountyWaves > 0) parts.push(actions.bountyWaves === 1 ? 'a bounty wave' : `${actions.bountyWaves} bounty waves`);
  if (actions.repossesses > 0) parts.push('one tower repossession');
  if (actions.wagerSlotsVoided > 0) parts.push(actions.wagerSlotsVoided === 1 ? 'one voided Wager slot' : `${actions.wagerSlotsVoided} voided Wager slots`);
  if (parts.length === 0) return '';
  return `Note on the table: ${parts.join(' + ')}, next mission.`;
}

