import { useState, useEffect } from 'preact/hooks';
import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
import { Header } from '../components/Header';
import { LeaderboardAPI, LeaderboardEntry } from '../../systems/LeaderboardAPI';

export function LeaderboardScreen() {
  const [scores, setScores] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    LeaderboardAPI.getScores('endless', 50)
      .then(setScores)
      .catch(() => setError(true));
  }, []);

  return (
    <>
      <Header title="LEADERBOARD" back={() => UIBridge.show('menu')} rightContent={<ShardBadge />} />

      <div class="ui-section">
        <div class="text-dim text-sm text-center mb-2">Endless Mode — Top 50</div>

        {!scores && !error && (
          <div class="text-dim text-center" style={{ padding: '40px 0' }}>Loading scores...</div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--jewel-red)' }}>
            Failed to load leaderboard. Check your connection.
          </div>
        )}

        {scores && scores.length === 0 && (
          <div class="text-dim text-center" style={{ padding: '40px 0' }}>No scores yet. Be the first!</div>
        )}

        {scores && scores.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={th}>#</th>
                  <th style={th}>Name</th>
                  <th style={thNum}>Wave</th>
                  <th style={th}>Faction</th>
                  <th style={th}>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((entry, i) => {
                  const rank = i + 1;
                  const color = rank <= 3 ? 'var(--gold)' : 'var(--text-primary)';
                  const rankStr = rank <= 3 ? ['1st', '2nd', '3rd'][rank - 1] : `${rank}.`;
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--bg-inset)', color }}>
                      <td style={td}>{rankStr}</td>
                      <td style={td} title={entry.name}>{entry.name.length > 16 ? entry.name.slice(0, 15) + '...' : entry.name}</td>
                      <td style={tdNum}>Wave {entry.wave}</td>
                      <td style={td}>{entry.faction}</td>
                      <td style={td}>{entry.difficulty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const th: Record<string, string> = { textAlign: 'left', padding: '6px 10px', fontWeight: 'normal', color: 'var(--text-muted)' };
const thNum: Record<string, string> = { textAlign: 'right', padding: '6px 10px', fontWeight: 'normal', color: 'var(--text-muted)' };
const td: Record<string, string> = { padding: '6px 10px' };
const tdNum: Record<string, string> = { padding: '6px 10px', textAlign: 'right', fontFamily: "'VT323', ui-monospace, monospace", fontSize: '14px' };
