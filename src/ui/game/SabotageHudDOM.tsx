/**
 * SabotageHudDOM — DOM HUD panel for the Mech M10 finale.
 *
 * Renders only when `GameUIStore.state.sabotageHud` is set (the
 * SabotageController exists). Shows:
 *   - Throne shield status + generator progress.
 *   - Train Raider button with cooldown gauge + cost.
 *   - Three global upgrade buttons (Plate / Edge / Tread) with
 *     current tier + cost-of-next-tier.
 *
 * Buttons fire window events the GameScene listens for; no direct
 * coupling between this DOM tree and the controller.
 *
 *   td-sabotage-train       → trainRaider()
 *   td-sabotage-upgrade     detail.kind = 'plate' | 'edge' | 'tread'
 *
 * Position: bottom-right, fixed. Doesn't conflict with the GameSidebar
 * (left), the FinaleHudDOM (top centre — different mission, never
 * coexists), or the AttackerComposerOverlay (right, also gated).
 */
import { useGameUISelector } from '../hooks/useGameUI';
import {
  SABOTAGE_TRAIN_EVENT,
  SABOTAGE_UPGRADE_EVENT,
  type SabotageUpgradeEventDetail,
} from '../../systems/sabotage/SabotageEvents';

export function SabotageHudDOM() {
  const hud = useGameUISelector(s => s.sabotageHud);
  if (!hud) return null;

  const cooldownReady = hud.workshopCooldownMs <= 0;
  const cooldownLabel = cooldownReady ? 'Ready' : `${(hud.workshopCooldownMs / 1000).toFixed(1)}s`;
  const generatorsRemaining = hud.generatorsAlive;
  const throneVulnerable = hud.generatorsAlive === 0 && hud.generatorsTotal > 0;

  const train = () => window.dispatchEvent(new Event(SABOTAGE_TRAIN_EVENT));
  const upgrade = (kind: SabotageUpgradeEventDetail['kind']) => {
    window.dispatchEvent(new CustomEvent(SABOTAGE_UPGRADE_EVENT, { detail: { kind } }));
  };

  return (
    <div
      class="sabotage-hud game-panel"
      style={{
        position: 'fixed',
        bottom: '12px',
        right: '12px',
        zIndex: 110,
        minWidth: '220px',
        padding: '10px 12px',
        pointerEvents: 'auto',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Throne / generator progress */}
      <div style={{
        fontFamily: "'VT323', ui-monospace, monospace",
        fontSize: '14px', letterSpacing: '1px',
        color: throneVulnerable ? '#ffdd44' : 'var(--text-primary)',
        marginBottom: '8px',
      }}>
        {throneVulnerable
          ? 'THRONE EXPOSED'
          : `GENERATORS  ${hud.generatorsTotal - generatorsRemaining} / ${hud.generatorsTotal}`}
      </div>

      {/* Train Raider button */}
      <button
        type="button"
        onClick={train}
        disabled={!cooldownReady}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '8px',
          background: cooldownReady ? 'var(--bg-elev)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${cooldownReady ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '4px',
          color: cooldownReady ? 'var(--text-primary)' : 'var(--text-dim)',
          cursor: cooldownReady ? 'pointer' : 'default',
          fontFamily: 'inherit',
          fontSize: '13px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>Train Raider</span>
          <span style={{ fontSize: '12px' }}>{hud.trainCost}g</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
          {cooldownLabel} · {hud.raidersAlive} alive
        </div>
      </button>

      {/* Upgrades */}
      <div style={{
        fontSize: '10px', color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '1px',
        marginBottom: '4px',
      }}>
        Squad Upgrades
      </div>
      <UpgradeButton kind="plate" label="Plate" tier={hud.upgradeLevels.plate} cost={hud.nextUpgradeCost.plate} onClick={upgrade} />
      <UpgradeButton kind="edge" label="Edge" tier={hud.upgradeLevels.edge} cost={hud.nextUpgradeCost.edge} onClick={upgrade} />
      <UpgradeButton kind="tread" label="Tread" tier={hud.upgradeLevels.tread} cost={hud.nextUpgradeCost.tread} onClick={upgrade} />
    </div>
  );
}

function UpgradeButton(props: {
  kind: 'plate' | 'edge' | 'tread';
  label: string;
  tier: number;
  cost: number | null;
  onClick: (k: 'plate' | 'edge' | 'tread') => void;
}) {
  const maxed = props.cost === null;
  const tier = props.tier;
  const cost = props.cost;
  return (
    <button
      type="button"
      onClick={() => props.onClick(props.kind)}
      disabled={maxed}
      style={{
        width: '100%',
        padding: '6px 8px',
        marginBottom: '4px',
        background: maxed ? 'rgba(255,255,255,0.03)' : 'var(--bg-elev)',
        border: `1px solid ${maxed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)'}`,
        borderRadius: '3px',
        color: maxed ? 'var(--text-dim)' : 'var(--text-primary)',
        cursor: maxed ? 'default' : 'pointer',
        fontFamily: 'inherit',
        fontSize: '12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}
    >
      <span>
        <span style={{ fontWeight: 'bold' }}>{props.label}</span>
        <span style={{ marginLeft: '8px', color: 'var(--text-dim)' }}>T{tier}{maxed ? ' (MAX)' : ''}</span>
      </span>
      {!maxed && <span style={{ fontSize: '11px' }}>{cost}g</span>}
    </button>
  );
}
