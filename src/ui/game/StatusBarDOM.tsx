/**
 * StatusBarDOM — game status bar + control buttons.
 * Shows gold, lives, wave, income, speed, pause. Start wave + speed buttons.
 */
import { useGameUI } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { platformBridge } from '../../systems/platform';
import { isRewardInstant, BattlePass, PlayerInventory } from '../../systems/monetization';

export function StatusBarDOM() {
  const { active, gold, lives, currentWave, totalWaves, income, speed, waveActive, betweenWaves, autoPlay, paused, versusTimer, essence, speedBoostRemainingSec, matchMode, attackerProgress, advisorActive, advisorSave, advisorTower } = useGameUI();

  if (!active) return null;

  const canStartWave = betweenWaves && (totalWaves === 0 || currentWave < totalWaves) && lives > 0;
  // Plan 12: in attacker mode the player WANTS leaks. Show breakthrough
  // progress instead of the otherwise-meaningless 999 lives counter.
  // Color flips green once the threshold is met (you've already won
  // pending wave clear) so the player knows they can stop pushing.
  const isAttacker = matchMode === 'attacker' && attackerProgress;
  const attackerMet = isAttacker && attackerProgress!.leaks >= attackerProgress!.threshold;
  const speedColors: Record<number, string> = { 0: '#c53d4a', 0.5: '#d98a2b', 1: '#b8a8b8', 1.5: '#cccc44', 2: '#e8b76d', 3: '#d98a2b' };
  const speedColor = speedColors[speed] ?? '#aaa';

  // Speed-boost ad button (strategy-doc #5). Progression:
  //   Baseline free: caps at 1.5×
  //   Watch ad: 2× unlocks for 10 min (stackable up to 30 min)
  //   ads_off IAP owned: 2× permanent (button hidden — already have it)
  //   Battle Pass `all_speeds` perk: 3× permanent (button hidden — already have it)
  // Hidden in tutorial + multiplayer (speed is mirrored across clients).
  const hasAllSpeeds = BattlePass.hasPerk('all_speeds');
  const adFree = PlayerInventory.isAdFree();
  const boostActive = speedBoostRemainingSec > 0;
  const boostEligible = matchMode !== 'tutorial' &&
    !matchMode.startsWith('versus') &&
    !matchMode.startsWith('circle') &&
    !hasAllSpeeds && !adFree &&
    platformBridge().isNative;
  const boostMin = Math.floor(speedBoostRemainingSec / 60);
  const boostSec = speedBoostRemainingSec % 60;
  const boostLabel = boostActive
    ? `⚡ 2× ${boostMin}:${boostSec.toString().padStart(2, '0')}`
    : '⚡ Ad → 2×';

  return (
    <>
    <div class="status-bar" data-tutorial-target="status-bar">
      {/* Stats */}
      <div class="status-stats">
        <span class="status-gold" data-tutorial-target="status-gold">Gold: {Math.floor(gold)}</span>
        {isAttacker
          ? <span class="status-lives" data-tutorial-target="status-lives" style={{ color: attackerMet ? '#7ee787' : undefined }}>
              Breakthrough: {attackerProgress!.leaks}/{attackerProgress!.threshold}
            </span>
          : <span class="status-lives" data-tutorial-target="status-lives">{lives > 0 ? `Lives: ${lives}` : 'DEAD'}</span>}
        <span class="status-wave" data-tutorial-target="status-wave">Wave: {currentWave}{totalWaves > 0 ? `/${totalWaves}` : ''}</span>
        <span class="status-income" data-tutorial-target="status-income">+{income}/w</span>
        {essence && <span style={{ color: '#44ddff' }}>{Math.floor(essence.essence)}e ({essence.rate.toFixed(1)}/s)</span>}
      </div>

      {/* Controls */}
      <div class="status-controls">
        {canStartWave && (
          <button class="status-btn status-btn-wave" data-tutorial-target="start-wave" onClick={() => GameUIStore.requestStartWave()}>
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
        {boostEligible && (
          <button
            class="status-btn"
            style={{
              fontSize: '11px',
              color: boostActive ? '#ffdd44' : '#e8b76d',
              borderColor: boostActive ? '#ffdd4455' : '#e8b76d55',
            }}
            onClick={() => { if (!boostActive) GameUIStore.requestSpeedBoost(); }}
            title={boostActive ? 'Speed boost active' : 'Watch ad to unlock 3× speed for 10 min'}
          >
            {boostLabel}
          </button>
        )}
        <button class="status-btn status-btn-pause" onClick={() => GameUIStore.requestPause()}>
          {paused ? '▶' : '⏸'}
        </button>
        <button
          class="status-btn"
          style={{
            color: advisorActive ? '#7ee787' : '#888',
            borderColor: advisorActive ? '#7ee78755' : '#55555555',
          }}
          onClick={() => GameUIStore.requestToggleAdvisor()}
          title="Placement Advisor (G): heatmap of where the learned model would build. Green = best."
        >
          🎯 Advisor
        </button>
        {autoPlay && <span class="status-auto">AUTO</span>}
      </div>
    </div>
    {/* Placement Advisor legend — only while the advisor is on. */}
    {advisorActive && (
      <div class="advisor-legend" style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'center',
        padding: '4px 10px', fontSize: '11px', color: '#bbb',
        background: '#111118ee', borderBottom: '1px solid #222',
      }}>
        <span style={{ fontWeight: 'bold', color: '#ddd' }}>Advisor:</span>
        {advisorTower && (
          <span style={{ color: '#fff' }}>Showing placements for: {advisorTower.name} ({advisorTower.cost}g)</span>
        )}
        <span><i style={{ display: 'inline-block', width: 10, height: 10, background: '#22cc66', borderRadius: 2, marginRight: 4 }} />≥ 0.7 Strong placement</span>
        <span><i style={{ display: 'inline-block', width: 10, height: 10, background: '#ddbb22', borderRadius: 2, marginRight: 4 }} />0.4–0.7 Decent placement</span>
        <span><i style={{ display: 'inline-block', width: 10, height: 10, background: '#cc3322', borderRadius: 2, marginRight: 4 }} />0.15–0.4 Weak placement</span>
        <span>1·2·3 = top picks</span>
        <span style={{ color: '#88ccff' }}>↑ UPG = upgrade pick (click the tower)</span>
        {advisorSave && (
          <span style={{
            color: '#ffdd44', fontWeight: 'bold', border: '1px solid #ffdd4455',
            borderRadius: 4, padding: '1px 6px', background: '#ffdd4411',
          }}>
            💰 SAVE — hold gold for a bigger buy
          </span>
        )}
      </div>
    )}
    </>
  );
}
