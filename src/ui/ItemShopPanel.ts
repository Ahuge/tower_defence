import { SIDEBAR_WIDTH, getSidebarWidth } from '../config';
import { Hero } from '../entities/Hero';
import { ITEM_SLOTS, ITEM_SLOT_ORDER, ItemSlot } from '../data/HeroItems';
import { EconomyManager } from '../systems/EconomyManager';
import { ArenaManager } from '../systems/ArenaManager';
import { UIScale } from '../systems/UIScale';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { EventLog } from './EventLog';

export class ItemShopPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private hero: Hero;
  private economy: EconomyManager;
  private arenaManager: ArenaManager;
  private eventLog: EventLog;
  private dynamicItems: Phaser.GameObjects.GameObject[] = [];

  constructor(
    scene: Phaser.Scene,
    hero: Hero,
    economy: EconomyManager,
    eventLog: EventLog,
    sidebarTopY: number,
    arenaManager: ArenaManager,
  ) {
    this.scene = scene;
    this.hero = hero;
    this.economy = economy;
    this.arenaManager = arenaManager;
    this.eventLog = eventLog;

    const topY = sidebarTopY;
    this.container = scene.add.container(0, topY).setDepth(28);

    this.buildPanel();
  }

  private buildPanel(): void {
    const panelW = getSidebarWidth();
    const panelH = UIScale.isPhone ? ResponsiveManager.canvasHeight() - 200 : 440;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111118, 1);
    bg.fillRect(0, 0, panelW, panelH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, panelW, panelH);
    this.container.add(bg);

    const title = this.scene.add.text(8, 6, 'HERO ITEMS', {
      fontSize: UIScale.font(13), color: '#ff44aa', fontFamily: 'monospace',
    });
    this.container.add(title);

    // Hero stats summary
    const heroInfo = this.scene.add.text(8, 24, `${this.hero.typeDef.name}`, {
      fontSize: UIScale.font(12), color: '#cccccc', fontFamily: 'monospace',
    });
    this.container.add(heroInfo);

    this.rebuildDynamic();
  }

  private rebuildDynamic(): void {
    for (const obj of this.dynamicItems) {
      this.container.remove(obj, true);
    }
    this.dynamicItems = [];
    const rh = UIScale.current.rowHeight; // 24 on phone, 16 on desktop
    const gap = UIScale.space(2);  // gap between sections

    let y = 42;
    const touch = UIScale.current.minTouchTarget;

    // Level / XP bar
    const lvlText = this.scene.add.text(8, y,
      `Lv.${this.hero.level}${this.hero.level >= 15 ? ' (MAX)' : ''}`,
      { fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace' }
    );
    this.container.add(lvlText);
    this.dynamicItems.push(lvlText);

    if (this.hero.level < 15) {
      const xpNeeded = this.hero.xpToNextLevel();
      const xpRatio = xpNeeded > 0 ? this.hero.xp / xpNeeded : 0;
      const barX = UIScale.isPhone ? 90 : 70;
      const barW = getSidebarWidth() - barX - 12;
      const barH = UIScale.isPhone ? 14 : 10;
      const xpBarBg = this.scene.add.graphics();
      xpBarBg.fillStyle(0x222222, 1);
      xpBarBg.fillRect(barX, y + 2, barW, barH);
      xpBarBg.fillStyle(0xffaa44, 0.8);
      xpBarBg.fillRect(barX, y + 2, barW * xpRatio, barH);
      xpBarBg.lineStyle(1, 0x555555, 1);
      xpBarBg.strokeRect(barX, y + 2, barW, barH);
      this.container.add(xpBarBg);
      this.dynamicItems.push(xpBarBg);

      const xpLabel = this.scene.add.text(barX + barW / 2, y + 2, `${this.hero.xp}/${xpNeeded}`, {
        fontSize: UIScale.font(8), color: '#cccccc', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);
      this.container.add(xpLabel);
      this.dynamicItems.push(xpLabel);
    }
    y += rh;

    // Hero stats
    const statsText = this.scene.add.text(8, y,
      `HP: ${this.hero.hp}/${this.hero.maxHp}  DMG: ${this.hero.getEffectiveDamage()}  AS: ${this.hero.getEffectiveAttackSpeed().toFixed(2)}/s`,
      { fontSize: UIScale.font(11), color: '#888888', fontFamily: 'monospace' }
    );
    this.container.add(statsText);
    this.dynamicItems.push(statsText);
    y += rh;

    // Pending upgrade picker
    if (this.hero.pendingUpgrades > 0) {
      const upLabel = this.scene.add.text(8, y, `LEVEL UP! (${this.hero.pendingUpgrades} point${this.hero.pendingUpgrades > 1 ? 's' : ''})`, {
        fontSize: UIScale.font(12), color: '#ffaa44', fontFamily: 'monospace',
      });
      this.container.add(upLabel);
      this.dynamicItems.push(upLabel);
      y += rh;

      for (const opt of this.hero.getUpgradeOptions()) {
        const btn = this.scene.add.text(16, y, `[${opt.label}] ${opt.desc}`, {
          fontSize: UIScale.font(10), color: '#44ff44', fontFamily: 'monospace',
        });
        this.container.add(btn);
        this.dynamicItems.push(btn);
        btn.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(0, 0, getSidebarWidth() - 24, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
        btn.on('pointerdown', () => {
          this.hero.applyUpgrade(opt.id);
          this.lastSnapshot = '';
        });
        btn.on('pointerover', () => btn.setColor('#ffffff'));
        btn.on('pointerout', () => btn.setColor('#44ff44'));
        y += Math.max(rh, touch);
      }
      y += gap;
    }

    // Divider
    this.addDivider(y);
    y += 6;

    // Item slots (compact)
    for (let i = 0; i < ITEM_SLOT_ORDER.length; i++) {
      const slotId = ITEM_SLOT_ORDER[i];
      const slotDef = ITEM_SLOTS[slotId];
      const item = this.hero.items[i];

      let label: string;
      let labelColor: string;
      if (item.tier === 0) {
        label = `${slotDef.name}: (empty)`;
        labelColor = '#666666';
      } else {
        const tierDef = slotDef.tiers[item.tier - 1];
        label = `${slotDef.name}: ${tierDef.label} (T${item.tier})`;
        labelColor = slotDef.color;
      }

      const nameText = this.scene.add.text(8, y, label, {
        fontSize: UIScale.font(11), color: labelColor, fontFamily: 'monospace',
      });
      this.container.add(nameText);
      this.dynamicItems.push(nameText);

      // Upgrade button on same line
      if (item.tier < 3) {
        const nextTier = slotDef.tiers[item.tier];
        const cost = nextTier.cost;
        const canAfford = this.economy.canAfford(cost);
        const btnLabel = `[${cost}g]`;
        const btnColor = canAfford ? '#44ff44' : '#664444';

        const btn = this.scene.add.text(getSidebarWidth() - 60, y, btnLabel, {
          fontSize: UIScale.font(11), color: btnColor, fontFamily: 'monospace',
        });
        this.container.add(btn);
        this.dynamicItems.push(btn);

        if (canAfford) {
          btn.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-8, 0, 68, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
          const idx = i;
          btn.on('pointerdown', () => this.purchaseItem(idx));
          btn.on('pointerover', () => btn.setColor('#ffffff'));
          btn.on('pointerout', () => btn.setColor('#44ff44'));
        }
      } else {
        const maxText = this.scene.add.text(getSidebarWidth() - 50, y, '(MAX)', {
          fontSize: UIScale.font(10), color: '#ffaa44', fontFamily: 'monospace',
        });
        this.container.add(maxText);
        this.dynamicItems.push(maxText);
      }
      y += rh;
    }

    // Divider
    y += gap;
    this.addDivider(y);
    y += 6;

    // Accessory section
    const accCount = this.hero.accessories.length;
    const accTitle = this.scene.add.text(8, y, `ACCESSORIES (${accCount}/3)`, {
      fontSize: UIScale.font(11), color: '#cc66ff', fontFamily: 'monospace',
    });
    this.container.add(accTitle);
    this.dynamicItems.push(accTitle);

    // Rotation countdown
    const rotText = this.scene.add.text(getSidebarWidth() - 100, y, `Rotates: W${this.arenaManager.nextRotationWave}`, {
      fontSize: UIScale.font(9), color: '#666666', fontFamily: 'monospace',
    });
    this.container.add(rotText);
    this.dynamicItems.push(rotText);
    y += rh;

    // Current equipped accessories
    if (accCount > 0) {
      for (const acc of this.hero.accessories) {
        const cd = this.hero.accessoryCooldowns.get(acc.id) ?? 0;
        const cdStr = !acc.passive && cd > 0 ? ` (${Math.ceil(cd)}s)` : '';
        const keyStr = acc.passive ? '' : ' [T]';
        const equipped = this.scene.add.text(8, y, `${acc.name}${keyStr}${cdStr}`, {
          fontSize: UIScale.font(10), color: '#cc66ff', fontFamily: 'monospace',
        });
        this.container.add(equipped);
        this.dynamicItems.push(equipped);
        y += rh;
      }
    } else {
      const noAcc = this.scene.add.text(8, y, 'None equipped', {
        fontSize: UIScale.font(10), color: '#555555', fontFamily: 'monospace',
      });
      this.container.add(noAcc);
      this.dynamicItems.push(noAcc);
      y += rh;
    }

    y += gap;

    // Shop offers
    const offers = this.arenaManager.currentAccessoryOffers;
    for (let i = 0; i < offers.length; i++) {
      const acc = offers[i];
      const canAfford = this.economy.canAfford(acc.cost);
      const btnColor = canAfford ? '#44ff44' : '#664444';
      const typeTag = acc.passive ? 'P' : 'A';

      const offerText = this.scene.add.text(8, y,
        `[${typeTag}] ${acc.name} — ${acc.cost}g`,
        { fontSize: UIScale.font(11), color: btnColor, fontFamily: 'monospace' }
      );
      this.container.add(offerText);
      this.dynamicItems.push(offerText);

      if (canAfford) {
        offerText.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(0, 0, getSidebarWidth() - 16, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
        const idx = i;
        offerText.on('pointerdown', () => this.purchaseAccessory(idx));
        offerText.on('pointerover', () => offerText.setColor('#ffffff'));
        offerText.on('pointerout', () => offerText.setColor('#44ff44'));
      }
      y += rh;

      const descText = this.scene.add.text(16, y, acc.description, {
        fontSize: UIScale.font(9), color: '#666666', fontFamily: 'monospace',
      });
      this.container.add(descText);
      this.dynamicItems.push(descText);
      y += rh;
    }

    // Divider
    y += gap;
    this.addDivider(y);
    y += 6;

    // Ability cooldowns
    const abTitle = this.scene.add.text(8, y, 'Abilities:', {
      fontSize: UIScale.font(11), color: '#ffaa44', fontFamily: 'monospace',
    });
    this.container.add(abTitle);
    this.dynamicItems.push(abTitle);
    y += rh;

    const hasPending = this.hero.pendingUpgrades > 0;

    for (let i = 0; i < this.hero.abilities.length; i++) {
      const ab = this.hero.abilities[i];
      const ready = ab.cooldownRemaining <= 0;
      const cdText = ready ? 'READY' : `${Math.ceil(ab.cooldownRemaining)}s`;
      const color = ready ? '#44ff44' : '#ff4444';
      const ups = this.hero.abilityUpgrades[i];
      const upsTag = ups > 0 ? ` +${ups}` : '';
      const text = this.scene.add.text(16, y, `[${ab.def.key}] ${ab.def.name}${upsTag}: ${cdText}`, {
        fontSize: UIScale.font(11), color, fontFamily: 'monospace',
      });
      this.container.add(text);
      this.dynamicItems.push(text);

      if (hasPending) {
        const plusBtn = this.scene.add.text(getSidebarWidth() - 30, y, '[+]', {
          fontSize: UIScale.font(11), color: '#ffaa44', fontFamily: 'monospace',
        }).setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-8, -4, 46, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
        this.container.add(plusBtn);
        this.dynamicItems.push(plusBtn);
        const idx = i;
        plusBtn.on('pointerdown', () => { this.hero.upgradeAbility(idx); this.lastSnapshot = ''; });
        plusBtn.on('pointerover', () => plusBtn.setColor('#ffffff'));
        plusBtn.on('pointerout', () => plusBtn.setColor('#ffaa44'));
      }
      y += rh;
    }
    // Ultimate — show locked status if below level 6
    if (this.hero.ultimate) {
      const ult = this.hero.ultimate;
      const unlocked = this.hero.level >= 6;
      let ultLabel: string;
      let ultColor: string;
      const ups = this.hero.abilityUpgrades[3];
      const upsTag = ups > 0 ? ` +${ups}` : '';
      if (!unlocked) {
        ultLabel = `[R] ${ult.def.name}: LV${6} REQ`;
        ultColor = '#555555';
      } else {
        const ready = ult.cooldownRemaining <= 0;
        ultLabel = `[R] ${ult.def.name}${upsTag}: ${ready ? 'READY' : `${Math.ceil(ult.cooldownRemaining)}s`}`;
        ultColor = ready ? '#cc66ff' : '#664466';
      }
      const ultText = this.scene.add.text(16, y, ultLabel, {
        fontSize: UIScale.font(11), color: ultColor, fontFamily: 'monospace',
      });
      this.container.add(ultText);
      this.dynamicItems.push(ultText);

      if (hasPending && unlocked) {
        const plusBtn = this.scene.add.text(getSidebarWidth() - 30, y, '[+]', {
          fontSize: UIScale.font(11), color: '#ffaa44', fontFamily: 'monospace',
        }).setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-8, -4, 46, touch), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
        this.container.add(plusBtn);
        this.dynamicItems.push(plusBtn);
        plusBtn.on('pointerdown', () => { this.hero.upgradeAbility(3); this.lastSnapshot = ''; });
        plusBtn.on('pointerover', () => plusBtn.setColor('#ffffff'));
        plusBtn.on('pointerout', () => plusBtn.setColor('#ffaa44'));
      }
      y += rh;
    }
  }

  private addDivider(y: number): void {
    const div = this.scene.add.graphics();
    div.lineStyle(1, 0x444444, 0.5);
    div.lineBetween(8, y, getSidebarWidth() - 8, y);
    this.container.add(div);
    this.dynamicItems.push(div);
  }

  private purchaseItem(slotIndex: number): void {
    const item = this.hero.items[slotIndex];
    if (item.tier >= 3) return;
    const slotDef = ITEM_SLOTS[item.slot];
    const nextTier = slotDef.tiers[item.tier];
    if (!this.economy.spend(nextTier.cost)) return;

    this.hero.upgradeItem(slotIndex);
    this.eventLog.gameMessage(`Bought ${nextTier.label}!`);
    this.lastSnapshot = ''; // force rebuild
  }

  private purchaseAccessory(offerIndex: number): void {
    if (this.arenaManager.buyAccessory(offerIndex)) {
      this.lastSnapshot = ''; // force rebuild
    }
  }

  /** Snapshot key to detect when UI actually needs rebuilding */
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

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
