import { GAME_HEIGHT, getCanvasWidth } from '../config';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { TowerSelectBar } from './TowerSelectBar';
import { uiText } from '../systems/UILayer';

export class IncomeDisplay {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const canvasH = ResponsiveManager.canvasHeight();
    // On phone: own line above status bar. On desktop: in tower bar area top-right.
    const incY = UIScale.isPhone
      ? canvasH - TowerSelectBar.BAR_HEIGHT - 70 - 4 - UIScale.current.bottomSafeMargin
      : GAME_HEIGHT + 28 + 8;
    const incX = UIScale.isPhone ? 8 : getCanvasWidth() - 10;
    this.text = uiText(scene, incX, incY, '', {
      fontSize: UIScale.fontCapped(11, 22), color: '#88ff88', fontFamily: 'monospace',
    }).setDepth(31).setOrigin(UIScale.isPhone ? 0 : 1, 0);
  }

  update(breakdown: { base: number; sends: number; frontier: number; total: number }): void {
    this.text.setText(`Income: ${breakdown.total}/w (base:${breakdown.base} send:${breakdown.sends} frontier:${breakdown.frontier})`);
  }
}
