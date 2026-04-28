import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { Header } from '../components/Header';
import { FACTIONS, FACTION_ORDER, FactionId } from '../../data/Factions';

function hexColor(n: number): string { return '#' + n.toString(16).padStart(6, '0'); }

interface Props { data: Record<string, unknown>; }

export function CreepFactionSelectScreen({ data }: Props) {
  // Skip both meta-factions: 'random' is a UI picker token (no creep
  // identity), and 'chaos' is the rotating-pool meta-faction with no
  // fixed creep sprite atlas. If chaos was offered as a creep type
  // the renderer fell back to red-circle stubs because no sprite
  // sheet got preloaded.
  const playable = FACTION_ORDER.filter(f => f !== 'chaos' && f !== 'random');

  const pick = (creepFaction: FactionId) => {
    UIBridge.showDraft({ ...data, creepFaction });
  };

  const pickRandom = () => {
    const f = playable[Math.floor(Math.random() * playable.length)];
    pick(f);
  };

  return (
    <>
      <Header title="CHOOSE ENEMY" titleStyle={{ color: '#ff4444' }} back={() => UIBridge.showFactionSelect(data)} rightContent={<ShardBadge />} />

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
