/**
 * GameSidebar — DOM sidebar rendered over the Phaser canvas during gameplay.
 * Desktop: inline left panel (360px). Tablet/Phone: slide-out overlay.
 *
 * Mounts into #ui-root and renders when GameUIStore.active is true.
 * Does NOT block the Phaser canvas — uses pointer-events: none on empty areas.
 */
import { useGameUI } from '../hooks/useGameUI';
import { GameUIStore } from '../GameUIStore';
import { TowerInfoPanelDOM } from './TowerInfoPanelDOM';
import { ResponsiveManager } from '../../systems/ResponsiveManager';

export function GameSidebar() {
  const { active, sidebarOpen, selectedTower, gold, lives, currentWave, totalWaves, speed, paused } = useGameUI();

  if (!active) return null;

  const isDesktop = !ResponsiveManager.isTablet() && !ResponsiveManager.isPhone();
  const isPhone = ResponsiveManager.isPhone();

  // Desktop: always visible inline. Mobile: slide overlay.
  if (isDesktop) {
    return (
      <div class="game-sidebar game-sidebar-desktop">
        {selectedTower && <TowerInfoPanelDOM />}
      </div>
    );
  }

  // Tablet/Phone: overlay
  return (
    <>
      {/* Toggle button */}
      {!sidebarOpen && (
        <button
          class="sidebar-toggle-btn"
          onClick={() => GameUIStore.toggleSidebar()}
        >
          ☰
        </button>
      )}

      {/* Overlay scrim */}
      {sidebarOpen && (
        <div
          class="sidebar-scrim"
          onClick={() => GameUIStore.toggleSidebar()}
        />
      )}

      {/* Slide-out panel */}
      <div class={`game-sidebar game-sidebar-mobile ${sidebarOpen ? 'open' : ''}`}
        style={{ width: isPhone ? '100%' : '360px' }}>
        <div class="sidebar-mobile-header">
          <span style={{ fontSize: '14px', color: '#fff' }}>Menu</span>
          <button class="panel-close" onClick={() => GameUIStore.toggleSidebar()}>✕</button>
        </div>
        {selectedTower && <TowerInfoPanelDOM />}
      </div>

      {/* Floating tower info (shown without opening sidebar on mobile) */}
      {!sidebarOpen && selectedTower && (
        <div class="floating-tower-info">
          <TowerInfoPanelDOM />
        </div>
      )}
    </>
  );
}
