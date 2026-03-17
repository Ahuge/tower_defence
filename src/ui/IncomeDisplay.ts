import { GAME_HEIGHT, GRID_OFFSET_X } from '../config';

export class IncomeDisplay {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.text = scene.add.text(GRID_OFFSET_X + 300, GAME_HEIGHT + 16, '', {
      fontSize: '12px', color: '#88ff88', fontFamily: 'monospace',
    }).setDepth(28);
  }

  update(breakdown: { base: number; sends: number; frontier: number; total: number }): void {
    this.text.setText(`Income: ${breakdown.total}/w (base:${breakdown.base} send:${breakdown.sends} frontier:${breakdown.frontier})`);
  }
}
