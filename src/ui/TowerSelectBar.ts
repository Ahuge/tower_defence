import { CANVAS_WIDTH, GAME_HEIGHT, GRID_OFFSET_X } from '../config';
import { getTowerType } from '../data/TowerTypes';

export class TowerSelectBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Graphics[] = [];
  private selectedIndex: number = -1;
  private onSelect: (typeId: string | null) => void;
  private towerIds: string[];

  static readonly BAR_HEIGHT = 52;
  private static readonly BTN_SIZE = 40;
  private static readonly PADDING = 8;

  constructor(scene: Phaser.Scene, towerIds: string[], onSelect: (typeId: string | null) => void) {
    this.scene = scene;
    this.towerIds = towerIds;
    this.onSelect = onSelect;
    this.container = scene.add.container(0, GAME_HEIGHT + 28).setDepth(30);

    this.buildBar();
  }

  private buildBar(): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRect(GRID_OFFSET_X, 0, CANVAS_WIDTH - GRID_OFFSET_X, TowerSelectBar.BAR_HEIGHT);
    bg.lineStyle(1, 0x333333, 1);
    bg.lineBetween(GRID_OFFSET_X, 0, CANVAS_WIDTH, 0);
    this.container.add(bg);

    const { BTN_SIZE, PADDING } = TowerSelectBar;
    const startX = GRID_OFFSET_X + PADDING;

    for (let i = 0; i < this.towerIds.length; i++) {
      const t = getTowerType(this.towerIds[i]);
      const x = startX + i * (BTN_SIZE + PADDING);
      const y = 6;

      // Button background
      const btn = this.scene.add.graphics();
      this.container.add(btn);
      this.buttons.push(btn);

      // Click zone (Phaser Zone for reliable input)
      const idx = i;
      const zone = this.scene.add.zone(x + BTN_SIZE / 2, y + BTN_SIZE / 2, BTN_SIZE, BTN_SIZE);
      this.container.add(zone);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.highlight(idx));

      // Labels
      const hotkeyNum = String(i + 1);
      const label = this.scene.add.text(x + 2, y + 1, hotkeyNum, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace'
      });
      this.container.add(label);

      const costLabel = this.scene.add.text(x + BTN_SIZE / 2, y + BTN_SIZE - 2, `${t.cost}g`, {
        fontSize: '9px', color: '#ffdd44', fontFamily: 'monospace'
      }).setOrigin(0.5, 1);
      this.container.add(costLabel);

      const nameLabel = this.scene.add.text(x + BTN_SIZE / 2, y + BTN_SIZE / 2 - 2, t.name.substring(0, 5), {
        fontSize: '10px', color: '#ffffff', fontFamily: 'monospace'
      }).setOrigin(0.5, 0.5);
      this.container.add(nameLabel);
    }

    this.redraw();
  }

  highlight(index: number): void {
    if (index < 0 || index >= this.towerIds.length) return;

    if (index === this.selectedIndex) {
      this.deselect();
      return;
    }

    this.selectedIndex = index;
    this.redraw();
    this.onSelect(this.towerIds[index]);
  }

  deselect(): void {
    this.selectedIndex = -1;
    this.redraw();
    this.onSelect(null);
  }

  selectByIndex(index: number): boolean {
    if (index >= 0 && index < this.towerIds.length) {
      this.highlight(index);
      return true;
    }
    return false;
  }

  forceSelect(index: number): void {
    if (index < 0 || index >= this.towerIds.length) return;
    this.selectedIndex = index;
    this.redraw();
    this.onSelect(this.towerIds[index]);
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  private redraw(): void {
    const { BTN_SIZE, PADDING } = TowerSelectBar;
    const startX = GRID_OFFSET_X + PADDING;

    for (let i = 0; i < this.buttons.length; i++) {
      const t = getTowerType(this.towerIds[i]);
      const x = startX + i * (BTN_SIZE + PADDING);
      const y = 6;

      const btn = this.buttons[i];
      btn.clear();
      if (i === this.selectedIndex) {
        btn.fillStyle(t.color, 0.9);
        btn.fillRect(x, y, BTN_SIZE, BTN_SIZE);
        btn.lineStyle(2, 0xffffff, 1);
        btn.strokeRect(x, y, BTN_SIZE, BTN_SIZE);
      } else {
        btn.fillStyle(t.color, 0.4);
        btn.fillRect(x, y, BTN_SIZE, BTN_SIZE);
        btn.lineStyle(1, 0x555555, 0.6);
        btn.strokeRect(x, y, BTN_SIZE, BTN_SIZE);
      }
    }
  }
}
