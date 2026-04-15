/**
 * GameSidebar — DOM overlay for in-game panels.
 * 3 collapsible sections: Waves, Economy (sends+frontier+log), Tower.
 */
import { useState, useEffect } from 'preact/hooks';
import { useGameUI } from '../hooks/useGameUI';
import { CollapsiblePanel } from './CollapsiblePanel';
import { TowerInfoPanelDOM } from './TowerInfoPanelDOM';
import { UpcomingWavesDOM } from './UpcomingWavesDOM';
import { EconomyPanelDOM } from './EconomyPanelDOM';
import { ResponsiveManager } from '../../systems/ResponsiveManager';

type PanelId = 'waves' | 'economy' | 'tower';

export function GameSidebar() {
  const { active, selectedTower, upcomingWaves, gold, lives } = useGameUI();
  const [openPanel, setOpenPanel] = useState<PanelId | null>('waves');

  const isPhone = ResponsiveManager.isPhone();
  const panelWidth = isPhone ? 'calc(100% - 16px)' : '340px';

  // Auto-open tower panel when selected
  useEffect(() => {
    if (selectedTower) setOpenPanel('tower');
    else if (openPanel === 'tower') setOpenPanel('economy');
  }, [selectedTower]);

  if (!active) return null;

  const toggle = (id: PanelId) => {
    setOpenPanel(prev => prev === id ? null : id);
  };

  return (
    <div style={{
      position: 'fixed', left: '8px', top: '8px', zIndex: 110, pointerEvents: 'auto',
      maxWidth: panelWidth, width: panelWidth,
      maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', overflowX: 'hidden',
    }}>
      <CollapsiblePanel
        title="WAVES"
        open={openPanel === 'waves'}
        onToggle={() => toggle('waves')}
        badge={upcomingWaves.length > 0 ? `W${upcomingWaves[0]?.waveNum ?? '?'}` : undefined}
      >
        <UpcomingWavesDOM />
      </CollapsiblePanel>

      <CollapsiblePanel
        title="ECONOMY"
        titleColor="#ff8844"
        open={openPanel === 'economy'}
        onToggle={() => toggle('economy')}
        badge={`${gold}g | ${lives} lives`}
      >
        <EconomyPanelDOM />
      </CollapsiblePanel>

      {selectedTower && (
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
  );
}
