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

  const { entries, spent, budget, waveNum, canSend, abilities, wagon, prep } = composer;
  const remaining = budget - spent;
  const wagonAffordOne = remaining >= wagon.costPerWagon;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const isPhone = ResponsiveManager.isPhone();

  // Phone: occupy the sidebar slot (top-left, full width). The sidebar
  // hides its WAVES + ECONOMY panels in attacker mode, so this is the
  // only chrome at the top of the screen — no overlap.
  // Desktop: top-right, fixed 320px width.
  // Phone: top half of the screen. The bottom is the dock/control bar
  // so we hard-cap to 60vh and let inner content scroll. Desktop fits
  // the full overlay because we have more vertical room.
  const positionStyle = isPhone
    ? { left: '8px', right: '8px', top: '8px', maxHeight: '60vh' }
    : { right: '12px', top: '12px', width: '320px', maxHeight: 'calc(100vh - 100px)' };

  return (
    <div
      class="attacker-composer game-panel"
      style={{
        position: 'fixed',
        ...positionStyle,
        zIndex: 120,
        overflowY: 'auto',
        padding: '8px',
        pointerEvents: 'auto',
      }}
    >
      {/* Header — wave + budget bar */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: '3px',
        }}>
          <span style={{
            fontFamily: "'VT323', ui-monospace, monospace",
            fontSize: '15px', fontWeight: 'bold', color: 'var(--gold)',
          }}>
            COMPOSE WAVE {waveNum}
          </span>
          <span style={{
            fontSize: '11px',
            color: remaining < 0 ? '#ff6666' : 'var(--jewel-teal)',
          }}>
            {spent}/{budget} ess
          </span>
        </div>
        <div style={{
          height: '4px', background: 'rgba(255,255,255,0.08)',
          borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: 'linear-gradient(90deg, var(--jewel-teal), var(--jewel-violet))',
            transition: 'width 120ms ease-out',
          }} />
        </div>
        {prep && (
          <div style={{
            marginTop: '4px',
            padding: '3px 6px',
            borderRadius: '3px',
            background: 'rgba(255,100,100,0.12)',
            border: '1px solid rgba(255,100,100,0.35)',
            fontSize: '10px',
            color: '#ffaaaa',
            display: 'flex', justifyContent: 'space-between', gap: '6px',
          }}>
            <span style={{ fontWeight: 'bold' }}>⚠ {prep.label}</span>
            <span style={{ color: 'var(--text-dim)' }}>{prep.description}</span>
          </div>
        )}
      </div>

      {/* Palette cards — compact: name+cost+counter on one row, description hidden */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {entries.map(e => {
          const canAddOne = remaining >= e.cost;
          const countered = e.prepMult < 0.99;
          return (
            <div
              key={e.creepType}
              title={countered
                ? `${e.description} — countered: -${Math.round((1 - e.prepMult) * 100)}% HP this wave`
                : e.description}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '3px 6px', borderRadius: '3px',
                background: e.count > 0 ? 'rgba(212,123,84,0.12)' : 'rgba(255,255,255,0.03)',
                border: e.count > 0
                  ? '1px solid var(--faction-harmonic)'
                  : (countered ? '1px solid rgba(255,100,100,0.4)' : '1px solid transparent'),
                minHeight: '28px',
              }}
            >
              <span style={{
                flex: 1, minWidth: 0,
                fontSize: '12px', fontWeight: 'bold',
                color: countered ? '#ff8888' : 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {e.label}
                {countered && (
                  <span style={{
                    marginLeft: '4px', fontSize: '9px', fontWeight: 'normal',
                    color: '#ff6666',
                  }}>
                    −{Math.round((1 - e.prepMult) * 100)}%
                  </span>
                )}
              </span>
              <span style={{ color: 'var(--gold)', fontSize: '11px' }}>{e.cost}e</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  class="ui-btn"
                  onClick={() => GameUIStore.requestAttackerAdjust(e.creepType, -1)}
                  disabled={e.count <= 0}
                  style={{
                    width: '22px', height: '22px', padding: 0,
                    fontSize: '13px', lineHeight: '22px',
                    opacity: e.count <= 0 ? 0.3 : 1,
                  }}
                >−</button>
                <span style={{
                  minWidth: '20px', textAlign: 'center',
                  fontFamily: "'VT323', ui-monospace, monospace",
                  fontSize: '14px', color: e.count > 0 ? 'var(--gold)' : 'var(--text-dim)',
                }}>{e.count}</span>
                <button
                  class="ui-btn"
                  onClick={() => GameUIStore.requestAttackerAdjust(e.creepType, +1)}
                  disabled={!canAddOne}
                  style={{
                    width: '22px', height: '22px', padding: 0,
                    fontSize: '13px', lineHeight: '22px',
                    opacity: canAddOne ? 1 : 0.3,
                  }}
                >+</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Anti-magic Wagon spinner — compact single row */}
      <div
        title="First N raiders absorb 2 defender hits each"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginTop: '6px', padding: '3px 6px',
          background: wagon.count > 0 ? 'rgba(139,107,199,0.15)' : 'rgba(255,255,255,0.03)',
          border: wagon.count > 0 ? '1px solid var(--jewel-violet)' : '1px solid transparent',
          borderRadius: '3px',
          minHeight: '28px',
        }}
      >
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          Anti-magic Wagon
        </span>
        <span style={{ color: 'var(--gold)', fontSize: '11px' }}>{wagon.costPerWagon}e</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            class="ui-btn"
            onClick={() => GameUIStore.requestAttackerWagonAdjust(-1)}
            disabled={wagon.count <= 0}
            style={{
              width: '22px', height: '22px', padding: 0,
              fontSize: '13px', lineHeight: '22px',
              opacity: wagon.count <= 0 ? 0.3 : 1,
            }}
          >−</button>
          <span style={{
            minWidth: '28px', textAlign: 'center',
            fontFamily: "'VT323', ui-monospace, monospace",
            fontSize: '14px', color: wagon.count > 0 ? 'var(--jewel-violet)' : 'var(--text-dim)',
          }}>{wagon.count}/{wagon.max}</span>
          <button
            class="ui-btn"
            onClick={() => GameUIStore.requestAttackerWagonAdjust(+1)}
            disabled={wagon.count >= wagon.max || !wagonAffordOne}
            style={{
              width: '22px', height: '22px', padding: 0,
              fontSize: '13px', lineHeight: '22px',
              opacity: (wagon.count >= wagon.max || !wagonAffordOne) ? 0.3 : 1,
            }}
          >+</button>
        </div>
      </div>

      {/* Ability tray — compact single row */}
      {abilities.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', gap: '3px' }}>
          {abilities.map(a => {
            const onCd = a.cooldownRemaining > 0;
            return (
              <button
                key={a.id}
                class="ui-btn"
                onClick={() => GameUIStore.requestAttackerAbilityToggle(a.id)}
                disabled={onCd}
                title={`${a.label}: ${a.description}`}
                style={{
                  flex: 1,
                  padding: '4px 2px',
                  fontSize: '10px',
                  lineHeight: '1.1',
                  fontWeight: a.queued ? 'bold' : 'normal',
                  border: a.queued ? '1px solid var(--jewel-teal)' : '1px solid transparent',
                  background: a.queued ? 'rgba(76,200,180,0.18)' : (onCd ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'),
                  color: onCd ? 'var(--text-dim)' : 'var(--text-primary)',
                  opacity: onCd ? 0.5 : 1,
                  minHeight: '32px',
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
      )}

      {/* Footer — Clear + Send */}
      <div style={{
        display: 'flex', gap: '6px', marginTop: '8px',
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
