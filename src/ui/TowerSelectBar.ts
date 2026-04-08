import { GAME_HEIGHT, TILE_SIZE, getGridOffsetX, getCanvasWidth } from '../config';
import { getTowerType, TowerType } from '../data/TowerTypes';
import { hasTrait } from '../systems/traits/Trait';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { GameControlBar } from './GameControlBar';
import { UIScale } from '../systems/UIScale';
import { hasTowerSprite, getTowerSpriteConfig, isMobileTowerSprite, getMobileSpriteConfig } from '../systems/SpriteManager';
import { uiText, uiGraphics, uiZone, uiSprite } from '../systems/UILayer';

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

  private static _barHeight: number = 96;
  static get BAR_HEIGHT(): number { return TowerSelectBar._barHeight; }
  private readonly btnSize: number;
  private readonly padding: number;

  constructor(scene: Phaser.Scene, towerIds: string[], onSelect: (typeId: string | null) => void) {
    this.scene = scene;
    this.towerIds = towerIds;
    this.onSelect = onSelect;

    if (UIScale.isPhone) {
      // Responsive: size buttons to fill available width
      const availW = getCanvasWidth() - getGridOffsetX();
      const pad = 6;
      const bs = Math.floor((availW - pad) / towerIds.length) - pad;
      this.btnSize = Math.min(bs, 160); // cap so they don't get absurdly large
      this.padding = pad;
      TowerSelectBar._barHeight = this.btnSize + 24; // btn + top/bottom margin
    } else {
      this.btnSize = UIScale.current.btnSize;
      this.padding = UIScale.current.btnPadding;
      TowerSelectBar._barHeight = 96;
    }
    // On phone: anchor to bottom of canvas. On desktop: below game area.
    const canvasH = ResponsiveManager.canvasHeight();
    const barY = UIScale.isPhone
      ? canvasH - TowerSelectBar.BAR_HEIGHT - GameControlBar.BAR_HEIGHT - UIScale.current.bottomSafeMargin
      : GAME_HEIGHT + 28;
    this.container = scene.add.container(0, barY).setDepth(30);

    // Tooltip (rendered above the bar)
    this.tooltip = scene.add.container(0, 0).setDepth(35).setVisible(false);
    this.tooltipBg = uiGraphics(scene);
    this.tooltip.add(this.tooltipBg);
    const ttPad = UIScale.space(8);
    this.tooltipText = uiText(scene, ttPad, ttPad - 2, '', {
      fontSize: UIScale.font(14), color: '#dddddd', fontFamily: 'monospace',
      lineSpacing: UIScale.space(3),
    });
    this.tooltip.add(this.tooltipText);

    this.buildBar();
  }

  private buildBar(): void {
    const bg = uiGraphics(this.scene);
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

      const btn = uiGraphics(this.scene);
      this.container.add(btn);
      this.buttons.push(btn);

      const idx = i;
      const zone = uiZone(this.scene,x + bs / 2, y + bs / 2, bs, bs);
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
        const label = uiText(this.scene,x + 2, y + 1, hotkeyNum, {
          fontSize, color: '#aaaaaa', fontFamily: 'monospace'
        });
        this.container.add(label);
      }

      // Cost label at bottom of button
      const costH = isPhone ? 20 : 12; // reserve space for cost text
      const costLabel = uiText(this.scene,x + bs / 2, y + bs - 2, `${t.cost}g`, {
        fontSize: costSize, color: '#ffdd44', fontFamily: 'monospace'
      }).setOrigin(0.5, 1);
      this.container.add(costLabel);

      // Icon area: button minus cost label space
      const iconMaxSz = bs - costH - 8; // leave room for cost + margin
      const iconCenterY = y + (bs - costH) / 2;

      // Show tower sprite icon if available, otherwise text label
      const towerId = this.towerIds[i];
      if (hasTowerSprite(towerId) && !isMobileTowerSprite(towerId)) {
        const cfg = getTowerSpriteConfig(towerId);
        if (cfg && this.scene.textures.exists(cfg.sheetKey)) {
          const frameIndex = cfg.rows.idle * cfg.totalCols + cfg.column;
          const icon = uiSprite(this.scene,x + bs / 2, iconCenterY, cfg.sheetKey, frameIndex);
          icon.setScale(iconMaxSz / 64);
          icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          this.container.add(icon);
        }
      } else if (isMobileTowerSprite(towerId)) {
        const cfg = getMobileSpriteConfig(towerId);
        if (cfg && this.scene.textures.exists(cfg.sheetKey)) {
          const icon = uiSprite(this.scene,x + bs / 2, iconCenterY, cfg.sheetKey, 0);
          icon.setScale(iconMaxSz / cfg.frameWidth);
          icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          this.container.add(icon);
        }
      } else {
        const nameLabel = uiText(this.scene,x + bs / 2, iconCenterY, t.name.substring(0, isPhone ? 4 : 5), {
          fontSize, color: '#ffffff', fontFamily: 'monospace'
        }).setOrigin(0.5, 0.5);
        this.container.add(nameLabel);
      }
    }

    this.redraw();
  }

  private showTooltip(index: number): void {
    const t = getTowerType(this.towerIds[index]);
    const lines = this.buildTooltipText(t);

    this.tooltipText.setText(lines);

    const ttPad = UIScale.space(8);
    const textW = this.tooltipText.width + ttPad * 2;
    const textH = this.tooltipText.height + ttPad * 2 - 4;

    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(0x111111, 0.95);
    this.tooltipBg.fillRect(0, 0, textW, textH);
    this.tooltipBg.lineStyle(1, 0x555555, 1);
    this.tooltipBg.strokeRect(0, 0, textW, textH);

    // Position above the button — use the actual container Y, not hardcoded GAME_HEIGHT
    const startX = getGridOffsetX() + this.padding;
    const btnX = startX + index * (this.btnSize + this.padding);
    const barY = this.container.y; // actual bar position (different on phone vs desktop)

    let tx = btnX;
    const canvasW = getCanvasWidth();
    if (tx + textW > canvasW) tx = canvasW - textW - 4;
    if (tx < 4) tx = 4;
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
