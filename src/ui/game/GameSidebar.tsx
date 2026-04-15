/**
 * GameSidebar — DOM overlay for in-game panels.
 * Collapsible accordion — tap headers to expand/collapse.
 * Tower info auto-opens when selected, auto-closes when deselected.
 */
import { useState, useEffect } from 'preact/hooks';
import { useGameUI } from '../hooks/useGameUI';
import { CollapsiblePanel } from './CollapsiblePanel';
import { TowerInfoPanelDOM } from './TowerInfoPanelDOM';
import { UpcomingWavesDOM } from './UpcomingWavesDOM';
import { SendPanelDOM } from './SendPanelDOM';
import { EventLogDOM } from './EventLogDOM';
import { ResponsiveManager } from '../../systems/ResponsiveManager';

type PanelId = 'waves' | 'sends' | 'tower' | 'log';

export function GameSidebar() {
  const { active, selectedTower, upcomingWaves, sendOptions, eventLog } = useGameUI();
  const [openPanel, setOpenPanel] = useState<PanelId | null>('waves');

  const isPhone = ResponsiveManager.isPhone();
  const panelWidth = isPhone ? 'calc(100% - 16px)' : '340px';

  // Auto-open tower panel when a tower is selected
  useEffect(() => {
    if (selectedTower) setOpenPanel('tower');
    else if (openPanel === 'tower') setOpenPanel('waves');
  }, [selectedTower]);

  if (!active) return null;

  const toggle = (id: PanelId) => {
    setOpenPanel(prev => prev === id ? null : id);
  };

  return (
    <div style={{
      position: 'fixed',
      left: '8px',
      top: '8px',
      zIndex: 110,
      pointerEvents: 'auto',
      maxWidth: panelWidth,
      width: panelWidth,
      maxHeight: 'calc(100vh - 140px)',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {upcomingWaves.length > 0 && (
        <CollapsiblePanel
          title="WAVES"
          open={openPanel === 'waves'}
          onToggle={() => toggle('waves')}
          badge={`W${upcomingWaves[0]?.waveNum ?? '?'}`}
        >
          <UpcomingWavesDOM />
        </CollapsiblePanel>
      )}

      {sendOptions.length > 0 && (
        <CollapsiblePanel
          title="SENDS"
          titleColor="#ff8844"
          open={openPanel === 'sends'}
          onToggle={() => toggle('sends')}
          badge="between waves"
        >
          <SendPanelDOM />
        </CollapsiblePanel>
      )}

      {selectedTower && (
        <CollapsiblePanel
          title={selectedTower.name}
          titleColor="#ffdd44"
          open={openPanel === 'tower'}
          onToggle={() => toggle('tower')}
          badge={`Lv${selectedTower.level}`}
        >
          <TowerInfoPanelDOM />
        </CollapsiblePanel>
      )}

      {eventLog.length > 0 && (
        <CollapsiblePanel
          title="LOG"
          titleColor="#666"
          open={openPanel === 'log'}
          onToggle={() => toggle('log')}
          badge={`${eventLog.length}`}
        >
          <EventLogDOM />
        </CollapsiblePanel>
      )}
    </div>
  );
}
