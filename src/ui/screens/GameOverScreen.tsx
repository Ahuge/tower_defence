import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { TOWER_TYPES } from '../../data/TowerTypes';
import { ShardWallet, BattlePass } from '../../systems/monetization';
import { GameStats } from '../../systems/StatsTracker';

interface Props { data: Record<string, unknown>; }

export function GameOverScreen({ data }: Props) {
  const won = data.won as boolean;
  const wave = data.wave as number;
  const totalWaves = data.totalWaves as number;
  const gold = data.gold as number;
  const towersBuilt = data.towersBuilt as number;
  const creepsKilled = data.creepsKilled as number;
  const matchMode = data.matchMode as string;
  const faction = data.faction as string | null;
  const stats = data.stats as GameStats | undefined;
  const heroStats = data.heroStats as { kills: number; deaths: number; damageDealt: number; abilitiesUsed: number; heroName: string } | null;
  const shardsEarned = data.shardsEarned as number;

  const score = wave * 100 + creepsKilled * 2 + (won ? 1000 : 0) + gold;
  const gameTime = stats ? Math.round(stats.gameTimeMs / 1000) : 0;
  const minutes = Math.floor(gameTime / 60);
  const seconds = gameTime % 60;
  const bpLevel = BattlePass.getLevel();
  const bpProgress = BattlePass.getLevelProgress();

  const towerEntries = stats ? Object.entries(stats.towerStats).sort(([, a], [, b]) => b.totalDamage - a.totalDamage) : [];

  return (
    <>
      <div class="ui-header">
        <div class="ui-header-title" style={{ color: won ? '#44ff44' : '#ff4444' }}>{won ? 'VICTORY!' : 'DEFEAT'}</div>
        <ShardBadge />
      </div>
      {/* Earnings banner */}
      <div style={{ background: 'linear-gradient(90deg, #2a2010, #1a1520)', padding: '10px 20px', display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'center', borderBottom: '1px solid #333' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', color: '#ffcc44', fontWeight: 'bold' }}>+{shardsEarned}</div><div class="text-dim text-xs">Shards</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '14px', color: '#aa88ff' }}>Lv.{bpLevel}</div><div class="text-dim text-xs">{bpProgress.current}/{bpProgress.required} XP</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: '14px', color: '#fff' }}>{score.toLocaleString()}</div><div class="text-dim text-xs">Score</div></div>
      </div>
      {/* Overview */}
      <div class="ui-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', textAlign: 'center' }}>
          <Stat label="Mode" value={`${matchMode}${faction ? ` (${faction})` : ''}`} />
          <Stat label="Waves" value={matchMode === 'endless' || totalWaves > 200 ? `Survived ${wave}` : `${wave}/${totalWaves}`} />
          <Stat label="Time" value={`${minutes}m ${seconds}s`} />
          <Stat label="Killed" value={creepsKilled.toLocaleString()} />
          <Stat label="Leaked" value={String(stats?.creepsLeaked ?? 0)} />
          <Stat label="Towers" value={String(towersBuilt)} />
          <Stat label="Gold Left" value={String(gold)} />
        </div>
      </div>
      {/* Tower Performance */}
      {towerEntries.length > 0 && (
        <div class="ui-section">
          <div class="ui-section-title">Tower Performance</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead><tr style={{ color: '#888', borderBottom: '1px solid #333' }}>
                <th style={th}>Tower</th><th style={th}>Damage</th><th style={th}>DPS</th><th style={th}>Gold</th><th style={th}>Shots</th><th style={th}>Built</th>
              </tr></thead>
              <tbody>{towerEntries.map(([typeId, ts]) => {
                const name = TOWER_TYPES[typeId]?.name ?? typeId;
                const avgDps = ts.timeAlive > 0 ? Math.round(ts.totalDamage / (ts.timeAlive / 1000)) : 0;
                return (
                  <tr key={typeId} style={{ color: ts.totalDamage > 0 ? '#ccc' : '#555', borderBottom: '1px solid #1a1a28' }}>
                    <td style={td}>{name}</td><td style={td}>{ts.totalDamage.toLocaleString()}</td><td style={td}>{avgDps}/s</td>
                    <td style={td}>{ts.totalGoldEarned > 0 ? `+${ts.totalGoldEarned}g` : '-'}</td><td style={td}>{ts.totalShots}</td><td style={td}>{ts.count}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}
      {/* Hero stats */}
      {heroStats && (
        <div class="ui-section">
          <div class="ui-section-title" style={{ color: '#ff44aa' }}>Hero Performance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px' }}>
            <Stat label="Hero" value={heroStats.heroName} /><Stat label="Kills" value={String(heroStats.kills)} />
            <Stat label="Deaths" value={String(heroStats.deaths)} /><Stat label="Damage" value={heroStats.damageDealt.toLocaleString()} />
          </div>
        </div>
      )}
      {/* Buttons */}
      <div class="ui-section" style={{ display: 'flex', justifyContent: 'center', gap: '12px', paddingBottom: '24px' }}>
        <button class="btn btn-gold btn-large" onClick={() => UIBridge.showMenu()}>Play Again</button>
        <button class="btn btn-large" onClick={() => UIBridge.showMenu()}>Menu</button>
        <button class="btn btn-primary" onClick={() => UIBridge.show('store')}>Store</button>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={{ background: 'var(--bg-card)', borderRadius: '6px', padding: '8px' }}><div style={{ fontSize: '13px', color: '#fff' }}>{value}</div><div class="text-dim text-xs">{label}</div></div>;
}

const th: Record<string, string> = { textAlign: 'left', padding: '4px 8px', fontWeight: 'normal' };
const td: Record<string, string> = { padding: '4px 8px' };
