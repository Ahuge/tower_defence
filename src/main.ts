import Phaser from 'phaser';
import { CANVAS_WIDTH, GAME_HEIGHT } from './config';
import { MenuScene } from './scenes/MenuScene';
import { FactionSelectScene } from './scenes/FactionSelectScene';
import { DraftScene } from './scenes/DraftScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { TowerSelectBar } from './ui/TowerSelectBar';

// Register trait handlers (side-effect imports)
import './systems/traits/TowerTraitHandlers';
import './systems/traits/CreepTraitHandlers';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT,
  backgroundColor: '#111111',
  parent: document.body,
  scene: [MenuScene, FactionSelectScene, DraftScene, GameScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
