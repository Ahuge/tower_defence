import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { DraftModifier, getRandomModifiers } from '../../data/DraftModifiers';
import { BattlePass } from '../../systems/monetization';
import { useState } from 'preact/hooks';

interface Props { data: Record<string, unknown>; }

export function DraftScreen({ data }: Props) {
  const [modifiers] = useState(() => getRandomModifiers(3));
  const hasFreeMods = BattlePass.hasPerk('free_modifiers');
  const matchMode = data.mode as string;

  const pick = (mod: DraftModifier | null) => {
    const nextScene = matchMode === 'gauntlet' ? 'GauntletPreviewScene' : 'GameScene';
    UIBridge.startScene(nextScene, { ...data, modifier: mod });
  };

  return (
    <>
      <div class="ui-header">
        <button class="ui-header-back" onClick={() => UIBridge.show('menu')}>{'< Back'}</button>
        <div class="ui-header-title">CHOOSE MODIFIER</div>
        <ShardBadge />
      </div>
      <div class="ui-section" style={{ textAlign: 'center' }}>
        <div class="text-dim text-sm mb-2">{hasFreeMods ? 'Battle Pass: all modifiers unlocked' : 'First modifier free — others require Battle Pass'}</div>
      </div>
      <div class="ui-section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {modifiers.map((mod, i) => {
            const isLocked = i > 0 && !hasFreeMods;
            return (
              <div key={mod.id} class={`card ${isLocked ? 'locked' : ''}`}
                style={{ width: 'min(200px, 100%)', minHeight: '120px', textAlign: 'center', cursor: isLocked ? 'not-allowed' : 'pointer' }}
                onClick={() => !isLocked && pick(mod)}>
                <div class="card-name" style={{ marginTop: '8px', color: isLocked ? 'var(--text-dim)' : 'var(--gold)' }}>{isLocked ? '???' : mod.name}</div>
                <div class="card-desc" style={{ marginTop: '8px', color: isLocked ? 'var(--text-dim)' : 'var(--text-primary)' }}>{isLocked ? '' : mod.description}</div>
                {isLocked && <div style={{ marginTop: '12px', fontSize: '20px', color: 'var(--text-dim)' }}>&#x1f512;</div>}
                {isLocked && <div class="text-pass text-xs" style={{ marginTop: '4px' }}>Battle Pass required</div>}
              </div>
            );
          })}
        </div>
        <div class="text-center mt-4"><button class="btn" onClick={() => pick(null)}>Skip — No modifier</button></div>
      </div>
    </>
  );
}
