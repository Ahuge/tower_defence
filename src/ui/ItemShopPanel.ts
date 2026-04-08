import { getSidebarWidth } from '../config';
import { Hero } from '../entities/Hero';
import { ITEM_SLOTS, ITEM_SLOT_ORDER } from '../data/HeroItems';
import { EconomyManager } from '../systems/EconomyManager';
import { ArenaManager } from '../systems/ArenaManager';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { EventLog } from './EventLog';
import { uiText, uiGraphics } from '../systems/UILayer';
import { PanelBase } from './PanelBase';

export class ItemShopPanel extends PanelBase {
  private hero: Hero;
  private economy: EconomyManager;
  private arenaManager: ArenaManager;
  private eventLog: EventLog;
  private grouped: boolean = false;
  private groupToggle!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    hero: Hero,
    economy: EconomyManager,
    eventLog: EventLog,
    sidebarTopY: number,
    arenaManager: ArenaManager,
  ) {
    super(scene, 0, sidebarTopY, 28);
    this.hero = hero;
    this.economy = economy;
    this.arenaManager = arenaManager;
    this.eventLog = eventLog;

    this.buildStatic();
    this.rebuildDynamic();
  }

  /** Static elements that never change */
  private buildStatic(): void {
    const panelW = getSidebarWidth();
    const panelH = UIScale.isPhone ? ResponsiveManager.canvasHeight() - 200 : 440;

    const bg = uiGraphics(this.scene);
    bg.fillStyle(0x111118, 1);
    bg.fillRect(0, 0, panelW, panelH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, panelW, panelH);
    this.container.add(bg);

    const title = uiText(this.scene, 8, 6, 'HERO ITEMS', {
      fontSize: UIScale.font(13), color: '#ff44aa', fontFamily: 'monospace',
    });
    this.container.add(title);

    const heroInfo = uiText(this.scene, 8, 24, `${this.hero.typeDef.name}`, {
      fontSize: UIScale.font(12), color: '#cccccc', fontFamily: 'monospace',
    });
    this.container.add(heroInfo);
  }

  /** Dynamic elements rebuilt when state changes */
  private rebuildDynamic(): void {
    this.clearDynamic();
    const rh = UIScale.current.rowHeight;
    const gap = UIScale.space(2);
    const touch = UIScale.current.minTouchTarget;
    const pw = getSidebarWidth();
    let y = 42;

    // Level / XP bar
    this.dText(8, y, `Lv.${this.hero.level}${this.hero.level >= 15 ? ' (MAX)' : ''}`,
      { fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace' });

    if (this.hero.level < 15) {
      const xpNeeded = this.hero.xpToNextLevel();
      const xpRatio = xpNeeded > 0 ? this.hero.xp / xpNeeded : 0;
      const barX = UIScale.isPhone ? 90 : 70;
      const barW = pw - barX - 12;
      const barH = UIScale.isPhone ? 14 : 10;
      const g = this.dGraphics();
      g.fillStyle(0x222222, 1).fillRect(barX, y + 2, barW, barH);
      g.fillStyle(0xffaa44, 0.8).fillRect(barX, y + 2, barW * xpRatio, barH);
      g.lineStyle(1, 0x555555, 1).strokeRect(barX, y + 2, barW, barH);
      this.dText(barX + barW / 2, y + 2, `${this.hero.xp}/${xpNeeded}`,
        { fontSize: UIScale.font(8), color: '#cccccc', fontFamily: 'monospace' }).setOrigin(0.5, 0);
    }
    y += rh;

    // Hero stats
    this.dText(8, y,
      `HP: ${this.hero.hp}/${this.hero.maxHp}  DMG: ${this.hero.getEffectiveDamage()}  AS: ${this.hero.getEffectiveAttackSpeed().toFixed(2)}/s`,
      { fontSize: UIScale.font(11), color: '#888888', fontFamily: 'monospace' });
    y += rh;

    // Pending upgrade picker
    if (this.hero.pendingUpgrades > 0) {
      this.dText(8, y, `LEVEL UP! (${this.hero.pendingUpgrades} point${this.hero.pendingUpgrades > 1 ? 's' : ''})`,
        { fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace' });
      y += rh;

      for (const opt of this.hero.getUpgradeOptions()) {
        const btn = this.dText(16, y, `[${opt.label}] ${opt.desc}`,
          { fontSize: UIScale.font(10), color: '#44ff44', fontFamily: 'monospace' });
        btn.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(0, 0, pw - 24, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
        btn.on('pointerdown', () => { this.hero.applyUpgrade(opt.id); this.invalidate(); });
        btn.on('pointerover', () => btn.setColor('#ffffff'));
        btn.on('pointerout', () => btn.setColor('#44ff44'));
        y += Math.max(rh, touch);
      }
      y += gap;
    }

    this.dDivider(y); y += 6;

    // Item slots
    for (let i = 0; i < ITEM_SLOT_ORDER.length; i++) {
      const slotId = ITEM_SLOT_ORDER[i];
      const slotDef = ITEM_SLOTS[slotId];
      const item = this.hero.items[i];

      const label = item.tier === 0
        ? `${slotDef.name}: (empty)`
        : `${slotDef.name}: ${slotDef.tiers[item.tier - 1].label} (T${item.tier})`;
      const labelColor = item.tier === 0 ? '#666666' : slotDef.color;
      this.dText(8, y, label, { fontSize: UIScale.font(11), color: labelColor, fontFamily: 'monospace' });

      if (item.tier < 3) {
        const nextTier = slotDef.tiers[item.tier];
        const cost = nextTier.cost;
        const canAfford = this.economy.canAfford(cost);
        const btn = this.dText(pw - 60, y, `[${cost}g]`,
          { fontSize: UIScale.font(11), color: canAfford ? '#44ff44' : '#664444', fontFamily: 'monospace' });
        if (canAfford) {
          btn.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-8, 0, 68, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
          const idx = i;
          btn.on('pointerdown', () => this.purchaseItem(idx));
          btn.on('pointerover', () => btn.setColor('#ffffff'));
          btn.on('pointerout', () => btn.setColor('#44ff44'));
        }
      } else {
        this.dText(pw - 50, y, '(MAX)', { fontSize: UIScale.font(10), color: '#ffaa44', fontFamily: 'monospace' });
      }
      y += rh;
    }

    // Tomes
    y += gap; this.dDivider(y); y += 6;
    this.dText(8, y, 'TOMES', { fontSize: UIScale.font(11), color: '#ffcc44', fontFamily: 'monospace' });
    y += rh;

    y = this.buildTomeRow(y, `XP Tome: +${50 + this.hero.level * 5} XP`, 100, () => {
      this.hero.grantXP(50 + this.hero.level * 5);
      this.eventLog.gameMessage(`XP Tome: +${50 + this.hero.level * 5} XP!`);
    });

    const attrCost = 250 + this.hero.tomeCount * 50;
    y = this.buildTomeRow(y, `Stat Tome: +5 DMG +30 HP +0.1 AS`, attrCost, () => {
      this.hero.tomeBonusDamage += 5;
      this.hero.tomeBonusHp += 30;
      this.hero.tomeBonusAttackSpeed += 0.1;
      this.hero.tomeCount++;
      this.hero.hp = Math.min(this.hero.hp + 30, this.hero.getEffectiveMaxHp());
      this.eventLog.gameMessage(`Stat Tome #${this.hero.tomeCount}: +5 DMG, +30 HP, +0.1 AS`);
    });

    const interestTier = (this.hero as any)._interestTier ?? 0;
    if (interestTier < 3) {
      const costs = [200, 400, 800];
      const rates = [3, 4, 5];
      y = this.buildTomeRow(y, `Interest Tome: → ${rates[interestTier]}%/wave`, costs[interestTier], () => {
        (this.hero as any)._interestTier = interestTier + 1;
        (this.hero as any)._interestRate = rates[interestTier] / 100;
        this.eventLog.gameMessage(`Interest Tome: rate now ${rates[interestTier]}%!`);
      });
    }

    // Accessories
    y += gap; this.dDivider(y); y += 6;
    const accCount = this.hero.accessories.length;
    this.dText(8, y, `ACCESSORIES (${accCount}/3)`, { fontSize: UIScale.font(11), color: '#cc66ff', fontFamily: 'monospace' });
    this.dText(pw - 100, y, `Rotates: W${this.arenaManager.nextRotationWave}`,
      { fontSize: UIScale.font(9), color: '#666666', fontFamily: 'monospace' });
    y += rh;

    if (accCount > 0) {
      for (const acc of this.hero.accessories) {
        const cd = this.hero.accessoryCooldowns.get(acc.id) ?? 0;
        const cdStr = !acc.passive && cd > 0 ? ` (${Math.ceil(cd)}s)` : '';
        const keyStr = acc.passive ? '' : ' [T]';
        this.dText(8, y, `${acc.name}${keyStr}${cdStr}`, { fontSize: UIScale.font(10), color: '#cc66ff', fontFamily: 'monospace' });
        y += rh;
      }
    } else {
      this.dText(8, y, 'None equipped', { fontSize: UIScale.font(10), color: '#555555', fontFamily: 'monospace' });
      y += rh;
    }
    y += gap;

    // Shop offers
    for (let i = 0; i < this.arenaManager.currentAccessoryOffers.length; i++) {
      const acc = this.arenaManager.currentAccessoryOffers[i];
      const canAfford = this.economy.canAfford(acc.cost);
      const typeTag = acc.passive ? 'P' : 'A';
      const offerText = this.dText(8, y, `[${typeTag}] ${acc.name} — ${acc.cost}g`,
        { fontSize: UIScale.font(11), color: canAfford ? '#44ff44' : '#664444', fontFamily: 'monospace' });
      if (canAfford) {
        offerText.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(0, 0, pw - 16, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
        const idx = i;
        offerText.on('pointerdown', () => this.purchaseAccessory(idx));
        offerText.on('pointerover', () => offerText.setColor('#ffffff'));
        offerText.on('pointerout', () => offerText.setColor('#44ff44'));
      }
      y += rh;
      this.dText(16, y, acc.description, { fontSize: UIScale.font(9), color: '#666666', fontFamily: 'monospace' });
      y += rh;
    }

    // Abilities
    y += gap; this.dDivider(y); y += 6;
    this.dText(8, y, 'Abilities:', { fontSize: UIScale.font(11), color: '#ffaa44', fontFamily: 'monospace' });
    y += rh;

    const hasPending = this.hero.pendingUpgrades > 0;
    for (let i = 0; i < this.hero.abilities.length; i++) {
      const ab = this.hero.abilities[i];
      const ready = ab.cooldownRemaining <= 0;
      const ups = this.hero.abilityUpgrades[i];
      const upsTag = ups > 0 ? ` +${ups}` : '';
      this.dText(16, y, `[${ab.def.key}] ${ab.def.name}${upsTag}: ${ready ? 'READY' : `${Math.ceil(ab.cooldownRemaining)}s`}`,
        { fontSize: UIScale.font(11), color: ready ? '#44ff44' : '#ff4444', fontFamily: 'monospace' });
      if (hasPending) {
        const plus = this.dText(pw - 30, y, '[+]', { fontSize: UIScale.font(11), color: '#ffaa44', fontFamily: 'monospace' })
          .setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-8, -4, 46, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
        const idx = i;
        plus.on('pointerdown', () => { this.hero.upgradeAbility(idx); this.invalidate(); });
        plus.on('pointerover', () => plus.setColor('#ffffff'));
        plus.on('pointerout', () => plus.setColor('#ffaa44'));
      }
      y += rh;
    }

    // Ultimate
    if (this.hero.ultimate) {
      const ult = this.hero.ultimate;
      const unlocked = this.hero.level >= 6;
      const ups = this.hero.abilityUpgrades[3];
      const upsTag = ups > 0 ? ` +${ups}` : '';
      let ultLabel: string, ultColor: string;
      if (!unlocked) {
        ultLabel = `[R] ${ult.def.name}: LV${6} REQ`;
        ultColor = '#555555';
      } else {
        const ready = ult.cooldownRemaining <= 0;
        ultLabel = `[R] ${ult.def.name}${upsTag}: ${ready ? 'READY' : `${Math.ceil(ult.cooldownRemaining)}s`}`;
        ultColor = ready ? '#cc66ff' : '#664466';
      }
      this.dText(16, y, ultLabel, { fontSize: UIScale.font(11), color: ultColor, fontFamily: 'monospace' });
      if (hasPending && unlocked) {
        const plus = this.dText(pw - 30, y, '[+]', { fontSize: UIScale.font(11), color: '#ffaa44', fontFamily: 'monospace' })
          .setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-8, -4, 46, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
        plus.on('pointerdown', () => { this.hero.upgradeAbility(3); this.invalidate(); });
        plus.on('pointerover', () => plus.setColor('#ffffff'));
        plus.on('pointerout', () => plus.setColor('#ffaa44'));
      }
      y += rh;
    }
  }

  /** Helper to build a purchasable tome row */
  private buildTomeRow(y: number, label: string, cost: number, onBuy: () => void): number {
    const rh = UIScale.current.rowHeight;
    const touch = UIScale.current.minTouchTarget;
    const pw = getSidebarWidth();
    const canAfford = this.economy.canAfford(cost);
    this.dText(8, y, label, { fontSize: UIScale.font(10), color: '#cccccc', fontFamily: 'monospace' });
    const btn = this.dText(pw - 60, y, `[${cost}g]`,
      { fontSize: UIScale.font(10), color: canAfford ? '#44ff44' : '#664444', fontFamily: 'monospace' });
    if (canAfford) {
      btn.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-8, 0, 68, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
      btn.on('pointerdown', () => {
        if (this.economy.spend(cost)) { onBuy(); this.invalidate(); }
      });
      btn.on('pointerover', () => btn.setColor('#ffffff'));
      btn.on('pointerout', () => btn.setColor('#44ff44'));
    }
    return y + rh;
  }

  private purchaseItem(slotIndex: number): void {
    const item = this.hero.items[slotIndex];
    if (item.tier >= 3) return;
    const slotDef = ITEM_SLOTS[item.slot];
    const nextTier = slotDef.tiers[item.tier];
    if (!this.economy.spend(nextTier.cost)) return;
    this.hero.upgradeItem(slotIndex);
    this.eventLog.gameMessage(`Bought ${nextTier.label}!`);
    this.invalidate();
  }

  private purchaseAccessory(offerIndex: number): void {
    if (this.arenaManager.buyAccessory(offerIndex)) {
      this.invalidate();
    }
  }

  private lastSnapshot: string = '';

  update(): void {
    const snap = [
      this.hero.hp,
      this.hero.maxHp,
      this.hero.level,
      this.hero.xp,
      this.hero.pendingUpgrades,
      this.economy.gold,
      this.hero.accessories.map(a => a.id).join('+'),
      ...this.hero.accessories.map(a => Math.ceil(this.hero.accessoryCooldowns.get(a.id) ?? 0)),
      ...this.hero.items.map(i => i.tier),
      ...this.hero.abilities.map(a => Math.ceil(a.cooldownRemaining)),
      ...this.hero.abilityUpgrades,
      this.hero.ultimate ? Math.ceil(this.hero.ultimate.cooldownRemaining) : 0,
      this.arenaManager.nextRotationWave,
    ].join(',');

    if (snap !== this.lastSnapshot) {
      this.lastSnapshot = snap;
      this.rebuildDynamic();
    }
  }
}
