import { useState, useEffect, useRef } from 'preact/hooks';
import { UIBridge, ScreenId } from './UIBridge';
import { MenuScreen } from './screens/MenuScreen';
import { StoreScreen } from './screens/StoreScreen';
import { BattlePassScreen } from './screens/BattlePassScreen';
import { FactionSelectScreen } from './screens/FactionSelectScreen';
import { HeroSelectScreen } from './screens/HeroSelectScreen';
import { CreepFactionSelectScreen } from './screens/CreepFactionSelectScreen';
import { DraftScreen } from './screens/DraftScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { ChangelogScreen } from './screens/ChangelogScreen';

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

  if (!screen) return null;

  return (
    <div class="ui-screen">
      {screen === 'menu' && <MenuScreen />}
      {screen === 'store' && <StoreScreen />}
      {screen === 'battlepass' && <BattlePassScreen />}
      {screen === 'factionselect' && <FactionSelectScreen data={data} />}
      {screen === 'heroselect' && <HeroSelectScreen data={data} />}
      {screen === 'creepfactionselect' && <CreepFactionSelectScreen data={data} />}
      {screen === 'draft' && <DraftScreen data={data} />}
      {screen === 'gameover' && <GameOverScreen data={data} />}
      {screen === 'changelog' && <ChangelogScreen />}
    </div>
  );
}
