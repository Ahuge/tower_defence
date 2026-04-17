/**
 * GameSidebar — DOM overlay for in-game panels.
 * Desktop/tablet: 3 collapsible sections stacked at top-left.
 * Phone: Waves + Economy stay as compact collapsible panels.
 *        Tower info renders as a floating card above the dock,
 *        dismissable via x button or tapping outside.
 */
import { useState, useEffect, useCallback, useLayoutEffect } from 'preact/hooks';
import { useGameUI } from '../hooks/useGameUI';
import { CollapsiblePanel } from './CollapsiblePanel';
import { TowerInfoPanelDOM } from './TowerInfoPanelDOM';
import { UpcomingWavesDOM } from './UpcomingWavesDOM';
import { EconomyPanelDOM } from './EconomyPanelDOM';
import { GameUIStore } from '../GameUIStore';
import { ResponsiveManager } from '../../systems/ResponsiveManager';

type PanelId = 'waves' | 'economy' | 'tower';

export function GameSidebar() {
  const { active, selectedTower, upcomingWaves, gold, lives, currentWave, totalWaves, income, essence } = useGameUI();
  const [openPanel, setOpenPanel] = useState<PanelId | null>('waves');
  const [showFloatingTower, setShowFloatingTower] = useState(false);
  // Measure status bar so the floating tower info can sit above it — its height
  // varies with flex-wrap (1-3 rows depending on viewport width and what's shown).
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  const isPhone = ResponsiveManager.isPhone();
  const panelWidth = isPhone ? 'calc(100% - 16px)' : '340px';

  // Auto-open tower panel on desktop; show floating card on phone
  useEffect(() => {
    if (selectedTower) {
      if (isPhone) {
        setShowFloatingTower(true);
      } else {
        setOpenPanel('tower');
      }
    } else {
      setShowFloatingTower(false);
      if (openPanel === 'tower') setOpenPanel('economy');
    }
  }, [selectedTower]);

  const dismissFloating = useCallback(() => {
    setShowFloatingTower(false);
    GameUIStore.deselectTower();
  }, []);

  useLayoutEffect(() => {
    if (!isPhone || !showFloatingTower) return;
    const bar = document.querySelector<HTMLElement>('.status-bar');
    if (!bar) return;
    const update = () => setStatusBarHeight(bar.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [isPhone, showFloatingTower]);

  if (!active) return null;

  const toggle = (id: PanelId) => {
    setOpenPanel(prev => prev === id ? null : id);
  };

  return (
    <>
      {/* Sidebar panels — top-left */}
      <div style={{
        position: 'fixed', left: '8px', top: '8px', zIndex: 110, pointerEvents: 'none',
        maxWidth: panelWidth, width: panelWidth,
        overflow: 'visible',
      }}>
        <CollapsiblePanel
          title="WAVES"
          open={openPanel === 'waves'}
          onToggle={() => toggle('waves')}
          badge={`W${currentWave}${totalWaves > 0 ? `/${totalWaves}` : ''}`}
        >
          <UpcomingWavesDOM />
        </CollapsiblePanel>

        <CollapsiblePanel
          title="ECONOMY"
          titleColor="#ff8844"
          open={openPanel === 'economy'}
          onToggle={() => toggle('economy')}
          badge={`${gold}g | +${income}/w${essence ? ` | ${essence.rate.toFixed(1)}e/s` : ''}`}
        >
          <EconomyPanelDOM />
        </CollapsiblePanel>

        {/* Desktop/tablet: tower info inline in sidebar */}
        {!isPhone && selectedTower && (
          <CollapsiblePanel
            title={selectedTower.name}
            titleColor="#ffdd44"
            open={openPanel === 'tower'}
            onToggle={() => toggle('tower')}
            badge={`Lv${selectedTower.level}${selectedTower.isUltimate ? ' ULT' : ''}`}
          >
            <TowerInfoPanelDOM />
          </CollapsiblePanel>
        )}
      </div>

      {/* Phone: floating tower info card above the dock */}
      {isPhone && selectedTower && showFloatingTower && (
        <div
          class="floating-tower-info game-panel"
          style={statusBarHeight > 0 ? { bottom: `${72 + statusBarHeight + 8}px` } : undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontFamily: "'VT323', ui-monospace, monospace", fontSize: '16px', fontWeight: 'bold', color: 'var(--gold)' }}>
              {selectedTower.name} Lv{selectedTower.level}{selectedTower.isUltimate ? ' ULT' : ''}
            </span>
            <button class="panel-close" onClick={dismissFloating}>&times;</button>
          </div>
          <TowerInfoPanelDOM />
        </div>
      )}
    </>
  );
}
