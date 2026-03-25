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
import { EncyclopediaScene } from './scenes/EncyclopediaScene';
import { HeroSelectScene } from './scenes/HeroSelectScene';
import { BaseDefenceScene } from './scenes/BaseDefenceScene';
import { TowerSelectBar } from './ui/TowerSelectBar';

// Register trait handlers (side-effect imports)
import './systems/traits/TowerTraitHandlers';
import './systems/traits/CreepTraitHandlers';

// Initialize responsive detection before Phaser
ResponsiveManager.init();

const gameHeight = ResponsiveManager.canvasHeight();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: ResponsiveManager.canvasWidth(),
  height: gameHeight,
  backgroundColor: '#111111',
  parent: document.body,
  scene: [MenuScene, FactionSelectScene, DraftScene, GameScene, GameOverScene, LobbyScene, CircleLobbyScene, ChangelogScene, EncyclopediaScene, HeroSelectScene, BaseDefenceScene],
  render: {
    antialias: true,
    pixelArt: false,
  },
  input: {
    touch: true,
    activePointers: 3, // support pinch (2 fingers) + 1 extra
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

// Resize canvas on layout mode change
ResponsiveManager.onLayoutChange(() => {
  game.scale.resize(ResponsiveManager.canvasWidth(), ResponsiveManager.canvasHeight());
});
