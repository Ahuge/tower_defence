import { useState, useEffect, useRef } from 'preact/hooks';
import { UIBridge, ScreenId, LoadingData } from './UIBridge';
import { MenuScreen } from './screens/MenuScreen';
import { StoreScreen } from './screens/StoreScreen';
import { BattlePassScreen } from './screens/BattlePassScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { FactionSelectScreen } from './screens/FactionSelectScreen';
import { HeroSelectScreen } from './screens/HeroSelectScreen';
import { CreepFactionSelectScreen } from './screens/CreepFactionSelectScreen';
import { DraftScreen } from './screens/DraftScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { ChangelogScreen } from './screens/ChangelogScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { EncyclopediaScreen } from './screens/EncyclopediaScreen';
import { GauntletPreviewScreen } from './screens/GauntletPreviewScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { AppLoadingScreen } from './screens/AppLoadingScreen';
import { GameSidebar } from './game/GameSidebar';
import { TowerDockDOM } from './game/TowerDockDOM';
import { StatusBarDOM } from './game/StatusBarDOM';
import { TutorialOverlay } from './tutorial/TutorialOverlay';
import './styles/game-panels.css';

export function App() {
  const [screen, setScreen] = useState<ScreenId>(UIBridge.getScreen());
  const [data, setData] = useState<Record<string, unknown>>(UIBridge.getData());
  const [loading, setLoading] = useState<LoadingData | null>(UIBridge.getLoading());
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const current = UIBridge.getScreen();
    if (current !== screen) {
      setScreen(current);
      setData(UIBridge.getData());
    }
    const unsubScreen = UIBridge.onScreenChange((s, d) => {
      if (mounted.current) { setScreen(s); setData(d); }
    });
    const unsubLoading = UIBridge.onLoadingChange((ld) => {
      if (mounted.current) setLoading(ld);
    });
    return () => { unsubScreen(); unsubLoading(); };
  }, []);

  return (
    <>
      {/* Full-screen UI screens (menu, store, etc.) */}
      {screen && (
        <div class="ui-screen">
          {screen === 'menu' && <MenuScreen />}
          {screen === 'store' && <StoreScreen />}
          {screen === 'battlepass' && <BattlePassScreen />}
          {screen === 'inventory' && <InventoryScreen />}
          {screen === 'factionselect' && <FactionSelectScreen data={data} />}
          {screen === 'heroselect' && <HeroSelectScreen data={data} />}
          {screen === 'creepfactionselect' && <CreepFactionSelectScreen data={data} />}
          {screen === 'draft' && <DraftScreen data={data} />}
          {screen === 'gauntletpreview' && <GauntletPreviewScreen data={data} />}
          {screen === 'gameover' && <GameOverScreen data={data} />}
          {screen === 'changelog' && <ChangelogScreen />}
          {screen === 'leaderboard' && <LeaderboardScreen />}
          {screen === 'encyclopedia' && <EncyclopediaScreen />}
        </div>
      )}

      {/* In-game UI — renders alongside Phaser canvas when no screen is active */}
      {!screen && <GameSidebar />}
      {!screen && <StatusBarDOM />}
      {!screen && <TowerDockDOM />}

      {/* Loading screen — overlays everything during game scene load */}
      {loading && (
        <LoadingScreen
          faction={loading.faction}
          map={loading.map}
          difficulty={loading.difficulty}
          mode={loading.mode}
          waveCount={loading.waveCount}
        />
      )}

      {/* App-startup splash — shown on first page load while BootScene
          fetches spritesheets and the icon cache pre-warms. Self-unmounts. */}
      <AppLoadingScreen />

      {/* Tutorial overlay — renders nothing when no track is active.
          Sits on top of everything except the startup splash. */}
      <TutorialOverlay />
    </>
  );
}
