import Phaser from 'phaser';
import { GAME_HEIGHT } from './config';
import { ResponsiveManager } from './systems/ResponsiveManager';
import { MenuScene } from './scenes/MenuScene';
import { FactionSelectScene } from './scenes/FactionSelectScene';
import { DraftScene } from './scenes/DraftScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { LobbyScene } from './scenes/LobbyScene';
import { CircleLobbyScene } from './scenes/CircleLobbyScene';
import { ChangelogScene } from './scenes/ChangelogScene';
import { CustomMapScene } from './scenes/CustomMapScene';
import { EncyclopediaScene } from './scenes/EncyclopediaScene';
import { HeroSelectScene } from './scenes/HeroSelectScene';
import { CreepFactionSelectScene } from './scenes/CreepFactionSelectScene';
import { GauntletPreviewScene } from './scenes/GauntletPreviewScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { TowerSelectBar } from './ui/TowerSelectBar';
import { UIBridge } from './ui/UIBridge';
import { preloadSprites } from './systems/SpriteManager';
import { preloadCreepSprites } from './systems/CreepSpriteManager';

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
  }
  create(): void { /* Phaser ready — menu shown from main.ts */ }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: ResponsiveManager.canvasWidth(),
  height: gameHeight,
  backgroundColor: '#111111',
  parent: 'game-root',
  scene: [BootScene, MenuScene, FactionSelectScene, CreepFactionSelectScene, DraftScene, GauntletPreviewScene, GameScene, GameOverScene, LobbyScene, CircleLobbyScene, ChangelogScene, LeaderboardScene, EncyclopediaScene, HeroSelectScene, CustomMapScene],
  render: { antialias: true, pixelArt: false },
  input: { touch: true, activePointers: 3 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
};

const game = new Phaser.Game(config);

// Initialize DOM UI bridge, then show menu after Preact mounts
UIBridge.init(game);
requestAnimationFrame(() => UIBridge.show('menu'));

// Resize canvas on layout mode change
ResponsiveManager.onLayoutChange(() => {
  game.scale.resize(ResponsiveManager.canvasWidth(), ResponsiveManager.canvasHeight());
});
