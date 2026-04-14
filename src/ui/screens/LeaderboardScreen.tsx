import { useState, useEffect } from 'preact/hooks';
import { UIBridge } from '../UIBridge';
import { ShardBadge } from '../components/ShardBadge';
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
      <div class="ui-header">
        <button class="ui-header-back" onClick={() => UIBridge.show('menu')}>{'< Back'}</button>
        <div class="ui-header-title" style={{ color: '#ffcc44' }}>LEADERBOARD</div>
        <ShardBadge />
      </div>

      <div class="ui-section">
        <div class="text-dim text-sm text-center mb-2">Endless Mode — Top 50</div>

        {!scores && !error && (
          <div class="text-dim text-center" style={{ padding: '40px 0' }}>Loading scores...</div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#ff4444' }}>
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
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={th}>#</th>
                  <th style={th}>Name</th>
                  <th style={th}>Wave</th>
                  <th style={th}>Faction</th>
                  <th style={th}>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((entry, i) => {
                  const rank = i + 1;
                  const color = rank <= 3 ? '#ffaa44' : '#ccc';
                  const rankStr = rank <= 3 ? ['1st', '2nd', '3rd'][rank - 1] : `${rank}.`;
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #1a1a28', color }}>
                      <td style={td}>{rankStr}</td>
                      <td style={td}>{entry.name.length > 16 ? entry.name.slice(0, 15) + '...' : entry.name}</td>
                      <td style={td}>Wave {entry.wave}</td>
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

const th: Record<string, string> = { textAlign: 'left', padding: '6px 10px', fontWeight: 'normal', color: '#666' };
const td: Record<string, string> = { padding: '6px 10px' };
