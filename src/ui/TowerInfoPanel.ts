import { TILE_SIZE, GAME_WIDTH } from '../config';
import { Tower } from '../entities/Tower';
import { hasTrait, getTrait } from '../systems/traits/Trait';

export class TowerInfoPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private upgradeText: Phaser.GameObjects.Text;
  private rangeCircle: Phaser.GameObjects.Graphics;
  private visible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(25).setVisible(false);

    this.bg = scene.add.graphics();
    this.container.add(this.bg);

    const style = { fontSize: '11px', color: '#ffffff', fontFamily: 'monospace' };
    this.nameText = scene.add.text(8, 4, '', { ...style, fontSize: '13px', color: '#ffdd44' });
    this.statsText = scene.add.text(8, 22, '', style);
    this.upgradeText = scene.add.text(8, 56, '', { ...style, color: '#88ff88' });
    this.container.add([this.nameText, this.statsText, this.upgradeText]);

    this.rangeCircle = scene.add.graphics().setDepth(19);
  }

  show(tower: Tower): void {
    this.visible = true;
    this.container.setVisible(true);

    this.nameText.setText(`${tower.typeDef.name} Lv${tower.level}`);

    // Build stats line from traits
    let stats = `DMG: ${tower.damage}  RNG: ${(tower.range / TILE_SIZE).toFixed(1)}  SPD: ${tower.fireRate}ms`;

    const splashTrait = getTrait(tower.traits, 'splash_damage');
    if (splashTrait) stats += `  Splash: ${((splashTrait.radius ?? 0) / TILE_SIZE).toFixed(1)}`;

    const slowTrait = getTrait(tower.traits, 'slow_on_hit');
    if (slowTrait) stats += `  Slow: ${Math.round((slowTrait.factor ?? 1) * 100)}%`;

    if (hasTrait(tower.traits, 'chain_damage')) stats += '  Chain';
    if (hasTrait(tower.traits, 'teleport_delivery')) stats += '  Teleport';
    if (hasTrait(tower.traits, 'damage_variance')) stats += '  Variance';
    if (hasTrait(tower.traits, 'gold_on_hit')) stats += '  Gold/hit';
    if (hasTrait(tower.traits, 'ramp_up')) stats += '  Ramp-up';
    if (hasTrait(tower.traits, 'adjacency_buff')) stats += '  Aura';

    this.statsText.setText(stats);

    if (tower.canUpgrade()) {
      const cost = tower.getUpgradeCost();
      this.upgradeText.setText(`Upgrade: ${cost}g (click tower) | Sell: ${tower.getSellValue()}g (right-click)`);
    } else {
      this.upgradeText.setText(`MAX LEVEL | Sell: ${tower.getSellValue()}g (right-click)`);
    }

    const panelW = 340;
    const panelH = 76;
    let px = tower.x + TILE_SIZE;
    let py = tower.y - panelH / 2;
    if (px + panelW > GAME_WIDTH) px = tower.x - TILE_SIZE - panelW;
    if (py < 0) py = 0;

    this.container.setPosition(px, py);
    this.bg.clear();
    this.bg.fillStyle(0x111111, 0.9);
    this.bg.fillRect(0, 0, panelW, panelH);
    this.bg.lineStyle(1, 0x555555, 1);
    this.bg.strokeRect(0, 0, panelW, panelH);

    this.rangeCircle.clear();
    this.rangeCircle.lineStyle(1, 0xffffff, 0.2);
    this.rangeCircle.strokeCircle(tower.x, tower.y, tower.range);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.setVisible(false);
    this.rangeCircle.clear();
  }

  isVisible(): boolean {
    return this.visible;
  }
}
