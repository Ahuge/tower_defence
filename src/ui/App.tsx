import { useState, useEffect, useRef } from 'preact/hooks';
import { UIBridge, ScreenId } from './UIBridge';
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
import { GameSidebar } from './game/GameSidebar';
import './styles/game-panels.css';

export function App() {
  const [screen, setScreen] = useState<ScreenId>(UIBridge.getScreen());
  const [data, setData] = useState<Record<string, unknown>>(UIBridge.getData());
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const current = UIBridge.getScreen();
    if (current !== screen) {
      setScreen(current);
      setData(UIBridge.getData());
    }
    return UIBridge.onScreenChange((s, d) => {
      if (mounted.current) { setScreen(s); setData(d); }
    });
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
          {screen === 'gameover' && <GameOverScreen data={data} />}
          {screen === 'changelog' && <ChangelogScreen />}
          {screen === 'leaderboard' && <LeaderboardScreen />}
          {screen === 'encyclopedia' && <EncyclopediaScreen />}
        </div>
      )}

      {/* In-game sidebar — renders alongside Phaser canvas when no screen is active */}
      {!screen && <GameSidebar />}
    </>
  );
}
