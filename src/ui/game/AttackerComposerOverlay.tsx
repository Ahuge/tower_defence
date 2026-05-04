/**
 * AttackerComposerOverlay — pre-wave creep-pick UI for attacker
 * missions (Plan 12 v2 Phase 1).
 *
 * Renders only when `GameUIStore.state.attackerComposer` is set
 * (between waves of an attacker mission). Shows palette cards with
 * +/- count selectors, a budget bar, and a Send Wave button.
 *
 * All state lives in the AttackerComposer (held on GameScene). This
 * component is a pure render of the snapshot pushed via
 * `GameUIStore.setAttackerComposer(...)`. User interactions go back
 * via `requestAttackerAdjust / Clear / SendWave`.
 */
import { useGameUISelector } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { ResponsiveManager } from '../../systems/ResponsiveManager';

export function AttackerComposerOverlay() {
  const composer = useGameUISelector(s => s.attackerComposer);
  if (!composer) return null;

  const { entries, spent, budget, waveNum, canSend, abilities, wagon } = composer;
  const remaining = budget - spent;
  const wagonAffordOne = remaining >= wagon.costPerWagon;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const isPhone = ResponsiveManager.isPhone();

  // Phone: occupy the sidebar slot (top-left, full width). The sidebar
  // hides its WAVES + ECONOMY panels in attacker mode, so this is the
  // only chrome at the top of the screen — no overlap.
  // Desktop: top-right, fixed 320px width.
  const positionStyle = isPhone
    ? { left: '8px', right: '8px', top: '8px' }
    : { right: '12px', top: '12px', width: '320px' };

  return (
    <div
      class="attacker-composer game-panel"
      style={{
        position: 'fixed',
        ...positionStyle,
        zIndex: 120,
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        padding: '10px',
        pointerEvents: 'auto',
      }}
    >
      {/* Header — wave + budget bar */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: '4px',
        }}>
          <span style={{
            fontFamily: "'VT323', ui-monospace, monospace",
            fontSize: '18px', fontWeight: 'bold', color: 'var(--gold)',
          }}>
            COMPOSE WAVE {waveNum}
          </span>
          <span style={{
            fontSize: '12px',
            color: remaining < 0 ? '#ff6666' : 'var(--jewel-teal)',
          }}>
            {spent}/{budget} ess
          </span>
        </div>
        <div style={{
          height: '6px', background: 'rgba(255,255,255,0.08)',
          borderRadius: '3px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: 'linear-gradient(90deg, var(--jewel-teal), var(--jewel-violet))',
            transition: 'width 120ms ease-out',
          }} />
        </div>
      </div>

      {/* Palette cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {entries.map(e => {
          const canAddOne = remaining >= e.cost;
          return (
            <div
              key={e.creepType}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px', borderRadius: '4px',
                background: e.count > 0 ? 'rgba(212,123,84,0.12)' : 'rgba(255,255,255,0.03)',
                border: e.count > 0 ? '1px solid var(--faction-harmonic)' : '1px solid transparent',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)',
                  display: 'flex', justifyContent: 'space-between', gap: '6px',
                }}>
                  <span>{e.label}</span>
                  <span style={{ color: 'var(--gold)', fontSize: '11px' }}>{e.cost}e</span>
                </div>
                <div style={{
                  fontSize: '10px', color: 'var(--text-dim)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {e.description}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  class="ui-btn"
                  onClick={() => GameUIStore.requestAttackerAdjust(e.creepType, -1)}
                  disabled={e.count <= 0}
                  style={{
                    width: '24px', height: '24px', padding: 0,
                    fontSize: '14px', lineHeight: '24px',
                    opacity: e.count <= 0 ? 0.3 : 1,
                  }}
                >−</button>
                <span style={{
                  minWidth: '24px', textAlign: 'center',
                  fontFamily: "'VT323', ui-monospace, monospace",
                  fontSize: '16px', color: e.count > 0 ? 'var(--gold)' : 'var(--text-dim)',
                }}>{e.count}</span>
                <button
                  class="ui-btn"
                  onClick={() => GameUIStore.requestAttackerAdjust(e.creepType, +1)}
                  disabled={!canAddOne}
                  style={{
                    width: '24px', height: '24px', padding: 0,
                    fontSize: '14px', lineHeight: '24px',
                    opacity: canAddOne ? 1 : 0.3,
                  }}
                >+</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Anti-magic Wagon spinner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginTop: '10px', padding: '6px',
        background: wagon.count > 0 ? 'rgba(139,107,199,0.15)' : 'rgba(255,255,255,0.03)',
        border: wagon.count > 0 ? '1px solid var(--jewel-violet)' : '1px solid transparent',
        borderRadius: '4px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)',
            display: 'flex', justifyContent: 'space-between', gap: '6px',
          }}>
            <span>Anti-magic Wagon</span>
            <span style={{ color: 'var(--gold)', fontSize: '11px' }}>{wagon.costPerWagon}e ea</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
            First N raiders absorb 2 hits each
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            class="ui-btn"
            onClick={() => GameUIStore.requestAttackerWagonAdjust(-1)}
            disabled={wagon.count <= 0}
            style={{
              width: '24px', height: '24px', padding: 0,
              fontSize: '14px', lineHeight: '24px',
              opacity: wagon.count <= 0 ? 0.3 : 1,
            }}
          >−</button>
          <span style={{
            minWidth: '32px', textAlign: 'center',
            fontFamily: "'VT323', ui-monospace, monospace",
            fontSize: '16px', color: wagon.count > 0 ? 'var(--jewel-violet)' : 'var(--text-dim)',
          }}>{wagon.count}/{wagon.max}</span>
          <button
            class="ui-btn"
            onClick={() => GameUIStore.requestAttackerWagonAdjust(+1)}
            disabled={wagon.count >= wagon.max || !wagonAffordOne}
            style={{
              width: '24px', height: '24px', padding: 0,
              fontSize: '14px', lineHeight: '24px',
              opacity: (wagon.count >= wagon.max || !wagonAffordOne) ? 0.3 : 1,
            }}
          >+</button>
        </div>
      </div>

      {/* Ability tray */}
      {abilities.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{
            fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px',
            textTransform: 'uppercase', letterSpacing: '1px',
          }}>Abilities</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {abilities.map(a => {
              const onCd = a.cooldownRemaining > 0;
              return (
                <button
                  key={a.id}
                  class="ui-btn"
                  onClick={() => GameUIStore.requestAttackerAbilityToggle(a.id)}
                  disabled={onCd}
                  title={a.description}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '10px',
                    fontWeight: a.queued ? 'bold' : 'normal',
                    border: a.queued ? '1px solid var(--jewel-teal)' : '1px solid transparent',
                    background: a.queued ? 'rgba(76,200,180,0.18)' : (onCd ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'),
                    color: onCd ? 'var(--text-dim)' : 'var(--text-primary)',
                    opacity: onCd ? 0.5 : 1,
                    position: 'relative',
                  }}
                >
                  <div>{a.label}</div>
                  <div style={{ fontSize: '9px', color: onCd ? '#ff8888' : 'var(--text-dim)' }}>
                    {onCd ? `${a.cooldownRemaining}w` : 'ready'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer — Clear + Send */}
      <div style={{
        display: 'flex', gap: '6px', marginTop: '10px',
      }}>
        <button
          class="ui-btn"
          onClick={() => GameUIStore.requestAttackerClear()}
          disabled={!canSend}
          style={{
            flex: 1, opacity: canSend ? 1 : 0.4,
          }}
        >
          Clear
        </button>
        <button
          class="ui-btn ui-btn-primary"
          onClick={() => GameUIStore.requestAttackerSendWave()}
          disabled={!canSend}
          style={{
            flex: 2, opacity: canSend ? 1 : 0.4,
            fontWeight: 'bold',
            background: canSend ? 'var(--faction-harmonic)' : undefined,
          }}
        >
          Send Wave →
        </button>
      </div>
    </div>
  );
}
