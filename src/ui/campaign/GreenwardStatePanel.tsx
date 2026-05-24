/**
 * GreenwardStatePanel — Greenward campaign's lobby state readout.
 *
 * Rendered in the campaign lobby's per-extension `ui.panels` slot
 * (between header and mission list). The Greenward extension wires
 * this component via `GREENWARD_EXTENSION.ui.panels` in `greenward.ts`.
 * Shows:
 *
 *   - Wildwood Reserves meter — visual sap-fill on a 0..100 scale,
 *     with the "post-spend cap" line at 95 indicated subtly.
 *   - Mode-lean tally — three heraldic counts (Ceremony / Siege /
 *     Mercy). Hidden until at least one ruin has been claimed across
 *     the campaign (avoids cluttering the lobby on a fresh install).
 *   - Caer Wenna status — a small "bound / lost" line when applicable.
 */

import {
  getReserves,
  INITIAL_RESERVES,
  MAX_AFTER_SPEND,
} from '../../systems/greenward/WildwoodReserves';
import {
  getModeLean,
  hasAnyLean,
  LEAN_THRESHOLD,
  type ModeLean,
} from '../../systems/greenward/ModeLeanTracker';
import { isCaerWennaBound } from '../../systems/greenward/PersistedTowerState';
import { UIScale } from '../../systems/UIScale';

const NATURE_GREEN = '#33aa44';
const SAP_GREEN = '#88cc55';
const DIM_TEXT = 'var(--text-dim)';
const PRIMARY_TEXT = 'var(--text-primary)';

interface Props {
  factionId: string;
}

export function GreenwardStatePanel(_props: Props) {
  const reserves = getReserves();
  const reservesPct = Math.max(0, Math.min(100, (reserves / INITIAL_RESERVES) * 100));
  const capPct = (MAX_AFTER_SPEND / INITIAL_RESERVES) * 100;
  const lean = getModeLean();
  const showLean = hasAnyLean();
  const wennaBound = isCaerWennaBound();

  return (
    <div style={{
      background: 'rgba(8, 16, 8, 0.4)',
      border: '1px solid rgba(51, 170, 68, 0.3)',
      borderRadius: '8px',
      padding: `${UIScale.space(12)}px ${UIScale.space(16)}px`,
      fontFamily: 'system-ui, sans-serif',
      fontSize: UIScale.fontCapped(12, 24),
      color: PRIMARY_TEXT,
    }}>
      <div style={{
        fontFamily: "'Silkscreen', monospace",
        color: NATURE_GREEN,
        fontSize: UIScale.fontCapped(13, 26),
        marginBottom: `${UIScale.space(8)}px`,
        letterSpacing: '0.05em',
      }}>
        WILDWOOD RESERVES
      </div>

      {/* Sap-meter — bar with cap-line */}
      <div style={{ position: 'relative', height: `${UIScale.space(14)}px`, background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          width: `${reservesPct}%`,
          background: `linear-gradient(90deg, ${SAP_GREEN}, ${NATURE_GREEN})`,
          transition: 'width 0.3s ease-out',
        }} />
        {/* Post-spend cap indicator at 95% */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${capPct}%`,
          width: '1px',
          background: 'rgba(255,255,255,0.5)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: `${UIScale.space(4)}px`, fontSize: UIScale.fontCapped(11, 22), color: DIM_TEXT }}>
        <span>{reserves} / {INITIAL_RESERVES}</span>
        <span>cap {MAX_AFTER_SPEND}</span>
      </div>

      {showLean && (
        <div style={{ marginTop: `${UIScale.space(12)}px` }}>
          <div style={{
            fontFamily: "'Silkscreen', monospace",
            color: NATURE_GREEN,
            fontSize: UIScale.fontCapped(13, 26),
            marginBottom: `${UIScale.space(6)}px`,
            letterSpacing: '0.05em',
          }}>
            MODE-LEAN TALLY
          </div>
          <div style={{ display: 'flex', gap: `${UIScale.space(12)}px`, alignItems: 'center' }}>
            <LeanBadge label="Ceremony" count={lean.ceremony} threshold={LEAN_THRESHOLD} highlighted={lean.lean === 'ceremony' || lean.lean === 'both'} />
            <LeanBadge label="Siege" count={lean.siege} threshold={LEAN_THRESHOLD} highlighted={lean.lean === 'siege' && lean.ceremony === 0 && lean.mercy === 0} />
            <LeanBadge label="Mercy" count={lean.mercy} threshold={LEAN_THRESHOLD} highlighted={lean.lean === 'mercy' || lean.lean === 'both'} />
          </div>
          <div style={{ marginTop: `${UIScale.space(6)}px`, fontSize: UIScale.fontCapped(11, 22), color: DIM_TEXT, fontStyle: 'italic' }}>
            {captionForLean(lean.lean)}
          </div>
        </div>
      )}

      {wennaBound && (
        <div style={{ marginTop: `${UIScale.space(10)}px`, fontSize: UIScale.fontCapped(11, 22), color: DIM_TEXT, fontStyle: 'italic' }}>
          Caer Wenna walks with you.
        </div>
      )}
    </div>
  );
}

function LeanBadge({ label, count, threshold, highlighted }: { label: string; count: number; threshold: number; highlighted: boolean }) {
  const met = count >= threshold;
  return (
    <div style={{
      flex: 1,
      padding: `${UIScale.space(6)}px ${UIScale.space(8)}px`,
      borderRadius: '4px',
      background: highlighted ? 'rgba(51, 170, 68, 0.18)' : 'rgba(0,0,0,0.25)',
      border: `1px solid ${highlighted ? NATURE_GREEN : 'rgba(255,255,255,0.08)'}`,
      textAlign: 'center' as const,
    }}>
      <div style={{ fontSize: UIScale.fontCapped(11, 22), color: highlighted ? PRIMARY_TEXT : DIM_TEXT, letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Silkscreen', monospace",
        fontSize: UIScale.fontCapped(16, 28),
        color: met ? NATURE_GREEN : PRIMARY_TEXT,
        marginTop: '2px',
      }}>
        {count}
      </div>
    </div>
  );
}

function captionForLean(lean: ModeLean): string {
  switch (lean) {
    case 'ceremony':  return 'The Ceremony path will open at the Nave.';
    case 'mercy':     return 'The Mercy path will open at the Nave.';
    case 'both':      return 'Both Ceremony and Mercy paths are open at the Nave.';
    case 'siege':     return 'No path unlocked yet. Continue claiming ruins.';
  }
}

