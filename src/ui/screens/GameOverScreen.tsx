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
        <div class="ui-header-title" style={{ color: won ? 'var(--jewel-teal)' : 'var(--jewel-red)' }}>{won ? 'VICTORY!' : 'DEFEAT'}</div>
        <ShardBadge />
      </div>

      {/* Hero numerals — big VT323 stat readout */}
      <div style={{ background: 'linear-gradient(90deg, var(--bg-inset), var(--bg-surface), var(--bg-inset))', padding: '20px', display: 'flex', justifyContent: 'center', gap: '32px', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)' }}>
        <BigStat value={`+${shardsEarned}`} label="Shards" color="var(--gold-bright)" />
        <BigStat value={`Lv.${bpLevel}`} label={`${bpProgress.current}/${bpProgress.required} XP`} color="var(--jewel-violet)" />
        <BigStat value={score.toLocaleString()} label="Score" color="var(--text-primary)" />
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
              <thead><tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={th}>Tower</th><th style={th}>Damage</th><th style={th}>DPS</th><th style={th}>Gold</th><th style={th}>Shots</th><th style={th}>Built</th>
              </tr></thead>
              <tbody>{towerEntries.map(([typeId, ts]) => {
                const name = TOWER_TYPES[typeId]?.name ?? typeId;
                const avgDps = ts.timeAlive > 0 ? Math.round(ts.totalDamage / (ts.timeAlive / 1000)) : 0;
                return (
                  <tr key={typeId} style={{ color: ts.totalDamage > 0 ? 'var(--text-primary)' : 'var(--text-dim)', borderBottom: '1px solid var(--bg-inset)' }}>
                    <td style={td}>{name}</td><td style={tdNum}>{ts.totalDamage.toLocaleString()}</td><td style={tdNum}>{avgDps}/s</td>
                    <td style={tdNum}>{ts.totalGoldEarned > 0 ? `+${ts.totalGoldEarned}g` : '-'}</td><td style={tdNum}>{ts.totalShots}</td><td style={tdNum}>{ts.count}</td>
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
          <div class="ui-section-title" style={{ color: 'var(--faction-psionic)' }}>Hero Performance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px' }}>
            <Stat label="Hero" value={heroStats.heroName} /><Stat label="Kills" value={String(heroStats.kills)} />
            <Stat label="Deaths" value={String(heroStats.deaths)} /><Stat label="Damage" value={heroStats.damageDealt.toLocaleString()} />
          </div>
        </div>
      )}

      {/* Buttons */}
      <div class="ui-section" style={{ display: 'flex', justifyContent: 'center', gap: '12px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <button class="btn btn-gold btn-large" onClick={() => UIBridge.showMenu()}>Play Again</button>
        <button class="btn btn-large" onClick={() => UIBridge.showMenu()}>Menu</button>
        <button class="btn btn-primary" onClick={() => UIBridge.show('store')}>Store</button>
      </div>
    </>
  );
}

function BigStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: 'var(--text-3xl)', color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '6px', padding: '8px', border: '1px solid var(--border-subtle)' }}>
      <div style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '16px', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

const th: Record<string, string> = { textAlign: 'left', padding: '4px 8px', fontWeight: 'normal' };
const td: Record<string, string> = { padding: '4px 8px' };
const tdNum: Record<string, string> = { padding: '4px 8px', textAlign: 'right', fontFamily: "'VT323', ui-monospace, monospace", fontSize: '13px' };
