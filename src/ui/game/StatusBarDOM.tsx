/**
 * StatusBarDOM — game status bar + control buttons.
 * Shows gold, lives, wave, income, speed. Start wave + speed buttons.
 */
import { useGameUI } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';

export function StatusBarDOM() {
  const { active, gold, lives, currentWave, totalWaves, income, speed, waveActive, betweenWaves, autoPlay, versusTimer } = useGameUI();

  if (!active) return null;

  const canStartWave = betweenWaves && (totalWaves === 0 || currentWave < totalWaves) && lives > 0;
  const speedColors: Record<number, string> = { 0: '#c53d4a', 0.5: '#d98a2b', 1: '#b8a8b8', 1.5: '#cccc44', 2: '#e8b76d', 3: '#d98a2b' };
  const speedColor = speedColors[speed] ?? '#aaa';

  return (
    <div class="status-bar">
      {/* Stats */}
      <div class="status-stats">
        <span class="status-gold">Gold: {Math.floor(gold)}</span>
        <span class="status-lives">{lives > 0 ? `Lives: ${lives}` : 'DEAD'}</span>
        <span class="status-wave">Wave: {currentWave}{totalWaves > 0 ? `/${totalWaves}` : ''}</span>
        <span class="status-income" style={{ color: '#88ff88' }}>+{income}/w</span>
      </div>

      {/* Controls */}
      <div class="status-controls">
        {canStartWave && (
          <button class="status-btn status-btn-wave" onClick={() => GameUIStore.requestStartWave()}>
            {versusTimer >= 0 ? `Ready (${versusTimer}s)` : '▶ Next Wave'}
          </button>
        )}
        {waveActive && (
          <span class="status-wave-active">Wave in progress</span>
        )}
        <button
          class="status-btn status-btn-speed"
          style={{ color: speedColor, borderColor: speedColor + '44' }}
          onClick={() => GameUIStore.requestCycleSpeed()}
        >
          {speed}x
        </button>
        {autoPlay && <span class="status-auto">AUTO</span>}
      </div>
    </div>
  );
}
