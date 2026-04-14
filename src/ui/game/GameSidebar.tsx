/**
 * GameSidebar — DOM overlay for in-game panels.
 * Currently renders the tower info panel as a floating card.
 * Does NOT replace the Phaser sidebar yet — runs alongside it.
 */
import { useGameUI } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { TowerInfoPanelDOM } from './TowerInfoPanelDOM';

export function GameSidebar() {
  const { active, selectedTower } = useGameUI();

  // Only render during gameplay when a tower is selected
  if (!active || !selectedTower) return null;

  // Render as a floating panel in the top-left, below the Phaser sidebar area
  return (
    <div style={{
      position: 'fixed',
      left: '8px',
      top: '8px',
      zIndex: 110,
      pointerEvents: 'auto',
      maxWidth: '340px',
      width: '340px',
    }}>
      <TowerInfoPanelDOM />
    </div>
  );
}
