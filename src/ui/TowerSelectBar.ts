import { GAME_HEIGHT, TILE_SIZE, getGridOffsetX, getCanvasWidth } from '../config';
import { getTowerType, TowerType } from '../data/TowerTypes';
import { hasTrait } from '../systems/traits/Trait';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';

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

  static readonly BAR_HEIGHT = 80; // fits both phone (62px btns) and desktop (52px btns)
  private readonly btnSize: number;
  private readonly padding: number;

  constructor(scene: Phaser.Scene, towerIds: string[], onSelect: (typeId: string | null) => void) {
    this.scene = scene;
    this.towerIds = towerIds;
    this.onSelect = onSelect;
    this.btnSize = UIScale.current.btnSize;
    this.padding = UIScale.current.btnPadding;
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
    const offsetX = getGridOffsetX();
    const canvasW = getCanvasWidth();
    bg.fillRect(offsetX, 0, canvasW - offsetX, TowerSelectBar.BAR_HEIGHT);
    bg.lineStyle(1, 0x333333, 1);
    bg.lineBetween(offsetX, 0, canvasW, 0);
    this.container.add(bg);

    const bs = this.btnSize;
    const pad = this.padding;
    const startX = offsetX + pad;
    const isPhone = UIScale.isPhone;
    const fontSize = UIScale.font(12);
    const costSize = UIScale.font(11);

    for (let i = 0; i < this.towerIds.length; i++) {
      const t = getTowerType(this.towerIds[i]);
      const x = startX + i * (bs + pad);
      const y = 6;

      const btn = this.scene.add.graphics();
      this.container.add(btn);
      this.buttons.push(btn);

      const idx = i;
      const zone = this.scene.add.zone(x + bs / 2, y + bs / 2, bs, bs);
      this.container.add(zone);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.highlight(idx));
      zone.on('pointerover', () => this.showTooltip(idx));
      zone.on('pointerout', () => this.hideTooltip());
      // Touch: long-press shows tooltip (since there's no hover on touch)
      if (isPhone) {
        let holdTimer: ReturnType<typeof setTimeout> | null = null;
        zone.on('pointerdown', () => {
          holdTimer = setTimeout(() => { this.showTooltip(idx); holdTimer = null; }, 400);
        });
        zone.on('pointerup', () => {
          if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
          this.scene.time.delayedCall(2000, () => this.hideTooltip());
        });
      }

      if (!isPhone) {
        const hotkeyNum = String(i + 1);
        const label = this.scene.add.text(x + 2, y + 1, hotkeyNum, {
          fontSize, color: '#aaaaaa', fontFamily: 'monospace'
        });
        this.container.add(label);
      }

      const costLabel = this.scene.add.text(x + bs / 2, y + bs - 2, `${t.cost}g`, {
        fontSize: costSize, color: '#ffdd44', fontFamily: 'monospace'
      }).setOrigin(0.5, 1);
      this.container.add(costLabel);

      const nameLabel = this.scene.add.text(x + bs / 2, y + bs / 2 - 2, t.name.substring(0, isPhone ? 4 : 5), {
        fontSize, color: '#ffffff', fontFamily: 'monospace'
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
    const startX = getGridOffsetX() + this.padding;
    const btnX = startX + index * (this.btnSize + this.padding);
    const barY = GAME_HEIGHT + 28;

    let tx = btnX;
    const canvasW = getCanvasWidth();
    if (tx + textW > canvasW) tx = canvasW - textW;
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
    const bs = this.btnSize;
    const startX = getGridOffsetX() + this.padding;

    for (let i = 0; i < this.buttons.length; i++) {
      const t = getTowerType(this.towerIds[i]);
      const x = startX + i * (bs + this.padding);
      const y = 6;

      const btn = this.buttons[i];
      btn.clear();
      if (i === this.selectedIndex) {
        btn.fillStyle(t.color, 0.9);
        btn.fillRect(x, y, bs, bs);
        btn.lineStyle(2, 0xffffff, 1);
        btn.strokeRect(x, y, bs, bs);
      } else {
        btn.fillStyle(t.color, 0.4);
        btn.fillRect(x, y, bs, bs);
        btn.lineStyle(1, 0x555555, 0.6);
        btn.strokeRect(x, y, bs, bs);
      }
    }
  }
}
