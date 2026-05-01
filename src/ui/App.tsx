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
import { SettingsScreen } from './screens/SettingsScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { CircleLobbyScreen } from './screens/CircleLobbyScreen';
import { CampaignLobbyScreen } from './screens/CampaignLobbyScreen';
import { CampaignMenuScreen } from './screens/CampaignMenuScreen';
import { FactionTreeScreen } from './screens/FactionTreeScreen';
import { GauntletPreviewScreen } from './screens/GauntletPreviewScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { AppLoadingScreen } from './screens/AppLoadingScreen';
import { GameSidebar } from './game/GameSidebar';
import { TowerDockDOM } from './game/TowerDockDOM';
import { StatusBarDOM } from './game/StatusBarDOM';
import { CircleRosterDOM } from './game/CircleRosterDOM';
import { ContinueOfferModal } from './game/ContinueOfferModal';
import { AchievementToast } from './components/AchievementToast';
import { TutorialOverlay } from './tutorial/TutorialOverlay';
import { LevelUpModal } from './components/LevelUpModal';
import { FactionUnlockSplash } from './components/FactionUnlockSplash';
import { SplashScreen } from './screens/SplashScreen';
import { AnalyticsDebugPanel } from './debug/AnalyticsDebugPanel';
import { PlayerProfile } from '../systems/profile/PlayerProfile';
import { TutorialPersistence } from '../systems/Tutorial/TutorialPersistence';
import './styles/game-panels.css';

export function App() {
  const [screen, setScreen] = useState<ScreenId>(UIBridge.getScreen());
  const [data, setData] = useState<Record<string, unknown>>(UIBridge.getData());
  const [loading, setLoading] = useState<LoadingData | null>(UIBridge.getLoading());
  // Plan 3: cold-boot splash gates the menu for net-new players.
  // Initial value computed once at mount — the player can't toggle this
  // back on by interacting with the splash, so re-evaluation isn't needed.
  // Migration in PlayerProfile.init() pre-marks first_game_complete for
  // legacy players so they never see this.
  const [showSplash, setShowSplash] = useState(() => {
    const tut = TutorialPersistence.load();
    return !PlayerProfile.isFirstGameComplete() && !tut.dismissedFirstLaunch;
  });
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

  // While the splash is up, suppress everything else. Once the player
  // taps Play (FTG launches into GameScene which clears the screen)
  // or Skip (menu falls through normally), this gate releases.
  if (showSplash && screen === 'menu') {
    return (
      <>
        <SplashScreen onDismissed={() => setShowSplash(false)} />
        <AnalyticsDebugPanel />
      </>
    );
  }

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
          {screen === 'settings' && <SettingsScreen />}
          {screen === 'lobby' && <LobbyScreen />}
          {screen === 'circle-lobby' && <CircleLobbyScreen />}
          {screen === 'campaign-lobby' && <CampaignLobbyScreen data={data} />}
          {screen === 'campaign-menu' && <CampaignMenuScreen />}
          {screen === 'faction-tree' && <FactionTreeScreen />}
        </div>
      )}

      {/* In-game UI — renders alongside Phaser canvas when no screen is active */}
      {!screen && <GameSidebar />}
      {!screen && <StatusBarDOM />}
      {!screen && <TowerDockDOM />}
      {!screen && <CircleRosterDOM />}

      {/* Continue-ad modal — renders only when GameScene offers a revive
          on lives→0. Self-gates on GameUIStore.continueOffer so no-op
          when idle. Stays visible even over the tutorial overlay since
          the tutorial short-circuits this path. */}
      {!screen && <ContinueOfferModal />}

      {/* Achievement-unlock toast — always mounted (both in-game and on
          menu screens) since achievements can fire from either context.
          Self-gates on the td-achievement-unlocked event. */}
      <AchievementToast />

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

      {/* Player Level / migration modal — self-gates on PlayerProfile
          listener queue. Renders nothing when no level-up or banner is
          pending. */}
      <LevelUpModal />

      {/* Faction unlock splash — listens for `td-faction-unlocked`
          window events dispatched by the Plan 5 unlock flow. Self-gates
          to null when no unlock is pending. */}
      <FactionUnlockSplash />

      {/* Analytics debug panel — gated on the `?debug` URL flag, renders
          nothing in normal play. Fixed bottom-left drawer. */}
      <AnalyticsDebugPanel />
    </>
  );
}
