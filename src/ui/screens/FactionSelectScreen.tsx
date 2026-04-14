import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { FACTION_ORDER, FACTIONS, FactionId } from '../../data/Factions';
import { TOWER_TYPES } from '../../data/TowerTypes';
import { MatchMode } from '../../data/WaveDefinitions';
import { PlayerInventory, ShardWallet, FACTION_UNLOCK_COST } from '../../systems/monetization';
import { useState } from 'preact/hooks';

function hexColor(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

interface Props { data: Record<string, unknown>; }

export function FactionSelectScreen({ data }: Props) {
  const mode = (data.mode as MatchMode) ?? 'standard';
  const [, setTick] = useState(0);
  const rerender = () => setTick(t => t + 1);

  const selectFaction = (factionId: FactionId) => {
    const passData = { mode, faction: factionId, map: data.map, difficulty: data.difficulty, randomSeed: data.randomSeed, dailySeed: data.dailySeed, customMapDef: data.customMapDef, waveCount: data.waveCount };
    if (mode === 'hero_defense') { UIBridge.startScene('HeroSelectScene', passData); }
    else if (mode === 'gauntlet' || mode === 'endless') {
      const playable = FACTION_ORDER.filter(f => f !== 'random');
      const randomCreep = playable[Math.floor(Math.random() * playable.length)];
      UIBridge.showDraft({ ...passData, creepFaction: mode === 'endless' ? randomCreep : undefined });
    } else { UIBridge.startScene('CreepFactionSelectScene', passData); }
  };

  return (
    <>
      <div class="ui-header">
        <button class="ui-header-back" onClick={() => UIBridge.show('menu')}>{'< Back'}</button>
        <div class="ui-header-title">CHOOSE FACTION</div>
        <ShardBadge />
      </div>
      <div class="ui-section">
        <div class="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {FACTION_ORDER.map(factionId => {
            const faction = FACTIONS[factionId];
            const isLocked = !PlayerInventory.ownsFaction(factionId);
            const isRandom = factionId === 'random';
            const color = hexColor(faction.primaryColor);
            return (
              <div key={factionId} class={`card ${isLocked ? 'locked' : ''}`} style={{ minHeight: '160px' }}
                onClick={() => isLocked
                  ? (ShardWallet.canAfford(FACTION_UNLOCK_COST) && PlayerInventory.unlockFaction(factionId) && rerender())
                  : selectFaction(factionId)}>
                <div class="card-accent" style={{ background: color }} />
                <div class="card-name" style={{ marginTop: '6px', color: isRandom ? '#ff44ff' : '#fff' }}>{faction.name}</div>
                <div class="text-dim text-xs" style={{ marginBottom: '4px' }}>{isRandom ? '6 / wave' : `${faction.towerIds.length} towers`}</div>
                <div class="card-desc">{faction.description}</div>
                {!isRandom && !isLocked && (
                  <div style={{ marginTop: '8px', fontSize: '10px', lineHeight: '1.6' }}>
                    {faction.towerIds.map(tid => { const t = TOWER_TYPES[tid]; return t ? <div key={tid} style={{ color: '#999' }}>{t.name} <span style={{ color: '#666' }}>({t.cost}g)</span></div> : null; })}
                  </div>
                )}
                {isRandom && <div style={{ marginTop: '8px', fontSize: '10px', color: '#999', lineHeight: '1.5' }}>Each wave: 6 random towers from all factions. Bought towers persist.</div>}
                {isLocked && (
                  <div class="lock-overlay">
                    <div class="lock-icon">LOCKED</div>
                    <div class="lock-cost">{ShardWallet.canAfford(FACTION_UNLOCK_COST) ? `Tap to unlock — ${FACTION_UNLOCK_COST} Shards` : `${FACTION_UNLOCK_COST} Shards (have ${ShardWallet.getBalance()})`}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
