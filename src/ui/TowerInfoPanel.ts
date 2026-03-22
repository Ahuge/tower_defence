import { TILE_SIZE, getGridOffsetX, getCanvasWidth } from '../config';
import { Tower } from '../entities/Tower';
import { hasTrait, getTrait } from '../systems/traits/Trait';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';

export class TowerInfoPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private buffText: Phaser.GameObjects.Text;
  private traitsText: Phaser.GameObjects.Text;
  private upgradeText: Phaser.GameObjects.Text;
  private upgradeBtn: Phaser.GameObjects.Text;
  private sellBtn: Phaser.GameObjects.Text;
  private rangeCircle: Phaser.GameObjects.Graphics;
  private visible: boolean = false;
  private onUpgrade: ((tower: Tower) => void) | null = null;
  private onSell: ((tower: Tower) => void) | null = null;
  private currentTower: Tower | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(29).setVisible(false);

    this.bg = scene.add.graphics();
    this.container.add(this.bg);

    const s = UIScale.current;
    const pad = s.padding;
    this.nameText = scene.add.text(pad, pad, '', { fontSize: s.fontHeading, color: '#ffdd44', fontFamily: 'monospace' });
    this.statsText = scene.add.text(pad, pad + UIScale.space(18), '', { fontSize: s.fontBody, color: '#ffffff', fontFamily: 'monospace' });
    this.buffText = scene.add.text(pad, pad + UIScale.space(32), '', { fontSize: s.fontBody, color: '#88ff88', fontFamily: 'monospace' });
    this.traitsText = scene.add.text(pad, pad + UIScale.space(46), '', { fontSize: s.fontBody, color: '#aaaaaa', fontFamily: 'monospace' });
    this.upgradeText = scene.add.text(pad, pad + UIScale.space(62), '', { fontSize: s.fontBody, color: '#88ff88', fontFamily: 'monospace' });
    this.container.add([this.nameText, this.statsText, this.buffText, this.traitsText, this.upgradeText]);

    // Action buttons
    const btnPadding = { x: UIScale.space(8), y: UIScale.space(4) };
    this.upgradeBtn = scene.add.text(pad, 0, '[ Upgrade ]', {
      fontSize: s.fontHeading, color: '#44ff44', fontFamily: 'monospace',
      backgroundColor: '#1a2a1a', padding: btnPadding,
    }).setInteractive({ useHandCursor: true });
    this.upgradeBtn.on('pointerdown', () => {
      if (this.currentTower && this.onUpgrade) this.onUpgrade(this.currentTower);
    });
    this.container.add(this.upgradeBtn);

    this.sellBtn = scene.add.text(UIScale.space(120), 0, '[ Sell ]', {
      fontSize: s.fontHeading, color: '#ff8844', fontFamily: 'monospace',
      backgroundColor: '#2a1a1a', padding: btnPadding,
    }).setInteractive({ useHandCursor: true });
    this.sellBtn.on('pointerdown', () => {
      if (this.currentTower && this.onSell) this.onSell(this.currentTower);
    });

    // Close button (phone only)
    if (UIScale.isPhone) {
      const closeBtn = scene.add.text(UIScale.space(240), 0, '[ Close ]', {
        fontSize: s.fontHeading, color: '#aaaaaa', fontFamily: 'monospace',
        backgroundColor: '#222222', padding: btnPadding,
      }).setInteractive({ useHandCursor: true });
      closeBtn.on('pointerdown', () => this.hide());
      this.container.add(closeBtn);
    }
    this.container.add(this.sellBtn);

    this.rangeCircle = scene.add.graphics().setDepth(19);
  }

  setCallbacks(onUpgrade: (tower: Tower) => void, onSell: (tower: Tower) => void): void {
    this.onUpgrade = onUpgrade;
    this.onSell = onSell;
  }

  show(tower: Tower): void {
    this.visible = true;
    this.currentTower = tower;
    this.container.setVisible(true);

    // Name + level
    const ultTag = tower.typeDef.ultimate ? ' [ULTIMATE]' : '';
    this.nameText.setText(`${tower.typeDef.name} Lv${tower.level}${ultTag}`);

    // Base stats
    const baseDmg = tower.damage;
    const baseRate = tower.fireRate;
    const baseRange = tower.range / TILE_SIZE;

    this.statsText.setText(
      `DMG: ${baseDmg}  RNG: ${baseRange.toFixed(1)}  SPD: ${baseRate}ms  [${tower.damageType}]`
    );

    // Aura buff display — adjacency, harmonic, faction, spell amp, overclock
    const adjDmg = getTrait(tower.traits, '_adj_damage_buff');
    const adjRate = getTrait(tower.traits, '_adj_rate_buff');
    const spellAmp = getTrait(tower.traits, '_spell_amp_buff');
    const overclock = getTrait(tower.traits, '_overclock_buff');
    const harmDmg = getTrait(tower.traits, '_harmonic_damage');
    const harmRate = getTrait(tower.traits, '_harmonic_rate');
    const harmRange = getTrait(tower.traits, '_harmonic_range');
    const harmCrit = getTrait(tower.traits, '_harmonic_crit');
    const factionRate = getTrait(tower.traits, '_faction_rate_buff');
    const buffs: string[] = [];

    if (adjDmg && adjDmg.bonus > 0) buffs.push(`+${adjDmg.bonus} DMG (adj)`);
    if (adjRate && adjRate.bonus > 0) buffs.push(`-${Math.round(adjRate.bonus * 100)}% SPD (adj)`);
    if (harmDmg && harmDmg.bonus > 0) buffs.push(`+${Math.round(harmDmg.bonus * 100)}% DMG`);
    if (harmRate && harmRate.bonus > 0) buffs.push(`-${Math.round(harmRate.bonus * 100)}% SPD`);
    if (harmRange && harmRange.bonus > 0) buffs.push(`+${(harmRange.bonus / TILE_SIZE).toFixed(1)} RNG`);
    if (harmCrit && (harmCrit.chance ?? 0) > 0) buffs.push(`${Math.round((harmCrit.chance ?? 0) * 100)}% crit`);
    if (factionRate && factionRate.bonus > 0) buffs.push(`-${Math.round(factionRate.bonus * 100)}% SPD (faction)`);
    if (spellAmp && spellAmp.bonus > 0) buffs.push(`+${Math.round(spellAmp.bonus * 100)}% magic`);
    if (overclock && overclock.bonus > 0) buffs.push(`-${Math.round(overclock.bonus * 100)}% SPD (OC)`);
    this.buffText.setText(buffs.length > 0 ? buffs.join('  ') : '');

    // Trait summary
    const traitNames: string[] = [];
    for (const trait of tower.typeDef.traits) {
      switch (trait.id) {
        case 'splash_damage': traitNames.push(`Splash ${((trait.radius ?? 0) / TILE_SIZE).toFixed(1)}`); break;
        case 'chain_damage': traitNames.push(`Chain ${(trait.chainCount ?? 2) + 1}`); break;
        case 'teleport_delivery': traitNames.push('Teleport'); break;
        case 'slow_on_hit': traitNames.push(`Slow ${Math.round((1 - (trait.factor ?? 1)) * 100)}%`); break;
        case 'gold_on_hit': traitNames.push(`+${trait.amount}g/hit`); break;
        case 'damage_variance': traitNames.push(`Var ${Math.round((trait.min ?? 0.5) * 100)}-${Math.round((trait.max ?? 1.5) * 100)}%`); break;
        case 'ramp_up': traitNames.push('Ramp-up'); break;
        case 'adjacency_buff': traitNames.push('Adj. aura'); break;
        case 'crit_chance': traitNames.push(`${Math.round((trait.chance ?? 0.25) * 100)}% crit x${trait.multiplier ?? 3}`); break;
        case 'jackpot': traitNames.push(`${Math.round((trait.killChance ?? 0.08) * 100)}% kill / ${Math.round((trait.missChance ?? 0.25) * 100)}% miss`); break;
        case 'burn_dot': traitNames.push(`Burn ${trait.dps}dps`); break;
        case 'poison_dot': traitNames.push(`Poison ${Math.round((trait.percentPerSec ?? 0.02) * 100)}%/s`); break;
        case 'pierce_delivery': traitNames.push('Pierce line'); break;
        case 'strip_shield': traitNames.push('Strip shields'); break;
        case 'armor_shred_on_hit': traitNames.push('Armor shred'); break;
        case 'damage_amp_on_hit': traitNames.push(`+${Math.round((trait.ampAmount ?? 0.15) * 100)}% vuln`); break;
        case 'root_on_hit': traitNames.push(`${Math.round((trait.chance ?? 0.2) * 100)}% root`); break;
        case 'growth_scaling': traitNames.push('Grows over time'); break;
        case 'slow_aura': traitNames.push(`Slow aura ${Math.round((1 - (trait.factor ?? 0.7)) * 100)}%`); break;
        case 'spell_amp': traitNames.push(`+${Math.round((trait.ampPercent ?? 0.3) * 100)}% magic amp`); break;
        case 'overclock_buff': traitNames.push('Overclock adj.'); break;
        case 'direct_damage': break;
        default: break;
      }
    }
    this.traitsText.setText(traitNames.length > 0 ? traitNames.join(', ') : '');

    // Upgrade info
    let upgradeY = 50 + (traitNames.length > 0 ? 14 : 0);
    this.upgradeText.setPosition(8, upgradeY + (buffs.length > 0 ? 14 : 0));

    if (tower.canUpgrade()) {
      const next = tower.typeDef.upgrades[tower.level - 1];
      const deltas: string[] = [];
      const dmgDelta = next.damage - tower.damage;
      const rangeDelta = next.range - tower.range / TILE_SIZE;
      const rateDelta = next.fireRate - tower.fireRate;

      if (dmgDelta !== 0) deltas.push(`${dmgDelta > 0 ? '+' : ''}${dmgDelta} DMG`);
      if (rangeDelta !== 0) deltas.push(`${rangeDelta > 0 ? '+' : ''}${rangeDelta.toFixed(1)} RNG`);
      if (rateDelta !== 0) deltas.push(`${rateDelta}ms SPD`);

      const deltaStr = deltas.length > 0 ? ` (${deltas.join(', ')})` : '';
      this.upgradeText.setText(`Upgrade Lv${next.level}: ${next.cost}g${deltaStr}\nSell: ${tower.getSellValue()}g (right-click)`);
    } else {
      this.upgradeText.setText(`MAX | Sell: ${tower.getSellValue()}g (right-click)`);
    }

    // Position action buttons
    const btnY = upgradeY + (buffs.length > 0 ? 14 : 0) + 30;
    this.upgradeBtn.setPosition(8, btnY);
    this.sellBtn.setPosition(120, btnY);
    this.upgradeBtn.setVisible(tower.canUpgrade());

    // Calculate panel size
    const panelW = UIScale.isPhone ? 700 : 350;
    const panelH = btnY + UIScale.space(24);

    if (UIScale.isPhone) {
      // Phone: centered modal dialog
      const cw = getCanvasWidth();
      const ch = ResponsiveManager.canvasHeight();
      this.container.setPosition((cw - panelW) / 2, (ch - panelH) / 2 - 50);
    } else {
      // Desktop: position near tower
      let px = tower.x + TILE_SIZE;
      let py = tower.y - panelH / 2;
      if (px + panelW > getCanvasWidth()) px = tower.x - TILE_SIZE - panelW;
      if (px < getGridOffsetX()) px = getGridOffsetX();
      if (py < 0) py = 0;
      this.container.setPosition(px, py);
    }

    this.bg.clear();
    this.bg.fillStyle(0x111111, 0.95);
    this.bg.fillRect(0, 0, panelW, panelH);
    this.bg.lineStyle(UIScale.isPhone ? 2 : 1, 0x555555, 1);
    this.bg.strokeRect(0, 0, panelW, panelH);

    // Aura buff border
    if (buffs.length > 0) {
      this.bg.lineStyle(2, 0xff88aa, 0.6);
      this.bg.strokeRect(1, 1, panelW - 2, panelH - 2);
    }

    // Range circle
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
