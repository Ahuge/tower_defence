/**
 * GameSidebar — DOM overlay for in-game panels.
 * Desktop/tablet: 3 collapsible sections stacked at top-left.
 * Phone: Waves + Economy stay as compact collapsible panels.
 *        Tower/creep info renders as a floating card above the dock,
 *        dismissable via x button or tapping outside.
 */
import { useState, useEffect, useCallback, useLayoutEffect } from 'preact/hooks';
import { useGameUI } from '../hooks/useGameUI';
import { CollapsiblePanel } from './CollapsiblePanel';
import { TowerInfoPanelDOM } from './TowerInfoPanelDOM';
import { CreepInfoPanelDOM } from './CreepInfoPanelDOM';
import { UpcomingWavesDOM } from './UpcomingWavesDOM';
import { EconomyPanelDOM } from './EconomyPanelDOM';
import { MissionPanelDOM } from './MissionPanelDOM';
import { GameUIStore } from '../GameUIStore';
import { ResponsiveManager } from '../../systems/ResponsiveManager';

type PanelId = 'mission' | 'waves' | 'economy' | 'tower' | 'creep';

export function GameSidebar() {
  const { active, selectedTower, selectedCreep, upcomingWaves, gold, lives, currentWave, totalWaves, income, essence, missionPanel } = useGameUI();
  // Default to MISSION when this is a campaign run so the player sees
  // their star objectives at the top of the sidebar without an extra
  // tap; otherwise default to WAVES like before.
  const [openPanel, setOpenPanel] = useState<PanelId | null>(missionPanel ? 'mission' : 'waves');
  const [showFloating, setShowFloating] = useState<'tower' | 'creep' | null>(null);
  // Measure status bar so the floating card can sit above it — its height
  // varies with flex-wrap (1-3 rows depending on viewport width and what's shown).
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  const isPhone = ResponsiveManager.isPhone();
  const panelWidth = isPhone ? 'calc(100% - 16px)' : '340px';

  // Auto-open tower/creep panel on desktop; show floating card on phone.
  // Tower + creep are mutually exclusive — selecting one clears the other.
  useEffect(() => {
    if (selectedTower) {
      if (isPhone) setShowFloating('tower');
      else setOpenPanel('tower');
    } else if (selectedCreep) {
      if (isPhone) setShowFloating('creep');
      else setOpenPanel('creep');
    } else {
      setShowFloating(null);
      if (openPanel === 'tower' || openPanel === 'creep') setOpenPanel('economy');
    }
  }, [selectedTower, selectedCreep]);

  const dismissFloating = useCallback(() => {
    setShowFloating(null);
    // Full deselect — also clears GameScene's `selectedTower`, so the
    // 250ms info-refresh tick can't re-push the snapshot and reopen
    // the floating card a beat after the user pressed ×.
    if (selectedTower) GameUIStore.requestDeselectTower();
    if (selectedCreep) GameUIStore.deselectCreep();
  }, [selectedTower, selectedCreep]);

  useLayoutEffect(() => {
    if (!isPhone || !showFloating) return;
    const bar = document.querySelector<HTMLElement>('.status-bar');
    if (!bar) return;
    const update = () => setStatusBarHeight(bar.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [isPhone, showFloating]);

  // Tutorial steps can request a specific sidebar panel to be open so the
  // spotlight lands on its visible content rather than the collapsed
  // header. `panel: null` collapses whichever panel is open — used when
  // a later step (e.g. watch-a-wave) needs the game area unobscured.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ panel: PanelId | null }>).detail;
      if (detail === undefined) return;
      if (detail.panel === null) {
        setOpenPanel(null);
      } else if (detail.panel === 'waves' || detail.panel === 'economy') {
        setOpenPanel(detail.panel);
      }
    };
    window.addEventListener('tutorial-open-sidebar-panel', onOpen);
    return () => window.removeEventListener('tutorial-open-sidebar-panel', onOpen);
  }, []);

  if (!active) return null;

  const toggle = (id: PanelId) => {
    setOpenPanel(prev => {
      const next = prev === id ? null : id;
      // Switching away from the tower/creep panel = "I'm done with that
      // selection". Without this, collapsing the Hive Spire header or
      // opening Economy left the tower selected (range circle + info
      // refresh kept ticking). Now the inspect mode tears down with the
      // panel.
      if (prev === 'tower' && next !== 'tower' && selectedTower) {
        GameUIStore.requestDeselectTower();
      }
      if (prev === 'creep' && next !== 'creep' && selectedCreep) {
        GameUIStore.deselectCreep();
      }
      return next;
    });
  };

  return (
    <>
      {/* Sidebar panels — top-left */}
      <div style={{
        position: 'fixed', left: '8px', top: '8px', zIndex: 110, pointerEvents: 'none',
        maxWidth: panelWidth, width: panelWidth,
        overflow: 'visible',
      }}>
        {/* Plan 14 v2: campaign mission objective tracker. Sits above
            Waves so the player's eyes land on their star goals first.
            Hidden entirely on non-mission runs. */}
        {missionPanel && (
          <CollapsiblePanel
            title="MISSION"
            titleColor="var(--gold)"
            open={openPanel === 'mission'}
            onToggle={() => toggle('mission')}
            badge={`${missionPanel.objectives.filter(o => o.met).length}/${missionPanel.objectives.length}★`}
          >
            <MissionPanelDOM />
          </CollapsiblePanel>
        )}

        <div data-tutorial-target="waves-panel">
          <CollapsiblePanel
            title="WAVES"
            open={openPanel === 'waves'}
            onToggle={() => toggle('waves')}
            badge={`W${currentWave}${totalWaves > 0 ? `/${totalWaves}` : ''}`}
          >
            <UpcomingWavesDOM />
          </CollapsiblePanel>
        </div>

        <div data-tutorial-target="economy-panel">
          <CollapsiblePanel
            title="ECONOMY"
            titleColor="#ff8844"
            open={openPanel === 'economy'}
            onToggle={() => toggle('economy')}
            badge={`${gold}g | +${income}/w${essence ? ` | ${essence.rate.toFixed(1)}e/s` : ''}`}
          >
            <EconomyPanelDOM />
          </CollapsiblePanel>
        </div>

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

        {/* Desktop/tablet: creep info inline in sidebar */}
        {!isPhone && selectedCreep && (
          <CollapsiblePanel
            title={selectedCreep.name}
            titleColor={selectedCreep.factionColor ?? '#ff8888'}
            open={openPanel === 'creep'}
            onToggle={() => toggle('creep')}
            badge={selectedCreep.isBoss ? 'BOSS' : `${Math.round((selectedCreep.hp / Math.max(1, selectedCreep.maxHp)) * 100)}%`}
          >
            <CreepInfoPanelDOM />
          </CollapsiblePanel>
        )}
      </div>

      {/* Phone: floating info card above the dock (tower or creep — mutually exclusive) */}
      {isPhone && showFloating === 'tower' && selectedTower && (
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

      {isPhone && showFloating === 'creep' && selectedCreep && (
        <div
          class="floating-tower-info game-panel"
          style={statusBarHeight > 0 ? { bottom: `${72 + statusBarHeight + 8}px` } : undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{
              fontFamily: "'VT323', ui-monospace, monospace",
              fontSize: '16px',
              fontWeight: 'bold',
              color: selectedCreep.factionColor ?? '#ff8888',
            }}>
              {selectedCreep.name}{selectedCreep.isBoss ? ' [BOSS]' : ''}
            </span>
            <button class="panel-close" onClick={dismissFloating}>&times;</button>
          </div>
          <CreepInfoPanelDOM />
        </div>
      )}
    </>
  );
}
