import { GAME_HEIGHT, GRID_OFFSET_X, CANVAS_WIDTH } from '../config';
import { EventBus } from './EventBus';

export class UIOverlay {
  private goldText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private waveText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private speedText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, _events: EventBus) {
    const uiStyle = { fontSize: '16px', color: '#ffffff', fontFamily: 'monospace' };
    const baseX = GRID_OFFSET_X;
    this.goldText = scene.add.text(baseX + 8, GAME_HEIGHT + 4, '', uiStyle).setDepth(30);
    this.livesText = scene.add.text(baseX + 160, GAME_HEIGHT + 4, '', uiStyle).setDepth(30);
    this.waveText = scene.add.text(baseX + 300, GAME_HEIGHT + 4, '', uiStyle).setDepth(30);
    this.statusText = scene.add.text(baseX + 480, GAME_HEIGHT + 4, '', uiStyle).setDepth(30);
    this.speedText = scene.add.text(CANVAS_WIDTH - 8, GAME_HEIGHT + 4, '', {
      ...uiStyle, fontSize: '16px', color: '#aaaaaa',
    }).setDepth(30).setOrigin(1, 0);
  }

  update(gold: number, lives: number, currentWave: number, totalWaves: number, waveActive: boolean, betweenWaves: boolean, gameSpeed: number = 1, versusTimer: number = -1): void {
    this.goldText.setText(`Gold: ${gold}`);
    this.livesText.setText(`Lives: ${lives}`);
    this.waveText.setText(`Wave: ${currentWave}/${totalWaves}`);

    if (betweenWaves && currentWave < totalWaves && lives > 0) {
      if (versusTimer >= 0) {
        this.statusText.setText(`[SPACE] Ready (${versusTimer}s)`);
      } else {
        this.statusText.setText('[SPACE] Start Next Wave');
      }
    } else if (waveActive) {
      this.statusText.setText('Wave in progress...');
    }

    // Speed indicator
    const speedColor = gameSpeed === 0 ? '#ff4444' : gameSpeed === 1 ? '#aaaaaa' : '#ffdd44';
    this.speedText.setColor(speedColor);
    this.speedText.setText(`[TAB] ${gameSpeed}x`);
  }

  setStatus(text: string): void {
    this.statusText.setText(text);
  }
}
