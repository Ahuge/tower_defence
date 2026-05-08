import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { Header } from '../components/Header';
import { TOWER_TYPES } from '../../data/TowerTypes';
import { ShardWallet, BattlePass } from '../../systems/monetization';
import { GameStats } from '../../systems/StatsTracker';
import { platformBridge } from '../../systems/platform';
import { FACTIONS, FactionId } from '../../data/Factions';
import { CoopPlayerStats } from '../../scenes/GameOverScene';
import { isCaptureEnabled, getStats as getCaptureStats, downloadJSONL as downloadCapture } from '../../systems/learning/LiveCapture';

interface Props { data: Record<string, unknown>; }

/**
 * Show a post-match interstitial before leaving the game-over screen.
 * The bridge short-circuits to 'disabled' when the ad-free IAP is
 * owned and to 'unavailable' on web / unfilled inventory — in every
 * non-'shown' case we fall through to the navigation immediately so
 * a missing ad never blocks the user from getting back to the menu.
 *
 * When the player already watched a continue-ad to try to revive
 * (and then still lost), skip this interstitial — two ads back-to-
 * back is the kind of user-hostile pattern our ad-strategy doc
 * explicitly rules out.
 */
function leaveViaInterstitial(next: () => void, skip: boolean): void {
  if (skip) { next(); return; }
  platformBridge().ads.showInterstitial('game_over').finally(next);
}

