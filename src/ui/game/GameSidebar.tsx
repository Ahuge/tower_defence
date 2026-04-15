/**
 * GameSidebar — DOM overlay for in-game panels.
 * Renders as floating panels over the Phaser canvas.
 */
import { useGameUI } from '../hooks/useGameUI';
import { TowerInfoPanelDOM } from './TowerInfoPanelDOM';
import { UpcomingWavesDOM } from './UpcomingWavesDOM';
import { SendPanelDOM } from './SendPanelDOM';
import { EventLogDOM } from './EventLogDOM';

export function GameSidebar() {
  const { active, selectedTower, upcomingWaves, sendOptions, eventLog } = useGameUI();

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
      gap: '4px',
      maxHeight: 'calc(100vh - 140px)',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {upcomingWaves.length > 0 && <UpcomingWavesDOM />}
      {sendOptions.length > 0 && <SendPanelDOM />}
      {selectedTower && <TowerInfoPanelDOM />}
      {eventLog.length > 0 && <EventLogDOM />}
    </div>
  );
}
