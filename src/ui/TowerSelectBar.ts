import { CANVAS_WIDTH, GAME_HEIGHT, GRID_OFFSET_X, TILE_SIZE } from '../config';
import { getTowerType, TowerType } from '../data/TowerTypes';
import { hasTrait } from '../systems/traits/Trait';

export class TowerSelectBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private buttons: Phaser.GameObjects.Graphics[] = [];
  private selectedIndex: number = -1;
  private onSelect: (typeId: string | null) => void;
  private towerIds: string[];
  private tooltip: Phaser.GameObjects.Container;
  private tooltipBg: Phaser.GameObjects.Graphics;
  private tooltipText: Phaser.GameObjects.Text;

  static readonly BAR_HEIGHT = 68;
  private static readonly BTN_SIZE = 52;
  private static readonly PADDING = 10;

  constructor(scene: Phaser.Scene, towerIds: string[], onSelect: (typeId: string | null) => void) {
    this.scene = scene;
    this.towerIds = towerIds;
    this.onSelect = onSelect;
    this.container = scene.add.container(0, GAME_HEIGHT + 28).setDepth(30);

    // Tooltip (rendered above the bar)
    this.tooltip = scene.add.container(0, 0).setDepth(35).setVisible(false);
    this.tooltipBg = scene.add.graphics();
    this.tooltip.add(this.tooltipBg);
    this.tooltipText = scene.add.text(8, 6, '', {
      fontSize: '12px', color: '#dddddd', fontFamily: 'monospace',
      lineSpacing: 3,
    });
    this.tooltip.add(this.tooltipText);

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

      const btn = this.scene.add.graphics();
      this.container.add(btn);
      this.buttons.push(btn);

      const idx = i;
      const zone = this.scene.add.zone(x + BTN_SIZE / 2, y + BTN_SIZE / 2, BTN_SIZE, BTN_SIZE);
      this.container.add(zone);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.highlight(idx));
      zone.on('pointerover', () => this.showTooltip(idx));
      zone.on('pointerout', () => this.hideTooltip());

      const hotkeyNum = String(i + 1);
      const label = this.scene.add.text(x + 2, y + 1, hotkeyNum, {
        fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace'
      });
      this.container.add(label);

      const costLabel = this.scene.add.text(x + BTN_SIZE / 2, y + BTN_SIZE - 2, `${t.cost}g`, {
        fontSize: '11px', color: '#ffdd44', fontFamily: 'monospace'
      }).setOrigin(0.5, 1);
      this.container.add(costLabel);

      const nameLabel = this.scene.add.text(x + BTN_SIZE / 2, y + BTN_SIZE / 2 - 2, t.name.substring(0, 5), {
        fontSize: '12px', color: '#ffffff', fontFamily: 'monospace'
      }).setOrigin(0.5, 0.5);
      this.container.add(nameLabel);
    }

    this.redraw();
  }

  private showTooltip(index: number): void {
    const t = getTowerType(this.towerIds[index]);
    const lines = this.buildTooltipText(t);

    this.tooltipText.setText(lines);

    const textW = this.tooltipText.width + 16;
    const textH = this.tooltipText.height + 12;

    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(0x111111, 0.95);
    this.tooltipBg.fillRect(0, 0, textW, textH);
    this.tooltipBg.lineStyle(1, 0x555555, 1);
    this.tooltipBg.strokeRect(0, 0, textW, textH);

    // Position above the button
    const { BTN_SIZE, PADDING } = TowerSelectBar;
    const startX = GRID_OFFSET_X + PADDING;
    const btnX = startX + index * (BTN_SIZE + PADDING);
    const barY = GAME_HEIGHT + 28;

    let tx = btnX;
    if (tx + textW > CANVAS_WIDTH) tx = CANVAS_WIDTH - textW;
    const ty = barY - textH - 4;

    this.tooltip.setPosition(tx, ty);
    this.tooltip.setVisible(true);
  }

  private hideTooltip(): void {
    this.tooltip.setVisible(false);
  }

  private buildTooltipText(t: TowerType): string {
    const lines: string[] = [];
    lines.push(`${t.name} (${t.cost}g)`);
    lines.push(t.description);
    lines.push(`DMG: ${t.damage}  RNG: ${t.range}  SPD: ${t.fireRate}ms`);
    lines.push(`Type: ${t.damageType}`);

    // Trait summary
    const traitNames: string[] = [];
    for (const trait of t.traits) {
      switch (trait.id) {
        case 'splash_damage': traitNames.push(`Splash (${(trait.radius / TILE_SIZE).toFixed(1)} tiles)`); break;
        case 'chain_damage': traitNames.push(`Chain (${trait.chainCount + 1} targets)`); break;
        case 'teleport_delivery': traitNames.push('Teleport'); break;
        case 'slow_on_hit': traitNames.push(`Slow (${Math.round(trait.factor * 100)}%, ${(trait.duration / 1000).toFixed(1)}s)`); break;
        case 'gold_on_hit': traitNames.push(`+${trait.amount}g/hit`); break;
        case 'damage_variance': traitNames.push(`Variance (${Math.round(trait.min * 100)}-${Math.round(trait.max * 100)}%)`); break;
        case 'ramp_up': traitNames.push('Ramp-up'); break;
        case 'adjacency_buff': traitNames.push('Adjacency aura'); break;
        case 'direct_damage': break; // don't show
        default: break;
      }
    }
    if (traitNames.length > 0) {
      lines.push('Traits: ' + traitNames.join(', '));
    }

    if (t.upgrades.length > 0) {
      lines.push(`Upgrades: ${t.upgrades.length} levels`);
    }

    return lines.join('\n');
  }

  /** Rebuild the bar with new tower IDs (for Random faction rotation) */
  setTowerIds(ids: string[]): void {
    this.towerIds = ids;
    this.selectedIndex = -1;
    this.buttons = [];
    this.container.removeAll(true);
    this.buildBar();
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
