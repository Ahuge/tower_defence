import { GAME_HEIGHT, getCanvasWidth } from '../config';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { TowerSelectBar } from './TowerSelectBar';

export class IncomeDisplay {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const isPhone = UIScale.isPhone;
    const canvasH = ResponsiveManager.canvasHeight();
    // On phone: own line above status bar. On desktop: in tower bar area top-right.
    const incY = isPhone
      ? canvasH - TowerSelectBar.BAR_HEIGHT - 70 - 4
      : GAME_HEIGHT + 28 + 8;
    this.text = scene.add.text(isPhone ? 8 : getCanvasWidth() - 10, incY, '', {
      fontSize: isPhone ? '22px' : '11px', color: '#88ff88', fontFamily: 'monospace',
    }).setDepth(31).setOrigin(isPhone ? 0 : 1, 0);
  }

  update(breakdown: { base: number; sends: number; frontier: number; total: number }): void {
    this.text.setText(`Income: ${breakdown.total}/w (base:${breakdown.base} send:${breakdown.sends} frontier:${breakdown.frontier})`);
  }
}
