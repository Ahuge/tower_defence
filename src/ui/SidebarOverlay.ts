import { SIDEBAR_WIDTH, GAME_HEIGHT } from '../config';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { TowerSelectBar } from './TowerSelectBar';

/**
 * Collapsible sidebar overlay for tablet mode.
 * On tablet, sidebar panels slide in/out from the left edge.
 * On desktop, this is not created — panels remain inline.
 */
export class SidebarOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scrim: Phaser.GameObjects.Graphics;
  private toggleBtn: Phaser.GameObjects.Text;
  private _visible = false;

  private readonly totalH: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.totalH = GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT;

    // Semi-transparent scrim behind sidebar — covers game area
    this.scrim = scene.add.graphics().setDepth(39).setVisible(false);
    this.scrim.fillStyle(0x000000, 0.4);
    this.scrim.fillRect(0, 0, scene.scale.width, this.totalH);
    this.scrim.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, scene.scale.width, this.totalH),
      Phaser.Geom.Rectangle.Contains,
    );
    this.scrim.on('pointerdown', () => this.hide());

    // Sidebar container — starts off-screen to the left
    this.container = scene.add.container(-SIDEBAR_WIDTH, 0).setDepth(40);

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x0e0e12, 1);
    bg.fillRect(0, 0, SIDEBAR_WIDTH, this.totalH);
    bg.lineStyle(1, 0x333333, 1);
    bg.lineBetween(SIDEBAR_WIDTH, 0, SIDEBAR_WIDTH, this.totalH);
    this.container.add(bg);

    // Toggle button — always visible on game area
    this.toggleBtn = scene.add.text(8, 8, '\u2630', {
      fontSize: '22px', color: '#aaaaaa', fontFamily: 'monospace',
      backgroundColor: '#1a1a1a',
      padding: { x: 6, y: 2 },
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
      x: -SIDEBAR_WIDTH,
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
