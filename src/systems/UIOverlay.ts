import { GAME_HEIGHT, GRID_OFFSET_X } from '../config';
import { EventBus } from './EventBus';

export class UIOverlay {
  private goldText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private waveText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, _events: EventBus) {
    const uiStyle = { fontSize: '14px', color: '#ffffff', fontFamily: 'monospace' };
    const baseX = GRID_OFFSET_X;
    this.goldText = scene.add.text(baseX + 8, GAME_HEIGHT + 4, '', uiStyle).setDepth(30);
    this.livesText = scene.add.text(baseX + 160, GAME_HEIGHT + 4, '', uiStyle).setDepth(30);
    this.waveText = scene.add.text(baseX + 300, GAME_HEIGHT + 4, '', uiStyle).setDepth(30);
    this.statusText = scene.add.text(baseX + 480, GAME_HEIGHT + 4, '', uiStyle).setDepth(30);
  }

  update(gold: number, lives: number, currentWave: number, totalWaves: number, waveActive: boolean, betweenWaves: boolean): void {
    this.goldText.setText(`Gold: ${gold}`);
    this.livesText.setText(`Lives: ${lives}`);
    this.waveText.setText(`Wave: ${currentWave}/${totalWaves}`);

    if (betweenWaves && currentWave < totalWaves && lives > 0) {
      this.statusText.setText('[SPACE] Start Next Wave');
    } else if (waveActive) {
      this.statusText.setText('Wave in progress...');
    }
  }

  setStatus(text: string): void {
    this.statusText.setText(text);
  }
}
