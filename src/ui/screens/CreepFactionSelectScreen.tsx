import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { FACTIONS, FACTION_ORDER, FactionId } from '../../data/Factions';

function hexColor(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

interface Props { data: Record<string, unknown>; }

export function CreepFactionSelectScreen({ data }: Props) {
  const playable = FACTION_ORDER.filter(f => f !== 'random');

  const pick = (creepFaction: FactionId) => {
    UIBridge.showDraft({ ...data, creepFaction });
  };

  const pickRandom = () => {
    const f = playable[Math.floor(Math.random() * playable.length)];
    pick(f);
  };

  return (
    <>
      <div class="ui-header">
        <button class="ui-header-back" onClick={() => UIBridge.showFactionSelect(data)}>{'< Back'}</button>
        <div class="ui-header-title" style={{ color: '#ff4444' }}>CHOOSE ENEMY</div>
        <ShardBadge />
      </div>

      <div class="ui-section" style={{ textAlign: 'center' }}>
        <div class="text-dim text-sm mb-2">Which faction's creatures will you face?</div>
        <button class="btn" style={{ color: '#ff44ff', borderColor: '#ff44ff' }} onClick={pickRandom}>
          Random Enemy
        </button>
      </div>

      <div class="ui-section" style={{ paddingTop: 0 }}>
        <div class="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {playable.map(fid => {
            const faction = FACTIONS[fid];
            const color = hexColor(faction.primaryColor);
            return (
              <div key={fid} class="card" style={{ textAlign: 'center', padding: '10px' }} onClick={() => pick(fid)}>
                <div class="card-accent" style={{ background: color }} />
                <div class="card-name" style={{ marginTop: '4px' }}>{faction.name}</div>
                <div class="card-desc">{faction.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
