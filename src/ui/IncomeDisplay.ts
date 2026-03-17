import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class IncomeDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(28);

    this.text = scene.add.text(300, GAME_HEIGHT + 16, '', {
      fontSize: '10px', color: '#88ff88', fontFamily: 'monospace',
    });
    this.container.add(this.text);
  }

  update(breakdown: { base: number; sends: number; frontier: number; total: number }): void {
    this.text.setText(`Income: ${breakdown.total}/w (base:${breakdown.base} send:${breakdown.sends} frontier:${breakdown.frontier})`);
  }
}
