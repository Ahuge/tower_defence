/**
 * SabotageHudDOM — Mech M10 HUD.
 *
 * Two render modes driven by `workshopPanelOpen`:
 *  - **Closed (default):** a small status badge in the bottom-right
 *    showing generator progress + throne state + queue depth. Always
 *    visible while M10 is active. No interaction.
 *  - **Open (player clicked the Workshop tile):** the full panel with
 *    Train + 3 upgrade buttons. Close button (×) dispatches
 *    SABOTAGE_PANEL_CLOSE_EVENT.
 *
 * Buttons dispatch window events; GameScene routes them to the
 * SabotageController. No direct DOM↔controller coupling.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import type { SabotageHudState } from '../GameUIStore';
import {
  SABOTAGE_TRAIN_EVENT,
  SABOTAGE_UPGRADE_EVENT,
  SABOTAGE_PANEL_CLOSE_EVENT,
  type SabotageUpgradeEventDetail,
} from '../../systems/sabotage/SabotageEvents';

export function SabotageHudDOM() {
  const hud = useGameUISelector(s => s.sabotageHud);
  if (!hud) return null;

  const throneVulnerable = hud.generatorsAlive === 0 && hud.generatorsTotal > 0;
  const generatorsDone = hud.generatorsTotal - hud.generatorsAlive;

  return hud.workshopPanelOpen
    ? <WorkshopPanel hud={hud} throneVulnerable={throneVulnerable} generatorsDone={generatorsDone} />
    : <StatusBadge hud={hud} throneVulnerable={throneVulnerable} generatorsDone={generatorsDone} />;
}

interface HudViewProps {
  hud: SabotageHudState;
  throneVulnerable: boolean;
  generatorsDone: number;
}

// ─── STATUS BADGE — always-visible mini summary ─────────────

function StatusBadge({ hud, throneVulnerable, generatorsDone }: HudViewProps) {
  return (
    <div
      class="sabotage-hud-status game-panel"
      title="Click the Workshop tile on the map to train raiders + buy upgrades."
      style={{
        position: 'fixed',
        bottom: '12px',
        right: '12px',
        zIndex: 110,
        minWidth: '160px',
        padding: '8px 12px',
        pointerEvents: 'auto',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div style={{
        fontFamily: "'VT323', ui-monospace, monospace",
        fontSize: '13px', letterSpacing: '1px',
        color: throneVulnerable ? '#ffdd44' : 'var(--text-primary)',
      }}>
        {throneVulnerable
          ? 'THRONE EXPOSED'
          : `GENERATORS  ${generatorsDone} / ${hud.generatorsTotal}`}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
        Queue {hud.queueCount} / {hud.queueMax}
        {hud.raidersAlive > 0 && ` · ${hud.raidersAlive} raider${hud.raidersAlive === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}

// ─── WORKSHOP PANEL — opens on Workshop tile click ──────────

function WorkshopPanel({ hud, throneVulnerable, generatorsDone }: HudViewProps) {
  const cooldownReady = hud.workshopCooldownMs <= 0;
  const cooldownLabel = cooldownReady ? 'Ready' : `${(hud.workshopCooldownMs / 1000).toFixed(1)}s`;
  const queueFull = hud.queueCount >= hud.queueMax;

  const train = () => window.dispatchEvent(new Event(SABOTAGE_TRAIN_EVENT));
  const upgrade = (kind: SabotageUpgradeEventDetail['kind']) => {
    window.dispatchEvent(new CustomEvent(SABOTAGE_UPGRADE_EVENT, { detail: { kind } }));
  };
  const close = () => window.dispatchEvent(new Event(SABOTAGE_PANEL_CLOSE_EVENT));

  return (
    <div
      class="sabotage-hud-panel game-panel"
      style={{
        position: 'fixed',
        bottom: '12px',
        right: '12px',
        zIndex: 110,
        minWidth: '240px',
        padding: '10px 12px',
        pointerEvents: 'auto',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Header — title + close button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <span style={{
          fontFamily: "'VT323', ui-monospace, monospace",
          fontSize: '15px', letterSpacing: '1px',
          color: 'var(--gold)',
        }}>
          WORKSHOP
        </span>
        <button
          type="button"
          onClick={close}
          title="Close the panel (or click the Workshop tile again)."
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer',
            fontSize: '18px', lineHeight: 1, padding: '0 4px',
          }}
        >×</button>
      </div>

      {/* Throne / generator progress */}
      <div style={{
        fontFamily: "'VT323', ui-monospace, monospace",
        fontSize: '12px', letterSpacing: '1px',
        color: throneVulnerable ? '#ffdd44' : 'var(--text-secondary)',
        marginBottom: '8px',
      }}>
        {throneVulnerable
          ? 'THRONE EXPOSED'
          : `GENERATORS  ${generatorsDone} / ${hud.generatorsTotal}`}
      </div>

      {/* Train Raider button — enqueues into the workshop queue */}
      <button
        type="button"
        onClick={train}
        disabled={queueFull}
        title="Queue an apprentice mage. Up to 3 can be queued ahead of the cooldown. Stats stamped at SPAWN time from your current upgrade tiers — so an upgrade bought after queuing still applies."
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '8px',
          background: queueFull ? 'rgba(255,255,255,0.04)' : 'var(--bg-elev)',
          border: `1px solid ${queueFull ? 'rgba(255,255,255,0.1)' : 'var(--gold)'}`,
          borderRadius: '4px',
          color: queueFull ? 'var(--text-dim)' : 'var(--text-primary)',
          cursor: queueFull ? 'default' : 'pointer',
          fontFamily: 'inherit',
          fontSize: '13px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>Train Raider</span>
          <span style={{ fontSize: '12px' }}>{hud.trainCost}g</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
          {cooldownLabel} · Queue {hud.queueCount} / {hud.queueMax}
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
      <UpgradeButton kind="plate" label="Plate" tier={hud.upgradeLevels.plate} cost={hud.nextUpgradeCost.plate} onClick={upgrade}
        tooltip="Plate — Raider HP. Tiers add +50% / +100% / +150%. Stamped at SPAWN time, not enqueue time — buying mid-queue still applies." />
      <UpgradeButton kind="edge" label="Edge" tier={hud.upgradeLevels.edge} cost={hud.nextUpgradeCost.edge} onClick={upgrade}
        tooltip="Edge — Raider attack damage. Tiers add +50% / +100% / +150%. Stamped at SPAWN time." />
      <UpgradeButton kind="tread" label="Tread" tier={hud.upgradeLevels.tread} cost={hud.nextUpgradeCost.tread} onClick={upgrade}
        tooltip="Tread — Raider move speed. Tiers add +25% / +50% / +75% (gentler than HP/damage because speed compounds harder). Stamped at SPAWN time." />
    </div>
  );
}

function UpgradeButton(props: {
  kind: 'plate' | 'edge' | 'tread';
  label: string;
  tier: number;
  cost: number | null;
  onClick: (k: 'plate' | 'edge' | 'tread') => void;
  tooltip: string;
}) {
  const maxed = props.cost === null;
  const tier = props.tier;
  const cost = props.cost;
  return (
    <button
      type="button"
      onClick={() => props.onClick(props.kind)}
      disabled={maxed}
      title={props.tooltip}
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
