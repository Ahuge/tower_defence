/**
 * FinaleHudDOM — top-of-screen HUD bar for M10 The Reckoning.
 *
 * Renders only when `GameUIStore.state.finaleHud` is set (the
 * FinaleController exists). Two pieces of info:
 *  - Summoning charge bar: 0%→100%. Reads as "filling pillar of light"
 *    visually with a teal→violet gradient. Switches to a subtle
 *    "MAGE SUMMONED" tag once the hero has appeared.
 *  - CPU tower kill progress: "12 / 23 towers remaining" — lets the
 *    player see how close they are to victory at a glance.
 *
 * Position: top centre, fixed. Doesn't conflict with the GameSidebar
 * (left) or the AttackerComposerOverlay (right, but hidden in finale).
 */
import { useGameUISelector } from '../hooks/useGameUI';

export function FinaleHudDOM() {
  const hud = useGameUISelector(s => s.finaleHud);
  if (!hud) return null;

  const pct = Math.max(0, Math.min(1, hud.charge));
  const pctLabel = Math.round(pct * 100);
  const towersRemaining = hud.cpuTowersRemaining;
  const towersTotal = hud.cpuTowersTotal;
  const heroDead = !!(hud.heroHp && !hud.heroHp.alive);
  // Per v5b: hero death resets charge to 0 and the player has to
  // re-summon via Conduits. While dead, the bar shows charge progress
  // (not the hero HP / countdown), so the player sees the meter
  // refill in real time.
  const showChargeBar = !hud.heroSummoned || heroDead;
  const respawnSeconds = heroDead && hud.heroHp ? Math.ceil(hud.heroHp.respawnIn) : 0;
  const heroHpPct = hud.heroHp && hud.heroHp.maxHp > 0
    ? Math.max(0, hud.heroHp.hp / hud.heroHp.maxHp)
    : 0;

  return (
    <div
      class="finale-hud game-panel"
      style={{
        position: 'fixed',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 110,
        minWidth: '320px',
        maxWidth: '440px',
        padding: '8px 12px',
        pointerEvents: 'auto',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Row 1 — summoning charge (pre-summon OR while dead) or hero HP */}
      {showChargeBar ? (
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: '4px',
          }}>
            <span style={{
              fontFamily: "'VT323', ui-monospace, monospace",
              fontSize: '14px', fontWeight: 'bold', color: 'var(--jewel-violet)',
              letterSpacing: '1px',
            }}>
              {heroDead ? 'RE-SUMMONING' : 'SUMMONING CHARGE'}
            </span>
            <span style={{
              fontSize: '13px', color: pct >= 1 ? '#ffdd44' : 'var(--jewel-teal)',
              fontWeight: 'bold',
            }}>
              {pctLabel}%
            </span>
          </div>
          <div style={{
            height: '8px', background: 'rgba(255,255,255,0.08)',
            borderRadius: '4px', overflow: 'hidden',
            border: '1px solid rgba(204,136,255,0.4)',
          }}>
            <div style={{
              width: `${pctLabel}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--jewel-teal), var(--jewel-violet))',
              transition: 'width 200ms ease-out',
            }} />
          </div>
          <div style={{
            marginTop: '3px', fontSize: '10px', color: 'var(--text-dim)',
          }}>
            Build Mana Conduits adjacent to either Summoning Circle to charge.
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: '4px',
          }}>
            <span style={{
              fontFamily: "'VT323', ui-monospace, monospace",
              fontSize: '14px', fontWeight: 'bold',
              color: heroDead ? '#ff6644' : '#ffdd44',
              letterSpacing: '1px',
            }}>
              {heroDead ? `HERO RESPAWN ${respawnSeconds}s` : 'FORGE MAGE'}
            </span>
            {hud.heroHp && !heroDead && (
              <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                {Math.round(hud.heroHp.hp)} / {hud.heroHp.maxHp}
              </span>
            )}
          </div>
          {hud.heroHp && (
            <div style={{
              height: '6px', background: 'rgba(255,255,255,0.08)',
              borderRadius: '3px', overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.round(heroHpPct * 100)}%`, height: '100%',
                background: heroDead ? '#444444' :
                  heroHpPct > 0.5 ? '#44ff66' : heroHpPct > 0.25 ? '#ffcc44' : '#ff4444',
                transition: 'width 120ms ease-out',
              }} />
            </div>
          )}
        </div>
      )}

      {/* Row 2 — tower kill progress */}
      <div style={{
        marginTop: '6px', paddingTop: '6px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: "'VT323', ui-monospace, monospace",
          fontSize: '13px', color: 'var(--text-primary)',
          letterSpacing: '1px',
        }}>
          CABAL LATTICE
        </span>
        <span style={{
          fontSize: '13px',
          color: towersRemaining === 1 ? '#ffdd44' : 'var(--text-primary)',
          fontWeight: towersRemaining <= 3 ? 'bold' : 'normal',
        }}>
          {towersTotal - towersRemaining} / {towersTotal} destroyed
        </span>
      </div>
    </div>
  );
}
