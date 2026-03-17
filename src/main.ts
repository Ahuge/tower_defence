import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { MenuScene } from './scenes/MenuScene';
import { FactionSelectScene } from './scenes/FactionSelectScene';
import { DraftScene } from './scenes/DraftScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { TowerSelectBar } from './ui/TowerSelectBar';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
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
