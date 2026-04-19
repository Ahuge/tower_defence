import * as Phaser from 'phaser';
import { GAME_HEIGHT } from './config';
import { ResponsiveManager } from './systems/ResponsiveManager';
import { MenuScene } from './scenes/MenuScene';
import { FactionSelectScene } from './scenes/FactionSelectScene';
import { DraftScene } from './scenes/DraftScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { LobbyScene } from './scenes/LobbyScene';
import { CircleLobbyScene } from './scenes/CircleLobbyScene';
import { CustomMapScene } from './scenes/CustomMapScene';
import { EncyclopediaScene } from './scenes/EncyclopediaScene';
import { HeroSelectScene } from './scenes/HeroSelectScene';
import { CreepFactionSelectScene } from './scenes/CreepFactionSelectScene';
import { GauntletPreviewScene } from './scenes/GauntletPreviewScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { UIBridge } from './ui/UIBridge';
import { preloadSprites } from './systems/SpriteManager';
import { preloadCreepSprites } from './systems/CreepSpriteManager';
import { preheatIcons } from './ui/game/IconPreheat';
import { TutorialManager } from './systems/Tutorial/TutorialManager';
import { installPlatformBridge } from './systems/platform';

// Register trait handlers (side-effect imports)
import './systems/traits/TowerTraitHandlers';
import './systems/traits/CreepTraitHandlers';

// Initialize responsive detection before Phaser
ResponsiveManager.init();

const gameHeight = ResponsiveManager.canvasHeight();

class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload(): void {
    // Load tower / hero / creep spritesheets at startup so the Store,
    // Inventory, and other menu screens can render skin previews before
    // any GameScene has been instantiated. Textures are global to the
    // Phaser TextureManager, so loading once here covers every screen.
    preloadSprites(this);
    preloadCreepSprites(this);

    // Asset fetch phase occupies the first 80% of the AppLoadingScreen
    // progress bar; icon preheat takes the remaining 20%.
    this.load.on('progress', (value: number) => {
      window.dispatchEvent(new CustomEvent('app-preload-progress', {
        detail: { value: value * 0.8, phase: 'assets' },
      }));
    });
  }
  async create(): Promise<void> {
    window.dispatchEvent(new CustomEvent('app-preload-progress', {
      detail: { value: 0.8, phase: 'warming' },
    }));
    await preheatIcons(0.8, 0.2);
    window.dispatchEvent(new Event('app-preload-complete'));
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: ResponsiveManager.canvasWidth(),
  height: gameHeight,
  backgroundColor: '#15101a',
  parent: 'game-root',
  scene: [BootScene, MenuScene, FactionSelectScene, CreepFactionSelectScene, DraftScene, GauntletPreviewScene, GameScene, GameOverScene, LobbyScene, CircleLobbyScene, LeaderboardScene, EncyclopediaScene, HeroSelectScene, CustomMapScene],
  render: { antialias: true, pixelArt: false },
  input: { touch: true, activePointers: 3 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
};

const game = new Phaser.Game(config);

// Install the PlatformBridge (ads / IAP / profile) before any system
// that might depend on it comes online. Fire-and-forget — the bridge
// starts at the web no-op default, native implementations replace it
// asynchronously.
installPlatformBridge().catch(err => console.error('[platform] install failed', err));

// Initialize DOM UI bridge, then show menu after Preact mounts
UIBridge.init(game);
TutorialManager.init();
requestAnimationFrame(() => UIBridge.show('menu'));

// Playwright test hook — lazily loaded only when the page was opened
// with `?test=1`. Dev/prod builds for real users serve no extra code.
if (new URLSearchParams(window.location.search).has('test')) {
  import('./testHook').then(m => m.installTestHook()).catch(err =>
    console.error('[td-test] failed to install test hook:', err),
  );
}

// Resize canvas on layout mode change
ResponsiveManager.onLayoutChange(() => {
  game.scale.resize(ResponsiveManager.canvasWidth(), ResponsiveManager.canvasHeight());
});

// Debounced resize — keeps Phaser resolution in sync with viewport even within
// the same layout mode (e.g., desktop window dragged narrower).
// Guard: skip if no scene is active yet (avoids bad resize during boot).
let resizeTimer: ReturnType<typeof setTimeout>;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (game.scene.getScenes(true).length > 0) {
      game.scale.resize(ResponsiveManager.canvasWidth(), ResponsiveManager.canvasHeight());
    }
  }, 150);
});

// Register service worker for PWA / offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(
      import.meta.env.BASE_URL + 'sw.js'
    );
  });
}
