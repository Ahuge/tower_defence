import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from './config';
import { MenuScene } from './scenes/MenuScene';
import { FactionSelectScene } from './scenes/FactionSelectScene';
import { DraftScene } from './scenes/DraftScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { LobbyScene } from './scenes/LobbyScene';
import { ChangelogScene } from './scenes/ChangelogScene';
import { EncyclopediaScene } from './scenes/EncyclopediaScene';
import { TowerSelectBar } from './ui/TowerSelectBar';

// Register trait handlers (side-effect imports)
import './systems/traits/TowerTraitHandlers';
import './systems/traits/CreepTraitHandlers';

const gameHeight = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: CANVAS_WIDTH,
  height: gameHeight,
  backgroundColor: '#111111',
  parent: document.body,
  scene: [MenuScene, FactionSelectScene, DraftScene, GameScene, GameOverScene, LobbyScene, ChangelogScene, EncyclopediaScene],
  render: {
    antialias: true,
    pixelArt: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
