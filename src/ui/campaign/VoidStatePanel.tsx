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

const VOID_VIOLET = '#a288d0';
const VOID_GOLD = '#d4b04a';
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
      background: 'rgba(16, 8, 24, 0.4)',
      border: '1px solid rgba(162, 136, 208, 0.3)',
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

      {/* Debt-meter with threshold tick marks */}
      <div style={{ position: 'relative', height: '14px', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
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
        <span>{settled ? <span style={{ color: 'rgba(60, 200, 90, 0.9)' }}>settled with the House</span> : `Debt ${state.debt}g`}</span>
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            <TallyChip label="T1" value={state.pactbookTally.acceptedT1} accent={VOID_VIOLET} />
            <TallyChip label="T2" value={state.pactbookTally.acceptedT2} accent={VOID_VIOLET} />
            <TallyChip label="T3" value={state.pactbookTally.acceptedT3} accent={VOID_GOLD} />
            <TallyChip label="passed" value={state.pactbookTally.declined} accent={DIM_TEXT} />
            <TallyChip label="won" value={state.pactbookTally.succeeded} accent={'rgba(60, 200, 90, 0.9)'} />
            <TallyChip label="lost" value={state.pactbookTally.failed} accent={'rgba(220, 80, 80, 0.85)'} />
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
      background: 'rgba(255,255,255,0.4)',
    }} />
  );
}

function TallyChip({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      padding: '4px 8px',
      borderRadius: '3px',
      background: 'rgba(0,0,0,0.25)',
      border: `1px solid ${accent === DIM_TEXT ? 'rgba(255,255,255,0.08)' : accent}`,
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
