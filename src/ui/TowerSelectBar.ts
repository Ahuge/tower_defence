import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getTowerType } from '../data/TowerTypes';

export class TowerSelectBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Graphics[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private selectedIndex: number = 0;
  private onSelect: (typeId: string) => void;
  private towerIds: string[];

  static readonly BAR_HEIGHT = 52;

  constructor(scene: Phaser.Scene, towerIds: string[], onSelect: (typeId: string) => void) {
    this.scene = scene;
    this.towerIds = towerIds;
    this.onSelect = onSelect;
    this.container = scene.add.container(0, GAME_HEIGHT + 28).setDepth(30);

    this.buildBar();
    this.highlight(0);
  }

  private buildBar(): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, TowerSelectBar.BAR_HEIGHT);
    bg.lineStyle(1, 0x333333, 1);
    bg.lineBetween(0, 0, GAME_WIDTH, 0);
    this.container.add(bg);

    const btnSize = 40;
    const padding = 8;
    const startX = padding;

    for (let i = 0; i < this.towerIds.length; i++) {
      const t = getTowerType(this.towerIds[i]);
      const x = startX + i * (btnSize + padding);
      const y = 6;

      const btn = this.scene.add.graphics();
      btn.fillStyle(t.color, 0.6);
      btn.fillRect(x, y, btnSize, btnSize);
      btn.lineStyle(2, 0x555555, 1);
      btn.strokeRect(x, y, btnSize, btnSize);
      this.container.add(btn);
      this.buttons.push(btn);

      // Hotkey label
      const hotkeyNum = String(i + 1);
      const label = this.scene.add.text(x + 2, y + 1, hotkeyNum, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace'
      });
      this.container.add(label);

      // Cost label
      const costLabel = this.scene.add.text(x + btnSize / 2, y + btnSize - 2, `${t.cost}g`, {
        fontSize: '9px', color: '#ffdd44', fontFamily: 'monospace'
      }).setOrigin(0.5, 1);
      this.container.add(costLabel);

      // Name label
      const nameLabel = this.scene.add.text(x + btnSize / 2, y + btnSize / 2 - 2, t.name.substring(0, 5), {
        fontSize: '10px', color: '#ffffff', fontFamily: 'monospace'
      }).setOrigin(0.5, 0.5);
      this.container.add(nameLabel);
      this.labels.push(nameLabel);
    }
  }

  highlight(index: number): void {
    if (index < 0 || index >= this.towerIds.length) return;
    this.selectedIndex = index;
    const btnSize = 40;
    const padding = 8;
    const startX = padding;

    for (let i = 0; i < this.buttons.length; i++) {
      const t = getTowerType(this.towerIds[i]);
      const x = startX + i * (btnSize + padding);
      const y = 6;

      const btn = this.buttons[i];
      btn.clear();
      if (i === index) {
        btn.fillStyle(t.color, 0.9);
        btn.fillRect(x, y, btnSize, btnSize);
        btn.lineStyle(2, 0xffffff, 1);
        btn.strokeRect(x, y, btnSize, btnSize);
      } else {
        btn.fillStyle(t.color, 0.4);
        btn.fillRect(x, y, btnSize, btnSize);
        btn.lineStyle(1, 0x555555, 0.6);
        btn.strokeRect(x, y, btnSize, btnSize);
      }
    }

    this.onSelect(this.towerIds[index]);
  }

  selectByIndex(index: number): boolean {
    if (index >= 0 && index < this.towerIds.length) {
      this.highlight(index);
      return true;
    }
    return false;
  }
}
