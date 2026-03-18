import { SIDEBAR_WIDTH } from '../config';
import { Hero } from '../entities/Hero';
import { ITEM_SLOTS, ITEM_SLOT_ORDER, ItemSlot } from '../data/HeroItems';
import { EconomyManager } from '../systems/EconomyManager';
import { EventLog } from './EventLog';
import { SendPanel } from './SendPanel';
import { UpcomingWaves } from './UpcomingWaves';

export class ItemShopPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private hero: Hero;
  private economy: EconomyManager;
  private eventLog: EventLog;
  private dynamicItems: Phaser.GameObjects.GameObject[] = [];

  constructor(
    scene: Phaser.Scene,
    hero: Hero,
    economy: EconomyManager,
    eventLog: EventLog,
    sidebarTopY: number,
  ) {
    this.scene = scene;
    this.hero = hero;
    this.economy = economy;
    this.eventLog = eventLog;

    const topY = sidebarTopY;
    this.container = scene.add.container(0, topY).setDepth(28);

    this.buildPanel();
  }

  private buildPanel(): void {
    const panelW = SIDEBAR_WIDTH;
    const panelH = 260;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111118, 1);
    bg.fillRect(0, 0, panelW, panelH);
    bg.lineStyle(1, 0x333333, 1);
    bg.strokeRect(0, 0, panelW, panelH);
    this.container.add(bg);

    const title = this.scene.add.text(8, 6, 'HERO ITEMS', {
      fontSize: '13px', color: '#ff44aa', fontFamily: 'monospace',
    });
    this.container.add(title);

    // Hero stats summary
    const heroInfo = this.scene.add.text(8, 24, `${this.hero.typeDef.name}`, {
      fontSize: '12px', color: '#cccccc', fontFamily: 'monospace',
    });
    this.container.add(heroInfo);

    this.rebuildDynamic();
  }

  private rebuildDynamic(): void {
    for (const obj of this.dynamicItems) {
      this.container.remove(obj, true);
    }
    this.dynamicItems = [];

    let y = 42;

    // Hero stats
    const statsText = this.scene.add.text(8, y,
      `HP: ${this.hero.hp}/${this.hero.maxHp}  DMG: ${this.hero.getEffectiveDamage()}  SPD: ${Math.round(this.hero.getEffectiveSpeed())}`,
      { fontSize: '11px', color: '#888888', fontFamily: 'monospace' }
    );
    this.container.add(statsText);
    this.dynamicItems.push(statsText);
    y += 18;

    // Divider
    const div = this.scene.add.graphics();
    div.lineStyle(1, 0x444444, 0.5);
    div.lineBetween(8, y, SIDEBAR_WIDTH - 8, y);
    this.container.add(div);
    this.dynamicItems.push(div);
    y += 6;

    // Item slots
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
        fontSize: '12px', color: labelColor, fontFamily: 'monospace',
      });
      this.container.add(nameText);
      this.dynamicItems.push(nameText);
      y += 16;

      // Show stats of current tier
      if (item.tier > 0) {
        const tierDef = slotDef.tiers[item.tier - 1];
        const statStr = Object.entries(tierDef.stats)
          .map(([k, v]) => `+${typeof v === 'number' && v < 1 ? Math.round(v * 100) + '%' : v} ${k}`)
          .join(', ');
        const statText = this.scene.add.text(16, y, statStr, {
          fontSize: '10px', color: '#777777', fontFamily: 'monospace',
        });
        this.container.add(statText);
        this.dynamicItems.push(statText);
        y += 14;
      }

      // Upgrade button
      if (item.tier < 3) {
        const nextTier = slotDef.tiers[item.tier];
        const cost = nextTier.cost;
        const canAfford = this.economy.canAfford(cost);
        const btnLabel = `[Buy ${nextTier.label} — ${cost}g]`;
        const btnColor = canAfford ? '#44ff44' : '#664444';

        const btn = this.scene.add.text(16, y, btnLabel, {
          fontSize: '11px', color: btnColor, fontFamily: 'monospace',
        });
        this.container.add(btn);
        this.dynamicItems.push(btn);

        if (canAfford) {
          btn.setInteractive({ useHandCursor: true });
          const idx = i;
          btn.on('pointerdown', () => this.purchaseItem(idx));
          btn.on('pointerover', () => btn.setColor('#ffffff'));
          btn.on('pointerout', () => btn.setColor('#44ff44'));
        }
        y += 16;
      } else {
        const maxText = this.scene.add.text(16, y, '(MAX)', {
          fontSize: '10px', color: '#ffaa44', fontFamily: 'monospace',
        });
        this.container.add(maxText);
        this.dynamicItems.push(maxText);
        y += 14;
      }

      y += 4;
    }

    // Ability cooldowns
    y += 4;
    const abTitle = this.scene.add.text(8, y, 'Abilities:', {
      fontSize: '11px', color: '#ffaa44', fontFamily: 'monospace',
    });
    this.container.add(abTitle);
    this.dynamicItems.push(abTitle);
    y += 14;

    for (const ab of this.hero.abilities) {
      const ready = ab.cooldownRemaining <= 0;
      const cdText = ready ? 'READY' : `${Math.ceil(ab.cooldownRemaining)}s`;
      const color = ready ? '#44ff44' : '#ff4444';
      const text = this.scene.add.text(16, y, `[${ab.def.key}] ${ab.def.name}: ${cdText}`, {
        fontSize: '11px', color, fontFamily: 'monospace',
      });
      this.container.add(text);
      this.dynamicItems.push(text);
      y += 14;
    }
  }

  private purchaseItem(slotIndex: number): void {
    const item = this.hero.items[slotIndex];
    if (item.tier >= 3) return;
    const slotDef = ITEM_SLOTS[item.slot];
    const nextTier = slotDef.tiers[item.tier];
    if (!this.economy.spend(nextTier.cost)) return;

    this.hero.upgradeItem(slotIndex);
    this.eventLog.gameMessage(`Bought ${nextTier.label}! (+${Object.entries(nextTier.stats).map(([k, v]) => `${v} ${k}`).join(', ')})`);
    this.lastSnapshot = ''; // force rebuild
  }

  /** Snapshot key to detect when UI actually needs rebuilding */
  private lastSnapshot: string = '';

  update(): void {
    // Only rebuild when something changed (gold, HP, tiers, cooldowns)
    const snap = [
      this.hero.hp,
      this.hero.maxHp,
      this.economy.gold,
      ...this.hero.items.map(i => i.tier),
      ...this.hero.abilities.map(a => Math.ceil(a.cooldownRemaining)),
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
