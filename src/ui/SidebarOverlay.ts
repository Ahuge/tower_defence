import { SIDEBAR_WIDTH, GAME_HEIGHT } from '../config';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';
import { TowerSelectBar } from './TowerSelectBar';

/**
 * Collapsible sidebar overlay for tablet/phone mode.
 * On tablet: slides in from the left (360px wide).
 * On phone: full-screen overlay for maximum readability.
 * On desktop: not created — panels remain inline.
 */
export class SidebarOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scrim: Phaser.GameObjects.Graphics;
  private toggleBtn: Phaser.GameObjects.Text;
  private _visible = false;

  private readonly totalH: number;
  private readonly isPhone: boolean;
  private readonly panelW: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.isPhone = ResponsiveManager.isPhone();
    this.totalH = this.isPhone ? ResponsiveManager.canvasHeight() : GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;
    this.panelW = this.isPhone ? ResponsiveManager.canvasWidth() : SIDEBAR_WIDTH;

    // Semi-transparent scrim behind sidebar — covers game area
    this.scrim = scene.add.graphics().setDepth(39).setVisible(false);
    this.scrim.fillStyle(0x000000, this.isPhone ? 0.7 : 0.4);
    this.scrim.fillRect(0, 0, scene.scale.width, this.totalH);
    this.scrim.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, scene.scale.width, this.totalH),
      Phaser.Geom.Rectangle.Contains,
    );
    this.scrim.on('pointerdown', () => this.hide());

    // Sidebar container — starts off-screen
    this.container = scene.add.container(-this.panelW, 0).setDepth(40);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x0e0e12, 1);
    bg.fillRect(0, 0, this.panelW, this.totalH);
    if (!this.isPhone) {
      bg.lineStyle(1, 0x333333, 1);
      bg.lineBetween(this.panelW, 0, this.panelW, this.totalH);
    }
    this.container.add(bg);

    // Close button (phone: larger, top-right)
    if (this.isPhone) {
      const closeBtn = scene.add.text(this.panelW - 56, 8, '✕', {
        fontSize: UIScale.font(24), color: '#aaaaaa', fontFamily: 'monospace',
        backgroundColor: '#2a1a1a',
        padding: { x: 12, y: 6 },
      }).setInteractive({ useHandCursor: true });
      closeBtn.on('pointerdown', () => this.hide());
      closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
      closeBtn.on('pointerout', () => closeBtn.setColor('#aaaaaa'));
      this.container.add(closeBtn);
    }

    // Toggle button — always visible on game area
    this.toggleBtn = scene.add.text(8, 8, '\u2630', {
      fontSize: UIScale.font(22), color: '#aaaaaa', fontFamily: 'monospace',
      backgroundColor: '#1a1a1a',
      padding: { x: this.isPhone ? 10 : 6, y: this.isPhone ? 6 : 2 },
    }).setDepth(41).setInteractive({ useHandCursor: true });
    this.toggleBtn.on('pointerdown', () => this.toggle());
    this.toggleBtn.on('pointerover', () => this.toggleBtn.setColor('#ffffff'));
    this.toggleBtn.on('pointerout', () => this.toggleBtn.setColor('#aaaaaa'));
  }

  /** Add a Phaser Container (sidebar panel) into the overlay */
  addPanel(panel: Phaser.GameObjects.Container): void {
    this.container.add(panel);
  }

  show(): void {
    if (this._visible) return;
    this._visible = true;
    this.scrim.setVisible(true);
    this.scene.tweens.add({
      targets: this.container,
      x: 0,
      duration: 200,
      ease: 'Power2',
    });
  }

  hide(): void {
    if (!this._visible) return;
    this._visible = false;
    this.scrim.setVisible(false);
    this.scene.tweens.add({
      targets: this.container,
      x: -this.panelW,
      duration: 200,
      ease: 'Power2',
    });
  }

  toggle(): void {
    if (this._visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this._visible;
  }

  destroy(): void {
    this.container.destroy(true);
    this.scrim.destroy();
    this.toggleBtn.destroy();
  }
}