const MODE_DISPLAY: Record<string, string> = {
  standard: 'Standard',
  battle: 'Essence',
  hero_defense: 'Hero Defense',
  gauntlet: 'Gauntlet',
  endless: 'Endless',
};

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
  const continueAdShown = data.continueAdShown === true;
  const coopPlayers = data.coopPlayers as CoopPlayerStats[] | undefined;

  const score = wave * 100 + creepsKilled * 2 + (won ? 1000 : 0) + gold;
  const gameTime = stats ? Math.round(stats.gameTimeMs / 1000) : 0;
  const minutes = Math.floor(gameTime / 60);
  const seconds = gameTime % 60;
  const bpLevel = BattlePass.getLevel();
  const bpProgress = BattlePass.getLevelProgress();

  const towerEntries = stats ? Object.entries(stats.towerStats).sort(([, a], [, b]) => b.totalDamage - a.totalDamage) : [];
  const totalDamage = towerEntries.reduce((sum, [, ts]) => sum + ts.totalDamage, 0);
  const totalTowerGold = towerEntries.reduce((sum, [, ts]) => sum + ts.totalGoldEarned, 0);

  // Economy derived stats
  const frontierROI = stats && stats.frontierSpent > 0
    ? ((stats.frontierEarned / stats.frontierSpent) * 100).toFixed(0)
    : null;
  // Sends ROI uses sendsEarned (cumulative gold paid out from per-
  // wave send bonuses) ÷ sendsSpent. sendsIncome is the +g/wave RATE
  // and is shown separately as a dial of ongoing flow at game end.
  const sendsROI = stats && stats.sendsSpent > 0
    ? ((stats.sendsEarned / stats.sendsSpent) * 100).toFixed(0)
    : null;
  const hasFrontier = stats && (stats.frontierSpent > 0 || stats.frontierEarned > 0);
  const hasSends = stats && (stats.sendsSpent > 0 || stats.sendsIncome > 0);

  return (
    <>
      <Header title={won ? 'VICTORY!' : 'DEFEAT'} titleStyle={{ color: won ? 'var(--jewel-teal)' : 'var(--jewel-red)' }} rightContent={<ShardBadge />} />

      {/* Hero numerals — big VT323 stat readout */}
      <div style={{ background: 'linear-gradient(90deg, var(--bg-inset), var(--bg-surface), var(--bg-inset))', padding: '20px', display: 'flex', justifyContent: 'center', gap: '32px', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)' }}>
        <BigStat value={`+${shardsEarned}`} label="Shards" color="var(--gold-bright)" />
        <BigStat value={`Lv.${bpLevel}`} label={`${bpProgress.current}/${bpProgress.required} XP`} color="var(--jewel-violet)" />
        <BigStat value={score.toLocaleString()} label="Score" color="var(--text-primary)" />
      </div>

      {/* Overview */}
      <div class="ui-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', textAlign: 'center' }}>
          <Stat label="Mode" value={`${MODE_DISPLAY[matchMode] ?? matchMode}${faction ? ` (${faction})` : ''}`} />
          <Stat label="Waves" value={matchMode === 'endless' || totalWaves > 200 ? `Survived ${wave}` : `${wave}/${totalWaves}`} />
          <Stat label="Time" value={`${minutes}m ${seconds}s`} />
          <Stat label="Killed" value={creepsKilled.toLocaleString()} />
          <Stat label="Leaked" value={String(stats?.creepsLeaked ?? 0)} />
          <Stat label="Towers" value={String(towersBuilt)} />
          <Stat label="Gold Left" value={String(gold)} />
        </div>
      </div>

      {/* Circle Co-op per-player performance */}
      {coopPlayers && coopPlayers.length > 0 && (
        <div class="ui-section" style={{ paddingTop: 0 }}>
          <div class="ui-section-title" style={{ color: 'var(--jewel-teal)' }}>Team Performance</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: 'auto', minWidth: '100%' }}>
              <thead><tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={th}>Player</th>
                <th style={th}>Faction</th>
                <th style={thR}>Kills</th>
                <th style={thR}>%</th>
                <th style={thR}>Towers</th>
                <th style={thR}>Gold Left</th>
              </tr></thead>
              <tbody>{(() => {
                const totalKills = coopPlayers.reduce((s, p) => s + p.kills, 0);
                const sorted = [...coopPlayers].sort((a, b) => b.kills - a.kills);
                return sorted.map(p => {
                  const factionDef = FACTIONS[p.faction as FactionId];
                  const facColor = factionDef ? '#' + factionDef.primaryColor.toString(16).padStart(6, '0') : 'var(--text-primary)';
                  const pct = totalKills > 0 ? ((p.kills / totalKills) * 100).toFixed(0) : '0';
                  const label = p.isLocal ? `P${p.playerIndex} (you)` : p.isBot ? `P${p.playerIndex} [CPU]` : `P${p.playerIndex}`;
                  return (
                    <tr key={p.playerIndex} style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--bg-inset)', fontWeight: p.isLocal ? 'bold' : 'normal' }}>
                      <td style={td}>{label}</td>
                      <td style={{ ...td, color: facColor }}>{factionDef?.name ?? p.faction}</td>
                      <td style={tdNum}>{p.kills.toLocaleString()}</td>
                      <td style={{ ...tdNum, color: 'var(--text-muted)' }}>{pct}%</td>
                      <td style={tdNum}>{p.towersBuilt}</td>
                      <td style={{ ...tdNum, color: p.goldRemaining > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
                        {p.goldRemaining > 0 ? `${p.goldRemaining}g` : (p.isBot || p.isLocal ? '0g' : '—')}
                      </td>
                    </tr>
                  );
                });
              })()}</tbody>
            </table>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>
            Gold Left shows 0 / — for remote humans because their economy isn't synced — local player and CPUs are authoritative.
          </div>
        </div>
      )}

      {/* Economy Breakdown */}
      {stats && (
        <div class="ui-section" style={{ paddingTop: 0 }}>
          <div class="ui-section-title" style={{ color: 'var(--jewel-amber)' }}>Economy</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', textAlign: 'center' }}>
            <Stat label="Total Earned" value={`${stats.totalGoldEarned.toLocaleString()}g`} color="var(--jewel-teal)" />
            <Stat label="Total Spent" value={`${stats.totalGoldSpent.toLocaleString()}g`} color="var(--jewel-red)" />
            {hasFrontier && <Stat label="Frontier Invested" value={`${stats.frontierSpent.toLocaleString()}g`} />}
            {hasFrontier && <Stat label="Frontier Returned" value={`${stats.frontierEarned.toLocaleString()}g`} color="var(--jewel-teal)" />}
            {frontierROI && <Stat label="Frontier ROI" value={`${frontierROI}%`} color={Number(frontierROI) >= 100 ? 'var(--jewel-teal)' : 'var(--jewel-red)'} />}
            {hasSends && <Stat label="Sends Spent" value={`${stats.sendsSpent.toLocaleString()}g`} />}
            {hasSends && <Stat label="Sends Earned" value={`${stats.sendsEarned.toLocaleString()}g`} color="var(--jewel-teal)" />}
            {sendsROI && <Stat label="Sends ROI" value={`${sendsROI}%`} color={Number(sendsROI) >= 100 ? 'var(--jewel-teal)' : 'var(--jewel-red)'} />}
            {hasSends && <Stat label="Send Income" value={`+${stats.sendsIncome.toLocaleString()}g/w`} color="var(--jewel-teal)" />}
            {totalTowerGold > 0 && <Stat label="Tower Gold" value={`+${totalTowerGold.toLocaleString()}g`} color="var(--gold)" />}
            {stats.essenceGeneratorsBuilt > 0 && <Stat label="Generators Built" value={String(stats.essenceGeneratorsBuilt)} color="#44ddff" />}
            {stats.essenceGenerated > 0 && <Stat label="Essence Generated" value={`${Math.floor(stats.essenceGenerated)}e`} color="#44ddff" />}
            {stats.essenceSpentOnSends > 0 && <Stat label="Essence on Sends" value={`${Math.floor(stats.essenceSpentOnSends)}e`} />}
          </div>
        </div>
      )}

      {/* Tower Performance */}
      {towerEntries.length > 0 && (
        <div class="ui-section" style={{ paddingTop: 0 }}>
          <div class="ui-section-title">Tower Performance</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: 'auto', minWidth: '100%' }}>
              <thead><tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={th}>Tower</th>
                <th style={thR}>Damage</th>
                <th style={thR}>%</th>
                <th style={thR}>DPS</th>
                <th style={thR}>Kills</th>
                <th style={thR}>Gold</th>
                <th style={thR}>Shots</th>
                <th style={thR}>Built</th>
              </tr></thead>
              <tbody>{towerEntries.map(([typeId, ts]) => {
                const name = TOWER_TYPES[typeId]?.name ?? typeId;
                const avgDps = ts.timeAlive > 0 ? Math.round(ts.totalDamage / (ts.timeAlive / 1000)) : 0;
                const dmgPct = totalDamage > 0 ? ((ts.totalDamage / totalDamage) * 100).toFixed(1) : '0';
                const dim = ts.totalDamage === 0;
                return (
                  <tr key={typeId} style={{ color: dim ? 'var(--text-dim)' : 'var(--text-primary)', borderBottom: '1px solid var(--bg-inset)' }}>
                    <td style={td}>{name}</td>
                    <td style={tdNum}>{ts.totalDamage.toLocaleString()}</td>
                    <td style={{ ...tdNum, color: dim ? 'var(--text-dim)' : 'var(--text-muted)' }}>{dmgPct}%</td>
                    <td style={tdNum}>{avgDps}/s</td>
                    <td style={tdNum}>{ts.totalKills > 0 ? ts.totalKills.toLocaleString() : '-'}</td>
                    <td style={{ ...tdNum, color: ts.totalGoldEarned > 0 ? 'var(--gold)' : undefined }}>{ts.totalGoldEarned > 0 ? `+${ts.totalGoldEarned.toLocaleString()}g` : '-'}</td>
                    <td style={tdNum}>{ts.totalShots.toLocaleString()}</td>
                    <td style={tdNum}>{ts.count}</td>
                  </tr>
                );
              })}</tbody>
              {towerEntries.length > 1 && (
                <tfoot><tr style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', fontWeight: 'bold' }}>
                  <td style={td}>Total</td>
                  <td style={tdNum}>{totalDamage.toLocaleString()}</td>
                  <td style={tdNum}>100%</td>
                  <td style={tdNum} />
                  <td style={tdNum}>{towerEntries.reduce((s, [, ts]) => s + ts.totalKills, 0).toLocaleString()}</td>
                  <td style={{ ...tdNum, color: totalTowerGold > 0 ? 'var(--gold)' : undefined }}>{totalTowerGold > 0 ? `+${totalTowerGold.toLocaleString()}g` : '-'}</td>
                  <td style={tdNum}>{towerEntries.reduce((s, [, ts]) => s + ts.totalShots, 0).toLocaleString()}</td>
                  <td style={tdNum}>{towerEntries.reduce((s, [, ts]) => s + ts.count, 0)}</td>
                </tr></tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Hero stats */}
      {heroStats && (
        <div class="ui-section" style={{ paddingTop: 0 }}>
          <div class="ui-section-title" style={{ color: 'var(--faction-psionic)' }}>Hero: {heroStats.heroName}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', textAlign: 'center' }}>
            <Stat label="Kills" value={String(heroStats.kills)} color="var(--jewel-teal)" />
            <Stat label="Deaths" value={String(heroStats.deaths)} color={heroStats.deaths > 0 ? 'var(--jewel-red)' : undefined} />
            <Stat label="Damage" value={heroStats.damageDealt.toLocaleString()} />
            <Stat label="Abilities Used" value={String(heroStats.abilitiesUsed)} />
          </div>
        </div>
      )}

      {/* v6.1: capture export prompt — only when training-data capture
          is on and at least one match is recorded. Smart-tagged filename
          (faction / difficulty / outcome / wave) makes it trivial for
          the training pipeline to ingest without manual rename. */}
      <CaptureExportPrompt
        captureEnabled={isCaptureEnabled()}
        faction={faction}
        difficulty={data.difficulty as string | undefined}
        won={won}
        waveReached={wave}
      />

      {/* Buttons */}
      <div class="ui-section" style={{ display: 'flex', justifyContent: 'center', gap: '12px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <button class="btn btn-gold btn-large" onClick={() => leaveViaInterstitial(() => UIBridge.showMenu(), continueAdShown)}>Play Again</button>
        <button class="btn btn-large" onClick={() => leaveViaInterstitial(() => UIBridge.showMenu(), continueAdShown)}>Menu</button>
        <button class="btn btn-primary" onClick={() => UIBridge.show('store')}>Store</button>
      </div>
    </>
  );
}

/** v6.1: shown on the GameOverScreen when training-data capture is
 *  on and at least one match is in the buffer. Lets the player save
 *  their just-finished match with a smart filename so the training
 *  pipeline can ingest without manual renaming. The capture buffer
 *  isn't cleared on save; player can keep recording further matches
 *  and batch-download from Settings → Training Data. */
function CaptureExportPrompt({
  captureEnabled, faction, difficulty, won, waveReached,
}: {
  captureEnabled: boolean;
  faction: string | null;
  difficulty: string | undefined;
  won: boolean;
  waveReached: number;
}) {
  if (!captureEnabled) return null;
  const stats = getCaptureStats();
  if (stats.matches === 0) return null;

  const onSave = () => {
    const date = new Date().toISOString().slice(0, 10);
    const factionTag = faction ?? 'unknown';
    const diffTag = difficulty ?? 'normal';
    const outcomeTag = won ? 'win' : 'loss';
    const waveTag = `w${waveReached}`;
    const filename = `human_${factionTag}_${diffTag}_${outcomeTag}_${waveTag}_${date}.jsonl`;
    downloadCapture(filename);
  };

  return (
    <div class="ui-section" style={{ paddingBottom: '12px', textAlign: 'center' }}>
      <div class="text-dim text-sm" style={{ marginBottom: '6px' }}>
        🎙️ Recording on — {stats.matches} match{stats.matches === 1 ? '' : 'es'} captured
      </div>
      <button class="btn btn-primary" onClick={onSave}>Save Recording</button>
    </div>
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

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '6px', padding: '8px', border: '1px solid var(--border-subtle)' }}>
      <div style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '16px', color: color ?? 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

const th: Record<string, string> = { textAlign: 'left', padding: '6px 10px', fontWeight: 'normal', whiteSpace: 'nowrap' };
const thR: Record<string, string> = { ...th, textAlign: 'right' };
const td: Record<string, string> = { padding: '6px 10px', whiteSpace: 'nowrap' };
const tdNum: Record<string, string> = { padding: '6px 10px', textAlign: 'right', fontFamily: "'VT323', ui-monospace, monospace", fontSize: '15px', whiteSpace: 'nowrap' };
