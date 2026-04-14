/**
 * GameSidebar — DOM overlay for in-game panels.
 * Renders as floating panels over the Phaser canvas.
 */
import { useGameUI } from '../hooks/useGameUI';
import { TowerInfoPanelDOM } from './TowerInfoPanelDOM';
import { UpcomingWavesDOM } from './UpcomingWavesDOM';

export function GameSidebar() {
  const { active, selectedTower, upcomingWaves } = useGameUI();

  if (!active) return null;

  return (
    <div style={{
      position: 'fixed',
      left: '8px',
      top: '8px',
      zIndex: 110,
      pointerEvents: 'auto',
      maxWidth: '340px',
      width: '340px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      {upcomingWaves.length > 0 && <UpcomingWavesDOM />}
      {selectedTower && <TowerInfoPanelDOM />}
    </div>
  );
}
