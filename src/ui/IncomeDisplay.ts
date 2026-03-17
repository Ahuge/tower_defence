import { GAME_HEIGHT, CANVAS_WIDTH } from '../config';
import { TowerSelectBar } from './TowerSelectBar';

export class IncomeDisplay {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Position in the tower bar area, top-right
    const barY = GAME_HEIGHT + 28;
    this.text = scene.add.text(CANVAS_WIDTH - 10, barY + 8, '', {
      fontSize: '11px', color: '#88ff88', fontFamily: 'monospace',
    }).setDepth(31).setOrigin(1, 0);
  }

  update(breakdown: { base: number; sends: number; frontier: number; total: number }): void {
    this.text.setText(`Income: ${breakdown.total}/w (base:${breakdown.base} send:${breakdown.sends} frontier:${breakdown.frontier})`);
  }
}
