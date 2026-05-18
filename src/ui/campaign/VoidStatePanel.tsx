/**
 * VoidStatePanel — Snake Eyes campaign's lobby state readout.
 *
 * Renders in the campaign lobby's `CampaignStatePanelRegistry` slot
 * (between header and mission list). Shows:
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
 *
 * Side-effect registration at the bottom of the module wires this
 * into CampaignStatePanelRegistry under the 'void' faction key.
 * Imported for side effects from main.ts via the campaign-systems
 * bootstrap.
 */

import { CampaignStatePanelRegistry } from '../../systems/campaign/CampaignStatePanelRegistry';
import {
  getSnakeEyesState,
  INITIAL_DEBT,
} from '../../systems/voidc/DebtTracker';
import { DEALER_THRESHOLDS, computeDealerActions } from '../../systems/voidc/DealerActions';
import { SNAKE_EYES_PALETTE } from '../../systems/voidc/SnakeEyesPalette';

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

  return (
    <div style={{
      background: SNAKE_EYES_PALETTE.surface.statePanel,
      border: `1px solid ${SNAKE_EYES_PALETTE.border.statePanel}`,
      borderRadius: '8px',
      padding: '12px 16px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: PRIMARY_TEXT,
    }}>
      <div style={{
        fontFamily: "'Silkscreen', monospace",
        color: VOID_VIOLET,
        fontSize: '13px',
        marginBottom: '8px',
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
        style={{ position: 'relative', height: '14px', background: SNAKE_EYES_PALETTE.meterTrack, borderRadius: '3px', overflow: 'hidden' }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          width: `${debtPct}%`,
          background: settled
            ? 'rgba(60, 200, 90, 0.4)'
            : `linear-gradient(90deg, ${VOID_VIOLET}, ${VOID_GOLD})`,
          transition: 'width 0.3s ease-out',
        }} />
        {/* Threshold tick marks */}
        <ThresholdTick pct={(DEALER_THRESHOLDS.BOUNTY_WAVE / DEBT_METER_MAX) * 100} />
        <ThresholdTick pct={(DEALER_THRESHOLDS.REPOSSESS / DEBT_METER_MAX) * 100} />
        <ThresholdTick pct={(DEALER_THRESHOLDS.VOID_SLOT / DEBT_METER_MAX) * 100} />
        <ThresholdTick pct={(DEALER_THRESHOLDS.EXTRA_BOUNTY_AND_VOID / DEBT_METER_MAX) * 100} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: DIM_TEXT }}>
        <span>{settled ? <span style={{ color: SNAKE_EYES_PALETTE.settledGreen }}>settled with the House</span> : `Debt ${state.debt}g`}</span>
        <span>start {INITIAL_DEBT}g</span>
      </div>

      {(actions.bountyWaves + actions.repossesses + actions.wagerSlotsVoided) > 0 && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: VOID_GOLD, fontStyle: 'italic' }}>
          {dealerCaption(actions)}
        </div>
      )}

      {hasAnyTally && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            fontFamily: "'Silkscreen', monospace",
            color: VOID_VIOLET,
            fontSize: '13px',
            marginBottom: '6px',
            letterSpacing: '0.05em',
          }}>
            PACTBOOK TALLY
          </div>
          <div role="list" aria-label="Pactbook outcome tally" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            <TallyChip label="T1" srLabel="Tier 1 (small) Wagers accepted" value={state.pactbookTally.acceptedT1} accent={VOID_VIOLET} />
            <TallyChip label="T2" srLabel="Tier 2 (medium) Wagers accepted" value={state.pactbookTally.acceptedT2} accent={VOID_VIOLET} />
            <TallyChip label="T3" srLabel="Tier 3 (high-risk) Wagers accepted" value={state.pactbookTally.acceptedT3} accent={VOID_GOLD} />
            <TallyChip label="passed" srLabel="Wagers declined (passed)" value={state.pactbookTally.declined} accent={DIM_TEXT} />
            <TallyChip label="won" srLabel="Accepted Wagers that paid out" value={state.pactbookTally.succeeded} accent={SNAKE_EYES_PALETTE.settledGreen} />
            <TallyChip label="lost" srLabel="Accepted Wagers that failed" value={state.pactbookTally.failed} accent={SNAKE_EYES_PALETTE.lossRed} />
          </div>
        </div>
      )}

      {state.lastMissionDivergence > 0 && (
        <div style={{ marginTop: '10px', fontSize: '11px', color: DIM_TEXT }}>
          last mission ran at <span style={{ color: VOID_GOLD }}>{state.lastMissionDivergence}/10</span> Divergence
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '11px', color: DIM_TEXT, fontStyle: 'italic' }}>
        {state.theresStatus === 'with_ardax'
          ? 'Theris rides with you.'
          : 'Theris cashed out.'}
      </div>
    </div>
  );
}

function ThresholdTick({ pct }: { pct: number }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: `${pct}%`,
      width: '1px',
      background: SNAKE_EYES_PALETTE.meterTick,
    }} />
  );
}

function TallyChip({ label, srLabel, value, accent }: { label: string; srLabel: string; value: number; accent: string }) {
  return (
    <div role="listitem" aria-label={`${srLabel}: ${value}`} style={{
      padding: '4px 8px',
      borderRadius: '3px',
      background: 'rgba(0,0,0,0.25)',
      border: `1px solid ${accent === DIM_TEXT ? SNAKE_EYES_PALETTE.border.fainter : accent}`,
      minWidth: '40px',
      textAlign: 'center' as const,
    }}>
      <div style={{ fontSize: '10px', color: DIM_TEXT, letterSpacing: '0.05em' }}>{label}</div>
      <div style={{
        fontFamily: "'Silkscreen', monospace",
        fontSize: '14px',
        color: accent,
        marginTop: '1px',
      }}>{value}</div>
    </div>
  );
}

function dealerCaption(actions: ReturnType<typeof computeDealerActions>): string {
  const parts: string[] = [];
  if (actions.bountyWaves > 0) parts.push(actions.bountyWaves === 1 ? 'a bounty wave' : `${actions.bountyWaves} bounty waves`);
  if (actions.repossesses > 0) parts.push('one tower repossession');
  if (actions.wagerSlotsVoided > 0) parts.push(actions.wagerSlotsVoided === 1 ? 'one voided Wager slot' : `${actions.wagerSlotsVoided} voided Wager slots`);
  if (parts.length === 0) return '';
  return `The Dealer will visit next mission: ${parts.join(' + ')}.`;
}

CampaignStatePanelRegistry.register('void', VoidStatePanel);
